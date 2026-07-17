import { Router } from 'express'
import ExcelJS from 'exceljs'
import { requireAuth } from '../middleware/require-auth.js'
import { authLimiter } from '../middleware/rate-limit.js'
import { validatePprUser } from '../services/ppr.service.js'
import {
  getPeriodoActivo,
  getProgramasUsuario,
  getActividadesPrograma,
  guardarValor,
  validarValor,
  getPeriodosUsuario,
  getResumenValidacion,
  getResumenAnual,
  getProgramaDetalle,
  getEvaluacionMensual,
  getProgramaPreliminar,
  refreshProgramaPreliminar,
  buscarEmpleados,
  verificarAdmin,
  getCoordinadores,
  guardarCoordinador,
  getTodosLosProgramas,
  guardarAsignacion,
  getActividadesAdmin,
  guardarActividad,
  toggleActividad,
  getMatrizExportData,
  getPprImportSources,
  runPprImport,
} from '../services/ppr-data.service.js'
import {
  getPprDraftDocumentFile,
  getPprSignedDocumentFile,
  getPprSignedDocumentInfo,
  signPprPeriodWithMockDocument,
} from '../services/ppr-signature-document.service.js'
import {
  canAccessPprProgramDocument,
  getPprProgramDocumentFile,
  listPprProgramDocuments,
} from '../services/ppr-program-documents.service.js'
import { logger } from '../utils/logger.js'

export const pprRouter = Router()

const PPR_DATA_ENTRY_LOCKED = true
const PPR_DATA_ENTRY_LOCKED_RESPONSE = {
  code: 'PPR_DATA_ENTRY_LOCKED',
  message: 'El registro de informacion PPR esta bloqueado temporalmente. Puede visualizar el modulo, pero no enviar datos.',
}

// Verifies the requesting employee is a PPR admin before allowing admin operations
async function requirePprAdmin(request, response, next) {
  const adminId = Number(request.user?.employeeId)
  if (!adminId) {
    return response.status(403).json({ code: 'FORBIDDEN', message: 'No se pudo identificar al administrador PPR autenticado.' })
  }
  try {
    const isAdmin = await verificarAdmin(adminId)
    if (!isAdmin) {
      return response.status(403).json({ code: 'FORBIDDEN', message: 'No tiene permisos de administrador PPR.' })
    }
    request.pprAdminId = adminId
    next()
  } catch {
    response.status(500).json({ code: 'PPR_ERROR', message: 'Error al verificar permisos.' })
  }
}

function getClientIp(request) {
  const forwarded = request.headers['x-forwarded-for']
  if (typeof forwarded === 'string' && forwarded.length > 0) {
    return forwarded.split(',')[0].trim()
  }
  return request.ip || request.socket?.remoteAddress || '0.0.0.0'
}

function contentDispositionAttachment(fileName) {
  const fallback = String(fileName ?? 'documento-ppr')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^0-9A-Za-z._-]+/g, '_')
    .replace(/^_+|_+$/g, '')
    || 'documento-ppr'

  return `attachment; filename="${fallback}"; filename*=UTF-8''${encodeURIComponent(String(fileName ?? fallback))}`
}

function blockPprDataEntryIfLocked(request, response, next) {
  if (!PPR_DATA_ENTRY_LOCKED) {
    return next()
  }
  logger.warn({
    correlationId: request.correlationId,
    event: 'ppr:data-entry:locked',
    userId: request.user?.id,
    path: request.originalUrl,
  })
  return response.status(423).json(PPR_DATA_ENTRY_LOCKED_RESPONSE)
}

function sendProgramDocument(response, file) {
  if (file.sourceUrl && !file.buffer) {
    return response.redirect(302, file.sourceUrl)
  }

  if (!file.buffer) {
    return response.status(404).json({
      code: 'PPR_PROGRAM_DOCUMENT_FILE_NOT_FOUND',
      message: 'El documento no tiene archivo almacenado ni URL oficial.',
    })
  }

  response.setHeader('Content-Type', file.mimeType)
  response.setHeader('Content-Length', file.buffer.length)
  response.setHeader('Content-Disposition', contentDispositionAttachment(file.fileName))
  response.setHeader('Cache-Control', 'private, no-cache')
  response.setHeader('Access-Control-Expose-Headers', 'Content-Disposition')
  return response.send(file.buffer)
}

// POST /ppr/validate — validate PPR access via SP_USUARIO_VALIDA_ppr (same pattern as LM)
pprRouter.post('/ppr/validate', requireAuth, authLimiter, async (request, response) => {
  try {
    const { username, password } = request.body ?? {}
    const ip = getClientIp(request)

    const result = await validatePprUser({
      username: String(username ?? '').trim(),
      password: String(password ?? '').trim(),
      ip,
    })

    if (result.ok) {
      logger.info({
        correlationId: request.correlationId,
        event: 'ppr:validate:success',
        userId: request.user?.id,
      })
    } else {
      logger.warn({
        correlationId: request.correlationId,
        event: 'ppr:validate:denied',
        userId: request.user?.id,
      })
    }

    response.json(result)
  } catch (error) {
    logger.error({ correlationId: request.correlationId, event: 'ppr:validate:error', message: String(error) })
    response.status(500).json({ ok: false, employeeId: null, employeeName: '', message: 'Error al validar el acceso.' })
  }
})

// GET /ppr/periodo-activo — current open period
pprRouter.get('/ppr/periodo-activo', requireAuth, async (request, response) => {
  try {
    const periodo = await getPeriodoActivo()
    if (!periodo) {
      return response.status(404).json({ code: 'NO_ACTIVE_PERIOD', message: 'No hay período activo.' })
    }
    response.json({ periodo })
  } catch (error) {
    logger.error({ correlationId: request.correlationId, event: 'ppr:periodo-activo:error', message: String(error) })
    response.status(500).json({ code: 'PPR_ERROR', message: 'Error al obtener período activo.' })
  }
})

