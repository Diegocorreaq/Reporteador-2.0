import { useEffect, useMemo, useState } from 'react'
import { AlertCircle, CheckCircle2, Database, Loader2, Play, RefreshCw, ShieldAlert, X } from 'lucide-react'
import { usePprContext } from '@/modules/ppr/context/ppr-context'
import {
  fetchImportSources,
  fetchPeriodoActivo,
  fetchProgramasAdmin,
  runImportCarga,
} from '@/modules/ppr/services/ppr.service'
import type { PprImportResult, PprImportSource, PprPeriodo, PprProgramaAdmin } from '@/modules/ppr/types'
import { PprAlert, PprEmptyState, PprPill, PprSectionHeader, PprSkeleton } from '@/modules/ppr/components/ui-primitives'
import { cn } from '@/lib/utils'

function errorMessage(error: unknown, fallback: string) {
  if (typeof error === 'object' && error && 'response' in error) {
    const response = (error as { response?: { data?: { message?: string } } }).response
    return response?.data?.message ?? fallback
  }
  return fallback
}

function normalizeProgramCode(value: string | number | null | undefined) {
  const normalized = String(value ?? '').trim().replace(/^0+/, '')
  return normalized || '0'
}

function sourceMatchesProgram(source: PprImportSource, programa: PprProgramaAdmin | null) {
  if (!programa) return false
  if (!source.programCodes || source.programCodes.length === 0) return true
  const programCode = normalizeProgramCode(programa.code)
  return source.programCodes.map(normalizeProgramCode).includes(programCode)
}

