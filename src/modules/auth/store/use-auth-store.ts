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

function shouldResetPersistedUser(user: AuthUser | null | undefined) {
  if (!user) {
    return false
  }

  const name = String(user.name ?? '').trim()
  const username = String(user.username ?? '').trim()

  if (!name) {
    return true
  }

  if (/^\d+$/.test(name)) {
    return true
  }

  if (username && name.toLowerCase() === username.toLowerCase()) {
    return true
  }

  return false
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
      version: 2,
      migrate: (persistedState) => {
        if (!persistedState || typeof persistedState !== 'object') {
          return persistedState as AuthState
        }

        const state = persistedState as Partial<AuthState>

        if (shouldResetPersistedUser(state.user ?? null)) {
          return {
            ...state,
            user: null,
            activeWorkspace: 'main',
          } as AuthState
        }

        return state as AuthState
      },
    },
  ),
)