// GET /ppr/programas — programs assigned to the validated employee
pprRouter.get('/ppr/programas', requireAuth, async (request, response) => {
  const employeeId = Number(request.query.employeeId)
  if (!employeeId) {
    return response.status(400).json({ code: 'MISSING_PARAMS', message: 'Se requiere employeeId.' })
  }
  try {
    const programas = await getProgramasUsuario(employeeId)
    response.json({ programas })
  } catch (error) {
    logger.error({ correlationId: request.correlationId, event: 'ppr:programas:error', message: String(error) })
    response.status(500).json({ code: 'PPR_ERROR', message: 'Error al obtener programas.' })
  }
})

// GET /ppr/actividades?programaId=&periodoId=&employeeId= — activities with current period values
pprRouter.get('/ppr/actividades', requireAuth, async (request, response) => {
  const programaId = Number(request.query.programaId)
  const periodoId = Number(request.query.periodoId)
  const employeeId = Number(request.query.employeeId)
  if (!programaId || !periodoId || !employeeId) {
    return response.status(400).json({ code: 'MISSING_PARAMS', message: 'Se requiere programaId, periodoId y employeeId.' })
  }
  try {
    const actividades = await getActividadesPrograma({ programaId, periodoId, employeeId })
    response.json({ actividades })
  } catch (error) {
    logger.error({ correlationId: request.correlationId, event: 'ppr:actividades:error', message: String(error) })
    response.status(500).json({ code: 'PPR_ERROR', message: 'Error al obtener actividades.' })
  }
})

// POST /ppr/valores — save or update a monthly value
pprRouter.post('/ppr/valores', requireAuth, blockPprDataEntryIfLocked, async (request, response) => {
  const { activityId, periodId, employeeId, value, notes } = request.body ?? {}
  if (activityId == null || periodId == null || employeeId == null || value == null) {
    return response.status(400).json({ code: 'MISSING_PARAMS', message: 'Se requiere activityId, periodId, employeeId y value.' })
  }
  try {
    await guardarValor({
      activityId: Number(activityId),
      periodId: Number(periodId),
      employeeId: Number(employeeId),
      value: Number(value),
      notes: notes ?? null,
    })
    response.json({ ok: true })
  } catch (error) {
    logger.error({ correlationId: request.correlationId, event: 'ppr:valores:error', message: String(error) })
    if (error?.code === 'PPR_ACTIVITY_FORBIDDEN') {
      return response.status(403).json({ code: error.code, message: error.message })
    }
    if (error?.code === 'PPR_ACTIVITY_NOT_FOUND') {
      return response.status(404).json({ code: error.code, message: error.message })
    }
    response.status(500).json({ code: 'PPR_ERROR', message: 'Error al guardar valor.' })
  }
})

// GET /ppr/periodos — all periods for the year with signing/progress status per employee
// POST /ppr/valores/validar — validate one monthly value before signing
pprRouter.post('/ppr/valores/validar', requireAuth, blockPprDataEntryIfLocked, async (request, response) => {
  const { activityId, periodId, employeeId } = request.body ?? {}
  if (activityId == null || periodId == null || employeeId == null) {
    return response.status(400).json({ code: 'MISSING_PARAMS', message: 'Se requiere activityId, periodId y employeeId.' })
  }
  try {
    const validatedAt = await validarValor({
      activityId: Number(activityId),
      periodId: Number(periodId),
      employeeId: Number(employeeId),
    })
    response.json({ ok: true, validatedAt })
  } catch (error) {
    const status = error?.code === 'PPR_VALIDATE_EMPTY'
      ? 409
      : error?.code === 'PPR_ACTIVITY_FORBIDDEN'
        ? 403
        : error?.code === 'PPR_ACTIVITY_NOT_FOUND'
          ? 404
          : 500
    logger.error({ correlationId: request.correlationId, event: 'ppr:valores:validar:error', message: String(error) })
    response.status(status).json({
      code: error?.code ?? 'PPR_ERROR',
      message: error?.message ?? 'Error al validar valor.',
    })
  }
})

// GET /ppr/validacion/resumen — global validation state for a coordinator and period
pprRouter.get('/ppr/validacion/resumen', requireAuth, async (request, response) => {
  const employeeId = Number(request.query.employeeId)
  const periodId = Number(request.query.periodId)
  const programId = request.query.programId != null ? Number(request.query.programId) : null
  if (!employeeId || !periodId) {
    return response.status(400).json({ code: 'MISSING_PARAMS', message: 'Se requiere employeeId y periodId.' })
  }
  try {
    const resumen = await getResumenValidacion(employeeId, periodId, programId)
    response.json({ resumen })
  } catch (error) {
    logger.error({ correlationId: request.correlationId, event: 'ppr:validacion:resumen:error', message: String(error) })
    response.status(500).json({ code: 'PPR_ERROR', message: 'Error al obtener resumen de validación.' })
  }
})

pprRouter.get('/ppr/periodos', requireAuth, async (request, response) => {
  const employeeId = Number(request.query.employeeId)
  if (!employeeId) {
    return response.status(400).json({ code: 'MISSING_PARAMS', message: 'Se requiere employeeId.' })
  }
  try {
    const periodos = await getPeriodosUsuario(employeeId)
    response.json({ periodos })
  } catch (error) {
    logger.error({ correlationId: request.correlationId, event: 'ppr:periodos:error', message: String(error) })
    response.status(500).json({ code: 'PPR_ERROR', message: 'Error al obtener períodos.' })
  }
})

// GET /ppr/resumen — annual summary matrix (programs × months)
pprRouter.get('/ppr/resumen', requireAuth, async (request, response) => {
  const employeeId = Number(request.query.employeeId)
  const year = Number(request.query.year) || new Date().getFullYear()
  if (!employeeId) {
    return response.status(400).json({ code: 'MISSING_PARAMS', message: 'Se requiere employeeId.' })
  }
  try {
    const resumen = await getResumenAnual(employeeId, year)
    response.json({ resumen, year })
  } catch (error) {
    logger.error({ correlationId: request.correlationId, event: 'ppr:resumen:error', message: String(error) })
    response.status(500).json({ code: 'PPR_ERROR', message: 'Error al obtener resumen anual.' })
  }
})

