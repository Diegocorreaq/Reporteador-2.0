import { NavLink, useNavigate } from 'react-router-dom'
import {
  BarChart2,
  Calendar,
  ChevronRight,
  ClipboardList,
  ExternalLink,
  Home,
  Layers,
  LogOut,
  Users,
  X,
} from 'lucide-react'
import { useAuthStore } from '@/modules/auth/store/use-auth-store'
import { usePprContext } from '@/modules/ppr/context/ppr-context'
import { cn } from '@/lib/utils'

interface NavItem {
  key: string
  label: string
  icon: React.ElementType
  to: string
  end?: boolean
}

const NAV_ITEMS: NavItem[] = [
  { key: 'inicio', label: 'Inicio', icon: Home, to: '/ppr', end: true },
  { key: 'actividades', label: 'Mis Actividades', icon: ClipboardList, to: '/ppr/actividades' },
  { key: 'programas', label: 'Programas', icon: Layers, to: '/ppr/programas' },
  { key: 'periodos', label: 'Períodos', icon: Calendar, to: '/ppr/periodos' },
  { key: 'reportes', label: 'Reportes', icon: BarChart2, to: '/ppr/reportes' },
]

interface PprSidebarProps {
  mobileOpen: boolean
  onCloseMobile: () => void
}

export function PprSidebar({ mobileOpen, onCloseMobile }: PprSidebarProps) {
  const navigate = useNavigate()
  const signOut = useAuthStore((state) => state.signOut)
  const { pprUser } = usePprContext()

  function handleLogout() {
    import('@/services/auth/auth.service').then(({ authService }) => {
      authService.signOut().catch(() => {})
    })
    signOut()
    navigate('/login')
  }

  const sidebarContent = (
    <div className="flex h-full flex-col bg-[#0c2340]">
      {/* Brand */}
      <div className="flex items-center justify-between px-5 py-5">
        <div className="space-y-0.5">
          <div className="flex items-center gap-2">
            <span className="rounded-md bg-green-500 px-1.5 py-0.5 text-[10px] font-bold uppercase tracking-wider text-white">
              PPR
            </span>
            <span className="text-sm font-bold text-white">Portal PPR</span>
          </div>
          <p className="text-[10px] text-slate-400">Programación Presupuestal</p>
        </div>
        {/* Mobile close */}
        <button
          className="rounded-lg p-1 text-slate-400 hover:bg-white/10 hover:text-white lg:hidden"
          onClick={onCloseMobile}
        >
          <X className="h-4 w-4" />
        </button>
      </div>

      {/* User info */}
      <div className="mx-3 mb-4 rounded-xl bg-white/5 px-3 py-2.5">
        <p className="truncate text-xs font-semibold text-white">{pprUser.employeeName}</p>
        <p className="text-[10px] text-slate-400">Coordinador PPR</p>
      </div>

      {/* Navigation */}
      <nav className="flex-1 space-y-0.5 px-2 pb-4">
        <p className="mb-1.5 px-3 text-[10px] font-semibold uppercase tracking-widest text-slate-500">
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
                'flex items-center gap-3 rounded-xl px-3 py-2.5 text-xs font-medium transition-colors',
                isActive
                  ? 'bg-green-500/15 text-green-400'
                  : 'text-slate-300 hover:bg-white/8 hover:text-white',
              )
            }
          >
            {({ isActive }) => (
              <>
                <item.icon className={cn('h-4 w-4 shrink-0', isActive ? 'text-green-400' : 'text-slate-400')} />
                <span className="flex-1">{item.label}</span>
                {isActive && <ChevronRight className="h-3 w-3 text-green-500" />}
              </>
            )}
          </NavLink>
        ))}

        {/* Admin section — visible only for admin role */}
        {pprUser.role === 'admin' && (
          <>
            <p className="mb-1.5 mt-5 px-3 text-[10px] font-semibold uppercase tracking-widest text-slate-600">
              Administración
            </p>
            <NavLink
              to="/ppr/admin/coordinadores"
              onClick={onCloseMobile}
              className={({ isActive }) =>
                cn(
                  'flex items-center gap-3 rounded-xl px-3 py-2.5 text-xs font-medium transition-colors',
                  isActive
                    ? 'bg-amber-500/15 text-amber-400'
                    : 'text-slate-300 hover:bg-white/8 hover:text-white',
                )
              }
            >
              {({ isActive }) => (
                <>
                  <Users className={cn('h-4 w-4 shrink-0', isActive ? 'text-amber-400' : 'text-slate-400')} />
                  <span className="flex-1">Coordinadores</span>
                  {isActive && <ChevronRight className="h-3 w-3 text-amber-500" />}
                </>
              )}
            </NavLink>
          </>
        )}

      </nav>

      {/* Bottom actions */}
      <div className="border-t border-white/10 px-2 py-3 space-y-0.5">
        <a
          href="/app"
          target="_self"
          className="flex items-center gap-3 rounded-xl px-3 py-2.5 text-xs font-medium text-slate-400 transition hover:bg-white/8 hover:text-white"
        >
          <ExternalLink className="h-4 w-4 shrink-0" />
          <span>Volver al Reporteador</span>
        </a>
        <button
          onClick={handleLogout}
          className="flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-xs font-medium text-slate-400 transition hover:bg-red-500/10 hover:text-red-400"
        >
          <LogOut className="h-4 w-4 shrink-0" />
          <span>Cerrar sesión</span>
        </button>
      </div>
    </div>
  )

  return (
    <>
      {/* Desktop sidebar */}
      <aside className="hidden w-56 shrink-0 overflow-y-auto lg:block">{sidebarContent}</aside>

      {/* Mobile overlay */}
      {mobileOpen && (
        <>
          <div
            className="fixed inset-0 z-40 bg-black/50 lg:hidden"
            onClick={onCloseMobile}
          />
          <aside className="fixed inset-y-0 left-0 z-50 w-56 overflow-y-auto lg:hidden">
            {sidebarContent}
          </aside>
        </>
      )}
    </>
  )
}
