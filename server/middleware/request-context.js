import { randomUUID } from 'node:crypto'
import { logger } from '../utils/logger.js'

function getClientIp(request) {
  const forwarded = request.headers['x-forwarded-for']
  if (typeof forwarded === 'string' && forwarded.length > 0) {
    return forwarded.split(',')[0].trim()
  }
  return request.ip || request.socket?.remoteAddress || '0.0.0.0'
}

export function requestContext(request, response, next) {
  const correlationId = randomUUID()
  const startTime = Date.now()

  request.correlationId = correlationId
  response.setHeader('X-Correlation-Id', correlationId)

  response.on('finish', () => {
    logger.info({
      correlationId,
      method: request.method,
      path: request.path,
      status: response.statusCode,
      duration: Date.now() - startTime,
      userId: request.user?.id ?? null,
      ip: getClientIp(request),
    })
  })

  next()
}
