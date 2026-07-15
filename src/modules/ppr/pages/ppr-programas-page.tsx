import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { BarChart2, ClipboardList, Layers, Search, Target } from 'lucide-react'
import { usePprContext } from '@/modules/ppr/context/ppr-context'
import { fetchPeriodoActivo, fetchProgramas } from '@/modules/ppr/services/ppr.service'
import type { PprPeriodo, PprPrograma } from '@/modules/ppr/types'
import {
  PprAlert,
  PprEmptyState,
  PprPill,
  PprSectionHeader,
  PprSkeletonCard,
  pctBarColor,
  pctTextColor,
} from '@/modules/ppr/components/ui-primitives'
import { cn } from '@/lib/utils'

const MESES_ES = ['Enero','Febrero','Marzo','Abril','Mayo','Junio','Julio','Agosto','Septiembre','Octubre','Noviembre','Diciembre']

function fmtNum(n: number) {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`
  if (n >= 1_000) return `${Math.round(n / 1_000)}k`
  return n.toLocaleString('es-PE')
}

interface ProgramaCardProps {
  programa: PprPrograma
  onVerActividades: (programaId: number) => void
  onVerDashboard: (programaId: number) => void
}

function ProgramaCard({ programa, onVerActividades, onVerDashboard }: ProgramaCardProps) {
  const { mesesCompletos, sumLogrado, sumMetaEsperada, sumMetaAnual, conDatos, totalActividades } = programa
  const visibleGroups = programa.activityScope?.length ? programa.activityScope : programa.activityGroups ?? []

  const pctCorte = sumMetaEsperada > 0
    ? Math.round((sumLogrado / sumMetaEsperada) * 100)
    : null
  const pctAnual = sumMetaAnual > 0
    ? Math.round((sumLogrado / sumMetaAnual) * 100)
    : null
  const pctEsperadoAnual = mesesCompletos > 0
    ? Math.round((mesesCompletos / 12) * 100)
    : 0

  const mesAnterior = mesesCompletos > 0 ? MESES_ES[mesesCompletos - 1] : null
  const labelPeriodo = mesAnterior ? `Avance anual a ${mesAnterior}` : 'Sin períodos cerrados'

  // Glow color por estado (semáforo)
  const statusStyle =
    pctCorte == null
      ? { bar: 'bg-slate-300', icon: 'bg-slate-100 text-slate-500 ring-slate-200' }
      : pctCorte >= 100
        ? { bar: 'bg-emerald-500', icon: 'bg-emerald-50 text-emerald-700 ring-emerald-200' }
        : pctCorte >= 80
          ? { bar: 'bg-teal-500', icon: 'bg-teal-50 text-teal-700 ring-teal-200' }
          : { bar: 'bg-rose-500', icon: 'bg-rose-50 text-rose-700 ring-rose-200' }

  return (
    <div className={cn(
      'group relative flex flex-col gap-4 overflow-hidden rounded-lg border border-slate-200 bg-white p-5 shadow-[0_1px_2px_rgba(15,23,42,0.04)] transition hover:border-teal-300',
    )}>
      <div className={cn('absolute inset-y-0 left-0 w-1', statusStyle.bar)} />

      {/* Header */}
      <div className="relative flex items-start gap-3">
        <div className={cn(
          'flex h-10 w-10 shrink-0 items-center justify-center rounded-lg ring-1',
          statusStyle.icon,
        )}>
          <Layers className="h-5 w-5" />
        </div>
        <div className="min-w-0 flex-1">
          <div className="mb-1 flex flex-wrap items-center gap-1.5">
            {programa.code && (
              <span className="inline-block rounded bg-slate-100 px-1.5 py-0.5 font-mono text-[10px] font-semibold text-slate-700">
                {programa.code}
              </span>
            )}
            {visibleGroups.map((group) => (
              <span
                key={group.code}
                className="inline-flex items-center rounded bg-cyan-50 px-1.5 py-0.5 text-[10px] font-semibold text-cyan-700"
              >
                {group.name}
              </span>
            ))}
          </div>
          <p className="text-sm font-bold leading-snug text-slate-900">{programa.name}</p>
        </div>
      </div>

      {/* Progress */}
      <div className="relative">
        <div className="mb-1.5 flex items-center justify-between text-xs">
          <span className="text-slate-500">{labelPeriodo}</span>
          {pctAnual != null ? (
            <span className={cn('text-base font-bold tabular-nums', pctTextColor(pctCorte ?? 0))}>{pctAnual}%</span>
          ) : (
            <span className="text-slate-300">—</span>
          )}
        </div>
        <div className="relative h-1.5 w-full overflow-visible rounded bg-slate-100">
          <div
            className={cn('h-full rounded transition-all duration-500', pctBarColor(pctCorte ?? 0))}
            style={{ width: `${Math.min(pctAnual ?? 0, 100)}%` }}
          />
          {mesesCompletos > 0 && (
            <div
              className="absolute top-1/2 h-4 w-0.5 -translate-y-1/2 rounded-full bg-slate-700"
              style={{ left: `${Math.min(pctEsperadoAnual, 100)}%` }}
            />
          )}
        </div>
        <div className="mt-2 flex items-center justify-between gap-2 text-[10px] text-slate-500">
          <span>Corte: {pctCorte != null ? `${pctCorte}%` : '—'} · {fmtNum(sumLogrado)} de {fmtNum(sumMetaEsperada)}</span>
          <span className="flex items-center gap-1">
            <Target className="h-2.5 w-2.5" />
            {pctEsperadoAnual}% esperado
          </span>
        </div>
      </div>

      {/* Meta info */}
      <div className="relative flex items-center justify-between">
        <PprPill tone={conDatos === totalActividades && totalActividades > 0 ? 'emerald' : 'slate'}>
          {conDatos}/{totalActividades} actividades
        </PprPill>
      </div>

      {/* Actions */}
      <div className="relative mt-auto flex gap-2">
        <button
          onClick={() => onVerDashboard(programa.id)}
          className="flex flex-1 items-center justify-center gap-1.5 rounded-lg bg-teal-700 px-3 py-2 text-xs font-semibold text-white shadow-sm transition hover:bg-teal-800"
        >
          <BarChart2 className="h-3.5 w-3.5" />
          Dashboard
        </button>
        <button
          onClick={() => onVerActividades(programa.id)}
          className="flex flex-1 items-center justify-center gap-1.5 rounded-lg border border-slate-300 px-3 py-2 text-xs font-semibold text-slate-900 transition hover:border-teal-700 hover:bg-teal-50 hover:text-teal-800"
        >
          <ClipboardList className="h-3.5 w-3.5" />
          Ingresar datos
        </button>
      </div>
    </div>
  )
}

type SortKey = 'pct-asc' | 'pct-desc' | 'name'
type StatusFilter = 'all' | 'delayed' | 'line' | 'done'

export function PprProgramasPage() {
  const { pprUser } = usePprContext()
  const navigate = useNavigate()

  const [programas, setProgramas] = useState<PprPrograma[]>([])
  const [periodo, setPeriodo] = useState<PprPeriodo | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [search, setSearch] = useState('')
  const [sort, setSort] = useState<SortKey>('pct-asc')
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('all')

  useEffect(() => {
    setLoading(true)
    Promise.all([fetchProgramas(pprUser.employeeId), fetchPeriodoActivo()])
      .then(([progs, per]) => {
        setProgramas(progs)
        setPeriodo(per)
      })
      .catch(() => setError('No se pudieron cargar los programas.'))
      .finally(() => setLoading(false))
  }, [pprUser.employeeId])

  function handleVerActividades(programaId: number) {
    navigate('/ppr/actividades', { state: { programaId } })
  }

  function handleVerDashboard(programaId: number) {
    navigate(`/ppr/programas/${programaId}`)
  }

  // Filter + sort
  const filtered = programas.filter((p) => {
    const ratio = p.sumMetaEsperada > 0 ? p.sumLogrado / p.sumMetaEsperada : null
    const matchesStatus =
      statusFilter === 'all'
      || (statusFilter === 'done' && ratio != null && ratio >= 1)
      || (statusFilter === 'line' && ratio != null && ratio >= 0.8 && ratio < 1)
      || (statusFilter === 'delayed' && ratio != null && ratio < 0.8)

    if (!matchesStatus) return false
    if (!search) return true
    const q = search.toLowerCase()
    return (
      p.name.toLowerCase().includes(q) ||
      (p.code ?? '').toLowerCase().includes(q) ||
      p.activityScope?.some((group) => group.name.toLowerCase().includes(q) || group.code.toLowerCase().includes(q)) ||
      p.activityGroups?.some((group) => group.name.toLowerCase().includes(q) || group.code.toLowerCase().includes(q))
    )
  })

  const sorted = [...filtered].sort((a, b) => {
    if (sort === 'name') return a.name.localeCompare(b.name)
    const pa = a.sumMetaEsperada > 0 ? a.sumLogrado / a.sumMetaEsperada : 1
    const pb = b.sumMetaEsperada > 0 ? b.sumLogrado / b.sumMetaEsperada : 1
    return sort === 'pct-asc' ? pa - pb : pb - pa
  })

  // Stats
  const total = programas.length
  const adelantados = programas.filter((p) =>
    p.sumMetaEsperada > 0 && (p.sumLogrado / p.sumMetaEsperada) >= 1,
  ).length
  const enLinea = programas.filter((p) => {
    const r = p.sumMetaEsperada > 0 ? p.sumLogrado / p.sumMetaEsperada : 0
    return r >= 0.8 && r < 1
  }).length
  const atrasados = programas.filter((p) =>
    p.sumMetaEsperada > 0 && (p.sumLogrado / p.sumMetaEsperada) < 0.8,
  ).length
  const statusOptions: Array<{ value: StatusFilter; label: string; count: number }> = [
    { value: 'all', label: 'Todos', count: total },
    { value: 'delayed', label: 'Atrasados', count: atrasados },
    { value: 'line', label: 'En linea', count: enLinea },
    { value: 'done', label: 'Al dia', count: adelantados },
  ]

  return (
    <div className="space-y-5">
      {/* Header */}
      <PprSectionHeader
        eyebrow="Vista por programa"
        title="Mis Programas"
        description={periodo ? <>Período activo: <span className="font-semibold">{periodo.label}</span></> : 'Cargando…'}
        right={
          !loading && total > 0 && (
            <PprPill tone="navy" size="md">
              {total} programa{total !== 1 ? 's' : ''}
            </PprPill>
          )
        }
      />

      {/* Error */}
      {error && (
        <PprAlert tone="error" onClose={() => setError(null)}>
          {error}
        </PprAlert>
      )}

      {loading ? (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {Array.from({ length: 6 }).map((_, i) => <PprSkeletonCard key={i} />)}
        </div>
      ) : programas.length === 0 ? (
        <PprEmptyState
          icon={Layers}
          title="Sin programas asignados"
          description="Contacte al administrador para que le asigne programas PPR."
        />
      ) : (
        <>
          {/* Stats summary */}
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
            <div className="rounded-lg border border-emerald-200 bg-emerald-50 px-4 py-3">
              <p className="text-[10px] font-semibold uppercase tracking-wide text-emerald-700">Al día</p>
              <p className="mt-0.5 text-2xl font-bold tabular-nums text-emerald-700">{adelantados}</p>
              <p className="text-[10px] text-emerald-600/80">≥ 100%</p>
            </div>
            <div className="rounded-lg border border-teal-200 bg-teal-50 px-4 py-3">
              <p className="text-[10px] font-semibold uppercase tracking-wide text-teal-700">En linea</p>
              <p className="mt-0.5 text-2xl font-bold tabular-nums text-teal-700">{enLinea}</p>
              <p className="text-[10px] text-teal-600/80">80-99%</p>
            </div>
            <div className="rounded-lg border border-rose-200 bg-rose-50 px-4 py-3">
              <p className="text-[10px] font-semibold uppercase tracking-wide text-rose-700">Atrasados</p>
              <p className="mt-0.5 text-2xl font-bold tabular-nums text-rose-700">{atrasados}</p>
              <p className="text-[10px] text-rose-600/80">&lt; 80%</p>
            </div>
          </div>

          {/* Filters */}
          <div className="rounded-lg border border-slate-200 bg-white p-3 shadow-[0_1px_2px_rgba(15,23,42,0.04)]">
            <div className="mb-3 flex flex-wrap gap-1.5">
              {statusOptions.map((option) => (
                <button
                  key={option.value}
                  onClick={() => setStatusFilter(option.value)}
                  className={cn(
                    'rounded-md px-2.5 py-1.5 text-[11px] font-semibold transition',
                    statusFilter === option.value
                      ? 'bg-slate-900 text-white'
                      : 'bg-slate-100 text-slate-600 hover:bg-teal-50 hover:text-teal-700',
                  )}
                >
                  {option.label}
                  <span className="ml-1 opacity-70">{option.count}</span>
                </button>
              ))}
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <div className="relative min-w-[200px] flex-1">
              <Search className="pointer-events-none absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-slate-400" />
              <input
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Buscar programa por nombre o código…"
                className="w-full rounded-lg border border-slate-300 bg-white py-2 pl-9 pr-3 text-xs transition focus:border-teal-600 focus:outline-none focus:ring-2 focus:ring-teal-600/15"
              />
              </div>
              <select
                value={sort}
                onChange={(e) => setSort(e.target.value as SortKey)}
                className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-xs text-slate-900 transition focus:border-teal-600 focus:outline-none focus:ring-2 focus:ring-teal-600/15"
              >
                <option value="pct-asc">Atrasados primero</option>
                <option value="pct-desc">Mayor avance primero</option>
                <option value="name">Por nombre</option>
              </select>
            </div>
          </div>

          {/* Cards grid */}
          {sorted.length === 0 ? (
            <PprEmptyState
              icon={Search}
              title="Sin resultados"
              description={`No se encontraron programas que coincidan con "${search}".`}
            />
          ) : (
            <div className="ppr-stagger grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {sorted.map((p) => (
                <ProgramaCard
                  key={p.id}
                  programa={p}
                  onVerActividades={handleVerActividades}
                  onVerDashboard={handleVerDashboard}
                />
              ))}
            </div>
          )}
        </>
      )}
    </div>
  )
}
