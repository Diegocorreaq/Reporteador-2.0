export type WorkspaceKey = 'main' | 'sigh'

export type PprRole = 'ppr_admin' | 'ppr_coordinador' | 'ppr_supervisor' | 'ppr_consulta'

export interface AuthUser {
  id: string
  username: string
  employeeId: number | null
  name: string
  role: string
  service: string
  email: string
  permissions: string[]
  deniedPermissions?: string[]
  pprRole: PprRole | null
}

export interface AuthCredentials {
  username: string
  password: string
}

export interface AuthSession {
  user: AuthUser
  workspace: WorkspaceKey
}
