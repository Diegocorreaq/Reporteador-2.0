import { useState } from 'react'
import { Outlet } from 'react-router-dom'
import { Eye, EyeOff, Loader2, Menu, ShieldCheck } from 'lucide-react'
import { useAuthStore } from '@/modules/auth/store/use-auth-store'
import { validatePprUser } from '@/modules/ppr/services/ppr.service'
import { PprContext, type PprUser } from '@/modules/ppr/context/ppr-context'
import { PprSidebar } from './ppr-sidebar'

// ---------------------------------------------------------------------------
// Validation overlay
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
    <div className="absolute inset-0 z-30 flex items-center justify-center bg-[#0c2340]/80 backdrop-blur-sm">
      <div className="w-full max-w-sm rounded-2xl border border-white/10 bg-[#0f2a4a] p-8 shadow-2xl">
        <div className="mb-7 flex flex-col items-center gap-3 text-center">
          <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-green-500/15">
            <ShieldCheck className="h-7 w-7 text-green-400" />
          </div>
          <div>
            <div className="flex items-center justify-center gap-2">
              <span className="rounded-md bg-green-500 px-1.5 py-0.5 text-[10px] font-bold uppercase tracking-wider text-white">
                PPR
              </span>
              <h2 className="text-base font-bold text-white">Portal PPR</h2>
            </div>
            <p className="mt-1 text-xs text-slate-400">
              Verificación de acceso requerida
            </p>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-1.5">
            <label className="block text-xs font-medium text-slate-300">Usuario (DNI)</label>
            <input
              type="text"
              autoComplete="username"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              className="w-full rounded-xl border border-white/10 bg-white/5 px-3 py-2.5 text-sm text-white placeholder:text-slate-500 focus:border-green-500/50 focus:outline-none"
              placeholder="Ingrese su DNI"
              required
            />
          </div>

          <div className="space-y-1.5">
            <label className="block text-xs font-medium text-slate-300">Contraseña</label>
            <div className="relative">
              <input
                type={showPassword ? 'text' : 'password'}
                autoComplete="current-password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full rounded-xl border border-white/10 bg-white/5 px-3 py-2.5 pr-10 text-sm text-white placeholder:text-slate-500 focus:border-green-500/50 focus:outline-none"
                placeholder="Contraseña"
                required
              />
              <button
                type="button"
                tabIndex={-1}
                onClick={() => setShowPassword((v) => !v)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500 hover:text-slate-300"
              >
                {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              </button>
            </div>
          </div>

          {error && (
            <div className="rounded-xl border border-red-500/20 bg-red-500/10 px-3 py-2.5 text-xs text-red-400">
              {error}
            </div>
          )}

          <button
            type="submit"
            disabled={loading || !username.trim() || !password.trim()}
            className="flex w-full items-center justify-center gap-2 rounded-xl bg-green-600 py-2.5 text-sm font-semibold text-white transition hover:bg-green-500 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <ShieldCheck className="h-4 w-4" />}
            Verificar acceso
          </button>
        </form>
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
    <div className="relative flex h-screen overflow-hidden bg-[#f0f4f8]">
      {/* Sidebar — always visible even during validation */}
      {pprUser ? (
        <PprContext.Provider value={{ pprUser }}>
          <PprSidebar mobileOpen={mobileOpen} onCloseMobile={() => setMobileOpen(false)} />
        </PprContext.Provider>
      ) : (
        /* Skeleton sidebar shown while validating */
        <aside className="hidden w-56 shrink-0 bg-[#0c2340] lg:block">
          <div className="px-5 py-5">
            <div className="flex items-center gap-2">
              <span className="rounded-md bg-green-500 px-1.5 py-0.5 text-[10px] font-bold uppercase tracking-wider text-white">
                PPR
              </span>
              <span className="text-sm font-bold text-white">Portal PPR</span>
            </div>
            <p className="mt-0.5 text-[10px] text-slate-400">Programación Presupuestal</p>
          </div>
        </aside>
      )}

      {/* Content area */}
      <div className="flex flex-1 flex-col overflow-hidden">
        {/* Mobile topbar */}
        <header className="flex h-12 items-center gap-3 border-b border-[#e2e8f0] bg-white px-4 lg:hidden">
          <button
            className="rounded-lg p-1.5 text-slate-500 hover:bg-slate-100"
            onClick={() => setMobileOpen(true)}
          >
            <Menu className="h-4 w-4" />
          </button>
          <div className="flex items-center gap-2">
            <span className="rounded-md bg-green-500 px-1.5 py-0.5 text-[10px] font-bold uppercase tracking-wider text-white">
              PPR
            </span>
            <span className="text-sm font-semibold text-[#0c2340]">Portal PPR</span>
          </div>
        </header>

        {/* Page content */}
        <main className="flex-1 overflow-y-auto p-5 lg:p-7">
          {pprUser && (
            <PprContext.Provider value={{ pprUser }}>
              <Outlet />
            </PprContext.Provider>
          )}
        </main>
      </div>

      {/* Validation overlay */}
      {!pprUser && (
        <ValidationOverlay
          onAuthorized={(user) => setPprUser(user)}
        />
      )}
    </div>
  )
}
