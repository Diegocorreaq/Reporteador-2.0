import type { ReactNode } from 'react'
import { Navigate, Outlet, useLocation } from 'react-router-dom'
import { AccessDeniedPage } from '@/modules/shared/pages/access-denied-page'
import { menuService } from '@/services/menu/menu.service'
import { useAuthStore } from '@/modules/auth/store/use-auth-store'
import type { NavigationAccessRule } from '@/types/navigation'

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

export function RequireAccess({
  access,
  children,
  fallback,
}: {
  access: NavigationAccessRule
  children: ReactNode
  fallback?: ReactNode
}) {
  const user = useAuthStore((state) => state.user)

  if (!menuService.canAccess(user, access)) {
    return fallback ?? <AccessDeniedPage />
  }

  return children
}
