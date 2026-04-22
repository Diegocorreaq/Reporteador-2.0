import { logger } from '../utils/logger.js'

// eslint-disable-next-line no-unused-vars
export function errorHandler(error, request, response, _next) {
  const correlationId = request.correlationId ?? 'unknown'

  logger.error({
    correlationId,
    method: request.method,
    path: request.path,
    userId: request.user?.id ?? null,
    message: error instanceof Error ? error.message : String(error),
    stack: error instanceof Error ? error.stack : undefined,
  })

  const status =
    typeof error.status === 'number'
      ? error.status
      : typeof error.statusCode === 'number'
        ? error.statusCode
        : 500

  // Never expose internal error details to the client
  response.status(status).json({
    message: 'No se pudo procesar la solicitud.',
    correlationId,
  })
}
