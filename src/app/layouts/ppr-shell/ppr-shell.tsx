import { useState } from 'react'
import { Link, Outlet, useNavigate } from 'react-router-dom'
import {
  BookOpen,
  ChevronLeft,
  Download,
  Eye,
  EyeOff,
  FileSpreadsheet,
  Loader2,
  Lock,
  LogOut,
  Menu,
  ShieldCheck,
  User,
} from 'lucide-react'
import { useAuthStore } from '@/modules/auth/store/use-auth-store'
import { clearCentroOrientacionOnboardingSession } from '@/modules/onboarding/hooks/use-centro-orientacion-onboarding'
import { validatePprUser } from '@/modules/ppr/services/ppr.service'
import { PprContext, type PprUser } from '@/modules/ppr/context/ppr-context'
import { cn } from '@/lib/utils'
import { PprSidebar } from './ppr-sidebar'

// ---------------------------------------------------------------------------
// Validation overlay — Polished login experience
// ---------------------------------------------------------------------------

interface ValidationOverlayProps {
  onAuthorized: (user: PprUser) => void
}

function ValidationOverlay({ onAuthorized }: ValidationOverlayProps) {
  const sessionUser = useAuthStore((state) => state.user)
  const [username, setUsername] = useState(sessionUser?.username ?? '')
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!username.trim() || !password.trim()) return
    setError(null)
    setLoading(true)
    try {
      const result = await validatePprUser(username.trim(), password.trim())
      if (!result.ok || !result.employeeId) {
        setError(result.message || 'No tiene autorización para el Portal PPR.')
        return
      }
      onAuthorized({
        employeeId: result.employeeId,
        employeeName: result.employeeName,
        role: result.role ?? 'coordinador',
      })
    } catch {
      setError('No se pudo verificar el acceso. Intente nuevamente.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="absolute inset-0 z-30 flex items-center justify-center overflow-hidden bg-slate-100 p-4">
      <div className="relative w-full max-w-sm animate-ppr-scale rounded-lg border border-slate-200 bg-white p-6 shadow-[0_24px_70px_rgba(15,23,42,0.16)]">
        {/* Top branding */}
        <div className="mb-7 flex flex-col items-center gap-4 text-center">
          <div className="relative">
            <div className="relative flex h-12 w-12 items-center justify-center rounded-lg bg-slate-900">
              <ShieldCheck className="h-6 w-6 text-white" />
            </div>
          </div>
          <div className="space-y-1">
            <div className="flex items-center justify-center gap-2">
              <span className="rounded bg-teal-700 px-1.5 py-0.5 text-[9px] font-black uppercase tracking-wider text-white">
                PPR
              </span>
              <h2 className="text-base font-bold text-slate-950">Portal PPR</h2>
            </div>
            <p className="text-xs text-slate-400">
              Verificación de acceso requerida
            </p>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Username */}
          <div className="space-y-1.5">
            <label className="block text-[11px] font-semibold text-slate-600">
              Usuario (DNI)
            </label>
            <div className="relative">
              <User className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
              <input
                type="text"
                autoComplete="username"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                className="w-full rounded-lg border border-slate-300 bg-white py-2.5 pl-9 pr-3 text-sm text-slate-900 placeholder:text-slate-400 transition focus:border-teal-600 focus:outline-none focus:ring-2 focus:ring-teal-600/15"
                placeholder="Ingrese su DNI"
                required
              />
            </div>
          </div>

          {/* Password */}
          <div className="space-y-1.5">
            <label className="block text-[11px] font-semibold text-slate-600">
              Contraseña
            </label>
            <div className="relative">
              <Lock className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
              <input
                type={showPassword ? 'text' : 'password'}
                autoComplete="current-password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full rounded-lg border border-slate-300 bg-white py-2.5 pl-9 pr-10 text-sm text-slate-900 placeholder:text-slate-400 transition focus:border-teal-600 focus:outline-none focus:ring-2 focus:ring-teal-600/15"
                placeholder="Contraseña"
                required
              />
              <button
                type="button"
                tabIndex={-1}
                onClick={() => setShowPassword((v) => !v)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 transition hover:text-slate-700"
              >
                {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              </button>
            </div>
          </div>

          {/* Error */}
          {error && (
            <div className="animate-ppr-fade rounded-lg border border-rose-200 bg-rose-50 px-3 py-2.5 text-xs text-rose-700">
              {error}
            </div>
          )}

          {/* Submit */}
          <button
            type="submit"
            disabled={loading || !username.trim() || !password.trim()}
            className="flex w-full items-center justify-center gap-2 rounded-lg bg-teal-700 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-teal-800 disabled:cursor-not-allowed disabled:opacity-50 disabled:shadow-none"
          >
            {loading ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <ShieldCheck className="h-4 w-4" />
            )}
            <span>
              {loading ? 'Verificando…' : 'Verificar acceso'}
            </span>
          </button>
        </form>

        {/* Footer */}
        <p className="mt-5 text-center text-[10px] text-slate-500">
          Ingrese sus credenciales del Reporteador para validar permisos PPR
        </p>
      </div>
    </div>
  )
}

// ---------------------------------------------------------------------------
// PPR Shell
// ---------------------------------------------------------------------------

