export const SESSION_COOKIE_NAME = 'session'

// 8 hours in seconds
const SESSION_MAX_AGE_SECONDS = 8 * 60 * 60
const COOKIE_SECURE_TRUE_VALUES = new Set(['true', '1', 'yes', 'on'])
const COOKIE_SECURE_FALSE_VALUES = new Set(['false', '0', 'no', 'off'])

function resolveCookieSecure() {
  if (process.env.COOKIE_SECURE !== undefined) {
    const value = String(process.env.COOKIE_SECURE).trim().toLowerCase()
    if (COOKIE_SECURE_TRUE_VALUES.has(value)) return true
    if (COOKIE_SECURE_FALSE_VALUES.has(value)) return false
  }
  return process.env.NODE_ENV === 'production'
}

export function getSessionCookieOptions() {
  const cookieSecure = resolveCookieSecure()
  return {
    httpOnly: true,
    sameSite: 'lax',
    secure: cookieSecure,
    maxAge: SESSION_MAX_AGE_SECONDS * 1000,
    path: '/',
  }
}

export function getClearCookieOptions() {
  const cookieSecure = resolveCookieSecure()
  return {
    httpOnly: true,
    sameSite: 'lax',
    secure: cookieSecure,
    path: '/',
  }
}
