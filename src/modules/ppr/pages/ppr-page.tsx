import { useEffect, useRef, useState } from 'react'
import { CheckCircle2, ClipboardCheck, Eye, EyeOff, Loader2, PenLine, ShieldCheck } from 'lucide-react'
import { useAuthStore } from '@/modules/auth/store/use-auth-store'
import {
  fetchActividades,
  fetchPeriodoActivo,
  fetchProgramas,
  firmarPeriodo,
  saveValor,
  validatePprUser,
} from '@/modules/ppr/services/ppr.service'
import type { PprActividad, PprPeriodo, PprPrograma } from '@/modules/ppr/types'

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function pctColor(pct: number) {
  if (pct >= 100) return 'text-emerald-600'
  if (pct >= 60) return 'text-amber-600'
  return 'text-red-500'
}

// ---------------------------------------------------------------------------
// Validation dialog (same pattern as Lavado de Manos)
// ---------------------------------------------------------------------------

interface ValidationDialogProps {
  onAuthorized: (employeeId: number, employeeName: string) => void
}

function ValidationDialog({ onAuthorized }: ValidationDialogProps) {
  const sessionUser = useAuthStore((state) => state.user)
  const [username, setUsername] = useState(sessionUser?.username ?? '')
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const passwordRef = useRef<HTMLInputElement>(null)

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
      onAuthorized(result.employeeId, result.employeeName)
    } catch {
      setError('No se pudo verificar el acceso. Intente nuevamente.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="fixed inset-0 z-40 flex items-center justify-center bg-black/30 backdrop-blur-sm">
      <div className="w-full max-w-sm rounded-2xl border border-[#e8f0f8] bg-white p-7 shadow-2xl">
        {/* Header */}
        <div className="mb-6 flex flex-col items-center gap-2 text-center">
          <div className="flex h-14 w-14 items-center justify-center rounded-full bg-brand-soft">
            <ShieldCheck className="h-7 w-7 text-brand-strong" />
          </div>
          <h2 className="text-base font-bold text-[#123B63]">Portal PPR</h2>
          <p className="text-xs text-muted">
            Ingrese sus credenciales para verificar su acceso al portal.
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Username */}
          <div className="space-y-1.5">
            <label className="block text-xs font-medium text-[#123B63]">Usuario (DNI)</label>
            <input
              type="text"
              autoComplete="username"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              className="w-full rounded-lg border border-[#ccd9e8] px-3 py-2 text-sm focus:border-[#123B63] focus:outline-none"
              placeholder="Ingrese su DNI"
              required
            />
          </div>

          {/* Password */}
          <div className="space-y-1.5">
            <label className="block text-xs font-medium text-[#123B63]">Contraseña</label>
            <div className="relative">
              <input
                ref={passwordRef}
                type={showPassword ? 'text' : 'password'}
                autoComplete="current-password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full rounded-lg border border-[#ccd9e8] px-3 py-2 pr-10 text-sm focus:border-[#123B63] focus:outline-none"
                placeholder="Ingrese su contraseña"
                required
              />
              <button
                type="button"
                tabIndex={-1}
                onClick={() => setShowPassword((v) => !v)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-muted hover:text-[#123B63]"
              >
                {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              </button>
            </div>
          </div>

          {/* Error */}
          {error && (
            <div className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-xs text-red-700">
              {error}
            </div>
          )}

          {/* Submit */}
          <button
            type="submit"
            disabled={loading || !username.trim() || !password.trim()}
            className="flex w-full items-center justify-center gap-2 rounded-lg bg-[#123B63] py-2.5 text-sm font-semibold text-white transition hover:bg-[#1a4f85] disabled:cursor-not-allowed disabled:opacity-50"
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
// Activity row
// ---------------------------------------------------------------------------

interface ActividadRowProps {
  actividad: PprActividad
  disabled: boolean
  employeeId: number
  periodId: number
  onChange: (id: number, value: string, notes: string) => void
}

function ActividadRow({ actividad, disabled, onChange }: ActividadRowProps) {
  const [val, setVal] = useState(actividad.value != null ? String(actividad.value) : '')
  const [notes, setNotes] = useState(actividad.notes ?? '')
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  useEffect(() => {
    setVal(actividad.value != null ? String(actividad.value) : '')
    setNotes(actividad.notes ?? '')
  }, [actividad.value, actividad.notes])

  function handleChange(nextVal: string, nextNotes: string) {
    setVal(nextVal)
    setNotes(nextNotes)
    if (debounceRef.current) clearTimeout(debounceRef.current)
    debounceRef.current = setTimeout(() => onChange(actividad.id, nextVal, nextNotes), 600)
  }

  const numVal = parseFloat(val)
  const pct =
    actividad.annualGoal && !isNaN(numVal)
      ? Math.round((numVal / actividad.annualGoal) * 100)
      : null

  return (
    <tr className="border-b border-[#e8f0f8] last:border-0 hover:bg-[#f5f9ff]">
      <td className="py-2.5 pl-4 pr-2 text-xs text-[#123B63]">
        {actividad.code && (
          <span className="mr-1.5 rounded bg-[#e8f0f8] px-1.5 py-0.5 font-mono text-[10px] text-[#3a6fa0]">
            {actividad.code}
          </span>
        )}
        {actividad.name}
      </td>
      <td className="px-2 py-2.5 text-center text-xs text-muted">{actividad.unit || '—'}</td>
      <td className="px-2 py-2.5 text-center text-xs text-muted">
        {actividad.annualGoal != null ? actividad.annualGoal.toLocaleString('es-PE') : '—'}
      </td>
      <td className="px-2 py-2.5">
        <input
          type="number"
          min={0}
          step="any"
          value={val}
          disabled={disabled}
          onChange={(e) => handleChange(e.target.value, notes)}
          className="w-24 rounded border border-[#ccd9e8] px-2 py-1 text-right text-xs focus:border-[#123B63] focus:outline-none disabled:cursor-not-allowed disabled:bg-[#f5f5f5]"
          placeholder="0"
        />
      </td>
      <td className="px-2 py-2.5">
        <input
          type="text"
          value={notes}
          disabled={disabled}
          onChange={(e) => handleChange(val, e.target.value)}
          className="w-40 rounded border border-[#ccd9e8] px-2 py-1 text-xs focus:border-[#123B63] focus:outline-none disabled:cursor-not-allowed disabled:bg-[#f5f5f5]"
          placeholder="Observaciones…"
        />
      </td>
      <td className="px-2 py-2.5 text-center text-xs">
        {pct != null ? <span className={pctColor(pct)}>{pct}%</span> : <span className="text-muted">—</span>}
      </td>
    </tr>
  )
}

// ---------------------------------------------------------------------------
// Main page
// ---------------------------------------------------------------------------

interface AuthorizedUser {
  employeeId: number
  employeeName: string
}

export function PprPage() {
  const [authorizedUser, setAuthorizedUser] = useState<AuthorizedUser | null>(null)

  const [periodo, setPeriodo] = useState<PprPeriodo | null>(null)
  const [programas, setProgramas] = useState<PprPrograma[]>([])
  const [programaId, setProgramaId] = useState<number | null>(null)
  const [actividades, setActividades] = useState<PprActividad[]>([])

  const [loadingInit, setLoadingInit] = useState(false)
  const [loadingActs, setLoadingActs] = useState(false)
  const [saving, setSaving] = useState(false)
  const [signing, setSigning] = useState(false)
  const [signed, setSigned] = useState(false)
  const [signedAt, setSignedAt] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)

  // Load period + programs once validated
  useEffect(() => {
    if (!authorizedUser) return
    setLoadingInit(true)
    Promise.all([fetchPeriodoActivo(), fetchProgramas(authorizedUser.employeeId)])
      .then(([per, progs]) => {
        setPeriodo(per)
        setProgramas(progs)
        if (progs.length > 0) setProgramaId(progs[0].id)
      })
      .catch(() => setError('No se pudo cargar la información del período.'))
      .finally(() => setLoadingInit(false))
  }, [authorizedUser])

  // Load activities when program or period changes
  useEffect(() => {
    if (!programaId || !periodo || !authorizedUser) return
    setLoadingActs(true)
    setSigned(false)
    setSignedAt(null)
    fetchActividades(programaId, periodo.id, authorizedUser.employeeId)
      .then((acts) => {
        setActividades(acts)
        if (acts.length > 0 && acts[0].signed) setSigned(true)
      })
      .catch(() => setError('No se pudo cargar las actividades.'))
      .finally(() => setLoadingActs(false))
  }, [programaId, periodo, authorizedUser])

  async function handleValorChange(activityId: number, rawValue: string, notes: string) {
    if (!periodo || !authorizedUser) return
    const numVal = parseFloat(rawValue)
    if (isNaN(numVal)) return
    setSaving(true)
    try {
      await saveValor({ activityId, periodId: periodo.id, employeeId: authorizedUser.employeeId, value: numVal, notes })
      setActividades((prev) => prev.map((a) => (a.id === activityId ? { ...a, value: numVal, notes } : a)))
    } catch {
      setError('Error al guardar el valor.')
    } finally {
      setSaving(false)
    }
  }

  async function handleFirmar() {
    if (!periodo || !authorizedUser || !programaId) return
    setSigning(true)
    try {
      const result = await firmarPeriodo(periodo.id, authorizedUser.employeeId, programaId)
      setSigned(true)
      setSignedAt(result.signedAt)
      setActividades((prev) => prev.map((a) => ({ ...a, signed: true })))
    } catch {
      setError('Error al firmar el período.')
    } finally {
      setSigning(false)
    }
  }

  // Show validation dialog until authorized
  if (!authorizedUser) {
    return <ValidationDialog onAuthorized={(id, name) => setAuthorizedUser({ employeeId: id, employeeName: name })} />
  }

  const completadas = actividades.filter((a) => a.value != null).length
  const total = actividades.length
  const pctTotal = total > 0 ? Math.round((completadas / total) * 100) : 0
  const canSign = !signed && completadas === total && total > 0 && (periodo?.isOpen ?? false)

  return (
    <section className="space-y-5">
      {/* Header */}
      <header className="flex flex-wrap items-start justify-between gap-3">
        <div className="space-y-0.5">
          <div className="flex flex-wrap items-center gap-2">
            <span className="rounded-md bg-brand-soft px-2 py-0.5 text-[10px] font-bold uppercase tracking-[0.12em] text-brand-strong">
              PPR
            </span>
            <h1 className="text-lg font-semibold text-brand-strong sm:text-xl">Portal PPR</h1>
            {periodo && (
              <span className="rounded-md bg-[#e8f0f8] px-2 py-0.5 text-xs font-medium text-[#3a6fa0]">
                {periodo.label}
              </span>
            )}
          </div>
          <p className="text-xs text-muted">
            Programación Presupuestal por Resultados —{' '}
            <span className="font-medium text-[#123B63]">{authorizedUser.employeeName}</span>
          </p>
        </div>

        {signed ? (
          <div className="flex items-center gap-1.5 rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-1.5 text-xs font-medium text-emerald-700">
            <CheckCircle2 className="h-3.5 w-3.5" />
            Período firmado
            {signedAt && (
              <span className="ml-1 font-normal text-emerald-600">
                {new Date(signedAt).toLocaleDateString('es-PE')}
              </span>
            )}
          </div>
        ) : (
          <button
            onClick={handleFirmar}
            disabled={!canSign || signing}
            title={!canSign ? 'Complete todas las actividades para poder firmar' : 'Firmar período'}
            className="flex items-center gap-1.5 rounded-lg bg-[#123B63] px-4 py-2 text-xs font-semibold text-white transition hover:bg-[#1a4f85] disabled:cursor-not-allowed disabled:opacity-40"
          >
            {signing ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <PenLine className="h-3.5 w-3.5" />}
            Firmar mes
          </button>
        )}
      </header>

      {/* Error */}
      {error && (
        <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-2.5 text-xs text-red-700">
          {error}{' '}
          <button className="font-semibold underline" onClick={() => setError(null)}>
            Cerrar
          </button>
        </div>
      )}

      {loadingInit ? (
        <div className="flex items-center justify-center py-20">
          <Loader2 className="h-6 w-6 animate-spin text-[#123B63]" />
        </div>
      ) : (
        <>
          {/* Program selector */}
          {programas.length > 1 && (
            <div className="flex flex-wrap items-center gap-2">
              <span className="text-xs font-medium text-muted">Programa:</span>
              <div className="flex flex-wrap gap-1.5">
                {programas.map((p) => (
                  <button
                    key={p.id}
                    onClick={() => setProgramaId(p.id)}
                    className={`rounded-lg border px-3 py-1 text-xs font-medium transition ${
                      programaId === p.id
                        ? 'border-[#123B63] bg-[#123B63] text-white'
                        : 'border-[#ccd9e8] bg-white text-[#123B63] hover:bg-[#f0f6ff]'
                    }`}
                  >
                    {p.code && <span className="mr-1 opacity-70">{p.code}</span>}
                    {p.name}
                  </button>
                ))}
              </div>
            </div>
          )}

          {programas.length === 0 && (
            <div className="flex flex-col items-center gap-3 rounded-xl border border-dashed border-[#b8cfe8] bg-white py-16 text-center">
              <ClipboardCheck className="h-8 w-8 text-muted" />
              <p className="text-sm font-medium text-[#123B63]">Sin programas asignados</p>
              <p className="max-w-xs text-xs text-muted">
                Contacte al administrador para que le asigne programas PPR.
              </p>
            </div>
          )}

          {/* Progress bar */}
          {total > 0 && (
            <div className="flex items-center gap-4 rounded-xl border border-[#e8f0f8] bg-white px-5 py-3">
              <div className="flex-1">
                <div className="mb-1.5 flex items-center justify-between text-xs">
                  <span className="font-medium text-[#123B63]">Avance del mes</span>
                  <span className={`font-semibold ${pctColor(pctTotal)}`}>
                    {completadas}/{total} actividades ({pctTotal}%)
                  </span>
                </div>
                <div className="h-1.5 w-full overflow-hidden rounded-full bg-[#e8f0f8]">
                  <div
                    className={`h-full rounded-full transition-all ${pctTotal >= 100 ? 'bg-emerald-500' : pctTotal >= 60 ? 'bg-amber-400' : 'bg-red-400'}`}
                    style={{ width: `${pctTotal}%` }}
                  />
                </div>
              </div>
              {saving && (
                <div className="flex items-center gap-1 text-xs text-muted">
                  <Loader2 className="h-3 w-3 animate-spin" />
                  Guardando…
                </div>
              )}
            </div>
          )}

          {/* Activities table */}
          {programaId !== null && (
            <div className="overflow-hidden rounded-xl border border-[#e8f0f8] bg-white">
              {loadingActs ? (
                <div className="flex items-center justify-center py-16">
                  <Loader2 className="h-5 w-5 animate-spin text-[#123B63]" />
                </div>
              ) : actividades.length === 0 ? (
                <div className="flex flex-col items-center gap-2 py-16 text-center">
                  <p className="text-sm font-medium text-[#123B63]">Sin actividades registradas</p>
                  <p className="text-xs text-muted">
                    No hay actividades configuradas para este programa y período.
                  </p>
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b border-[#e8f0f8] bg-[#f5f9ff]">
                        <th className="py-2.5 pl-4 pr-2 text-left text-xs font-semibold text-[#123B63]">Actividad</th>
                        <th className="px-2 py-2.5 text-center text-xs font-semibold text-[#123B63]">Unidad</th>
                        <th className="px-2 py-2.5 text-center text-xs font-semibold text-[#123B63]">Meta anual</th>
                        <th className="px-2 py-2.5 text-center text-xs font-semibold text-[#123B63]">Valor mes</th>
                        <th className="px-2 py-2.5 text-left text-xs font-semibold text-[#123B63]">Observaciones</th>
                        <th className="px-2 py-2.5 text-center text-xs font-semibold text-[#123B63]">% Avance</th>
                      </tr>
                    </thead>
                    <tbody>
                      {actividades.map((act) => (
                        <ActividadRow
                          key={act.id}
                          actividad={act}
                          disabled={signed || !(periodo?.isOpen ?? false)}
                          employeeId={authorizedUser.employeeId}
                          periodId={periodo?.id ?? 0}
                          onChange={handleValorChange}
                        />
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          )}

          {periodo && !periodo.isOpen && (
            <p className="text-center text-xs text-muted">
              Este período está cerrado. Los valores son de solo lectura.
            </p>
          )}
        </>
      )}
    </section>
  )
}