// POST /ppr/firmar — sign the active period
pprRouter.post('/ppr/firmar', requireAuth, blockPprDataEntryIfLocked, async (request, response) => {
  const { periodId, employeeId, programId, forceForTesting } = request.body ?? {}
  if (periodId == null || employeeId == null || programId == null) {
    return response.status(400).json({
      code: 'MISSING_PARAMS',
      message: 'Se requiere periodId, employeeId y programId.',
    })
  }
  try {
    if (Number(request.user?.employeeId) !== Number(employeeId)) {
      return response.status(403).json({
        code: 'FORBIDDEN',
        message: 'Solo puede firmar periodos correspondientes a su propia sesion.',
      })
    }
    const isForcedTestSign = Boolean(forceForTesting)
    if (isForcedTestSign) {
      const isAdmin = await verificarAdmin(Number(employeeId))
      if (!isAdmin) {
        return response.status(403).json({
          code: 'FORBIDDEN',
          message: 'Solo un administrador PPR puede firmar con actividades pendientes.',
        })
      }
    }
    const result = await signPprPeriodWithMockDocument({
      employeeId: Number(employeeId),
      periodId: Number(periodId),
      programId: Number(programId),
      signerDni: String(request.user?.username ?? '').trim(),
      signerName: String(request.user?.name ?? '').trim(),
      forceForTesting: isForcedTestSign,
    })
    logger.info({
      correlationId: request.correlationId,
      event: 'ppr:firmar',
      employeeId,
      periodId,
      programId: programId ?? null,
      forceForTesting: isForcedTestSign,
      documentCode: result.document.code,
    })
    response.json({ ok: true, ...result })
  } catch (error) {
    logger.error({ correlationId: request.correlationId, event: 'ppr:firmar:error', message: String(error) })
    if (error?.code === 'PPR_VALIDATION_PENDING') {
      return response.status(409).json({
        code: 'PPR_VALIDATION_PENDING',
        message: error.message,
        resumen: error.summary,
      })
    }
    if (error?.code === 'PPR_PERIOD_NOT_FOUND') {
      return response.status(404).json({ code: error.code, message: error.message })
    }
    if (['PPR_PERIOD_CLOSED', 'PPR_PERIOD_ALREADY_SIGNED'].includes(error?.code)) {
      return response.status(409).json({ code: error.code, message: error.message })
    }
    response.status(500).json({ code: 'PPR_ERROR', message: 'Error al firmar período.' })
  }
})

// GET /ppr/documentos/:periodId/borrador/pdf — unsigned document for the selected program
pprRouter.get('/ppr/documentos/:periodId/borrador/pdf', requireAuth, async (request, response) => {
  const periodId = Number(request.params.periodId)
  const employeeId = Number(request.query.employeeId)
  const programId = Number(request.query.programId)
  if (!periodId || !employeeId || !programId) {
    return response.status(400).json({
      code: 'MISSING_PARAMS',
      message: 'Se requiere periodId, employeeId y programId.',
    })
  }
  if (Number(request.user?.employeeId) !== employeeId) {
    return response.status(403).json({ code: 'FORBIDDEN', message: 'No puede generar documentos de otro usuario.' })
  }
  try {
    const file = await getPprDraftDocumentFile({
      employeeId,
      periodId,
      programId,
      signerDni: String(request.user?.username ?? '').trim(),
      signerName: String(request.user?.name ?? '').trim(),
    })
    response.setHeader('Content-Type', file.mimeType)
    response.setHeader('Content-Length', file.buffer.length)
    response.setHeader('Content-Disposition', `inline; filename="${file.fileName}"`)
    response.setHeader('Cache-Control', 'private, no-store')
    response.setHeader('Access-Control-Expose-Headers', 'Content-Disposition')
    response.send(file.buffer)
  } catch (error) {
    logger.error({
      correlationId: request.correlationId,
      event: 'ppr:borrador:error',
      message: String(error),
    })
    if (error?.code === 'PPR_PERIOD_NOT_FOUND') {
      return response.status(404).json({ code: error.code, message: error.message })
    }
    if (['PPR_PERIOD_CLOSED', 'PPR_PERIOD_ALREADY_SIGNED'].includes(error?.code)) {
      return response.status(409).json({ code: error.code, message: error.message })
    }
    response.status(500).json({ code: 'PPR_ERROR', message: 'Error al generar el borrador del documento.' })
  }
})

pprRouter.get('/ppr/firmas/:periodId', requireAuth, async (request, response) => {
  const periodId = Number(request.params.periodId)
  const employeeId = Number(request.query.employeeId)
  const programId = Number(request.query.programId)
  if (!periodId || !employeeId || !programId) {
    return response.status(400).json({
      code: 'MISSING_PARAMS',
      message: 'Se requiere periodId, employeeId y programId.',
    })
  }
  if (Number(request.user?.employeeId) !== employeeId) {
    return response.status(403).json({ code: 'FORBIDDEN', message: 'No puede consultar documentos de otro usuario.' })
  }
  try {
    const document = await getPprSignedDocumentInfo({ employeeId, periodId, programId })
    response.json({ exists: Boolean(document), document })
  } catch (error) {
    logger.error({
      correlationId: request.correlationId,
      event: 'ppr:firma:metadata:error',
      message: String(error),
    })
    response.status(500).json({ code: 'PPR_ERROR', message: 'Error al consultar el documento firmado.' })
  }
})

