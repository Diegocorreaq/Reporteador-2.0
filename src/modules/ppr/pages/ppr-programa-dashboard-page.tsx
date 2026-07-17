import { useEffect, useMemo, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import ReactECharts from 'echarts-for-react'
import {
  ArrowLeft,
  Calendar,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  ChevronUp,
  Clock,
  Database,
  Info,
  Layers,
  Loader2,
  RefreshCw,
  Search,
  X,
} from 'lucide-react'
import { usePprContext } from '@/modules/ppr/context/ppr-context'
import { fetchProgramaDetalle } from '@/modules/ppr/services/ppr.service'
import type {
  PprActividadDetalle,
  PprActividadMes,
  PprActivityGroup,
  PprProgramaDetalle,
  PprProgramaPreliminar,
} from '@/modules/ppr/types'
import { cn } from '@/lib/utils'

const MONTHS_SHORT = ['Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun', 'Jul', 'Ago', 'Sep', 'Oct', 'Nov', 'Dic']
const PPR_PRELIMINARY_MANUAL_ONLY_PROGRAM_CODES = new Set(['16', '17'])
const MONTHS_LONG = [
  'Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio',
  'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre',
]

function fmt(n: number | null): string {
  if (n == null) return '—'
  return n.toLocaleString('es-PE')
}

function normalizePprCode(value: string | null | undefined) {
  return String(value ?? '').trim().replace(/^0+/, '') || '0'
}

function cellBg(value: number | null, isActive: boolean) {
  if (value == null) return isActive ? 'bg-cyan-50' : ''
  if (value === 0) return isActive ? 'bg-amber-100' : 'bg-amber-50'
  return isActive ? 'bg-emerald-100' : 'bg-emerald-50'
}

function cellText(value: number | null) {
  if (value == null) return 'text-slate-300'
  if (value === 0) return 'text-amber-600'
  return 'text-emerald-700 font-semibold'
}

function pctToneClass(value: number | null) {
  if (value == null) return 'text-slate-400'
  if (value >= 100) return 'text-emerald-600'
  if (value >= 80) return 'text-amber-600'
  return 'text-rose-600'
}

function displayActivityCode(activity: { code?: string | null; sourceKey?: string | null }) {
  const sourceKey = String(activity.sourceKey ?? '').trim()
  if (sourceKey) return sourceKey

  const code = String(activity.code ?? '').trim()
  if (!code || /^AOI/i.test(code)) return null
  return code
}

// ─── Cell detail modal ────────────────────────────────────────────────────────
interface CellModalProps {
  activity: PprActividadDetalle
  monthData: PprActividadMes
  year: number
  onClose: () => void
}

function CellModal({ activity, monthData, year, onClose }: CellModalProps) {
  const activityCode = displayActivityCode(activity)
  const monthLabel = MONTHS_LONG[(monthData.month ?? 1) - 1]
  const accum = activity.months
    .filter((m) => m.month <= monthData.month && m.value != null)
    .reduce((s, m) => s + (m.value ?? 0), 0)
  const goalPct =
    activity.annualGoal && activity.annualGoal > 0
      ? Math.round((accum / activity.annualGoal) * 100)
      : null

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4" onClick={onClose}>
      <div
        className="w-full max-w-sm rounded-lg bg-white p-5 shadow-xl"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="mb-4 flex items-start justify-between gap-3">
          <div>
            {activityCode && (
              <span className="mb-1 inline-block rounded bg-slate-100 px-1.5 py-0.5 font-mono text-[10px] text-slate-600">
                {activityCode}
              </span>
            )}
            {activity.activityGroup && (
              <span className="mb-1 ml-1 inline-block rounded bg-cyan-50 px-1.5 py-0.5 text-[10px] font-semibold text-cyan-700">
                {activity.activityGroup.name}
              </span>
            )}
            <p className="text-sm font-bold leading-snug text-slate-950">{activity.name}</p>
          </div>
          <button
            onClick={onClose}
            className="shrink-0 rounded-lg p-1 text-slate-400 hover:bg-slate-100 hover:text-slate-600"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Period */}
        <p className="mb-3 text-xs font-semibold text-slate-500 uppercase tracking-wider">
          {monthLabel} {year}
        </p>

        {/* Stats */}
        <div className="space-y-2">
          <div className="flex items-center justify-between rounded-lg bg-slate-50 px-3 py-2">
            <span className="text-xs text-slate-500">Valor reportado</span>
            <span className={cn('text-sm font-bold', monthData.value == null ? 'text-slate-300' : monthData.value === 0 ? 'text-amber-600' : 'text-emerald-600')}>
              {fmt(monthData.value)} {monthData.value != null ? activity.unit : ''}
            </span>
          </div>

          {activity.annualGoal != null && (
            <div className="flex items-center justify-between rounded-lg bg-slate-50 px-3 py-2">
              <span className="text-xs text-slate-500">Meta anual</span>
              <span className="text-sm font-semibold text-slate-950">
                {fmt(activity.annualGoal)} {activity.unit}
              </span>
            </div>
          )}

          <div className="flex items-center justify-between rounded-lg bg-slate-50 px-3 py-2">
            <span className="text-xs text-slate-500">Acumulado al mes</span>
            <span className="text-sm font-semibold text-slate-950">
              {fmt(accum)} {activity.unit}
            </span>
          </div>

          {goalPct != null && (
            <div className="rounded-lg bg-slate-50 px-3 py-2">
              <div className="mb-1.5 flex items-center justify-between">
                <span className="text-xs text-slate-500">Avance vs meta</span>
                <span className={cn('text-sm font-bold', goalPct >= 100 ? 'text-emerald-600' : goalPct >= 60 ? 'text-amber-600' : 'text-rose-600')}>
                  {goalPct}%
                </span>
              </div>
              <div className="h-1.5 w-full overflow-hidden rounded-full bg-slate-200">
                <div
                  className={cn('h-full rounded', goalPct >= 100 ? 'bg-emerald-500' : goalPct >= 60 ? 'bg-amber-400' : 'bg-rose-500')}
                  style={{ width: `${Math.min(goalPct, 100)}%` }}
                />
              </div>
            </div>
          )}

          {monthData.notes && (
            <div className="rounded-lg bg-amber-50 px-3 py-2">
              <p className="text-[10px] font-semibold uppercase tracking-wider text-amber-600">Notas</p>
              <p className="mt-0.5 text-xs text-slate-600">{monthData.notes}</p>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

// ─── Expanded row detail ──────────────────────────────────────────────────────
interface ExpandedDetailProps {
  activity: PprActividadDetalle
}

function ExpandedDetail({ activity }: ExpandedDetailProps) {
  const total = activity.months.reduce((s, m) => s + (m.value ?? 0), 0)
  const withValue = activity.months.filter((m) => m.value != null).length
  const maxVal = Math.max(...activity.months.map((m) => m.value ?? 0), 1)

  return (
    <tr className="bg-slate-50">
      <td colSpan={15} className="px-4 py-4">
        <div className="flex flex-col gap-4">
          {/* Activity meta */}
          <div className="flex flex-wrap gap-4">
            <div className="flex flex-col">
              <span className="text-[10px] uppercase tracking-wider text-slate-400">Unidad</span>
              <span className="text-xs font-semibold text-slate-950">{activity.unit || '—'}</span>
            </div>
            {activity.annualGoal != null && (
              <div className="flex flex-col">
                <span className="text-[10px] uppercase tracking-wider text-slate-400">Meta anual</span>
                <span className="text-xs font-semibold text-slate-950">{fmt(activity.annualGoal)} {activity.unit}</span>
              </div>
            )}
            <div className="flex flex-col">
              <span className="text-[10px] uppercase tracking-wider text-slate-400">Acumulado</span>
              <span className="text-xs font-semibold text-emerald-600">{fmt(total)} {activity.unit}</span>
            </div>
            <div className="flex flex-col">
              <span className="text-[10px] uppercase tracking-wider text-slate-400">Meses reportados</span>
              <span className="text-xs font-semibold text-slate-950">{withValue} / 12</span>
            </div>
            {activity.annualGoal && activity.annualGoal > 0 && (
              <div className="flex flex-col">
                <span className="text-[10px] uppercase tracking-wider text-slate-400">% de meta</span>
                <span className={cn('text-xs font-bold', (total / activity.annualGoal) * 100 >= 100 ? 'text-emerald-600' : 'text-amber-600')}>
                  {Math.round((total / activity.annualGoal) * 100)}%
                </span>
              </div>
            )}
          </div>

          {/* Mini sparkline bars */}
          <div className="flex items-end gap-1">
            {activity.months.map((m) => {
              const h = m.value != null ? Math.max(Math.round((m.value / maxVal) * 40), 4) : 4
              return (
                <div key={m.month} className="flex flex-col items-center gap-0.5">
                  <div
                    className={cn(
                      'w-6 rounded-t transition-all',
                      m.value == null ? 'bg-slate-100' : m.value === 0 ? 'bg-amber-200' : 'bg-emerald-400',
                    )}
                    style={{ height: `${h}px` }}
                    title={`${MONTHS_LONG[(m.month ?? 1) - 1]}: ${fmt(m.value)}`}
                  />
                  <span className="text-[8px] text-slate-400">{MONTHS_SHORT[(m.month ?? 1) - 1]}</span>
                </div>
              )
            })}
          </div>

          {/* Month values grid */}
          <div className="grid grid-cols-6 gap-1.5 sm:grid-cols-12">
            {activity.months.map((m) => (
              <div
                key={m.month}
                className={cn(
                  'rounded-lg p-1.5 text-center',
                  m.value == null ? 'bg-slate-50' : m.value === 0 ? 'bg-amber-50' : 'bg-emerald-50',
                )}
              >
                <p className="text-[9px] text-slate-400">{MONTHS_SHORT[(m.month ?? 1) - 1]}</p>
                <p className={cn('text-[11px] font-bold', m.value == null ? 'text-slate-300' : m.value === 0 ? 'text-amber-600' : 'text-emerald-700')}>
                  {fmt(m.value)}
                </p>
              </div>
            ))}
          </div>

        </div>
      </td>
    </tr>
  )
}

// ─── Monthly mini-bars ────────────────────────────────────────────────────────
interface MonthlyBarsProps {
  stats: Array<{ month: number; completadas: number; total: number; pct: number }>
  activeMonth: number | null
  currentMonth: number
  onSelectMonth: (m: number | null) => void
  onOpenMonth: (m: number) => void
}

export function MonthlyBars({ stats, activeMonth, currentMonth, onSelectMonth, onOpenMonth }: MonthlyBarsProps) {
  return (
    <div className="rounded-lg border border-slate-200 bg-white p-4 shadow-[0_1px_2px_rgba(15,23,42,0.04)]">
      <div className="mb-3">
        <p className="text-[10px] font-semibold uppercase tracking-widest text-slate-400">
          Consolidación mensual de registros — clic para filtrar columna
        </p>
        <p className="mt-1 text-[10px] text-slate-400">
          Porcentaje de actividades con dato cargado; no mide cumplimiento de meta.
        </p>
      </div>
      <div className="flex items-end gap-1">
        {stats.map((s) => {
          const isAvailable = s.month <= currentMonth
          const isClosed = s.month < currentMonth
          const isActive = activeMonth === s.month
          const barH = isClosed ? Math.max(s.pct, 2) : 0
          return (
            <button
              key={s.month}
              onClick={() => isAvailable ? onOpenMonth(s.month) : undefined}
              onContextMenu={(event) => {
                event.preventDefault()
                if (isClosed) onSelectMonth(isActive ? null : s.month)
              }}
              disabled={!isAvailable}
              className={cn(
                'group flex flex-1 flex-col items-center gap-1 rounded-lg pb-1 pt-2 transition',
                isAvailable ? 'hover:bg-slate-50 cursor-pointer' : 'cursor-default opacity-40',
                isActive && 'bg-cyan-50 ring-1 ring-cyan-200',
              )}
            >
              <span className={cn(
                'text-[10px] font-semibold',
                !isClosed ? 'text-slate-200'
                  : isActive ? 'text-cyan-700'
                  : s.pct >= 100 ? 'text-emerald-600'
                  : s.pct >= 60 ? 'text-amber-600'
                  : s.pct > 0 ? 'text-slate-500'
                  : 'text-slate-300',
              )}>
                {isClosed ? (s.pct > 0 ? `${s.pct}%` : '—') : '—'}
              </span>
              <div className="flex w-full items-end justify-center" style={{ height: '40px' }}>
                <div
                  className={cn(
                    'w-4/5 rounded-t transition-all',
                    !isClosed ? 'bg-slate-100'
                      : isActive ? 'bg-cyan-500'
                      : s.pct >= 100 ? 'bg-emerald-400'
                      : s.pct >= 60 ? 'bg-amber-400'
                      : s.pct > 0 ? 'bg-rose-300'
                      : 'bg-slate-100',
                  )}
                  style={{ height: `${barH}%` }}
                />
              </div>
              <span className={cn('text-[9px]', isActive ? 'font-bold text-cyan-700' : isClosed ? 'text-slate-400' : 'text-slate-300')}>
                {MONTHS_SHORT[s.month - 1]}
              </span>
            </button>
          )
        })}
      </div>
    </div>
  )
}

interface PreliminaryPanelProps {
  data: PprProgramaPreliminar | null
  loading: boolean
  error: string | null
  onRefresh: () => void
}

export function PreliminaryPanel({ data, loading, error, onRefresh }: PreliminaryPanelProps) {
  const [showAll, setShowAll] = useState(false)

  if (!loading && !data && !error) return null

  const visibleItems = data ? (showAll ? data.items : data.items.slice(0, 5)) : []
  const pendingAutomationItems = data?.manualActivities ?? []
  const pct = data?.monthlyGoalPct ?? null

  return (
    <div className="rounded-lg border border-cyan-200 bg-white p-4 shadow-[0_1px_2px_rgba(15,23,42,0.04)]">
      <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
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
          <h2 className="mt-2 text-sm font-bold text-slate-950">
            Seguimiento de fuente institucional
          </h2>
          <p className="mt-1 text-xs text-slate-500">
            {data
              ? `Corte ${data.cutoffLabel}. Rango consultado: ${data.rangeStart} a ${data.rangeEnd}.`
              : 'Consultando el ultimo corte disponible.'}
          </p>
        </div>
        <button
          onClick={onRefresh}
          disabled={loading}
          className="inline-flex items-center justify-center gap-1.5 rounded-lg border border-slate-200 px-3 py-2 text-xs font-semibold text-slate-700 transition hover:border-cyan-300 hover:bg-cyan-50 hover:text-cyan-700 disabled:opacity-50"
        >
          <RefreshCw className={cn('h-3.5 w-3.5', loading && 'animate-spin')} />
          Actualizar
        </button>
      </div>

      {loading && !data ? (
        <div className="mt-4 grid gap-3 md:grid-cols-4">
          {Array.from({ length: 4 }).map((_, index) => (
            <div key={index} className="h-20 animate-pulse rounded-lg bg-slate-100" />
          ))}
        </div>
      ) : error ? (
        <div className="mt-4 flex items-center gap-2 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-700">
          <Info className="h-4 w-4 shrink-0" />
          {error}
        </div>
      ) : data ? (
        <>
          <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            <div className="rounded-lg border border-slate-200 bg-slate-50 p-3">
              <p className="text-[10px] font-semibold uppercase tracking-wide text-slate-400">Logro preliminar del mes</p>
              <p className="mt-1 text-2xl font-bold text-slate-950">{fmtK(data.totalValue)}</p>
            </div>
            <div className="rounded-lg border border-slate-200 bg-slate-50 p-3">
              <p className="text-[10px] font-semibold uppercase tracking-wide text-slate-400">Meta al corte</p>
              <p className="mt-1 text-2xl font-bold text-slate-950">{fmtK(data.monthlyGoal)}</p>
            </div>
            <div className="rounded-lg border border-slate-200 bg-slate-50 p-3">
              <p className="text-[10px] font-semibold uppercase tracking-wide text-slate-400">Cumplimiento al corte</p>
              <p className={cn('mt-1 text-2xl font-bold', pctToneClass(pct))}>{pct != null ? `${pct}%` : '-'}</p>
            </div>
            <div className="rounded-lg border border-slate-200 bg-slate-50 p-3">
              <p className="text-[10px] font-semibold uppercase tracking-wide text-slate-400">Actividades vinculadas</p>
              <p className="mt-1 text-2xl font-bold text-slate-950">{data.rowsMatched} / {data.totalActivities}</p>
            </div>
          </div>

          <div className="mt-4">
            <div className="mb-2 flex items-center justify-between gap-3">
              <span className="text-[10px] font-semibold uppercase tracking-wide text-slate-400">
                Preliminar vs meta al corte
              </span>
              <span className={cn('text-xs font-bold tabular-nums', pctToneClass(pct))}>
                {pct != null ? `${pct}%` : 'Sin meta'}
              </span>
            </div>
            <div className="h-2 overflow-hidden rounded-full bg-slate-100">
              <div
                className={cn('h-full rounded-full transition-all', pct == null ? 'bg-slate-300' : pct >= 100 ? 'bg-emerald-500' : pct >= 80 ? 'bg-amber-500' : 'bg-rose-500')}
                style={{ width: `${Math.min(pct ?? 0, 100)}%` }}
              />
            </div>
          </div>

          <div className="mt-4 overflow-hidden rounded-lg border border-slate-200">
            <div className="grid grid-cols-[1fr_96px_96px] bg-slate-50 px-3 py-2 text-[10px] font-semibold uppercase tracking-wide text-slate-400">
              <span>Actividad</span>
              <span className="text-right">Preliminar</span>
              <span className="text-right">% corte</span>
            </div>
            {visibleItems.length === 0 ? (
              <div className="px-3 py-5 text-center text-xs text-slate-400">
                Sin actividades vinculadas en este corte.
              </div>
            ) : (
              visibleItems.map((item) => (
                <div
                  key={item.activityId}
                  className="grid grid-cols-[1fr_96px_96px] items-center border-t border-slate-100 px-3 py-2 text-xs"
                >
                  <div className="min-w-0">
                    <p className="truncate font-semibold text-slate-800" title={item.name}>{item.name}</p>
                    {displayActivityCode(item) && (
                      <p className="mt-0.5 font-mono text-[9px] text-slate-400">{displayActivityCode(item)}</p>
                    )}
                  </div>
                  <span className="text-right font-bold text-slate-950">{fmt(item.value)}</span>
                  <span className={cn('text-right font-bold', pctToneClass(item.monthlyGoalPct))}>
                    {item.monthlyGoalPct != null ? `${item.monthlyGoalPct}%` : '-'}
                  </span>
                </div>
              ))
            )}
          </div>

          <div className="mt-3 flex flex-wrap items-center justify-between gap-2 text-[10px] text-slate-400">
            <span className="inline-flex items-center gap-1.5">
              <Clock className="h-3 w-3" />
              Fuente: {data.rowsRead} filas leidas - {data.rowsUnmatched} sin vinculo
            </span>
            {data.items.length > 5 && (
              <button
                onClick={() => setShowAll((value) => !value)}
                className="rounded-lg border border-slate-200 px-2 py-1 font-semibold text-slate-600 transition hover:border-cyan-300 hover:bg-cyan-50 hover:text-cyan-700"
              >
                {showAll ? 'Ver menos' : `Ver ${data.items.length} actividades`}
              </button>
            )}
          </div>

          {pendingAutomationItems.length > 0 && (
            <div className="mt-4 rounded-lg border border-amber-200 bg-amber-50 p-3">
              <div className="flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between">
                <p className="text-xs font-semibold text-amber-800">
                  {pendingAutomationItems.length} actividades pendientes de automatizacion
                </p>
                <p className="text-[10px] text-amber-700">
                  Se mantienen visibles sin valor automatico en este corte.
                </p>
              </div>
              <div className="mt-2 grid gap-1.5 sm:grid-cols-2">
                {pendingAutomationItems.slice(0, 6).map((activity) => (
                  <div key={activity.activityId} className="rounded bg-white/70 px-2 py-1.5">
                    <p className="truncate text-xs font-semibold text-amber-900" title={activity.activityName}>
                      {activity.activityName}
                    </p>
                    {activity.sourceKey && (
                      <p className="font-mono text-[10px] text-amber-700">{activity.sourceKey}</p>
                    )}
                  </div>
                ))}
              </div>
              {pendingAutomationItems.length > 6 && (
                <p className="mt-2 text-[10px] text-amber-700">
                  +{pendingAutomationItems.length - 6} actividades adicionales pendientes.
                </p>
              )}
            </div>
          )}
        </>
      ) : null}
    </div>
  )
}

// ─── Charts helpers ───────────────────────────────────────────────────────────
interface MonthlyEvaluationAccessProps {
  year: number
  preliminaryMonth: number | null
  completionByMonth: number[]
  onOpenMonth: (month: number) => void
}

function MonthlyEvaluationAccess({ year, preliminaryMonth, completionByMonth, onOpenMonth }: MonthlyEvaluationAccessProps) {
  const minEvaluationYear = 2025
  const isAvailable = year >= minEvaluationYear
  const defaultMonth = preliminaryMonth ?? 12

  return (
    <div className="rounded-lg border border-slate-200 bg-white p-4 shadow-[0_1px_2px_rgba(15,23,42,0.04)]">
      <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
        <div>
          <div className="flex items-center gap-2">
            <Calendar className="h-4 w-4 text-teal-700" />
            <p className="text-sm font-bold text-slate-950">Evaluacion mensual</p>
          </div>
          <p className="mt-1 max-w-2xl text-xs leading-relaxed text-slate-500">
            {isAvailable
              ? 'Revisa el avance del mes contra la meta programada por actividad. El mes actual muestra informacion preliminar con meta proporcional al corte; los meses anteriores muestran la consolidacion registrada.'
              : `La evaluacion mensual estara disponible desde ${minEvaluationYear}.`}
          </p>
        </div>
        <button
          onClick={() => onOpenMonth(defaultMonth)}
          disabled={!isAvailable}
          className="inline-flex items-center justify-center gap-1.5 rounded-lg bg-teal-700 px-3 py-2 text-xs font-semibold text-white transition hover:bg-teal-800 disabled:cursor-not-allowed disabled:bg-slate-200 disabled:text-slate-400"
        >
          {preliminaryMonth ? 'Ver mes actual' : 'Ver diciembre'}
          <ChevronRight className="h-3.5 w-3.5" />
        </button>
      </div>

      <div className="mt-4 grid grid-cols-3 gap-2 sm:grid-cols-6 lg:grid-cols-12">
        {MONTHS_SHORT.map((label, index) => {
          const month = index + 1
          const isOpen = preliminaryMonth === month
          const stateLabel = isOpen ? 'Preliminar' : preliminaryMonth == null || month < preliminaryMonth ? 'Cerrado' : 'Pendiente'
          const completedPct = completionByMonth[index] ?? 0
          return (
            <button
              key={label}
              onClick={() => isAvailable ? onOpenMonth(month) : undefined}
              disabled={!isAvailable}
              className={cn(
                'rounded-lg border px-2 py-2 text-xs font-semibold transition',
                !isAvailable
                  ? 'cursor-not-allowed border-slate-200 bg-slate-50 text-slate-300'
                  : isOpen
                  ? 'border-cyan-200 bg-cyan-50 text-cyan-700 hover:bg-cyan-100'
                  : 'border-slate-200 bg-white text-slate-600 hover:border-teal-200 hover:bg-teal-50 hover:text-teal-700',
              )}
            >
              <span className="block">{label}</span>
              <span className={cn('mt-0.5 block text-[9px] font-medium', isOpen ? 'text-cyan-600' : 'text-slate-400')}>
                {stateLabel}
              </span>
              {isAvailable && (
                <span className="mt-1 block text-[10px] font-bold tabular-nums text-slate-700">
                  {completedPct}% completado
                </span>
              )}
            </button>
          )
        })}
      </div>
    </div>
  )
}

function fmtK(n: number): string {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)} M`
  if (n >= 1_000) return `${Math.round(n / 1_000)} mil`
  return n.toLocaleString('es-PE')
}

interface ChartData {
  monthlyLogrado: (number | null)[]
  monthlyMeta: (number | null)[]
  quarterlyLogrado: number[]
  quarterlyMeta: number[]
  totalLogrado: number
  totalMetaCorte: number
  totalMetaAnnual: number
  cutoffMonth: number
  cutoffLabel: string
}

function getCutoffMonth(year: number) {
  const now = new Date()
  const currentYear = now.getFullYear()
  const currentMonth = now.getMonth() + 1
  if (year < currentYear) return 12
  if (year > currentYear) return 0
  return Math.max(currentMonth - 1, 0)
}

function buildChartData(activities: PprActividadDetalle[], year: number): ChartData {
  const cutoffMonth = getCutoffMonth(year)
  const monthlyLogrado = Array.from({ length: 12 }, (_, i) => {
    const m = i + 1
    if (m > cutoffMonth) return null
    return activities.reduce((s, a) => {
      const md = a.months.find((mm) => mm.month === m)
      return s + (md?.value ?? 0)
    }, 0)
  })

  const totalAnnualGoal = activities.reduce((s, a) => s + (a.annualGoal ?? 0), 0)
  const monthlyMeta = Array.from({ length: 12 }, (_, i) => {
    const m = i + 1
    if (m > cutoffMonth) return null
    return Math.round(totalAnnualGoal / 12)
  })

  // Trimestral: solo trimestres que tengan al menos 1 mes cerrado
  const quarterlyLogrado = [0, 1, 2, 3].map((q) => {
    const months = monthlyLogrado.slice(q * 3, q * 3 + 3).filter((v) => v !== null) as number[]
    return months.length > 0 ? months.reduce((s, v) => s + v, 0) : 0
  })
  const quarterlyMeta = [0, 1, 2, 3].map((q) => {
    const months = monthlyMeta.slice(q * 3, q * 3 + 3).filter((v) => v !== null) as number[]
    return months.length > 0 ? months.reduce((s, v) => s + v, 0) : 0
  })

  const totalLogrado = (monthlyLogrado.filter((v) => v !== null) as number[]).reduce((s, v) => s + v, 0)
  const totalMetaCorte = (monthlyMeta.filter((v) => v !== null) as number[]).reduce((s, v) => s + v, 0)
  const cutoffLabel = cutoffMonth > 0 ? MONTHS_LONG[cutoffMonth - 1] : 'sin corte cerrado'

  return {
    monthlyLogrado,
    monthlyMeta,
    quarterlyLogrado,
    quarterlyMeta,
    totalLogrado,
    totalMetaCorte,
    totalMetaAnnual: totalAnnualGoal,
    cutoffMonth,
    cutoffLabel,
  }
}

function ChartsSection({ chartData, programName, year }: { chartData: ChartData; programName: string; year: number }) {
  const {
    monthlyLogrado,
    monthlyMeta,
    quarterlyLogrado,
    quarterlyMeta,
    totalLogrado,
    totalMetaCorte,
    totalMetaAnnual,
    cutoffMonth,
    cutoffLabel,
  } = chartData

  const lineOption = {
    backgroundColor: 'transparent',
    tooltip: { trigger: 'axis', textStyle: { fontSize: 11 } },
    legend: {
      data: ['Logro mensual', 'Meta mensual estimada'],
      bottom: 0,
      textStyle: { fontSize: 10, color: '#64748b' },
      icon: 'circle',
      itemWidth: 8,
      itemHeight: 8,
    },
    grid: { top: 28, bottom: 38, left: 52, right: 12 },
    xAxis: {
      type: 'category',
      data: MONTHS_SHORT,
      axisLabel: { fontSize: 10, color: '#94a3b8' },
      axisLine: { lineStyle: { color: '#e2e8f0' } },
      axisTick: { show: false },
    },
    yAxis: {
      type: 'value',
      axisLabel: { fontSize: 10, color: '#94a3b8', formatter: (v: number) => fmtK(v) },
      splitLine: { lineStyle: { color: '#f1f5f9' } },
    },
    series: [
      {
        name: 'Logro mensual',
        type: 'line',
        data: monthlyLogrado,
        smooth: false,
        symbol: 'circle',
        symbolSize: 6,
        itemStyle: { color: '#2563eb' },
        lineStyle: { color: '#2563eb', width: 2 },
        label: { show: true, fontSize: 9, color: '#2563eb', fontWeight: 'bold', position: 'top' },
      },
      {
        name: 'Meta mensual estimada',
        type: 'line',
        data: monthlyMeta,
        smooth: false,
        symbol: 'none',
        itemStyle: { color: '#94a3b8' },
        lineStyle: { color: '#94a3b8', width: 1.5, type: 'dashed' },
        label: { show: false },
      },
    ],
  }

  const barOption = {
    backgroundColor: 'transparent',
    tooltip: { trigger: 'axis', textStyle: { fontSize: 11 } },
    legend: {
      data: ['Logro trimestral', 'Meta trimestral'],
      bottom: 0,
      textStyle: { fontSize: 10, color: '#64748b' },
      icon: 'circle',
      itemWidth: 8,
      itemHeight: 8,
    },
    grid: { top: 28, bottom: 38, left: 52, right: 12 },
    xAxis: {
      type: 'category',
      data: ['1er Trim', '2do Trim', '3er Trim', '4to Trim'],
      axisLabel: { fontSize: 10, color: '#94a3b8' },
      axisLine: { lineStyle: { color: '#e2e8f0' } },
      axisTick: { show: false },
    },
    yAxis: {
      type: 'value',
      axisLabel: { fontSize: 10, color: '#94a3b8', formatter: (v: number) => fmtK(v) },
      splitLine: { lineStyle: { color: '#f1f5f9' } },
    },
    series: [
      {
        name: 'Logro trimestral',
        type: 'bar',
        data: quarterlyLogrado,
        barMaxWidth: 40,
        itemStyle: { color: '#3b82f6', borderRadius: [4, 4, 0, 0] },
        label: { show: true, position: 'top', fontSize: 10, color: '#1d4ed8', fontWeight: 'bold', formatter: (p: { value: number }) => fmtK(p.value) },
      },
      {
        name: 'Meta trimestral',
        type: 'bar',
        data: quarterlyMeta,
        barMaxWidth: 40,
        itemStyle: { color: '#e2e8f0', borderRadius: [4, 4, 0, 0] },
        label: { show: false },
      },
    ],
  }

  const gaugeMax = Math.max(totalMetaCorte, totalLogrado, 1)
  const gaugePct = totalMetaCorte > 0 ? Math.round((totalLogrado / totalMetaCorte) * 100) : 0
  const annualPct = totalMetaAnnual > 0 ? Math.round((totalLogrado / totalMetaAnnual) * 100) : null

  const gaugeOption = {
    backgroundColor: 'transparent',
    series: [
      {
        type: 'gauge',
        startAngle: 180,
        endAngle: 0,
        min: 0,
        max: gaugeMax,
        splitNumber: 4,
        radius: '90%',
        center: ['50%', '68%'],
        itemStyle: { color: '#22c55e' },
        progress: { show: true, width: 16, itemStyle: { color: '#22c55e' } },
        pointer: { show: false },
        axisLine: { lineStyle: { width: 16, color: [[1, '#e2e8f0']] } },
        axisTick: { show: false },
        splitLine: { show: false },
        axisLabel: { show: false },
        title: { show: false },
        detail: {
          valueAnimation: true,
          formatter: () => `${fmtK(totalLogrado)}\n${gaugePct}%`,
          fontSize: 16,
          fontWeight: 'bold',
          color: '#0c2340',
          lineHeight: 22,
          offsetCenter: [0, '-10%'],
        },
        data: [{ value: totalLogrado }],
      },
    ],
  }

  return (
    <div className="grid grid-cols-1 gap-4 lg:grid-cols-5">
      {/* Line chart — 2 cols */}
      <div className="col-span-1 rounded-lg border border-slate-200 bg-white p-4 shadow-[0_1px_2px_rgba(15,23,42,0.04)] lg:col-span-2">
        <p className="mb-1 text-xs font-bold text-slate-950">
          Logro mensual vs meta al corte · {programName}
        </p>
        <ReactECharts option={lineOption} style={{ height: '220px' }} />
      </div>

      {/* Bar chart — 2 cols */}
      <div className="col-span-1 rounded-lg border border-slate-200 bg-white p-4 shadow-[0_1px_2px_rgba(15,23,42,0.04)] lg:col-span-2">
        <p className="mb-1 text-xs font-bold text-slate-950">
          Logro trimestral vs meta al corte · {year}
        </p>
        <ReactECharts option={barOption} style={{ height: '220px' }} />
      </div>

      {/* KPI + Gauge — 1 col */}
      <div className="col-span-1 flex flex-col gap-3">
        {/* KPI cards */}
        <div className="grid grid-cols-2 gap-3">
          <div className="rounded-lg border border-slate-200 bg-white p-3 text-center">
            <p className="text-lg font-bold text-slate-950">{fmtK(totalMetaCorte)}</p>
            <p className="text-[10px] text-slate-400">Meta al corte</p>
          </div>
          <div className="rounded-lg border border-slate-200 bg-white p-3 text-center">
            <p className="text-lg font-bold text-slate-950">{fmtK(totalMetaAnnual)}</p>
            <p className="text-[10px] text-slate-400">Meta anual</p>
          </div>
        </div>

        {/* Gauge */}
        <div className="flex-1 rounded-lg border border-slate-200 bg-white p-3">
          <p className="text-center text-xs font-bold text-slate-950">Cumplimiento al corte</p>
          <p className="mt-0.5 text-center text-[10px] text-slate-400">
            {cutoffMonth > 0 ? `Corte a ${cutoffLabel}` : 'Sin meses cerrados'}
          </p>
          <ReactECharts option={gaugeOption} style={{ height: '160px' }} />
          <div className="flex justify-between px-2">
            <span className="text-[10px] text-slate-400">0</span>
            <span className="text-[10px] text-slate-400">{fmtK(gaugeMax)}</span>
          </div>
          <p className="mt-1 text-center text-[10px] text-slate-400">
            Avance anual: {annualPct != null ? `${annualPct}%` : '-'}
          </p>
        </div>
      </div>
    </div>
  )
}

// ─── Main page ────────────────────────────────────────────────────────────────
interface PprProgramaDashboardContentProps {
  programId: number
  embedded?: boolean
}

export function PprProgramaDashboardContent({ programId, embedded = false }: PprProgramaDashboardContentProps) {
  const { pprUser } = usePprContext()
  const navigate = useNavigate()
  const currentYear = new Date().getFullYear()

  const [data, setData] = useState<PprProgramaDetalle | null>(null)
  const [year, setYear] = useState(currentYear)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [search, setSearch] = useState('')
  const [activeGroupCode, setActiveGroupCode] = useState<string>('ALL')
  const [expandedIds, setExpandedIds] = useState<Set<number>>(new Set())
  const [activeMonth, setActiveMonth] = useState<number | null>(null)
  const [modalCell, setModalCell] = useState<{
    activity: PprActividadDetalle
    monthData: PprActividadMes
  } | null>(null)

  useEffect(() => {
    if (!programId) return
    setLoading(true)
    setError(null)
    fetchProgramaDetalle(programId, year, pprUser.employeeId)
      .then(setData)
      .catch(() => setError('No se pudo cargar el programa.'))
      .finally(() => setLoading(false))
  }, [programId, year, pprUser.employeeId])

  function toggleRow(actId: number) {
    setExpandedIds((prev) => {
      const next = new Set(prev)
      if (next.has(actId)) next.delete(actId)
      else next.add(actId)
      return next
    })
  }

  function handleCellClick(activity: PprActividadDetalle, monthData: PprActividadMes) {
    if (monthData.value == null) return
    setModalCell({ activity, monthData })
  }

  const groupOptions = useMemo<PprActivityGroup[]>(() => {
    if (!data) return []
    return data.activityGroups ?? []
  }, [data])
  const activeGroup = groupOptions.find((group) => group.code === activeGroupCode) ?? null
  const groupCounts = useMemo(() => {
    const counts = new Map<string, number>()
    for (const activity of data?.activities ?? []) {
      const key = activity.activityGroup?.code ?? 'ALL'
      counts.set(key, (counts.get(key) ?? 0) + 1)
    }
    return counts
  }, [data])

  useEffect(() => {
    if (activeGroupCode !== 'ALL' && !groupOptions.some((group) => group.code === activeGroupCode)) {
      setActiveGroupCode('ALL')
    }
  }, [activeGroupCode, groupOptions])

  // Derived: filtered activities
  const filteredActivities = useMemo(() => {
    if (!data) return []
    const q = search.toLowerCase()
    return data.activities.filter((a) => {
      const matchesGroup = activeGroupCode === 'ALL' || a.activityGroup?.code === activeGroupCode
      const matchesSearch = !q
        || a.name.toLowerCase().includes(q)
        || String(displayActivityCode(a) ?? '').toLowerCase().includes(q)
        || a.activityGroup?.name.toLowerCase().includes(q)
        || a.activityGroup?.code.toLowerCase().includes(q)
      return matchesGroup && matchesSearch
    })
  }, [data, search, activeGroupCode])

  // Derived: chart data
  const chartData = useMemo(() => (data ? buildChartData(filteredActivities, year) : null), [data, filteredActivities, year])

  // Derived: global stats
  const globalStats = useMemo(() => {
    if (!data) return { total: 0, withData: 0, globalPct: 0, totalValues: 0 }
    const total = filteredActivities.length
    const withData = filteredActivities.filter((a) => a.months.some((m) => m.value != null)).length
    const allCells = filteredActivities.length * 12
    const filledCells = filteredActivities.reduce(
      (s, a) => s + a.months.filter((m) => m.value != null).length,
      0,
    )
    const globalPct = allCells > 0 ? Math.round((filledCells / allCells) * 100) : 0
    return { total, withData, globalPct, totalValues: filledCells }
  }, [data, filteredActivities])

  const goalStats = useMemo(() => {
    if (!data) {
      return {
        totalGoal: 0,
        totalValue: 0,
        metaCorte: 0,
        pctCorte: null as number | null,
        pctAnnual: null as number | null,
      }
    }
    const totalGoal = filteredActivities.reduce((sum, activity) => sum + (activity.annualGoal ?? 0), 0)
    const totalValue = filteredActivities.reduce(
      (sum, activity) => sum + activity.months.reduce((monthSum, month) => {
        if (month.month > getCutoffMonth(year)) return monthSum
        return monthSum + (month.value ?? 0)
      }, 0),
      0,
    )
    const metaCorte = Math.round((totalGoal / 12) * getCutoffMonth(year))
    return {
      totalGoal,
      totalValue,
      metaCorte,
      pctCorte: metaCorte > 0 ? Math.round((totalValue / metaCorte) * 100) : null,
      pctAnnual: totalGoal > 0 ? Math.round((totalValue / totalGoal) * 100) : null,
    }
  }, [data, filteredActivities, year])

  const monthlyCompletion = useMemo(() => {
    const total = filteredActivities.length
    if (total === 0) return Array.from({ length: 12 }, () => 0)
    return Array.from({ length: 12 }, (_, index) => {
      const month = index + 1
      const completed = filteredActivities.filter((activity) => {
        const monthData = activity.months.find((item) => item.month === month)
        return monthData?.value != null
      }).length
      return Math.round((completed / total) * 100)
    })
  }, [filteredActivities])
  const supportsPreliminary = data
    ? !PPR_PRELIMINARY_MANUAL_ONLY_PROGRAM_CODES.has(normalizePprCode(data.programCode))
    : false

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          {!embedded && (
            <button
              onClick={() => navigate(pprUser.role === 'admin' ? '/ppr/programas' : '/ppr')}
              className="flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs font-semibold text-slate-950 transition hover:bg-slate-50"
            >
              <ArrowLeft className="h-3.5 w-3.5" />
              {pprUser.role === 'admin' ? 'Programas' : 'Inicio'}
            </button>
          )}
          <div>
            {data ? (
              <>
                <div className="flex items-center gap-2">
                  <span className="rounded bg-slate-100 px-1.5 py-0.5 font-mono text-[10px] text-slate-600">
                    {data.programCode}
                  </span>
                  {activeGroup && (
                    <span className="rounded bg-cyan-50 px-1.5 py-0.5 text-[10px] font-semibold text-cyan-700">
                      {activeGroup.name}
                    </span>
                  )}
                  <h1 className="text-sm font-bold text-slate-950 sm:text-base">
                    {data.programName}
                  </h1>
                </div>
                <p className="text-[10px] text-slate-400">
                  Dashboard de actividades · {year}
                  {activeGroup ? ` · ${activeGroup.name}` : ''}
                </p>
              </>
            ) : (
              <div className="h-5 w-48 animate-pulse rounded bg-slate-200" />
            )}
          </div>
        </div>

        {/* Year selector */}
        <div className="flex items-center gap-1 rounded-lg border border-slate-200 bg-white px-1 py-1">
          <button
            onClick={() => setYear((y) => y - 1)}
            className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-100 hover:text-teal-700"
          >
            <ChevronLeft className="h-3.5 w-3.5" />
          </button>
          <span className="min-w-[3rem] text-center text-sm font-bold text-slate-950">{year}</span>
          <button
            onClick={() => setYear((y) => y + 1)}
            disabled={year >= currentYear}
            className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-100 hover:text-teal-700 disabled:opacity-30"
          >
            <ChevronRight className="h-3.5 w-3.5" />
          </button>
        </div>
      </div>

      {/* Error */}
      {error && (
        <div className="flex items-center justify-between rounded-lg border border-rose-200 bg-rose-50 px-4 py-2.5 text-xs text-rose-700">
          {error}
          <button onClick={() => setError(null)}><X className="h-3.5 w-3.5" /></button>
        </div>
      )}

      {loading ? (
        <div className="flex items-center justify-center py-20">
          <Loader2 className="h-6 w-6 animate-spin text-teal-700" />
        </div>
      ) : !data ? null : (
        <>
          {/* Stats row */}
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
            {[
              { label: 'Actividades', value: globalStats.total, color: 'text-slate-950' },
              { label: 'Logro al corte', value: fmtK(goalStats.totalValue), color: 'text-emerald-600' },
              { label: 'Avance anual', value: goalStats.pctAnnual != null ? `${goalStats.pctAnnual}%` : '-', color: pctToneClass(goalStats.pctAnnual) },
              { label: 'Cumplimiento al corte', value: goalStats.pctCorte != null ? `${goalStats.pctCorte}%` : '-', color: pctToneClass(goalStats.pctCorte) },
            ].map((s) => (
              <div key={s.label} className="rounded-lg border border-slate-200 bg-white p-3 text-center shadow-[0_1px_2px_rgba(15,23,42,0.04)]">
                <p className={`text-xl font-bold ${s.color}`}>{s.value}</p>
                <p className="text-[10px] text-slate-400">{s.label}</p>
              </div>
            ))}
          </div>

          {/* Charts */}
          {chartData && (
            <ChartsSection
              chartData={chartData}
              programName={activeGroup ? `${data.programCode} · ${activeGroup.name}` : data.programCode}
              year={year}
            />
          )}

          <MonthlyEvaluationAccess
            year={year}
            preliminaryMonth={year === currentYear && supportsPreliminary ? new Date().getMonth() + 1 : null}
            completionByMonth={monthlyCompletion}
            onOpenMonth={(month) => navigate(`/ppr/evaluacion-mensual?programId=${programId}&year=${year}&month=${month}`)}
          />

          {/* Search */}
          <div className="flex flex-wrap items-center gap-2">
            {groupOptions.length > 0 && (
              <label className="flex min-w-[220px] items-center gap-2 rounded-lg border border-slate-300 bg-white px-3 py-2 focus-within:border-teal-600 focus-within:ring-2 focus-within:ring-teal-600/15">
                <span className="text-[10px] font-bold uppercase tracking-wide text-slate-400">
                  Agrupación
                </span>
                <select
                  value={activeGroupCode}
                  onChange={(event) => setActiveGroupCode(event.target.value)}
                  className="min-w-0 flex-1 bg-transparent text-xs font-semibold text-slate-950 outline-none"
                >
                  <option value="ALL">Todo el programa ({data.activities.length})</option>
                  {groupOptions.map((group) => (
                    <option key={group.code} value={group.code}>
                      {group.name} ({groupCounts.get(group.code) ?? 0})
                    </option>
                  ))}
                </select>
              </label>
            )}
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-slate-400" />
              <input
                type="text"
                placeholder="Buscar actividad por nombre o código…"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="w-full rounded-lg border border-slate-300 bg-white py-2 pl-8 pr-3 text-xs text-slate-950 placeholder-slate-300 outline-none focus:border-teal-600 focus:ring-2 focus:ring-teal-600/15"
              />
            </div>
            {activeMonth && (
              <button
                onClick={() => setActiveMonth(null)}
                className="flex items-center gap-1.5 rounded-lg border border-cyan-200 bg-cyan-50 px-3 py-2 text-xs font-semibold text-cyan-700 hover:bg-cyan-100"
              >
                <X className="h-3 w-3" />
                {MONTHS_SHORT[activeMonth - 1]}
              </button>
            )}
          </div>

          {/* Table */}
          <div className="overflow-x-auto rounded-lg border border-slate-200 bg-white shadow-[0_1px_2px_rgba(15,23,42,0.04)]">
            <table className="w-full min-w-[900px] border-collapse text-xs">
              <thead>
                <tr className="border-b border-slate-200 bg-slate-50">
                  <th className="sticky left-0 z-10 bg-slate-50 px-4 py-3 text-left font-semibold text-slate-950">
                    Actividad
                  </th>
                  {MONTHS_SHORT.map((m, i) => (
                    <th
                      key={i}
                      onClick={() => setActiveMonth(activeMonth === i + 1 ? null : i + 1)}
                      className={cn(
                        'cursor-pointer px-2 py-3 text-center font-semibold transition select-none',
                        activeMonth === i + 1
                          ? 'bg-cyan-100 text-cyan-700'
                          : 'text-slate-500 hover:bg-slate-100',
                      )}
                    >
                      {m}
                    </th>
                  ))}
                  <th className="px-3 py-3 text-right font-semibold text-slate-500">Total</th>
                  <th className="px-3 py-3 text-center font-semibold text-slate-500">
                    <Layers className="mx-auto h-3.5 w-3.5" />
                  </th>
                </tr>
              </thead>
              <tbody>
                {filteredActivities.length === 0 ? (
                  <tr>
                    <td colSpan={15} className="py-12 text-center text-xs text-slate-400">
                      {search ? 'Sin resultados para la búsqueda.' : 'Sin actividades.'}
                    </td>
                  </tr>
                ) : (
                  filteredActivities.map((activity) => {
                    const isExpanded = expandedIds.has(activity.id)
                    const total = activity.months.reduce((s, m) => s + (m.value ?? 0), 0)
                    const monthsMap = new Map(activity.months.map((m) => [m.month, m]))
                    const activityCode = displayActivityCode(activity)

                    return [
                      <tr
                        key={activity.id}
                        className={cn(
                          'border-b border-slate-100 transition-colors',
                          isExpanded ? 'bg-cyan-50' : 'hover:bg-slate-50',
                        )}
                      >
                        {/* Activity name */}
                        <td
                          className={cn(
                            'sticky left-0 z-10 px-4 py-2.5 cursor-pointer',
                            isExpanded ? 'bg-cyan-50' : 'bg-white hover:bg-slate-50',
                          )}
                          onClick={() => toggleRow(activity.id)}
                        >
                          <div className="flex items-start gap-2 max-w-[220px]">
                            {isExpanded ? (
                              <ChevronUp className="mt-0.5 h-3.5 w-3.5 shrink-0 text-cyan-600" />
                            ) : (
                              <ChevronDown className="mt-0.5 h-3.5 w-3.5 shrink-0 text-slate-400" />
                            )}
                            <div className="min-w-0">
                              {activityCode && (
                                <span className="mb-0.5 inline-block rounded bg-slate-100 px-1 py-px font-mono text-[9px] text-slate-600">
                                  {activityCode}
                                </span>
                              )}
                              {activity.activityGroup && (
                                <span className="mb-0.5 ml-1 inline-block rounded bg-cyan-50 px-1 py-px text-[9px] font-semibold text-cyan-700">
                                  {activity.activityGroup.name}
                                </span>
                              )}
                              <p className="truncate text-[11px] font-medium leading-snug text-slate-950" title={activity.name}>
                                {activity.name}
                              </p>
                            </div>
                          </div>
                        </td>

                        {/* Month cells */}
                        {Array.from({ length: 12 }, (_, i) => {
                          const m = i + 1
                          const md = monthsMap.get(m) ?? { month: m, periodId: null, value: null, notes: null }
                          const isActive = activeMonth === m
                          return (
                            <td
                              key={m}
                              onClick={() => handleCellClick(activity, md)}
                              className={cn(
                                'px-1 py-2.5 text-center transition-colors',
                                md.value != null ? 'cursor-pointer hover:opacity-80' : '',
                                cellBg(md.value, isActive),
                              )}
                            >
                              <span className={cn('text-[11px]', cellText(md.value))}>
                                {md.value != null ? fmt(md.value) : '—'}
                              </span>
                            </td>
                          )
                        })}

                        {/* Total */}
                        <td className="px-3 py-2.5 text-right">
                          <span className="text-[11px] font-semibold text-slate-950">
                            {fmt(total)}
                          </span>
                        </td>

                        {/* Expand icon */}
                        <td
                          className="cursor-pointer px-3 py-2.5 text-center text-slate-300 hover:text-cyan-600"
                          onClick={() => toggleRow(activity.id)}
                        >
                          {isExpanded ? <ChevronUp className="mx-auto h-3.5 w-3.5" /> : <ChevronDown className="mx-auto h-3.5 w-3.5" />}
                        </td>
                      </tr>,

                      isExpanded && (
                        <ExpandedDetail
                          key={`exp-${activity.id}`}
                          activity={activity}
                        />
                      ),
                    ]
                  })
                )}
              </tbody>

              {/* Footer totals */}
              {filteredActivities.length > 0 && (
                <tfoot>
                  <tr className="border-t-2 border-slate-200 bg-slate-50">
                    <td className="sticky left-0 bg-slate-50 px-4 py-2.5 text-[10px] font-bold uppercase tracking-wider text-slate-500">
                      Total ({filteredActivities.length} act.)
                    </td>
                    {Array.from({ length: 12 }, (_, i) => {
                      const m = i + 1
                      const colTotal = filteredActivities.reduce((s, a) => {
                        const md = a.months.find((mm) => mm.month === m)
                        return s + (md?.value ?? 0)
                      }, 0)
                      const isActive = activeMonth === m
                      return (
                        <td
                          key={m}
                          className={cn(
                            'px-1 py-2.5 text-center text-[11px] font-bold',
                            isActive ? 'bg-cyan-100 text-cyan-700' : 'text-slate-950',
                          )}
                        >
                          {colTotal > 0 ? fmt(colTotal) : <span className="text-slate-300">—</span>}
                        </td>
                      )
                    })}
                    <td className="px-3 py-2.5 text-right text-[11px] font-bold text-slate-950">
                      {fmt(
                        filteredActivities.reduce(
                          (s, a) => s + a.months.reduce((ms, m) => ms + (m.value ?? 0), 0),
                          0,
                        ),
                      )}
                    </td>
                    <td />
                  </tr>
                </tfoot>
              )}
            </table>
          </div>
        </>
      )}

      {/* Cell detail modal */}
      {modalCell && (
        <CellModal
          activity={modalCell.activity}
          monthData={modalCell.monthData}
          year={year}
          onClose={() => setModalCell(null)}
        />
      )}
    </div>
  )
}

export function PprProgramaDashboardPage() {
  const { id } = useParams<{ id: string }>()
  return <PprProgramaDashboardContent programId={Number(id)} />
}
