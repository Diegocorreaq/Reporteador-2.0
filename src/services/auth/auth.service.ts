import axios from 'axios'
import type { AuthCredentials, AuthSession, AuthUser } from '@/types/auth'
import { httpClient } from '@/services/http/client'

interface LoginResponse {
  user: AuthUser
}

interface MeResponse {
  user: AuthUser
}

interface AuthErrorResponse {
  code?: string
  message?: string
}

const DEFAULT_SIGNIN_ERROR =
  'No fue posible iniciar sesion. Verifica tus datos e intentalo nuevamente.'

function getSignInErrorMessage(error: unknown): string {
  if (axios.isAxiosError<AuthErrorResponse>(error)) {
    const status = error.response?.status
    const code = error.response?.data?.code
    const serverMessage = typeof error.response?.data?.message === 'string' ? error.response.data.message.trim() : ''

    if (code === 'TOO_MANY_AUTH_ATTEMPTS' || status === 429) {
      return 'Demasiados intentos de inicio de sesion. Espera 1 minuto e intentalo nuevamente.'
    }

    if (code === 'IDENTITY_NOT_VERIFIED') {
      return 'No se pudo verificar tu identidad. Si el problema continua, contacta a soporte.'
    }

    if (code === 'INVALID_CREDENTIALS' || status === 401) {
      return serverMessage || 'Usuario o contrasena incorrectos. Verifica tus datos e intentalo nuevamente.'
    }

    if (typeof status === 'number' && status >= 500) {
      return 'El servidor no pudo procesar el inicio de sesion. Intenta nuevamente en unos minutos.'
    }

    if (!error.response) {
      return 'No se pudo conectar con el servidor. Revisa tu conexion e intentalo nuevamente.'
    }

    if (serverMessage) {
      return serverMessage
    }
  }

  if (error instanceof Error && /timeout/i.test(error.message)) {
    return 'La solicitud demoro demasiado. Intentalo nuevamente.'
  }

  return DEFAULT_SIGNIN_ERROR
}

export const authService = {
  async signIn(credentials: AuthCredentials): Promise<AuthSession> {
    try {
      const response = await httpClient.post<LoginResponse>('/auth/login', {
        username: String(credentials.username ?? '').trim(),
        password: String(credentials.password ?? '').trim(),
      })
      return {
        workspace: 'main',
        user: response.data.user,
      }
    } catch (error) {
      throw new Error(getSignInErrorMessage(error))
    }
  },

  // Called on app startup to rehydrate session from the HttpOnly cookie.
  // Throws (401) if no valid session exists — caller should handle this.
  async me(): Promise<AuthUser> {
    const response = await httpClient.get<MeResponse>('/auth/me')
    return response.data.user
  },

  async signOut(): Promise<void> {
    await httpClient.post('/auth/logout')
  },
}
