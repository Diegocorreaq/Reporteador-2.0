import type { AuthUser } from '@/types/auth'

export const PPR_PORTAL_FALLBACK_EMPLOYEE_IDS = [5713, 6289, 1929] as const

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
