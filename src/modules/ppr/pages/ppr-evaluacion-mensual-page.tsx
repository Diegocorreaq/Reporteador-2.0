import { useEffect, useMemo, useState } from 'react'
import { Link, useNavigate, useSearchParams } from 'react-router-dom'
import ReactECharts from 'echarts-for-react'
import {
  ArrowLeft,
  BarChart3,
  Calendar,
  ChevronRight,
  Database,
  Loader2,
  Search,
} from 'lucide-react'
import { usePprContext } from '@/modules/ppr/context/ppr-context'
import { fetchEvaluacionMensual, fetchPeriodoActivo, fetchProgramas } from '@/modules/ppr/services/ppr.service'
import type { PprEvaluacionMensual, PprEvaluacionMensualActividad, PprPeriodo, PprPrograma } from '@/modules/ppr/types'
import { cn } from '@/lib/utils'

const MONTHS = ['Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio', 'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre']
const MIN_EVALUACION_YEAR = 2025

function fmt(value: number | null | undefined) {
  if (value == null) return '-'
  return value.toLocaleString('es-PE')
}

function fmtK(value: number | null | undefined) {
  if (value == null) return '-'
  if (value >= 1_000_000) return `${(value / 1_000_000).toFixed(1)} M`
  if (value >= 1_000) return `${Math.round(value / 1_000)} mil`
  return value.toLocaleString('es-PE')
}

function statusMeta(status: string, isPreliminary = false) {
  const goalLabel = isPreliminary ? 'meta al corte' : 'meta mensual'
  const map: Record<string, { label: string; tone: string; dot: string; color: string; description: string }> = {
    en_meta: { label: 'En meta', tone: 'text-emerald-700 bg-emerald-50 border-emerald-200', dot: 'bg-emerald-500', color: '#34d399', description: `Alcanzo o supero el 100% de la ${goalLabel}.` },
    seguimiento: { label: 'Seguimiento', tone: 'text-amber-700 bg-amber-50 border-amber-200', dot: 'bg-amber-500', color: '#fbbf24', description: `Tiene dato y esta entre 80% y 99% de la ${goalLabel}.` },
    critico: { label: 'Critico', tone: 'text-rose-700 bg-rose-50 border-rose-200', dot: 'bg-rose-500', color: '#fb7185', description: `Tiene dato, pero esta por debajo del 80% de la ${goalLabel}.` },
    pendiente_automatizacion: { label: 'Pendiente automatizacion', tone: 'text-amber-700 bg-amber-50 border-amber-200', dot: 'bg-amber-400', color: '#f59e0b', description: 'La actividad sigue visible, pero aun no tiene fuente automatica configurada.' },
    sin_dato: { label: 'Sin dato', tone: 'text-slate-600 bg-slate-50 border-slate-200', dot: 'bg-slate-300', color: '#cbd5e1', description: 'No tiene valor registrado para el mes seleccionado.' },
    con_avance: { label: 'Con avance', tone: 'text-cyan-700 bg-cyan-50 border-cyan-200', dot: 'bg-cyan-500', color: '#22d3ee', description: 'Tiene valor registrado, pero no hay meta mensual para calcular porcentaje.' },
    sin_meta: { label: 'Sin meta', tone: 'text-slate-600 bg-slate-50 border-slate-200', dot: 'bg-slate-400', color: '#94a3b8', description: 'No tiene meta mensual definida y no registra valor.' },
  }
  return map[status] ?? map.sin_dato
}

function pctClass(value: number | null) {
  if (value == null) return 'text-slate-400'
  if (value >= 100) return 'text-emerald-700'
  if (value >= 80) return 'text-amber-700'
  return 'text-rose-700'
}

function displayActivityCode(activity: { code?: string | null; sourceKey?: string | null }) {
  const sourceKey = String(activity.sourceKey ?? '').trim()
  if (sourceKey) return sourceKey

  const code = String(activity.code ?? '').trim()
  if (!code || /^AOI/i.test(code)) return null
  return code
}

