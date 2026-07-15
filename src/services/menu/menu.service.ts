import {
  findNavigationItem,
  getNavigationSections,
  getWorkspaceFeaturedItems,
  getWorkspaceHomeContent,
  getWorkspaceQuickLinks,
  getWorkspaceSupportItems,
} from '@/config/navigation'
import { userMatchesAllowedDnis } from '@/config/access-control'
import type { AuthUser, WorkspaceKey } from '@/types/auth'
import type { NavigationAccessRule, NavigationEntry, NavigationGroup } from '@/types/navigation'

function isNavigationGroup(entry: NavigationEntry): entry is NavigationGroup {
  return 'items' in entry
}

function matchesPermission(grantedPermissions: Set<string>, requiredPermission: string) {
  if (grantedPermissions.has('*') || grantedPermissions.has(requiredPermission)) {
    return true
  }

  const segments = requiredPermission.split('.')
  while (segments.length > 1) {
    segments.pop()
    if (grantedPermissions.has(`${segments.join('.')}.*`)) {
      return true
    }
  }

  return false
}

function hasAccess(user: AuthUser | null | undefined, access?: NavigationAccessRule) {
  if (!access) {
    return true
  }

  if (!user) {
    return !access.allowedDnis?.length
  }

  const grantedPermissions = new Set(user.permissions)
  const deniedPermissions = new Set(user.deniedPermissions ?? [])
  const permissionDenied =
    !!access.permissions?.length &&
    access.permissions.some((permission) => matchesPermission(deniedPermissions, permission))
  if (permissionDenied) {
    return false
  }

  const dniMatch = userMatchesAllowedDnis(user, access.allowedDnis)
  const employeeIdMatch =
    !access.employeeIds?.length ||
    (user.employeeId !== null && user.employeeId !== undefined && access.employeeIds.includes(user.employeeId))
  const roleMatch = !access.roles?.length || access.roles.includes(user.role)
  const permissionMatch =
    !access.permissions?.length ||
    access.permissions.some((permission) => matchesPermission(grantedPermissions, permission))
  const pprRoleMatch =
    !access.pprRoles?.length ||
    (user.pprRole !== null && user.pprRole !== undefined && access.pprRoles.includes(user.pprRole))

  return dniMatch && employeeIdMatch && roleMatch && permissionMatch && pprRoleMatch
}

function filterEntry(entry: NavigationEntry, user: AuthUser | null | undefined) {
  if (isNavigationGroup(entry)) {
    if (!hasAccess(user, entry.access)) {
      return null
    }

    const items = entry.items.filter((item) => hasAccess(user, item.access))
    if (!items.length) {
      return null
    }

    return {
      ...entry,
      items,
    }
  }

  return hasAccess(user, entry.access) ? entry : null
}

export const menuService = {
  canAccessPermission(user: AuthUser | null | undefined, permission?: string) {
    return !permission || hasAccess(user, { permissions: [permission] })
  },
  canAccess(user: AuthUser | null | undefined, access?: NavigationAccessRule) {
    return hasAccess(user, access)
  },
  getSections(workspace: WorkspaceKey, user?: AuthUser | null) {
    return getNavigationSections(workspace)
      .map((section) => ({
        ...section,
        entries: section.entries
          .map((entry) => filterEntry(entry, user))
          .filter((entry): entry is NavigationEntry => Boolean(entry)),
      }))
      .filter((section) => section.entries.length > 0)
  },
  getQuickLinks(workspace: WorkspaceKey, user?: AuthUser | null) {
    return getWorkspaceQuickLinks(workspace).filter((entry) => hasAccess(user, entry.access))
  },
  getHomeContent(workspace: WorkspaceKey) {
    return getWorkspaceHomeContent(workspace)
  },
  getFeaturedItems(workspace: WorkspaceKey, user?: AuthUser | null) {
    return getWorkspaceFeaturedItems(workspace).filter((entry) => hasAccess(user, entry.access))
  },
  getSupportItems(workspace: WorkspaceKey, user?: AuthUser | null) {
    return getWorkspaceSupportItems(workspace).filter((entry) => hasAccess(user, entry.access))
  },
  findItem(pathname: string) {
    return findNavigationItem(pathname)
  },
}
