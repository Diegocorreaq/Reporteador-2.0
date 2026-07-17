import { Router } from 'express'
import { hasLegacyAuthScope, validateLegacyUser } from '../services/legacy-export.service.js'
import { createSession, verifySession } from '../services/auth-session.service.js'
import { getReportAccessPermission, validateReportAccess } from '../services/report-access.service.js'
import { getSqlPool, sql } from '../db/sql-server.js'
import { requireAuth } from '../middleware/require-auth.js'
import { authLimiter } from '../middleware/rate-limit.js'
import {
  SESSION_COOKIE_NAME,
  getSessionCookieOptions,
  getClearCookieOptions,
} from '../utils/cookies.js'
import { logger } from '../utils/logger.js'

export const authRouter = Router()

function getClientIp(request) {
  const forwarded = request.headers['x-forwarded-for']
  if (typeof forwarded === 'string' && forwarded.length > 0) {
    return forwarded.split(',')[0].trim()
  }
  return request.ip || request.socket?.remoteAddress || '0.0.0.0'
}

async function getDeniedPermissions(sessionPayload, ip, correlationId) {
  const scope = 'laboratorio-cultivos/mapa-microbiologico'
  const permission = getReportAccessPermission(scope)

  try {
    const validation = await validateReportAccess({
      scope,
      dni: sessionPayload.username,
      ip,
    })

    return validation.ok || !permission ? [] : [permission]
  } catch (error) {
    logger.warn({
      correlationId,
      event: 'auth:report-access:error',
      scope,
      message: error instanceof Error ? error.message : String(error),
    })
    return permission ? [permission] : []
  }
}

async function getPprRoleForEmployee(employeeId, correlationId) {
  const parsedEmployeeId = Number(employeeId)
  if (!parsedEmployeeId) return null

  try {
    const pool = await getSqlPool('general')

    try {
      const adminRequest = pool.request()
      adminRequest.input('employee_id', sql.Int, parsedEmployeeId)
      const adminResult = await adminRequest.execute('SP_PPR_ADMIN_VERIFICAR')
      if (Boolean(adminResult.recordset?.[0]?.is_admin)) {
        return 'ppr_admin'
      }
    } catch (error) {
      logger.warn({
        correlationId,
        event: 'auth:ppr-role:admin-check-error',
        employeeId: parsedEmployeeId,
        message: error instanceof Error ? error.message : String(error),
      })
    }

    const coordinatorRequest = pool.request()
    coordinatorRequest.input('employee_id', sql.Int, parsedEmployeeId)
    const coordinatorResult = await coordinatorRequest.query(`
      SELECT CASE
        WHEN EXISTS (
          SELECT 1
          FROM dbo.ppr_user_programs up
          WHERE up.employee_id = @employee_id
            AND up.is_active = 1
        )
        OR EXISTS (
          SELECT 1
          FROM dbo.ppr_coordinadores c
          WHERE c.idempleado = @employee_id
            AND ISNULL(c.activo, 1) = 1
        )
        THEN 1 ELSE 0
      END AS is_coordinator;
    `)

    return Boolean(coordinatorResult.recordset?.[0]?.is_coordinator) ? 'ppr_coordinador' : null
  } catch (error) {
    logger.warn({
      correlationId,
      event: 'auth:ppr-role:error',
      employeeId: parsedEmployeeId,
      message: error instanceof Error ? error.message : String(error),
    })
    return null
  }
}

async function buildUserResponse(sessionPayload, request) {
  const pprRole = sessionPayload.pprRole ?? await getPprRoleForEmployee(sessionPayload.employeeId, request.correlationId)

  return {
    id: sessionPayload.id,
    username: sessionPayload.username,
    employeeId: sessionPayload.employeeId,
    name: sessionPayload.name,
    // Role/permissions are UI labels only — security enforced by session cookie, not these values
    role: 'Analista de información',
    service: 'Unidad de Inteligencia Sanitaria',
    email: `${sessionPayload.username}@hospital.local`,
    permissions: ['*'],
    deniedPermissions: await getDeniedPermissions(sessionPayload, getClientIp(request), request.correlationId),
    pprRole,
  }
}

function normalizeLegacyValidationScope(scope) {
  const value = String(scope ?? '').trim()
  if (!value) {
    return 'general'
  }
  return hasLegacyAuthScope(value) ? value : null
}

// POST /auth/login — validate credentials, issue session cookie
authRouter.post('/auth/login', authLimiter, async (request, response) => {
  const correlationId = request.correlationId
  try {
    const { username, password, scope } = request.body ?? {}
    const ip = getClientIp(request)

    const normalizedScope = normalizeLegacyValidationScope(scope)
    if (!normalizedScope) {
      return response.status(400).json({
        code: 'UNKNOWN_ACCESS_SCOPE',
        message: 'El permiso solicitado no existe.',
        correlationId,
      })
    }

    const validation = await validateLegacyUser({
      dni: String(username ?? '').trim(),
      password: String(password ?? '').trim(),
      ip,
      scope: normalizedScope,
    })

    if (!validation.ok || !validation.employeeId) {
      logger.warn({
        correlationId,
        event: 'auth:login:failed',
        ip,
        reason: 'invalid-credentials',
      })
      return response.status(401).json({
        code: 'INVALID_CREDENTIALS',
        message: validation.message || 'Credenciales inválidas.',
        correlationId,
      })
    }

    const employeeName = String(validation.employeeName ?? '').trim()
    if (!employeeName || /^\d+$/.test(employeeName)) {
      logger.warn({ correlationId, event: 'auth:login:failed', ip, reason: 'invalid-employee-name' })
      return response.status(401).json({
        code: 'IDENTITY_NOT_VERIFIED',
        message: 'No se pudo verificar la identidad del usuario.',
        correlationId,
      })
    }

    const sessionPayload = {
      id: `emp-${validation.employeeId}`,
      username: String(username ?? '').trim(),
      employeeId: validation.employeeId,
      name: employeeName,
      scope: normalizedScope,
      pprRole: await getPprRoleForEmployee(validation.employeeId, correlationId),
    }

    const token = createSession(sessionPayload)
    response.cookie(SESSION_COOKIE_NAME, token, getSessionCookieOptions())

    logger.info({
      correlationId,
      event: 'auth:login:success',
      userId: sessionPayload.id,
      ip,
    })

    response.json({ user: await buildUserResponse(sessionPayload, request) })
  } catch (error) {
    logger.error({
      correlationId,
      event: 'auth:login:error',
      message: error instanceof Error ? error.message : String(error),
    })
    response.status(500).json({ code: 'AUTH_LOGIN_ERROR', message: 'No se pudo iniciar sesión.', correlationId })
  }
})

// GET /auth/me — return current authenticated user from session cookie
authRouter.get('/auth/me', requireAuth, async (request, response) => {
  response.json({ user: await buildUserResponse(request.user, request) })
})

// POST /auth/logout — clear session cookie
authRouter.post('/auth/logout', (request, response) => {
  const userId = request.cookies?.[SESSION_COOKIE_NAME]
    ? verifySession(request.cookies[SESSION_COOKIE_NAME])?.id ?? null
    : null

  logger.info({
    correlationId: request.correlationId,
    event: 'auth:logout',
    userId,
  })

  response.clearCookie(SESSION_COOKIE_NAME, getClearCookieOptions())
  response.json({ message: 'Sesión cerrada.' })
})