function TopActivitiesChart({
  activities,
  isPreliminary,
}: {
  activities: PprEvaluacionMensualActividad[]
  isPreliminary: boolean
}) {
  const chartItems = activities
    .filter((activity) => activity.value != null || activity.monthlyGoal != null)
    .slice(0, 12)
    .reverse()
  const goalLabel = isPreliminary ? 'Meta al corte' : 'Meta mensual'

  const option = {
    backgroundColor: 'transparent',
    tooltip: { trigger: 'axis', axisPointer: { type: 'shadow' }, textStyle: { fontSize: 11 } },
    legend: {
      data: ['Logro del mes', goalLabel],
      bottom: 0,
      textStyle: { fontSize: 10, color: '#64748b' },
    },
    grid: { top: 18, bottom: 38, left: 112, right: 16 },
    xAxis: {
      type: 'value',
      axisLabel: { fontSize: 10, color: '#94a3b8', formatter: (value: number) => fmtK(value) },
      splitLine: { lineStyle: { color: '#f1f5f9' } },
    },
    yAxis: {
      type: 'category',
      data: chartItems.map((activity) => displayActivityCode(activity) || activity.name.slice(0, 18)),
      axisLabel: { fontSize: 10, color: '#64748b' },
      axisTick: { show: false },
      axisLine: { show: false },
    },
    series: [
      {
        name: 'Logro del mes',
        type: 'bar',
        data: chartItems.map((activity) => activity.value ?? 0),
        itemStyle: { color: '#0f766e', borderRadius: [0, 4, 4, 0] },
        barMaxWidth: 14,
      },
      {
        name: goalLabel,
        type: 'bar',
        data: chartItems.map((activity) => activity.monthlyGoal ?? 0),
        itemStyle: { color: '#dbeafe', borderRadius: [0, 4, 4, 0] },
        barMaxWidth: 14,
      },
    ],
  }

  return <ReactECharts option={option} style={{ height: '360px' }} />
}

function StatusChart({ data }: { data: PprEvaluacionMensual }) {
  const order = ['critico', 'seguimiento', 'pendiente_automatizacion', 'sin_dato', 'en_meta', 'con_avance', 'sin_meta']
  const visibleStatuses = order.filter((status) => (data.statusCounts[status] ?? 0) > 0)
  const total = visibleStatuses.reduce((sum, status) => sum + (data.statusCounts[status] ?? 0), 0)
  const enMeta = data.statusCounts.en_meta ?? 0
  const enMetaPct = total > 0 ? Math.round((enMeta / total) * 100) : null
  const option = {
    backgroundColor: 'transparent',
    tooltip: {
      trigger: 'item',
      textStyle: { fontSize: 11 },
      formatter: '{b}<br/>{c} actividades ({d}%)',
    },
    legend: { show: false },
    graphic: total > 0 ? [
      {
        type: 'text',
        left: 'center',
        top: '42%',
        style: {
          text: enMetaPct != null ? `${enMetaPct}%` : '-',
          fill: '#0f172a',
          fontSize: 22,
          fontWeight: 800,
          textAlign: 'center',
        },
      },
      {
        type: 'text',
        left: 'center',
        top: '55%',
        style: {
          text: 'en meta',
          fill: '#64748b',
          fontSize: 10,
          fontWeight: 600,
          textAlign: 'center',
        },
      },
    ] : [],
    series: [
      {
        type: 'pie',
        radius: ['54%', '78%'],
        center: ['50%', '48%'],
        avoidLabelOverlap: true,
        label: { show: false },
        labelLine: { show: false },
        emphasis: {
          scaleSize: 4,
          label: { show: false },
        },
        itemStyle: { borderColor: '#fff', borderWidth: 3 },
        data: visibleStatuses.map((status) => {
          const meta = statusMeta(status, data.isPreliminary)
          return {
            name: meta.label,
            value: data.statusCounts[status] ?? 0,
            itemStyle: { color: meta.color },
          }
        }),
      },
    ],
  }

  return (
    <div>
      <ReactECharts option={option} style={{ height: '210px', width: '100%' }} />
      <div className="mt-1 flex flex-wrap justify-center gap-2">
        {visibleStatuses.map((status) => {
          const meta = statusMeta(status, data.isPreliminary)
          return (
            <div
              key={status}
              className={cn('group relative inline-flex items-center gap-1.5 rounded border px-1.5 py-1 text-[9px] font-semibold', meta.tone)}
            >
              <span className={cn('h-1.5 w-1.5 rounded-full', meta.dot)} />
              <span>{meta.label}</span>
              <span className="font-bold tabular-nums">{data.statusCounts[status] ?? 0}</span>
              <div className="pointer-events-none absolute bottom-full left-1/2 z-20 mb-2 hidden w-48 -translate-x-1/2 rounded-lg border border-slate-200 bg-white px-3 py-2 text-[10px] font-medium leading-snug text-slate-600 shadow-lg group-hover:block">
                {meta.description}
                <span className="absolute left-1/2 top-full h-2 w-2 -translate-x-1/2 -translate-y-1/2 rotate-45 border-b border-r border-slate-200 bg-white" />
              </div>
            </div>
          )
        })}
        {visibleStatuses.length === 0 && (
          <p className="text-[10px] text-slate-400">Sin actividades para clasificar.</p>
        )}
      </div>
    </div>
  )
}

