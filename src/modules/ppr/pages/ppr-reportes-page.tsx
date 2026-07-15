import { useEffect, useState } from 'react'
import { BarChart2, ChevronLeft, ChevronRight, Download, Loader2, Lock } from 'lucide-react'
import { usePprContext } from '@/modules/ppr/context/ppr-context'
import { downloadMatrizExcel, fetchResumen } from '@/modules/ppr/services/ppr.service'
import type { PprResumenMes, PprResumenPrograma } from '@/modules/ppr/types'
import {
  PprAlert,
  PprEmptyState,
  PprSectionHeader,
  PprSkeleton,
} from '@/modules/ppr/components/ui-primitives'
import { cn } from '@/lib/utils'

const MONTHS_SHORT = ['Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun', 'Jul', 'Ago', 'Sep', 'Oct', 'Nov', 'Dic']

function CellContent({ mes, currentMonth, year, currentYear }: {
  mes: PprResumenMes | undefined
  currentMonth: number
  year: number
  currentYear: number
  month: number
}) {
  if (!mes) return <span className="text-slate-200">—</span>
  if (mes.totalActividades === 0) return <span className="text-slate-300">—</span>

  const pct = Math.round((mes.completadas / mes.totalActividades) * 100)
  const isFuture = year > currentYear || (year === currentYear && mes.month >= currentMonth)
  if (isFuture) return <span className="text-slate-300">—</span>

  return (
    <div className="flex flex-col items-center gap-0.5">
      <span
        className={cn(
          'text-xs font-bold tabular-nums',
          pct >= 100 ? 'text-emerald-700' : pct >= 60 ? 'text-amber-700' : 'text-rose-600',
        )}
      >
        {pct}%
      </span>
      {mes.isSigned && <Lock className="h-2.5 w-2.5 text-emerald-500" />}
    </div>
  )
}

function CellBg(mes: PprResumenMes | undefined, currentMonth: number, year: number, currentYear: number): string {
  if (!mes || mes.totalActividades === 0) return ''
  const isFuture = year > currentYear || (year === currentYear && mes.month >= currentMonth)
  if (isFuture) return ''
  const pct = Math.round((mes.completadas / mes.totalActividades) * 100)
  if (pct >= 100) return 'bg-emerald-50'
  if (pct >= 60)  return 'bg-amber-50'
  return 'bg-rose-50'
}

