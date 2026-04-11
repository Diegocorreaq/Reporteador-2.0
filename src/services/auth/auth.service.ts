import type { AuthCredentials, AuthSession } from '@/types/auth'

function wait(ms: number) {
  return new Promise((resolve) => window.setTimeout(resolve, ms))
}

export const authService = {
  async signIn(credentials: AuthCredentials): Promise<AuthSession> {
    await wait(450)

    return {
      workspace: 'main',
      user: {
        id: 'user-001',
        name: credentials.username || 'operador.reportes',
        role: 'Analista de informaci\u00f3n',
        service: 'Unidad de Inteligencia Sanitaria',
        email: `${credentials.username || 'operador'}@hospital.local`,
        permissions: ['*'],
      },
    }
  },
}
