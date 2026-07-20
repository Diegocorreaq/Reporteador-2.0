import type { AuthUser } from '@/types/auth'

export const PPR_PORTAL_READONLY_EMPLOYEE_IDS = [3833, 4064, 5526, 4550, 6358, 3436, 6739, 3137] as const

export const PPR_PORTAL_FALLBACK_EMPLOYEE_IDS = [
  5713,
  6289,
  1929,
  ...PPR_PORTAL_READONLY_EMPLOYEE_IDS,
] as const

export function normalizeDni(value: unknown): string {
  return String(value ?? '').trim()
}

export function userMatchesAllowedDnis(
  user: Pick<AuthUser, 'username'> | null | undefined,
  allowedDnis?: readonly string[],
): boolean {
  if (!allowedDnis?.length) {
    return true
  }

  const userDni = normalizeDni(user?.username)
  return allowedDnis.some((dni) => normalizeDni(dni) === userDni)
}
