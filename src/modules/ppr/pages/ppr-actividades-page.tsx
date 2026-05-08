import { useEffect, useRef, useState } from 'react'
import {
  ArrowLeft,
  CheckCircle2,
  ClipboardCheck,
  Database,
  Loader2,
  PenLine,
  Save,
  Target,
} from 'lucide-react'
import { Link, useLocation } from 'react-router-dom'
import { usePprContext } from '@/modules/ppr/context/ppr-context'
import {
  fetchActividades,
  fetchPeriodoActivo,
  fetchProgramas,
  fetchValidationSummary,
  firmarPeriodo,
  saveValor,
  validarValor,
} from '@/modules/ppr/services/ppr.service'
import type { PprActividad, PprPeriodo, PprPeriodoItem, PprPrograma, PprValidationSummary } from '@/modules/ppr/types'
import {
  PprAlert,
  PprEmptyState,
  PprPill,
  PprProgressBar,
  PprSectionHeader,
  PprSkeleton,
  pctTextColor,
} from '@/modules/ppr/components/ui-primitives'
import { cn } from '@/lib/utils'

// ─── Activity row (desktop table) ─────────────────────────────────────────────
interface ActividadRowProps {
  actividad: PprActividad
  disabled: boolean
  onChange: (id: number, value: string, notes: string) => void
  onValidate: (id: number) => void
  validating: boolean
}

function validationTone(actividad: PprActividad): 'emerald' | 'sky' | 'amber' | 'indigo' | 'slate' {
  if (actividad.validationStatus === 'validated') return 'emerald'
  if (actividad.value == null) return 'slate'
  if (actividad.valueSource === 'source') return 'sky'
  if (actividad.valueSource === 'manual_override') return 'amber'
  return 'indigo'
}

function validationLabel(actividad: PprActividad) {
  if (actividad.validationStatus === 'validated') return 'Validado'
  if (actividad.value == null) return 'Pendiente'
  if (actividad.valueSource === 'source') return 'Precargado SIGH'
  if (actividad.valueSource === 'manual_override') return 'Editado'
  return 'Manual'
}

function canValidateActivity(actividad: PprActividad, disabled: boolean) {
  return !disabled && actividad.value != null && actividad.validationStatus !== 'validated'
}

function resolveErrorMessage(error: unknown, fallback: string) {
  if (typeof error === 'object' && error && 'response' in error) {
    const response = (error as { response?: { data?: { message?: string } } }).response
    return response?.data?.message ?? fallback
  }
  return fallback
}

