import { createHash } from 'node:crypto'
import { getSqlPool, sql } from '../db/sql-server.js'

export const PPR_PROGRAM_DOCUMENT_TYPES = new Set([
  'manual_his',
  'sisgalen_his',
  'criterios_programacion',
])

let programDocumentInfrastructurePromise = null

function normalizeProgramCode(value) {
  const normalized = String(value ?? '').trim()
  if (!normalized) return ''
  const numeric = normalized.replace(/^0+/, '')
  return numeric || '0'
}

function padProgramCode(value) {
  const normalized = normalizeProgramCode(value)
  return /^\d+$/.test(normalized) ? normalized.padStart(4, '0') : normalized
}

function createContentHash(buffer) {
  return createHash('sha256').update(buffer).digest('hex')
}

function assertDocumentType(documentType) {
  if (!PPR_PROGRAM_DOCUMENT_TYPES.has(String(documentType))) {
    const error = new Error('Tipo de documento PPR no soportado.')
    error.code = 'PPR_DOCUMENT_TYPE_INVALID'
    throw error
  }
}

function applyProgramCodeInputs(request, programCode) {
  request.input('program_code', sql.NVarChar(30), String(programCode))
  request.input('normalized_program_code', sql.NVarChar(30), normalizeProgramCode(programCode))
  request.input('padded_program_code', sql.NVarChar(30), padProgramCode(programCode))
}

function mapProgramDocumentRow(row, { includeFile = false } = {}) {
  const mapped = {
    id: Number(row.id),
    documentType: String(row.document_type),
    documentKey: row.document_key == null ? null : String(row.document_key),
    documentYear: Number(row.document_year),
    versionLabel: String(row.version_label ?? ''),
    displayName: String(row.display_name ?? ''),
    fileName: String(row.file_name ?? ''),
    mimeType: String(row.mime_type ?? 'application/octet-stream'),
    sizeBytes: Number(row.file_size_bytes ?? 0),
    contentHash: String(row.content_hash ?? ''),
    sourceUrl: row.source_url == null ? null : String(row.source_url),
    sortOrder: Number(row.sort_order ?? 0),
    uploadedAt: row.uploaded_at,
    programCode: String(row.program_code ?? ''),
    programName: String(row.program_name ?? ''),
    notes: row.notes == null ? null : String(row.notes),
  }

  if (includeFile) {
    mapped.buffer = row.file_data == null ? null : Buffer.from(row.file_data)
  }

  return mapped
}

