import { Router } from 'express'
import { requireAuth } from '../middleware/require-auth.js'
import { requirePprAccess } from '../middleware/require-ppr.js'
import {
  getPeriodoActivo,
  getProgramasUsuario,
  getActividadesPrograma,
  guardarValor,
  firmarPeriodo,
} from '../services/ppr-data.service.js'
import { logger } from '../utils/logger.js'

export const pprRouter = Router()

// GET /ppr/me — PPR identity of the current session
pprRouter.get('/ppr/me', requireAuth, requirePprAccess(), (request, response) => {
  response.json({
    employeeId: request.user.employeeId,
    pprRole: request.user.pprRole,
  })
})

// GET /ppr/periodo-activo — current open period
pprRouter.get('/ppr/periodo-activo', requireAuth, requirePprAccess(), async (request, response) => {
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

// GET /ppr/programas — programs assigned to the current coordinator
pprRouter.get('/ppr/programas', requireAuth, requirePprAccess(), async (request, response) => {
  try {
    const programas = await getProgramasUsuario(request.user.employeeId)
    response.json({ programas })
  } catch (error) {
    logger.error({ correlationId: request.correlationId, event: 'ppr:programas:error', message: String(error) })
    response.status(500).json({ code: 'PPR_ERROR', message: 'Error al obtener programas.' })
  }
})

// GET /ppr/actividades?programaId=&periodoId= — activities with current period values
pprRouter.get('/ppr/actividades', requireAuth, requirePprAccess(), async (request, response) => {
  const programaId = Number(request.query.programaId)
  const periodoId = Number(request.query.periodoId)
  if (!programaId || !periodoId) {
    return response.status(400).json({ code: 'MISSING_PARAMS', message: 'Se requiere programaId y periodoId.' })
  }
  try {
    const actividades = await getActividadesPrograma({
      programaId,
      periodoId,
      employeeId: request.user.employeeId,
    })
    response.json({ actividades })
  } catch (error) {
    logger.error({ correlationId: request.correlationId, event: 'ppr:actividades:error', message: String(error) })
    response.status(500).json({ code: 'PPR_ERROR', message: 'Error al obtener actividades.' })
  }
})

// POST /ppr/valores — save or update a monthly value
pprRouter.post('/ppr/valores', requireAuth, requirePprAccess(), async (request, response) => {
  const { activityId, periodId, value, notes } = request.body ?? {}
  if (activityId == null || periodId == null || value == null) {
    return response.status(400).json({ code: 'MISSING_PARAMS', message: 'Se requiere activityId, periodId y value.' })
  }
  try {
    await guardarValor({
      activityId: Number(activityId),
      periodId: Number(periodId),
      employeeId: request.user.employeeId,
      value: Number(value),
      notes: notes ?? null,
    })
    response.json({ ok: true })
  } catch (error) {
    logger.error({ correlationId: request.correlationId, event: 'ppr:valores:error', message: String(error) })
    response.status(500).json({ code: 'PPR_ERROR', message: 'Error al guardar valor.' })
  }
})

// POST /ppr/firmar — sign the active period
pprRouter.post('/ppr/firmar', requireAuth, requirePprAccess(), async (request, response) => {
  const { periodId } = request.body ?? {}
  if (periodId == null) {
    return response.status(400).json({ code: 'MISSING_PARAMS', message: 'Se requiere periodId.' })
  }
  try {
    const signedAt = await firmarPeriodo({
      employeeId: request.user.employeeId,
      periodId: Number(periodId),
    })
    logger.info({
      correlationId: request.correlationId,
      event: 'ppr:firmar',
      userId: request.user.id,
      periodId,
    })
    response.json({ ok: true, signedAt })
  } catch (error) {
    logger.error({ correlationId: request.correlationId, event: 'ppr:firmar:error', message: String(error) })
    response.status(500).json({ code: 'PPR_ERROR', message: 'Error al firmar período.' })
  }
})