export function PprReportesPage() {
  const { pprUser } = usePprContext()

  const now = new Date()
  const [year, setYear] = useState(now.getFullYear())
  const [resumen, setResumen] = useState<PprResumenPrograma[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [exporting, setExporting] = useState(false)

  async function handleExport() {
    setExporting(true)
    try {
      await downloadMatrizExcel(year, pprUser.employeeId)
    } catch {
      setError('No se pudo generar el archivo Excel.')
    } finally {
      setExporting(false)
    }
  }

  useEffect(() => {
    setLoading(true)
    fetchResumen(pprUser.employeeId, year)
      .then((data) => setResumen(data))
      .catch(() => setError('No se pudo cargar el resumen anual.'))
      .finally(() => setLoading(false))
  }, [pprUser.employeeId, year])

  const currentMonth = now.getMonth() + 1
  const currentYear = now.getFullYear()

  // Aggregated stats
  const totalSignedCells = resumen.reduce(
    (acc, prog) => acc + prog.meses.filter((m) => m.isSigned).length,
    0,
  )
  const totalCells = resumen.reduce(
    (acc, prog) =>
      acc + prog.meses.filter((m) => {
        const isFuture = year > currentYear || (year === currentYear && m.month >= currentMonth)
        return !isFuture && m.totalActividades > 0
      }).length,
    0,
  )
  const completedCells = resumen.reduce(
    (acc, prog) =>
      acc + prog.meses.filter((m) => {
        const fut = year > currentYear || (year === currentYear && m.month >= currentMonth)
        return !fut && m.totalActividades > 0 && m.completadas === m.totalActividades
      }).length,
    0,
  )

  return (
    <div className="space-y-5">
      {/* Header */}
      <PprSectionHeader
        eyebrow="Resumen anual"
        title="Reportes"
        description="Avance por programa y mes"
        right={
          <>
            {/* Export button — admin only */}
            {pprUser.role === 'admin' && (
              <button
                onClick={handleExport}
                disabled={exporting}
                className="group flex items-center gap-1.5 rounded-xl border border-indigo-300 bg-indigo-50 px-3 py-2 text-xs font-semibold text-indigo-700 shadow-sm transition hover:border-indigo-400 hover:bg-indigo-100 hover:shadow-md disabled:cursor-not-allowed disabled:opacity-50"
                title={`Exportar matriz completa ${year} a Excel`}
              >
                {exporting
                  ? <Loader2 className="h-3.5 w-3.5 animate-spin" />
                  : <Download className="h-3.5 w-3.5 transition-transform group-hover:translate-y-0.5" />
                }
                {exporting ? 'Generando…' : 'Exportar Excel'}
              </button>
            )}

            {/* Year selector */}
            <div className="flex items-center gap-1 rounded-xl border border-slate-200 bg-white px-1 py-1 shadow-sm">
              <button
                onClick={() => setYear((y) => y - 1)}
                className="rounded-lg p-1.5 text-slate-400 transition hover:bg-slate-100 hover:text-indigo-600"
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
                className="rounded-lg p-1.5 text-slate-400 transition hover:bg-slate-100 hover:text-indigo-600 disabled:cursor-not-allowed disabled:opacity-30"
                aria-label="Año siguiente"
              >
                <ChevronRight className="h-4 w-4" />
              </button>
            </div>
          </>
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
            <PprSkeleton className="h-20 w-40 rounded-2xl" />
            <PprSkeleton className="h-20 w-40 rounded-2xl" />
          </div>
          <PprSkeleton className="h-96 w-full rounded-2xl" />
        </>
      ) : resumen.length === 0 ? (
        <PprEmptyState
          icon={BarChart2}
          title={`Sin datos para ${year}`}
          description="No hay registros de actividades para este año."
        />
      ) : (
        <>
          {/* Stats bar */}
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
            <div className="rounded-2xl border border-emerald-200 bg-emerald-50 px-5 py-3">
              <p className="text-[10px] font-semibold uppercase tracking-wide text-emerald-700">
                Meses con 100%
              </p>
              <p className="mt-1 text-2xl font-bold tabular-nums text-emerald-700">
                {completedCells}
              </p>
              <p className="text-[10px] text-emerald-600/80">
                de {totalCells} con datos
              </p>
            </div>
            <div className="rounded-2xl border border-slate-200 bg-white px-5 py-3">
              <p className="text-[10px] font-semibold uppercase tracking-wide text-slate-400">
                Meses firmados
              </p>
              <p className="mt-1 text-2xl font-bold tabular-nums text-slate-900">
                {totalSignedCells}
              </p>
              <p className="text-[10px] text-slate-400">períodos cerrados</p>
            </div>
            <div className="rounded-2xl border border-indigo-200 bg-indigo-50 px-5 py-3">
              <p className="text-[10px] font-semibold uppercase tracking-wide text-indigo-700">
                Filas de seguimiento
              </p>
              <p className="mt-1 text-2xl font-bold tabular-nums text-indigo-700">
                {resumen.length}
              </p>
              <p className="text-[10px] text-indigo-600/80">programas y grupos</p>
            </div>
          </div>

          {/* Matrix table */}
          <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
            <div className="overflow-x-auto ppr-scroll">
              <table className="w-full text-xs">
                <thead>
                  <tr className="border-b border-slate-200 bg-slate-50">
                    <th className="min-w-[180px] py-3 pl-4 pr-3 text-left text-xs font-semibold text-slate-900">
                      Programa
                    </th>
                    {MONTHS_SHORT.map((m, i) => (
                      <th
                        key={i}
                        className={cn(
                          'w-14 px-1 py-3 text-center text-xs font-semibold',
                          i + 1 === currentMonth && year === currentYear
                            ? 'bg-sky-100/60 text-sky-700'
                            : 'text-slate-900',
                        )}
                      >
                        {m}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {resumen.map((prog) => {
                    const mesByMonth = new Map(prog.meses.map((m) => [m.month, m]))
                    return (
                      <tr key={prog.rowKey ?? prog.programaId} className="border-b border-slate-100 transition-colors last:border-0 hover:bg-indigo-50/20">
                        <td className="py-3 pl-4 pr-3">
                          {prog.code && (
                            <span className="mr-1.5 rounded bg-indigo-50 px-1.5 py-0.5 font-mono text-[10px] font-semibold text-indigo-700">
                              {prog.code}
                            </span>
                          )}
                          {prog.activityGroup && (
                            <span className="mr-1.5 rounded bg-sky-50 px-1.5 py-0.5 text-[10px] font-semibold text-sky-700">
                              {prog.activityGroup.name}
                            </span>
                          )}
                          <span className="text-xs font-medium text-slate-900">{prog.name}</span>
                        </td>
                        {Array.from({ length: 12 }, (_, i) => i + 1).map((month) => {
                          const mes = mesByMonth.get(month)
                          const bg = CellBg(mes, currentMonth, year, currentYear)
                          const isCurrentCol = month === currentMonth && year === currentYear
                          return (
                            <td
                              key={month}
                              className={cn(
                                'px-1 py-3 text-center transition-colors',
                                bg,
                                isCurrentCol && 'ring-inset ring-2 ring-sky-300/50',
                              )}
                            >
                              <CellContent
                                mes={mes}
                                currentMonth={currentMonth}
                                year={year}
                                currentYear={currentYear}
                                month={month}
                              />
                            </td>
                          )
                        })}
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>

            {/* Legend */}
            <div className="flex flex-wrap items-center gap-4 border-t border-slate-200 bg-slate-50/40 px-4 py-3">
              <span className="text-[10px] font-bold uppercase tracking-[0.16em] text-slate-400">
                Leyenda
              </span>
              <div className="flex items-center gap-1.5">
                <div className="h-2.5 w-2.5 rounded bg-emerald-500" />
                <span className="text-[11px] text-slate-600">100%</span>
              </div>
              <div className="flex items-center gap-1.5">
                <div className="h-2.5 w-2.5 rounded bg-amber-500" />
                <span className="text-[11px] text-slate-600">60–99%</span>
              </div>
              <div className="flex items-center gap-1.5">
                <div className="h-2.5 w-2.5 rounded bg-rose-500" />
                <span className="text-[11px] text-slate-600">&lt; 60%</span>
              </div>
              <div className="flex items-center gap-1.5">
                <Lock className="h-3 w-3 text-emerald-500" />
                <span className="text-[11px] text-slate-600">Firmado</span>
              </div>
              <div className="flex items-center gap-1.5">
                <div className="h-2.5 w-2.5 rounded ring-2 ring-sky-300" />
                <span className="text-[11px] text-slate-600">Mes actual</span>
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  )
}
