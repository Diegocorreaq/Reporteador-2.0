import { useEffect, useRef, useState } from 'react'
import { ArrowLeft, CheckCircle2, ClipboardCheck, Loader2, PenLine } from 'lucide-react'
import { Link, useLocation } from 'react-router-dom'
import { usePprContext } from '@/modules/ppr/context/ppr-context'
import {
  fetchActividades,
  fetchPeriodoActivo,
  fetchProgramas,
  firmarPeriodo,
  saveValor,
} from '@/modules/ppr/services/ppr.service'
import type { PprActividad, PprPeriodo, PprPeriodoItem, PprPrograma } from '@/modules/ppr/types'

function pctColor(pct: number) {
  if (pct >= 100) return 'text-emerald-600'
  if (pct >= 60) return 'text-amber-600'
  return 'text-red-500'
}

// ---------------------------------------------------------------------------
// Activity row
// ---------------------------------------------------------------------------

interface ActividadRowProps {
  actividad: PprActividad
  disabled: boolean
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
      <td className="py-2.5 pl-4 pr-2 text-xs text-[#0c2340]">
        {actividad.code && (
          <span className="mr-1.5 rounded bg-[#e8f0f8] px-1.5 py-0.5 font-mono text-[10px] text-[#3a6fa0]">
            {actividad.code}
          </span>
        )}
        {actividad.name}
      </td>
      <td className="px-2 py-2.5 text-center text-xs text-slate-400">{actividad.unit || '—'}</td>
      <td className="px-2 py-2.5 text-center text-xs text-slate-400">
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
          className="w-24 rounded-lg border border-[#ccd9e8] px-2 py-1.5 text-right text-xs focus:border-green-500 focus:outline-none disabled:cursor-not-allowed disabled:bg-slate-50"
          placeholder="0"
        />
      </td>
      <td className="px-2 py-2.5">
        <input
          type="text"
          value={notes}
          disabled={disabled}
          onChange={(e) => handleChange(val, e.target.value)}
          className="w-44 rounded-lg border border-[#ccd9e8] px-2 py-1.5 text-xs focus:border-green-500 focus:outline-none disabled:cursor-not-allowed disabled:bg-slate-50"
          placeholder="Observaciones…"
        />
      </td>
      <td className="px-2 py-2.5 text-center text-xs">
        {pct != null ? <span className={pctColor(pct)}>{pct}%</span> : <span className="text-slate-300">—</span>}
      </td>
    </tr>
  )
}

