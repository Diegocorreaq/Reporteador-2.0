import { Navigate, Outlet, useLocation } from 'react-router-dom'
import { useAuthStore } from '@/modules/auth/store/use-auth-store'

export function RequireAuth() {
  const user = useAuthStore((state) => state.user)
  const location = useLocation()

  if (!user) {
    return <Navigate replace state={{ from: location.pathname }} to="/login" />
  }

  return <Outlet />
}
