import { verifySession } from '../services/auth-session.service.js'
import { SESSION_COOKIE_NAME } from '../utils/cookies.js'

export function requireAuth(request, response, next) {
  const token = request.cookies?.[SESSION_COOKIE_NAME]

  if (!token) {
    return response.status(401).json({
      message: 'No autenticado.',
      correlationId: request.correlationId,
    })
  }

  const user = verifySession(token)

  if (!user) {
    return response.status(401).json({
      message: 'Sesión expirada o inválida.',
      correlationId: request.correlationId,
    })
  }

  request.user = user
  next()
}