export function PprAdminCargaPage() {
  const { pprUser } = usePprContext()
  const [periodo, setPeriodo] = useState<PprPeriodo | null>(null)
  const [programas, setProgramas] = useState<PprProgramaAdmin[]>([])
  const [sources, setSources] = useState<PprImportSource[]>([])
  const [programId, setProgramId] = useState<number | null>(null)
  const [sourceId, setSourceId] = useState<string>('')
  const [loading, setLoading] = useState(true)
  const [running, setRunning] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [result, setResult] = useState<PprImportResult | null>(null)

  useEffect(() => {
    if (pprUser.role !== 'admin') return
    setLoading(true)
    Promise.all([
      fetchPeriodoActivo().catch(() => null),
      fetchProgramasAdmin(pprUser.employeeId),
      fetchImportSources(pprUser.employeeId),
    ])
      .then(([activePeriod, adminPrograms, importSources]) => {
        setPeriodo(activePeriod)
        setProgramas(adminPrograms)
        setSources(importSources)
        setProgramId(adminPrograms[0]?.id ?? null)
        setSourceId(importSources[0]?.id ?? '')
      })
      .catch((loadError) => setError(errorMessage(loadError, 'No se pudo cargar la configuración de carga.')))
      .finally(() => setLoading(false))
  }, [pprUser.employeeId, pprUser.role])

  const selectedProgram = useMemo(
    () => programas.find((programa) => programa.id === programId) ?? null,
    [programas, programId],
  )
  const compatibleSources = useMemo(
    () => sources.filter((source) => sourceMatchesProgram(source, selectedProgram)),
    [selectedProgram, sources],
  )
  const selectedSource = compatibleSources.find((source) => source.id === sourceId) ?? null
  const canRun = Boolean(periodo?.isOpen && selectedProgram && selectedSource && !running)

  useEffect(() => {
    if (compatibleSources.length === 0) {
      setSourceId('')
      return
    }
    if (!compatibleSources.some((source) => source.id === sourceId)) {
      setSourceId(compatibleSources[0].id)
    }
  }, [compatibleSources, sourceId])

  async function handleRun() {
    if (!selectedProgram || !selectedSource) return
    setRunning(true)
    setError(null)
    setResult(null)
    try {
      const importResult = await runImportCarga(selectedProgram.id, selectedSource.id, pprUser.employeeId)
      setResult(importResult)
    } catch (runError) {
      setError(errorMessage(runError, 'No se pudo ejecutar la carga mensual.'))
    } finally {
      setRunning(false)
    }
  }

  if (pprUser.role !== 'admin') {
    return (
      <div className="flex flex-col items-center gap-3 py-20 text-center">
        <ShieldAlert className="h-10 w-10 text-slate-300" />
        <p className="text-sm font-semibold text-slate-950">Acceso restringido</p>
        <p className="max-w-xs text-xs text-slate-400">
          Esta sección es exclusiva para administradores del Portal PPR.
        </p>
      </div>
    )
  }

  return (
    <div className="space-y-5">
      <PprSectionHeader
        eyebrow="Administración"
        title="Carga mensual"
        description="Ejecuta fuentes automáticas para publicar valores pendientes de validación."
        right={
          periodo ? (
            <PprPill tone={periodo.isOpen ? 'sky' : 'slate'} icon={periodo.isOpen ? RefreshCw : AlertCircle} size="md">
              {periodo.label} · {periodo.isOpen ? 'Abierto' : 'Cerrado'}
            </PprPill>
          ) : null
        }
      />

      {error && (
        <PprAlert tone="error" icon={AlertCircle} onClose={() => setError(null)}>
          {error}
        </PprAlert>
      )}

      {loading ? (
        <div className="grid gap-4 lg:grid-cols-[18rem_1fr]">
          <PprSkeleton className="h-64 rounded-lg" />
          <PprSkeleton className="h-64 rounded-lg" />
        </div>
      ) : (
        <div className="grid gap-4 lg:grid-cols-[18rem_1fr]">
          <div className="rounded-lg border border-slate-200 bg-white p-4 shadow-[0_1px_2px_rgba(15,23,42,0.04)]">
            <p className="mb-3 text-[10px] font-semibold uppercase tracking-widest text-slate-400">
              Parámetros
            </p>

            <div className="space-y-4">
              <label className="block space-y-1.5">
                <span className="text-xs font-semibold text-slate-600">Programa</span>
                <select
                  value={programId ?? ''}
                  onChange={(event) => setProgramId(Number(event.target.value) || null)}
                  className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-xs text-slate-950 outline-none focus:border-teal-600 focus:ring-2 focus:ring-teal-600/15"
                >
                  {programas.map((programa) => (
                    <option key={programa.id} value={programa.id}>
                      {programa.code ? `${programa.code} · ` : ''}{programa.name}
                    </option>
                  ))}
                </select>
              </label>

              <label className="block space-y-1.5">
                <span className="text-xs font-semibold text-slate-600">Fuente automática</span>
                <select
                  value={sourceId}
                  onChange={(event) => setSourceId(event.target.value)}
                  className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-xs text-slate-950 outline-none focus:border-teal-600 focus:ring-2 focus:ring-teal-600/15"
                >
                  {compatibleSources.map((source) => (
                    <option key={source.id} value={source.id}>
                      {source.label}
                    </option>
                  ))}
                </select>
              </label>

              {!selectedSource && selectedProgram && (
                <div className="rounded-lg border border-amber-200 bg-amber-50 px-3 py-2">
                  <p className="text-[11px] font-semibold text-amber-800">
                    Este programa aún no tiene fuente automática registrada.
                  </p>
                  <p className="mt-1 text-[11px] text-amber-700">
                    Se puede mantener la carga manual o crear su procedimiento `usp_PPR_*`.
                  </p>
                </div>
              )}

              {selectedSource && (
                <div className="rounded-lg bg-slate-50 px-3 py-2">
                  <p className="text-[10px] font-semibold uppercase tracking-wide text-slate-400">
                    Procedimiento
                  </p>
                  <p className="mt-1 break-all font-mono text-[11px] text-slate-700">
                    {selectedSource.procedureName}
                  </p>
                  <p className="mt-2 text-[11px] text-slate-500">{selectedSource.description}</p>
                </div>
              )}

              <button
                onClick={handleRun}
                disabled={!canRun}
                className={cn(
                  'flex w-full items-center justify-center gap-2 rounded-lg px-4 py-2.5 text-xs font-semibold text-white transition',
                  canRun
                    ? 'bg-teal-700 hover:bg-teal-800'
                    : 'cursor-not-allowed bg-slate-300',
                )}
              >
                {running ? <Loader2 className="h-4 w-4 animate-spin" /> : <Play className="h-4 w-4" />}
                Ejecutar carga
              </button>
            </div>
          </div>

          <div className="rounded-lg border border-slate-200 bg-white p-5 shadow-[0_1px_2px_rgba(15,23,42,0.04)]">
            {!periodo?.isOpen ? (
              <PprEmptyState
                icon={AlertCircle}
                title="Sin período abierto"
                description="La carga mensual solo se ejecuta sobre el período activo abierto."
              />
            ) : !result ? (
              <div className="flex min-h-64 flex-col items-center justify-center gap-3 text-center">
                <div className="flex h-14 w-14 items-center justify-center rounded-lg bg-teal-50">
                  <Database className="h-7 w-7 text-teal-700" />
                </div>
                <div>
                  <p className="text-sm font-semibold text-slate-950">Lista para ejecutar</p>
                  <p className="mt-1 max-w-md text-xs text-slate-500">
                    La carga sobrescribirá los valores del período activo para el programa seleccionado y los dejará pendientes de validación.
                  </p>
                </div>
              </div>
            ) : (
              <div className="space-y-5">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <div className="flex items-center gap-2">
                      <CheckCircle2 className="h-5 w-5 text-emerald-500" />
                      <p className="text-sm font-bold text-slate-950">Carga completada</p>
                    </div>
                    <p className="mt-1 text-xs text-slate-500">
                      {result.periodLabel} · {result.sourceLabel}
                    </p>
                  </div>
                  <button
                    onClick={() => setResult(null)}
                    className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-600"
                    aria-label="Limpiar resultado"
                  >
                    <X className="h-4 w-4" />
                  </button>
                </div>

                <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
                  {[
                    { label: 'Filas SP', value: result.rowsRead, tone: 'text-slate-700' },
                    { label: 'Cruzadas', value: result.rowsMatched, tone: 'text-emerald-600' },
                    { label: 'Actualizadas', value: result.rowsUpdated, tone: 'text-amber-600' },
                    { label: 'No cruzadas', value: result.rowsUnmatched, tone: 'text-rose-600' },
                  ].map((item) => (
                    <div key={item.label} className="rounded-lg border border-slate-200 bg-slate-50 px-4 py-3">
                      <p className={cn('text-2xl font-bold tabular-nums', item.tone)}>{item.value}</p>
                      <p className="text-[10px] font-semibold uppercase tracking-wide text-slate-400">
                        {item.label}
                      </p>
                    </div>
                  ))}
                </div>

                <div className="grid gap-3 lg:grid-cols-2">
                  <div className="rounded-lg border border-slate-200">
                    <div className="border-b border-slate-200 px-3 py-2">
                      <p className="text-xs font-semibold text-slate-950">Filas del SP no cruzadas</p>
                    </div>
                    <div className="max-h-48 overflow-y-auto p-3">
                      {result.unmatchedSourceRows.length === 0 ? (
                        <p className="text-xs text-slate-400">Todas las filas del SP cruzaron con actividades.</p>
                      ) : (
                        <div className="space-y-1.5">
                          {result.unmatchedSourceRows.map((row) => (
                            <div key={row.sourceKey} className="flex justify-between rounded-lg bg-rose-50 px-2 py-1.5 text-xs">
                              <span className="font-mono text-rose-700">{row.sourceKey}</span>
                              <span className="font-semibold tabular-nums text-rose-700">{row.sourceValue}</span>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>

                  <div className="rounded-lg border border-slate-200">
                    <div className="border-b border-slate-200 px-3 py-2">
                      <p className="text-xs font-semibold text-slate-950">Pendientes de automatizacion o manuales</p>
                    </div>
                    <div className="max-h-48 overflow-y-auto p-3">
                      {result.manualActivities.length === 0 ? (
                        <p className="text-xs text-slate-400">Todas las actividades recibieron valor automático.</p>
                      ) : (
                        <div className="space-y-1.5">
                          {result.manualActivities.map((activity) => (
                            <div key={activity.activityId} className="rounded-lg bg-slate-50 px-2 py-1.5">
                              <p className="text-xs text-slate-700">{activity.activityName}</p>
                              {activity.sourceKey && (
                                <p className="font-mono text-[10px] text-slate-400">{activity.sourceKey}</p>
                              )}
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  )
}
