import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  Calendar,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  Clock,
  Loader2,
  Lock,
} from 'lucide-react'
import { usePprContext } from '@/modules/ppr/context/ppr-context'
import { fetchPeriodos } from '@/modules/ppr/services/ppr.service'
import type { PprPeriodoItem } from '@/modules/ppr/types'

const MONTHS_ES = [
  'Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio',
  'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre',
]

function statusInfo(p: PprPeriodoItem | undefined, month: number, currentMonth: number, currentYear: number, year: number) {
  if (!p) {
    if (year > currentYear || (year === currentYear && month > currentMonth)) {
      return { label: 'Próximo', color: 'text-slate-400 bg-slate-100', dot: 'bg-slate-300' }
    }
    return { label: 'Sin datos', color: 'text-slate-400 bg-slate-100', dot: 'bg-slate-300' }
  }
  if (p.isSigned) return { label: 'Firmado', color: 'text-emerald-700 bg-emerald-100', dot: 'bg-emerald-500' }
  if (p.isOpen) return { label: 'Abierto', color: 'text-blue-700 bg-blue-100', dot: 'bg-blue-500' }
  return { label: 'Cerrado', color: 'text-slate-600 bg-slate-100', dot: 'bg-slate-400' }
}

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
  const status = statusInfo(periodo, month, currentMonth, currentYear, year)
  const pct = periodo && periodo.totalActividades > 0
    ? Math.round((periodo.completadas / periodo.totalActividades) * 100)
    : null

  return (
    <div
      className={`rounded-2xl border bg-white p-4 transition ${
        isFuture
          ? 'border-dashed border-[#e2e8f0] opacity-50'
          : isCurrent
            ? 'border-blue-300 shadow-sm shadow-blue-100'
            : 'border-[#e2e8f0] hover:border-green-300 hover:shadow-sm'
      }`}
    >
      <div className="flex items-start justify-between gap-2">
        <div className="flex items-center gap-2">
          {isCurrent ? (
            <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl bg-blue-500/10">
              <Clock className="h-4 w-4 text-blue-500" />
            </div>
          ) : periodo?.isSigned ? (
            <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl bg-emerald-500/10">
              <CheckCircle2 className="h-4 w-4 text-emerald-600" />
            </div>
          ) : (
            <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl bg-slate-100">
              <Calendar className="h-4 w-4 text-slate-400" />
            </div>
          )}
          <div>
            <p className="text-sm font-semibold text-[#0c2340]">{MONTHS_ES[month - 1]}</p>
            {isCurrent && <p className="text-[10px] font-medium text-blue-500">Mes actual</p>}
          </div>
        </div>
        <span className={`shrink-0 rounded-full px-2 py-0.5 text-[10px] font-semibold ${status.color}`}>
          {status.label}
        </span>
      </div>

      {periodo && periodo.totalActividades > 0 && (
        <div className="mt-3">
          <div className="mb-1 flex items-center justify-between text-[10px] text-slate-400">
            <span>
              {periodo.completadas}/{periodo.totalActividades} actividades
            </span>
            <span className={`font-semibold ${
              (pct ?? 0) >= 100 ? 'text-emerald-600' : (pct ?? 0) >= 60 ? 'text-amber-600' : 'text-red-500'
            }`}>
              {pct}%
            </span>
          </div>
          <div className="h-1.5 w-full overflow-hidden rounded-full bg-slate-100">
            <div
              className={`h-full rounded-full ${
                (pct ?? 0) >= 100 ? 'bg-emerald-500' : (pct ?? 0) >= 60 ? 'bg-amber-400' : 'bg-red-400'
              }`}
              style={{ width: `${pct ?? 0}%` }}
            />
          </div>
        </div>
      )}

      {!isFuture && periodo && (
        <button
          onClick={() => onSelect(periodo)}
          className="mt-3 flex w-full items-center justify-center gap-1.5 rounded-xl border border-[#e2e8f0] py-1.5 text-[11px] font-medium text-[#0c2340] transition hover:border-green-400 hover:text-green-700"
        >
          {periodo.isSigned ? (
            <>
              <Lock className="h-3 w-3" /> Ver actividades
            </>
          ) : (
            'Ver actividades'
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

  const totalSigned = periodos.filter((p) => p.year === year && p.isSigned).length
  const totalWithData = periodos.filter((p) => p.year === year).length

  function handleSelect(p: PprPeriodoItem) {
    navigate('/ppr/actividades', { state: { periodo: p } })
  }

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-lg font-bold text-[#0c2340]">Períodos</h1>
          <p className="text-xs text-slate-400">Historial mensual de actividades</p>
        </div>

        {/* Year selector */}
        <div className="flex items-center gap-1 rounded-xl border border-[#e2e8f0] bg-white px-1 py-1">
          <button
            onClick={() => setYear((y) => y - 1)}
            className="rounded-lg p-1.5 text-slate-400 transition hover:bg-slate-100 hover:text-[#0c2340]"
          >
            <ChevronLeft className="h-4 w-4" />
          </button>
          <span className="min-w-[3.5rem] text-center text-sm font-bold text-[#0c2340]">{year}</span>
          <button
            onClick={() => setYear((y) => y + 1)}
            disabled={year >= now.getFullYear()}
            className="rounded-lg p-1.5 text-slate-400 transition hover:bg-slate-100 hover:text-[#0c2340] disabled:cursor-not-allowed disabled:opacity-30"
          >
            <ChevronRight className="h-4 w-4" />
          </button>
        </div>
      </div>

      {/* Error */}
      {error && (
        <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-2.5 text-xs text-red-700">
          {error}{' '}
          <button className="font-semibold underline" onClick={() => setError(null)}>Cerrar</button>
        </div>
      )}

      {loading ? (
        <div className="flex items-center justify-center py-20">
          <Loader2 className="h-6 w-6 animate-spin text-green-600" />
        </div>
      ) : (
        <>
          {/* Year summary */}
          {totalWithData > 0 && (
            <div className="flex gap-3">
              <div className="rounded-2xl border border-[#e2e8f0] bg-white px-5 py-3">
                <p className="text-xs text-slate-400">Meses con datos</p>
                <p className="text-2xl font-bold text-[#0c2340]">{totalWithData}</p>
              </div>
              <div className="rounded-2xl border border-emerald-200 bg-emerald-50 px-5 py-3">
                <p className="text-xs text-emerald-600">Meses firmados</p>
                <p className="text-2xl font-bold text-emerald-700">{totalSigned}</p>
              </div>
            </div>
          )}

          {/* Month grid */}
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
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
            <div className="flex flex-col items-center gap-3 rounded-2xl border border-dashed border-[#c8d8e8] bg-white py-16 text-center">
              <Calendar className="h-8 w-8 text-slate-300" />
              <p className="text-sm font-semibold text-[#0c2340]">Sin períodos registrados</p>
              <p className="max-w-xs text-xs text-slate-400">
                No hay registros de actividades para el año {year}.
              </p>
            </div>
          )}
        </>
      )}
    </div>
  )
}
