import { ClipboardList, TrendingUp } from 'lucide-react'
import { Link } from 'react-router-dom'
import { usePprContext } from '@/modules/ppr/context/ppr-context'

export function PprInicioPage() {
  const { pprUser } = usePprContext()

  const firstName = pprUser.employeeName.split(' ')[0] ?? pprUser.employeeName

  return (
    <div className="space-y-6">
      {/* Welcome */}
      <div className="rounded-2xl border border-[#e2e8f0] bg-white px-6 py-5">
        <div className="flex items-start justify-between gap-4">
          <div>
            <p className="text-xs font-medium text-slate-400">Bienvenido</p>
            <h1 className="mt-0.5 text-xl font-bold text-[#0c2340]">{pprUser.employeeName}</h1>
            <p className="mt-1 text-xs text-slate-500">Coordinador PPR — Programación Presupuestal por Resultados</p>
          </div>
          <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-green-500/10">
            <TrendingUp className="h-6 w-6 text-green-600" />
          </div>
        </div>
      </div>

      {/* Quick access */}
      <div>
        <h2 className="mb-3 text-xs font-semibold uppercase tracking-widest text-slate-400">Accesos rápidos</h2>
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
          <Link
            to="/ppr/actividades"
            className="flex items-center gap-4 rounded-2xl border border-[#e2e8f0] bg-white p-5 transition hover:border-green-300 hover:shadow-sm"
          >
            <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-green-500/10">
              <ClipboardList className="h-5 w-5 text-green-600" />
            </div>
            <div>
              <p className="text-sm font-semibold text-[#0c2340]">Mis Actividades</p>
              <p className="text-xs text-slate-400">Registrar avances del mes</p>
            </div>
          </Link>
        </div>
      </div>

      {/* Info banner */}
      <div className="rounded-2xl border border-green-200 bg-green-50 px-5 py-4 text-xs text-green-800">
        <p className="font-semibold">Portal PPR — Fase 2</p>
        <p className="mt-0.5 text-green-700">
          Hola <strong>{firstName}</strong>, desde aquí puedes registrar los avances mensuales de tus programas PPR.
          Más funcionalidades estarán disponibles próximamente.
        </p>
      </div>
    </div>
  )
}
