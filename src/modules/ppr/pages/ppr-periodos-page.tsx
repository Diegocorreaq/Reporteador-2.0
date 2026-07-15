import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  Calendar,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  Clock,
  Lock,
} from 'lucide-react'
import { usePprContext } from '@/modules/ppr/context/ppr-context'
import { fetchPeriodos } from '@/modules/ppr/services/ppr.service'
import type { PprPeriodoItem } from '@/modules/ppr/types'
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

const MONTHS_ES = [
  'Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio',
  'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre',
]

interface MonthCardProps {
  month: number
  year: number
  periodo: PprPeriodoItem | undefined
  currentMonth: number
  currentYear: number
  onSelect: (p: PprPeriodoItem) => void
}

function MonthCard({ month, year, periodo, currentMonth, currentYear, onSelect }: MonthCardProps) {
  const isFuture = year > currentYear || (year === currentYear && month > currentMonth)
  const isCurrent = year === currentYear && month === currentMonth
  const pct = periodo && periodo.totalActividades > 0
    ? Math.round((periodo.completadas / periodo.totalActividades) * 100)
    : null

  // Determinar estado visual
  const status: { label: string; tone: 'emerald' | 'sky' | 'amber' | 'slate'; icon: React.ElementType } =
    !periodo
      ? isFuture
        ? { label: 'Próximo',  tone: 'slate',  icon: Calendar }
        : { label: 'Sin datos', tone: 'slate',  icon: Calendar }
    : periodo.isSigned
      ? { label: 'Firmado',    tone: 'emerald', icon: Lock }
    : periodo.isOpen
      ? { label: 'Abierto',    tone: 'sky',     icon: Clock }
      : { label: 'Cerrado',    tone: 'slate',   icon: Calendar }

  const StatusIcon = status.icon

  return (
    <div
      className={cn(
        'group relative overflow-hidden rounded-2xl border bg-white p-4 transition-all',
        isFuture
          ? 'border-dashed border-slate-200 opacity-50'
          : isCurrent
            ? 'border-sky-300 shadow-md shadow-sky-100/60 hover:-translate-y-0.5'
            : periodo?.isSigned
              ? 'border-emerald-200 hover:-translate-y-0.5 hover:shadow-md hover:shadow-emerald-100/60'
              : 'border-slate-200 hover:-translate-y-0.5 hover:border-sky-300 hover:shadow-md',
      )}
    >
      {/* Top accent bar */}
      {isCurrent && (
        <div className="absolute inset-x-0 top-0 h-1 bg-gradient-to-r from-sky-300 via-sky-500 to-sky-300" />
      )}
      {periodo?.isSigned && !isCurrent && (
        <div className="absolute inset-x-0 top-0 h-1 bg-gradient-to-r from-emerald-300 via-emerald-500 to-emerald-300" />
      )}

      <div className="flex items-start justify-between gap-2">
        <div className="flex items-center gap-2">
          <div className={cn(
            'flex h-9 w-9 shrink-0 items-center justify-center rounded-xl transition-transform group-hover:scale-110',
            isCurrent
              ? 'bg-gradient-to-br from-sky-100 to-sky-200'
              : periodo?.isSigned
                ? 'bg-gradient-to-br from-emerald-100 to-emerald-200'
                : 'bg-slate-100',
          )}>
            {isCurrent ? (
              <Clock className="h-4 w-4 text-sky-600" />
            ) : periodo?.isSigned ? (
              <CheckCircle2 className="h-4 w-4 text-emerald-600" />
            ) : (
              <Calendar className="h-4 w-4 text-slate-400" />
            )}
          </div>
          <div>
            <p className="text-sm font-bold text-slate-900">{MONTHS_ES[month - 1]}</p>
            {isCurrent && (
              <p className="flex items-center gap-1 text-[10px] font-semibold text-sky-600">
                <span className="relative flex h-1.5 w-1.5">
                  <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-sky-400 opacity-75" />
                  <span className="relative inline-flex h-1.5 w-1.5 rounded-full bg-sky-500" />
                </span>
                Mes actual
              </p>
            )}
          </div>
        </div>
        <PprPill tone={status.tone} icon={StatusIcon}>
          {status.label}
        </PprPill>
      </div>

      {periodo && periodo.totalActividades > 0 && (
        <div className="mt-3 space-y-1.5">
          <div className="flex items-center justify-between text-[10px]">
            <span className="text-slate-500">
              {periodo.completadas}/{periodo.totalActividades} actividades
            </span>
            {pct != null && (
              <span className={cn('font-bold tabular-nums', pctTextColor(pct))}>{pct}%</span>
            )}
          </div>
          <PprProgressBar value={pct ?? 0} size="sm" />
        </div>
      )}

      {!isFuture && periodo && (
        <button
          onClick={() => onSelect(periodo)}
          className={cn(
            'mt-3 flex w-full items-center justify-center gap-1.5 rounded-xl border py-2 text-[11px] font-semibold transition',
            periodo.isSigned
              ? 'border-emerald-200 bg-emerald-50/40 text-emerald-700 hover:bg-emerald-100/50'
              : 'border-slate-200 text-slate-900 hover:border-sky-300 hover:bg-sky-50/40 hover:text-sky-700',
          )}
        >
          {periodo.isSigned ? (
            <>
              <Lock className="h-3 w-3" />
              Ver actividades
            </>
          ) : (
            <>
              Ver actividades
              <ChevronRight className="h-3 w-3" />
            </>
          )}
        </button>
      )}
    </div>
  )
}

