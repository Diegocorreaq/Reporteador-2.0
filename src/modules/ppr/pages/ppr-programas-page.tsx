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
  PprProgressBar,
  PprSectionHeader,
  PprSkeletonCard,
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

  const pct = sumMetaEsperada > 0
    ? Math.round((sumLogrado / sumMetaEsperada) * 100)
    : null

  const mesAnterior = mesesCompletos > 0 ? MESES_ES[mesesCompletos - 1] : null
  const labelPeriodo = mesAnterior ? `Avance a ${mesAnterior}` : 'Sin períodos cerrados'

  // Glow color por estado (semáforo)
  const accentColor =
    pct == null   ? 'from-slate-50 to-slate-100/50'   :
    pct >= 100    ? 'from-emerald-50 to-emerald-100/40' :
    pct >= 80     ? 'from-amber-50 to-amber-100/40'    :
    'from-rose-50 to-rose-100/40'

  const ringColor =
    pct == null   ? 'ring-slate-200/40' :
    pct >= 100    ? 'ring-emerald-200/40' :
    pct >= 80     ? 'ring-amber-200/40' :
    'ring-rose-200/40'

  return (
    <div className={cn(
      'group relative flex flex-col gap-4 overflow-hidden rounded-2xl border border-slate-200 bg-white p-5 transition-all hover:-translate-y-0.5 hover:border-indigo-300 hover:shadow-lg',
      'before:absolute before:inset-0 before:bg-gradient-to-br before:opacity-0 before:transition-opacity hover:before:opacity-60',
      `before:${accentColor}`,
    )}>
      <div className={cn('absolute inset-x-0 top-0 h-1 rounded-t-2xl bg-gradient-to-r', accentColor)} />

      {/* Header */}
      <div className="relative flex items-start gap-3">
        <div className={cn(
          'flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br ring-1 transition-transform group-hover:scale-110',
          'from-indigo-50 to-indigo-100',
          ringColor,
        )}>
          <Layers className="h-5 w-5 text-indigo-600" />
        </div>
        <div className="min-w-0 flex-1">
          {programa.code && (
            <span className="mb-1 inline-block rounded bg-indigo-50 px-1.5 py-0.5 font-mono text-[10px] font-semibold text-indigo-700">
              {programa.code}
            </span>
          )}
          <p className="text-sm font-bold leading-snug text-slate-900">{programa.name}</p>
        </div>
      </div>

      {/* Progress */}
      <div className="relative">
        <div className="mb-1.5 flex items-center justify-between text-xs">
          <span className="text-slate-500">{labelPeriodo}</span>
          {pct != null ? (
            <span className={cn('text-base font-bold tabular-nums', pctTextColor(pct))}>{pct}%</span>
          ) : (
            <span className="text-slate-300">—</span>
          )}
        </div>
        <PprProgressBar value={pct ?? 0} size="md" />
        <div className="mt-2 flex items-center justify-between gap-2 text-[10px] text-slate-500">
          <span>{fmtNum(sumLogrado)} de {fmtNum(sumMetaEsperada)} esperado</span>
          <span className="flex items-center gap-1">
            <Target className="h-2.5 w-2.5" />
            {fmtNum(sumMetaAnual)}
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
          className="flex flex-1 items-center justify-center gap-1.5 rounded-xl bg-indigo-600 px-3 py-2 text-xs font-semibold text-white shadow-sm transition hover:bg-indigo-700 hover:shadow-md"
        >
          <BarChart2 className="h-3.5 w-3.5" />
          Dashboard
        </button>
        <button
          onClick={() => onVerActividades(programa.id)}
          className="flex flex-1 items-center justify-center gap-1.5 rounded-xl border border-indigo-600 px-3 py-2 text-xs font-semibold text-slate-900 transition hover:bg-indigo-600 hover:text-white"
        >
          <ClipboardList className="h-3.5 w-3.5" />
          Ingresar datos
        </button>
      </div>
    </div>
  )
}

type SortKey = 'pct-asc' | 'pct-desc' | 'name'

export function PprProgramasPage() {
  const { pprUser } = usePprContext()
  const navigate = useNavigate()

  const [programas, setProgramas] = useState<PprPrograma[]>([])
  const [periodo, setPeriodo] = useState<PprPeriodo | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [search, setSearch] = useState('')
  const [sort, setSort] = useState<SortKey>('pct-asc')

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
    if (!search) return true
    const q = search.toLowerCase()
    return p.name.toLowerCase().includes(q) || (p.code ?? '').toLowerCase().includes(q)
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
          <div className="grid grid-cols-3 gap-3">
            <div className="rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-3">
              <p className="text-[10px] font-semibold uppercase tracking-wide text-emerald-700">Al día</p>
              <p className="mt-0.5 text-2xl font-bold tabular-nums text-emerald-700">{adelantados}</p>
              <p className="text-[10px] text-emerald-600/80">≥ 100%</p>
            </div>
            <div className="rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3">
              <p className="text-[10px] font-semibold uppercase tracking-wide text-amber-700">En línea</p>
              <p className="mt-0.5 text-2xl font-bold tabular-nums text-amber-700">{enLinea}</p>
              <p className="text-[10px] text-amber-600/80">80–99%</p>
            </div>
            <div className="rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3">
              <p className="text-[10px] font-semibold uppercase tracking-wide text-rose-700">Atrasados</p>
              <p className="mt-0.5 text-2xl font-bold tabular-nums text-rose-700">{atrasados}</p>
              <p className="text-[10px] text-rose-600/80">&lt; 80%</p>
            </div>
          </div>

          {/* Filters */}
          <div className="flex flex-wrap items-center gap-2">
            <div className="relative flex-1 min-w-[200px]">
              <Search className="pointer-events-none absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-slate-400" />
              <input
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Buscar programa por nombre o código…"
                className="w-full rounded-xl border border-slate-200 bg-white py-2 pl-9 pr-3 text-xs transition focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
              />
            </div>
            <select
              value={sort}
              onChange={(e) => setSort(e.target.value as SortKey)}
              className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs text-slate-900 transition focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
            >
              <option value="pct-asc">Atrasados primero</option>
              <option value="pct-desc">Mayor avance primero</option>
              <option value="name">Por nombre</option>
            </select>
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
