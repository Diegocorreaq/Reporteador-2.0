import type { LucideIcon } from 'lucide-react'
import type { PprRole, WorkspaceKey } from '@/types/auth'

export type ModulePriority = 'alta' | 'media' | 'posterior'

export type ScreenPattern =
  | 'filters-table'
  | 'filters-chart-table'
  | 'exporter'
  | 'modal-detail'

export interface NavigationAccessRule {
  allowedDnis?: readonly string[]
  permissions?: string[]
  roles?: string[]
  pprRoles?: PprRole[]
}

export interface ModuleDefinition {
  key: string
  legacyModule: string
  legacyRoute: string
  workspace: WorkspaceKey
  path: string
  label: string
  title: string
  summary: string
  section: string
  priority: ModulePriority
  patterns: ScreenPattern[]
  implemented: boolean
  goals: string[]
  icon: LucideIcon
}

export interface NavigationLeaf {
  key: string
  legacyKey?: string
  legacyRoute: string
  label: string
  to: string
  description: string
  icon: LucideIcon
  available?: boolean
  featured?: boolean
  access?: NavigationAccessRule
}

export interface NavigationGroup {
  key: string
  legacyKey?: string
  label: string
  description: string
  icon: LucideIcon
  items: NavigationLeaf[]
  access?: NavigationAccessRule
}

export type NavigationEntry = NavigationLeaf | NavigationGroup

export interface NavigationSection {
  key: string
  title: string
  entries: NavigationEntry[]
}

export interface WorkspaceQuickLink {
  key: string
  label: string
  description: string
  icon?: LucideIcon
  actionType?: 'datos-en-linea-launcher'
  href?: string
  to?: string
  external?: boolean
  access?: NavigationAccessRule
}

export interface WorkspaceHomeContent {
  title: string
  description: string
  featuredTitle: string
  featuredDescription: string
  supportTitle: string
  supportDescription: string
}
