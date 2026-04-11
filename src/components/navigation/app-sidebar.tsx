export { WorkspaceSidebar as AppSidebar } from '@/components/navigation/workspace-sidebar'
/*
import { NavLink } from 'react-router-dom'
import { ChevronLeft, LayoutPanelLeft } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'
import { workspaceMeta } from '@/config/module-registry'
import type { NavigationSection } from '@/types/navigation'
import type { WorkspaceKey } from '@/types/auth'

interface AppSidebarProps {
  workspace: WorkspaceKey
  sections: NavigationSection[]
  collapsed: boolean
  mobileOpen: boolean
  onToggleCollapse: () => void
  onCloseMobile: () => void
}

export function AppSidebar({
  workspace,
  sections,
  collapsed,
  mobileOpen,
  onToggleCollapse,
  onCloseMobile,
}: AppSidebarProps) {
  const isMain = workspace === 'main'
  const gradient = isMain
    ? 'from-slate-950 via-slate-900 to-cyan-950'
    : 'from-slate-950 via-slate-900 to-emerald-950'
  const accent = isMain ? 'text-brand' : 'text-emerald-400'

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
          'fixed inset-y-0 left-0 z-40 flex w-[290px] flex-col border-r border-white/10 bg-gradient-to-b text-white shadow-shell transition-all duration-300 lg:sticky lg:top-0 lg:h-screen lg:translate-x-0',
          gradient,
          collapsed ? 'lg:w-[104px]' : 'lg:w-[290px]',
          mobileOpen ? 'translate-x-0' : '-translate-x-full',
        )}
      >
        <div className="shell-grid flex h-full flex-col bg-grid-fade">
          <div className="flex items-center justify-between px-4 py-5">
            <div className={cn('flex items-center gap-3', collapsed && 'lg:justify-center')}>
              <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-white/10">
                <img alt="Reporteador" className="h-8 w-8" src="/logo-mark.svg" />
              </div>
              {!collapsed ? (
                <div>
                  <p className="text-xs uppercase tracking-[0.18em] text-white/60">Reporteador Next</p>
                  <p className={cn('text-sm font-semibold', accent)}>{workspaceMeta[workspace].label}</p>
                </div>
              ) : null}
            </div>
            <Button className="hidden lg:inline-flex" size="icon" variant="ghost" onClick={onToggleCollapse}>
              {collapsed ? <LayoutPanelLeft className="h-4 w-4" /> : <ChevronLeft className="h-4 w-4" />}
            </Button>
          </div>
          <div className="flex-1 overflow-y-auto px-3 pb-6">
            <div className="space-y-6">
              {sections.map((section) => (
                <div key={section.title}>
                  {!collapsed ? (
                    <p className="px-3 text-xs font-semibold uppercase tracking-[0.18em] text-white/45">
                      {section.title}
                    </p>
                  ) : null}
                  <div className="mt-2 space-y-1.5">
                    {section.items.map((item) => (
                      <NavLink
                        className={({ isActive }) =>
                          cn(
                            'group flex items-center gap-3 rounded-2xl px-3 py-3 text-sm transition',
                            isActive
                              ? 'bg-white/14 text-white shadow-[inset_0_0_0_1px_rgba(255,255,255,0.1)]'
                              : 'text-white/72 hover:bg-white/8 hover:text-white',
                            collapsed && 'justify-center px-0',
                          )
                        }
                        key={item.key}
                        onClick={onCloseMobile}
                        to={item.to}
                      >
                        <item.icon className="h-4 w-4 shrink-0" />
                        {!collapsed ? (
                          <div className="min-w-0 flex-1">
                            <div className="flex items-center justify-between gap-2">
                              <span className="truncate font-medium">{item.label}</span>
                              <Badge variant={item.implemented ? 'success' : 'warning'}>
                                {item.implemented ? 'Base' : 'Backlog'}
                              </Badge>
                            </div>
                            <p className="line-clamp-2 text-xs leading-5 text-white/50">{item.description}</p>
                          </div>
                        ) : null}
                      </NavLink>
                    ))}
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
*/
