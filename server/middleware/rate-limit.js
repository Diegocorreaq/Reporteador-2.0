import rateLimit from 'express-rate-limit'

// Strict limit for authentication endpoints (login, validate)
export const authLimiter = rateLimit({
  windowMs: 1 * 60 * 1000,
  max: 20,
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    code: 'TOO_MANY_AUTH_ATTEMPTS',
    message: 'Demasiados intentos de autenticacion. Intente nuevamente en 1 minuto.',
  },
  skipSuccessfulRequests: false,
})

// Moderate limit for export/download endpoints (resource-intensive)
export const exportLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 30,
  standardHeaders: true,
  legacyHeaders: false,
  message: { message: 'Límite de exportaciones alcanzado. Espere un momento e intente nuevamente.' },
})

// General API limit (allows normal internal usage)
export const apiLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 200,
  standardHeaders: true,
  legacyHeaders: false,
  message: { message: 'Demasiadas solicitudes. Intente nuevamente en un momento.' },
})