pprRouter.get('/ppr/firmas/:periodId/pdf', requireAuth, async (request, response) => {
  const periodId = Number(request.params.periodId)
  const employeeId = Number(request.query.employeeId)
  const programId = Number(request.query.programId)
  if (!periodId || !employeeId || !programId) {
    return response.status(400).json({
      code: 'MISSING_PARAMS',
      message: 'Se requiere periodId, employeeId y programId.',
    })
  }
  if (Number(request.user?.employeeId) !== employeeId) {
    return response.status(403).json({ code: 'FORBIDDEN', message: 'No puede descargar documentos de otro usuario.' })
  }
  try {
    const file = await getPprSignedDocumentFile({ employeeId, periodId, programId })
    if (!file) {
      return response.status(404).json({
        code: 'PPR_SIGNED_DOCUMENT_NOT_FOUND',
        message: 'El periodo no tiene un PDF firmado almacenado.',
      })
    }
    response.setHeader('Content-Type', file.mimeType)
    response.setHeader('Content-Length', file.buffer.length)
    response.setHeader('Content-Disposition', `attachment; filename="${file.fileName}"`)
    response.setHeader('Cache-Control', 'private, no-store')
    response.setHeader('Access-Control-Expose-Headers', 'Content-Disposition')
    response.send(file.buffer)
  } catch (error) {
    logger.error({
      correlationId: request.correlationId,
      event: 'ppr:firma:download:error',
      message: String(error),
    })
    response.status(500).json({ code: 'PPR_ERROR', message: 'Error al descargar el documento firmado.' })
  }
})

pprRouter.get('/ppr/programas/:programCode/documentos/:documentType', requireAuth, async (request, response) => {
  const { programCode, documentType } = request.params
  const employeeId = Number(request.user?.employeeId)
  if (!programCode || !documentType || !employeeId) {
    return response.status(400).json({
      code: 'MISSING_PARAMS',
      message: 'Se requiere programa, tipo de documento y usuario autenticado.',
    })
  }

  try {
    const allowed = await canAccessPprProgramDocument({ employeeId, programCode })
    if (!allowed) {
      return response.status(403).json({
        code: 'FORBIDDEN',
        message: 'No tiene permisos para consultar documentos de este programa PPR.',
      })
    }

    const documents = await listPprProgramDocuments({ programCode, documentType })
    response.json({ documents })
  } catch (error) {
    const status = error?.code === 'PPR_DOCUMENT_TYPE_INVALID' ? 400 : 500
    logger.error({
      correlationId: request.correlationId,
      event: 'ppr:program-document:list:error',
      programCode,
      documentType,
      message: String(error),
    })
    response.status(status).json({
      code: error?.code ?? 'PPR_ERROR',
      message: error?.message ?? 'Error al listar documentos del programa.',
    })
  }
})

pprRouter.get('/ppr/programas/:programCode/documentos/:documentType/:documentId/download', requireAuth, async (request, response) => {
  const { programCode, documentType } = request.params
  const documentId = Number(request.params.documentId)
  const employeeId = Number(request.user?.employeeId)
  if (!programCode || !documentType || !documentId || !employeeId) {
    return response.status(400).json({
      code: 'MISSING_PARAMS',
      message: 'Se requiere programa, tipo de documento, documento y usuario autenticado.',
    })
  }

  try {
    const allowed = await canAccessPprProgramDocument({ employeeId, programCode })
    if (!allowed) {
      return response.status(403).json({
        code: 'FORBIDDEN',
        message: 'No tiene permisos para descargar documentos de este programa PPR.',
      })
    }

    const file = await getPprProgramDocumentFile({ programCode, documentType, documentId })
    if (!file) {
      return response.status(404).json({
        code: 'PPR_PROGRAM_DOCUMENT_NOT_FOUND',
        message: 'No hay un documento vigente para este programa y tipo.',
      })
    }

    return sendProgramDocument(response, file)
  } catch (error) {
    const status = error?.code === 'PPR_DOCUMENT_TYPE_INVALID' ? 400 : 500
    logger.error({
      correlationId: request.correlationId,
      event: 'ppr:program-document:download-id:error',
      programCode,
      documentType,
      documentId,
      message: String(error),
    })
    response.status(status).json({
      code: error?.code ?? 'PPR_ERROR',
      message: error?.message ?? 'Error al descargar el documento del programa.',
    })
  }
})

pprRouter.get('/ppr/programas/:programCode/documentos/:documentType/download', requireAuth, async (request, response) => {
  const { programCode, documentType } = request.params
  const employeeId = Number(request.user?.employeeId)
  if (!programCode || !documentType || !employeeId) {
    return response.status(400).json({
      code: 'MISSING_PARAMS',
      message: 'Se requiere programa, tipo de documento y usuario autenticado.',
    })
  }

  try {
    const allowed = await canAccessPprProgramDocument({ employeeId, programCode })
    if (!allowed) {
      return response.status(403).json({
        code: 'FORBIDDEN',
        message: 'No tiene permisos para descargar documentos de este programa PPR.',
      })
    }

    const file = await getPprProgramDocumentFile({ programCode, documentType })
    if (!file) {
      return response.status(404).json({
        code: 'PPR_PROGRAM_DOCUMENT_NOT_FOUND',
        message: 'No hay un documento vigente para este programa y tipo.',
      })
    }

    return sendProgramDocument(response, file)
  } catch (error) {
    const status = error?.code === 'PPR_DOCUMENT_TYPE_INVALID' ? 400 : 500
    logger.error({
      correlationId: request.correlationId,
      event: 'ppr:program-document:download:error',
      programCode,
      documentType,
      message: String(error),
    })
    response.status(status).json({
      code: error?.code ?? 'PPR_ERROR',
      message: error?.message ?? 'Error al descargar el documento del programa.',
    })
  }
})

