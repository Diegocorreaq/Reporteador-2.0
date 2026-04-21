import { useEffect, useMemo, useRef, useState, type FocusEvent, type MouseEvent as ReactMouseEvent } from 'react'
import { NavLink, useLocation } from 'react-router-dom'
import { ChevronDown, ChevronLeft, ChevronRight } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { isNavigationGroup } from '@/config/navigation-builders'
import { workspaceMeta } from '@/config/module-registry'
import { cn } from '@/lib/utils'
import type { WorkspaceKey } from '@/types/auth'
import type { NavigationEntry, NavigationGroup, NavigationLeaf, NavigationSection } from '@/types/navigation'

interface WorkspaceSidebarProps {
  workspace: WorkspaceKey
  sections: NavigationSection[]
  collapsed: boolean
  mobileOpen: boolean
  onToggleCollapse: () => void
  onCloseMobile: () => void
}

interface FlyoutState {
  entry: NavigationEntry
  left: number
  top: number
}

function groupHasActiveItem(group: NavigationGroup, pathname: string) {
  return group.items.some((item) => item.to === pathname)
}

function getFlyoutTop(top: number) {
  if (typeof window === 'undefined') {
    return top
  }

  return Math.max(12, Math.min(top, window.innerHeight - 180))
}

function SidebarFlyoutLinks({
  items,
  onSelect,
}: {
  items: NavigationLeaf[]
  onSelect: () => void
}) {
  return (
    <div className="space-y-1">
      {items.map((item) => (
        <NavLink
          className={({ isActive }) =>
            cn(
              'flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm transition',
              isActive
                ? 'bg-brand text-white'
                : 'text-brand-strong hover:bg-brand-soft',
            )
          }
          key={item.key}
          onClick={onSelect}
          to={item.to}
        >
          <item.icon className="h-4 w-4 shrink-0" />
          <span className="line-clamp-2">{item.label}</span>
        </NavLink>
      ))}
    </div>
  )
}

function SidebarLeaf({
  item,
  collapsed,
  onCloseMobile,
  onHoverEnd,
  onHoverStart,
}: {
  item: NavigationLeaf
  collapsed: boolean
  onCloseMobile: () => void
  onHoverStart: (entry: NavigationLeaf, target: HTMLElement) => void
  onHoverEnd: () => void
}) {
  const handleHoverStart = (event: ReactMouseEvent<HTMLAnchorElement> | FocusEvent<HTMLAnchorElement>) => {
    if (!collapsed) {
      return
    }

    onHoverStart(item, event.currentTarget)
  }

  return (
    <NavLink
      className={({ isActive }) =>
        cn(
          'group flex items-center gap-3 text-sm font-medium transition',
          collapsed
            ? 'h-11 w-11 justify-center rounded-xl px-0'
            : 'rounded-xl px-3 py-2.5',
          isActive
            ? 'bg-accent text-white shadow-sm'
            : 'text-white/80 hover:bg-white/10 hover:text-white',
        )
      }
      onBlur={collapsed ? onHoverEnd : undefined}
      onClick={onCloseMobile}
      onFocus={handleHoverStart}
      onMouseEnter={handleHoverStart}
      onMouseLeave={collapsed ? onHoverEnd : undefined}
      title={collapsed ? item.label : undefined}
      to={item.to}
    >
      <item.icon className="h-4 w-4 shrink-0" />
      {collapsed ? null : <span className="line-clamp-2">{item.label}</span>}
    </NavLink>
  )
}