async function ensureProgramDocumentMetadataInfrastructure() {
  const pool = await getSqlPool('general')
  await pool.request().batch(`
    IF OBJECT_ID('dbo.ppr_program_documents', 'U') IS NULL
    BEGIN
      CREATE TABLE dbo.ppr_program_documents (
        id              INT IDENTITY(1,1) NOT NULL PRIMARY KEY,
        program_id      INT NOT NULL,
        document_type   NVARCHAR(60) NOT NULL,
        document_key    NVARCHAR(120) NULL,
        document_year   INT NOT NULL,
        version_label   NVARCHAR(80) NOT NULL,
        display_name    NVARCHAR(250) NOT NULL,
        file_name       NVARCHAR(255) NOT NULL,
        mime_type       NVARCHAR(120) NOT NULL,
        file_data       VARBINARY(MAX) NULL,
        file_size_bytes INT NOT NULL CONSTRAINT DF_ppr_program_documents_file_size DEFAULT 0,
        content_hash    CHAR(64) NULL,
        source_url      NVARCHAR(1000) NULL,
        sort_order      INT NOT NULL CONSTRAINT DF_ppr_program_documents_sort_order DEFAULT 0,
        is_current      BIT NOT NULL CONSTRAINT DF_ppr_program_documents_is_current DEFAULT 1,
        uploaded_by     INT NULL,
        uploaded_at     DATETIME2 NOT NULL CONSTRAINT DF_ppr_program_documents_uploaded_at DEFAULT SYSDATETIME(),
        notes           NVARCHAR(MAX) NULL,
        CONSTRAINT FK_ppr_program_documents_program
          FOREIGN KEY (program_id) REFERENCES dbo.ppr_programs(id)
      );
    END;

    IF OBJECT_ID('dbo.ppr_program_documents', 'U') IS NOT NULL
    BEGIN
      IF COL_LENGTH('dbo.ppr_program_documents', 'document_key') IS NULL
        ALTER TABLE dbo.ppr_program_documents ADD document_key NVARCHAR(120) NULL;

      IF COL_LENGTH('dbo.ppr_program_documents', 'source_url') IS NULL
        ALTER TABLE dbo.ppr_program_documents ADD source_url NVARCHAR(1000) NULL;

      IF COL_LENGTH('dbo.ppr_program_documents', 'sort_order') IS NULL
        ALTER TABLE dbo.ppr_program_documents ADD sort_order INT NOT NULL CONSTRAINT DF_ppr_program_documents_sort_order DEFAULT 0;

      IF EXISTS (
        SELECT 1
        FROM sys.columns
        WHERE object_id = OBJECT_ID('dbo.ppr_program_documents')
          AND name = 'file_data'
          AND is_nullable = 0
      )
        ALTER TABLE dbo.ppr_program_documents ALTER COLUMN file_data VARBINARY(MAX) NULL;

      IF EXISTS (
        SELECT 1
        FROM sys.columns
        WHERE object_id = OBJECT_ID('dbo.ppr_program_documents')
          AND name = 'content_hash'
          AND is_nullable = 0
      )
        ALTER TABLE dbo.ppr_program_documents ALTER COLUMN content_hash CHAR(64) NULL;

      IF EXISTS (
        SELECT 1
        FROM sys.indexes
        WHERE object_id = OBJECT_ID('dbo.ppr_program_documents')
          AND name = 'UX_ppr_program_documents_current'
      )
        DROP INDEX UX_ppr_program_documents_current ON dbo.ppr_program_documents;
    END
  `)

  await pool.request().batch(`
    IF OBJECT_ID('dbo.ppr_program_documents', 'U') IS NOT NULL
    BEGIN
      IF NOT EXISTS (
        SELECT 1
        FROM sys.indexes
        WHERE object_id = OBJECT_ID('dbo.ppr_program_documents')
          AND name = 'IX_ppr_program_documents_program_type_year'
      )
        EXEC(N'CREATE INDEX IX_ppr_program_documents_program_type_year
        ON dbo.ppr_program_documents(program_id, document_type, document_year DESC, uploaded_at DESC);');

      IF NOT EXISTS (
        SELECT 1
        FROM sys.indexes
        WHERE object_id = OBJECT_ID('dbo.ppr_program_documents')
          AND name = 'IX_ppr_program_documents_current_list'
      )
        EXEC(N'CREATE INDEX IX_ppr_program_documents_current_list
        ON dbo.ppr_program_documents(program_id, document_type, is_current, sort_order, display_name);');

      IF NOT EXISTS (
        SELECT 1
        FROM sys.indexes
        WHERE object_id = OBJECT_ID('dbo.ppr_program_documents')
          AND name = 'UX_ppr_program_documents_document_key'
      )
        EXEC(N'CREATE UNIQUE INDEX UX_ppr_program_documents_document_key
        ON dbo.ppr_program_documents(program_id, document_type, document_key)
        WHERE document_key IS NOT NULL;');
    END
  `)
}

export async function ensurePprProgramDocumentInfrastructure() {
  if (!programDocumentInfrastructurePromise) {
    programDocumentInfrastructurePromise = ensureProgramDocumentMetadataInfrastructure().catch((error) => {
      programDocumentInfrastructurePromise = null
      throw error
    })
  }
  await programDocumentInfrastructurePromise
}

async function findProgramByCode(request, programCode) {
  applyProgramCodeInputs(request, programCode)
  const result = await request.query(`
    SELECT TOP 1 id, code, name
    FROM dbo.ppr_programs
    WHERE code IN (@program_code, @normalized_program_code, @padded_program_code)
    ORDER BY id;
  `)
  return result.recordset[0] ?? null
}

export async function canAccessPprProgramDocument({ employeeId, programCode }) {
  await ensurePprProgramDocumentInfrastructure()
  const pool = await getSqlPool('general')
  const request = pool.request()
  request.input('employee_id', sql.Int, Number(employeeId))
  applyProgramCodeInputs(request, programCode)

  const result = await request.query(`
    SELECT CASE
      WHEN EXISTS (
        SELECT 1
        FROM dbo.ppr_programs p
        INNER JOIN dbo.ppr_user_programs up
          ON up.program_id = p.id
          AND up.employee_id = @employee_id
          AND up.is_active = 1
        WHERE p.code IN (@program_code, @normalized_program_code, @padded_program_code)
      )
      OR EXISTS (
        SELECT 1
        FROM dbo.ppr_coordinadores c
        WHERE c.idempleado = @employee_id
          AND ISNULL(c.activo, 1) = 1
      )
      THEN 1 ELSE 0
    END AS allowed;
  `)

  return Boolean(result.recordset[0]?.allowed)
}

