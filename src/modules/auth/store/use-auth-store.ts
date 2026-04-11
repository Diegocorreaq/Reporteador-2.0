import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import type { AuthSession, AuthUser, WorkspaceKey } from '@/types/auth'

interface AuthState {
  user: AuthUser | null
  activeWorkspace: WorkspaceKey
  signIn: (session: AuthSession) => void
  signOut: () => void
  setWorkspace: (workspace: WorkspaceKey) => void
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set) => ({
      user: null,
      activeWorkspace: 'main',
      signIn: ({ user, workspace }) =>
        set({
          user,
          activeWorkspace: workspace,
        }),
      signOut: () =>
        set({
          user: null,
          activeWorkspace: 'main',
        }),
      setWorkspace: (workspace) =>
        set({
          activeWorkspace: workspace,
        }),
    }),
    {
      name: 'reporteador-next-auth',
    },
  ),
)