export function PprShell() {
  const navigate = useNavigate()
  const signOut = useAuthStore((state) => state.signOut)
  const [pprUser, setPprUser] = useState<PprUser | null>(null)
  const [mobileOpen, setMobileOpen] = useState(false)
  const isAdmin = pprUser?.role === 'admin'

  function handleLogout() {
    import('@/services/auth/auth.service').then(({ authService }) => {
      authService.signOut().catch(() => {})
    })
    clearCentroOrientacionOnboardingSession()
    signOut()
    setPprUser(null)
    navigate('/login')
  }

  return (
    <div className="ppr-portal relative flex h-screen overflow-hidden bg-slate-100 text-slate-900">
      {/* Sidebar */}
      {pprUser && isAdmin ? (
        <PprContext.Provider value={{ pprUser }}>
          <PprSidebar mobileOpen={mobileOpen} onCloseMobile={() => setMobileOpen(false)} />
        </PprContext.Provider>
      ) : !pprUser ? (
        /* Skeleton sidebar shown while validating */
        <aside className="hidden w-64 shrink-0 bg-slate-950 lg:block">
          <div className="px-5 py-5">
            <div className="flex items-center gap-2.5">
              <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-teal-700">
                <span className="text-[10px] font-black uppercase tracking-tighter text-white">PPR</span>
              </div>
              <div>
                <p className="text-sm font-bold text-white">Portal PPR</p>
                <p className="text-[10px] text-slate-400">Programación Presupuestal</p>
              </div>
            </div>
          </div>
        </aside>
      ) : null}

      {/* Content area */}
      <div className="flex flex-1 flex-col overflow-hidden">
        {/* Mobile topbar */}
        <header className={cn(
          'flex h-14 items-center gap-3 border-b border-slate-200 bg-white px-4 lg:hidden',
          pprUser && !isAdmin && 'hidden',
        )}>
          <button
            className={cn(
              'rounded-lg p-2 text-slate-500 transition hover:bg-slate-100 hover:text-slate-900',
              !isAdmin && 'hidden',
            )}
            onClick={() => setMobileOpen(true)}
            aria-label="Abrir menú"
          >
            <Menu className="h-4 w-4" />
          </button>
          <div className="flex items-center gap-2">
            <div className="flex h-7 w-7 items-center justify-center rounded bg-teal-700">
              <span className="text-[9px] font-black uppercase tracking-tighter text-white">PPR</span>
            </div>
            <span className="text-sm font-bold text-slate-900">Portal PPR</span>
          </div>
        </header>

        {pprUser && !isAdmin && (
          <header className="border-b border-slate-200 bg-white px-4 py-3">
            <div className="mx-auto flex max-w-[1500px] flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
              <div className="flex min-w-0 items-center gap-3">
                <Link
                  to="/app"
                  className="inline-flex shrink-0 items-center gap-2 rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs font-semibold text-slate-700 transition hover:border-teal-300 hover:bg-teal-50 hover:text-teal-700"
                >
                  <ChevronLeft className="h-3.5 w-3.5" />
                  Reporteador
                </Link>
                <div className="min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="rounded bg-teal-700 px-1.5 py-0.5 text-[9px] font-black uppercase tracking-wider text-white">
                      PPR
                    </span>
                    <p className="truncate text-sm font-bold text-slate-950">Portal PPR</p>
                  </div>
                  <p className="truncate text-[10px] text-slate-400">
                    Recursos y seguimiento por estrategia
                  </p>
                </div>
              </div>

              <div className="flex gap-2 overflow-x-auto pb-0.5 lg:justify-end lg:overflow-visible">
                <button
                  type="button"
                  disabled
                  title="Pendiente de cargar: guia HIS MINSA de la estrategia."
                  className="inline-flex shrink-0 cursor-not-allowed items-center gap-1.5 rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-[11px] font-semibold text-slate-400"
                >
                  <BookOpen className="h-3.5 w-3.5" />
                  Guía HIS MINSA
                </button>
                <button
                  type="button"
                  disabled
                  title="Pendiente de cargar: guia SISGALEN / HIS MINSA."
                  className="inline-flex shrink-0 cursor-not-allowed items-center gap-1.5 rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-[11px] font-semibold text-slate-400"
                >
                  <Download className="h-3.5 w-3.5" />
                  Guía SISGALEN HIS
                </button>
                <button
                  type="button"
                  disabled
                  title="Pendiente de cargar: Excel de criterios de programación."
                  className="inline-flex shrink-0 cursor-not-allowed items-center gap-1.5 rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-[11px] font-semibold text-slate-400"
                >
                  <FileSpreadsheet className="h-3.5 w-3.5" />
                  Criterios de programación
                </button>
                <button
                  type="button"
                  onClick={handleLogout}
                  className="inline-flex shrink-0 items-center gap-1.5 rounded-lg border border-rose-200 bg-white px-3 py-2 text-[11px] font-semibold text-rose-600 transition hover:bg-rose-50 hover:text-rose-700"
                >
                  <LogOut className="h-3.5 w-3.5" />
                  Cerrar sesión
                </button>
              </div>
            </div>
          </header>
        )}

        {/* Page content */}
        <main className="flex-1 overflow-y-auto ppr-scroll">
          <div className="mx-auto max-w-[1500px] p-4 animate-ppr-fade sm:p-5 lg:p-6">
            {pprUser && (
              <PprContext.Provider value={{ pprUser }}>
                <Outlet />
              </PprContext.Provider>
            )}
          </div>
        </main>
      </div>

      {/* Validation overlay */}
      {!pprUser && (
        <ValidationOverlay onAuthorized={(user) => setPprUser(user)} />
      )}
    </div>
  )
}
