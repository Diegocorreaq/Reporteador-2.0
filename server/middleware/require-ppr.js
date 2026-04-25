/**
 * requirePprAccess(requiredRole?)
 * Must be used after requireAuth so request.user is already set.
 *
 * requiredRole — if provided, the user's pprRole must match exactly.
 * If omitted, any non-null pprRole is accepted.
 */
export function requirePprAccess(requiredRole = null) {
  return function (request, response, next) {
    const pprRole = request.user?.pprRole ?? null

    if (!pprRole) {
      return response.status(403).json({
        code: 'PPR_ACCESS_DENIED',
        message: 'No tiene acceso al Portal PPR.',
        correlationId: request.correlationId,
      })
    }

    if (requiredRole && pprRole !== requiredRole) {
      return response.status(403).json({
        code: 'PPR_ROLE_DENIED',
        message: 'Rol PPR insuficiente para esta operación.',
        correlationId: request.correlationId,
      })
    }

    next()
  }
}
