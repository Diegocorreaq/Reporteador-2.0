export type WorkspaceKey = 'main' | 'sigh'

export interface AuthUser {
  id: string
  username: string
  employeeId: number | null
  name: string
  role: string
  service: string
  email: string
  permissions: string[]
}

export interface AuthCredentials {
  username: string
  password: string
}

export interface AuthSession {
  user: AuthUser
  workspace: WorkspaceKey
}
