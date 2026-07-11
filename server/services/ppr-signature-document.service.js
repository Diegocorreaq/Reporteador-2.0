import { createHash, randomUUID } from 'node:crypto'
import { getSqlPool, sql } from '../db/sql-server.js'
import { buildPprMonthlySignaturePdf, MIME_PDF } from './pdf-export.service.js'

const SIGNATURE_LABEL = 'FIRMA FICTICIA DE PRUEBA - NO RENIEC'

function documentFileName({ year, month, signerDni, programId }) {
  const safeDni = String(signerDni ?? '').replace(/[^0-9A-Za-z_-]/g, '') || 'SIN_DNI'
  const safeProgram = programId == null ? 'SIN_PROGRAMA' : `PP${String(programId).replace(/[^0-9A-Za-z_-]/g, '')}`
  return `PPR_${year}_${String(month).padStart(2, '0')}_${safeProgram}_${safeDni}_firma_prueba.pdf`
}

function draftFileName({ year, month, signerDni, programId }) {
  const safeDni = String(signerDni ?? '').replace(/[^0-9A-Za-z_-]/g, '') || 'SIN_DNI'
  const safeProgram = programId == null ? 'SIN_PROGRAMA' : `PP${String(programId).replace(/[^0-9A-Za-z_-]/g, '')}`
  return `PPR_${year}_${String(month).padStart(2, '0')}_${safeProgram}_${safeDni}_borrador.pdf`
}

function createContentHash(payload) {
  return createHash('sha256').update(JSON.stringify(payload)).digest('hex')
}

export async function ensurePprSignedDocumentInfrastructure() {
  const pool = await getSqlPool('general')
  await pool.request().query(`
    IF COL_LENGTH('dbo.ppr_signatures', 'program_id') IS NULL
      ALTER TABLE dbo.ppr_signatures ADD program_id INT NULL;

    DECLARE @constraintName SYSNAME;

    DECLARE signatureConstraints CURSOR LOCAL FAST_FORWARD FOR
      SELECT kc.name
      FROM sys.key_constraints kc
      WHERE kc.parent_object_id = OBJECT_ID('dbo.ppr_signatures')
        AND kc.type = 'UQ'
        AND (
          SELECT COUNT(*)
          FROM sys.index_columns ic
          INNER JOIN sys.columns c
            ON c.object_id = ic.object_id
            AND c.column_id = ic.column_id
          WHERE ic.object_id = kc.parent_object_id
            AND ic.index_id = kc.unique_index_id
            AND c.name IN ('employee_id', 'period_id')
        ) = 2
        AND (
          SELECT COUNT(*)
          FROM sys.index_columns ic
          WHERE ic.object_id = kc.parent_object_id
            AND ic.index_id = kc.unique_index_id
        ) = 2;

    OPEN signatureConstraints;
    FETCH NEXT FROM signatureConstraints INTO @constraintName;
    WHILE @@FETCH_STATUS = 0
    BEGIN
      DECLARE @dropSignatureConstraintSql NVARCHAR(MAX);
      SET @dropSignatureConstraintSql = N'ALTER TABLE dbo.ppr_signatures DROP CONSTRAINT ' + QUOTENAME(@constraintName);
      EXEC sp_executesql @dropSignatureConstraintSql;
      FETCH NEXT FROM signatureConstraints INTO @constraintName;
    END
    CLOSE signatureConstraints;
    DEALLOCATE signatureConstraints;

    IF NOT EXISTS (
      SELECT 1
      FROM sys.indexes
      WHERE object_id = OBJECT_ID('dbo.ppr_signatures')
        AND name = 'UX_ppr_signatures_employee_period_program'
    )
      CREATE UNIQUE INDEX UX_ppr_signatures_employee_period_program
      ON dbo.ppr_signatures(employee_id, period_id, program_id);

    IF OBJECT_ID('dbo.ppr_signed_documents', 'U') IS NULL
    BEGIN
      CREATE TABLE dbo.ppr_signed_documents (
        id               INT IDENTITY(1,1) NOT NULL PRIMARY KEY,
        employee_id      INT NOT NULL,
        period_id        INT NOT NULL,
        program_id       INT NULL,
        document_code    NVARCHAR(80) NOT NULL,
        file_name        NVARCHAR(255) NOT NULL,
        mime_type        NVARCHAR(100) NOT NULL,
        pdf_data         VARBINARY(MAX) NOT NULL,
        document_hash    CHAR(64) NOT NULL,
        content_hash     CHAR(64) NOT NULL,
        signature_type   NVARCHAR(30) NOT NULL,
        signature_label  NVARCHAR(200) NOT NULL,
        signer_dni       NVARCHAR(30) NOT NULL,
        signer_name      NVARCHAR(200) NOT NULL,
        signed_at        DATETIME2 NOT NULL,
        created_at       DATETIME2 NOT NULL DEFAULT SYSDATETIME(),
        CONSTRAINT UQ_ppr_signed_documents_employee_period_program UNIQUE (employee_id, period_id, program_id)
      );
    END;

    IF COL_LENGTH('dbo.ppr_signed_documents', 'program_id') IS NULL
      ALTER TABLE dbo.ppr_signed_documents ADD program_id INT NULL;

    IF OBJECT_ID('dbo.UQ_ppr_signed_documents_employee_period', 'UQ') IS NOT NULL
      ALTER TABLE dbo.ppr_signed_documents DROP CONSTRAINT UQ_ppr_signed_documents_employee_period;

    IF NOT EXISTS (
      SELECT 1
      FROM sys.indexes
      WHERE object_id = OBJECT_ID('dbo.ppr_signed_documents')
        AND name = 'UX_ppr_signed_documents_employee_period_program'
    )
      CREATE UNIQUE INDEX UX_ppr_signed_documents_employee_period_program
      ON dbo.ppr_signed_documents(employee_id, period_id, program_id);

    EXEC(N'
      ALTER PROCEDURE dbo.SP_PPR_ACTIVIDADES_PROGRAMA
        @program_id INT,
        @period_id INT,
        @employee_id INT
      AS
      BEGIN
        SET NOCOUNT ON;

        SELECT
          a.id,
          a.code,
          a.name,
          a.unit,
          a.annual_goal,
          a.sort_order,
          mv.value,
          mv.notes,
          mv.value_source,
          mv.source_key,
          mv.source_value,
          mv.loaded_at,
          mv.validated_at,
          mv.validation_status,
          s.signed_at
        FROM dbo.ppr_activities a
        LEFT JOIN dbo.ppr_monthly_values mv
          ON mv.activity_id = a.id
          AND mv.period_id = @period_id
        LEFT JOIN dbo.ppr_signatures s
          ON s.employee_id = @employee_id
          AND s.period_id = @period_id
          AND s.is_valid = 1
          AND (s.program_id = @program_id OR s.program_id IS NULL)
        WHERE a.program_id = @program_id
          AND ISNULL(a.is_active, 1) = 1
        ORDER BY a.sort_order, a.id;
      END
    ');
  `)
}