function ActividadRow({ actividad, disabled, onChange, onValidate, validating }: ActividadRowProps) {
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
  const pct = actividad.annualGoal && !isNaN(numVal)
    ? Math.round((numVal / actividad.annualGoal) * 100)
    : null
  const isFilled = val !== ''

  return (
    <tr className={cn(
      'border-b border-slate-100 transition-colors last:border-0',
      isFilled ? 'bg-indigo-50/30 hover:bg-indigo-50/50' : 'hover:bg-slate-50',
    )}>
      <td className="py-3 pl-4 pr-2 text-xs text-slate-900">
        <div className="flex items-start gap-2">
          {isFilled && <CheckCircle2 className="mt-0.5 h-3 w-3 shrink-0 text-emerald-500" />}
          <div className="min-w-0">
            {actividad.code && (
              <span className="mr-1.5 rounded bg-indigo-50 px-1.5 py-0.5 font-mono text-[10px] text-indigo-700">
                {actividad.code}
              </span>
            )}
            <span>{actividad.name}</span>
          </div>
        </div>
      </td>
      <td className="px-2 py-3 text-center text-xs text-slate-500">{actividad.unit || '—'}</td>
      <td className="px-2 py-3 text-center text-xs text-slate-500 tabular-nums">
        {actividad.annualGoal != null ? actividad.annualGoal.toLocaleString('es-PE') : '—'}
      </td>
      <td className="px-2 py-3">
        <input
          type="number"
          min={0}
          step="any"
          value={val}
          disabled={disabled}
          onChange={(e) => handleChange(e.target.value, notes)}
          className={cn(
            'w-24 rounded-lg border px-2 py-1.5 text-right text-xs tabular-nums transition focus:outline-none focus:ring-2 disabled:cursor-not-allowed disabled:bg-slate-50',
            isFilled
              ? 'border-indigo-300 bg-indigo-50/40 focus:border-indigo-500 focus:ring-indigo-500/20'
              : 'border-slate-300 focus:border-indigo-500 focus:ring-indigo-500/20',
          )}
          placeholder="0"
        />
      </td>
      <td className="px-2 py-3">
        <input
          type="text"
          value={notes}
          disabled={disabled}
          onChange={(e) => handleChange(val, e.target.value)}
          className="w-44 rounded-lg border border-slate-300 px-2 py-1.5 text-xs transition focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 disabled:cursor-not-allowed disabled:bg-slate-50"
          placeholder="Observaciones…"
        />
      </td>
      <td className="px-2 py-3 text-center">
        <PprPill tone={validationTone(actividad)} icon={actividad.valueSource === 'source' ? Database : undefined}>
          {validationLabel(actividad)}
        </PprPill>
      </td>
      <td className="px-2 py-3 text-center text-xs">
        {pct != null ? (
          <span className={cn('font-semibold tabular-nums', pctTextColor(pct))}>{pct}%</span>
        ) : (
          <span className="text-slate-300">—</span>
        )}
      </td>
      <td className="px-3 py-3 text-center">
        <button
          onClick={() => onValidate(actividad.id)}
          disabled={!canValidateActivity(actividad, disabled) || validating}
          className={cn(
            'inline-flex items-center justify-center gap-1.5 rounded-lg px-2.5 py-1.5 text-[11px] font-semibold transition',
            actividad.validationStatus === 'validated'
              ? 'bg-emerald-50 text-emerald-700'
              : 'bg-indigo-600 text-white hover:bg-indigo-700',
            (!canValidateActivity(actividad, disabled) || validating) && 'cursor-not-allowed opacity-45',
          )}
        >
          {validating ? <Loader2 className="h-3 w-3 animate-spin" /> : <CheckCircle2 className="h-3 w-3" />}
          Validar
        </button>
      </td>
    </tr>
  )
}

