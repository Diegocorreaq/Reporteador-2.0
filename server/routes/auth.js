import { Router } from 'express'
import { validateLegacyUser } from '../services/legacy-export.service.js'
import { createSession, verifySession } from '../services/auth-session.service.js'
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

function buildUserResponse(sessionPayload) {
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
    pprRole: null,
  }
}

function normalizeLegacyValidationScope(scope) {
  const value = String(scope ?? '').trim()
  if (value === 'lavado' || value === 'zona-descarga/morbilidad-materna') {
    return value
  }
  return 'general'
}

// POST /auth/login — validate credentials, issue session cookie
authRouter.post('/auth/login', authLimiter, async (request, response) => {
  const correlationId = request.correlationId
  try {
    const { username, password, scope } = request.body ?? {}
    const ip = getClientIp(request)

    const normalizedScope = normalizeLegacyValidationScope(scope)
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
    }

    const token = createSession(sessionPayload)
    response.cookie(SESSION_COOKIE_NAME, token, getSessionCookieOptions())

    logger.info({
      correlationId,
      event: 'auth:login:success',
      userId: sessionPayload.id,
      ip,
    })

    response.json({ user: buildUserResponse(sessionPayload) })
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
authRouter.get('/auth/me', requireAuth, (request, response) => {
  response.json({ user: buildUserResponse(request.user) })
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
