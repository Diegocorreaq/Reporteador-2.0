import type { AuthUser } from '@/types/auth'

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