function addEmployeePeriodInputs(request, employeeId, periodId) {
  request.input('employee_id', sql.Int, Number(employeeId))
  request.input('period_id', sql.Int, Number(periodId))
  return request
}

async function readSigningSnapshot(transaction, employeeId, periodId, programId = null) {
  const periodRequest = addEmployeePeriodInputs(new sql.Request(transaction), employeeId, periodId)
  periodRequest.input('program_id', sql.Int, programId == null ? null : Number(programId))
  const periodResult = await periodRequest.query(`
    SELECT per.id, per.year, per.month, per.is_open, sig.signed_at
    FROM dbo.ppr_periods per
    LEFT JOIN dbo.ppr_signatures sig
      ON sig.employee_id = @employee_id
      AND sig.period_id = per.id
      AND sig.is_valid = 1
      AND (sig.program_id = @program_id OR sig.program_id IS NULL)
    WHERE per.id = @period_id;
  `)
  const period = periodResult.recordset[0]
  if (!period) {
    const error = new Error('El periodo solicitado no existe.')
    error.code = 'PPR_PERIOD_NOT_FOUND'
    throw error
  }

  const summaryRequest = addEmployeePeriodInputs(new sql.Request(transaction), employeeId, periodId)
  summaryRequest.input('program_id', sql.Int, programId == null ? null : Number(programId))
  const summaryResult = await summaryRequest.query(`
    SELECT
      COUNT(DISTINCT a.id) AS total_activities,
      COUNT(DISTINCT CASE WHEN mv.value IS NOT NULL THEN a.id END) AS with_value,
      COUNT(DISTINCT CASE WHEN mv.validation_status = 'validated' THEN a.id END) AS validated
    FROM dbo.ppr_user_programs up
    INNER JOIN dbo.ppr_activities a
      ON a.program_id = up.program_id
      AND ISNULL(a.is_active, 1) = 1
    LEFT JOIN dbo.ppr_monthly_values mv
      ON mv.activity_id = a.id
      AND mv.period_id = @period_id
    WHERE up.employee_id = @employee_id
      AND up.is_active = 1
      AND (@program_id IS NULL OR up.program_id = @program_id);
  `)
  const summaryRow = summaryResult.recordset[0] ?? {}
  const summary = {
    total: Number(summaryRow.total_activities ?? 0),
    withValue: Number(summaryRow.with_value ?? 0),
    validated: Number(summaryRow.validated ?? 0),
  }

  const rowsRequest = addEmployeePeriodInputs(new sql.Request(transaction), employeeId, periodId)
  rowsRequest.input('year', sql.Int, Number(period.year))
  rowsRequest.input('month', sql.Int, Number(period.month))
  rowsRequest.input('program_id', sql.Int, programId == null ? null : Number(programId))
  const rowsResult = await rowsRequest.query(`
    SELECT
      p.id AS program_id,
      p.code AS program_code,
      p.name AS program_name,
      a.id AS activity_id,
      a.code AS activity_code,
      a.name AS activity_name,
      a.unit,
      a.annual_goal,
      mv.value AS month_value,
      totals.accumulated_value
    FROM dbo.ppr_user_programs up
    INNER JOIN dbo.ppr_programs p
      ON p.id = up.program_id
    INNER JOIN dbo.ppr_activities a
      ON a.program_id = p.id
      AND ISNULL(a.is_active, 1) = 1
    LEFT JOIN dbo.ppr_monthly_values mv
      ON mv.activity_id = a.id
      AND mv.period_id = @period_id
    OUTER APPLY (
      SELECT SUM(previous_mv.value) AS accumulated_value
      FROM dbo.ppr_monthly_values previous_mv
      INNER JOIN dbo.ppr_periods previous_period
        ON previous_period.id = previous_mv.period_id
      WHERE previous_mv.activity_id = a.id
        AND previous_period.year = @year
        AND previous_period.month <= @month
    ) totals
    WHERE up.employee_id = @employee_id
      AND up.is_active = 1
      AND (@program_id IS NULL OR up.program_id = @program_id)
    ORDER BY p.code, a.sort_order, a.id;
  `)

  return {
    period: {
      id: Number(period.id),
      year: Number(period.year),
      month: Number(period.month),
      isOpen: Boolean(period.is_open),
      signedAt: period.signed_at ?? null,
    },
    summary,
    rows: rowsResult.recordset.map((row) => {
      const annualGoal = row.annual_goal == null ? null : Number(row.annual_goal)
      const accumulatedValue = row.accumulated_value == null ? 0 : Number(row.accumulated_value)
      return {
        programId: Number(row.program_id),
        programCode: String(row.program_code ?? ''),
        programName: String(row.program_name ?? ''),
        activityId: Number(row.activity_id),
        activityCode: String(row.activity_code ?? ''),
        activityName: String(row.activity_name ?? ''),
        unit: String(row.unit ?? ''),
        annualGoal,
        monthValue: row.month_value == null ? null : Number(row.month_value),
        accumulatedValue,
        annualProgress: annualGoal && annualGoal > 0
          ? Math.round((accumulatedValue / annualGoal) * 10000) / 100
          : null,
      }
    }),
  }
}

