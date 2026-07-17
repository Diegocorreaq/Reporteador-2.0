import { useCallback, useEffect, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import {
  AlertCircle,
  Calendar,
  ChevronRight,
  Database,
  Layers,
  RefreshCw,
  TrendingDown,
  TrendingUp,
} from 'lucide-react'
import { usePprContext } from '@/modules/ppr/context/ppr-context'
import { fetchPeriodoActivo, fetchProgramaPreliminar, fetchProgramas } from '@/modules/ppr/services/ppr.service'
import { PprProgramaDashboardContent } from '@/modules/ppr/pages/ppr-programa-dashboard-page'
import type { PprPeriodo, PprPrograma, PprProgramaPreliminar } from '@/modules/ppr/types'
import {
  PprAvatar,
  PprPill,
  PprSkeleton,
  PprSkeletonCard,
  pctBarColor,
  pctTextColor,
} from '@/modules/ppr/components/ui-primitives'
import { cn } from '@/lib/utils'

// ─── Helpers ──────────────────────────────────────────────────────────────────
const MESES = ['Enero','Febrero','Marzo','Abril','Mayo','Junio','Julio','Agosto','Septiembre','Octubre','Noviembre','Diciembre']
const PPR_PRELIMINARY_MANUAL_ONLY_PROGRAM_CODES = new Set(['16', '17'])

function greeting() {
  const h = new Date().getHours()
  if (h < 12) return 'Buenos días'
  if (h < 19) return 'Buenas tardes'
  return 'Buenas noches'
}

function formatNamePart(value: string) {
  const lower = value.toLocaleLowerCase('es-PE')
  return lower.charAt(0).toLocaleUpperCase('es-PE') + lower.slice(1)
}

function displayFirstName(employeeName: string) {
  const parts = employeeName.trim().split(/\s+/).filter(Boolean)
  if (!parts.length) return ''
  const looksLikeInstitutionalName = parts.length >= 3 && parts.every((part) => part === part.toLocaleUpperCase('es-PE'))
  return formatNamePart(looksLikeInstitutionalName ? parts[2] : parts[0])
}

function fmtNum(n: number) {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`
  if (n >= 1_000)     return `${Math.round(n / 1_000)}k`
  return n.toLocaleString('es-PE')
}

function normalizePprCode(value: string | null | undefined) {
  return String(value ?? '').trim().replace(/^0+/, '') || '0'
}

function isPreliminarUnavailable(error: unknown) {
  const response = (error as { response?: { status?: number } })?.response
  return response?.status === 404
}

function pctToneClass(value: number | null) {
  if (value == null) return 'text-slate-400'
  if (value >= 100) return 'text-emerald-700'
  if (value >= 80) return 'text-amber-700'
  return 'text-rose-700'
}

// ─── Stat card ────────────────────────────────────────────────────────────────
function StatCard({
  label, value, sub, icon: Icon, accent = 'indigo', trend,
}: {
  label: string
  value: string | number
  sub?: string
  icon: React.ElementType
  accent?: 'indigo' | 'sky' | 'amber' | 'slate' | 'rose' | 'emerald'
  trend?: 'up' | 'down' | null
}) {
  const palettes = {
    indigo:  { bg: 'bg-teal-50',        text: 'text-teal-700',    ring: 'ring-teal-200'       },
    sky:     { bg: 'bg-cyan-50',        text: 'text-cyan-700',    ring: 'ring-cyan-200'       },
    amber:   { bg: 'bg-amber-500/10',   text: 'text-amber-600',   ring: 'ring-amber-500/20'   },
    slate:   { bg: 'bg-slate-100',      text: 'text-slate-500',   ring: 'ring-slate-200/40'   },
    rose:    { bg: 'bg-rose-500/10',    text: 'text-rose-600',    ring: 'ring-rose-500/20'    },
    emerald: { bg: 'bg-emerald-500/10', text: 'text-emerald-600', ring: 'ring-emerald-500/20' },
  }[accent]
  return (
    <div className="relative overflow-hidden rounded-lg border border-slate-200 bg-white p-4 shadow-[0_1px_2px_rgba(15,23,42,0.04)] transition hover:border-slate-300">
      <div className="flex items-start gap-3">
        <div
          className={cn(
            'flex h-10 w-10 shrink-0 items-center justify-center rounded-lg ring-1',
            palettes.bg, palettes.ring,
          )}
        >
          <Icon className={cn('h-5 w-5', palettes.text)} />
        </div>
        <div className="min-w-0 flex-1">
          <p className="text-[11px] text-slate-400">{label}</p>
          <p className="mt-0.5 flex items-center gap-1.5 text-2xl font-bold leading-none text-slate-900">
            {value}
            {trend === 'up'   && <TrendingUp   className="h-4 w-4 text-emerald-500" />}
            {trend === 'down' && <TrendingDown className="h-4 w-4 text-rose-500" />}
          </p>
          {sub && <p className="mt-1 text-[10px] text-slate-400">{sub}</p>}
        </div>
      </div>
    </div>
  )
}

// ─── Programa mini card ───────────────────────────────────────────────────────
function ProgramaMiniCard({ programa, activeMonth }: { programa: PprPrograma; activeMonth: number }) {
  const navigate = useNavigate()
  const mesesCompletos = Math.max(activeMonth - 1, 0)
  const pctCorte = programa.sumMetaEsperada > 0
    ? Math.round((programa.sumLogrado / programa.sumMetaEsperada) * 100)
    : null
  const pctAnual = programa.sumMetaAnual > 0
    ? Math.round((programa.sumLogrado / programa.sumMetaAnual) * 100)
    : null
  const pctEsperadoAnual = mesesCompletos > 0
    ? Math.round((mesesCompletos / 12) * 100)
    : 0

  const mesLabel = mesesCompletos > 0 ? `Avance anual a ${MESES[mesesCompletos - 1]}` : 'Sin períodos cerrados'
  const corteLabel = mesesCompletos > 0 ? `Corte: ${pctCorte != null ? `${pctCorte}%` : '-'} de meta a ${MESES[mesesCompletos - 1]}` : 'Sin corte mensual'

  return (
    <button
      onClick={() => navigate(`/ppr/programas/${programa.id}`)}
      className="group flex w-full items-center gap-3 rounded-lg border border-slate-200 bg-white p-3.5 text-left shadow-[0_1px_2px_rgba(15,23,42,0.04)] transition hover:border-teal-300 hover:bg-teal-50/30"
    >
      <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-slate-100">
        <span className="font-mono text-[10px] font-bold text-teal-700">
          {programa.code || '—'}
        </span>
      </div>
      <div className="min-w-0 flex-1">
        <p className="truncate text-xs font-semibold text-slate-900">{programa.name}</p>
        <div className="mt-1.5 flex items-center gap-2">
          <div className="relative h-1.5 flex-1 overflow-visible rounded bg-slate-100">
            <div
              className={cn('h-full rounded transition-all duration-500',
                pctCorte != null ? pctBarColor(pctCorte) : 'bg-slate-200')}
              style={{ width: `${Math.min(pctAnual ?? 0, 100)}%` }}
            />
            {mesesCompletos > 0 && (
              <div
                className="absolute top-1/2 h-3 w-0.5 -translate-y-1/2 rounded-full bg-slate-600"
                style={{ left: `${Math.min(pctEsperadoAnual, 100)}%` }}
              />
            )}
          </div>
          <span className={cn('shrink-0 text-[11px] font-bold tabular-nums',
            pctCorte != null ? pctTextColor(pctCorte) : 'text-slate-300')}>
            {pctAnual != null ? `${pctAnual}%` : '—'}
          </span>
        </div>
        <p className="mt-1 text-[9px] text-slate-400">{mesLabel} · {corteLabel}</p>
      </div>
      <ChevronRight className="h-4 w-4 shrink-0 text-slate-300 transition-transform group-hover:translate-x-0.5 group-hover:text-teal-600" />
    </button>
  )
}

// ─── Page ─────────────────────────────────────────────────────────────────────
function CoordinatorInicioView({
  programa,
  programCount,
  periodo,
  activeMonth,
}: {
  programa: PprPrograma | null
  programCount: number
  periodo: PprPeriodo | null
  activeMonth: number
}) {
  const [preliminar, setPreliminar] = useState<PprProgramaPreliminar | null>(null)
  const [preliminarLoading, setPreliminarLoading] = useState(false)
  const [preliminarError, setPreliminarError] = useState<string | null>(null)
  const canLoadPreliminar = Boolean(programa && !PPR_PRELIMINARY_MANUAL_ONLY_PROGRAM_CODES.has(normalizePprCode(programa.code)))

  const loadPreliminar = useCallback(() => {
    if (!programa?.id || !canLoadPreliminar) {
      setPreliminar(null)
      setPreliminarError(null)
      setPreliminarLoading(false)
      return
    }

    setPreliminarLoading(true)
    setPreliminarError(null)
    fetchProgramaPreliminar(programa.id)
      .then(setPreliminar)
      .catch((fetchError: unknown) => {
        setPreliminar(null)
        if (!isPreliminarUnavailable(fetchError)) {
          setPreliminarError('No se pudo consultar el corte preliminar.')
        }
      })
      .finally(() => setPreliminarLoading(false))
  }, [canLoadPreliminar, programa?.id])

  useEffect(() => {
    loadPreliminar()
  }, [loadPreliminar])

  if (!programa) {
    return (
      <div className="rounded-lg border border-dashed border-slate-300 bg-white px-5 py-10 text-center shadow-[0_1px_2px_rgba(15,23,42,0.04)]">
        <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-lg bg-slate-100">
          <Layers className="h-6 w-6 text-slate-400" />
        </div>
        <h2 className="mt-4 text-sm font-bold text-slate-950">Sin programa asignado</h2>
        <p className="mx-auto mt-1 max-w-md text-xs leading-relaxed text-slate-500">
          Aún no tienes un programa PPR activo en tu perfil. Cuando el administrador te asigne uno, aquí aparecerá tu avance y acceso de registro.
        </p>
      </div>
    )
  }

  const mesesCompletos = Math.max(activeMonth - 1, 0)
  const pctEsperadoAnual = mesesCompletos > 0 ? Math.round((mesesCompletos / 12) * 100) : 0
  const pctCorte = programa.sumMetaEsperada > 0
    ? Math.round((programa.sumLogrado / programa.sumMetaEsperada) * 100)
    : null
  const pctAnual = programa.sumMetaAnual > 0
    ? Math.round((programa.sumLogrado / programa.sumMetaAnual) * 100)
    : null
  const registroPct = programa.totalActividades > 0
    ? Math.round((programa.conDatos / programa.totalActividades) * 100)
    : null
  const groups = programa.activityScope?.length ? programa.activityScope : programa.activityGroups ?? []
  const status = pctCorte == null
    ? { label: 'Sin corte', tone: 'slate' as const, text: 'text-slate-600', bar: 'bg-slate-300' }
    : pctCorte >= 100
      ? { label: 'En meta', tone: 'emerald' as const, text: 'text-emerald-700', bar: 'bg-emerald-500' }
      : pctCorte >= 80
        ? { label: 'En seguimiento', tone: 'amber' as const, text: 'text-amber-700', bar: 'bg-amber-500' }
        : { label: 'Crítico', tone: 'rose' as const, text: 'text-rose-700', bar: 'bg-rose-500' }

  return (
    <div className="space-y-5">
      <div className="rounded-lg border border-slate-200 bg-white p-5 shadow-[0_1px_2px_rgba(15,23,42,0.04)]">
        <div className="flex flex-col gap-5 lg:flex-row lg:items-start lg:justify-between">
          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-center gap-2">
              {programa.code && (
                <span className="rounded bg-slate-100 px-2 py-1 font-mono text-[11px] font-bold text-teal-700">
                  {programa.code}
                </span>
              )}
              <PprPill tone={status.tone}>{status.label}</PprPill>
              {programCount > 1 && (
                <PprPill tone="sky">{programCount} programas asignados</PprPill>
              )}
            </div>
            <h2 className="mt-3 text-xl font-bold leading-tight text-slate-950">
              {programa.name}
            </h2>
            <p className="mt-1 text-xs text-slate-500">
              {periodo?.isOpen
                ? `Periodo ${periodo.label} abierto para registrar avance.`
                : periodo
                  ? `Periodo ${periodo.label} cerrado.`
                  : 'Sin periodo activo disponible.'}
            </p>
          </div>

          <div className="grid grid-cols-1 gap-2 sm:w-auto sm:min-w-[140px]">
            <Link
              to={`/ppr/programas/${programa.id}`}
              className="flex items-center justify-between rounded-lg border border-slate-200 px-3 py-2.5 text-xs font-semibold text-slate-700 transition hover:border-teal-300 hover:bg-teal-50 hover:text-teal-700"
            >
              Detalle
              <ChevronRight className="h-4 w-4" />
            </Link>
          </div>
        </div>

        <div className="mt-5 grid gap-4 lg:grid-cols-[1.2fr_0.8fr]">
          <div>
            <div className="mb-2 flex items-end justify-between gap-3">
              <div>
                <p className="text-[10px] font-bold uppercase tracking-[0.16em] text-slate-400">
                  Avance del corte
                </p>
                <p className={cn('mt-1 text-3xl font-bold tabular-nums', pctCorte != null ? status.text : 'text-slate-400')}>
                  {pctCorte != null ? `${pctCorte}%` : '—'}
                </p>
              </div>
              <div className="text-right">
                <p className="text-[10px] text-slate-400">Logrado / esperado</p>
                <p className="text-xs font-semibold text-slate-900">
                  {fmtNum(programa.sumLogrado)} / {fmtNum(programa.sumMetaEsperada)}
                </p>
              </div>
            </div>
            <div className="h-3 overflow-hidden rounded bg-slate-100">
              <div
                className={cn('h-full rounded transition-all duration-500', pctCorte != null ? status.bar : 'bg-slate-300')}
                style={{ width: `${Math.min(pctCorte ?? 0, 100)}%` }}
              />
            </div>
            <div className="mt-2 flex items-center justify-between text-[10px] text-slate-400">
              <span>{mesesCompletos > 0 ? `Corte a ${MESES[mesesCompletos - 1]}` : 'Sin corte mensual'}</span>
              <span>Referencia anual: {pctEsperadoAnual}%</span>
            </div>
          </div>

          <div className="rounded-lg bg-slate-50 p-3">
            <p className="text-[10px] font-bold uppercase tracking-[0.16em] text-slate-400">
              Registro del mes
            </p>
            <div className="mt-2 flex items-end justify-between gap-3">
              <div>
                <p className="text-2xl font-bold text-slate-950">
                  {programa.conDatos}/{programa.totalActividades}
                </p>
                <p className="text-[11px] text-slate-500">actividades con valor</p>
              </div>
              <p className="text-sm font-bold text-teal-700">
                {registroPct != null ? `${registroPct}%` : '—'}
              </p>
            </div>
            <div className="mt-3 h-2 overflow-hidden rounded bg-white">
              <div
                className="h-full rounded bg-teal-600 transition-all duration-500"
                style={{ width: `${Math.min(registroPct ?? 0, 100)}%` }}
              />
            </div>
          </div>
        </div>
      </div>

      {(preliminarLoading || preliminar || preliminarError) && (
        <div className="rounded-lg border border-cyan-200 bg-white p-4 shadow-[0_1px_2px_rgba(15,23,42,0.04)]">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
            <div>
              <div className="flex flex-wrap items-center gap-2">
                <span className="inline-flex items-center gap-1.5 rounded bg-cyan-50 px-2 py-1 text-[10px] font-bold uppercase tracking-wide text-cyan-700">
                  <Database className="h-3 w-3" />
                  Preliminar diario
                </span>
                <span className="rounded bg-slate-100 px-2 py-1 text-[10px] font-semibold text-slate-500">
                  No consolida
                </span>
              </div>
              <h3 className="mt-2 text-sm font-bold text-slate-950">
                Corte de fuente institucional
              </h3>
              <p className="mt-1 text-xs text-slate-500">
                {preliminar
                  ? `Corte ${preliminar.cutoffLabel}. ${preliminar.rangeStart} a ${preliminar.rangeEnd}.`
                  : 'Consultando el ultimo corte disponible.'}
              </p>
            </div>
            <button
              onClick={loadPreliminar}
              disabled={preliminarLoading}
              className="inline-flex items-center justify-center gap-1.5 rounded-lg border border-slate-200 px-3 py-2 text-xs font-semibold text-slate-700 transition hover:border-cyan-300 hover:bg-cyan-50 hover:text-cyan-700 disabled:opacity-50"
            >
              <RefreshCw className={cn('h-3.5 w-3.5', preliminarLoading && 'animate-spin')} />
              Actualizar
            </button>
          </div>

          {preliminarLoading && !preliminar ? (
            <div className="mt-4 grid gap-3 sm:grid-cols-3">
              {Array.from({ length: 3 }).map((_, index) => (
                <div key={index} className="h-16 animate-pulse rounded-lg bg-slate-100" />
              ))}
            </div>
          ) : preliminarError ? (
            <div className="mt-4 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-700">
              {preliminarError}
            </div>
          ) : preliminar ? (
            <>
              <div className="mt-4 grid gap-3 sm:grid-cols-4">
                <div className="rounded-lg bg-slate-50 p-3">
                  <p className="text-[10px] font-semibold uppercase tracking-wide text-slate-400">Logro preliminar</p>
                  <p className="mt-1 text-xl font-bold text-slate-950">{fmtNum(preliminar.totalValue)}</p>
                </div>
                <div className="rounded-lg bg-slate-50 p-3">
                  <p className="text-[10px] font-semibold uppercase tracking-wide text-slate-400">Meta al corte</p>
                  <p className="mt-1 text-xl font-bold text-slate-950">{fmtNum(preliminar.monthlyGoal)}</p>
                </div>
                <div className="rounded-lg bg-slate-50 p-3">
                  <p className="text-[10px] font-semibold uppercase tracking-wide text-slate-400">Cumplimiento</p>
                  <p className={cn('mt-1 text-xl font-bold', pctToneClass(preliminar.monthlyGoalPct))}>
                    {preliminar.monthlyGoalPct != null ? `${preliminar.monthlyGoalPct}%` : '—'}
                  </p>
                </div>
                <div className="rounded-lg bg-slate-50 p-3">
                  <p className="text-[10px] font-semibold uppercase tracking-wide text-slate-400">Vinculadas</p>
                  <p className="mt-1 text-xl font-bold text-slate-950">{preliminar.rowsMatched}/{preliminar.totalActivities}</p>
                </div>
              </div>
              <div className="mt-3 h-2 overflow-hidden rounded bg-slate-100">
                <div
                  className={cn(
                    'h-full rounded transition-all',
                    preliminar.monthlyGoalPct == null
                      ? 'bg-slate-300'
                      : preliminar.monthlyGoalPct >= 100
                        ? 'bg-emerald-500'
                        : preliminar.monthlyGoalPct >= 80
                          ? 'bg-amber-500'
                          : 'bg-rose-500',
                  )}
                  style={{ width: `${Math.min(preliminar.monthlyGoalPct ?? 0, 100)}%` }}
                />
              </div>
              {preliminar.manualActivities.length > 0 && (
                <div className="mt-3 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-800">
                  <span className="font-semibold">{preliminar.manualActivities.length} pendientes de automatizacion.</span>
                  <span className="ml-1 text-amber-700">El resto se muestra con fuente institucional.</span>
                </div>
              )}
            </>
          ) : null}
        </div>
      )}

      <div className="grid gap-4 lg:grid-cols-3">
        <div className="rounded-lg border border-slate-200 bg-white p-4 shadow-[0_1px_2px_rgba(15,23,42,0.04)]">
          <p className="text-[10px] font-bold uppercase tracking-[0.16em] text-slate-400">Meta anual</p>
          <p className="mt-2 text-2xl font-bold text-slate-950">{pctAnual != null ? `${pctAnual}%` : '—'}</p>
          <p className="mt-1 text-[11px] text-slate-500">
            {fmtNum(programa.sumLogrado)} de {fmtNum(programa.sumMetaAnual)}
          </p>
        </div>

        <div className="rounded-lg border border-slate-200 bg-white p-4 shadow-[0_1px_2px_rgba(15,23,42,0.04)]">
          <p className="text-[10px] font-bold uppercase tracking-[0.16em] text-slate-400">Periodo activo</p>
          <p className="mt-2 text-lg font-bold text-slate-950">{periodo?.label ?? '—'}</p>
          <p className="mt-1 text-[11px] text-slate-500">
            {periodo?.isOpen ? 'Disponible para registro mensual' : 'No disponible para registro'}
          </p>
        </div>

        <div className="rounded-lg border border-slate-200 bg-white p-4 shadow-[0_1px_2px_rgba(15,23,42,0.04)]">
          <p className="text-[10px] font-bold uppercase tracking-[0.16em] text-slate-400">Actividades</p>
          <p className="mt-2 text-2xl font-bold text-slate-950">{programa.totalActividades}</p>
          <p className="mt-1 text-[11px] text-slate-500">
            {groups.length > 0 ? `${groups.length} grupos de trabajo` : 'Sin grupos definidos'}
          </p>
        </div>
      </div>

      {groups.length > 0 && (
        <div className="rounded-lg border border-slate-200 bg-white p-4 shadow-[0_1px_2px_rgba(15,23,42,0.04)]">
          <p className="text-[10px] font-bold uppercase tracking-[0.16em] text-slate-400">
            Grupos incluidos
          </p>
          <div className="mt-3 flex flex-wrap gap-2">
            {groups.map((group) => (
              <span key={group.code} className="rounded bg-cyan-50 px-2.5 py-1 text-[11px] font-semibold text-cyan-700">
                {group.name}
              </span>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}

export function PprInicioPage() {
  const { pprUser } = usePprContext()
  const navigate = useNavigate()
  const now = new Date()
  const currentMonth = now.getMonth() + 1
  const todayLabel   = now.toLocaleDateString('es-PE', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })

  const [periodo, setPeriodo] = useState<PprPeriodo | null>(null)
  const [programas, setProgramas] = useState<PprPrograma[]>([])
  const [selectedProgramId, setSelectedProgramId] = useState<number | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    Promise.all([
      fetchPeriodoActivo().catch(() => null),
      fetchProgramas(pprUser.employeeId).catch(() => []),
    ]).then(([per, progs]) => {
      setPeriodo(per)
      setProgramas(progs)
    }).finally(() => setLoading(false))
  }, [pprUser.employeeId])

  useEffect(() => {
    if (pprUser.role === 'admin') return
    if (!programas.length) {
      setSelectedProgramId(null)
      return
    }

    setSelectedProgramId((current) => {
      if (current && programas.some((programa) => programa.id === current)) return current
      const sorted = [...programas].sort((a, b) => {
        const pa = a.sumMetaEsperada > 0 ? a.sumLogrado / a.sumMetaEsperada : 1
        const pb = b.sumMetaEsperada > 0 ? b.sumLogrado / b.sumMetaEsperada : 1
        return pa - pb
      })
      return sorted[0]?.id ?? programas[0].id
    })
  }, [programas, pprUser.role])

  // Derived stats
  const activeMonth = periodo?.month ?? currentMonth
  const mesesCompletos = Math.max(activeMonth - 1, 0)
  const totalLogrado = programas.reduce((s, p) => s + p.sumLogrado, 0)
  const totalMetaEsperada = programas.reduce((s, p) => s + p.sumMetaEsperada, 0)
  const totalMetaAnual = programas.reduce((s, p) => s + p.sumMetaAnual, 0)
  const pctCorte = totalMetaEsperada > 0
    ? Math.round((totalLogrado / totalMetaEsperada) * 100)
    : null
  const pctAnual = totalMetaAnual > 0
    ? Math.round((totalLogrado / totalMetaAnual) * 100)
    : null
  const pctEsperadoAnual = mesesCompletos > 0
    ? Math.round((mesesCompletos / 12) * 100)
    : 0

  const programasAdelantados = programas.filter((p) =>
    p.sumMetaEsperada > 0 && (p.sumLogrado / p.sumMetaEsperada) >= 1,
  ).length
  const programasConCorte = programas.filter((p) => p.sumMetaEsperada > 0)
  const programasAtrasados = programasConCorte.filter((p) => (p.sumLogrado / p.sumMetaEsperada) < 0.8).length
  const programasEnSeguimiento = programasConCorte.filter((p) => {
    const ratio = p.sumLogrado / p.sumMetaEsperada
    return ratio >= 0.8 && ratio < 1
  }).length
  const programasSinCorte = programas.length - programasConCorte.length
  const programasConAvance = programas.filter((p) => p.sumLogrado > 0).length
  const corteItems = [
    {
      label: 'En meta',
      value: programasAdelantados,
      detail: '100% o más del corte',
      dot: 'bg-emerald-500',
      text: 'text-emerald-700',
    },
    {
      label: 'En seguimiento',
      value: programasEnSeguimiento,
      detail: '80% a 99% del corte',
      dot: 'bg-amber-500',
      text: 'text-amber-700',
    },
    {
      label: 'Críticos',
      value: programasAtrasados,
      detail: 'Menos del 80% del corte',
      dot: 'bg-rose-500',
      text: 'text-rose-700',
    },
    {
      label: 'Sin corte',
      value: programasSinCorte,
      detail: 'Sin meta esperada cargada',
      dot: 'bg-slate-300',
      text: 'text-slate-600',
    },
  ]

  // Sorted: atrasados primero
  const programasSorted = [...programas].sort((a, b) => {
    const pa = a.sumMetaEsperada > 0 ? a.sumLogrado / a.sumMetaEsperada : 1
    const pb = b.sumMetaEsperada > 0 ? b.sumLogrado / b.sumMetaEsperada : 1
    return pa - pb
  })

  const isAdmin = pprUser.role === 'admin'
  const selectedCoordinatorProgram = programasSorted.find((programa) => programa.id === selectedProgramId)
    ?? programasSorted[0]
    ?? null
  const evaluationYear = now.getFullYear()
  const evaluationMonth = currentMonth
  const canRegisterData = Boolean(periodo?.isOpen && selectedCoordinatorProgram)
  return (
    <div className="space-y-6">
      {/* ── Hero header ── */}
      <div className="rounded-lg border border-slate-200 bg-white px-4 py-4 shadow-[0_1px_2px_rgba(15,23,42,0.04)] sm:px-5">
        <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
          <div className="flex items-start gap-4">
            <PprAvatar
              name={pprUser.employeeName}
              size="lg"
              tone={isAdmin ? 'amber' : 'green'}
            />
            <div>
              <p className="text-[11px] capitalize text-slate-400">{todayLabel}</p>
              <h1 className="mt-0.5 text-xl font-bold leading-tight text-slate-950">
                {greeting()}, {displayFirstName(pprUser.employeeName)}
              </h1>
              <p className="text-xs text-slate-500">{pprUser.employeeName}</p>
              <div className="mt-2.5 flex flex-wrap items-center gap-2">
                <PprPill tone={isAdmin ? 'amber' : 'indigo'}>
                  {isAdmin ? 'Administrador PPR' : 'Coordinador PPR'}
                </PprPill>
                {periodo && (
                  <PprPill tone="sky" icon={Calendar}>
                    Período: {periodo.label}
                  </PprPill>
                )}
                {periodo?.isOpen && (
                  <PprPill tone="emerald">
                    <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
                    Abierto para registro
                  </PprPill>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>

      {loading ? (
        <>
          {/* KPI skeletons */}
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
            {Array.from({ length: 4 }).map((_, i) => (
              <div key={i} className="space-y-3 rounded-lg border border-slate-200 bg-white p-4">
                <div className="flex gap-3">
                  <PprSkeleton className="h-10 w-10 rounded-lg" />
                  <div className="flex-1 space-y-2">
                    <PprSkeleton className="h-2 w-2/3" />
                    <PprSkeleton className="h-5 w-1/2" />
                  </div>
                </div>
              </div>
            ))}
          </div>

          {/* Body skeletons */}
          <div className="grid grid-cols-1 gap-5 lg:grid-cols-3">
            <div className="space-y-2 lg:col-span-2">
              <PprSkeleton className="h-3 w-32" />
              {Array.from({ length: 3 }).map((_, i) => <PprSkeletonCard key={i} />)}
            </div>
            <div className="space-y-2">
              <PprSkeleton className="h-3 w-32" />
              {Array.from({ length: 4 }).map((_, i) => (
                <PprSkeleton key={i} className="h-16 w-full rounded-lg" />
              ))}
            </div>
          </div>
        </>
      ) : !isAdmin ? (
        selectedCoordinatorProgram ? (
          <div className="space-y-5">
            <div className="rounded-lg border border-slate-200 bg-white p-4 shadow-[0_1px_2px_rgba(15,23,42,0.04)] sm:p-5">
              <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
                <div className="min-w-0">
                  <p className="text-[10px] font-bold uppercase tracking-[0.16em] text-slate-400">
                    Dashboard del coordinador
                  </p>
                  <div className="mt-2 flex flex-wrap items-center gap-2">
                    {selectedCoordinatorProgram.code && (
                      <span className="rounded bg-slate-100 px-2 py-1 font-mono text-[11px] font-bold text-teal-700">
                        {selectedCoordinatorProgram.code}
                      </span>
                    )}
                    <h2 className="text-base font-bold leading-tight text-slate-950 sm:text-lg">
                      {selectedCoordinatorProgram.name}
                    </h2>
                  </div>
                  <p className="mt-1 text-xs text-slate-500">
                    {periodo?.isOpen
                      ? `Periodo ${periodo.label} abierto para ingresar datos.`
                      : periodo
                        ? `Periodo ${periodo.label} cerrado para registro.`
                        : 'Sin periodo activo disponible.'}
                  </p>
                </div>

                <div className="flex flex-col gap-2 sm:flex-row sm:items-center lg:justify-end">
                  {programasSorted.length > 1 && (
                    <label className="flex items-center gap-2 rounded-lg border border-slate-200 bg-slate-50 px-3 py-2">
                      <span className="text-[10px] font-bold uppercase tracking-wide text-slate-400">
                        Programa
                      </span>
                      <select
                        value={selectedCoordinatorProgram.id}
                        onChange={(event) => setSelectedProgramId(Number(event.target.value))}
                        className="max-w-[260px] bg-transparent text-xs font-semibold text-slate-900 outline-none"
                      >
                        {programasSorted.map((programa) => (
                          <option key={programa.id} value={programa.id}>
                            {programa.code ? `${programa.code} - ` : ''}{programa.name}
                          </option>
                        ))}
                      </select>
                    </label>
                  )}

                  <Link
                    to={`/ppr/evaluacion-mensual?programId=${selectedCoordinatorProgram.id}&year=${evaluationYear}&month=${evaluationMonth}`}
                    className="inline-flex items-center justify-center gap-1.5 rounded-lg border border-slate-200 px-3 py-2 text-xs font-semibold text-slate-700 transition hover:border-teal-300 hover:bg-teal-50 hover:text-teal-700"
                  >
                    Evaluación mensual
                    <ChevronRight className="h-3.5 w-3.5" />
                  </Link>

                  {canRegisterData ? (
                    <Link
                      to="/ppr/actividades"
                      state={{ programaId: selectedCoordinatorProgram.id }}
                      className="inline-flex items-center justify-center gap-1.5 rounded-lg bg-teal-700 px-3 py-2 text-xs font-semibold text-white transition hover:bg-teal-800"
                    >
                      Ingresar datos
                      <ChevronRight className="h-3.5 w-3.5" />
                    </Link>
                  ) : (
                    <span className="inline-flex cursor-not-allowed items-center justify-center gap-1.5 rounded-lg bg-slate-100 px-3 py-2 text-xs font-semibold text-slate-400">
                      Ingresar datos
                      <ChevronRight className="h-3.5 w-3.5" />
                    </span>
                  )}
                </div>
              </div>
            </div>

            <PprProgramaDashboardContent programId={selectedCoordinatorProgram.id} embedded />
          </div>
        ) : (
          <CoordinatorInicioView
            programa={null}
            programCount={programas.length}
            periodo={periodo}
            activeMonth={activeMonth}
          />
        )
      ) : (
        <>
          {/* ── Alerts ── */}
          <div className="space-y-2">
            {programasAtrasados > 0 && (
              <div className="animate-ppr-fade flex items-start gap-3 rounded-lg border border-rose-200 bg-rose-50 px-4 py-3.5">
                <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-rose-100">
                  <TrendingDown className="h-4 w-4 text-rose-600" />
                </div>
                <div className="flex-1">
                  <p className="text-xs font-semibold text-rose-800">
                    {programasAtrasados} programa{programasAtrasados > 1 ? 's' : ''} por debajo del 80%
                  </p>
                  <p className="mt-0.5 text-[11px] text-rose-700">
                    Revisa el avance de tus programas con menor progreso.
                  </p>
                </div>
                <Link
                  to="/ppr/programas"
                  className="shrink-0 self-center rounded-lg bg-rose-600 px-3 py-1.5 text-[11px] font-semibold text-white transition hover:bg-rose-700"
                >
                  Ver programas
                </Link>
              </div>
            )}
          </div>

          {/* ── KPIs ── */}
          <div className="ppr-stagger grid grid-cols-2 gap-3 sm:grid-cols-4">
            <StatCard
              label="Programas asignados"
              value={programas.length}
              sub={`${programasConAvance} con avance`}
              icon={Layers}
              accent="indigo"
            />
            <StatCard
              label={mesesCompletos > 0 ? `Avance anual a ${MESES[mesesCompletos - 1]}` : 'Avance anual'}
              value={pctAnual != null ? `${pctAnual}%` : '—'}
              sub={`${pctEsperadoAnual}% esperado al corte`}
              icon={pctCorte != null && pctCorte >= 80 ? TrendingUp : TrendingDown}
              accent={pctCorte == null ? 'slate' : pctCorte >= 100 ? 'emerald' : pctCorte >= 80 ? 'amber' : 'rose'}
              trend={pctCorte == null ? null : pctCorte >= 80 ? 'up' : 'down'}
            />
            <StatCard
              label="Programas críticos"
              value={programasAtrasados}
              sub="Bajo 80% del corte"
              icon={AlertCircle}
              accent={programasAtrasados > 0 ? 'rose' : 'emerald'}
            />
            <StatCard
              label="Período activo"
              value={periodo?.label ?? '—'}
              sub={periodo?.isOpen ? 'Abierto para registro' : 'Cerrado'}
              icon={Calendar}
              accent={periodo?.isOpen ? 'emerald' : 'slate'}
            />
          </div>

          {/* ── Annual progress strip ── */}
          {pctAnual != null && (
            <div className="rounded-lg border border-slate-200 bg-white p-5 shadow-[0_1px_2px_rgba(15,23,42,0.04)]">
              <div className="mb-2 flex items-center justify-between">
                <div>
                  <p className="text-[10px] font-semibold uppercase tracking-widest text-slate-400">
                    Avance anual al último envío
                  </p>
                  <p className={cn('mt-1 text-3xl font-bold tabular-nums', pctTextColor(pctCorte ?? 0))}>
                    {pctAnual}%
                  </p>
                  <p className="mt-1 text-[11px] text-slate-500">
                    {mesesCompletos > 0 ? `${pctEsperadoAnual}% esperado a ${MESES[mesesCompletos - 1]}` : 'Sin corte mensual'}
                  </p>
                </div>
                <div className="text-right">
                  <p className="text-[10px] text-slate-400">Cumplimiento del corte</p>
                  <p className="text-sm font-semibold text-slate-900">
                    {pctCorte != null ? `${pctCorte}%` : '—'}
                  </p>
                  <p className="mt-1 text-[10px] text-slate-400">
                    {fmtNum(totalLogrado)} de {fmtNum(totalMetaEsperada)} al corte
                  </p>
                </div>
              </div>
              <div className="relative mt-3 h-3 overflow-visible rounded bg-slate-100">
                <div
                  className={cn('h-full rounded transition-all duration-500', pctBarColor(pctCorte ?? 0))}
                  style={{ width: `${Math.min(pctAnual, 100)}%` }}
                />
                <div
                  className="absolute top-1/2 h-6 w-0.5 -translate-y-1/2 rounded-full bg-slate-700"
                  style={{ left: `${Math.min(pctEsperadoAnual, 100)}%` }}
                />
              </div>
              <div className="mt-2 flex items-center justify-between text-[10px] text-slate-400">
                <span>Avanzado: {fmtNum(totalLogrado)} de {fmtNum(totalMetaAnual)}</span>
                <span>Marca esperada: {pctEsperadoAnual}%</span>
              </div>
            </div>
          )}

          {/* ── Body: programas + corte ── */}
          <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
            {/* Programas */}
            <div className="lg:col-span-2">
              <div className="mb-3 flex items-center justify-between">
                <h2 className="text-[10px] font-bold uppercase tracking-[0.16em] text-slate-400">
                  Mis programas
                </h2>
                <Link
                  to="/ppr/programas"
                  className="flex items-center gap-1 text-[11px] font-semibold text-slate-600 transition hover:text-teal-700"
                >
                  Ver todos
                  <ChevronRight className="h-3 w-3" />
                </Link>
              </div>

              {programas.length === 0 ? (
                <div className="flex flex-col items-center gap-3 rounded-lg border border-dashed border-slate-300 bg-white py-10 text-center">
                  <Layers className="h-7 w-7 text-slate-300" />
                  <p className="text-xs text-slate-400">Sin programas asignados</p>
                </div>
              ) : (
                <div className="ppr-stagger space-y-2">
                  {programasSorted.slice(0, 6).map((p) => (
                    <ProgramaMiniCard key={p.id} programa={p} activeMonth={activeMonth} />
                  ))}
                  {programasSorted.length > 6 && (
                    <button
                      onClick={() => navigate('/ppr/programas')}
                      className="flex w-full items-center justify-center gap-2 rounded-lg border border-dashed border-slate-300 py-2.5 text-[11px] font-semibold text-slate-500 transition hover:border-teal-300 hover:bg-teal-50 hover:text-teal-700"
                    >
                      Ver {programasSorted.length - 6} más
                      <ChevronRight className="h-3 w-3" />
                    </button>
                  )}
                </div>
              )}
            </div>

            {/* Cut summary */}
            <div className="space-y-5">
              <div className="rounded-lg border border-slate-200 bg-white p-4 shadow-[0_1px_2px_rgba(15,23,42,0.04)]">
                <div className="mb-4 flex items-start justify-between gap-3">
                  <div>
                    <h2 className="text-[10px] font-bold uppercase tracking-[0.16em] text-slate-400">
                      Situación del corte
                    </h2>
                    <p className="mt-1 text-[11px] text-slate-500">
                      Distribución de programas según meta esperada.
                    </p>
                  </div>
                  <PprPill tone={pctCorte == null ? 'slate' : pctCorte >= 100 ? 'emerald' : pctCorte >= 80 ? 'amber' : 'rose'}>
                    {pctCorte != null ? `${pctCorte}%` : 'Sin corte'}
                  </PprPill>
                </div>

                <div className="space-y-3">
                  {corteItems.map((item) => (
                    <div key={item.label} className="flex items-center gap-3">
                      <div className={cn('h-2.5 w-2.5 rounded-full', item.dot)} />
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center justify-between gap-3">
                          <p className="text-xs font-semibold text-slate-800">{item.label}</p>
                          <p className={cn('text-sm font-bold tabular-nums', item.text)}>{item.value}</p>
                        </div>
                        <p className="text-[10px] text-slate-400">{item.detail}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              <div className="rounded-lg border border-slate-200 bg-white p-4 shadow-[0_1px_2px_rgba(15,23,42,0.04)]">
                <h2 className="text-[10px] font-bold uppercase tracking-[0.16em] text-slate-400">
                  Prioridad operativa
                </h2>
                <div className="mt-3 rounded-lg bg-slate-50 p-3">
                  <p className="text-xs font-semibold text-slate-900">
                    {programasAtrasados > 0
                      ? 'Revisar primero los programas críticos'
                      : programasEnSeguimiento > 0
                        ? 'Mantener seguimiento del corte'
                        : 'El corte se mantiene estable'}
                  </p>
                  <p className="mt-1 text-[11px] leading-relaxed text-slate-500">
                    {programasAtrasados > 0
                      ? `${programasAtrasados} programa${programasAtrasados > 1 ? 's están' : ' está'} bajo el 80%.`
                      : programasEnSeguimiento > 0
                        ? `${programasEnSeguimiento} programa${programasEnSeguimiento > 1 ? 's están' : ' está'} entre 80% y 99%.`
                        : 'No hay programas críticos según la meta esperada actual.'}
                  </p>
                </div>
                <Link
                  to="/ppr/programas"
                  className="mt-3 flex items-center justify-between rounded-lg border border-slate-200 px-3 py-2 text-[11px] font-semibold text-slate-600 transition hover:border-teal-300 hover:bg-teal-50 hover:text-teal-700"
                >
                  Revisar detalle por programa
                  <ChevronRight className="h-3.5 w-3.5" />
                </Link>
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  )
}