export function PprEvaluacionMensualPage() {
  const { pprUser } = usePprContext()
  const navigate = useNavigate()
  const [searchParams, setSearchParams] = useSearchParams()
  const now = new Date()
  const currentYear = now.getFullYear()
  const yearOptions = Array.from(
    { length: Math.max(currentYear - MIN_EVALUACION_YEAR + 1, 1) },
    (_, index) => currentYear - index,
  )

  const [programas, setProgramas] = useState<PprPrograma[]>([])
  const [periodo, setPeriodo] = useState<PprPeriodo | null>(null)
  const [programId, setProgramId] = useState<number>(() => Number(searchParams.get('programId')) || 0)
  const [year, setYear] = useState<number>(() => Math.max(Number(searchParams.get('year')) || currentYear, MIN_EVALUACION_YEAR))
  const [month, setMonth] = useState<number>(() => Number(searchParams.get('month')) || (now.getMonth() + 1))
  const [data, setData] = useState<PprEvaluacionMensual | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [query, setQuery] = useState('')

  useEffect(() => {
    Promise.all([
      fetchProgramas(pprUser.employeeId).catch(() => []),
      fetchPeriodoActivo().catch(() => null),
    ]).then(([programList, activePeriod]) => {
      setProgramas(programList)
      setPeriodo(activePeriod)
      if (!programId && programList[0]) setProgramId(programList[0].id)
    })
  }, [pprUser.employeeId])

  useEffect(() => {
    if (!programId) return
    if (year < MIN_EVALUACION_YEAR) {
      setYear(MIN_EVALUACION_YEAR)
      return
    }
    setSearchParams({
      programId: String(programId),
      year: String(year),
      month: String(month),
    }, { replace: true })
    setLoading(true)
    setError(null)
    fetchEvaluacionMensual(programId, year, month)
      .then(setData)
      .catch(() => setError('No se pudo cargar la evaluacion mensual.'))
      .finally(() => setLoading(false))
  }, [programId, year, month, setSearchParams])

  const selectedProgram = programas.find((program) => program.id === programId) ?? null
  const isOpenMonth = periodo?.year === year && periodo?.month === month
  const filteredActivities = useMemo(() => {
    const normalized = query.trim().toLowerCase()
    if (!data) return []
    if (!normalized) return data.activities
    return data.activities.filter((activity) =>
      activity.name.toLowerCase().includes(normalized)
      || String(displayActivityCode(activity) ?? '').toLowerCase().includes(normalized),
    )
  }, [data, query])
  const pendingAutomationCount = data?.statusCounts.pendiente_automatizacion ?? 0

  return (
    <div className="space-y-5">
      <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
        <div className="flex items-start gap-3">
          <button
            onClick={() => navigate(pprUser.role === 'admin' && selectedProgram ? `/ppr/programas/${selectedProgram.id}` : '/ppr')}
            className="mt-0.5 inline-flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs font-semibold text-slate-950 transition hover:bg-slate-50"
          >
            <ArrowLeft className="h-3.5 w-3.5" />
            Volver
          </button>
          <div>
            <div className="flex flex-wrap items-center gap-2">
              <span className="rounded bg-slate-100 px-2 py-1 font-mono text-[10px] font-bold text-teal-700">
                {selectedProgram?.code ?? data?.programCode ?? 'PPR'}
              </span>
              {data?.isPreliminary && (
                <span className="inline-flex items-center gap-1.5 rounded bg-cyan-50 px-2 py-1 text-[10px] font-bold uppercase tracking-wide text-cyan-700">
                  <Database className="h-3 w-3" />
                  Preliminar - corte {data.cutoffLabel ?? 'sin corte'}
                </span>
              )}
              {!data?.isPreliminary && (
                <span className="rounded bg-emerald-50 px-2 py-1 text-[10px] font-bold uppercase tracking-wide text-emerald-700">
                  Consolidado mensual
                </span>
              )}
            </div>
            <h1 className="mt-2 text-xl font-bold leading-tight text-slate-950">
              Evaluacion mensual
            </h1>
            <p className="mt-1 text-xs text-slate-500">
              {data?.programName ?? selectedProgram?.name ?? 'Seleccione un programa'} · {MONTHS[month - 1]} {year}
            </p>
          </div>
        </div>

        <div className="grid gap-2 sm:grid-cols-[minmax(180px,260px)_120px_160px]">
          <select
            value={programId || ''}
            onChange={(event) => setProgramId(Number(event.target.value))}
            className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-xs font-semibold text-slate-950 outline-none transition focus:border-teal-600 focus:ring-2 focus:ring-teal-600/15"
          >
            {programas.map((program) => (
              <option key={program.id} value={program.id}>
                {program.code} · {program.name}
              </option>
            ))}
          </select>
          <select
            value={year}
            onChange={(event) => setYear(Number(event.target.value))}
            className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-xs font-semibold text-slate-950 outline-none transition focus:border-teal-600 focus:ring-2 focus:ring-teal-600/15"
          >
            {yearOptions.map((item) => (
              <option key={item} value={item}>{item}</option>
            ))}
          </select>
          <select
            value={month}
            onChange={(event) => setMonth(Number(event.target.value))}
            className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-xs font-semibold text-slate-950 outline-none transition focus:border-teal-600 focus:ring-2 focus:ring-teal-600/15"
          >
            {MONTHS.map((label, index) => (
              <option key={label} value={index + 1}>{label}</option>
            ))}
          </select>
        </div>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-20">
          <Loader2 className="h-6 w-6 animate-spin text-teal-700" />
        </div>
      ) : error ? (
        <div className="rounded-lg border border-rose-200 bg-rose-50 px-4 py-3 text-xs font-semibold text-rose-700">
          {error}
        </div>
      ) : data ? (
        <>
          <div
            className={cn(
              'rounded-lg border bg-white p-4 shadow-[0_1px_2px_rgba(15,23,42,0.04)]',
              data.isPreliminary ? 'border-cyan-200 bg-cyan-50/40' : 'border-slate-200',
            )}
          >
            <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
              <div>
                <p className="text-[10px] font-bold uppercase tracking-[0.16em] text-slate-400">
                  {data.isPreliminary ? 'Mes actual con informacion preliminar' : 'Informacion consolidada del mes'}
                </p>
                <p className="mt-1 text-sm font-bold text-slate-950">
                  {data.isPreliminary ? `Informacion preliminar de ${MONTHS[data.month - 1]} ${data.year}` : data.monthLabel}
                </p>
                <p className="mt-1 text-xs text-slate-500">
                  {data.isPreliminary
                    ? `Ultimo corte de la fuente institucional: ${data.cutoffLabel ?? 'sin corte disponible'}. Rango consultado: ${data.rangeStart} a ${data.rangeEnd}. La meta y el estado se evaluan proporcionalmente al dia de corte.`
                    : `Valores registrados en la consolidacion PPR de ${MONTHS[data.month - 1]} ${data.year}.`}
                </p>
              </div>
              {isOpenMonth && (
                <Link
                  to="/ppr/periodos"
                  className="inline-flex items-center justify-center gap-1.5 rounded-lg bg-teal-700 px-3 py-2 text-xs font-semibold text-white transition hover:bg-teal-800"
                >
                  Ingresar datos
                  <ChevronRight className="h-3.5 w-3.5" />
                </Link>
              )}
            </div>
          </div>

          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            {[
              { label: 'Logro del mes', value: fmtK(data.totalValue), tone: 'text-slate-950' },
              { label: data.isPreliminary ? 'Meta al corte' : 'Meta mensual programada', value: fmtK(data.monthlyGoal), tone: 'text-slate-950' },
              { label: data.isPreliminary ? 'Cumplimiento al corte' : 'Cumplimiento de meta', value: data.monthlyGoalPct != null ? `${data.monthlyGoalPct}%` : '-', tone: pctClass(data.monthlyGoalPct) },
              { label: 'Actividades con dato', value: `${data.withValue}/${data.totalActivities}`, tone: 'text-teal-700' },
            ].map((item) => (
              <div key={item.label} className="rounded-lg border border-slate-200 bg-white p-4 shadow-[0_1px_2px_rgba(15,23,42,0.04)]">
                <p className="text-[10px] font-semibold uppercase tracking-wide text-slate-400">{item.label}</p>
                <p className={cn('mt-1 text-2xl font-bold', item.tone)}>{item.value}</p>
              </div>
            ))}
          </div>

          {data.isPreliminary && pendingAutomationCount > 0 && (
            <div className="rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-xs text-amber-800">
              <span className="font-semibold">{pendingAutomationCount} actividades pendientes de automatizacion.</span>
              <span className="ml-1 text-amber-700">
                Se muestran en el detalle sin valor automatico; las demas actividades usan la fuente institucional del corte.
              </span>
            </div>
          )}

          <div className="grid gap-4 lg:grid-cols-[1.35fr_0.65fr]">
            <div className="rounded-lg border border-slate-200 bg-white p-4 shadow-[0_1px_2px_rgba(15,23,42,0.04)]">
              <div className="mb-2 flex items-center gap-2">
                <BarChart3 className="h-4 w-4 text-teal-700" />
                <p className="text-xs font-bold text-slate-950">
                  Logro vs {data.isPreliminary ? 'meta al corte' : 'meta mensual'} por actividad
                </p>
              </div>
              <TopActivitiesChart activities={data.activities} isPreliminary={data.isPreliminary} />
            </div>
            <div className="rounded-lg border border-slate-200 bg-white p-4 shadow-[0_1px_2px_rgba(15,23,42,0.04)]">
              <div className="mb-2 flex items-center gap-2">
                <Calendar className="h-4 w-4 text-teal-700" />
                <p className="text-xs font-bold text-slate-950">Estado de actividades</p>
              </div>
              <StatusChart data={data} />
            </div>
          </div>

          <div className="rounded-lg border border-slate-200 bg-white shadow-[0_1px_2px_rgba(15,23,42,0.04)]">
            <div className="flex flex-col gap-3 border-b border-slate-200 p-4 md:flex-row md:items-center md:justify-between">
              <div>
                <p className="text-xs font-bold text-slate-950">Detalle por actividad</p>
                <p className="mt-1 text-[11px] text-slate-500">Ordenado para revisar primero actividades criticas, en seguimiento o sin dato.</p>
              </div>
              <div className="relative md:w-72">
                <Search className="absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-slate-400" />
                <input
                  value={query}
                  onChange={(event) => setQuery(event.target.value)}
                  placeholder="Buscar actividad o codigo..."
                  className="w-full rounded-lg border border-slate-300 bg-white py-2 pl-8 pr-3 text-xs text-slate-950 outline-none transition placeholder:text-slate-300 focus:border-teal-600 focus:ring-2 focus:ring-teal-600/15"
                />
              </div>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full min-w-[880px] border-collapse text-xs">
                <thead>
                  <tr className="border-b border-slate-200 bg-slate-50 text-left text-[10px] uppercase tracking-wide text-slate-400">
                    <th className="px-4 py-3 font-semibold">Actividad</th>
                    <th className="px-3 py-3 text-right font-semibold">Logro</th>
                    <th className="px-3 py-3 text-right font-semibold">{data.isPreliminary ? 'Meta corte' : 'Meta mes'}</th>
                    <th className="px-3 py-3 text-right font-semibold">{data.isPreliminary ? '% corte' : '% meta'}</th>
                    <th className="px-3 py-3 text-center font-semibold">Estado</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredActivities.map((activity) => {
                    const meta = statusMeta(activity.status, data.isPreliminary)
                    const activityCode = displayActivityCode(activity)
                    return (
                      <tr key={activity.activityId} className="border-b border-slate-100 hover:bg-slate-50">
                        <td className="px-4 py-3">
                          <div className="max-w-lg">
                            <div className="flex items-center gap-2">
                              {activityCode && (
                                <span className="rounded bg-slate-100 px-1.5 py-0.5 font-mono text-[9px] text-slate-500">
                                  {activityCode}
                                </span>
                              )}
                            </div>
                            <p className="mt-1 font-semibold leading-snug text-slate-900">{activity.name}</p>
                          </div>
                        </td>
                        <td className="px-3 py-3 text-right font-bold text-slate-950">{fmt(activity.value)}</td>
                        <td className="px-3 py-3 text-right text-slate-600">{fmt(activity.monthlyGoal)}</td>
                        <td className={cn('px-3 py-3 text-right font-bold', pctClass(activity.monthlyGoalPct))}>
                          {activity.monthlyGoalPct != null ? `${activity.monthlyGoalPct}%` : '-'}
                        </td>
                        <td className="px-3 py-3 text-center">
                          <span className={cn('inline-flex items-center gap-1.5 rounded border px-2 py-1 text-[10px] font-semibold', meta.tone)}>
                            <span className={cn('h-1.5 w-1.5 rounded-full', meta.dot)} />
                            {meta.label}
                          </span>
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          </div>
        </>
      ) : null}
    </div>
  )
}
