import { useEffect, useRef, useState } from 'react'
import {
  AlertCircle,
  CheckCircle2,
  ClipboardList,
  Edit2,
  Layers,
  Loader2,
  Plus,
  Search,
  ToggleLeft,
  ToggleRight,
  X,
} from 'lucide-react'
import { usePprContext } from '@/modules/ppr/context/ppr-context'
import {
  fetchActividadesAdmin,
  fetchProgramasAdmin,
  guardarActividadAdmin,
  toggleActividadAdmin,
} from '@/modules/ppr/services/ppr.service'
import type { PprActividadAdmin, PprProgramaAdmin } from '@/modules/ppr/types'
import { cn } from '@/lib/utils'

// ─── Constants ────────────────────────────────────────────────────────────────

const UNITS_COMUNES = [
  'Atención', 'Caso', 'Consulta', 'Examen', 'Sesión', 'Capacitación',
  'Actividad', 'Campaña', 'Persona', 'Niño', 'Gestante', 'Familia',
  'Establecimiento', 'Distrito', 'Visita', 'Prueba', 'Dosis', 'Parto',
  'Procedimiento', 'Muestra', 'Servicio', 'Reporte',
]

// ─── Types ─────────────────────────────────────────────────────────────────────

interface ActividadFormData {
  code: string
  name: string
  activityGroupCode: string
  unit: string
  annualGoal: string
  sortOrder: string
  isActive: boolean
}

const EMPTY_FORM: ActividadFormData = {
  code: '',
  name: '',
  activityGroupCode: '',
  unit: '',
  annualGoal: '',
  sortOrder: '1',
  isActive: true,
}

// ─── Activity Modal ───────────────────────────────────────────────────────────

interface ActividadModalProps {
  mode: 'add' | 'edit'
  initial: ActividadFormData
  activityGroups: NonNullable<PprProgramaAdmin['activityGroups']>
  onSave: (data: ActividadFormData) => Promise<void>
  onClose: () => void
  saving: boolean
}