export async function getPprDraftDocumentFile({
  employeeId,
  periodId,
  programId,
  signerDni,
  signerName,
}) {
  const pool = await getSqlPool('general')
  const transaction = new sql.Transaction(pool)
  await transaction.begin(sql.ISOLATION_LEVEL.READ_COMMITTED)

  try {
    const snapshot = await readSigningSnapshot(transaction, employeeId, periodId, programId)
    if (!snapshot.period.isOpen) {
      const error = new Error('El periodo esta cerrado y no admite un nuevo documento.')
      error.code = 'PPR_PERIOD_CLOSED'
      throw error
    }
    if (snapshot.period.signedAt) {
      const error = new Error('El periodo ya fue firmado.')
      error.code = 'PPR_PERIOD_ALREADY_SIGNED'
      throw error
    }

    const fileName = draftFileName({
      year: snapshot.period.year,
      month: snapshot.period.month,
      signerDni,
      programId,
    })
    const buffer = buildPprMonthlySignaturePdf({
      document: {
        year: snapshot.period.year,
        month: snapshot.period.month,
        signerDni,
        signerName,
        signedAt: null,
        isSigned: false,
        documentCode: 'BORRADOR - SIN FIRMA',
        contentHash: '',
        signatureLabel: '',
        totalActivities: snapshot.rows.length,
      },
      rows: snapshot.rows,
    })

    await transaction.commit()
    return {
      fileName,
      mimeType: MIME_PDF,
      buffer,
    }
  } catch (error) {
    await transaction.rollback()
    throw error
  }
}

