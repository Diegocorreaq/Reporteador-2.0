import { useEffect, useState } from 'react'
import {
  CheckCircle2,
  ChevronDown,
  ChevronUp,
  Layers,
  Loader2,
  PlusCircle,
  Search,
  ShieldAlert,
  UserMinus,
  UserPlus,
  X,
} from 'lucide-react'
import { usePprContext } from '@/modules/ppr/context/ppr-context'
import {
  agregarCoordinador,
  fetchCoordinadores,
  fetchProgramasAdmin,
  guardarAsignacion,
  toggleCoordinador,
} from '@/modules/ppr/services/ppr.service'
import type { PprCoordinador, PprProgramaAdmin } from '@/modules/ppr/types'

// ─── Add coordinator modal ────────────────────────────────────────────────────

interface AddModalProps {
  programas: PprProgramaAdmin[]
  adminId: number
  onClose: () => void
  onAdded: () => void
}

function AddModal({ programas, adminId, onClose, onAdded }: AddModalProps) {
  const [employeeId, setEmployeeId] = useState('')
  const [selectedPrograms, setSelectedPrograms] = useState<Set<number>>(new Set())
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  function toggleProgram(id: number) {
    setSelectedPrograms((prev) => {
      const next = new Set(prev)
      next.has(id) ? next.delete(id) : next.add(id)
      return next
    })
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    const id = Number(employeeId.trim())
    if (!id) {
      setError('Ingrese un ID de empleado válido.')
      return
    }
    setSaving(true)
    setError(null)
    try {
      await agregarCoordinador(id, adminId)
      // Assign selected programs
      await Promise.all(
        Array.from(selectedPrograms).map((pid) => guardarAsignacion(id, pid, true, adminId)),
      )
      onAdded()
      onClose()
    } catch {
      setError('No se pudo agregar el coordinador. Verifique el ID.')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm">
      <div className="w-full max-w-md rounded-2xl border border-white/10 bg-white shadow-2xl">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-[#e2e8f0] px-6 py-4">
          <div className="flex items-center gap-2.5">
            <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-green-500/10">
              <UserPlus className="h-4 w-4 text-green-600" />
            </div>
            <h2 className="text-sm font-bold text-[#0c2340]">Agregar Coordinador</h2>
          </div>
          <button
            onClick={onClose}
            className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-600"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4 p-6">
          {/* Employee ID */}
          <div className="space-y-1.5">
            <label className="block text-xs font-semibold text-[#0c2340]">
              ID de Empleado (IDEMPLEADO)
            </label>
            <input
              type="number"
              min={1}
              value={employeeId}
              onChange={(e) => setEmployeeId(e.target.value)}
              className="w-full rounded-xl border border-[#ccd9e8] px-3 py-2.5 text-sm focus:border-green-500 focus:outline-none"
              placeholder="Ej: 12345"
              required
              autoFocus
            />
            <p className="text-[10px] text-slate-400">
              El SP buscará nombre y DNI automáticamente desde SIGH.
            </p>
          </div>

          {/* Program assignment */}
          {programas.length > 0 && (
            <div className="space-y-1.5">
              <label className="block text-xs font-semibold text-[#0c2340]">
                Programas a asignar <span className="font-normal text-slate-400">(opcional)</span>
              </label>
              <div className="max-h-40 space-y-1 overflow-y-auto rounded-xl border border-[#e2e8f0] p-2">
                {programas.map((p) => (
                  <label
                    key={p.id}
                    className="flex cursor-pointer items-center gap-2.5 rounded-lg px-2 py-2 hover:bg-slate-50"
                  >
                    <input
                      type="checkbox"
                      checked={selectedPrograms.has(p.id)}
                      onChange={() => toggleProgram(p.id)}
                      className="h-3.5 w-3.5 accent-green-600"
                    />
                    {p.code && (
                      <span className="rounded bg-[#e8f0f8] px-1.5 py-0.5 font-mono text-[10px] text-[#3a6fa0]">
                        {p.code}
                      </span>
                    )}
                    <span className="text-xs text-[#0c2340]">{p.name}</span>
                  </label>
                ))}
              </div>
            </div>
          )}

          {error && (
            <div className="rounded-xl border border-red-200 bg-red-50 px-3 py-2.5 text-xs text-red-700">
              {error}
            </div>
          )}

          <div className="flex gap-2.5 pt-1">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 rounded-xl border border-[#e2e8f0] py-2.5 text-xs font-semibold text-slate-500 transition hover:bg-slate-50"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={saving || !employeeId.trim()}
              className="flex flex-1 items-center justify-center gap-1.5 rounded-xl bg-green-600 py-2.5 text-xs font-semibold text-white transition hover:bg-green-500 disabled:cursor-not-allowed disabled:opacity-50"
            >
              {saving ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <UserPlus className="h-3.5 w-3.5" />}
              Agregar
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

// ─── Coordinator row ──────────────────────────────────────────────────────────

interface CoordinadorRowProps {
  coord: PprCoordinador
  programas: PprProgramaAdmin[]
  adminId: number
  onRefresh: () => void
}

function CoordinadorRow({ coord, programas, adminId, onRefresh }: CoordinadorRowProps) {
  const [expanded, setExpanded] = useState(false)
  const [toggling, setToggling] = useState(false)
  const [saving, setSaving] = useState<number | null>(null)

  const assignedIds = new Set(coord.programas.map((p) => p.id))

  const initials = coord.employeeName
    .split(' ')
    .slice(0, 2)
    .map((w) => w[0] ?? '')
    .join('')
    .toUpperCase()

  async function handleToggleActive() {
    setToggling(true)
    try {
      await toggleCoordinador(coord.employeeId, !coord.activo, adminId)
      onRefresh()
    } finally {
      setToggling(false)
    }
  }

  async function handleToggleProgram(programId: number, currentlyAssigned: boolean) {
    setSaving(programId)
    try {
      await guardarAsignacion(coord.employeeId, programId, !currentlyAssigned, adminId)
      onRefresh()
    } finally {
      setSaving(null)
    }
  }

  return (
    <div className={`rounded-2xl border bg-white transition ${coord.activo ? 'border-[#e2e8f0]' : 'border-dashed border-slate-200 opacity-60'}`}>
      {/* Main row */}
      <div className="flex flex-wrap items-center gap-3 px-4 py-3.5">
        {/* Avatar */}
        <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-[#0c2340] text-xs font-bold text-white">
          {initials}
        </div>

        {/* Name + DNI */}
        <div className="min-w-0 flex-1">
          <p className="truncate text-sm font-semibold text-[#0c2340]">{coord.employeeName}</p>
          <p className="font-mono text-[10px] text-slate-400">DNI: {coord.dni || '—'}</p>
        </div>

        {/* Status */}
        <span
          className={`shrink-0 rounded-full px-2.5 py-0.5 text-[10px] font-semibold ${
            coord.activo ? 'bg-emerald-100 text-emerald-700' : 'bg-slate-100 text-slate-500'
          }`}
        >
          {coord.activo ? 'Activo' : 'Inactivo'}
        </span>

        {/* Program chips */}
        <div className="flex flex-wrap gap-1">
          {coord.programas.length === 0 ? (
            <span className="text-[10px] text-slate-300">Sin programas</span>
          ) : (
            coord.programas.map((p) => (
              <span
                key={p.id}
                className="rounded-full bg-[#e8f0f8] px-2 py-0.5 font-mono text-[10px] text-[#3a6fa0]"
              >
                {p.code || p.name}
              </span>
            ))
          )}
        </div>

        {/* Actions */}
        <div className="ml-auto flex shrink-0 items-center gap-1.5">
          <button
            onClick={() => setExpanded((v) => !v)}
            title="Gestionar programas"
            className="flex items-center gap-1 rounded-lg border border-[#e2e8f0] px-2.5 py-1.5 text-[11px] font-medium text-slate-500 transition hover:border-green-300 hover:text-green-700"
          >
            <Layers className="h-3.5 w-3.5" />
            Programas
            {expanded ? <ChevronUp className="h-3 w-3" /> : <ChevronDown className="h-3 w-3" />}
          </button>

          <button
            onClick={handleToggleActive}
            disabled={toggling}
            title={coord.activo ? 'Desactivar coordinador' : 'Reactivar coordinador'}
            className={`flex items-center gap-1 rounded-lg border px-2.5 py-1.5 text-[11px] font-medium transition disabled:opacity-50 ${
              coord.activo
                ? 'border-red-200 text-red-500 hover:border-red-400 hover:bg-red-50'
                : 'border-emerald-200 text-emerald-600 hover:border-emerald-400 hover:bg-emerald-50'
            }`}
          >
            {toggling ? (
              <Loader2 className="h-3.5 w-3.5 animate-spin" />
            ) : coord.activo ? (
              <UserMinus className="h-3.5 w-3.5" />
            ) : (
              <CheckCircle2 className="h-3.5 w-3.5" />
            )}
            {coord.activo ? 'Desactivar' : 'Reactivar'}
          </button>
        </div>
      </div>

      {/* Expanded: program management */}
      {expanded && (
        <div className="border-t border-[#e8f0f8] px-4 pb-4 pt-3">
          <p className="mb-2.5 text-[10px] font-semibold uppercase tracking-wide text-slate-400">
            Programas asignados
          </p>
          <div className="grid grid-cols-1 gap-1.5 sm:grid-cols-2 lg:grid-cols-3">
            {programas.map((p) => {
              const assigned = assignedIds.has(p.id)
              const isSaving = saving === p.id
              return (
                <button
                  key={p.id}
                  onClick={() => handleToggleProgram(p.id, assigned)}
                  disabled={isSaving}
                  className={`flex items-center gap-2.5 rounded-xl border px-3 py-2.5 text-left text-xs transition disabled:opacity-50 ${
                    assigned
                      ? 'border-green-300 bg-green-50 text-green-800 hover:border-red-300 hover:bg-red-50 hover:text-red-700'
                      : 'border-[#e2e8f0] bg-white text-slate-500 hover:border-green-300 hover:bg-green-50 hover:text-green-700'
                  }`}
                >
                  {isSaving ? (
                    <Loader2 className="h-3.5 w-3.5 shrink-0 animate-spin" />
                  ) : assigned ? (
                    <CheckCircle2 className="h-3.5 w-3.5 shrink-0 text-green-500" />
                  ) : (
                    <PlusCircle className="h-3.5 w-3.5 shrink-0 text-slate-300" />
                  )}
                  <span className="flex-1 truncate">
                    {p.code && (
                      <span className="mr-1 font-mono text-[10px] opacity-70">{p.code}</span>
                    )}
                    {p.name}
                  </span>
                </button>
              )
            })}
          </div>
        </div>
      )}
    </div>
  )
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export function PprAdminCoordinadoresPage() {
  const { pprUser } = usePprContext()

  const [coordinadores, setCoordinadores] = useState<PprCoordinador[]>([])
  const [programas, setProgramas] = useState<PprProgramaAdmin[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [search, setSearch] = useState('')
  const [showAddModal, setShowAddModal] = useState(false)
  const [showInactive, setShowInactive] = useState(false)

  async function loadData() {
    try {
      const [coords, progs] = await Promise.all([
        fetchCoordinadores(pprUser.employeeId),
        fetchProgramasAdmin(pprUser.employeeId),
      ])
      setCoordinadores(coords)
      setProgramas(progs)
    } catch {
      setError('No se pudo cargar la información.')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    if (pprUser.role !== 'admin') return
    loadData()
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pprUser.employeeId])

  if (pprUser.role !== 'admin') {
    return (
      <div className="flex flex-col items-center gap-3 py-20 text-center">
        <ShieldAlert className="h-10 w-10 text-slate-300" />
        <p className="text-sm font-semibold text-[#0c2340]">Acceso restringido</p>
        <p className="max-w-xs text-xs text-slate-400">
          Esta sección es exclusiva para administradores del Portal PPR.
        </p>
      </div>
    )
  }

  const q = search.toLowerCase()
  const filtered = coordinadores.filter((c) => {
    if (!showInactive && !c.activo) return false
    if (!q) return true
    return c.employeeName.toLowerCase().includes(q) || c.dni.includes(q)
  })

  const totalActivos = coordinadores.filter((c) => c.activo).length
  const totalInactivos = coordinadores.filter((c) => !c.activo).length

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-lg font-bold text-[#0c2340]">Gestión de Coordinadores</h1>
          <p className="text-xs text-slate-400">
            {loading ? 'Cargando…' : `${totalActivos} activo${totalActivos !== 1 ? 's' : ''}${totalInactivos > 0 ? ` · ${totalInactivos} inactivo${totalInactivos !== 1 ? 's' : ''}` : ''}`}
          </p>
        </div>
        <button
          onClick={() => setShowAddModal(true)}
          className="flex items-center gap-2 rounded-xl bg-green-600 px-4 py-2.5 text-xs font-semibold text-white transition hover:bg-green-500"
        >
          <UserPlus className="h-3.5 w-3.5" />
          Agregar coordinador
        </button>
      </div>

      {/* Error */}
      {error && (
        <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-2.5 text-xs text-red-700">
          {error}{' '}
          <button className="font-semibold underline" onClick={() => setError(null)}>Cerrar</button>
        </div>
      )}

      {/* Filters */}
      {!loading && (
        <div className="flex flex-wrap items-center gap-3">
          <div className="relative min-w-[220px] flex-1">
            <Search className="absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Buscar por nombre o DNI…"
              className="w-full rounded-xl border border-[#ccd9e8] py-2.5 pl-8 pr-3 text-xs focus:border-green-500 focus:outline-none"
            />
          </div>
          {totalInactivos > 0 && (
            <label className="flex cursor-pointer items-center gap-2 text-xs text-slate-500">
              <input
                type="checkbox"
                checked={showInactive}
                onChange={(e) => setShowInactive(e.target.checked)}
                className="h-3.5 w-3.5 accent-green-600"
              />
              Mostrar inactivos
            </label>
          )}
        </div>
      )}

      {loading ? (
        <div className="flex items-center justify-center py-20">
          <Loader2 className="h-6 w-6 animate-spin text-green-600" />
        </div>
      ) : filtered.length === 0 ? (
        <div className="flex flex-col items-center gap-3 rounded-2xl border border-dashed border-[#c8d8e8] bg-white py-16 text-center">
          <UserPlus className="h-8 w-8 text-slate-300" />
          <p className="text-sm font-semibold text-[#0c2340]">
            {search ? 'Sin resultados' : 'No hay coordinadores registrados'}
          </p>
          <p className="max-w-xs text-xs text-slate-400">
            {search ? 'Prueba con otro nombre o DNI.' : 'Agrega el primer coordinador usando el botón de arriba.'}
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {filtered.map((c) => (
            <CoordinadorRow
              key={c.employeeId}
              coord={c}
              programas={programas}
              adminId={pprUser.employeeId}
              onRefresh={loadData}
            />
          ))}
        </div>
      )}

      {/* Add modal */}
      {showAddModal && (
        <AddModal
          programas={programas}
          adminId={pprUser.employeeId}
          onClose={() => setShowAddModal(false)}
          onAdded={loadData}
        />
      )}
    </div>
  )
}
