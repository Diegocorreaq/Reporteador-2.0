import { useEffect } from 'react'
import type { PropsWithChildren } from 'react'
import { authService } from '@/services/auth/auth.service'
import { useAuthStore } from '@/modules/auth/store/use-auth-store'

function AuthBootstrap({ children }: PropsWithChildren) {
  const hydrate = useAuthStore((state) => state.hydrate)
  const signOut = useAuthStore((state) => state.signOut)

  // On mount: validate the session cookie and rehydrate the user store.
  // The cookie (HttpOnly, set by the backend) is the real auth boundary — the
  // store is just UI state derived from a valid server-side session.
  useEffect(() => {
    authService
      .me()
      .then((user) => hydrate(user))
      .catch(() => hydrate(null))
  }, [hydrate])

  // When any API call returns 401 (session expired mid-session), clear the
  // local store. The RequireAuth guard will redirect to /login on next render.
  useEffect(() => {
    const handler = () => signOut()
    window.addEventListener('auth:session-expired', handler)
    return () => {
      window.removeEventListener('auth:session-expired', handler)
    }
  }, [signOut])

  return children
}

// NOTE: AppProviders is mounted outside RouterProvider, so it cannot use
// router hooks directly. Navigation on 401 is handled by RequireAuth guard
// reacting to store.user becoming null after signOut().
export function AppProviders({ children }: PropsWithChildren) {
  return <AuthBootstrap>{children}</AuthBootstrap>
}