export async function signPprPeriodWithMockDocument({
  employeeId,
  periodId,
  programId,
  signerDni,
  signerName,
  forceForTesting = false,
}) {
  await ensurePprSignedDocumentInfrastructure()
  const pool = await getSqlPool('general')
  const transaction = new sql.Transaction(pool)
  await transaction.begin(sql.ISOLATION_LEVEL.SERIALIZABLE)

  try {
    const snapshot = await readSigningSnapshot(transaction, employeeId, periodId, programId)
    if (!snapshot.period.isOpen) {
      const error = new Error('El periodo esta cerrado y no admite firma.')
      error.code = 'PPR_PERIOD_CLOSED'
      throw error
    }
    if (snapshot.period.signedAt) {
      const error = new Error('El periodo ya fue firmado.')
      error.code = 'PPR_PERIOD_ALREADY_SIGNED'
      throw error
    }
    const canSign = snapshot.summary.total > 0
      && snapshot.summary.total === snapshot.summary.validated

    if (!canSign && !forceForTesting) {
      const error = new Error('Aun hay actividades pendientes de validar.')
      error.code = 'PPR_VALIDATION_PENDING'
      error.summary = {
        ...snapshot.summary,
        pending: Math.max(snapshot.summary.total - snapshot.summary.validated, 0),
        canSign: false,
      }
      throw error
    }

    const signedAt = new Date()
    const documentCode = `PPR-${snapshot.period.year}-${String(snapshot.period.month).padStart(2, '0')}-${employeeId}-${randomUUID().slice(0, 8).toUpperCase()}`
    const contentHash = createContentHash({
      documentCode,
      employeeId: Number(employeeId),
      periodId: Number(periodId),
      signerDni,
      signerName,
      signedAt: signedAt.toISOString(),
      rows: snapshot.rows,
    })
    const signatureLabel = forceForTesting
      ? `${SIGNATURE_LABEL} (VALIDACION OMITIDA POR ADMIN)`
      : SIGNATURE_LABEL
    const fileName = documentFileName({
      year: snapshot.period.year,
      month: snapshot.period.month,
      signerDni,
      programId,
    })
    const pdf = buildPprMonthlySignaturePdf({
      document: {
        year: snapshot.period.year,
        month: snapshot.period.month,
        signerDni,
        signerName,
        signedAt,
        isSigned: true,
        documentCode,
        contentHash,
        signatureLabel,
        totalActivities: snapshot.rows.length,
      },
      rows: snapshot.rows,
    })
    const documentHash = createHash('sha256').update(pdf).digest('hex')

    const saveRequest = addEmployeePeriodInputs(new sql.Request(transaction), employeeId, periodId)
    saveRequest.input('program_id', sql.Int, Number(programId))
    saveRequest.input('signed_at', sql.DateTime2, signedAt)
    saveRequest.input('document_code', sql.NVarChar(80), documentCode)
    saveRequest.input('file_name', sql.NVarChar(255), fileName)
    saveRequest.input('mime_type', sql.NVarChar(100), MIME_PDF)
    saveRequest.input('pdf_data', sql.VarBinary(sql.MAX), pdf)
    saveRequest.input('document_hash', sql.Char(64), documentHash)
    saveRequest.input('content_hash', sql.Char(64), contentHash)
    saveRequest.input('signature_type', sql.NVarChar(30), forceForTesting ? 'mock_admin' : 'mock')
    saveRequest.input('signature_label', sql.NVarChar(200), signatureLabel)
    saveRequest.input('signer_dni', sql.NVarChar(30), String(signerDni))
    saveRequest.input('signer_name', sql.NVarChar(200), String(signerName))
    const saveResult = await saveRequest.query(`
      MERGE dbo.ppr_signatures AS target
      USING (SELECT @employee_id AS employee_id, @period_id AS period_id, @program_id AS program_id) AS source
        ON target.employee_id = source.employee_id
        AND target.period_id = source.period_id
        AND target.program_id = source.program_id
      WHEN MATCHED THEN
        UPDATE SET signed_at = @signed_at, is_valid = 1
      WHEN NOT MATCHED THEN
        INSERT (employee_id, period_id, program_id, signed_at, is_valid)
        VALUES (@employee_id, @period_id, @program_id, @signed_at, 1);

      MERGE dbo.ppr_signed_documents AS target
      USING (SELECT @employee_id AS employee_id, @period_id AS period_id, @program_id AS program_id) AS source
        ON target.employee_id = source.employee_id
        AND target.period_id = source.period_id
        AND target.program_id = source.program_id
      WHEN MATCHED THEN
        UPDATE SET
          document_code = @document_code,
          file_name = @file_name,
          mime_type = @mime_type,
          pdf_data = @pdf_data,
          document_hash = @document_hash,
          content_hash = @content_hash,
          signature_type = @signature_type,
          signature_label = @signature_label,
          signer_dni = @signer_dni,
          signer_name = @signer_name,
          signed_at = @signed_at,
          created_at = SYSDATETIME()
      WHEN NOT MATCHED THEN
        INSERT (
          employee_id, period_id, program_id, document_code, file_name, mime_type, pdf_data,
          document_hash, content_hash, signature_type, signature_label,
          signer_dni, signer_name, signed_at
        )
        VALUES (
          @employee_id, @period_id, @program_id, @document_code, @file_name, @mime_type, @pdf_data,
          @document_hash, @content_hash, @signature_type, @signature_label,
          @signer_dni, @signer_name, @signed_at
        );

      SELECT id, document_code, file_name, document_hash, content_hash, signature_type, signed_at
      FROM dbo.ppr_signed_documents
      WHERE employee_id = @employee_id
        AND period_id = @period_id
        AND program_id = @program_id;
    `)

    await transaction.commit()
    const saved = saveResult.recordset[0]
    return {
      signedAt: saved.signed_at,
      document: {
        id: Number(saved.id),
        code: String(saved.document_code),
        fileName: String(saved.file_name),
        documentHash: String(saved.document_hash),
        contentHash: String(saved.content_hash),
        signatureType: String(saved.signature_type),
      },
    }
  } catch (error) {
    await transaction.rollback()
    throw error
  }
}

