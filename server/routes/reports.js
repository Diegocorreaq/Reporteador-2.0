import { Router } from 'express'
import { getCentroObstetricoReport } from '../services/centro-obstetrico-report.service.js'
import { getUccaReport, getUccpReport } from '../services/critical-care-report.service.js'
import {
  executeConfiguredExport,
  listCatalogExports,
  validateLegacyUser,
} from '../services/legacy-export.service.js'
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