export async function listPprProgramDocuments({ programCode, documentType }) {
  assertDocumentType(documentType)
  await ensurePprProgramDocumentInfrastructure()

  const pool = await getSqlPool('general')
  const request = pool.request()
  applyProgramCodeInputs(request, programCode)
  request.input('document_type', sql.NVarChar(60), String(documentType))

  const result = await request.query(`
    SELECT
      d.id,
      d.document_type,
      d.document_key,
      d.document_year,
      d.version_label,
      d.display_name,
      d.file_name,
      d.mime_type,
      d.file_size_bytes,
      d.content_hash,
      d.source_url,
      d.sort_order,
      d.uploaded_at,
      d.notes,
      p.code AS program_code,
      p.name AS program_name
    FROM dbo.ppr_program_documents d
    INNER JOIN dbo.ppr_programs p
      ON p.id = d.program_id
    WHERE d.document_type = @document_type
      AND d.is_current = 1
      AND p.code IN (@program_code, @normalized_program_code, @padded_program_code)
    ORDER BY d.sort_order, d.display_name, d.document_year DESC, d.uploaded_at DESC, d.id DESC;
  `)

  return result.recordset.map((row) => mapProgramDocumentRow(row))
}

export async function getPprProgramDocumentFile({ programCode, documentType, documentId = null }) {
  assertDocumentType(documentType)
  await ensurePprProgramDocumentInfrastructure()

  const pool = await getSqlPool('general')
  const request = pool.request()
  applyProgramCodeInputs(request, programCode)
  request.input('document_type', sql.NVarChar(60), String(documentType))
  request.input('document_id', sql.Int, documentId == null ? null : Number(documentId))

  const result = await request.query(`
    SELECT TOP 1
      d.id,
      d.document_type,
      d.document_key,
      d.document_year,
      d.version_label,
      d.display_name,
      d.file_name,
      d.mime_type,
      d.file_data,
      d.file_size_bytes,
      d.content_hash,
      d.source_url,
      d.sort_order,
      d.uploaded_at,
      d.notes,
      p.code AS program_code,
      p.name AS program_name
    FROM dbo.ppr_program_documents d
    INNER JOIN dbo.ppr_programs p
      ON p.id = d.program_id
    WHERE d.document_type = @document_type
      AND d.is_current = 1
      AND p.code IN (@program_code, @normalized_program_code, @padded_program_code)
      AND (@document_id IS NULL OR d.id = @document_id)
    ORDER BY
      CASE WHEN @document_id IS NULL THEN d.document_year ELSE 0 END DESC,
      CASE WHEN @document_id IS NULL THEN d.sort_order ELSE 0 END,
      d.uploaded_at DESC,
      d.id DESC;
  `)

  const row = result.recordset[0]
  if (!row) return null

  return mapProgramDocumentRow(row, { includeFile: true })
}

