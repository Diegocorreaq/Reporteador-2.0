import { useState } from 'react'
import { Outlet } from 'react-router-dom'
import { Eye, EyeOff, Loader2, Lock, Menu, ShieldCheck, User } from 'lucide-react'
import { useAuthStore } from '@/modules/auth/store/use-auth-store'
import { validatePprUser } from '@/modules/ppr/services/ppr.service'
import { PprContext, type PprUser } from '@/modules/ppr/context/ppr-context'
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
    <div className="absolute inset-0 z-30 flex items-center justify-center overflow-hidden bg-slate-950">
      {/* Decorative background */}
      <div className="absolute inset-0 opacity-30">
        <div className="absolute -top-32 -right-32 h-96 w-96 rounded-full bg-indigo-500/30 blur-3xl" />
        <div className="absolute -bottom-32 -left-32 h-96 w-96 rounded-full bg-sky-500/20 blur-3xl" />
      </div>

      {/* Card */}
      <div className="relative w-full max-w-sm animate-ppr-scale rounded-3xl border border-white/10 bg-gradient-to-b from-slate-800 to-slate-900 p-8 shadow-2xl">
        {/* Top branding */}
        <div className="mb-7 flex flex-col items-center gap-4 text-center">
          <div className="relative">
            <div className="absolute inset-0 animate-ppr-pulse rounded-2xl bg-indigo-500/30 blur-md" />
            <div className="relative flex h-16 w-16 items-center justify-center rounded-2xl bg-gradient-to-br from-indigo-500 to-indigo-700 shadow-lg shadow-indigo-500/40">
              <ShieldCheck className="h-8 w-8 text-white" />
            </div>
          </div>
          <div className="space-y-1">
            <div className="flex items-center justify-center gap-2">
              <span className="rounded-md bg-indigo-600 px-1.5 py-0.5 text-[9px] font-black uppercase tracking-wider text-white">
                PPR
              </span>
              <h2 className="text-base font-bold text-white">Portal PPR</h2>
            </div>
            <p className="text-xs text-slate-400">
              Verificación de acceso requerida
            </p>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Username */}
          <div className="space-y-1.5">
            <label className="block text-[11px] font-medium text-slate-300">
              Usuario (DNI)
            </label>
            <div className="relative">
              <User className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-500" />
              <input
                type="text"
                autoComplete="username"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                className="w-full rounded-xl border border-white/10 bg-white/5 py-2.5 pl-9 pr-3 text-sm text-white placeholder:text-slate-500 transition focus:border-indigo-500/60 focus:bg-white/10 focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
                placeholder="Ingrese su DNI"
                required
              />
            </div>
          </div>

          {/* Password */}
          <div className="space-y-1.5">
            <label className="block text-[11px] font-medium text-slate-300">
              Contraseña
            </label>
            <div className="relative">
              <Lock className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-500" />
              <input
                type={showPassword ? 'text' : 'password'}
                autoComplete="current-password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full rounded-xl border border-white/10 bg-white/5 py-2.5 pl-9 pr-10 text-sm text-white placeholder:text-slate-500 transition focus:border-indigo-500/60 focus:bg-white/10 focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
                placeholder="Contraseña"
                required
              />
              <button
                type="button"
                tabIndex={-1}
                onClick={() => setShowPassword((v) => !v)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500 transition hover:text-slate-300"
              >
                {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              </button>
            </div>
          </div>

          {/* Error */}
          {error && (
            <div className="animate-ppr-fade rounded-xl border border-rose-500/30 bg-rose-500/10 px-3 py-2.5 text-xs text-rose-300">
              {error}
            </div>
          )}

          {/* Submit */}
          <button
            type="submit"
            disabled={loading || !username.trim() || !password.trim()}
            className="group relative flex w-full items-center justify-center gap-2 overflow-hidden rounded-xl bg-gradient-to-r from-indigo-500 to-indigo-700 py-2.5 text-sm font-semibold text-white shadow-lg shadow-indigo-500/30 transition hover:shadow-xl hover:shadow-indigo-500/40 disabled:cursor-not-allowed disabled:opacity-50 disabled:shadow-none"
          >
            <span className="absolute inset-0 -translate-x-full bg-gradient-to-r from-transparent via-white/20 to-transparent transition-transform group-hover:translate-x-full" />
            {loading ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <ShieldCheck className="h-4 w-4" />
            )}
            <span className="relative">
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
  const [pprUser, setPprUser] = useState<PprUser | null>(null)
  const [mobileOpen, setMobileOpen] = useState(false)

  return (
    <div className="relative flex h-screen overflow-hidden bg-slate-50">
      {/* Sidebar — always visible even during validation */}
      {pprUser ? (
        <PprContext.Provider value={{ pprUser }}>
          <PprSidebar mobileOpen={mobileOpen} onCloseMobile={() => setMobileOpen(false)} />
        </PprContext.Provider>
      ) : (
        /* Skeleton sidebar shown while validating */
        <aside className="hidden w-60 shrink-0 bg-gradient-to-b from-slate-900 to-[#0b1224] lg:block">
          <div className="px-5 py-5">
            <div className="flex items-center gap-2.5">
              <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-gradient-to-br from-indigo-500 to-indigo-700 shadow-lg shadow-indigo-500/30">
                <span className="text-[10px] font-black uppercase tracking-tighter text-white">PPR</span>
              </div>
              <div>
                <p className="text-sm font-bold text-white">Portal PPR</p>
                <p className="text-[10px] text-slate-400">Programación Presupuestal</p>
              </div>
            </div>
          </div>
        </aside>
      )}

      {/* Content area */}
      <div className="flex flex-1 flex-col overflow-hidden">
        {/* Mobile topbar */}
        <header className="flex h-14 items-center gap-3 border-b border-slate-200 bg-white/80 px-4 backdrop-blur-md lg:hidden">
          <button
            className="rounded-xl p-2 text-slate-500 transition hover:bg-slate-100 hover:text-slate-900"
            onClick={() => setMobileOpen(true)}
            aria-label="Abrir menú"
          >
            <Menu className="h-4 w-4" />
          </button>
          <div className="flex items-center gap-2">
            <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-gradient-to-br from-indigo-500 to-indigo-700 shadow-sm shadow-indigo-500/30">
              <span className="text-[9px] font-black uppercase tracking-tighter text-white">PPR</span>
            </div>
            <span className="text-sm font-bold text-slate-900">Portal PPR</span>
          </div>
        </header>

        {/* Page content */}
        <main className="flex-1 overflow-y-auto ppr-scroll">
          <div className="mx-auto max-w-7xl p-5 lg:p-8 animate-ppr-fade">
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
