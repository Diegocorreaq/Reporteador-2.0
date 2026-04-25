import {
  findNavigationItem,
  getNavigationSections,
  getWorkspaceFeaturedItems,
  getWorkspaceHomeContent,
  getWorkspaceQuickLinks,
  getWorkspaceSupportItems,
} from '@/config/navigation'
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
    return true
  }

  const grantedPermissions = new Set(user.permissions)
  const roleMatch = !access.roles?.length || access.roles.includes(user.role)
  const permissionMatch =
    !access.permissions?.length ||
    access.permissions.some((permission) => matchesPermission(grantedPermissions, permission))
  const pprRoleMatch =
    !access.pprRoles?.length ||
    (user.pprRole !== null && user.pprRole !== undefined && access.pprRoles.includes(user.pprRole))

  return roleMatch && permissionMatch && pprRoleMatch
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
