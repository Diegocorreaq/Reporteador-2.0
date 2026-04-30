import { Router } from 'express'
import { getCentroObstetricoReport } from '../services/centro-obstetrico-report.service.js'
import { getUccaReport, getUccpReport } from '../services/critical-care-report.service.js'
import {
  executeConfiguredExport,
  listCatalogExports,
  validateLegacyUser,
} from '../services/legacy-export.service.js'
import {
  exportFamiliaPendienteNominal,
  getFamiliaPendienteReport,
  listFamiliaPendienteUpss,
} from '../services/sigh-monitoreo.service.js'
import {
  exportProduccionMedicosExcel,
  exportProduccionMedicosPdf,
  getProduccionMedicosDetalle,
  getProduccionMedicosResumen,
  searchProduccionMedicos,
} from '../services/sigh-prod-medicos.service.js'
import {
  exportMonitoreoCamasResumen,
  exportMonitoreoCamasSusalud,
  getCamasDetalle,
  getCamasServicioAgrupadoInfo,
  getGestionEstanciaMovimientoCabecera,
  getGestionEstanciaMovimientoDiagnosticos,
  getGestionEstanciaMovimientoDxCqx,
  getGestionEstanciaMovimientoProcedimientos,
  getGestionEstanciaMovimientoProfesionales,
  getGestionEstanciaMovimientoTransferencias,
  getGestionEstanciaMovimientos,
  getGestionEstanciaReport,
  getGestionEstanciaResumen,
  getMonitoreoCamasReport,
  getOcupacionHospitalizacionReport,
  getOcupacionUciReport,
  getResumenCamasReport,
  listCamasServiciosAgrupados,
  listTiposCama,
} from '../services/sigh-camas.service.js'
import {
  getGestionCitasReport,
  getMonitoreoTicketsReport,
  getMonitoreoVentanillaReport,
  getRolConsultaExternaReport,
} from '../services/sigh-gestion-cita.service.js'
import {
  anularLavadoRegistro,
  createLavadoRegistro,
  exportLavadoRegistros,
  getLavadoRegistro,
  listLavadoActividades,
  listLavadoManos,
  searchLavadoEmpleados,
  updateLavadoRegistro,
} from '../services/lavado-manos.service.js'
import { requireAuth } from '../middleware/require-auth.js'
import { authLimiter, exportLimiter } from '../middleware/rate-limit.js'
import {
  SESSION_COOKIE_NAME,
  getSessionCookieOptions,
} from '../utils/cookies.js'
import { createSession } from '../services/auth-session.service.js'
import { logger } from '../utils/logger.js'

// ─── Helpers ─────────────────────────────────────────────────────────────────

function getClientIp(request) {
  const forwarded = request.headers['x-forwarded-for']
  if (typeof forwarded === 'string' && forwarded.length > 0) {
    return forwarded.split(',')[0].trim()
  }
  return request.ip || request.socket?.remoteAddress || '0.0.0.0'
}

function sendDownload(response, file) {
  response.setHeader('Content-Type', file.mimeType)
  response.setHeader('Content-Disposition', `attachment; filename="${file.fileName}"`)
  response.send(file.content)
}

// Safe error handler: logs internally, never exposes error details to client
function handleError(response, error, fallbackMessage = 'No se pudo procesar la solicitud.') {
  logger.error({
    correlationId: response.req?.correlationId ?? 'unknown',
    path: response.req?.path,
    userId: response.req?.user?.id ?? null,
    message: error instanceof Error ? error.message : String(error),
    stack: error instanceof Error ? error.stack : undefined,
  })
  response.status(500).json({
    message: fallbackMessage,
    correlationId: response.req?.correlationId,
  })
}

// ─── Route classification ─────────────────────────────────────────────────────
//
// PUBLIC_ROUTES  : no auth required (health check, validate/login compat endpoints)
// PROTECTED      : requireAuth applied (all other routes)

export const reportsRouter = Router()

// ─── Public routes ────────────────────────────────────────────────────────────

reportsRouter.get('/health', (_request, response) => {
  response.json({ ok: true, service: 'legacy-api' })
})