function ActividadModal({ mode, initial, activityGroups, onSave, onClose, saving }: ActividadModalProps) {
  const [form, setForm] = useState<ActividadFormData>(initial)
  const [unitSearch, setUnitSearch] = useState('')
  const [showUnitDrop, setShowUnitDrop] = useState(false)
  const dropRef = useRef<HTMLDivElement>(null)

  // Close dropdown on outside click
  useEffect(() => {
    function handler(e: MouseEvent) {
      if (dropRef.current && !dropRef.current.contains(e.target as Node)) {
        setShowUnitDrop(false)
      }
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [])

  function set(field: keyof ActividadFormData, value: string | boolean) {
    setForm((prev) => ({ ...prev, [field]: value }))
  }

  function handleUnitSelect(u: string) {
    set('unit', u)
    setShowUnitDrop(false)
    setUnitSearch('')
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!form.name.trim() || !form.unit.trim()) return
    if (activityGroups.length > 0 && !form.activityGroupCode) return
    await onSave(form)
  }

  const filteredUnits = UNITS_COMUNES.filter(
    (u) => !unitSearch || u.toLowerCase().includes(unitSearch.toLowerCase()),
  )
  const isValid = form.name.trim().length > 0
    && form.unit.trim().length > 0
    && (activityGroups.length === 0 || form.activityGroupCode.length > 0)

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4"
      onClick={onClose}
    >
      <div
        className="w-full max-w-md rounded-2xl bg-white shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between border-b border-slate-100 px-6 py-4">
          <div className="flex items-center gap-2">
            <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-amber-100">
              <ClipboardList className="h-3.5 w-3.5 text-amber-600" />
            </div>
            <h2 className="text-sm font-bold text-[#0c2340]">
              {mode === 'add' ? 'Nueva actividad' : 'Editar actividad'}
            </h2>
          </div>
          <button
            onClick={onClose}
            className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-600"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4 px-6 py-5">
          {/* Warning for edit mode */}
          {mode === 'edit' && (
            <div className="flex items-start gap-2 rounded-xl bg-amber-50 px-3 py-2.5">
              <AlertCircle className="mt-px h-3.5 w-3.5 shrink-0 text-amber-500" />
              <p className="text-[11px] text-amber-700">
                Cambiar nombre o unidad no afecta los datos históricos ya registrados.
              </p>
            </div>
          )}

          {/* Code */}
          <div>
            <label className="mb-1.5 block text-xs font-semibold text-slate-600">
              Código{' '}
              <span className="font-normal text-slate-400">(opcional)</span>
            </label>
            <input
              type="text"
              value={form.code}
              onChange={(e) => set('code', e.target.value)}
              maxLength={20}
              placeholder="ej. A1.1"
              className="w-full rounded-xl border border-[#e2e8f0] px-3 py-2 text-xs text-[#0c2340] placeholder-slate-300 outline-none focus:border-amber-400 focus:ring-1 focus:ring-amber-200"
            />
          </div>

          {/* Name */}
          <div>
            <label className="mb-1.5 block text-xs font-semibold text-slate-600">
              Nombre de la actividad{' '}
              <span className="text-red-400">*</span>
            </label>
            <textarea
              value={form.name}
              onChange={(e) => set('name', e.target.value)}
              maxLength={300}
              rows={3}
              placeholder="Descripción completa de la actividad operativa…"
              className="w-full resize-none rounded-xl border border-[#e2e8f0] px-3 py-2 text-xs text-[#0c2340] placeholder-slate-300 outline-none focus:border-amber-400 focus:ring-1 focus:ring-amber-200"
              required
            />
            <p className="mt-0.5 text-right text-[10px] text-slate-300">{form.name.length}/300</p>
          </div>

          {activityGroups.length > 0 && (
            <div>
              <label className="mb-1.5 block text-xs font-semibold text-slate-600">
                Grupo del programa <span className="text-red-400">*</span>
              </label>
              <select
                value={form.activityGroupCode}
                onChange={(e) => set('activityGroupCode', e.target.value)}
                className="w-full rounded-xl border border-[#e2e8f0] bg-white px-3 py-2 text-xs text-[#0c2340] outline-none focus:border-amber-400 focus:ring-1 focus:ring-amber-200"
                required
              >
                <option value="">Seleccionar grupo...</option>
                {activityGroups.map((group) => (
                  <option key={group.code} value={group.code}>
                    {group.name}
                  </option>
                ))}
              </select>
              <p className="mt-1 text-[10px] text-slate-400">
                Las nuevas actividades se mostraran y calcularan solo dentro de este grupo.
              </p>
            </div>
          )}

          {/* Unit with autocomplete */}
          <div className="relative" ref={dropRef}>
            <label className="mb-1.5 block text-xs font-semibold text-slate-600">
              Unidad de medida <span className="text-red-400">*</span>
            </label>
            <input
              type="text"
              value={form.unit}
              onChange={(e) => {
                set('unit', e.target.value)
                setUnitSearch(e.target.value)
                setShowUnitDrop(true)
              }}
              onFocus={() => setShowUnitDrop(true)}
              placeholder="ej. Atención, Caso, Examen…"
              maxLength={50}
              className="w-full rounded-xl border border-[#e2e8f0] px-3 py-2 text-xs text-[#0c2340] placeholder-slate-300 outline-none focus:border-amber-400 focus:ring-1 focus:ring-amber-200"
              required
            />

            {/* Suggestion dropdown */}
            {showUnitDrop && filteredUnits.length > 0 && (
              <div className="absolute z-20 mt-1 w-full rounded-xl border border-[#e2e8f0] bg-white p-2 shadow-xl">
                <p className="mb-2 text-[9px] font-semibold uppercase tracking-wider text-slate-400">
                  Unidades comunes
                </p>
                <div className="flex flex-wrap gap-1.5">
                  {filteredUnits.map((u) => (
                    <button
                      key={u}
                      type="button"
                      onClick={() => handleUnitSelect(u)}
                      className={cn(
                        'rounded-lg px-2.5 py-1 text-[11px] font-medium transition',
                        form.unit === u
                          ? 'bg-amber-500 text-white'
                          : 'bg-slate-100 text-slate-600 hover:bg-amber-100 hover:text-amber-700',
                      )}
                    >
                      {u}
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Annual Goal + Sort Order */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="mb-1.5 block text-xs font-semibold text-slate-600">
                Meta anual{' '}
                <span className="font-normal text-slate-400">(opcional)</span>
              </label>
              <input
                type="number"
                min={0}
                step={1}
                value={form.annualGoal}
                onChange={(e) => set('annualGoal', e.target.value)}
                placeholder="ej. 1200"
                className="w-full rounded-xl border border-[#e2e8f0] px-3 py-2 text-xs text-[#0c2340] placeholder-slate-300 outline-none focus:border-amber-400 focus:ring-1 focus:ring-amber-200"
              />
            </div>
            <div>
              <label className="mb-1.5 block text-xs font-semibold text-slate-600">
                Orden de visualización
              </label>
              <input
                type="number"
                min={1}
                step={1}
                value={form.sortOrder}
                onChange={(e) => set('sortOrder', e.target.value)}
                className="w-full rounded-xl border border-[#e2e8f0] px-3 py-2 text-xs text-[#0c2340] placeholder-slate-300 outline-none focus:border-amber-400 focus:ring-1 focus:ring-amber-200"
              />
            </div>
          </div>

          {/* Active toggle (only in edit) */}
          {mode === 'edit' && (
            <button
              type="button"
              onClick={() => set('isActive', !form.isActive)}
              className={cn(
                'flex w-full items-center justify-between rounded-xl px-3 py-2.5 transition',
                form.isActive ? 'bg-emerald-50 ring-1 ring-emerald-200' : 'bg-slate-50 ring-1 ring-slate-200',
              )}
            >
              <div className="text-left">
                <p className="text-xs font-semibold text-[#0c2340]">
                  {form.isActive ? 'Activa' : 'Inactiva'}
                </p>
                <p className="text-[10px] text-slate-400">
                  {form.isActive
                    ? 'Aparece en el ingreso mensual de datos'
                    : 'Oculta en ingreso de datos — historial conservado'}
                </p>
              </div>
              {form.isActive ? (
                <ToggleRight className="h-7 w-7 shrink-0 text-emerald-500" />
              ) : (
                <ToggleLeft className="h-7 w-7 shrink-0 text-slate-400" />
              )}
            </button>
          )}

          {/* Actions */}
          <div className="flex gap-2 pt-1">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 rounded-xl border border-[#e2e8f0] py-2 text-xs font-semibold text-slate-600 transition hover:bg-slate-50"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={!isValid || saving}
              className="flex flex-1 items-center justify-center gap-2 rounded-xl bg-amber-500 py-2 text-xs font-semibold text-white transition hover:bg-amber-600 disabled:cursor-not-allowed disabled:opacity-50"
            >
              {saving && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
              {mode === 'add' ? 'Crear actividad' : 'Guardar cambios'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

// ─── Main Page ─────────────────────────────────────────────────────────────────

export function PprAdminActividadesPage() {
  const { pprUser } = usePprContext()

  const [programas, setProgramas] = useState<PprProgramaAdmin[]>([])
  const [selectedId, setSelectedId] = useState<number | null>(null)
  const [actividades, setActividades] = useState<PprActividadAdmin[]>([])
  const [loadingProgramas, setLoadingProgramas] = useState(true)
  const [loadingActividades, setLoadingActividades] = useState(false)
  const [programSearch, setProgramSearch] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)

  const [modal, setModal] = useState<{
    mode: 'add' | 'edit'
    actividad: PprActividadAdmin | null
  } | null>(null)

  // ── Load programs ──
  useEffect(() => {
    fetchProgramasAdmin(pprUser.employeeId)
      .then(setProgramas)
      .catch(() => setError('No se pudieron cargar los programas.'))
      .finally(() => setLoadingProgramas(false))
  }, [pprUser.employeeId])

  // ── Load activities when program changes ──
  useEffect(() => {
    if (!selectedId) return
    setLoadingActividades(true)
    fetchActividadesAdmin(selectedId, pprUser.employeeId)
      .then(setActividades)
      .catch(() => setError('No se pudieron cargar las actividades.'))
      .finally(() => setLoadingActividades(false))
  }, [selectedId, pprUser.employeeId])

  // ── Auto-clear success banner ──
  useEffect(() => {
    if (!success) return
    const t = setTimeout(() => setSuccess(null), 3000)
    return () => clearTimeout(t)
  }, [success])

  // ── Derived ──
  const filteredProgramas = programas.filter(
    (p) =>
      !programSearch ||
      p.name.toLowerCase().includes(programSearch.toLowerCase()) ||
      p.code.toLowerCase().includes(programSearch.toLowerCase()) ||
      p.activityGroups?.some((group) =>
        group.name.toLowerCase().includes(programSearch.toLowerCase()) ||
        group.code.toLowerCase().includes(programSearch.toLowerCase()),
      ),
  )
  const selectedPrograma = programas.find((p) => p.id === selectedId)
  const selectedActivityGroups = selectedPrograma?.activityGroups ?? []
  const actActivas = actividades.filter((a) => a.isActive).length
  const actInactivas = actividades.filter((a) => !a.isActive).length

  const sortedActividades = [...actividades].sort((a, b) => {
    if (a.isActive !== b.isActive) return a.isActive ? -1 : 1
    const groupA = a.activityGroup?.sortOrder ?? 99
    const groupB = b.activityGroup?.sortOrder ?? 99
    if (groupA !== groupB) return groupA - groupB
    return a.sortOrder - b.sortOrder
  })

  // ── Initial form for modal ──
  function getInitialForm(): ActividadFormData {
    if (modal?.mode === 'edit' && modal.actividad) {
      const a = modal.actividad
      return {
        code: a.code,
        name: a.name,
        activityGroupCode: a.activityGroupCode ?? a.activityGroup?.code ?? '',
        unit: a.unit,
        annualGoal: a.annualGoal != null ? String(a.annualGoal) : '',
        sortOrder: String(a.sortOrder),
        isActive: a.isActive,
      }
    }
    const nextOrder =
      actividades.length > 0
        ? Math.max(...actividades.map((a) => a.sortOrder)) + 1
        : 1
    return {
      ...EMPTY_FORM,
      activityGroupCode: selectedActivityGroups.length === 1 ? selectedActivityGroups[0].code : '',
      sortOrder: String(nextOrder),
    }
  }

  // ── Save activity ──
  async function handleSave(formData: ActividadFormData) {
    if (!selectedId) return
    setSaving(true)
    try {
      await guardarActividadAdmin({
        id: modal?.mode === 'edit' ? (modal.actividad?.id ?? null) : null,
        programId: selectedId,
        code: formData.code.trim(),
        name: formData.name.trim(),
        unit: formData.unit.trim(),
        annualGoal: formData.annualGoal ? Number(formData.annualGoal) : null,
        sortOrder: Number(formData.sortOrder) || 1,
        isActive: formData.isActive,
        activityGroupCode: selectedActivityGroups.length > 0 ? formData.activityGroupCode : null,
        adminId: pprUser.employeeId,
      })
      const updated = await fetchActividadesAdmin(selectedId, pprUser.employeeId)
      setActividades(updated)
      setModal(null)
      setSuccess(modal?.mode === 'add' ? 'Actividad creada correctamente.' : 'Actividad actualizada.')
    } catch {
      setError('No se pudo guardar la actividad.')
    } finally {
      setSaving(false)
    }
  }

  // ── Toggle activity ──
  async function handleToggle(a: PprActividadAdmin) {
    setSaving(true)
    try {
      await toggleActividadAdmin(a.id, !a.isActive, pprUser.employeeId)
      setActividades((prev) =>
        prev.map((act) => (act.id === a.id ? { ...act, isActive: !act.isActive } : act)),
      )
      setSuccess(!a.isActive ? `"${a.name.substring(0, 40)}…" activada.` : `"${a.name.substring(0, 40)}…" desactivada.`)
    } catch {
      setError('No se pudo cambiar el estado.')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="flex flex-col gap-4" style={{ height: 'calc(100vh - 90px)' }}>
      {/* ── Page header ── */}
      <div className="flex shrink-0 flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-lg font-bold text-[#0c2340]">Gestión de Actividades</h1>
          <p className="text-xs text-slate-400">
            Alta, baja y edición de actividades operativas por programa
          </p>
        </div>
        <div className="flex items-center gap-2">
          <span className="rounded-xl border border-[#e2e8f0] bg-white px-3 py-1.5 text-xs font-semibold text-[#0c2340]">
            {programas.length} programa{programas.length !== 1 ? 's' : ''}
          </span>
        </div>
      </div>

      {/* ── Banners ── */}
      {error && (
        <div className="flex shrink-0 items-center justify-between rounded-xl border border-red-200 bg-red-50 px-4 py-2.5 text-xs text-red-700">
          <div className="flex items-center gap-2">
            <AlertCircle className="h-3.5 w-3.5 shrink-0" />
            {error}
          </div>
          <button onClick={() => setError(null)}>
            <X className="h-3.5 w-3.5" />
          </button>
        </div>
      )}
      {success && (
        <div className="flex shrink-0 items-center gap-2 rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-2.5 text-xs text-emerald-700">
          <CheckCircle2 className="h-3.5 w-3.5 shrink-0" />
          {success}
        </div>
      )}

      {/* ── Two-panel body ── */}
      <div className="flex min-h-0 flex-1 gap-4">
        {/* ── Left: Program list ── */}
        <div className="flex w-56 shrink-0 flex-col overflow-hidden rounded-2xl border border-[#e2e8f0] bg-white">
          <div className="shrink-0 border-b border-[#e2e8f0] p-3">
            <p className="mb-2 text-[10px] font-semibold uppercase tracking-widest text-slate-400">
              Programas ({programas.length})
            </p>
            <div className="relative">
              <Search className="absolute left-2.5 top-1/2 h-3 w-3 -translate-y-1/2 text-slate-300" />
              <input
                type="text"
                placeholder="Filtrar programas…"
                value={programSearch}
                onChange={(e) => setProgramSearch(e.target.value)}
                className="w-full rounded-lg border border-[#e2e8f0] py-1.5 pl-7 pr-2 text-xs text-[#0c2340] placeholder-slate-300 outline-none focus:border-amber-300 focus:ring-1 focus:ring-amber-100"
              />
            </div>
          </div>

          <div className="min-h-0 flex-1 overflow-y-auto p-2">
            {loadingProgramas ? (
              <div className="flex justify-center py-10">
                <Loader2 className="h-5 w-5 animate-spin text-amber-500" />
              </div>
            ) : filteredProgramas.length === 0 ? (
              <p className="py-8 text-center text-xs text-slate-400">Sin programas</p>
            ) : (
              filteredProgramas.map((p) => {
                const isSelected = p.id === selectedId
                const cnt = isSelected ? actividades.length : null
                return (
                  <button
                    key={p.id}
                    onClick={() => setSelectedId(p.id)}
                    className={cn(
                      'mb-0.5 flex w-full items-start gap-2.5 rounded-xl px-3 py-2.5 text-left transition',
                      isSelected
                        ? 'bg-amber-50 ring-1 ring-amber-200'
                        : 'hover:bg-slate-50',
                    )}
                  >
                    <div
                      className={cn(
                        'mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-md font-mono text-[9px] font-bold',
                        isSelected ? 'bg-amber-500 text-white' : 'bg-[#e8f0f8] text-[#3a6fa0]',
                      )}
                    >
                      {(p.code || '?').substring(0, 4)}
                    </div>
                    <div className="min-w-0 flex-1">
                      <p
                        className={cn(
                          'text-[11px] font-semibold leading-snug',
                          isSelected ? 'text-amber-800' : 'text-[#0c2340]',
                        )}
                      >
                        {p.name}
                      </p>
                      {cnt != null && (
                        <p className="mt-0.5 text-[9px] text-amber-600">
                          {cnt} actividad{cnt !== 1 ? 'es' : ''}
                        </p>
                      )}
                      {p.activityGroups && p.activityGroups.length > 0 && (
                        <div className="mt-1 flex flex-wrap gap-1">
                          {p.activityGroups.map((group) => (
                            <span
                              key={group.code}
                              className={cn(
                                'rounded px-1.5 py-0.5 text-[9px] font-semibold',
                                isSelected ? 'bg-amber-100 text-amber-700' : 'bg-sky-50 text-sky-700',
                              )}
                            >
                              {group.name}
                            </span>
                          ))}
                        </div>
                      )}
                    </div>
                  </button>
                )
              })
            )}
          </div>
        </div>

        {/* ── Right: Activity table ── */}
        <div className="flex min-w-0 flex-1 flex-col overflow-hidden rounded-2xl border border-[#e2e8f0] bg-white">
          {!selectedPrograma ? (
            /* Empty state */
            <div className="flex flex-1 flex-col items-center justify-center gap-3">
              <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-slate-100">
                <Layers className="h-7 w-7 text-slate-300" />
              </div>
              <p className="text-sm font-semibold text-slate-400">Selecciona un programa</p>
              <p className="max-w-xs text-center text-xs text-slate-300">
                Haz clic en un programa de la lista izquierda para ver y gestionar sus
                actividades operativas.
              </p>
            </div>
          ) : (
            <>
              {/* Table header bar */}
              <div className="flex shrink-0 items-center justify-between border-b border-[#e2e8f0] px-5 py-3">
                <div>
                  <div className="flex items-center gap-2">
                    <span className="rounded bg-[#e8f0f8] px-1.5 py-0.5 font-mono text-[10px] text-[#3a6fa0]">
                      {selectedPrograma.code}
                    </span>
                    <h2 className="text-xs font-bold text-[#0c2340]">{selectedPrograma.name}</h2>
                  </div>
                  {selectedActivityGroups.length > 0 && (
                    <div className="mt-1 flex flex-wrap gap-1">
                      {selectedActivityGroups.map((group) => (
                        <span
                          key={group.code}
                          className="rounded bg-sky-50 px-1.5 py-0.5 text-[10px] font-semibold text-sky-700"
                        >
                          {group.name}
                        </span>
                      ))}
                    </div>
                  )}
                  <p className="mt-0.5 text-[10px] text-slate-400">
                    <span className="text-emerald-600 font-semibold">{actActivas}</span> activa{actActivas !== 1 ? 's' : ''}
                    {actInactivas > 0 && (
                      <>
                        {' · '}
                        <span className="text-slate-400">{actInactivas}</span> inactiva{actInactivas !== 1 ? 's' : ''}
                      </>
                    )}
                  </p>
                </div>
                <button
                  onClick={() => setModal({ mode: 'add', actividad: null })}
                  className="flex items-center gap-1.5 rounded-xl bg-amber-500 px-3 py-2 text-xs font-semibold text-white transition hover:bg-amber-600 active:scale-95"
                >
                  <Plus className="h-3.5 w-3.5" />
                  Nueva actividad
                </button>
              </div>

              {/* Table body */}
              {loadingActividades ? (
                <div className="flex flex-1 items-center justify-center">
                  <Loader2 className="h-6 w-6 animate-spin text-amber-500" />
                </div>
              ) : actividades.length === 0 ? (
                <div className="flex flex-1 flex-col items-center justify-center gap-3">
                  <ClipboardList className="h-10 w-10 text-slate-200" />
                  <p className="text-sm font-semibold text-slate-400">Sin actividades</p>
                  <p className="max-w-xs text-center text-xs text-slate-300">
                    Este programa aún no tiene actividades registradas.
                  </p>
                  <button
                    onClick={() => setModal({ mode: 'add', actividad: null })}
                    className="flex items-center gap-1.5 rounded-xl bg-amber-500 px-4 py-2 text-xs font-semibold text-white hover:bg-amber-600"
                  >
                    <Plus className="h-3.5 w-3.5" />
                    Agregar primera actividad
                  </button>
                </div>
              ) : (
                <div className="min-h-0 flex-1 overflow-auto">
                  <table className="w-full min-w-[640px] text-xs">
                    <thead>
                      <tr className="border-b border-[#e2e8f0] bg-slate-50">
                        <th className="w-10 px-3 py-3 text-center text-[10px] font-semibold text-slate-400">
                          Ord.
                        </th>
                        <th className="w-20 px-2 py-3 text-left text-[10px] font-semibold text-slate-400">
                          Código
                        </th>
                        <th className="px-2 py-3 text-left text-[10px] font-semibold text-slate-400">
                          Nombre de la actividad
                        </th>
                        {selectedActivityGroups.length > 0 && (
                          <th className="w-32 px-2 py-3 text-left text-[10px] font-semibold text-slate-400">
                            Grupo
                          </th>
                        )}
                        <th className="w-28 px-2 py-3 text-left text-[10px] font-semibold text-slate-400">
                          Unidad
                        </th>
                        <th className="w-24 px-2 py-3 text-right text-[10px] font-semibold text-slate-400">
                          Meta anual
                        </th>
                        <th className="w-20 px-2 py-3 text-center text-[10px] font-semibold text-slate-400">
                          Estado
                        </th>
                        <th className="w-20 px-3 py-3 text-center text-[10px] font-semibold text-slate-400">
                          Acciones
                        </th>
                      </tr>
                    </thead>
                    <tbody>
                      {sortedActividades.map((a) => (
                        <tr
                          key={a.id}
                          className={cn(
                            'border-b border-[#f0f4f8] transition-colors last:border-0',
                            !a.isActive ? 'opacity-45' : 'hover:bg-[#fafcff]',
                          )}
                        >
                          {/* Sort order */}
                          <td className="px-3 py-3 text-center">
                            <span className="inline-flex h-5 w-5 items-center justify-center rounded-md bg-slate-100 text-[10px] font-bold text-slate-500">
                              {a.sortOrder}
                            </span>
                          </td>

                          {/* Code */}
                          <td className="px-2 py-3">
                            {a.code ? (
                              <span className="rounded bg-[#e8f0f8] px-1.5 py-0.5 font-mono text-[10px] text-[#3a6fa0]">
                                {a.code}
                              </span>
                            ) : (
                              <span className="text-slate-300">—</span>
                            )}
                          </td>

                          {/* Name */}
                          <td className="px-2 py-3">
                            <p
                              className={cn(
                                'text-[11px] leading-snug text-[#0c2340]',
                                !a.isActive && 'line-through decoration-slate-400',
                              )}
                              title={a.name}
                            >
                              {a.name}
                            </p>
                          </td>

                          {selectedActivityGroups.length > 0 && (
                            <td className="px-2 py-3">
                              {a.activityGroup ? (
                                <span className="rounded bg-sky-50 px-2 py-0.5 text-[10px] font-semibold text-sky-700">
                                  {a.activityGroup.name}
                                </span>
                              ) : (
                                <span className="rounded bg-rose-50 px-2 py-0.5 text-[10px] font-semibold text-rose-600">
                                  Sin grupo
                                </span>
                              )}
                            </td>
                          )}

                          {/* Unit */}
                          <td className="px-2 py-3">
                            <span className="rounded-full bg-blue-50 px-2 py-0.5 text-[10px] font-medium text-blue-600">
                              {a.unit}
                            </span>
                          </td>

                          {/* Annual goal */}
                          <td className="px-2 py-3 text-right">
                            {a.annualGoal != null ? (
                              <span className="text-[11px] font-semibold text-[#0c2340]">
                                {a.annualGoal.toLocaleString('es-PE')}
                              </span>
                            ) : (
                              <span className="text-slate-300">—</span>
                            )}
                          </td>

                          {/* Status badge */}
                          <td className="px-2 py-3 text-center">
                            <span
                              className={cn(
                                'rounded-full px-2 py-0.5 text-[10px] font-semibold',
                                a.isActive
                                  ? 'bg-emerald-100 text-emerald-700'
                                  : 'bg-slate-100 text-slate-500',
                              )}
                            >
                              {a.isActive ? 'Activa' : 'Inactiva'}
                            </span>
                          </td>

                          {/* Actions */}
                          <td className="px-3 py-3">
                            <div className="flex items-center justify-center gap-1">
                              <button
                                onClick={() => setModal({ mode: 'edit', actividad: a })}
                                title="Editar"
                                className="rounded-lg p-1.5 text-slate-400 transition hover:bg-amber-50 hover:text-amber-600"
                              >
                                <Edit2 className="h-3.5 w-3.5" />
                              </button>
                              <button
                                onClick={() => handleToggle(a)}
                                disabled={saving}
                                title={a.isActive ? 'Desactivar' : 'Activar'}
                                className={cn(
                                  'rounded-lg p-1.5 transition disabled:opacity-40',
                                  a.isActive
                                    ? 'text-slate-400 hover:bg-red-50 hover:text-red-500'
                                    : 'text-slate-400 hover:bg-emerald-50 hover:text-emerald-600',
                                )}
                              >
                                {a.isActive ? (
                                  <ToggleRight className="h-3.5 w-3.5" />
                                ) : (
                                  <ToggleLeft className="h-3.5 w-3.5" />
                                )}
                              </button>
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>

                    {/* Footer summary */}
                    <tfoot>
                      <tr className="border-t-2 border-[#e2e8f0] bg-slate-50">
                        <td
                          colSpan={selectedActivityGroups.length > 0 ? 5 : 4}
                          className="px-3 py-2.5 text-[10px] font-bold uppercase tracking-wider text-slate-400"
                        >
                          Total · {actividades.length} actividad{actividades.length !== 1 ? 'es' : ''}
                        </td>
                        <td className="px-2 py-2.5 text-right text-[11px] font-bold text-[#0c2340]">
                          {actividades.reduce((s, a) => s + (a.annualGoal ?? 0), 0).toLocaleString('es-PE')}
                        </td>
                        <td />
                        <td />
                      </tr>
                    </tfoot>
                  </table>
                </div>
              )}
            </>
          )}
        </div>
      </div>

      {/* ── Modal ── */}
      {modal && (
        <ActividadModal
          mode={modal.mode}
          initial={getInitialForm()}
          activityGroups={selectedActivityGroups}
          onSave={handleSave}
          onClose={() => setModal(null)}
          saving={saving}
        />
      )}
    </div>
  )
}