export function WorkspaceSidebar({
  workspace,
  sections,
  collapsed,
  mobileOpen,
  onToggleCollapse,
  onCloseMobile,
}: WorkspaceSidebarProps) {
  const location = useLocation()
  const closeTimeoutRef = useRef<number | null>(null)
  const [openGroups, setOpenGroups] = useState<Record<string, boolean>>({})
  const [flyout, setFlyout] = useState<FlyoutState | null>(null)
  const effectiveCollapsed = collapsed && !mobileOpen

  const activeGroupKeys = useMemo(
    () =>
      sections
        .flatMap((section) => section.entries)
        .filter(isNavigationGroup)
        .filter((entry) => groupHasActiveItem(entry, location.pathname))
        .map((entry) => entry.key),
    [location.pathname, sections],
  )

  useEffect(() => {
    const timeoutId = window.setTimeout(() => {
      setFlyout(null)
    }, 0)

    return () => {
      window.clearTimeout(timeoutId)
    }
  }, [effectiveCollapsed, location.pathname])

  useEffect(
    () => () => {
      if (closeTimeoutRef.current !== null) {
        window.clearTimeout(closeTimeoutRef.current)
      }
    },
    [],
  )

  const clearFlyoutClose = () => {
    if (closeTimeoutRef.current !== null) {
      window.clearTimeout(closeTimeoutRef.current)
      closeTimeoutRef.current = null
    }
  }

  const scheduleFlyoutClose = () => {
    clearFlyoutClose()
    closeTimeoutRef.current = window.setTimeout(() => {
      setFlyout(null)
    }, 140)
  }

  const openFlyout = (entry: NavigationEntry, target: HTMLElement) => {
    clearFlyoutClose()

    if (!effectiveCollapsed) {
      return
    }

    const rect = target.getBoundingClientRect()
    setFlyout({
      entry,
      left: rect.right + 12,
      top: getFlyoutTop(rect.top),
    })
  }

  return (
    <>
      {/* Mobile overlay */}
      <div
        className={cn(
          'fixed inset-0 z-30 bg-brand-strong/60 backdrop-blur-sm transition lg:hidden',
          mobileOpen ? 'opacity-100' : 'pointer-events-none opacity-0',
        )}
        onClick={onCloseMobile}
      />

      {/* Sidebar */}
      <aside
        className={cn(
          'fixed inset-y-0 left-0 z-40 flex w-[280px] flex-col bg-brand-strong text-white shadow-xl transition-all duration-300 lg:sticky lg:top-0 lg:h-screen lg:translate-x-0 lg:transition-[width]',
          effectiveCollapsed ? 'lg:w-[80px]' : 'lg:w-[280px]',
          mobileOpen ? 'translate-x-0' : '-translate-x-full',
        )}
      >
        {/* Header */}
        {effectiveCollapsed ? (
          <div className="border-b border-white/10 px-3 py-3">
            <div className="flex items-center justify-center">
              <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-white/15 backdrop-blur-sm">
                <img alt="Reporteador" className="h-7 w-7" src="/logo-mark.svg" />
              </div>
            </div>
          </div>
        ) : (
          <div className="flex items-center justify-between border-b border-white/10 px-4 py-3">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-white/15 backdrop-blur-sm">
                <img alt="Reporteador" className="h-6 w-6" src="/logo-mark.svg" />
              </div>
              <div className="min-w-0">
                <p className="text-[10px] font-semibold uppercase tracking-[0.2em] text-white/60">
                  Reporteador HEVES
                </p>
                <p className="truncate text-sm font-semibold text-accent">{workspaceMeta[workspace].label}</p>
              </div>
            </div>
            <Button
              className="hidden h-8 w-8 rounded-lg border-0 bg-white/10 text-white hover:bg-white/20 hover:text-white lg:inline-flex"
              size="icon"
              title="Colapsar sidebar"
              variant="ghost"
              onClick={onToggleCollapse}
            >
              <ChevronLeft className="h-4 w-4" />
            </Button>
          </div>
        )}

        {/* Expand button when collapsed */}
        {effectiveCollapsed ? (
          <div className="hidden border-b border-white/10 p-2 lg:block">
            <Button
              className="h-8 w-full rounded-lg border-0 bg-white/10 text-white hover:bg-white/20 hover:text-white"
              size="icon"
              title="Expandir sidebar"
              variant="ghost"
              onClick={onToggleCollapse}
            >
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
        ) : null}

        {/* Navigation */}
        <div className={cn('sidebar-scroll flex-1 overflow-y-auto px-3', effectiveCollapsed ? 'py-4' : 'py-2.5')}>
          <div className={cn(effectiveCollapsed ? 'space-y-6' : 'space-y-5')}>
            {sections.map((section) => (
              <div key={section.key}>
                {section.title && !effectiveCollapsed ? (
                  <p className="mb-2 px-3 text-[10px] font-bold uppercase tracking-[0.2em] text-white/50">
                    {section.title}
                  </p>
                ) : null}

                <div className={cn('space-y-1', effectiveCollapsed ? 'flex flex-col items-center' : '')}>
                  {section.entries.map((entry) => {
                    if (!isNavigationGroup(entry)) {
                      return (
                        <SidebarLeaf
                          collapsed={effectiveCollapsed}
                          item={entry}
                          key={entry.key}
                          onCloseMobile={onCloseMobile}
                          onHoverEnd={scheduleFlyoutClose}
                          onHoverStart={openFlyout}
                        />
                      )
                    }

                    if (effectiveCollapsed) {
                      const isActive = groupHasActiveItem(entry, location.pathname)

                      return (
                        <button
                          className={cn(
                            'flex h-11 w-11 items-center justify-center rounded-xl text-white/80 transition',
                            isActive
                              ? 'bg-accent text-white shadow-sm'
                              : 'hover:bg-white/10 hover:text-white',
                          )}
                          key={entry.key}
                          onBlur={scheduleFlyoutClose}
                          onFocus={(event) => openFlyout(entry, event.currentTarget)}
                          onMouseEnter={(event) => openFlyout(entry, event.currentTarget)}
                          onMouseLeave={scheduleFlyoutClose}
                          title={entry.label}
                          type="button"
                        >
                          <entry.icon className="h-4 w-4 shrink-0" />
                        </button>
                      )
                    }

                    const isOpen = openGroups[entry.key] ?? activeGroupKeys.includes(entry.key)
                    const isActive = groupHasActiveItem(entry, location.pathname)

                    return (
                      <div
                        className={cn(
                          'overflow-hidden rounded-xl transition-colors',
                          isOpen ? 'bg-white/5' : '',
                        )}
                        key={entry.key}
                      >
                        <button
                          className={cn(
                            'flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-left text-sm font-medium transition',
                            isActive ? 'text-accent' : 'text-white/80 hover:bg-white/10 hover:text-white',
                          )}
                          onClick={() =>
                            setOpenGroups((current) => ({
                              ...current,
                              [entry.key]: !isOpen,
                            }))
                          }
                          type="button"
                        >
                          <entry.icon className="h-4 w-4 shrink-0" />
                          <span className="min-w-0 flex-1">{entry.label}</span>
                          <ChevronDown
                            className={cn(
                              'h-4 w-4 shrink-0 text-white/50 transition-transform',
                              isOpen ? 'rotate-180' : 'rotate-0',
                            )}
                          />
                        </button>

                        {isOpen ? (
                          <div className="space-y-0.5 px-2 pb-2">
                            {entry.items.map((item) => (
                              <NavLink
                                className={({ isActive }) =>
                                  cn(
                                    'flex items-center gap-3 rounded-lg px-3 py-2 text-sm transition',
                                    isActive
                                      ? 'bg-accent text-white'
                                      : 'text-white/70 hover:bg-white/10 hover:text-white',
                                  )
                                }
                                key={item.key}
                                onClick={onCloseMobile}
                                to={item.to}
                              >
                                <item.icon className="h-3.5 w-3.5 shrink-0" />
                                <span className="line-clamp-2">{item.label}</span>
                              </NavLink>
                            ))}
                          </div>
                        ) : null}
                      </div>
                    )
                  })}
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Footer */}
        <div className={cn('border-t border-white/10 p-3', effectiveCollapsed ? 'hidden lg:block' : '')}>
          <div
            className={cn(
              'rounded-xl bg-white/5 px-3 py-2.5',
              effectiveCollapsed ? 'text-center' : '',
            )}
          >
            {effectiveCollapsed ? (
              <span className="text-[10px] font-bold text-white/40">v2.0</span>
            ) : (
              <p className="text-[10px] font-medium text-white/50">
                Sistema de Reportes v2.0
              </p>
            )}
          </div>
        </div>
      </aside>

      {/* Flyout menu for collapsed state */}
      {effectiveCollapsed && flyout ? (
        <div
          className="fixed z-50 hidden lg:block"
          style={{
            left: flyout.left,
            top: flyout.top,
          }}
          onMouseEnter={clearFlyoutClose}
          onMouseLeave={scheduleFlyoutClose}
        >
          <div className="min-w-[220px] max-w-[280px] overflow-hidden rounded-xl border border-border bg-white p-2 shadow-lg">
            {isNavigationGroup(flyout.entry) ? (
              <div className="space-y-2">
                <div className="border-b border-border px-3 pb-2">
                  <p className="text-xs font-semibold text-brand-strong">{flyout.entry.label}</p>
                  {flyout.entry.description ? (
                    <p className="mt-0.5 text-[10px] text-muted">{flyout.entry.description}</p>
                  ) : null}
                </div>
                <SidebarFlyoutLinks items={flyout.entry.items} onSelect={() => setFlyout(null)} />
              </div>
            ) : (
              <div className="flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium text-brand-strong">
                <flyout.entry.icon className="h-4 w-4 shrink-0" />
                <span>{flyout.entry.label}</span>
              </div>
            )}
          </div>
        </div>
      ) : null}
    </>
  )
}