// Compatibility endpoint — also issues a session cookie on success
// Frontend uses this path via auth.service.ts signIn for the legacy flow
reportsRouter.post('/exports/validate', authLimiter, async (request, response) => {
  try {
    const { username, password, scope } = request.body ?? {}
    const ip = getClientIp(request)

    const validation = await validateLegacyUser({
      dni: String(username ?? '').trim(),
      password: String(password ?? '').trim(),
      ip,
      scope: scope === 'lavado' ? 'lavado' : 'general',
    })

    // Issue session cookie if validation succeeds (backwards-compat path)
    if (validation.ok && validation.employeeId) {
      const employeeName = String(validation.employeeName ?? '').trim()
      if (employeeName && !/^\d+$/.test(employeeName)) {
        const token = createSession({
          id: `emp-${validation.employeeId}`,
          username: String(username ?? '').trim(),
          employeeId: validation.employeeId,
          name: employeeName,
          scope: scope === 'lavado' ? 'lavado' : 'general',
        })
        response.cookie(SESSION_COOKIE_NAME, token, getSessionCookieOptions())
      }
    }

    response.json(validation)
  } catch (error) {
    handleError(response, error, 'No se pudo validar el usuario.')
  }
})

// Lavado compatibility endpoint — also issues session cookie on success
reportsRouter.post('/epidemiologia/lavado/validate', authLimiter, async (request, response) => {
  try {
    const { username, password } = request.body ?? {}
    const ip = getClientIp(request)

    const validation = await validateLegacyUser({
      dni: String(username ?? '').trim(),
      password: String(password ?? '').trim(),
      ip,
      scope: 'lavado',
    })

    if (validation.ok && validation.employeeId) {
      const employeeName = String(validation.employeeName ?? '').trim()
      if (employeeName && !/^\d+$/.test(employeeName)) {
        const token = createSession({
          id: `emp-${validation.employeeId}`,
          username: String(username ?? '').trim(),
          employeeId: validation.employeeId,
          name: employeeName,
          scope: 'lavado',
        })
        response.cookie(SESSION_COOKIE_NAME, token, getSessionCookieOptions())
      }
    }

    response.json(validation)
  } catch (error) {
    handleError(response, error, 'No se pudo validar el usuario para lavado de manos.')
  }
})

// ─── Protected routes (require valid session cookie) ──────────────────────────

reportsRouter.get('/reports/centro-obstetrico', requireAuth, async (request, response) => {
  try {
    const payload = await getCentroObstetricoReport(request.query)
    response.json(payload)
  } catch (error) {
    handleError(response, error, 'No se pudo consultar Centro Obstétrico.')
  }
})

reportsRouter.get('/reports/ucca', requireAuth, async (request, response) => {
  try {
    const payload = await getUccaReport(request.query)
    response.json(payload)
  } catch (error) {
    handleError(response, error, 'No se pudo consultar Indicadores UCCA.')
  }
})

reportsRouter.get('/reports/uccp', requireAuth, async (request, response) => {
  try {
    const payload = await getUccpReport(request.query)
    response.json(payload)
  } catch (error) {
    handleError(response, error, 'No se pudo consultar Indicadores UCCP.')
  }
})

reportsRouter.get('/exports/catalog', requireAuth, (request, response) => {
  const catalog = String(request.query.catalog ?? '').trim()
  response.json({
    catalog,
    rows: listCatalogExports(catalog),
  })
})

reportsRouter.get('/exports/download', requireAuth, exportLimiter, async (request, response) => {
  try {
    const catalog = String(request.query.catalog ?? '').trim()
    const key = String(request.query.key ?? '').trim()
    const employeeId = Number(request.query.employeeId ?? 0)
    const startDate = request.query.fechaInicio ? String(request.query.fechaInicio) : undefined
    const endDate = request.query.fechaFin ? String(request.query.fechaFin) : undefined

    const file = await executeConfiguredExport({
      catalog,
      key,
      employeeId,
      startDate,
      endDate,
      ip: getClientIp(request),
    })

    sendDownload(response, file)
  } catch (error) {
    handleError(response, error, 'No se pudo generar el archivo solicitado.')
  }
})

reportsRouter.get('/sigh/monitoreo/familia-pendiente/upss', requireAuth, async (_request, response) => {
  try {
    const rows = await listFamiliaPendienteUpss()
    response.json({ rows })
  } catch (error) {
    handleError(response, error, 'No se pudo obtener la lista de UPSS.')
  }
})

reportsRouter.get('/sigh/monitoreo/familia-pendiente', requireAuth, async (request, response) => {
  try {
    const upss = String(request.query.upss ?? '').trim()
    const payload = await getFamiliaPendienteReport(upss)
    response.json(payload)
  } catch (error) {
    handleError(response, error, 'No se pudo consultar Informe Familia Pendientes.')
  }
})

