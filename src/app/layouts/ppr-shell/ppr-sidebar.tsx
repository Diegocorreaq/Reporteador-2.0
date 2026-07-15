import { NavLink, useNavigate } from 'react-router-dom'
import {
  BarChart2,
  Calendar,
  ClipboardList,
  ExternalLink,
  Home,
  Layers,
  LogOut,
  Settings2,
  ShieldCheck,
  UploadCloud,
  Users,
  X,
} from 'lucide-react'
import { useAuthStore } from '@/modules/auth/store/use-auth-store'
import { clearCentroOrientacionOnboardingSession } from '@/modules/onboarding/hooks/use-centro-orientacion-onboarding'
import { usePprContext } from '@/modules/ppr/context/ppr-context'
import { PprAvatar } from '@/modules/ppr/components/ui-primitives'
import { cn } from '@/lib/utils'

interface NavItem {
  key: string
  label: string
  icon: React.ElementType
  to: string
  end?: boolean
}

const NAV_ITEMS: NavItem[] = [
  { key: 'inicio',      label: 'Inicio',          icon: Home,          to: '/ppr', end: true },
  { key: 'actividades', label: 'Mis Actividades', icon: ClipboardList, to: '/ppr/actividades' },
  { key: 'programas',   label: 'Programas',       icon: Layers,        to: '/ppr/programas' },
  { key: 'periodos',    label: 'Períodos',        icon: Calendar,      to: '/ppr/periodos' },
  { key: 'reportes',    label: 'Reportes',        icon: BarChart2,     to: '/ppr/reportes' },
]

const ADMIN_ITEMS: NavItem[] = [
  { key: 'admin-coords', label: 'Coordinadores', icon: Users,     to: '/ppr/admin/coordinadores' },
  { key: 'admin-acts',   label: 'Actividades',   icon: Settings2, to: '/ppr/admin/actividades' },
  { key: 'admin-carga',  label: 'Carga mensual', icon: UploadCloud, to: '/ppr/admin/carga' },
]

interface PprSidebarProps {
  mobileOpen: boolean
  onCloseMobile: () => void
}

