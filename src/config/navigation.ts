import { isNavigationGroup } from '@/config/navigation-builders'
import { mainHomeContent, mainQuickLinks, mainSections } from '@/config/navigation-main'
import { sighHomeContent, sighQuickLinks, sighSections } from '@/config/navigation-sigh'
import type { NavigationSection } from '@/types/navigation'
import type { WorkspaceKey } from '@/types/auth'

const workspaceSections: Record<WorkspaceKey, NavigationSection[]> = {
  main: mainSections,
  sigh: sighSections,
}

function flattenEntries(sections: NavigationSection[]) {
  return sections.flatMap((section) =>
    section.entries.flatMap((entry) => (isNavigationGroup(entry) ? entry.items : [entry])),
  )
}

export function getNavigationSections(workspace: WorkspaceKey) {
  return workspaceSections[workspace]
}

export function getWorkspaceQuickLinks(workspace: WorkspaceKey) {
  return workspace === 'main' ? mainQuickLinks : sighQuickLinks
}

export function getWorkspaceHomeContent(workspace: WorkspaceKey) {
  return workspace === 'main' ? mainHomeContent : sighHomeContent
}

export function getWorkspaceFeaturedItems(workspace: WorkspaceKey) {
  return flattenEntries(getNavigationSections(workspace)).filter((item) => item.available && item.featured)
}

export function getWorkspaceSupportItems(workspace: WorkspaceKey) {
  return flattenEntries(getNavigationSections(workspace)).filter((item) => !item.featured)
}

export function findNavigationItem(pathname: string) {
  const allItems = flattenEntries(getNavigationSections('main')).concat(flattenEntries(getNavigationSections('sigh')))
  return allItems.find((item) => item.to === pathname)
}