reportsRouter.get('/sigh/monitoreo/familia-pendiente/export', requireAuth, exportLimiter, async (request, response) => {
  try {
    const upss = String(request.query.upss ?? '').trim()
    const empleadoId = Number(request.query.employeeId ?? 0)
    const file = await exportFamiliaPendienteNominal({ upss, empleadoId })
    sendDownload(response, file)
  } catch (error) {
    handleError(response, error, 'No se pudo exportar el informe de familia pendiente.')
  }
})

reportsRouter.get('/sigh/prod-medicos/empleados', requireAuth, async (request, response) => {
  try {
    const rows = await searchProduccionMedicos(request.query.term)
    response.json({ rows })
  } catch (error) {
    handleError(response, error, 'No se pudo buscar profesionales.')
  }
})

reportsRouter.get('/sigh/prod-medicos/resumen', requireAuth, async (request, response) => {
  try {
    const payload = await getProduccionMedicosResumen({
      fechaInicio: request.query.fechaInicio,
      fechaFin: request.query.fechaFin,
      empleadoId: request.query.empleadoId,
    })
    response.json(payload)
  } catch (error) {
    handleError(response, error, 'No se pudo consultar la producción de médicos.')
  }
})

reportsRouter.get('/sigh/prod-medicos/detalle', requireAuth, async (request, response) => {
  try {
    const payload = await getProduccionMedicosDetalle({
      fechaInicio: request.query.fechaInicio,
      fechaFin: request.query.fechaFin,
      empleadoId: request.query.empleadoId,
      orden: request.query.orden,
    })
    response.json(payload)
  } catch (error) {
    handleError(response, error, 'No se pudo consultar el detalle de producción.')
  }
})

reportsRouter.get('/sigh/prod-medicos/export/excel', requireAuth, exportLimiter, async (request, response) => {
  try {
    const file = await exportProduccionMedicosExcel({
      fechaInicio: request.query.fechaInicio,
      fechaFin: request.query.fechaFin,
      empleadoId: request.query.empleadoId,
    })
    sendDownload(response, file)
  } catch (error) {
    handleError(response, error, 'No se pudo exportar la producción en Excel.')
  }
})

reportsRouter.get('/sigh/prod-medicos/export/pdf', requireAuth, exportLimiter, async (request, response) => {
  try {
    const file = await exportProduccionMedicosPdf({
      fechaInicio: request.query.fechaInicio,
      fechaFin: request.query.fechaFin,
      empleadoId: request.query.empleadoId,
    })
    sendDownload(response, file)
  } catch (error) {
    handleError(response, error, 'No se pudo generar la vista imprimible de producción.')
  }
})

reportsRouter.get('/sigh/camas/servicios', requireAuth, async (_request, response) => {
  try {
    const rows = await listCamasServiciosAgrupados()
    response.json({ rows })
  } catch (error) {
    handleError(response, error, 'No se pudo obtener la lista de servicios.')
  }
})

reportsRouter.get('/sigh/camas/servicio-info', requireAuth, async (request, response) => {
  try {
    const servicio = String(request.query.servicio ?? '').trim()
    const row = await getCamasServicioAgrupadoInfo(servicio)
    response.json({ row })
  } catch (error) {
    handleError(response, error, 'No se pudo obtener el detalle del servicio.')
  }
})

reportsRouter.get('/sigh/camas/estancia', requireAuth, async (request, response) => {
  try {
    const rows = await getGestionEstanciaReport({
      servicio: request.query.servicio,
      tipo: request.query.tipo,
      idTipo: request.query.idTipo,
    })
    response.json({ rows })
  } catch (error) {
    handleError(response, error, 'No se pudo consultar la gestión de estancia.')
  }
})

reportsRouter.get('/sigh/camas/estancia/resumen', requireAuth, async (request, response) => {
  try {
    const rows = await getGestionEstanciaResumen({
      servicio: request.query.servicio,
      tipo: request.query.tipo,
      idTipo: request.query.idTipo,
    })
    response.json({ row: rows[0] ?? null })
  } catch (error) {
    handleError(response, error, 'No se pudo consultar el resumen de camas para la gestión de estancia.')
  }
})

reportsRouter.get('/sigh/camas/estancia/movimientos', requireAuth, async (request, response) => {
  try {
    const rows = await getGestionEstanciaMovimientos({
      upss: request.query.upss,
      servicio: request.query.servicio,
    })
    response.json({ rows })
  } catch (error) {
    handleError(response, error, 'No se pudo consultar el historial de movimientos.')
  }
})