export function PprSidebar({ mobileOpen, onCloseMobile }: PprSidebarProps) {
  const navigate = useNavigate()
  const signOut = useAuthStore((state) => state.signOut)
  const { pprUser } = usePprContext()
  const isAdmin = pprUser.role === 'admin'

  function handleLogout() {
    import('@/services/auth/auth.service').then(({ authService }) => {
      authService.signOut().catch(() => {})
    })
    clearCentroOrientacionOnboardingSession()
    signOut()
    navigate('/login')
  }

  const sidebarContent = (
    <div className="sidebar-scroll flex h-full flex-col overflow-y-auto border-r border-slate-800 bg-slate-950">
      {/* ── Brand ── */}
      <div className="flex items-center justify-between px-5 py-5">
        <div className="flex items-center gap-2.5">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-teal-700">
            <span className="text-[10px] font-black uppercase tracking-tighter text-white">PPR</span>
          </div>
          <div className="space-y-0">
            <p className="text-sm font-bold leading-tight text-white">Portal PPR</p>
            <p className="text-[10px] leading-tight text-slate-400">Programación Presupuestal</p>
          </div>
        </div>
        {/* Mobile close */}
        <button
          className="rounded-lg p-1 text-slate-400 transition hover:bg-white/10 hover:text-white lg:hidden"
          onClick={onCloseMobile}
          aria-label="Cerrar menú"
        >
          <X className="h-4 w-4" />
        </button>
      </div>

      {/* ── User card ── */}
      <div className="mx-3 mb-5 rounded-lg border border-white/10 bg-white/[0.05] p-3">
        <div className="flex items-center gap-2.5">
          <PprAvatar
            name={pprUser.employeeName}
            size="md"
            tone={isAdmin ? 'amber' : 'indigo'}
          />
          <div className="min-w-0 flex-1">
            <p className="truncate text-xs font-semibold text-white">
              {pprUser.employeeName}
            </p>
            <div className="mt-0.5 flex items-center gap-1">
              {isAdmin && <ShieldCheck className="h-2.5 w-2.5 text-amber-400" />}
              <p className={cn(
                'text-[10px] font-medium',
                isAdmin ? 'text-amber-300' : 'text-teal-300',
              )}>
                {isAdmin ? 'Administrador' : 'Coordinador'}
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* ── Navigation ── */}
      <nav className="flex-1 space-y-1 px-2 pb-4">
        <p className="mb-2 px-3 text-[9px] font-bold uppercase tracking-[0.18em] text-slate-500">
          Menú
        </p>

        {NAV_ITEMS.map((item) => (
          <NavLink
            key={item.key}
            to={item.to}
            end={item.end}
            onClick={onCloseMobile}
            className={({ isActive }) =>
              cn(
                'group relative flex items-center gap-3 rounded-lg px-3 py-2.5 text-xs font-medium transition',
                isActive
                  ? 'bg-white text-slate-950 shadow-sm'
                  : 'text-slate-300 hover:bg-white/[0.06] hover:text-white',
              )
            }
          >
            {({ isActive }) => (
              <>
                {/* Active indicator bar */}
                {isActive && (
                  <span className="absolute left-0 top-1/2 h-5 w-0.5 -translate-y-1/2 rounded-r-full bg-teal-500" />
                )}
                <item.icon
                  className={cn(
                    'h-4 w-4 shrink-0 transition',
                    isActive ? 'text-teal-700' : 'text-slate-400',
                  )}
                />
                <span className="flex-1">{item.label}</span>
              </>
            )}
          </NavLink>
        ))}

        {/* ── Admin section ── */}
        {isAdmin && (
          <>
            <div className="mt-6 mb-2 flex items-center gap-2 px-3">
              <ShieldCheck className="h-3 w-3 text-amber-400" />
              <p className="text-[9px] font-bold uppercase tracking-[0.18em] text-amber-300/80">
                Administración
              </p>
              <div className="h-px flex-1 bg-amber-500/20" />
            </div>
            {ADMIN_ITEMS.map((item) => (
              <NavLink
                key={item.key}
                to={item.to}
                onClick={onCloseMobile}
                className={({ isActive }) =>
                  cn(
                    'group relative flex items-center gap-3 rounded-lg px-3 py-2.5 text-xs font-medium transition',
                    isActive
                      ? 'bg-amber-400/15 text-amber-200 ring-1 ring-inset ring-amber-300/20'
                      : 'text-slate-300 hover:bg-white/[0.06] hover:text-white',
                  )
                }
              >
                {({ isActive }) => (
                  <>
                    {isActive && (
                      <span className="absolute left-0 top-1/2 h-5 w-0.5 -translate-y-1/2 rounded-r-full bg-amber-400" />
                    )}
                    <item.icon
                      className={cn(
                        'h-4 w-4 shrink-0 transition',
                        isActive ? 'text-amber-400' : 'text-slate-400',
                      )}
                    />
                    <span className="flex-1">{item.label}</span>
                  </>
                )}
              </NavLink>
            ))}
          </>
        )}
      </nav>

      {/* ── Footer actions ── */}
      <div className="space-y-0.5 border-t border-white/5 p-2">
        <a
          href="/app"
          target="_self"
          className="group flex items-center gap-3 rounded-lg px-3 py-2.5 text-xs font-medium text-slate-400 transition hover:bg-white/[0.06] hover:text-white"
        >
          <ExternalLink className="h-4 w-4 shrink-0" />
          <span>Volver al Reporteador</span>
        </a>
        <button
          onClick={handleLogout}
          className="group flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-xs font-medium text-slate-400 transition hover:bg-rose-500/10 hover:text-rose-300"
        >
          <LogOut className="h-4 w-4 shrink-0" />
          <span>Cerrar sesión</span>
        </button>
        {/* Brand line */}
        <div className="px-3 pt-2 pb-1">
          <p className="text-[9px] text-slate-600">
            Reporteador 2.0 · Portal PPR
          </p>
        </div>
      </div>
    </div>
  )

  return (
    <>
      {/* Desktop sidebar */}
      <aside className="hidden w-64 shrink-0 lg:block">{sidebarContent}</aside>

      {/* Mobile overlay */}
      {mobileOpen && (
        <>
          <div
            className="fixed inset-0 z-40 bg-black/50 backdrop-blur-sm lg:hidden"
            onClick={onCloseMobile}
          />
          <aside className="fixed inset-y-0 left-0 z-50 w-72 animate-ppr-slide lg:hidden">
            {sidebarContent}
          </aside>
        </>
      )}
    </>
  )
}
