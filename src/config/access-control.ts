import type { AuthUser } from '@/types/auth'

export const MAPA_MICROBIOLOGICO_ALLOWED_DNIS = [
  '09761143',
  '44855792',
  '40571084',
  '42600555',
  '46674042',
  '45003129',
  '41725456',
  '32866752',
  '70715971',
]

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
