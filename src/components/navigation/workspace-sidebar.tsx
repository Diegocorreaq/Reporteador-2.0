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
    <div className="space-y-1.5">
      {items.map((item) => (
        <NavLink
          className={({ isActive }) =>
            cn(
              'flex items-center gap-3 rounded-2xl px-3 py-3 text-sm transition',
              isActive
                ? 'bg-slate-950 text-white shadow-[inset_0_0_0_1px_rgba(255,255,255,0.08)]'
                : 'text-slate-700 hover:bg-slate-100 hover:text-slate-950',
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
          'group flex items-center gap-3 text-sm transition',
          collapsed
            ? 'h-12 w-12 justify-center rounded-2xl px-0'
            : 'rounded-[18px] px-3 py-2.5',
          isActive
            ? 'bg-white/14 text-white shadow-[inset_0_0_0_1px_rgba(255,255,255,0.08)]'
            : 'text-white/76 hover:bg-white/8 hover:text-white',
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
  const isMain = workspace === 'main'
  const gradient = isMain ? 'from-slate-950 via-slate-900 to-cyan-950' : 'from-slate-950 via-slate-900 to-emerald-950'
  const accent = isMain ? 'text-brand' : 'text-emerald-300'

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
    setFlyout(null)
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
      left: rect.right + 14,
      top: getFlyoutTop(rect.top),
    })
  }

  return (
    <>
      <div
        className={cn(
          'fixed inset-0 z-30 bg-slate-950/45 transition lg:hidden',
          mobileOpen ? 'opacity-100' : 'pointer-events-none opacity-0',
        )}
        onClick={onCloseMobile}
      />

      <aside
        className={cn(
          'fixed inset-y-0 left-0 z-40 flex w-[304px] flex-col border-r border-white/10 bg-gradient-to-b text-white shadow-shell transition-all duration-300 lg:sticky lg:top-0 lg:h-screen lg:translate-x-0 lg:transition-[width]',
          gradient,
          effectiveCollapsed ? 'lg:w-[92px]' : 'lg:w-[304px]',
          mobileOpen ? 'translate-x-0' : '-translate-x-full',
        )}
      >
        <div className="shell-grid flex h-full flex-col bg-grid-fade">
          <div
            className={cn(
              'border-b border-white/10 px-4 py-4',
              effectiveCollapsed ? 'lg:px-3' : '',
            )}
          >
            <div className={cn('flex items-center gap-3', effectiveCollapsed ? 'lg:justify-center' : 'justify-between')}>
              <div className={cn('flex items-center gap-3', effectiveCollapsed ? 'lg:flex-col lg:gap-2' : '')}>
                <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-white/10">
                  <img alt="Reporteador" className="h-8 w-8" src="/logo-mark.svg" />
                </div>
                {effectiveCollapsed ? null : (
                  <div>
                    <p className="text-[11px] uppercase tracking-[0.2em] text-white/55">Reporteador HEVES</p>
                    <p className={cn('text-sm font-semibold', accent)}>{workspaceMeta[workspace].label}</p>
                  </div>
                )}
              </div>

              <Button
                className={cn(
                  'hidden h-9 w-9 rounded-2xl text-white hover:bg-white/10 hover:text-white lg:inline-flex',
                  effectiveCollapsed ? 'lg:ml-0' : '',
                )}
                size="icon"
                title={effectiveCollapsed ? 'Expandir sidebar' : 'Colapsar sidebar'}
                variant="ghost"
                onClick={onToggleCollapse}
              >
                {effectiveCollapsed ? <ChevronRight className="h-4 w-4" /> : <ChevronLeft className="h-4 w-4" />}
              </Button>
            </div>
          </div>

          <div className="flex-1 overflow-y-auto px-3 py-5">
            <div className="space-y-6">
              {sections.map((section) => (
                <div key={section.key}>
                  {section.title && !effectiveCollapsed ? (
                    <p className="px-3 text-xs font-semibold uppercase tracking-[0.18em] text-white/45">{section.title}</p>
                  ) : null}

                  <div className={cn('space-y-1.5', section.title && !effectiveCollapsed ? 'mt-2' : '')}>
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
                              'flex h-12 w-12 items-center justify-center rounded-2xl text-white/76 transition',
                              isActive ? 'bg-white/14 text-white shadow-[inset_0_0_0_1px_rgba(255,255,255,0.08)]' : 'hover:bg-white/8 hover:text-white',
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

                      return (
                        <div className="rounded-[22px] border border-white/8 bg-white/[0.04]" key={entry.key}>
                          <button
                            className={cn(
                              'flex w-full items-center gap-3 rounded-[22px] px-3 py-3 text-left transition hover:bg-white/[0.04]',
                              groupHasActiveItem(entry, location.pathname) ? 'text-white' : 'text-white/76',
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
                            <span className="min-w-0 flex-1 text-sm font-medium">{entry.label}</span>
                            <ChevronDown className={cn('h-4 w-4 shrink-0 transition', isOpen ? 'rotate-180' : 'rotate-0')} />
                          </button>

                          {isOpen ? (
                            <div className="space-y-1 border-t border-white/8 px-2 py-2">
                              {entry.items.map((item) => (
                                <SidebarLeaf
                                  collapsed={false}
                                  item={item}
                                  key={item.key}
                                  onCloseMobile={onCloseMobile}
                                  onHoverEnd={scheduleFlyoutClose}
                                  onHoverStart={openFlyout}
                                />
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
        </div>
      </aside>

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
          <div className="min-w-[240px] max-w-[320px] overflow-hidden rounded-[24px] border border-white/80 bg-white/96 p-2 shadow-[0_18px_48px_rgba(15,23,42,0.28)] backdrop-blur">
            {isNavigationGroup(flyout.entry) ? (
              <div className="space-y-2">
                <div className="px-3 py-2">
                  <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-500">Navegacion</p>
                  <p className="mt-1 text-sm font-semibold text-slate-950">{flyout.entry.label}</p>
                </div>
                <SidebarFlyoutLinks items={flyout.entry.items} onSelect={() => setFlyout(null)} />
              </div>
            ) : (
              <div className="flex items-center gap-3 rounded-[18px] px-3 py-3 text-sm font-medium text-slate-950">
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
