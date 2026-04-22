import { Navigate, Outlet, useLocation } from 'react-router-dom'
import { useAuthStore } from '@/modules/auth/store/use-auth-store'

export function RequireAuth() {
  const user = useAuthStore((state) => state.user)
  const isHydrated = useAuthStore((state) => state.isHydrated)
  const location = useLocation()

  // Wait for the auth/me check to finish before deciding.
  // Rendering null avoids flashing the login page on refresh with a valid cookie.
  if (!isHydrated) {
    return null
  }

  if (!user) {
    return <Navigate replace state={{ from: location.pathname }} to="/login" />
  }

  return <Outlet />
}
