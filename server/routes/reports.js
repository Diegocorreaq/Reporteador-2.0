import { Router } from 'express'
import { getCentroObstetricoReport } from '../services/centro-obstetrico-report.service.js'
import { getUccaReport, getUccpReport } from '../services/critical-care-report.service.js'
import {
  executeConfiguredExport,
  listCatalogExports,
  validateLegacyUser,
} from '../services/legacy-export.service.js'
import { getFamiliaPendienteReport, listFamiliaPendienteUpss, exportFamiliaPendienteNominal } from '../services/sigh-monitoreo.service.js'
import {
  exportProduccionMedicosExcel,
  exportProduccionMedicosPdf,
  getProduccionMedicosDetalle,
  getProduccionMedicosResumen,
  searchProduccionMedicos,
} from '../services/sigh-prod-medicos.service.js'
import {
  getCamasDetalle,
  getCamasServicioAgrupadoInfo,
  getGestionEstanciaMovimientoCabecera,
  getGestionEstanciaMovimientoDiagnosticos,
  getGestionEstanciaMovimientoDxCqx,
  getGestionEstanciaMovimientoProcedimientos,
  getGestionEstanciaMovimientoProfesionales,
  getGestionEstanciaMovimientoTransferencias,
  getGestionEstanciaMovimientos,
  getGestionEstanciaResumen,
  getGestionEstanciaReport,
  getMonitoreoCamasReport,
  getOcupacionHospitalizacionReport,
  getOcupacionUciReport,
  getResumenCamasReport,
  listCamasServiciosAgrupados,
  listTiposCama,
  exportMonitoreoCamasResumen,
  exportMonitoreoCamasSusalud,
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

export const reportsRouter = Router()

function getClientIp(request) {
  const forwarded = request.headers['x-forwarded-for']

  if (typeof forwarded === 'string' && forwarded.length) {
    return forwarded.split(',')[0].trim()
  }

  if (Array.isArray(forwarded) && forwarded[0]) {
    return String(forwarded[0])
  }

  return request.ip || request.socket.remoteAddress || '0.0.0.0'
}

function sendDownload(response, file) {
  response.setHeader('Content-Type', file.mimeType)
  response.setHeader('Content-Disposition', `attachment; filename="${file.fileName}"`)
  response.send(file.content)
}

function handleError(response, error, fallbackMessage = 'No se pudo procesar la solicitud.') {
  const message = error instanceof Error ? error.message : fallbackMessage
  response.status(500).json({ message })
}

reportsRouter.get('/health', (_request, response) => {
  response.json({
    ok: true,
    service: 'legacy-api',
  })
})

reportsRouter.get('/reports/centro-obstetrico', async (request, response) => {
  try {
    const payload = await getCentroObstetricoReport(request.query)
    response.json(payload)
  } catch (error) {
    handleError(response, error, 'No se pudo consultar Centro Obstetrico.')
  }
})

reportsRouter.get('/reports/ucca', async (request, response) => {
  try {
    const payload = await getUccaReport(request.query)
    response.json(payload)
  } catch (error) {
    handleError(response, error, 'No se pudo consultar Indicadores UCCA.')
  }
})

reportsRouter.get('/reports/uccp', async (request, response) => {
  try {
    const payload = await getUccpReport(request.query)
    response.json(payload)
  } catch (error) {
    handleError(response, error, 'No se pudo consultar Indicadores UCCP.')
  }
})

reportsRouter.post('/exports/validate', async (request, response) => {
  try {
    const { username, password, scope } = request.body ?? {}
    const validation = await validateLegacyUser({
      dni: String(username ?? '').trim(),
      password: String(password ?? '').trim(),
      ip: getClientIp(request),
      scope: scope === 'lavado' ? 'lavado' : 'general',
    })
    response.json(validation)
  } catch (error) {
    handleError(response, error, 'No se pudo validar el usuario.')
  }
})

reportsRouter.get('/exports/catalog', (request, response) => {
  const catalog = String(request.query.catalog ?? '').trim()
  response.json({
    catalog,
    rows: listCatalogExports(catalog),
  })
})

reportsRouter.get('/exports/download', async (request, response) => {
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

reportsRouter.get('/sigh/monitoreo/familia-pendiente/upss', async (_request, response) => {
  try {
    const rows = await listFamiliaPendienteUpss()
    response.json({ rows })
  } catch (error) {
    handleError(response, error, 'No se pudo obtener la lista de UPSS.')
  }
})

reportsRouter.get('/sigh/monitoreo/familia-pendiente', async (request, response) => {
  try {
    const upss = String(request.query.upss ?? '').trim()
    const payload = await getFamiliaPendienteReport(upss)
    response.json(payload)
  } catch (error) {
    handleError(response, error, 'No se pudo consultar Informe Familia Pendientes.')
  }
})

reportsRouter.get('/sigh/monitoreo/familia-pendiente/export', async (request, response) => {
  try {
    const upss = String(request.query.upss ?? '').trim()
    const empleadoId = Number(request.query.employeeId ?? 0)
    const file = await exportFamiliaPendienteNominal({ upss, empleadoId })
    sendDownload(response, file)
  } catch (error) {
    handleError(response, error, 'No se pudo exportar el informe de familia pendiente.')
  }
})

reportsRouter.get('/sigh/prod-medicos/empleados', async (request, response) => {
  try {
    const rows = await searchProduccionMedicos(request.query.term)
    response.json({ rows })
  } catch (error) {
    handleError(response, error, 'No se pudo buscar profesionales.')
  }
})

reportsRouter.get('/sigh/prod-medicos/resumen', async (request, response) => {
  try {
    const payload = await getProduccionMedicosResumen({
      fechaInicio: request.query.fechaInicio,
      fechaFin: request.query.fechaFin,
      empleadoId: request.query.empleadoId,
    })
    response.json(payload)
  } catch (error) {
    handleError(response, error, 'No se pudo consultar la produccion de medicos.')
  }
})

reportsRouter.get('/sigh/prod-medicos/detalle', async (request, response) => {
  try {
    const payload = await getProduccionMedicosDetalle({
      fechaInicio: request.query.fechaInicio,
      fechaFin: request.query.fechaFin,
      empleadoId: request.query.empleadoId,
      orden: request.query.orden,
    })
    response.json(payload)
  } catch (error) {
    handleError(response, error, 'No se pudo consultar el detalle de produccion.')
  }
})

reportsRouter.get('/sigh/prod-medicos/export/excel', async (request, response) => {
  try {
    const file = await exportProduccionMedicosExcel({
      fechaInicio: request.query.fechaInicio,
      fechaFin: request.query.fechaFin,
      empleadoId: request.query.empleadoId,
    })
    sendDownload(response, file)
  } catch (error) {
    handleError(response, error, 'No se pudo exportar la produccion en Excel.')
  }
})

reportsRouter.get('/sigh/prod-medicos/export/pdf', async (request, response) => {
  try {
    const file = await exportProduccionMedicosPdf({
      fechaInicio: request.query.fechaInicio,
      fechaFin: request.query.fechaFin,
      empleadoId: request.query.empleadoId,
    })
    response.setHeader('Content-Type', file.mimeType)
    response.send(file.content)
  } catch (error) {
    handleError(response, error, 'No se pudo generar la vista imprimible de produccion.')
  }
})

reportsRouter.get('/sigh/camas/servicios', async (_request, response) => {
  try {
    const rows = await listCamasServiciosAgrupados()
    response.json({ rows })
  } catch (error) {
    handleError(response, error, 'No se pudo obtener la lista de servicios.')
  }
})

reportsRouter.get('/sigh/camas/servicio-info', async (request, response) => {
  try {
    const servicio = String(request.query.servicio ?? '').trim()
    const row = await getCamasServicioAgrupadoInfo(servicio)
    response.json({ row })
  } catch (error) {
    handleError(response, error, 'No se pudo obtener el detalle del servicio.')
  }
})

reportsRouter.get('/sigh/camas/estancia', async (request, response) => {
  try {
    const rows = await getGestionEstanciaReport({
      servicio: request.query.servicio,
      tipo: request.query.tipo,
      idTipo: request.query.idTipo,
    })
    response.json({ rows })
  } catch (error) {
    handleError(response, error, 'No se pudo consultar la gestion de estancia.')
  }
})

reportsRouter.get('/sigh/camas/estancia/resumen', async (request, response) => {
  try {
    const rows = await getGestionEstanciaResumen({
      servicio: request.query.servicio,
      tipo: request.query.tipo,
      idTipo: request.query.idTipo,
    })
    response.json({ row: rows[0] ?? null })
  } catch (error) {
    handleError(response, error, 'No se pudo consultar el resumen de camas para la gestion de estancia.')
  }
})

reportsRouter.get('/sigh/camas/estancia/movimientos', async (request, response) => {
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

reportsRouter.get('/sigh/camas/estancia/movimientos/:orden/cabecera', async (request, response) => {
  try {
    const rows = await getGestionEstanciaMovimientoCabecera(request.params.orden)
    response.json({ rows })
  } catch (error) {
    handleError(response, error, 'No se pudo consultar la cabecera del movimiento.')
  }
})

reportsRouter.get('/sigh/camas/estancia/movimientos/:orden/diagnosticos', async (request, response) => {
  try {
    const rows = await getGestionEstanciaMovimientoDiagnosticos(request.params.orden)
    response.json({ rows })
  } catch (error) {
    handleError(response, error, 'No se pudo consultar diagnosticos del movimiento.')
  }
})

reportsRouter.get('/sigh/camas/estancia/movimientos/:orden/transferencias', async (request, response) => {
  try {
    const rows = await getGestionEstanciaMovimientoTransferencias(request.params.orden)
    response.json({ rows })
  } catch (error) {
    handleError(response, error, 'No se pudo consultar transferencias del movimiento.')
  }
})

reportsRouter.get('/sigh/camas/estancia/movimientos/:orden/profesionales', async (request, response) => {
  try {
    const rows = await getGestionEstanciaMovimientoProfesionales(request.params.orden)
    response.json({ rows })
  } catch (error) {
    handleError(response, error, 'No se pudo consultar profesionales del movimiento.')
  }
})

reportsRouter.get('/sigh/camas/estancia/movimientos/:orden/procedimientos', async (request, response) => {
  try {
    const rows = await getGestionEstanciaMovimientoProcedimientos(request.params.orden)
    response.json({ rows })
  } catch (error) {
    handleError(response, error, 'No se pudo consultar procedimientos del movimiento.')
  }
})

reportsRouter.get('/sigh/camas/estancia/movimientos/:orden/dxcqx', async (request, response) => {
  try {
    const rows = await getGestionEstanciaMovimientoDxCqx(request.params.orden)
    response.json({ rows })
  } catch (error) {
    handleError(response, error, 'No se pudo consultar DX/CQX del movimiento.')
  }
})

reportsRouter.get('/sigh/camas/monitoreo', async (_request, response) => {
  try {
    const rows = await getMonitoreoCamasReport()
    response.json({ rows })
  } catch (error) {
    handleError(response, error, 'No se pudo consultar Monitoreo de Camas.')
  }
})

reportsRouter.get('/sigh/camas/tipos', async (_request, response) => {
  try {
    const rows = await listTiposCama()
    response.json({ rows })
  } catch (error) {
    handleError(response, error, 'No se pudo obtener el catalogo de tipos de cama.')
  }
})

reportsRouter.get('/sigh/camas/resumen', async (request, response) => {
  try {
    const rows = await getResumenCamasReport(request.query.tipoCama)
    response.json({ rows })
  } catch (error) {
    handleError(response, error, 'No se pudo consultar Resumen de Camas.')
  }
})

reportsRouter.get('/sigh/camas/ocupacion/hospitalizacion', async (_request, response) => {
  try {
    const rows = await getOcupacionHospitalizacionReport()
    response.json({ rows })
  } catch (error) {
    handleError(response, error, 'No se pudo consultar la ocupacion de Hospitalizacion.')
  }
})

reportsRouter.get('/sigh/camas/ocupacion/uci', async (_request, response) => {
  try {
    const rows = await getOcupacionUciReport()
    response.json({ rows })
  } catch (error) {
    handleError(response, error, 'No se pudo consultar la ocupacion de UCI.')
  }
})

reportsRouter.get('/sigh/camas/detalle', async (request, response) => {
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

reportsRouter.get('/sigh/camas/export/resumen', async (_request, response) => {
  try {
    const file = await exportMonitoreoCamasResumen()
    sendDownload(response, file)
  } catch (error) {
    handleError(response, error, 'No se pudo exportar el resumen de camas.')
  }
})

reportsRouter.get('/sigh/camas/export/susalud', async (_request, response) => {
  try {
    const file = await exportMonitoreoCamasSusalud()
    sendDownload(response, file)
  } catch (error) {
    handleError(response, error, 'No se pudo exportar el reporte SUSALUD de camas.')
  }
})

reportsRouter.get('/sigh/gestion-citas', async (request, response) => {
  try {
    const payload = await getGestionCitasReport({
      fechaInicio: request.query.fechaInicio,
      fechaFin: request.query.fechaFin,
    })
    response.json(payload)
  } catch (error) {
    handleError(response, error, 'No se pudo consultar Gestion de Citas.')
  }
})

reportsRouter.get('/sigh/rol-consulta-externa', async (request, response) => {
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

reportsRouter.get('/sigh/monitoreo-tickets', async (_request, response) => {
  try {
    const payload = await getMonitoreoTicketsReport()
    response.json(payload)
  } catch (error) {
    handleError(response, error, 'No se pudo consultar Monitoreo de Tickets.')
  }
})

reportsRouter.get('/sigh/monitoreo-ventanilla', async (_request, response) => {
  try {
    const payload = await getMonitoreoVentanillaReport()
    response.json(payload)
  } catch (error) {
    handleError(response, error, 'No se pudo consultar Monitoreo de Ventanilla.')
  }
})

reportsRouter.post('/epidemiologia/lavado/validate', async (request, response) => {
  try {
    const { username, password } = request.body ?? {}
    const validation = await validateLegacyUser({
      dni: String(username ?? '').trim(),
      password: String(password ?? '').trim(),
      ip: getClientIp(request),
      scope: 'lavado',
    })
    response.json(validation)
  } catch (error) {
    handleError(response, error, 'No se pudo validar el usuario para lavado de manos.')
  }
})

reportsRouter.get('/epidemiologia/lavado', async (request, response) => {
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

reportsRouter.get('/epidemiologia/lavado/empleados', async (request, response) => {
  try {
    const rows = await searchLavadoEmpleados(request.query.nombre)
    response.json({ rows })
  } catch (error) {
    handleError(response, error, 'No se pudo buscar empleados.')
  }
})

reportsRouter.get('/epidemiologia/lavado/actividades', async (request, response) => {
  try {
    const rows = await listLavadoActividades(request.query.tipo)
    response.json({ rows })
  } catch (error) {
    handleError(response, error, 'No se pudo obtener actividades.')
  }
})

reportsRouter.get('/epidemiologia/lavado/export', async (request, response) => {
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

reportsRouter.get('/epidemiologia/lavado/:id', async (request, response) => {
  try {
    const payload = await getLavadoRegistro(request.params.id)
    response.json(payload)
  } catch (error) {
    handleError(response, error, 'No se pudo obtener el registro solicitado.')
  }
})

reportsRouter.post('/epidemiologia/lavado', async (request, response) => {
  try {
    const payload = await createLavadoRegistro(request.body ?? {})
    response.status(201).json(payload)
  } catch (error) {
    handleError(response, error, 'No se pudo crear el registro.')
  }
})

reportsRouter.put('/epidemiologia/lavado/:id', async (request, response) => {
  try {
    const payload = await updateLavadoRegistro(request.params.id, request.body ?? {})
    response.json(payload)
  } catch (error) {
    handleError(response, error, 'No se pudo actualizar el registro.')
  }
})

reportsRouter.post('/epidemiologia/lavado/:id/anular', async (request, response) => {
  try {
    const payload = await anularLavadoRegistro(request.params.id)
    response.json(payload)
  } catch (error) {
    handleError(response, error, 'No se pudo anular el registro.')
  }
})
