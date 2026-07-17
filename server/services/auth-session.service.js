import jwt from 'jsonwebtoken'
import { logger } from '../utils/logger.js'

const ALGORITHM = 'HS256'
const SESSION_EXPIRY = '8h'

function getSecret() {
  const secret = process.env.JWT_SECRET
  if (!secret) {
    throw new Error('JWT_SECRET no está configurado. La aplicación no puede generar sesiones seguras.')
  }
  return secret
}

export function createSession(payload) {
  return jwt.sign(
    {
      id: payload.id,
      username: payload.username,
      employeeId: payload.employeeId,
      name: payload.name,
      scope: payload.scope ?? 'general',
      pprRole: payload.pprRole ?? null,
    },
    getSecret(),
    { expiresIn: SESSION_EXPIRY, algorithm: ALGORITHM },
  )
}

export function verifySession(token) {
  try {
    return jwt.verify(token, getSecret(), { algorithms: [ALGORITHM] })
  } catch (error) {
    if (error.name !== 'TokenExpiredError' && error.name !== 'JsonWebTokenError') {
      logger.warn({ event: 'session:verify:unexpected-error', message: error.message })
    }
    return null
  }
}