// ─── Activity card (mobile) ───────────────────────────────────────────────────
function ActividadCard({ actividad, disabled, onChange, onValidate, validating }: ActividadRowProps) {
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
  const pct = actividad.annualGoal && !isNaN(numVal)
    ? Math.round((numVal / actividad.annualGoal) * 100)
    : null
  const isFilled = val !== ''

  return (
    <div className={cn(
      'rounded-2xl border bg-white p-4 transition-all',
      isFilled
        ? 'border-indigo-200 shadow-sm shadow-indigo-100/60'
        : 'border-slate-200',
    )}>
      <div className="mb-3 flex items-start gap-2">
        {isFilled && <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-emerald-500" />}
        <div className="min-w-0 flex-1">
          {actividad.code && (
            <span className="mr-1.5 inline-block rounded bg-indigo-50 px-1.5 py-0.5 font-mono text-[10px] text-indigo-700">
              {actividad.code}
            </span>
          )}
          <p className="inline text-xs font-semibold text-slate-900">{actividad.name}</p>
          <p className="mt-1 flex items-center gap-2 text-[10px] text-slate-400">
            <Target className="h-3 w-3" />
            Meta anual: {actividad.annualGoal != null ? actividad.annualGoal.toLocaleString('es-PE') : '—'}
            {actividad.unit && <span>· {actividad.unit}</span>}
          </p>
        </div>
        {pct != null && (
          <span className={cn('shrink-0 text-xs font-bold tabular-nums', pctTextColor(pct))}>{pct}%</span>
        )}
      </div>

      <div className="grid grid-cols-2 gap-2">
        <label className="space-y-1">
          <span className="text-[10px] font-semibold uppercase tracking-wide text-slate-400">
            Valor del mes
          </span>
          <input
            type="number"
            min={0}
            step="any"
            value={val}
            disabled={disabled}
            onChange={(e) => handleChange(e.target.value, notes)}
            className={cn(
              'w-full rounded-lg border px-2 py-2 text-right text-sm tabular-nums transition focus:outline-none focus:ring-2 disabled:cursor-not-allowed disabled:bg-slate-50',
              isFilled
                ? 'border-indigo-300 bg-indigo-50/40 focus:border-indigo-500 focus:ring-indigo-500/20'
                : 'border-slate-300 focus:border-indigo-500 focus:ring-indigo-500/20',
            )}
            placeholder="0"
          />
        </label>
        <label className="space-y-1">
          <span className="text-[10px] font-semibold uppercase tracking-wide text-slate-400">
            Observación
          </span>
          <input
            type="text"
            value={notes}
            disabled={disabled}
            onChange={(e) => handleChange(val, e.target.value)}
            className="w-full rounded-lg border border-slate-300 px-2 py-2 text-xs transition focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 disabled:cursor-not-allowed disabled:bg-slate-50"
            placeholder="—"
          />
        </label>
      </div>

      <div className="mt-3 flex items-center justify-between gap-2">
        <PprPill tone={validationTone(actividad)} icon={actividad.valueSource === 'source' ? Database : undefined}>
          {validationLabel(actividad)}
        </PprPill>
        <button
          onClick={() => onValidate(actividad.id)}
          disabled={!canValidateActivity(actividad, disabled) || validating}
          className={cn(
            'inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-[11px] font-semibold transition',
            actividad.validationStatus === 'validated'
              ? 'bg-emerald-50 text-emerald-700'
              : 'bg-indigo-600 text-white hover:bg-indigo-700',
            (!canValidateActivity(actividad, disabled) || validating) && 'cursor-not-allowed opacity-45',
          )}
        >
          {validating ? <Loader2 className="h-3 w-3 animate-spin" /> : <CheckCircle2 className="h-3 w-3" />}
          Validar
        </button>
      </div>
    </div>
  )
}

// ─── Page ─────────────────────────────────────────────────────────────────────
export function PprActividadesPage() {
  const { pprUser } = usePprContext()
  const location = useLocation()
  const navState = location.state as { periodo?: PprPeriodoItem; programaId?: number } | null
  const periodoFromNav = navState?.periodo ?? null
  const programaIdFromNav = navState?.programaId ?? null

  const [periodo, setPeriodo] = useState<PprPeriodo | null>(null)
  const [programas, setProgramas] = useState<PprPrograma[]>([])
  const [programaId, setProgramaId] = useState<number | null>(null)
  const [actividades, setActividades] = useState<PprActividad[]>([])

  const [loadingInit, setLoadingInit] = useState(true)
  const [loadingActs, setLoadingActs] = useState(false)
  const [saving, setSaving] = useState(false)
  const [savedFlash, setSavedFlash] = useState(false)
  const [validatingId, setValidatingId] = useState<number | null>(null)
  const [validationSummary, setValidationSummary] = useState<PprValidationSummary | null>(null)
  const [signing, setSigning] = useState(false)
  const [signed, setSigned] = useState(false)
  const [signedAt, setSignedAt] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)

  async function refreshValidationSummary(periodId = periodo?.id) {
    if (!periodId) return
    try {
      const summary = await fetchValidationSummary(pprUser.employeeId, periodId)
      setValidationSummary(summary)
    } catch {
      setValidationSummary(null)
    }
  }

  useEffect(() => {
    setLoadingInit(true)
    const periodoPromise = periodoFromNav ? Promise.resolve(periodoFromNav) : fetchPeriodoActivo()
    Promise.all([periodoPromise, fetchProgramas(pprUser.employeeId)])
      .then(([per, progs]) => {
        setPeriodo(per)
        setProgramas(progs)
        const initial = programaIdFromNav && progs.find((p) => p.id === programaIdFromNav)
          ? programaIdFromNav
          : progs[0]?.id ?? null
        setProgramaId(initial)
      })
      .catch(() => setError('No se pudo cargar la información del período.'))
      .finally(() => setLoadingInit(false))
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pprUser.employeeId])

  useEffect(() => {
    if (!periodo) return
    refreshValidationSummary(periodo.id)
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [periodo?.id, pprUser.employeeId])

  useEffect(() => {
    if (!programaId || !periodo) return
    setLoadingActs(true)
    setSigned(false)
    setSignedAt(null)
    fetchActividades(programaId, periodo.id, pprUser.employeeId)
      .then((acts) => {
        setActividades(acts)
        if (acts.length > 0 && acts[0].signed) setSigned(true)
      })
      .catch(() => setError('No se pudo cargar las actividades.'))
      .finally(() => setLoadingActs(false))
  }, [programaId, periodo, pprUser.employeeId])

  async function handleValorChange(activityId: number, rawValue: string, notes: string) {
    if (!periodo) return
    const numVal = parseFloat(rawValue)
    if (isNaN(numVal)) return
    setSaving(true)
    try {
      await saveValor({
        activityId,
        periodId: periodo.id,
        employeeId: pprUser.employeeId,
        value: numVal,
        notes,
      })
      setActividades((prev) => prev.map((a) => (
        a.id === activityId
          ? {
              ...a,
              value: numVal,
              notes,
              validationStatus: 'pending',
              validatedAt: null,
              valueSource: a.valueSource === 'source' ? 'manual_override' : (a.valueSource ?? 'manual'),
            }
          : a
      )))
      await refreshValidationSummary(periodo.id)
      setSavedFlash(true)
      setTimeout(() => setSavedFlash(false), 1500)
    } catch {
      setError('Error al guardar el valor.')
    } finally {
      setSaving(false)
    }
  }

  async function handleValidar(activityId: number) {
    if (!periodo) return
    setValidatingId(activityId)
    setError(null)
    try {
      const result = await validarValor({
        activityId,
        periodId: periodo.id,
        employeeId: pprUser.employeeId,
      })
      setActividades((prev) => prev.map((a) => (
        a.id === activityId
          ? { ...a, validationStatus: 'validated', validatedAt: result.validatedAt }
          : a
      )))
      await refreshValidationSummary(periodo.id)
    } catch (validationError) {
      setError(resolveErrorMessage(validationError, 'Error al validar la actividad.'))
    } finally {
      setValidatingId(null)
    }
  }

  async function handleFirmar(forceForTesting = false) {
    if (!periodo) return
    setSigning(true)
    try {
      const result = await firmarPeriodo(periodo.id, pprUser.employeeId, forceForTesting)
      setSigned(true)
      setSignedAt(result.signedAt)
      setActividades((prev) => prev.map((a) => ({ ...a, signed: true })))
      await refreshValidationSummary(periodo.id)
    } catch (signError) {
      setError(resolveErrorMessage(signError, 'Error al firmar el período.'))
    } finally {
      setSigning(false)
    }
  }

  const validadasActuales = actividades.filter((a) => a.validationStatus === 'validated').length
  const conValorActuales = actividades.filter((a) => a.value != null).length
  const total = validationSummary?.total ?? actividades.length
  const completadas = validationSummary?.validated ?? validadasActuales
  const conValor = validationSummary?.withValue ?? conValorActuales
  const pctTotal = total > 0 ? Math.round((completadas / total) * 100) : 0
  const canSign = !signed && (validationSummary?.canSign ?? false) && (periodo?.isOpen ?? false)
  const canForceTestSign = pprUser.role === 'admin' && !signed && !canSign && (periodo?.isOpen ?? false)
  const signEnabled = canSign || canForceTestSign
  const programaActual = programas.find((p) => p.id === programaId)

  return (
    <div className="space-y-5">
      {/* Back link */}
      {periodoFromNav && (
        <Link
          to="/ppr/periodos"
          className="inline-flex items-center gap-1.5 text-xs text-slate-400 transition hover:text-indigo-600"
        >
          <ArrowLeft className="h-3.5 w-3.5" />
          Volver a Períodos
        </Link>
      )}
      {!periodoFromNav && programaIdFromNav && (
        <Link
          to="/ppr/programas"
          className="inline-flex items-center gap-1.5 text-xs text-slate-400 transition hover:text-indigo-600"
        >
          <ArrowLeft className="h-3.5 w-3.5" />
          Volver a Programas
        </Link>
      )}

      {/* Header */}
      <PprSectionHeader
        eyebrow="Registro mensual"
        title="Mis Actividades"
        description={
          periodo
            ? <>Período: <span className="font-semibold text-slate-900">{periodo.label}</span>
              {programaActual && <> · Programa: <span className="font-semibold text-slate-900">{programaActual.name}</span></>}</>
            : 'Cargando período…'
        }
        right={
          signed ? (
            <PprPill tone="emerald" icon={CheckCircle2} size="md">
              Período firmado
              {signedAt && (
                <span className="ml-1 font-normal opacity-80">
                  {new Date(signedAt).toLocaleDateString('es-PE')}
                </span>
              )}
            </PprPill>
          ) : (
            <button
              onClick={() => handleFirmar(canForceTestSign)}
              disabled={!signEnabled || signing}
              title={!canSign ? 'Valide todas las actividades para poder firmar' : 'Firmar período'}
              className={cn(
                'group flex items-center gap-1.5 rounded-xl px-4 py-2 text-xs font-semibold text-white shadow-md transition hover:shadow-lg disabled:cursor-not-allowed disabled:opacity-40 disabled:shadow-none',
                canForceTestSign
                  ? 'bg-gradient-to-r from-amber-500 to-orange-600 shadow-amber-500/30 hover:shadow-amber-500/40'
                  : 'bg-gradient-to-r from-indigo-500 to-indigo-700 shadow-indigo-500/30 hover:shadow-indigo-500/40',
              )}
            >
              {signing ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <PenLine className="h-3.5 w-3.5 transition-transform group-hover:rotate-12" />}
              {canForceTestSign ? 'Firma de prueba' : 'Firmar mes'}
            </button>
          )
        }
      />

      {/* Error */}
      {error && (
        <PprAlert tone="error" onClose={() => setError(null)}>
          {error}
        </PprAlert>
      )}

      {loadingInit ? (
        <div className="space-y-4">
          <PprSkeleton className="h-10 w-full rounded-2xl" />
          <PprSkeleton className="h-16 w-full rounded-2xl" />
          <PprSkeleton className="h-96 w-full rounded-2xl" />
        </div>
      ) : (
        <>
          {/* Program tabs */}
          {programas.length > 1 && (
            <div className="flex flex-wrap items-center gap-2">
              <span className="text-[10px] font-semibold uppercase tracking-wide text-slate-400">
                Programa:
              </span>
              <div className="flex flex-wrap gap-1.5">
                {programas.map((p) => (
                  <button
                    key={p.id}
                    onClick={() => setProgramaId(p.id)}
                    className={cn(
                      'rounded-xl border px-3 py-1.5 text-xs font-medium transition',
                      programaId === p.id
                        ? 'border-indigo-500 bg-indigo-600 text-white shadow-sm shadow-indigo-500/30'
                        : 'border-slate-200 bg-white text-slate-900 hover:border-indigo-300 hover:bg-indigo-50/30',
                    )}
                  >
                    {p.code && <span className="mr-1 opacity-70">{p.code}</span>}
                    {p.name}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* No programs */}
          {programas.length === 0 && (
            <PprEmptyState
              icon={ClipboardCheck}
              title="Sin programas asignados"
              description="Contacte al administrador para que le asigne programas PPR."
            />
          )}

          {/* Progress summary */}
          {total > 0 && (
            <div className="rounded-2xl border border-slate-200 bg-white px-5 py-4">
              <div className="mb-2 flex items-center justify-between">
                <div>
                  <p className="text-[10px] font-semibold uppercase tracking-widest text-slate-400">
                    Validación del mes
                  </p>
                  <p className={cn('mt-0.5 text-lg font-bold tabular-nums', pctTextColor(pctTotal))}>
                    {pctTotal}%
                    <span className="ml-2 text-xs font-normal text-slate-500">
                      {completadas}/{total} validadas · {conValor} con valor
                    </span>
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  {savedFlash && (
                    <div className="flex items-center gap-1 rounded-full bg-emerald-50 px-2 py-1 text-[10px] font-semibold text-emerald-600 animate-ppr-fade">
                      <CheckCircle2 className="h-3 w-3" />
                      Guardado
                    </div>
                  )}
                  {saving && (
                    <div className="flex items-center gap-1 rounded-full bg-sky-50 px-2 py-1 text-[10px] font-semibold text-sky-600">
                      <Save className="h-3 w-3 animate-pulse" />
                      Guardando…
                    </div>
                  )}
                </div>
              </div>
              <PprProgressBar value={pctTotal} size="md" />
            </div>
          )}

          {/* Activities — table on lg+, cards on mobile */}
          {programaId !== null && (
            <>
              {loadingActs ? (
                <div className="space-y-3">
                  {Array.from({ length: 4 }).map((_, i) => (
                    <PprSkeleton key={i} className="h-16 w-full rounded-2xl" />
                  ))}
                </div>
              ) : actividades.length === 0 ? (
                <PprEmptyState
                  icon={ClipboardCheck}
                  title="Sin actividades registradas"
                  description="No hay actividades para este programa y período."
                />
              ) : (
                <>
                  {/* Mobile cards */}
                  <div className="ppr-stagger space-y-2.5 lg:hidden">
                    {actividades.map((act) => (
                      <ActividadCard
                        key={act.id}
                        actividad={act}
                        disabled={signed || !(periodo?.isOpen ?? false)}
                        onChange={handleValorChange}
                        onValidate={handleValidar}
                        validating={validatingId === act.id}
                      />
                    ))}
                  </div>

                  {/* Desktop table */}
                  <div className="hidden overflow-hidden rounded-2xl border border-slate-200 bg-white lg:block">
                    <div className="overflow-x-auto">
                      <table className="w-full text-sm">
                        <thead>
                          <tr className="border-b border-slate-200 bg-slate-50">
                            <th className="py-3 pl-4 pr-2 text-left text-xs font-semibold text-slate-900">Actividad</th>
                            <th className="px-2 py-3 text-center text-xs font-semibold text-slate-900">Unidad</th>
                            <th className="px-2 py-3 text-center text-xs font-semibold text-slate-900">Meta anual</th>
                            <th className="px-2 py-3 text-center text-xs font-semibold text-slate-900">Valor mes</th>
                            <th className="px-2 py-3 text-left text-xs font-semibold text-slate-900">Observaciones</th>
                            <th className="px-2 py-3 text-center text-xs font-semibold text-slate-900">Estado</th>
                            <th className="px-2 py-3 text-center text-xs font-semibold text-slate-900">% Avance</th>
                            <th className="px-3 py-3 text-center text-xs font-semibold text-slate-900">Validación</th>
                          </tr>
                        </thead>
                        <tbody>
                          {actividades.map((act) => (
                            <ActividadRow
                              key={act.id}
                              actividad={act}
                              disabled={signed || !(periodo?.isOpen ?? false)}
                              onChange={handleValorChange}
                              onValidate={handleValidar}
                              validating={validatingId === act.id}
                            />
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                </>
              )}
            </>
          )}

          {periodo && !periodo.isOpen && (
            <p className="text-center text-xs text-slate-400">
              Este período está cerrado. Solo lectura.
            </p>
          )}
        </>
      )}
    </div>
  )
}
