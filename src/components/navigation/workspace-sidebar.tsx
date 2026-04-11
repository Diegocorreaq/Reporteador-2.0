import { useMemo, useState } from 'react'
import { NavLink, useLocation } from 'react-router-dom'
import { ChevronDown } from 'lucide-react'
import { cn } from '@/lib/utils'
import { workspaceMeta } from '@/config/module-registry'
import { isNavigationGroup } from '@/config/navigation-builders'
import type { NavigationEntry, NavigationGroup, NavigationLeaf, NavigationSection } from '@/types/navigation'
import type { WorkspaceKey } from '@/types/auth'

interface WorkspaceSidebarProps {
  workspace: WorkspaceKey
  sections: NavigationSection[]
  mobileOpen: boolean
  onCloseMobile: () => void
}

function groupHasActiveItem(group: NavigationGroup, pathname: string) {
  return group.items.some((item) => item.to === pathname)
}

function SidebarLeaf({ item, onCloseMobile }: { item: NavigationLeaf; onCloseMobile: () => void }) {
  return (
    <NavLink
      className={({ isActive }) =>
        cn(
          'group flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm transition',
          isActive ? 'bg-white/14 text-white shadow-[inset_0_0_0_1px_rgba(255,255,255,0.08)]' : 'text-white/76 hover:bg-white/8 hover:text-white',
        )
      }
      onClick={onCloseMobile}
      to={item.to}
    >
      <item.icon className="h-4 w-4 shrink-0" />
      <span className="line-clamp-2">{item.label}</span>
    </NavLink>
  )
}

export function WorkspaceSidebar({ workspace, sections, mobileOpen, onCloseMobile }: WorkspaceSidebarProps) {
  const location = useLocation()
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

  const [openGroups, setOpenGroups] = useState<Record<string, boolean>>({})

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
          'fixed inset-y-0 left-0 z-40 flex w-[310px] flex-col border-r border-white/10 bg-gradient-to-b text-white shadow-shell transition-all duration-300 lg:sticky lg:top-0 lg:h-screen lg:translate-x-0',
          gradient,
          mobileOpen ? 'translate-x-0' : '-translate-x-full',
        )}
      >
        <div className="shell-grid flex h-full flex-col bg-grid-fade">
          <div className="border-b border-white/10 px-4 py-5">
            <div className="flex items-center gap-3">
              <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-white/10">
                <img alt="Reporteador" className="h-8 w-8" src="/logo-mark.svg" />
              </div>
              <div>
                <p className="text-xs uppercase tracking-[0.18em] text-white/60">Reporteador HEVES</p>
                <p className={cn('text-sm font-semibold', accent)}>{workspaceMeta[workspace].label}</p>
              </div>
            </div>
          </div>

          <div className="flex-1 overflow-y-auto px-3 py-5">
            <div className="space-y-6">
              {sections.map((section) => (
                <div key={section.key}>
                  {section.title ? (
                    <p className="px-3 text-xs font-semibold uppercase tracking-[0.18em] text-white/45">{section.title}</p>
                  ) : null}
                  <div className={cn('space-y-1.5', section.title ? 'mt-2' : '')}>
                    {section.entries.map((entry: NavigationEntry) =>
                      isNavigationGroup(entry) ? (
                        <div className="rounded-2xl border border-white/8 bg-white/[0.04]" key={entry.key}>
                          {(() => {
                            const isOpen = openGroups[entry.key] ?? activeGroupKeys.includes(entry.key)

                            return (
                              <>
                                <button
                                  className={cn(
                                    'flex w-full items-center gap-3 rounded-2xl px-3 py-3 text-left transition hover:bg-white/[0.04]',
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
                                  <ChevronDown
                                    className={cn('h-4 w-4 shrink-0 transition', isOpen ? 'rotate-180' : 'rotate-0')}
                                  />
                                </button>
                                {isOpen ? (
                                  <div className="space-y-1 border-t border-white/8 px-2 py-2">
                                    {entry.items.map((item) => (
                                      <SidebarLeaf item={item} key={item.key} onCloseMobile={onCloseMobile} />
                                    ))}
                                  </div>
                                ) : null}
                              </>
                            )
                          })()}
                        </div>
                      ) : (
                        <SidebarLeaf item={entry} key={entry.key} onCloseMobile={onCloseMobile} />
                      ),
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </aside>
    </>
  )
}
