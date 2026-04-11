import type { NavigationEntry, NavigationGroup, NavigationLeaf, NavigationSection } from '@/types/navigation'

export function item(definition: NavigationLeaf): NavigationLeaf {
  return {
    available: true,
    featured: false,
    ...definition,
  }
}

export function group(definition: NavigationGroup): NavigationGroup {
  return definition
}

export function section(definition: NavigationSection): NavigationSection {
  return definition
}

export function isNavigationGroup(entry: NavigationEntry): entry is NavigationGroup {
  return 'items' in entry
}