// ---------------------------------------------------------------------------
// Page
// ---------------------------------------------------------------------------

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
  const [signing, setSigning] = useState(false)
  const [signed, setSigned] = useState(false)
  const [signedAt, setSignedAt] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)

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
      setActividades((prev) => prev.map((a) => (a.id === activityId ? { ...a, value: numVal, notes } : a)))
    } catch {
      setError('Error al guardar el valor.')
    } finally {
      setSaving(false)
    }
  }

  async function handleFirmar() {
    if (!periodo) return
    setSigning(true)
    try {
      const result = await firmarPeriodo(periodo.id, pprUser.employeeId)
      setSigned(true)
      setSignedAt(result.signedAt)
      setActividades((prev) => prev.map((a) => ({ ...a, signed: true })))
    } catch {
      setError('Error al firmar el período.')
    } finally {
      setSigning(false)
    }
  }

  const completadas = actividades.filter((a) => a.value != null).length
  const total = actividades.length
  const pctTotal = total > 0 ? Math.round((completadas / total) * 100) : 0
  const canSign = !signed && completadas === total && total > 0 && (periodo?.isOpen ?? false)

  return (
    <div className="space-y-5">
      {/* Back link when navigated from períodos or programas */}
      {periodoFromNav && (
        <Link
          to="/ppr/periodos"
          className="inline-flex items-center gap-1.5 text-xs text-slate-400 hover:text-[#0c2340] transition"
        >
          <ArrowLeft className="h-3.5 w-3.5" />
          Volver a Períodos
        </Link>
      )}
      {!periodoFromNav && programaIdFromNav && (
        <Link
          to="/ppr/programas"
          className="inline-flex items-center gap-1.5 text-xs text-slate-400 hover:text-[#0c2340] transition"
        >
          <ArrowLeft className="h-3.5 w-3.5" />
          Volver a Programas
        </Link>
      )}

      {/* Header */}
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-lg font-bold text-[#0c2340]">Mis Actividades</h1>
          <p className="text-xs text-slate-400">
            {periodo ? `Período: ${periodo.label}` : 'Cargando período…'}
          </p>
        </div>

        {signed ? (
          <div className="flex items-center gap-1.5 rounded-xl border border-emerald-200 bg-emerald-50 px-3 py-2 text-xs font-medium text-emerald-700">
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
            className="flex items-center gap-1.5 rounded-xl bg-green-600 px-4 py-2 text-xs font-semibold text-white transition hover:bg-green-500 disabled:cursor-not-allowed disabled:opacity-40"
          >
            {signing ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <PenLine className="h-3.5 w-3.5" />}
            Firmar mes
          </button>
        )}
      </div>

      {/* Error */}
      {error && (
        <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-2.5 text-xs text-red-700">
          {error}{' '}
          <button className="font-semibold underline" onClick={() => setError(null)}>Cerrar</button>
        </div>
      )}

      {loadingInit ? (
        <div className="flex items-center justify-center py-20">
          <Loader2 className="h-6 w-6 animate-spin text-green-600" />
        </div>
      ) : (
        <>
          {/* Program tabs */}
          {programas.length > 1 && (
            <div className="flex flex-wrap items-center gap-2">
              <span className="text-xs font-medium text-slate-400">Programa:</span>
              <div className="flex flex-wrap gap-1.5">
                {programas.map((p) => (
                  <button
                    key={p.id}
                    onClick={() => setProgramaId(p.id)}
                    className={`rounded-xl border px-3 py-1.5 text-xs font-medium transition ${
                      programaId === p.id
                        ? 'border-green-500 bg-green-500 text-white'
                        : 'border-[#e2e8f0] bg-white text-[#0c2340] hover:border-green-300'
                    }`}
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
            <div className="flex flex-col items-center gap-3 rounded-2xl border border-dashed border-[#c8d8e8] bg-white py-16 text-center">
              <ClipboardCheck className="h-8 w-8 text-slate-300" />
              <p className="text-sm font-semibold text-[#0c2340]">Sin programas asignados</p>
              <p className="max-w-xs text-xs text-slate-400">
                Contacte al administrador para que le asigne programas PPR.
              </p>
            </div>
          )}

          {/* Progress bar */}
          {total > 0 && (
            <div className="flex items-center gap-4 rounded-2xl border border-[#e2e8f0] bg-white px-5 py-3">
              <div className="flex-1">
                <div className="mb-1.5 flex items-center justify-between text-xs">
                  <span className="font-medium text-[#0c2340]">Avance del mes</span>
                  <span className={`font-semibold ${pctColor(pctTotal)}`}>
                    {completadas}/{total} actividades ({pctTotal}%)
                  </span>
                </div>
                <div className="h-1.5 w-full overflow-hidden rounded-full bg-slate-100">
                  <div
                    className={`h-full rounded-full transition-all ${pctTotal >= 100 ? 'bg-emerald-500' : pctTotal >= 60 ? 'bg-amber-400' : 'bg-red-400'}`}
                    style={{ width: `${pctTotal}%` }}
                  />
                </div>
              </div>
              {saving && (
                <div className="flex items-center gap-1 text-xs text-slate-400">
                  <Loader2 className="h-3 w-3 animate-spin" />
                  Guardando…
                </div>
              )}
            </div>
          )}

          {/* Table */}
          {programaId !== null && (
            <div className="overflow-hidden rounded-2xl border border-[#e2e8f0] bg-white">
              {loadingActs ? (
                <div className="flex items-center justify-center py-16">
                  <Loader2 className="h-5 w-5 animate-spin text-green-600" />
                </div>
              ) : actividades.length === 0 ? (
                <div className="flex flex-col items-center gap-2 py-16 text-center">
                  <p className="text-sm font-semibold text-[#0c2340]">Sin actividades registradas</p>
                  <p className="text-xs text-slate-400">No hay actividades para este programa y período.</p>
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b border-[#e2e8f0] bg-slate-50">
                        <th className="py-3 pl-4 pr-2 text-left text-xs font-semibold text-[#0c2340]">Actividad</th>
                        <th className="px-2 py-3 text-center text-xs font-semibold text-[#0c2340]">Unidad</th>
                        <th className="px-2 py-3 text-center text-xs font-semibold text-[#0c2340]">Meta anual</th>
                        <th className="px-2 py-3 text-center text-xs font-semibold text-[#0c2340]">Valor mes</th>
                        <th className="px-2 py-3 text-left text-xs font-semibold text-[#0c2340]">Observaciones</th>
                        <th className="px-2 py-3 text-center text-xs font-semibold text-[#0c2340]">% Avance</th>
                      </tr>
                    </thead>
                    <tbody>
                      {actividades.map((act) => (
                        <ActividadRow
                          key={act.id}
                          actividad={act}
                          disabled={signed || !(periodo?.isOpen ?? false)}
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
            <p className="text-center text-xs text-slate-400">Este período está cerrado. Solo lectura.</p>
          )}
        </>
      )}
    </div>
  )
}
