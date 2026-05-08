import { useEffect, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import {
  AlertCircle,
  BarChart2,
  Calendar,
  CheckCircle2,
  ChevronRight,
  ClipboardList,
  Layers,
  Settings2,
  Sparkles,
  TrendingDown,
  TrendingUp,
  Users,
} from 'lucide-react'
import { usePprContext } from '@/modules/ppr/context/ppr-context'
import { fetchPeriodoActivo, fetchPeriodos, fetchProgramas } from '@/modules/ppr/services/ppr.service'
import type { PprPeriodo, PprPeriodoItem, PprPrograma } from '@/modules/ppr/types'
import {
  PprAvatar,
  PprPill,
  PprProgressBar,
  PprSkeleton,
  PprSkeletonCard,
  pctBarColor,
  pctTextColor,
} from '@/modules/ppr/components/ui-primitives'
import { cn } from '@/lib/utils'

// ─── Helpers ──────────────────────────────────────────────────────────────────
const MESES = ['Enero','Febrero','Marzo','Abril','Mayo','Junio','Julio','Agosto','Septiembre','Octubre','Noviembre','Diciembre']

function greeting() {
  const h = new Date().getHours()
  if (h < 12) return 'Buenos días'
  if (h < 19) return 'Buenas tardes'
  return 'Buenas noches'
}

function fmtNum(n: number) {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`
  if (n >= 1_000)     return `${Math.round(n / 1_000)}k`
  return n.toLocaleString('es-PE')
}

// ─── Stat card ────────────────────────────────────────────────────────────────
function StatCard({
  label, value, sub, icon: Icon, accent = 'indigo', trend,
}: {
  label: string
  value: string | number
  sub?: string
  icon: React.ElementType
  accent?: 'indigo' | 'sky' | 'amber' | 'slate' | 'rose' | 'emerald'
  trend?: 'up' | 'down' | null
}) {
  const palettes = {
    indigo:  { bg: 'bg-indigo-500/10',  text: 'text-indigo-600',  ring: 'ring-indigo-500/20'  },
    sky:     { bg: 'bg-sky-500/10',     text: 'text-sky-600',     ring: 'ring-sky-500/20'     },
    amber:   { bg: 'bg-amber-500/10',   text: 'text-amber-600',   ring: 'ring-amber-500/20'   },
    slate:   { bg: 'bg-slate-100',      text: 'text-slate-500',   ring: 'ring-slate-200/40'   },
    rose:    { bg: 'bg-rose-500/10',    text: 'text-rose-600',    ring: 'ring-rose-500/20'    },
    emerald: { bg: 'bg-emerald-500/10', text: 'text-emerald-600', ring: 'ring-emerald-500/20' },
  }[accent]
  return (
    <div className="group relative overflow-hidden rounded-2xl border border-slate-200 bg-white p-4 transition-all hover:border-slate-300 hover:shadow-sm">
      <div className="flex items-start gap-3">
        <div
          className={cn(
            'flex h-11 w-11 shrink-0 items-center justify-center rounded-xl ring-1 transition-transform group-hover:scale-110',
            palettes.bg, palettes.ring,
          )}
        >
          <Icon className={cn('h-5 w-5', palettes.text)} />
        </div>
        <div className="min-w-0 flex-1">
          <p className="text-[11px] text-slate-400">{label}</p>
          <p className="mt-0.5 flex items-center gap-1.5 text-2xl font-bold leading-none text-slate-900">
            {value}
            {trend === 'up'   && <TrendingUp   className="h-4 w-4 text-emerald-500" />}
            {trend === 'down' && <TrendingDown className="h-4 w-4 text-rose-500" />}
          </p>
          {sub && <p className="mt-1 text-[10px] text-slate-400">{sub}</p>}
        </div>
      </div>
    </div>
  )
}

// ─── Programa mini card ───────────────────────────────────────────────────────
function ProgramaMiniCard({ programa, currentMonth }: { programa: PprPrograma; currentMonth: number }) {
  const navigate = useNavigate()
  const mesesCompletos = currentMonth - 1
  const pct = programa.sumMetaEsperada > 0
    ? Math.round((programa.sumLogrado / programa.sumMetaEsperada) * 100)
    : null

  const mesLabel = mesesCompletos > 0 ? `Avance a ${MESES[mesesCompletos - 1]}` : 'Sin períodos cerrados'

  return (
    <button
      onClick={() => navigate(`/ppr/programas/${programa.id}`)}
      className="group flex w-full items-center gap-3 rounded-xl border border-slate-200 bg-white p-3.5 text-left transition-all hover:border-indigo-300 hover:shadow-md hover:-translate-y-0.5"
    >
      <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-indigo-50 to-indigo-100">
        <span className="font-mono text-[10px] font-bold text-indigo-700">
          {programa.code || '—'}
        </span>
      </div>
      <div className="min-w-0 flex-1">
        <p className="truncate text-xs font-semibold text-slate-900">{programa.name}</p>
        <div className="mt-1.5 flex items-center gap-2">
          <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-slate-100">
            <div
              className={cn('h-full rounded-full transition-all duration-500',
                pct != null ? pctBarColor(pct) : 'bg-slate-200')}
              style={{ width: `${Math.min(pct ?? 0, 100)}%` }}
            />
          </div>
          <span className={cn('shrink-0 text-[11px] font-bold tabular-nums',
            pct != null ? pctTextColor(pct) : 'text-slate-300')}>
            {pct != null ? `${pct}%` : '—'}
          </span>
        </div>
        <p className="mt-1 text-[9px] text-slate-400">{mesLabel}</p>
      </div>
      <ChevronRight className="h-4 w-4 shrink-0 text-slate-300 transition-transform group-hover:translate-x-0.5 group-hover:text-indigo-500" />
    </button>
  )
}

// ─── Page ─────────────────────────────────────────────────────────────────────
export function PprInicioPage() {
  const { pprUser } = usePprContext()
  const navigate = useNavigate()
  const now = new Date()
  const currentMonth = now.getMonth() + 1
  const currentYear  = now.getFullYear()
  const todayLabel   = now.toLocaleDateString('es-PE', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })

  const [periodo, setPeriodo] = useState<PprPeriodo | null>(null)
  const [programas, setProgramas] = useState<PprPrograma[]>([])
  const [periodos, setPeriodos] = useState<PprPeriodoItem[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    Promise.all([
      fetchPeriodoActivo().catch(() => null),
      fetchProgramas(pprUser.employeeId).catch(() => []),
      fetchPeriodos(pprUser.employeeId).catch(() => []),
    ]).then(([per, progs, pers]) => {
      setPeriodo(per)
      setProgramas(progs)
      setPeriodos(pers)
    }).finally(() => setLoading(false))
  }, [pprUser.employeeId])

  // Derived stats
  const mesesCompletos = currentMonth - 1
  const periodosDelAnio = periodos.filter((p) => p.year === currentYear)
  const periodosFirmados = periodosDelAnio.filter((p) => p.isSigned).length
  const periodosPendientes = Math.max(0, mesesCompletos - periodosFirmados)

  const totalLogrado = programas.reduce((s, p) => s + p.sumLogrado, 0)
  const totalMetaEsperada = programas.reduce((s, p) => s + p.sumMetaEsperada, 0)
  const pctGlobal = totalMetaEsperada > 0
    ? Math.round((totalLogrado / totalMetaEsperada) * 100)
    : null

  const programasAdelantados = programas.filter((p) =>
    p.sumMetaEsperada > 0 && (p.sumLogrado / p.sumMetaEsperada) >= 1,
  ).length
  const programasAtrasados = programas.filter((p) =>
    p.sumMetaEsperada > 0 && (p.sumLogrado / p.sumMetaEsperada) < 0.8,
  ).length

  // Sorted: atrasados primero
  const programasSorted = [...programas].sort((a, b) => {
    const pa = a.sumMetaEsperada > 0 ? a.sumLogrado / a.sumMetaEsperada : 1
    const pb = b.sumMetaEsperada > 0 ? b.sumLogrado / b.sumMetaEsperada : 1
    return pa - pb
  })

  const isAdmin = pprUser.role === 'admin'

  const quickLinks = [
    { to: '/ppr/actividades', icon: ClipboardList, label: 'Mis Actividades', sub: 'Registrar avance del mes',  accent: 'indigo' as const },
    { to: '/ppr/programas',   icon: Layers,        label: 'Programas',        sub: 'Ver progreso por programa', accent: 'indigo' as const },
    { to: '/ppr/periodos',    icon: Calendar,      label: 'Períodos',         sub: 'Historial y firma mensual', accent: 'sky'    as const },
    { to: '/ppr/reportes',    icon: BarChart2,     label: 'Resumen Anual',    sub: 'Matriz de avance por mes',  accent: 'sky'    as const },
    ...(isAdmin
      ? [
          { to: '/ppr/admin/coordinadores', icon: Users,     label: 'Coordinadores',   sub: 'Gestión de accesos',         accent: 'amber' as const },
          { to: '/ppr/admin/actividades',   icon: Settings2, label: 'Actividades PPR', sub: 'Alta, baja y edición anual', accent: 'amber' as const },
        ]
      : []),
  ]

  return (
    <div className="space-y-6">
      {/* ── Hero header ── */}
      <div className="relative overflow-hidden rounded-3xl border border-slate-200 bg-gradient-to-br from-white via-white to-indigo-50/30 px-6 py-6 shadow-sm">
        {/* Decorative accent */}
        <div className="pointer-events-none absolute -right-16 -top-16 h-48 w-48 rounded-full bg-gradient-to-br from-indigo-100 to-sky-100 opacity-50 blur-3xl" />

        <div className="relative flex flex-wrap items-start justify-between gap-4">
          <div className="flex items-start gap-4">
            <PprAvatar
              name={pprUser.employeeName}
              size="lg"
              tone={isAdmin ? 'amber' : 'indigo'}
            />
            <div>
              <p className="text-[11px] capitalize text-slate-400">{todayLabel}</p>
              <h1 className="mt-0.5 text-2xl font-bold text-slate-900">
                {greeting()}, {pprUser.employeeName.split(' ')[0]}
              </h1>
              <p className="text-xs text-slate-500">{pprUser.employeeName}</p>
              <div className="mt-2.5 flex flex-wrap items-center gap-2">
                <PprPill tone={isAdmin ? 'amber' : 'indigo'} icon={Sparkles}>
                  {isAdmin ? 'Administrador PPR' : 'Coordinador PPR'}
                </PprPill>
                {periodo && (
                  <PprPill tone="sky" icon={Calendar}>
                    Período: {periodo.label}
                  </PprPill>
                )}
                {periodo?.isOpen && (
                  <PprPill tone="emerald">
                    <span className="relative flex h-1.5 w-1.5">
                      <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-75" />
                      <span className="relative inline-flex h-1.5 w-1.5 rounded-full bg-emerald-500" />
                    </span>
                    Abierto para registro
                  </PprPill>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>

      {loading ? (
        <>
          {/* KPI skeletons */}
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
            {Array.from({ length: 4 }).map((_, i) => (
              <div key={i} className="rounded-2xl border border-slate-200 bg-white p-4 space-y-3">
                <div className="flex gap-3">
                  <PprSkeleton className="h-11 w-11 rounded-xl" />
                  <div className="flex-1 space-y-2">
                    <PprSkeleton className="h-2 w-2/3" />
                    <PprSkeleton className="h-5 w-1/2" />
                  </div>
                </div>
              </div>
            ))}
          </div>

          {/* Body skeletons */}
          <div className="grid grid-cols-1 gap-5 lg:grid-cols-3">
            <div className="space-y-2 lg:col-span-2">
              <PprSkeleton className="h-3 w-32" />
              {Array.from({ length: 3 }).map((_, i) => <PprSkeletonCard key={i} />)}
            </div>
            <div className="space-y-2">
              <PprSkeleton className="h-3 w-32" />
              {Array.from({ length: 4 }).map((_, i) => (
                <PprSkeleton key={i} className="h-16 w-full rounded-xl" />
              ))}
            </div>
          </div>
        </>
      ) : (
        <>
          {/* ── Alerts ── */}
          <div className="space-y-2">
            {periodosPendientes > 0 && (
              <div className="animate-ppr-fade flex items-start gap-3 rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3.5">
                <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-amber-100">
                  <AlertCircle className="h-4 w-4 text-amber-600" />
                </div>
                <div className="flex-1">
                  <p className="text-xs font-semibold text-amber-800">
                    {periodosPendientes} período{periodosPendientes > 1 ? 's' : ''} sin firmar
                  </p>
                  <p className="mt-0.5 text-[11px] text-amber-700">
                    Tienes meses completados que aún no has firmado.
                  </p>
                </div>
                <Link
                  to="/ppr/periodos"
                  className="shrink-0 self-center rounded-lg bg-amber-600 px-3 py-1.5 text-[11px] font-semibold text-white transition hover:bg-amber-700"
                >
                  Ir a Períodos
                </Link>
              </div>
            )}

            {programasAtrasados > 0 && (
              <div className="animate-ppr-fade flex items-start gap-3 rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3.5">
                <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-rose-100">
                  <TrendingDown className="h-4 w-4 text-rose-600" />
                </div>
                <div className="flex-1">
                  <p className="text-xs font-semibold text-rose-800">
                    {programasAtrasados} programa{programasAtrasados > 1 ? 's' : ''} por debajo del 80%
                  </p>
                  <p className="mt-0.5 text-[11px] text-rose-700">
                    Revisa el avance de tus programas con menor progreso.
                  </p>
                </div>
                <Link
                  to="/ppr/programas"
                  className="shrink-0 self-center rounded-lg bg-rose-600 px-3 py-1.5 text-[11px] font-semibold text-white transition hover:bg-rose-700"
                >
                  Ver programas
                </Link>
              </div>
            )}
          </div>

          {/* ── KPIs ── */}
          <div className="ppr-stagger grid grid-cols-2 gap-3 sm:grid-cols-4">
            <StatCard
              label="Programas asignados"
              value={programas.length}
              sub={`${programasAdelantados} al día`}
              icon={Layers}
              accent="indigo"
            />
            <StatCard
              label={mesesCompletos > 0 ? `Avance a ${MESES[mesesCompletos - 1]}` : 'Avance anual'}
              value={pctGlobal != null ? `${pctGlobal}%` : '—'}
              sub={`${fmtNum(totalLogrado)} de ${fmtNum(totalMetaEsperada)}`}
              icon={pctGlobal != null && pctGlobal >= 80 ? TrendingUp : TrendingDown}
              accent={pctGlobal == null ? 'slate' : pctGlobal >= 100 ? 'emerald' : pctGlobal >= 80 ? 'amber' : 'rose'}
              trend={pctGlobal == null ? null : pctGlobal >= 80 ? 'up' : 'down'}
            />
            <StatCard
              label="Períodos firmados"
              value={`${periodosFirmados} / ${mesesCompletos}`}
              sub={String(currentYear)}
              icon={CheckCircle2}
              accent={periodosFirmados === mesesCompletos && mesesCompletos > 0 ? 'emerald' : 'amber'}
            />
            <StatCard
              label="Período activo"
              value={periodo?.label ?? '—'}
              sub={periodo?.isOpen ? 'Abierto para registro' : 'Cerrado'}
              icon={Calendar}
              accent={periodo?.isOpen ? 'emerald' : 'slate'}
            />
          </div>

          {/* ── Annual progress strip ── */}
          {pctGlobal != null && (
            <div className="rounded-2xl border border-slate-200 bg-white p-5">
              <div className="mb-2 flex items-center justify-between">
                <div>
                  <p className="text-[10px] font-semibold uppercase tracking-widest text-slate-400">
                    Avance acumulado anual
                  </p>
                  <p className={cn('mt-1 text-2xl font-bold tabular-nums', pctTextColor(pctGlobal))}>
                    {pctGlobal}%
                  </p>
                </div>
                <div className="text-right">
                  <p className="text-[10px] text-slate-400">Logrado vs Esperado</p>
                  <p className="text-sm font-semibold text-slate-900">
                    {fmtNum(totalLogrado)} <span className="text-slate-400">/</span> {fmtNum(totalMetaEsperada)}
                  </p>
                </div>
              </div>
              <PprProgressBar value={pctGlobal} size="lg" />
            </div>
          )}

          {/* ── Body: programas + accesos ── */}
          <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
            {/* Programas */}
            <div className="lg:col-span-2">
              <div className="mb-3 flex items-center justify-between">
                <h2 className="text-[10px] font-bold uppercase tracking-[0.16em] text-slate-400">
                  Mis programas
                </h2>
                <Link
                  to="/ppr/programas"
                  className="flex items-center gap-1 text-[11px] font-semibold text-slate-600 transition hover:text-indigo-600"
                >
                  Ver todos
                  <ChevronRight className="h-3 w-3" />
                </Link>
              </div>

              {programas.length === 0 ? (
                <div className="flex flex-col items-center gap-3 rounded-2xl border border-dashed border-slate-300 bg-white py-10 text-center">
                  <Layers className="h-7 w-7 text-slate-300" />
                  <p className="text-xs text-slate-400">Sin programas asignados</p>
                </div>
              ) : (
                <div className="ppr-stagger space-y-2">
                  {programasSorted.slice(0, 6).map((p) => (
                    <ProgramaMiniCard key={p.id} programa={p} currentMonth={currentMonth} />
                  ))}
                  {programasSorted.length > 6 && (
                    <button
                      onClick={() => navigate('/ppr/programas')}
                      className="flex w-full items-center justify-center gap-2 rounded-xl border border-dashed border-slate-300 py-2.5 text-[11px] font-semibold text-slate-500 transition hover:border-indigo-300 hover:bg-indigo-50/40 hover:text-indigo-700"
                    >
                      Ver {programasSorted.length - 6} más
                      <ChevronRight className="h-3 w-3" />
                    </button>
                  )}
                </div>
              )}
            </div>

            {/* Quick links + period status */}
            <div className="space-y-5">
              <div>
                <h2 className="mb-3 text-[10px] font-bold uppercase tracking-[0.16em] text-slate-400">
                  Accesos rápidos
                </h2>
                <div className="ppr-stagger space-y-2">
                  {quickLinks.map((link) => {
                    const palettes = {
                      indigo: { bg: 'bg-indigo-500/10', text: 'text-indigo-600' },
                      sky:    { bg: 'bg-sky-500/10',    text: 'text-sky-600' },
                      amber:  { bg: 'bg-amber-500/10',  text: 'text-amber-600' },
                      slate:  { bg: 'bg-slate-100',     text: 'text-slate-500' },
                    }[link.accent]
                    return (
                      <Link
                        key={link.to}
                        to={link.to}
                        className="group flex items-center gap-3 rounded-xl border border-slate-200 bg-white px-4 py-3 transition-all hover:border-indigo-300 hover:shadow-md hover:-translate-y-0.5"
                      >
                        <div className={cn(
                          'flex h-9 w-9 shrink-0 items-center justify-center rounded-xl transition-transform group-hover:scale-110',
                          palettes.bg,
                        )}>
                          <link.icon className={cn('h-4 w-4', palettes.text)} />
                        </div>
                        <div className="min-w-0 flex-1">
                          <p className="text-xs font-semibold text-slate-900">{link.label}</p>
                          <p className="text-[10px] text-slate-400">{link.sub}</p>
                        </div>
                        <ChevronRight className="h-3.5 w-3.5 shrink-0 text-slate-300 transition-transform group-hover:translate-x-0.5 group-hover:text-indigo-500" />
                      </Link>
                    )
                  })}
                </div>
              </div>

              {/* Mini period status calendar */}
              {periodosDelAnio.length > 0 && (
                <div className="rounded-2xl border border-slate-200 bg-white p-4">
                  <p className="mb-3 text-[10px] font-bold uppercase tracking-[0.16em] text-slate-400">
                    Estado de firmas {currentYear}
                  </p>
                  <div className="grid grid-cols-6 gap-1.5">
                    {Array.from({ length: 12 }, (_, i) => {
                      const m = i + 1
                      const per = periodosDelAnio.find((p) => p.month === m)
                      const isClosed  = m < currentMonth
                      const isCurrent = m === currentMonth
                      const isSigned  = per?.isSigned ?? false
                      return (
                        <div
                          key={m}
                          title={`${MESES[i]}: ${isCurrent ? 'mes actual' : !isClosed ? 'no disponible' : isSigned ? 'firmado' : 'pendiente'}`}
                          className={cn(
                            'flex aspect-square items-center justify-center rounded-lg text-[9px] font-bold transition',
                            isCurrent
                              ? 'bg-sky-100 text-sky-700 ring-2 ring-sky-300'
                              : !isClosed
                                ? 'bg-slate-50 text-slate-300'
                                : isSigned
                                  ? 'bg-emerald-100 text-emerald-700'
                                  : 'bg-amber-100 text-amber-700',
                          )}
                        >
                          {['E','F','M','A','M','J','J','A','S','O','N','D'][i]}
                        </div>
                      )
                    })}
                  </div>
                  <div className="mt-3 grid grid-cols-2 gap-x-2 gap-y-1">
                    <div className="flex items-center gap-1.5">
                      <div className="h-2 w-2 rounded-full bg-emerald-400" />
                      <span className="text-[9px] text-slate-500">Firmado</span>
                    </div>
                    <div className="flex items-center gap-1.5">
                      <div className="h-2 w-2 rounded-full bg-amber-400" />
                      <span className="text-[9px] text-slate-500">Pendiente</span>
                    </div>
                    <div className="flex items-center gap-1.5">
                      <div className="h-2 w-2 rounded-full bg-sky-400" />
                      <span className="text-[9px] text-slate-500">Actual</span>
                    </div>
                    <div className="flex items-center gap-1.5">
                      <div className="h-2 w-2 rounded-full bg-slate-200" />
                      <span className="text-[9px] text-slate-500">No disp.</span>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>
        </>
      )}
    </div>
  )
}
