import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { ClipboardList, Layers, Loader2 } from 'lucide-react'
import { usePprContext } from '@/modules/ppr/context/ppr-context'
import { fetchPeriodoActivo, fetchProgramas } from '@/modules/ppr/services/ppr.service'
import type { PprPeriodo, PprPrograma } from '@/modules/ppr/types'

function pctColor(pct: number) {
  if (pct >= 100) return 'text-emerald-600'
  if (pct >= 60) return 'text-amber-600'
  return 'text-red-500'
}

function pctBarColor(pct: number) {
  if (pct >= 100) return 'bg-emerald-500'
  if (pct >= 60) return 'bg-amber-400'
  return 'bg-red-400'
}

interface ProgramaCardProps {
  programa: PprPrograma
  onVerActividades: (programaId: number) => void
}

function ProgramaCard({ programa, onVerActividades }: ProgramaCardProps) {
  const pct =
    programa.totalActividades > 0
      ? Math.round((programa.completadas / programa.totalActividades) * 100)
      : null

  return (
    <div className="flex flex-col gap-4 rounded-2xl border border-[#e2e8f0] bg-white p-5 transition hover:border-green-300 hover:shadow-sm">
      {/* Header */}
      <div className="flex items-start gap-3">
        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-green-500/10">
          <Layers className="h-5 w-5 text-green-600" />
        </div>
        <div className="min-w-0">
          {programa.code && (
            <span className="mb-0.5 inline-block rounded bg-[#e8f0f8] px-1.5 py-0.5 font-mono text-[10px] text-[#3a6fa0]">
              {programa.code}
            </span>
          )}
          <p className="text-sm font-bold leading-snug text-[#0c2340]">{programa.name}</p>
        </div>
      </div>

      {/* Progress */}
      <div>
        <div className="mb-1.5 flex items-center justify-between text-xs">
          <span className="text-slate-500">Avance del período</span>
          {pct != null ? (
            <span className={`font-semibold ${pctColor(pct)}`}>{pct}%</span>
          ) : (
            <span className="text-slate-300">Sin actividades</span>
          )}
        </div>
        <div className="h-2 w-full overflow-hidden rounded-full bg-slate-100">
          <div
            className={`h-full rounded-full transition-all ${pct != null ? pctBarColor(pct) : 'bg-slate-200'}`}
            style={{ width: `${pct ?? 0}%` }}
          />
        </div>
        <p className="mt-1 text-[10px] text-slate-400">
          {programa.completadas} de {programa.totalActividades} actividades completadas
        </p>
      </div>

      {/* Action */}
      <button
        onClick={() => onVerActividades(programa.id)}
        className="mt-auto flex items-center justify-center gap-1.5 rounded-xl bg-[#0c2340] px-4 py-2 text-xs font-semibold text-white transition hover:bg-[#153860]"
      >
        <ClipboardList className="h-3.5 w-3.5" />
        Ver actividades
      </button>
    </div>
  )
}

export function PprProgramasPage() {
  const { pprUser } = usePprContext()
  const navigate = useNavigate()

  const [programas, setProgramas] = useState<PprPrograma[]>([])
  const [periodo, setPeriodo] = useState<PprPeriodo | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

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

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-lg font-bold text-[#0c2340]">Mis Programas</h1>
          <p className="text-xs text-slate-400">
            {periodo ? `Período activo: ${periodo.label}` : 'Cargando…'}
          </p>
        </div>
        {!loading && (
          <span className="rounded-xl border border-[#e2e8f0] bg-white px-3 py-1.5 text-xs font-semibold text-[#0c2340]">
            {programas.length} programa{programas.length !== 1 ? 's' : ''} asignado{programas.length !== 1 ? 's' : ''}
          </span>
        )}
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
      ) : programas.length === 0 ? (
        <div className="flex flex-col items-center gap-3 rounded-2xl border border-dashed border-[#c8d8e8] bg-white py-16 text-center">
          <Layers className="h-8 w-8 text-slate-300" />
          <p className="text-sm font-semibold text-[#0c2340]">Sin programas asignados</p>
          <p className="max-w-xs text-xs text-slate-400">
            Contacte al administrador para que le asigne programas PPR.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {programas.map((p) => (
            <ProgramaCard key={p.id} programa={p} onVerActividades={handleVerActividades} />
          ))}
        </div>
      )}
    </div>
  )
}
