export const SESSION_COOKIE_NAME = 'session'

// 8 hours in seconds
const SESSION_MAX_AGE_SECONDS = 8 * 60 * 60

export function getSessionCookieOptions() {
  const isProduction = process.env.NODE_ENV === 'production'
  return {
    httpOnly: true,
    sameSite: 'lax',
    // Only send over HTTPS in production; allow HTTP in dev (Vite proxy)
    secure: isProduction,
    maxAge: SESSION_MAX_AGE_SECONDS * 1000,
    path: '/',
  }
}

export function getClearCookieOptions() {
  const isProduction = process.env.NODE_ENV === 'production'
  return {
    httpOnly: true,
    sameSite: 'lax',
    secure: isProduction,
    path: '/',
  }
}