export async function upsertPprProgramDocument({
  programCode,
  documentType,
  documentKey = null,
  documentYear,
  versionLabel,
  displayName,
  fileName,
  mimeType,
  fileBuffer = null,
  sourceUrl = null,
  sortOrder = 0,
  uploadedBy = null,
  notes = null,
  isCurrent = true,
  replaceCurrent = true,
}) {
  assertDocumentType(documentType)
  await ensurePprProgramDocumentInfrastructure()
  const buffer = fileBuffer == null ? null : Buffer.from(fileBuffer)
  const cleanSourceUrl = sourceUrl == null ? null : String(sourceUrl).trim()
  if (!buffer && !cleanSourceUrl) {
    const error = new Error('Se requiere un archivo o una URL oficial para el documento PPR.')
    error.code = 'PPR_DOCUMENT_SOURCE_REQUIRED'
    throw error
  }

  const pool = await getSqlPool('general')
  const transaction = new sql.Transaction(pool)
  await transaction.begin(sql.ISOLATION_LEVEL.READ_COMMITTED)

  try {
    const program = await findProgramByCode(new sql.Request(transaction), programCode)
    if (!program) {
      const error = new Error(`No existe el programa PPR ${programCode}.`)
      error.code = 'PPR_PROGRAM_NOT_FOUND'
      throw error
    }

    if (isCurrent && replaceCurrent) {
      const currentRequest = new sql.Request(transaction)
      currentRequest.input('program_id', sql.Int, Number(program.id))
      currentRequest.input('document_type', sql.NVarChar(60), String(documentType))
      await currentRequest.query(`
        UPDATE dbo.ppr_program_documents
        SET is_current = 0
        WHERE program_id = @program_id
          AND document_type = @document_type
          AND is_current = 1;
      `)
    }

    const insertRequest = new sql.Request(transaction)
    insertRequest.input('program_id', sql.Int, Number(program.id))
    insertRequest.input('document_type', sql.NVarChar(60), String(documentType))
    insertRequest.input('document_key', sql.NVarChar(120), documentKey == null ? null : String(documentKey))
    insertRequest.input('document_year', sql.Int, Number(documentYear))
    insertRequest.input('version_label', sql.NVarChar(80), String(versionLabel ?? documentYear))
    insertRequest.input('display_name', sql.NVarChar(250), String(displayName))
    insertRequest.input('file_name', sql.NVarChar(255), String(fileName))
    insertRequest.input('mime_type', sql.NVarChar(120), String(mimeType))
    insertRequest.input('file_data', sql.VarBinary(sql.MAX), buffer)
    insertRequest.input('file_size_bytes', sql.Int, buffer?.length ?? 0)
    insertRequest.input('content_hash', sql.Char(64), buffer ? createContentHash(buffer) : null)
    insertRequest.input('source_url', sql.NVarChar(1000), cleanSourceUrl)
    insertRequest.input('sort_order', sql.Int, Number(sortOrder) || 0)
    insertRequest.input('is_current', sql.Bit, Boolean(isCurrent))
    insertRequest.input('uploaded_by', sql.Int, uploadedBy == null ? null : Number(uploadedBy))
    insertRequest.input('notes', sql.NVarChar(sql.MAX), notes == null ? null : String(notes))

    const insertResult = await insertRequest.query(`
      IF @document_key IS NOT NULL
      BEGIN
        MERGE dbo.ppr_program_documents AS target
        USING (
          SELECT
            @program_id AS program_id,
            @document_type AS document_type,
            @document_key AS document_key
        ) AS source
          ON target.program_id = source.program_id
          AND target.document_type = source.document_type
          AND target.document_key = source.document_key
        WHEN MATCHED THEN
          UPDATE SET
            document_year = @document_year,
            version_label = @version_label,
            display_name = @display_name,
            file_name = @file_name,
            mime_type = @mime_type,
            file_data = @file_data,
            file_size_bytes = @file_size_bytes,
            content_hash = @content_hash,
            source_url = @source_url,
            sort_order = @sort_order,
            is_current = @is_current,
            uploaded_by = @uploaded_by,
            uploaded_at = SYSDATETIME(),
            notes = @notes
        WHEN NOT MATCHED THEN
          INSERT (
            program_id,
            document_type,
            document_key,
            document_year,
            version_label,
            display_name,
            file_name,
            mime_type,
            file_data,
            file_size_bytes,
            content_hash,
            source_url,
            sort_order,
            is_current,
            uploaded_by,
            notes
          )
          VALUES (
            @program_id,
            @document_type,
            @document_key,
            @document_year,
            @version_label,
            @display_name,
            @file_name,
            @mime_type,
            @file_data,
            @file_size_bytes,
            @content_hash,
            @source_url,
            @sort_order,
            @is_current,
            @uploaded_by,
            @notes
          )
        OUTPUT INSERTED.id;
      END
      ELSE
      BEGIN
        INSERT INTO dbo.ppr_program_documents (
          program_id,
          document_type,
          document_key,
          document_year,
          version_label,
          display_name,
          file_name,
          mime_type,
          file_data,
          file_size_bytes,
          content_hash,
          source_url,
          sort_order,
          is_current,
          uploaded_by,
          notes
        )
        OUTPUT INSERTED.id
        VALUES (
          @program_id,
          @document_type,
          @document_key,
          @document_year,
          @version_label,
          @display_name,
          @file_name,
          @mime_type,
          @file_data,
          @file_size_bytes,
          @content_hash,
          @source_url,
          @sort_order,
          @is_current,
          @uploaded_by,
          @notes
        );
      END
    `)

    await transaction.commit()
    return {
      id: Number(insertResult.recordset[0]?.id),
      programId: Number(program.id),
      programCode: String(program.code ?? ''),
      documentType: String(documentType),
      documentYear: Number(documentYear),
      isCurrent: Boolean(isCurrent),
    }
  } catch (error) {
    await transaction.rollback()
    throw error
  }
}
