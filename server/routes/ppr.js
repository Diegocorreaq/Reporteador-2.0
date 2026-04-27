import { Router } from 'express'
import { requireAuth } from '../middleware/require-auth.js'
import { authLimiter } from '../middleware/rate-limit.js'
import { validatePprUser } from '../services/ppr.service.js'
import {
  getPeriodoActivo,
  getProgramasUsuario,
  getActividadesPrograma,
  guardarValor,
  firmarPeriodo,
  getPeriodosUsuario,
  getResumenAnual,
  verificarAdmin,
  getCoordinadores,
  guardarCoordinador,
  getTodosLosProgramas,
  guardarAsignacion,
} from '../services/ppr-data.service.js'
import { logger } from '../utils/logger.js'

export const pprRouter = Router()

// Verifies the requesting employee is a PPR admin before allowing admin operations
async function requirePprAdmin(request, response, next) {
  const adminId = Number(request.body?.adminId ?? request.query?.adminId)
  if (!adminId) {
    return response.status(403).json({ code: 'FORBIDDEN', message: 'Se requiere ID de administrador PPR.' })
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
pprRouter.post('/ppr/valores', requireAuth, async (request, response) => {
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
    response.status(500).json({ code: 'PPR_ERROR', message: 'Error al guardar valor.' })
  }
})

// GET /ppr/periodos — all periods for the year with signing/progress status per employee
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
pprRouter.post('/ppr/firmar', requireAuth, async (request, response) => {
  const { periodId, employeeId } = request.body ?? {}
  if (periodId == null || employeeId == null) {
    return response.status(400).json({ code: 'MISSING_PARAMS', message: 'Se requiere periodId y employeeId.' })
  }
  try {
    const signedAt = await firmarPeriodo({
      employeeId: Number(employeeId),
      periodId: Number(periodId),
    })
    logger.info({
      correlationId: request.correlationId,
      event: 'ppr:firmar',
      employeeId,
      periodId,
    })
    response.json({ ok: true, signedAt })
  } catch (error) {
    logger.error({ correlationId: request.correlationId, event: 'ppr:firmar:error', message: String(error) })
    response.status(500).json({ code: 'PPR_ERROR', message: 'Error al firmar período.' })
  }
})

// ─── Admin routes ─────────────────────────────────────────────────────────────

// GET /ppr/admin/coordinadores — list all coordinators with their programs
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