reportsRouter.get('/sigh/camas/estancia/movimientos/:orden/cabecera', requireAuth, async (request, response) => {
  try {
    const rows = await getGestionEstanciaMovimientoCabecera(request.params.orden)
    response.json({ rows })
  } catch (error) {
    handleError(response, error, 'No se pudo consultar la cabecera del movimiento.')
  }
})

reportsRouter.get('/sigh/camas/estancia/movimientos/:orden/diagnosticos', requireAuth, async (request, response) => {
  try {
    const rows = await getGestionEstanciaMovimientoDiagnosticos(request.params.orden)
    response.json({ rows })
  } catch (error) {
    handleError(response, error, 'No se pudo consultar diagnósticos del movimiento.')
  }
})

reportsRouter.get('/sigh/camas/estancia/movimientos/:orden/transferencias', requireAuth, async (request, response) => {
  try {
    const rows = await getGestionEstanciaMovimientoTransferencias(request.params.orden)
    response.json({ rows })
  } catch (error) {
    handleError(response, error, 'No se pudo consultar transferencias del movimiento.')
  }
})

reportsRouter.get('/sigh/camas/estancia/movimientos/:orden/profesionales', requireAuth, async (request, response) => {
  try {
    const rows = await getGestionEstanciaMovimientoProfesionales(request.params.orden)
    response.json({ rows })
  } catch (error) {
    handleError(response, error, 'No se pudo consultar profesionales del movimiento.')
  }
})

reportsRouter.get('/sigh/camas/estancia/movimientos/:orden/procedimientos', requireAuth, async (request, response) => {
  try {
    const rows = await getGestionEstanciaMovimientoProcedimientos(request.params.orden)
    response.json({ rows })
  } catch (error) {
    handleError(response, error, 'No se pudo consultar procedimientos del movimiento.')
  }
})

reportsRouter.get('/sigh/camas/estancia/movimientos/:orden/dxcqx', requireAuth, async (request, response) => {
  try {
    const rows = await getGestionEstanciaMovimientoDxCqx(request.params.orden)
    response.json({ rows })
  } catch (error) {
    handleError(response, error, 'No se pudo consultar DX/CQX del movimiento.')
  }
})

reportsRouter.get('/sigh/camas/monitoreo', requireAuth, async (_request, response) => {
  try {
    const rows = await getMonitoreoCamasReport()
    response.json({ rows })
  } catch (error) {
    handleError(response, error, 'No se pudo consultar Monitoreo de Camas.')
  }
})

reportsRouter.get('/sigh/camas/tipos', requireAuth, async (_request, response) => {
  try {
    const rows = await listTiposCama()
    response.json({ rows })
  } catch (error) {
    handleError(response, error, 'No se pudo obtener el catálogo de tipos de cama.')
  }
})

reportsRouter.get('/sigh/camas/resumen', requireAuth, async (request, response) => {
  try {
    const rows = await getResumenCamasReport(request.query.tipoCama)
    response.json({ rows })
  } catch (error) {
    handleError(response, error, 'No se pudo consultar Resumen de Camas.')
  }
})

reportsRouter.get('/sigh/camas/ocupacion/hospitalizacion', requireAuth, async (_request, response) => {
  try {
    const rows = await getOcupacionHospitalizacionReport()
    response.json({ rows })
  } catch (error) {
    handleError(response, error, 'No se pudo consultar la ocupación de Hospitalización.')
  }
})

reportsRouter.get('/sigh/camas/ocupacion/uci', requireAuth, async (_request, response) => {
  try {
    const rows = await getOcupacionUciReport()
    response.json({ rows })
  } catch (error) {
    handleError(response, error, 'No se pudo consultar la ocupación de UCI.')
  }
})

reportsRouter.get('/sigh/camas/detalle', requireAuth, async (request, response) => {
  try {
    const rows = await getCamasDetalle(request.query.tipoDetalle, {
      idServicio: request.query.idServicio,
      tipo: request.query.tipo,
    })
    response.json({ rows })
  } catch (error) {
    handleError(response, error, 'No se pudo consultar el detalle de camas.')
  }
})

reportsRouter.get('/sigh/camas/export/resumen', requireAuth, exportLimiter, async (_request, response) => {
  try {
    const file = await exportMonitoreoCamasResumen()
    sendDownload(response, file)
  } catch (error) {
    handleError(response, error, 'No se pudo exportar el resumen de camas.')
  }
})

