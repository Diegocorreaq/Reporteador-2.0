import type { AuthCredentials, AuthSession } from '@/types/auth'
import { httpClient } from '@/services/http/client'

interface LegacyAuthValidationResponse {
  ok: boolean
  employeeId: number | null
  employeeName: string
  message?: string
}

function hasLetters(value: string) {
  return /[\p{L}]/u.test(value)
}

export const authService = {
  async signIn(credentials: AuthCredentials): Promise<AuthSession> {
    const username = String(credentials.username ?? '').trim()
    const password = String(credentials.password ?? '').trim()

    const response = await httpClient.post<LegacyAuthValidationResponse>('/exports/validate', {
      username,
      password,
      scope: 'general',
    })
    const validation = response.data

    if (!validation.ok || !validation.employeeId) {
      throw new Error(validation.message || 'No se pudo validar el usuario.')
    }

    const employeeName = String(validation.employeeName ?? '').trim()
    if (!employeeName || !hasLetters(employeeName)) {
      throw new Error('No se pudo obtener el nombre del empleado autenticado.')
    }

    return {
      workspace: 'main',
      user: {
        id: `emp-${validation.employeeId}`,
        username,
        employeeId: validation.employeeId,
        name: employeeName,
        role: 'Analista de informaci\u00f3n',
        service: 'Unidad de Inteligencia Sanitaria',
        email: `${username || 'usuario'}@hospital.local`,
        permissions: ['*'],
      },
    }
  },
}
