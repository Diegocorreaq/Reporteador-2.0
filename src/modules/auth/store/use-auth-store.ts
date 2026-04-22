import { create } from 'zustand'
import type { AuthSession, AuthUser, WorkspaceKey } from '@/types/auth'

interface AuthState {
  user: AuthUser | null
  activeWorkspace: WorkspaceKey
  // True once the initial auth/me check completes (success or 401).
  // Guards should wait for this before redirecting.
  isHydrated: boolean
  signIn: (session: AuthSession) => void
  signOut: () => void
  setWorkspace: (workspace: WorkspaceKey) => void
  // Called by AppProviders after the auth/me response — sets user + marks as hydrated.
  // UI state only: the session cookie (HttpOnly) is the real security boundary.
  hydrate: (user: AuthUser | null) => void
}

export const useAuthStore = create<AuthState>()((set) => ({
  user: null,
  activeWorkspace: 'main',
  isHydrated: false,
  signIn: ({ user, workspace }) => set({ user, activeWorkspace: workspace }),
  signOut: () => set({ user: null, activeWorkspace: 'main' }),
  setWorkspace: (workspace) => set({ activeWorkspace: workspace }),
  hydrate: (user) => set({ user, isHydrated: true }),
}))