pprRouter.get('/ppr/programa-detalle', requireAuth, async (request, response) => {
  const programId = Number(request.query.programId)
  const employeeId = Number(request.query.employeeId)
  const year = Number(request.query.year) || new Date().getFullYear()
  if (!programId || !employeeId) {
    return response.status(400).json({ code: 'MISSING_PARAMS', message: 'Se requiere programId y employeeId.' })
  }
  try {
    const detalle = await getProgramaDetalle(programId, year, employeeId)
    if (!detalle) {
      return response.status(404).json({ code: 'NOT_FOUND', message: 'Programa no encontrado.' })
    }
    response.json({ detalle })
  } catch (error) {
    logger.error({ correlationId: request.correlationId, event: 'ppr:programa-detalle:error', message: String(error) })
    response.status(500).json({ code: 'PPR_ERROR', message: 'Error al obtener detalle del programa.' })
  }
})

pprRouter.get('/ppr/programa-preliminar', requireAuth, async (request, response) => {
  const programId = Number(request.query.programId)
  const requesterEmployeeId = Number(request.user?.employeeId)
  if (!programId || !requesterEmployeeId) {
    return response.status(400).json({ code: 'MISSING_PARAMS', message: 'Se requiere programId.' })
  }
  try {
    const preliminar = await getProgramaPreliminar(programId, requesterEmployeeId)
    response.json({ preliminar })
  } catch (error) {
    const status = error?.code === 'PPR_PRELIMINARY_SOURCE_NOT_FOUND'
      ? 404
      : error?.code === 'PPR_PROGRAM_FORBIDDEN'
        ? 403
        : 500
    logger.error({ correlationId: request.correlationId, event: 'ppr:programa-preliminar:error', message: String(error) })
    response.status(status).json({
      code: error?.code ?? 'PPR_ERROR',
      message: error?.message ?? 'Error al obtener informacion preliminar.',
    })
  }
})

// GET /ppr/empleados/search?q= — search employees by name or DNI (admin only)
pprRouter.get('/ppr/evaluacion-mensual', requireAuth, async (request, response) => {
  const programId = Number(request.query.programId)
  const year = Number(request.query.year) || new Date().getFullYear()
  const month = Number(request.query.month) || (new Date().getMonth() + 1)
  const requesterEmployeeId = Number(request.user?.employeeId)
  if (!programId || !requesterEmployeeId || month < 1 || month > 12) {
    return response.status(400).json({ code: 'MISSING_PARAMS', message: 'Se requiere programId, year y month validos.' })
  }
  try {
    const evaluacion = await getEvaluacionMensual({
      programId,
      year,
      month,
      employeeId: requesterEmployeeId,
    })
    response.json({ evaluacion })
  } catch (error) {
    const status = error?.code === 'PPR_PROGRAM_FORBIDDEN' ? 403 : 500
    logger.error({ correlationId: request.correlationId, event: 'ppr:evaluacion-mensual:error', message: String(error) })
    response.status(status).json({
      code: error?.code ?? 'PPR_ERROR',
      message: error?.message ?? 'Error al obtener evaluacion mensual.',
    })
  }
})

pprRouter.get('/ppr/empleados/search', requireAuth, requirePprAdmin, async (request, response) => {
  const q = String(request.query.q ?? '').trim()
  if (q.length < 2) {
    return response.json({ empleados: [] })
  }
  try {
    const empleados = await buscarEmpleados(q)
    response.json({ empleados })
  } catch (error) {
    logger.error({ correlationId: request.correlationId, event: 'ppr:empleados:search:error', message: String(error) })
    response.status(500).json({ code: 'PPR_ERROR', message: 'Error al buscar empleados.' })
  }
})

// ─── Admin routes ─────────────────────────────────────────────────────────────

// GET /ppr/admin/coordinadores — list all coordinators with their programs
pprRouter.get('/ppr/admin/cargas/sources', requireAuth, requirePprAdmin, async (_request, response) => {
  response.json({ sources: getPprImportSources() })
})

pprRouter.post('/ppr/admin/cargas/run', requireAuth, requirePprAdmin, async (request, response) => {
  const { programId, sourceId } = request.body ?? {}
  if (!programId || !sourceId) {
    return response.status(400).json({ code: 'MISSING_PARAMS', message: 'Se requiere programId y sourceId.' })
  }
  try {
    const result = await runPprImport({
      programId: Number(programId),
      sourceId: String(sourceId),
      adminId: request.pprAdminId,
    })
    logger.info({
      correlationId: request.correlationId,
      event: 'ppr:admin:carga:run',
      programId,
      sourceId,
      rowsUpdated: result.rowsUpdated,
    })
    response.json({ ok: true, result })
  } catch (error) {
    const isConflict = ['PPR_PERIOD_SIGNED', 'PPR_NO_OPEN_PERIOD'].includes(error?.code)
    logger.error({ correlationId: request.correlationId, event: 'ppr:admin:carga:run:error', message: String(error) })
    response.status(isConflict ? 409 : 500).json({
      code: error?.code ?? 'PPR_ERROR',
      message: error?.message ?? 'Error al ejecutar la carga mensual.',
    })
  }
})

pprRouter.post('/ppr/admin/preliminar/run', requireAuth, requirePprAdmin, async (request, response) => {
  const { programId } = request.body ?? {}
  if (!programId) {
    return response.status(400).json({ code: 'MISSING_PARAMS', message: 'Se requiere programId.' })
  }
  try {
    const result = await refreshProgramaPreliminar(Number(programId), request.pprAdminId)
    logger.info({
      correlationId: request.correlationId,
      event: 'ppr:admin:preliminar:run',
      programId,
      rowsMatched: result?.rowsMatched ?? 0,
    })
    response.json({ ok: true, result })
  } catch (error) {
    const isNotFound = error?.code === 'PPR_PRELIMINARY_SOURCE_NOT_FOUND'
    logger.error({ correlationId: request.correlationId, event: 'ppr:admin:preliminar:run:error', message: String(error) })
    response.status(isNotFound ? 404 : 500).json({
      code: error?.code ?? 'PPR_ERROR',
      message: error?.message ?? 'Error al ejecutar la carga preliminar.',
    })
  }
})

