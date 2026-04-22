const REDACTED_HEADERS = new Set(['cookie', 'authorization', 'set-cookie'])

function sanitizeHeaders(headers) {
  const safe = {}
  for (const [key, value] of Object.entries(headers ?? {})) {
    safe[key] = REDACTED_HEADERS.has(key.toLowerCase()) ? '[REDACTED]' : value
  }
  return safe
}

function log(level, data) {
  const entry = JSON.stringify({
    level,
    timestamp: new Date().toISOString(),
    ...data,
  })
  if (level === 'error') {
    console.error(entry)
  } else if (level === 'warn') {
    console.warn(entry)
  } else {
    console.log(entry)
  }
}

export const logger = {
  info: (data) => log('info', data),
  warn: (data) => log('warn', data),
  error: (data) => log('error', data),
  sanitizeHeaders,
}
