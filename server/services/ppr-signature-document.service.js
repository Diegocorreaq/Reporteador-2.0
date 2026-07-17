import { createHash, randomUUID } from 'node:crypto'
import { getSqlPool, sql } from '../db/sql-server.js'
import { buildPprMonthlySignaturePdf, MIME_PDF } from './pdf-export.service.js'
import { filterPprActivitiesForEmployee } from './ppr-activity-scope.service.js'
import { executeProcedure_General as executeProcedure } from './sigh-sql-helpers.js'

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
  await executeProcedure('SP_APP_PPR_ENSURE_SIGNED_DOCUMENT_INFRASTRUCTURE')
}

function addEmployeePeriodInputs(request, employeeId, periodId) {
  request.input('employee_id', sql.Int, Number(employeeId))
  request.input('period_id', sql.Int, Number(periodId))
  return request
}

async function readSigningSnapshot(transaction, employeeId, periodId, programId = null) {
  const periodRequest = addEmployeePeriodInputs(new sql.Request(transaction), employeeId, periodId)
  periodRequest.input('program_id', sql.Int, programId == null ? null : Number(programId))
  const periodResult = await periodRequest.execute('SP_APP_PPR_SIGNING_PERIOD')
  const period = periodResult.recordset[0]
  if (!period) {
    const error = new Error('El periodo solicitado no existe.')
    error.code = 'PPR_PERIOD_NOT_FOUND'
    throw error
  }

  const summaryRequest = addEmployeePeriodInputs(new sql.Request(transaction), employeeId, periodId)
  summaryRequest.input('program_id', sql.Int, programId == null ? null : Number(programId))
  const summaryResult = await summaryRequest.execute('SP_APP_PPR_SIGNING_SUMMARY')
  const summaryRow = summaryResult.recordset[0] ?? {}
  let summary = {
    total: Number(summaryRow.total_activities ?? 0),
    withValue: Number(summaryRow.with_value ?? 0),
    validated: Number(summaryRow.validated ?? 0),
  }

  const rowsRequest = addEmployeePeriodInputs(new sql.Request(transaction), employeeId, periodId)
  rowsRequest.input('year', sql.Int, Number(period.year))
  rowsRequest.input('month', sql.Int, Number(period.month))
  rowsRequest.input('program_id', sql.Int, programId == null ? null : Number(programId))
  const rowsResult = await rowsRequest.execute('SP_APP_PPR_SIGNING_ROWS')

  const scopedRows = filterPprActivitiesForEmployee(rowsResult.recordset, {
    programCodeKey: 'program_code',
    activityNameKey: 'activity_name',
    employeeId,
  })

  summary = {
    total: scopedRows.length,
    withValue: scopedRows.filter((row) => row.month_value != null).length,
    validated: scopedRows.filter((row) => row.validation_status === 'validated').length,
  }

  return {
    period: {
      id: Number(period.id),
      year: Number(period.year),
      month: Number(period.month),
      isOpen: Boolean(period.is_open),
      signedAt: period.signed_at ?? null,
    },
    summary,
    rows: scopedRows.map((row) => {
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
    const saveResult = await saveRequest.execute('SP_APP_PPR_SIGN_SAVE_DOCUMENT')

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
  const result = await request.execute('SP_APP_PPR_SIGNED_DOCUMENT_INFO')
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
  const result = await request.execute('SP_APP_PPR_SIGNED_DOCUMENT_FILE')
  const row = result.recordset[0]
  if (!row) return null
  return {
    fileName: String(row.file_name),
    mimeType: String(row.mime_type),
    buffer: Buffer.from(row.pdf_data),
  }
}
