import { useEffect, useState } from 'react'
import { BarChart2, ChevronLeft, ChevronRight, Loader2, Lock } from 'lucide-react'
import { usePprContext } from '@/modules/ppr/context/ppr-context'
import { fetchResumen } from '@/modules/ppr/services/ppr.service'
import type { PprResumenMes, PprResumenPrograma } from '@/modules/ppr/types'

const MONTHS_SHORT = ['Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun', 'Jul', 'Ago', 'Sep', 'Oct', 'Nov', 'Dic']

function CellContent({ mes, currentMonth, year, currentYear }: {
  mes: PprResumenMes | undefined
  currentMonth: number
  year: number
  currentYear: number
  month: number
}) {
  if (!mes) {
    return <span className="text-slate-200">—</span>
  }
  if (mes.totalActividades === 0) {
    return <span className="text-slate-300">—</span>
  }
  const pct = Math.round((mes.completadas / mes.totalActividades) * 100)
  const isFuture = year > currentYear || (year === currentYear && mes.month > currentMonth)

  if (isFuture) {
    return <span className="text-slate-300">—</span>
  }

  return (
    <div className="flex flex-col items-center gap-0.5">
      <span
        className={`text-xs font-bold ${
          pct >= 100 ? 'text-emerald-600' : pct >= 60 ? 'text-amber-600' : 'text-red-500'
        }`}
      >
        {pct}%
      </span>
      {mes.isSigned && <Lock className="h-2.5 w-2.5 text-emerald-400" />}
    </div>
  )
}

function CellBg(mes: PprResumenMes | undefined, currentMonth: number, year: number, currentYear: number): string {
  if (!mes || mes.totalActividades === 0) return ''
  const isFuture = year > currentYear || (year === currentYear && mes.month > currentMonth)
  if (isFuture) return ''
  const pct = Math.round((mes.completadas / mes.totalActividades) * 100)
  if (pct >= 100) return 'bg-emerald-50'
  if (pct >= 60) return 'bg-amber-50'
  return 'bg-red-50'
}

export function PprReportesPage() {
  const { pprUser } = usePprContext()

  const now = new Date()
  const [year, setYear] = useState(now.getFullYear())
  const [resumen, setResumen] = useState<PprResumenPrograma[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    setLoading(true)
    fetchResumen(pprUser.employeeId, year)
      .then((data) => setResumen(data))
      .catch(() => setError('No se pudo cargar el resumen anual.'))
      .finally(() => setLoading(false))
  }, [pprUser.employeeId, year])

  const currentMonth = now.getMonth() + 1
  const currentYear = now.getFullYear()

  // Count signed months across all programs
  const totalSignedCells = resumen.reduce(
    (acc, prog) => acc + prog.meses.filter((m) => m.isSigned).length,
    0,
  )
  const totalCells = resumen.reduce(
    (acc, prog) =>
      acc +
      prog.meses.filter((m) => {
        const isFuture = year > currentYear || (year === currentYear && m.month > currentMonth)
        return !isFuture && m.totalActividades > 0
      }).length,
    0,
  )
  const completedCells = resumen.reduce(
    (acc, prog) =>
      acc +
      prog.meses.filter((m) => {
        const isFuture = year > currentYear || (year === currentYear && m.month > currentMonth)
        return !isFuture && m.totalActividades > 0 && m.completadas === m.totalActividades
      }).length,
    0,
  )

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-lg font-bold text-[#0c2340]">Resumen Anual</h1>
          <p className="text-xs text-slate-400">Avance por programa y mes</p>
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
      ) : resumen.length === 0 ? (
        <div className="flex flex-col items-center gap-3 rounded-2xl border border-dashed border-[#c8d8e8] bg-white py-16 text-center">
          <BarChart2 className="h-8 w-8 text-slate-300" />
          <p className="text-sm font-semibold text-[#0c2340]">Sin datos para {year}</p>
          <p className="max-w-xs text-xs text-slate-400">
            No hay registros de actividades para este año.
          </p>
        </div>
      ) : (
        <>
          {/* Stats bar */}
          <div className="flex flex-wrap gap-3">
            <div className="rounded-2xl border border-[#e2e8f0] bg-white px-5 py-3">
              <p className="text-xs text-slate-400">Meses con 100%</p>
              <p className="text-2xl font-bold text-emerald-600">{completedCells}</p>
              <p className="text-[10px] text-slate-400">de {totalCells} meses con datos</p>
            </div>
            <div className="rounded-2xl border border-[#e2e8f0] bg-white px-5 py-3">
              <p className="text-xs text-slate-400">Meses firmados</p>
              <p className="text-2xl font-bold text-[#0c2340]">{totalSignedCells}</p>
            </div>
          </div>

          {/* Matrix table */}
          <div className="overflow-hidden rounded-2xl border border-[#e2e8f0] bg-white">
            <div className="overflow-x-auto">
              <table className="w-full text-xs">
                <thead>
                  <tr className="border-b border-[#e2e8f0] bg-slate-50">
                    <th className="min-w-[160px] py-3 pl-4 pr-3 text-left text-xs font-semibold text-[#0c2340]">
                      Programa
                    </th>
                    {MONTHS_SHORT.map((m, i) => (
                      <th
                        key={i}
                        className={`w-14 px-1 py-3 text-center text-xs font-semibold ${
                          i + 1 === currentMonth && year === currentYear
                            ? 'text-blue-600'
                            : 'text-[#0c2340]'
                        }`}
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
                      <tr key={prog.programaId} className="border-b border-[#e8f0f8] last:border-0 hover:bg-[#f5f9ff]">
                        <td className="py-3 pl-4 pr-3">
                          {prog.code && (
                            <span className="mr-1.5 rounded bg-[#e8f0f8] px-1.5 py-0.5 font-mono text-[10px] text-[#3a6fa0]">
                              {prog.code}
                            </span>
                          )}
                          <span className="text-xs font-medium text-[#0c2340]">{prog.name}</span>
                        </td>
                        {Array.from({ length: 12 }, (_, i) => i + 1).map((month) => {
                          const mes = mesByMonth.get(month)
                          const bg = CellBg(mes, currentMonth, year, currentYear)
                          const isCurrentCol = month === currentMonth && year === currentYear
                          return (
                            <td
                              key={month}
                              className={`px-1 py-3 text-center ${bg} ${
                                isCurrentCol ? 'ring-inset ring-1 ring-blue-200' : ''
                              }`}
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
            <div className="flex flex-wrap items-center gap-4 border-t border-[#e2e8f0] px-4 py-3">
              <span className="text-[10px] font-semibold uppercase tracking-wide text-slate-400">Leyenda</span>
              <div className="flex items-center gap-1.5">
                <div className="h-2 w-2 rounded-full bg-emerald-500" />
                <span className="text-[11px] text-slate-500">100%</span>
              </div>
              <div className="flex items-center gap-1.5">
                <div className="h-2 w-2 rounded-full bg-amber-400" />
                <span className="text-[11px] text-slate-500">60–99%</span>
              </div>
              <div className="flex items-center gap-1.5">
                <div className="h-2 w-2 rounded-full bg-red-400" />
                <span className="text-[11px] text-slate-500">&lt;60%</span>
              </div>
              <div className="flex items-center gap-1.5">
                <Lock className="h-3 w-3 text-emerald-400" />
                <span className="text-[11px] text-slate-500">Firmado</span>
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  )
}