pprRouter.get('/ppr/admin/coordinadores', requireAuth, requirePprAdmin, async (request, response) => {
  try {
    const coordinadores = await getCoordinadores()
    response.json({ coordinadores })
  } catch (error) {
    logger.error({ correlationId: request.correlationId, event: 'ppr:admin:coordinadores:error', message: String(error) })
    response.status(500).json({ code: 'PPR_ERROR', message: 'Error al obtener coordinadores.' })
  }
})

// POST /ppr/admin/coordinadores — add a coordinator (adminId, employeeId, activo=true)
pprRouter.post('/ppr/admin/coordinadores', requireAuth, requirePprAdmin, async (request, response) => {
  const { employeeId } = request.body ?? {}
  if (!employeeId) {
    return response.status(400).json({ code: 'MISSING_PARAMS', message: 'Se requiere employeeId.' })
  }
  try {
    const result = await guardarCoordinador({
      employeeId: Number(employeeId),
      activo: true,
      adminId: request.pprAdminId,
    })
    logger.info({ correlationId: request.correlationId, event: 'ppr:admin:add-coordinador', employeeId })
    response.json({ ok: true, result })
  } catch (error) {
    logger.error({ correlationId: request.correlationId, event: 'ppr:admin:add-coordinador:error', message: String(error) })
    response.status(500).json({ code: 'PPR_ERROR', message: 'Error al agregar coordinador.' })
  }
})

// PATCH /ppr/admin/coordinadores/:id — toggle active status
pprRouter.patch('/ppr/admin/coordinadores/:id', requireAuth, requirePprAdmin, async (request, response) => {
  const employeeId = Number(request.params.id)
  const { activo } = request.body ?? {}
  if (!employeeId || activo == null) {
    return response.status(400).json({ code: 'MISSING_PARAMS', message: 'Se requiere employeeId y activo.' })
  }
  try {
    await guardarCoordinador({ employeeId, activo: Boolean(activo), adminId: request.pprAdminId })
    logger.info({ correlationId: request.correlationId, event: 'ppr:admin:toggle-coordinador', employeeId, activo })
    response.json({ ok: true })
  } catch (error) {
    logger.error({ correlationId: request.correlationId, event: 'ppr:admin:toggle-coordinador:error', message: String(error) })
    response.status(500).json({ code: 'PPR_ERROR', message: 'Error al actualizar coordinador.' })
  }
})

// GET /ppr/admin/programas — list all programs available in the system
pprRouter.get('/ppr/admin/programas', requireAuth, requirePprAdmin, async (request, response) => {
  try {
    const programas = await getTodosLosProgramas()
    response.json({ programas })
  } catch (error) {
    logger.error({ correlationId: request.correlationId, event: 'ppr:admin:programas:error', message: String(error) })
    response.status(500).json({ code: 'PPR_ERROR', message: 'Error al obtener programas.' })
  }
})

// GET /ppr/admin/actividades?programId= — list all activities for a program (admin)
pprRouter.get('/ppr/admin/actividades', requireAuth, requirePprAdmin, async (request, response) => {
  const programId = Number(request.query.programId)
  if (!programId) {
    return response.status(400).json({ code: 'MISSING_PARAMS', message: 'Se requiere programId.' })
  }
  try {
    const actividades = await getActividadesAdmin(programId)
    response.json({ actividades })
  } catch (error) {
    logger.error({ correlationId: request.correlationId, event: 'ppr:admin:actividades:error', message: String(error) })
    response.status(500).json({ code: 'PPR_ERROR', message: 'Error al obtener actividades.' })
  }
})

// POST /ppr/admin/actividades — create or update an activity
pprRouter.post('/ppr/admin/actividades', requireAuth, requirePprAdmin, async (request, response) => {
  const { id, programId, code, name, unit, annualGoal, sortOrder, isActive, activityGroupCode } = request.body ?? {}
  if (!programId || !name || !unit) {
    return response.status(400).json({ code: 'MISSING_PARAMS', message: 'Se requiere programId, name y unit.' })
  }
  try {
    const result = await guardarActividad({
      id: id ?? null,
      programId: Number(programId),
      code: code ?? '',
      name: String(name).trim(),
      unit: String(unit).trim(),
      annualGoal: annualGoal != null ? Number(annualGoal) : null,
      sortOrder: Number(sortOrder) || 1,
      isActive: isActive !== false,
      adminId: request.pprAdminId,
      activityGroupCode: activityGroupCode ?? null,
    })
    logger.info({ correlationId: request.correlationId, event: 'ppr:admin:guardar-actividad', id, programId })
    response.json({ ok: true, id: result.id })
  } catch (error) {
    logger.error({ correlationId: request.correlationId, event: 'ppr:admin:guardar-actividad:error', message: String(error) })
    response.status(500).json({ code: 'PPR_ERROR', message: 'Error al guardar la actividad.' })
  }
})

// PATCH /ppr/admin/actividades/:id/toggle — activate / deactivate an activity
pprRouter.patch('/ppr/admin/actividades/:id/toggle', requireAuth, requirePprAdmin, async (request, response) => {
  const activityId = Number(request.params.id)
  const { isActive } = request.body ?? {}
  if (!activityId || isActive == null) {
    return response.status(400).json({ code: 'MISSING_PARAMS', message: 'Se requiere activityId e isActive.' })
  }
  try {
    await toggleActividad({ activityId, isActive: Boolean(isActive), adminId: request.pprAdminId })
    logger.info({ correlationId: request.correlationId, event: 'ppr:admin:toggle-actividad', activityId, isActive })
    response.json({ ok: true })
  } catch (error) {
    logger.error({ correlationId: request.correlationId, event: 'ppr:admin:toggle-actividad:error', message: String(error) })
    response.status(500).json({ code: 'PPR_ERROR', message: 'Error al cambiar estado de la actividad.' })
  }
})

