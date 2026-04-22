import type { AuthCredentials, AuthSession, AuthUser } from '@/types/auth'
import { httpClient } from '@/services/http/client'

interface LoginResponse {
  user: AuthUser
}

interface MeResponse {
  user: AuthUser
}

export const authService = {
  async signIn(credentials: AuthCredentials): Promise<AuthSession> {
    const response = await httpClient.post<LoginResponse>('/auth/login', {
      username: String(credentials.username ?? '').trim(),
      password: String(credentials.password ?? '').trim(),
    })
    return {
      workspace: 'main',
      user: response.data.user,
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