export async function getPprSignedDocumentInfo({ employeeId, periodId, programId }) {
  await ensurePprSignedDocumentInfrastructure()
  const pool = await getSqlPool('general')
  const request = addEmployeePeriodInputs(pool.request(), employeeId, periodId)
  request.input('program_id', sql.Int, Number(programId))
  const result = await request.query(`
    SELECT id, document_code, file_name, document_hash, content_hash,
      signature_type, signature_label, signer_dni, signer_name, signed_at
    FROM dbo.ppr_signed_documents
    WHERE employee_id = @employee_id
      AND period_id = @period_id
      AND (program_id = @program_id OR program_id IS NULL)
    ORDER BY CASE WHEN program_id = @program_id THEN 0 ELSE 1 END;
  `)
  const row = result.recordset[0]
  if (!row) return null
  return {
    id: Number(row.id),
    code: String(row.document_code),
    fileName: String(row.file_name),
    documentHash: String(row.document_hash),
    contentHash: String(row.content_hash),
    signatureType: String(row.signature_type),
    signatureLabel: String(row.signature_label),
    signerDni: String(row.signer_dni),
    signerName: String(row.signer_name),
    signedAt: row.signed_at,
  }
}

export async function getPprSignedDocumentFile({ employeeId, periodId, programId }) {
  await ensurePprSignedDocumentInfrastructure()
  const pool = await getSqlPool('general')
  const request = addEmployeePeriodInputs(pool.request(), employeeId, periodId)
  request.input('program_id', sql.Int, Number(programId))
  const result = await request.query(`
    SELECT file_name, mime_type, pdf_data
    FROM dbo.ppr_signed_documents
    WHERE employee_id = @employee_id
      AND period_id = @period_id
      AND (program_id = @program_id OR program_id IS NULL)
    ORDER BY CASE WHEN program_id = @program_id THEN 0 ELSE 1 END;
  `)
  const row = result.recordset[0]
  if (!row) return null
  return {
    fileName: String(row.file_name),
    mimeType: String(row.mime_type),
    buffer: Buffer.from(row.pdf_data),
  }
}