// GET /ppr/admin/export/matriz?year= — generate full PPR matrix Excel (admin only)
pprRouter.get('/ppr/admin/export/matriz', requireAuth, requirePprAdmin, async (request, response) => {
  const year = Number(request.query.year) || new Date().getFullYear()

  try {
    const rows = await getMatrizExportData(year)

    const workbook = new ExcelJS.Workbook()
    workbook.creator = 'Portal PPR'
    workbook.created = new Date()

    const MONTHS_SHORT = ['ENE','FEB','MAR','ABR','MAY','JUN','JUL','AGO','SEP','OCT','NOV','DIC']
    // 35 columns: A-H (info) | I-T (F(SE)01-12) | U (total exec) | V-AG (META01-12) | AH (total meta) | AI (obs)
    const TOTAL_COLS = 35

    const ws = workbook.addWorksheet(`Matriz PPR ${year}`, {
      views: [{ state: 'frozen', ySplit: 4, xSplit: 8 }],
      pageSetup: { orientation: 'landscape', fitToPage: true, fitToWidth: 1, fitToHeight: 0, paperSize: 9 },
    })

    ws.columns = [
      { width: 6  }, // A  POI
      { width: 14 }, // B  Categoría ID
      { width: 44 }, // C  Categoría
      { width: 34 }, // D  Responsable
      { width: 16 }, // E  AO ID
      { width: 60 }, // F  Actividad Operativa
      { width: 8  }, // G  UM ID
      { width: 20 }, // H  Unidad de Medida
      ...Array(12).fill({ width: 10 }), // I-T  F(SE) 01-12
      { width: 13 }, // U  Total ejecución
      ...Array(12).fill({ width: 11 }), // V-AG META 01-12
      { width: 13 }, // AH Total meta
      { width: 24 }, // AI Observación
    ]

    // ── Color palette (amarillo / rosa — referencia) ──────────────────────────
    const C = {
      // Title
      titleBg:      'FFFFF2CC', // amarillo pálido
      titleText:    'FF7F6000', // dorado oscuro
      titleBorder:  'FFFFC000', // ámbar

      // Header — columnas de información (A-H)
      hdrInfoBg:    'FFFFC000', // ámbar
      hdrInfoText:  'FF7F6000', // dorado oscuro

      // Header — columnas de ejecución F(SE) (I-U)
      hdrExecBg:    'FFFF6699', // rosa/fucsia
      hdrExecText:  'FFFFFFFF', // blanco

      // Header — columnas de meta programada (V-AH)
      hdrMetaBg:    'FFFFE066', // amarillo dorado
      hdrMetaText:  'FF7F6000', // dorado oscuro

      // Header — observación (AI)
      hdrObsBg:     'FFFFB347', // naranja suave
      hdrObsText:   'FF7F6000', // dorado oscuro

      // Data rows — filas pares
      rowEvenInfo:  'FFFFFFFF', // blanco
      rowEvenExec:  'FFFFF5F8', // rosado muy pálido
      rowEvenMeta:  'FFFFFEF5', // amarillo muy pálido

      // Data rows — filas impares
      rowOddInfo:   'FFFFFDE7', // amarillo pálido
      rowOddExec:   'FFFFCCDD', // rosado pálido
      rowOddMeta:   'FFFFFBD0', // amarillo limón pálido

      // Totales ejecución — semáforo
      ok:           'FFC6EFCE', okText: 'FF1E7145',
      warn:         'FFFFEB9C', warnText: 'FF7D4E00',
      bad:          'FFFFC7CE', badText: 'FF9C0006',

      // Bordes
      bdrStrong:    'FFCCAA00', // ámbar para bordes de cabecera
      bdrPink:      'FFFF9AB8', // rosa para bordes exec
      bdrThin:      'FFD0D0D0', // gris claro para datos
    }

    const solidFill = (argb) => ({ type: 'pattern', pattern: 'solid', fgColor: { argb } })
    const border = (argb, style = 'thin') => ({ style, color: { argb } })

    function applyHeaderCell(cell, bgArgb, textArgb, borderArgb) {
      cell.font = { name: 'Calibri', bold: true, size: 9, color: { argb: textArgb } }
      cell.fill = solidFill(bgArgb)
      cell.alignment = { horizontal: 'center', vertical: 'middle', wrapText: true }
      cell.border = {
        top:    border(borderArgb),
        bottom: border(borderArgb),
        left:   border(borderArgb),
        right:  border(borderArgb),
      }
    }

    // ── Filas 1-2: en blanco ──────────────────────────────────────────────────
    ws.addRow([])
    ws.addRow([])

    // ── Fila 3: TÍTULO ────────────────────────────────────────────────────────
    const titleRow = ws.addRow([`CADENA PROGRAMATICA ${year}`, ...Array(TOTAL_COLS - 1).fill(null)])
    ws.mergeCells(3, 1, 3, TOTAL_COLS)
    titleRow.height = 28
    const tc = titleRow.getCell(1)
    tc.font    = { name: 'Calibri', bold: true, size: 16, color: { argb: C.titleText } }
    tc.fill    = solidFill(C.titleBg)
    tc.alignment = { horizontal: 'center', vertical: 'middle' }
    tc.border  = {
      top: border(C.titleBorder), bottom: border(C.titleBorder),
      left: border(C.titleBorder), right: border(C.titleBorder),
    }

    // ── Fila 4: CABECERAS DE COLUMNA ──────────────────────────────────────────
    const yr2 = String(year).slice(2)
    const execHdrs = MONTHS_SHORT.map((m, i) => `F(SE) ${String(i + 1).padStart(2, '0')}\n${m}`)
    const metaHdrs = MONTHS_SHORT.map((m) => `META\nPROG.\n${m}-${yr2}`)

    const headerRow = ws.addRow([
      'POI', 'Categoría\nID', 'Categoría', 'Responsable',
      'AO ID', 'Actividad Operativa',
      'UM\nID', 'Unidad de\nMedida',
      ...execHdrs, 'TOTAL\nEJEC.',
      ...metaHdrs, 'TOTAL\nMETA',
      'Observación',
    ])
    headerRow.height = 52

    // Columnas de información (1-8): ámbar
    for (let c = 1; c <= 8; c++) {
      applyHeaderCell(headerRow.getCell(c), C.hdrInfoBg, C.hdrInfoText, C.bdrStrong)
    }
    // Columnas de ejecución F(SE) 01-12 + Total (9-21): rosa/fucsia
    for (let c = 9; c <= 21; c++) {
      applyHeaderCell(headerRow.getCell(c), C.hdrExecBg, C.hdrExecText, C.bdrPink)
    }
    // Columnas de meta 01-12 + Total (22-34): amarillo dorado
    for (let c = 22; c <= 34; c++) {
      applyHeaderCell(headerRow.getCell(c), C.hdrMetaBg, C.hdrMetaText, C.bdrStrong)
    }
    // Observación (35): naranja suave
    applyHeaderCell(headerRow.getCell(35), C.hdrObsBg, C.hdrObsText, C.bdrStrong)

    // ── Filas de datos ────────────────────────────────────────────────────────
    rows.forEach((r, idx) => {
      const execVals = [r.f01,r.f02,r.f03,r.f04,r.f05,r.f06,r.f07,r.f08,r.f09,r.f10,r.f11,r.f12]
      const totalExec = execVals.reduce((s, v) => s + v, 0)
      const metaVals = [
        r.meta01,r.meta02,r.meta03,r.meta04,r.meta05,r.meta06,
        r.meta07,r.meta08,r.meta09,r.meta10,r.meta11,r.meta12,
      ]
      const isOdd = idx % 2 !== 0

      const dataRow = ws.addRow([
        r.poi, r.categoriaId, r.categoria, r.responsable,
        r.aoId, r.actividadOperativa,
        r.umId, r.unidad,
        ...execVals, totalExec,
        ...metaVals, r.totalMeta,
        r.observacion,
      ])
      dataRow.height = 15

      const bdr = {
        bottom: border(C.bdrThin, 'hair'),
        right:  border(C.bdrThin, 'hair'),
      }

      dataRow.eachCell({ includeEmpty: true }, (cell, col) => {
        cell.border = bdr
        if (col >= 1 && col <= 8) {
          // Columnas de información — texto izquierda
          cell.font      = { name: 'Calibri', size: 9 }
          cell.fill      = solidFill(isOdd ? C.rowOddInfo : C.rowEvenInfo)
          cell.alignment = {
            horizontal: 'left', vertical: 'middle',
            wrapText: col === 3 || col === 6,
          }
        } else if (col >= 9 && col <= 21) {
          // Columnas de ejecución — números centrados
          cell.font      = { name: 'Calibri', size: 9 }
          cell.fill      = solidFill(isOdd ? C.rowOddExec : C.rowEvenExec)
          cell.alignment = { horizontal: 'center', vertical: 'middle' }
          cell.numFmt    = '#,##0'
        } else if (col >= 22 && col <= 34) {
          // Columnas de meta — números centrados
          cell.font      = { name: 'Calibri', size: 9 }
          cell.fill      = solidFill(isOdd ? C.rowOddMeta : C.rowEvenMeta)
          cell.alignment = { horizontal: 'center', vertical: 'middle' }
          cell.numFmt    = '#,##0'
        } else {
          // Observación
          cell.font      = { name: 'Calibri', size: 9 }
          cell.fill      = solidFill(isOdd ? C.rowOddInfo : C.rowEvenInfo)
          cell.alignment = { horizontal: 'left', vertical: 'middle', wrapText: true }
        }
      })

      // Semáforo en "Total Ejecución" (columna U = 21) vs meta anual
      const pct = r.totalMeta > 0 ? totalExec / r.totalMeta : null
      const totalExecCell = dataRow.getCell(21)
      if (pct != null) {
        const [fg, bg] = pct >= 1
          ? [C.okText,   C.ok]
          : pct >= 0.8
            ? [C.warnText, C.warn]
            : [C.badText,  C.bad]
        totalExecCell.font = { name: 'Calibri', size: 9, bold: true, color: { argb: fg } }
        totalExecCell.fill = solidFill(bg)
      }
    })

    // ── Stream al cliente ─────────────────────────────────────────────────────
    const filename = `Matriz_PPR_${year}.xlsx`
    response.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet')
    response.setHeader('Content-Disposition', `attachment; filename="${encodeURIComponent(filename)}"`)
    response.setHeader('Cache-Control', 'no-cache')
    await workbook.xlsx.write(response)
    response.end()

  } catch (error) {
    logger.error({ correlationId: request.correlationId, event: 'ppr:admin:export:error', message: String(error) })
    if (!response.headersSent) {
      response.status(500).json({ code: 'EXPORT_ERROR', message: 'Error al generar el archivo Excel.' })
    }
  }
})

// POST /ppr/admin/asignacion — assign or remove a program for a coordinator
pprRouter.post('/ppr/admin/asignacion', requireAuth, requirePprAdmin, async (request, response) => {
  const { employeeId, programId, activo } = request.body ?? {}
  if (!employeeId || !programId || activo == null) {
    return response.status(400).json({ code: 'MISSING_PARAMS', message: 'Se requiere employeeId, programId y activo.' })
  }
  try {
    await guardarAsignacion({
      employeeId: Number(employeeId),
      programId: Number(programId),
      activo: Boolean(activo),
      adminId: request.pprAdminId,
    })
    logger.info({ correlationId: request.correlationId, event: 'ppr:admin:asignacion', employeeId, programId, activo })
    response.json({ ok: true })
  } catch (error) {
    logger.error({ correlationId: request.correlationId, event: 'ppr:admin:asignacion:error', message: String(error) })
    response.status(500).json({ code: 'PPR_ERROR', message: 'Error al actualizar asignación.' })
  }
})