export function PprPeriodosPage() {
  const { pprUser } = usePprContext()
  const navigate = useNavigate()

  const now = new Date()
  const [year, setYear] = useState(now.getFullYear())
  const [periodos, setPeriodos] = useState<PprPeriodoItem[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    setLoading(true)
    fetchPeriodos(pprUser.employeeId)
      .then((data) => setPeriodos(data))
      .catch(() => setError('No se pudieron cargar los períodos.'))
      .finally(() => setLoading(false))
  }, [pprUser.employeeId])

  const periodosByMonth = new Map(periodos.filter((p) => p.year === year).map((p) => [p.month, p]))

  const trackablePeriodos = periodos.filter((p) => {
    const isFutureOrCurrent = year > now.getFullYear()
      || (year === now.getFullYear() && p.month >= now.getMonth() + 1)
    return p.year === year && !isFutureOrCurrent && p.totalActividades > 0
  })
  const totalSigned = trackablePeriodos.filter((p) => p.isSigned).length
  const totalWithData = trackablePeriodos.length
  const totalCompletadas = trackablePeriodos.reduce((s, p) => s + p.completadas, 0)
  const totalActividades = trackablePeriodos.reduce((s, p) => s + p.totalActividades, 0)
  const pctYear = totalActividades > 0 ? Math.round((totalCompletadas / totalActividades) * 100) : null

  function handleSelect(p: PprPeriodoItem) {
    navigate('/ppr/actividades', { state: { periodo: p } })
  }

  return (
    <div className="space-y-5">
      {/* Header */}
      <PprSectionHeader
        eyebrow="Línea de tiempo"
        title="Períodos"
        description="Historial mensual de actividades y firmas"
        right={
          <div className="flex items-center gap-1 rounded-xl border border-slate-200 bg-white px-1 py-1 shadow-sm">
            <button
              onClick={() => setYear((y) => y - 1)}
              className="rounded-lg p-1.5 text-slate-400 transition hover:bg-slate-100 hover:text-slate-900"
              aria-label="Año anterior"
            >
              <ChevronLeft className="h-4 w-4" />
            </button>
            <span className="min-w-[3.5rem] text-center text-sm font-bold tabular-nums text-slate-900">
              {year}
            </span>
            <button
              onClick={() => setYear((y) => y + 1)}
              disabled={year >= now.getFullYear()}
              className="rounded-lg p-1.5 text-slate-400 transition hover:bg-slate-100 hover:text-slate-900 disabled:cursor-not-allowed disabled:opacity-30"
              aria-label="Año siguiente"
            >
              <ChevronRight className="h-4 w-4" />
            </button>
          </div>
        }
      />

      {/* Error */}
      {error && (
        <PprAlert tone="error" onClose={() => setError(null)}>
          {error}
        </PprAlert>
      )}

      {loading ? (
        <>
          <div className="flex gap-3">
            <PprSkeleton className="h-20 w-32 rounded-2xl" />
            <PprSkeleton className="h-20 w-32 rounded-2xl" />
            <PprSkeleton className="h-20 w-32 rounded-2xl" />
          </div>
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
            {Array.from({ length: 12 }).map((_, i) => (
              <PprSkeleton key={i} className="h-32 w-full rounded-2xl" />
            ))}
          </div>
        </>
      ) : (
        <>
          {/* Year summary */}
          {totalWithData > 0 && (
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
              <div className="rounded-2xl border border-slate-200 bg-white px-4 py-3">
                <p className="text-[10px] font-semibold uppercase tracking-wide text-slate-400">
                  Meses con datos
                </p>
                <p className="mt-1 text-2xl font-bold tabular-nums text-slate-900">
                  {totalWithData}
                </p>
                <p className="text-[10px] text-slate-400">de 12 posibles</p>
              </div>
              <div className="rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-3">
                <p className="text-[10px] font-semibold uppercase tracking-wide text-emerald-700">
                  Meses firmados
                </p>
                <p className="mt-1 text-2xl font-bold tabular-nums text-emerald-700">
                  {totalSigned}
                </p>
                <p className="text-[10px] text-emerald-600/80">períodos cerrados</p>
              </div>
              <div className="rounded-2xl border border-indigo-200 bg-indigo-50 px-4 py-3">
                <p className="text-[10px] font-semibold uppercase tracking-wide text-indigo-700">
                  Avance del año
                </p>
                <p className="mt-1 text-2xl font-bold tabular-nums text-indigo-700">
                  {pctYear != null ? `${pctYear}%` : '—'}
                </p>
                <p className="text-[10px] text-indigo-600/80">
                  {totalCompletadas}/{totalActividades} actividades
                </p>
              </div>
              <div className="rounded-2xl border border-slate-200 bg-white px-4 py-3">
                <p className="text-[10px] font-semibold uppercase tracking-wide text-slate-400">
                  Pendientes
                </p>
                <p className="mt-1 text-2xl font-bold tabular-nums text-amber-700">
                  {totalWithData - totalSigned}
                </p>
                <p className="text-[10px] text-slate-400">por firmar</p>
              </div>
            </div>
          )}

          {/* Month grid */}
          <div className="ppr-stagger grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
            {Array.from({ length: 12 }, (_, i) => i + 1).map((month) => (
              <MonthCard
                key={month}
                month={month}
                year={year}
                periodo={periodosByMonth.get(month)}
                currentMonth={now.getMonth() + 1}
                currentYear={now.getFullYear()}
                onSelect={handleSelect}
              />
            ))}
          </div>

          {totalWithData === 0 && (
            <PprEmptyState
              icon={Calendar}
              title="Sin períodos registrados"
              description={`No hay registros de actividades para el año ${year}.`}
            />
          )}
        </>
      )}
    </div>
  )
}