reportsRouter.get('/sigh/camas/export/susalud', requireAuth, exportLimiter, async (_request, response) => {
  try {
    const file = await exportMonitoreoCamasSusalud()
    sendDownload(response, file)
  } catch (error) {
    handleError(response, error, 'No se pudo exportar el reporte SUSALUD de camas.')
  }
})

reportsRouter.get('/sigh/gestion-citas', requireAuth, async (request, response) => {
  try {
    const payload = await getGestionCitasReport({
      fechaInicio: request.query.fechaInicio,
      fechaFin: request.query.fechaFin,
    })
    response.json(payload)
  } catch (error) {
    handleError(response, error, 'No se pudo consultar Gestión de Citas.')
  }
})

reportsRouter.get('/sigh/rol-consulta-externa', requireAuth, async (request, response) => {
  try {
    const payload = await getRolConsultaExternaReport({
      fechaInicio: request.query.fechaInicio,
      fechaFin: request.query.fechaFin,
    })
    response.json(payload)
  } catch (error) {
    handleError(response, error, 'No se pudo consultar Rol de Consulta Externa.')
  }
})

reportsRouter.get('/sigh/monitoreo-tickets', requireAuth, async (_request, response) => {
  try {
    const payload = await getMonitoreoTicketsReport()
    response.json(payload)
  } catch (error) {
    handleError(response, error, 'No se pudo consultar Monitoreo de Tickets.')
  }
})

reportsRouter.get('/sigh/monitoreo-ventanilla', requireAuth, async (_request, response) => {
  try {
    const payload = await getMonitoreoVentanillaReport()
    response.json(payload)
  } catch (error) {
    handleError(response, error, 'No se pudo consultar Monitoreo de Ventanilla.')
  }
})

// Lavado de manos — read routes (require auth)
reportsRouter.get('/epidemiologia/lavado', requireAuth, async (request, response) => {
  try {
    const payload = await listLavadoManos({
      fechaInicio: request.query.fechaInicio,
      fechaFin: request.query.fechaFin,
      tipo: request.query.tipo,
    })
    response.json(payload)
  } catch (error) {
    handleError(response, error, 'No se pudo listar los registros de lavado de manos.')
  }
})

reportsRouter.get('/epidemiologia/lavado/empleados', requireAuth, async (request, response) => {
  try {
    const rows = await searchLavadoEmpleados(request.query.nombre)
    response.json({ rows })
  } catch (error) {
    handleError(response, error, 'No se pudo buscar empleados.')
  }
})

reportsRouter.get('/epidemiologia/lavado/actividades', requireAuth, async (request, response) => {
  try {
    const rows = await listLavadoActividades(request.query.tipo)
    response.json({ rows })
  } catch (error) {
    handleError(response, error, 'No se pudo obtener actividades.')
  }
})

reportsRouter.get('/epidemiologia/lavado/export', requireAuth, exportLimiter, async (request, response) => {
  try {
    const file = await exportLavadoRegistros({
      fechaInicio: request.query.fechaInicio,
      fechaFin: request.query.fechaFin,
    })
    sendDownload(response, file)
  } catch (error) {
    handleError(response, error, 'No se pudo exportar el listado de lavado de manos.')
  }
})

reportsRouter.get('/epidemiologia/lavado/:id', requireAuth, async (request, response) => {
  try {
    const payload = await getLavadoRegistro(request.params.id)
    response.json(payload)
  } catch (error) {
    handleError(response, error, 'No se pudo obtener el registro solicitado.')
  }
})

// Lavado de manos — write routes (require auth — sensitive operations)
reportsRouter.post('/epidemiologia/lavado', requireAuth, async (request, response) => {
  try {
    const payload = await createLavadoRegistro(request.body ?? {})
    response.status(201).json(payload)
  } catch (error) {
    handleError(response, error, 'No se pudo crear el registro.')
  }
})

reportsRouter.put('/epidemiologia/lavado/:id', requireAuth, async (request, response) => {
  try {
    const payload = await updateLavadoRegistro(request.params.id, request.body ?? {})
    response.json(payload)
  } catch (error) {
    handleError(response, error, 'No se pudo actualizar el registro.')
  }
})

reportsRouter.post('/epidemiologia/lavado/:id/anular', requireAuth, async (request, response) => {
  try {
    const payload = await anularLavadoRegistro(request.params.id)
    response.json(payload)
  } catch (error) {
    handleError(response, error, 'No se pudo anular el registro.')
  }
})
