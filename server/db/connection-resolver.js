/**
 * Maps service/module names to their SQL connections.
 * SIGH modules use connection 1 unless explicitly configured otherwise.
 * Non-SIGH modules use the general connection.
 */

const SERVICE_TO_CONNECTION_MAP = {
  // SIGH modules that use connection 1
  'sigh.prod-medicos': 'sigh1',
  'prod-medicos': 'sigh1',
  'sigh.monitoreo': 'sigh1',
  'sigh.familia-pendiente': 'sigh1',
  'sigh.gestion-cita': 'sigh1',
  'sigh.camas': 'sigh1',
  'sigh.exportaciones': 'sigh1',
  'sigh.registros': 'sigh1',
  'sigh.covid': 'sigh1',
  'sigh.lavado': 'sigh1',

  // General (non-SIGH) modules
  'centro-obstetrico': 'general',
  'ucca': 'general',
  'uccp': 'general',
  'exportaciones': 'general',
  'inicio': 'general',
}

/**
 * Resolves the SQL connection to use based on:
 * 1. Explicit service name mapping
 * 2. Request path heuristics
 * 3. Default to general
 *
 * @param {Object} options
 * @param {string} [options.service] - Service/module name
 * @param {string} [options.path] - Request path (for fallback heuristics)
 * @returns {string} Connection name: 'general', 'sigh1', or 'sigh2'
 */
export function resolveConnection({ service, path } = {}) {
  // Check explicit mapping
  if (service && SERVICE_TO_CONNECTION_MAP[service]) {
    return SERVICE_TO_CONNECTION_MAP[service]
  }

  // Heuristic: check request path for SIGH indicators
  if (path) {
    if (path.includes('/sigh/prod-medicos')) {
      return 'sigh1'
    }

    if (path.includes('/sigh/')) {
      return 'sigh1'
    }
  }

  // Check service prefix for SIGH
  if (service && service.startsWith('sigh.')) {
    if (service.includes('prod-medicos') || service.includes('produccion')) {
      return 'sigh1'
    }

    return 'sigh1'
  }

  // Default to general
  return 'general'
}

/**
 * Middleware to attach connection resolver to request.
 * Usage: app.use(connectionResolverMiddleware())
 */
export function connectionResolverMiddleware() {
  return (request, _response, next) => {
    // Extract service from request
    const path = request.path || request.url || ''

    // Infer service from path patterns
    let service = null

    if (path.includes('/sigh/prod-medicos')) {
      service = 'sigh.prod-medicos'
    } else if (path.includes('/sigh/')) {
      service = 'sigh'
    }

    // Attach resolver to request for use in route handlers
    request.getConnection = () => resolveConnection({ service, path })

    next()
  }
}
