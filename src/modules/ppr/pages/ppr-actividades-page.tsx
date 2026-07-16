import { Fragment, useEffect, useRef, useState } from 'react'
import {
  ArrowLeft,
  CheckCircle2,
  ClipboardCheck,
  Database,
  FileDown,
  FileText,
  Loader2,
  PenLine,
  Save,
  Target,
} from 'lucide-react'
import { Link, useLocation } from 'react-router-dom'
import { usePprContext } from '@/modules/ppr/context/ppr-context'
import {
  fetchActividades,
  fetchPprDraftPdf,
  fetchPeriodoActivo,
  fetchProgramas,
  fetchSignedDocumentInfo,
  fetchValidationSummary,
  firmarPeriodo,
  downloadSignedPeriodPdf,
  saveValor,
  triggerPprPdfDownload,
  validarValor,
  type PprPdfFile,
  type PprSignedDocumentInfo,
} from '@/modules/ppr/services/ppr.service'
import type { PprActividad, PprPeriodo, PprPeriodoItem, PprPrograma, PprValidationSummary } from '@/modules/ppr/types'
import {
  PprAlert,
  PprEmptyState,
  PprPill,
  PprProgressBar,
  PprSectionHeader,
  PprSkeleton,
  pctTextColor,
} from '@/modules/ppr/components/ui-primitives'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { cn } from '@/lib/utils'

// --- Activity row (desktop table) ---------------------------------------------
interface ActividadRowProps {
  actividad: PprActividad
  disabled: boolean
  onChange: (id: number, value: string, notes: string) => void
  onValidate: (id: number) => void
  validating: boolean
}

function validationTone(actividad: PprActividad): 'emerald' | 'sky' | 'amber' | 'indigo' | 'slate' {
  if (actividad.validationStatus === 'validated') return 'emerald'
  if (actividad.value == null) return 'slate'
  if (actividad.valueSource === 'source') return 'sky'
  if (actividad.valueSource === 'manual_override') return 'amber'
  return 'indigo'
}

function validationLabel(actividad: PprActividad) {
  if (actividad.validationStatus === 'validated') return 'Validado'
  if (actividad.value == null) return 'Pendiente'
  if (actividad.valueSource === 'source') return 'Precargado SIGH'
  if (actividad.valueSource === 'manual_override') return 'Editado'
  return 'Manual'
}

function canValidateActivity(actividad: PprActividad, disabled: boolean) {
  return !disabled && actividad.value != null && actividad.validationStatus !== 'validated'
}

function groupActividades(actividades: PprActividad[]) {
  if (!actividades.some((actividad) => actividad.activityGroup)) {
    return [{ key: 'all', name: null, sortOrder: 0, actividades }]
  }

  const grouped = new Map<string, {
    key: string
    name: string
    sortOrder: number
    actividades: PprActividad[]
  }>()

  for (const actividad of actividades) {
    const group = actividad.activityGroup ?? { code: 'SIN', name: 'Sin grupo', sortOrder: 99 }
    const key = group.code
    if (!grouped.has(key)) {
      grouped.set(key, {
        key,
        name: group.name,
        sortOrder: group.sortOrder,
        actividades: [],
      })
    }
    grouped.get(key)?.actividades.push(actividad)
  }

  return Array.from(grouped.values()).sort((left, right) => left.sortOrder - right.sortOrder)
}

function resolveErrorMessage(error: unknown, fallback: string) {
  if (typeof error === 'object' && error && 'response' in error) {
    const response = (error as { response?: { data?: { message?: string } } }).response
    return response?.data?.message ?? fallback
  }
  return fallback
}

type ActivityView = 'all' | 'pending' | 'filled' | 'validated'

function ActividadRow({ actividad, disabled, onChange, onValidate, validating }: ActividadRowProps) {
  const [val, setVal] = useState(actividad.value != null ? String(actividad.value) : '')
  const [notes, setNotes] = useState(actividad.notes ?? '')
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  useEffect(() => {
    setVal(actividad.value != null ? String(actividad.value) : '')
    setNotes(actividad.notes ?? '')
  }, [actividad.value, actividad.notes])

  function handleChange(nextVal: string, nextNotes: string) {
    setVal(nextVal)
    setNotes(nextNotes)
    if (debounceRef.current) clearTimeout(debounceRef.current)
    debounceRef.current = setTimeout(() => onChange(actividad.id, nextVal, nextNotes), 600)
  }

  const numVal = parseFloat(val)
  const pct = actividad.annualGoal && !isNaN(numVal)
    ? Math.round((numVal / actividad.annualGoal) * 100)
    : null
  const isFilled = val !== ''

  return (
    <tr className={cn(
      'border-b border-slate-100 transition-colors last:border-0',
      isFilled ? 'bg-teal-50/30 hover:bg-teal-50/50' : 'hover:bg-slate-50',
    )}>
      <td className="py-3 pl-4 pr-2 text-xs text-slate-900">
        <div className="flex items-start gap-2">
          {isFilled && <CheckCircle2 className="mt-0.5 h-3 w-3 shrink-0 text-emerald-500" />}
          <div className="min-w-0">
            {actividad.code && (
              <span className="mr-1.5 rounded bg-slate-100 px-1.5 py-0.5 font-mono text-[10px] text-slate-700">
                {actividad.code}
              </span>
            )}
            <span>{actividad.name}</span>
          </div>
        </div>
      </td>
      <td className="px-2 py-3 text-center text-xs text-slate-500">{actividad.unit || '—'}</td>
      <td className="px-2 py-3 text-center text-xs text-slate-500 tabular-nums">
        {actividad.annualGoal != null ? actividad.annualGoal.toLocaleString('es-PE') : '—'}
      </td>
      <td className="px-2 py-3">
        <input
          type="number"
          min={0}
          step="any"
          value={val}
          disabled={disabled}
          onChange={(e) => handleChange(e.target.value, notes)}
          className={cn(
            'w-24 rounded-lg border px-2 py-1.5 text-right text-xs tabular-nums transition focus:outline-none focus:ring-2 disabled:cursor-not-allowed disabled:bg-slate-50',
            isFilled
              ? 'border-teal-300 bg-teal-50/40 focus:border-teal-600 focus:ring-teal-600/15'
              : 'border-slate-300 focus:border-teal-600 focus:ring-teal-600/15',
          )}
          placeholder="0"
        />
      </td>
      <td className="px-2 py-3">
        <input
          type="text"
          value={notes}
          disabled={disabled}
          onChange={(e) => handleChange(val, e.target.value)}
          className="w-44 rounded-lg border border-slate-300 px-2 py-1.5 text-xs transition focus:border-teal-600 focus:outline-none focus:ring-2 focus:ring-teal-600/15 disabled:cursor-not-allowed disabled:bg-slate-50"
          placeholder="Observaciones…"
        />
      </td>
      <td className="px-2 py-3 text-center">
        <PprPill tone={validationTone(actividad)} icon={actividad.valueSource === 'source' ? Database : undefined}>
          {validationLabel(actividad)}
        </PprPill>
      </td>
      <td className="px-2 py-3 text-center text-xs">
        {pct != null ? (
          <span className={cn('font-semibold tabular-nums', pctTextColor(pct))}>{pct}%</span>
        ) : (
          <span className="text-slate-300">—</span>
        )}
      </td>
      <td className="px-3 py-3 text-center">
        <button
          onClick={() => onValidate(actividad.id)}
          disabled={!canValidateActivity(actividad, disabled) || validating}
          className={cn(
            'inline-flex items-center justify-center gap-1.5 rounded-lg px-2.5 py-1.5 text-[11px] font-semibold transition',
            actividad.validationStatus === 'validated'
              ? 'bg-emerald-50 text-emerald-700'
              : 'bg-teal-700 text-white hover:bg-teal-800',
            (!canValidateActivity(actividad, disabled) || validating) && 'cursor-not-allowed opacity-45',
          )}
        >
          {validating ? <Loader2 className="h-3 w-3 animate-spin" /> : <CheckCircle2 className="h-3 w-3" />}
          Validar
        </button>
      </td>
    </tr>
  )
}

// --- Activity card (mobile) ---------------------------------------------------
function ActividadCard({ actividad, disabled, onChange, onValidate, validating }: ActividadRowProps) {
  const [val, setVal] = useState(actividad.value != null ? String(actividad.value) : '')
  const [notes, setNotes] = useState(actividad.notes ?? '')
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  useEffect(() => {
    setVal(actividad.value != null ? String(actividad.value) : '')
    setNotes(actividad.notes ?? '')
  }, [actividad.value, actividad.notes])

  function handleChange(nextVal: string, nextNotes: string) {
    setVal(nextVal)
    setNotes(nextNotes)
    if (debounceRef.current) clearTimeout(debounceRef.current)
    debounceRef.current = setTimeout(() => onChange(actividad.id, nextVal, nextNotes), 600)
  }

  const numVal = parseFloat(val)
  const pct = actividad.annualGoal && !isNaN(numVal)
    ? Math.round((numVal / actividad.annualGoal) * 100)
    : null
  const isFilled = val !== ''

  return (
    <div className={cn(
      'rounded-lg border bg-white p-4 transition',
      isFilled
        ? 'border-teal-200 shadow-sm shadow-teal-100/60'
        : 'border-slate-200',
    )}>
      <div className="mb-3 flex items-start gap-2">
        {isFilled && <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-emerald-500" />}
        <div className="min-w-0 flex-1">
          {actividad.code && (
            <span className="mr-1.5 inline-block rounded bg-slate-100 px-1.5 py-0.5 font-mono text-[10px] text-slate-700">
              {actividad.code}
            </span>
          )}
          <p className="inline text-xs font-semibold text-slate-900">{actividad.name}</p>
          <p className="mt-1 flex items-center gap-2 text-[10px] text-slate-400">
            <Target className="h-3 w-3" />
            Meta anual: {actividad.annualGoal != null ? actividad.annualGoal.toLocaleString('es-PE') : '—'}
            {actividad.unit && <span>· {actividad.unit}</span>}
          </p>
        </div>
        {pct != null && (
          <span className={cn('shrink-0 text-xs font-bold tabular-nums', pctTextColor(pct))}>{pct}%</span>
        )}
      </div>

      <div className="grid grid-cols-2 gap-2">
        <label className="space-y-1">
          <span className="text-[10px] font-semibold uppercase tracking-wide text-slate-400">
            Valor del mes
          </span>
          <input
            type="number"
            min={0}
            step="any"
            value={val}
            disabled={disabled}
            onChange={(e) => handleChange(e.target.value, notes)}
            className={cn(
              'w-full rounded-lg border px-2 py-2 text-right text-sm tabular-nums transition focus:outline-none focus:ring-2 disabled:cursor-not-allowed disabled:bg-slate-50',
              isFilled
                ? 'border-teal-300 bg-teal-50/40 focus:border-teal-600 focus:ring-teal-600/15'
                : 'border-slate-300 focus:border-teal-600 focus:ring-teal-600/15',
            )}
            placeholder="0"
          />
        </label>
        <label className="space-y-1">
          <span className="text-[10px] font-semibold uppercase tracking-wide text-slate-400">
            Observación
          </span>
          <input
            type="text"
            value={notes}
            disabled={disabled}
            onChange={(e) => handleChange(val, e.target.value)}
            className="w-full rounded-lg border border-slate-300 px-2 py-2 text-xs transition focus:border-teal-600 focus:outline-none focus:ring-2 focus:ring-teal-600/15 disabled:cursor-not-allowed disabled:bg-slate-50"
            placeholder="—"
          />
        </label>
      </div>

      <div className="mt-3 flex items-center justify-between gap-2">
        <PprPill tone={validationTone(actividad)} icon={actividad.valueSource === 'source' ? Database : undefined}>
          {validationLabel(actividad)}
        </PprPill>
        <button
          onClick={() => onValidate(actividad.id)}
          disabled={!canValidateActivity(actividad, disabled) || validating}
          className={cn(
            'inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-[11px] font-semibold transition',
            actividad.validationStatus === 'validated'
              ? 'bg-emerald-50 text-emerald-700'
              : 'bg-teal-700 text-white hover:bg-teal-800',
            (!canValidateActivity(actividad, disabled) || validating) && 'cursor-not-allowed opacity-45',
          )}
        >
          {validating ? <Loader2 className="h-3 w-3 animate-spin" /> : <CheckCircle2 className="h-3 w-3" />}
          Validar
        </button>
      </div>
    </div>
  )
}

// --- Page ---------------------------------------------------------------------
export function PprActividadesPage() {
  const { pprUser } = usePprContext()
  const location = useLocation()
  const navState = location.state as { periodo?: PprPeriodoItem; programaId?: number } | null
  const periodoFromNav = navState?.periodo ?? null
  const programaIdFromNav = navState?.programaId ?? null

  const [periodo, setPeriodo] = useState<PprPeriodo | null>(null)
  const [programas, setProgramas] = useState<PprPrograma[]>([])
  const [programaId, setProgramaId] = useState<number | null>(null)
  const [actividades, setActividades] = useState<PprActividad[]>([])

  const [loadingInit, setLoadingInit] = useState(true)
  const [loadingActs, setLoadingActs] = useState(false)
  const [saving, setSaving] = useState(false)
  const [savedFlash, setSavedFlash] = useState(false)
  const [validatingId, setValidatingId] = useState<number | null>(null)
  const [validationSummary, setValidationSummary] = useState<PprValidationSummary | null>(null)
  const [signing, setSigning] = useState(false)
  const [signed, setSigned] = useState(false)
  const [signedAt, setSignedAt] = useState<string | null>(null)
  const [signedDocument, setSignedDocument] = useState<PprSignedDocumentInfo | null>(null)
  const [downloadingPdf, setDownloadingPdf] = useState(false)
  const [loadingDraft, setLoadingDraft] = useState(false)
  const [draftPdf, setDraftPdf] = useState<PprPdfFile | null>(null)
  const [draftPdfUrl, setDraftPdfUrl] = useState<string | null>(null)
  const [documentDialogOpen, setDocumentDialogOpen] = useState(false)
  const [confirmSignOpen, setConfirmSignOpen] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [activityView, setActivityView] = useState<ActivityView>('all')

  async function refreshValidationSummary(periodId = periodo?.id, selectedProgramId = programaId) {
    if (!periodId || !selectedProgramId) return
    try {
      const summary = await fetchValidationSummary(pprUser.employeeId, periodId, selectedProgramId)
      setValidationSummary(summary)
    } catch {
      setValidationSummary(null)
    }
  }

  useEffect(() => {
    setLoadingInit(true)
    const periodoPromise = periodoFromNav ? Promise.resolve(periodoFromNav) : fetchPeriodoActivo()
    Promise.all([periodoPromise, fetchProgramas(pprUser.employeeId)])
      .then(([per, progs]) => {
        setPeriodo(per)
        setProgramas(progs)
        const initial = programaIdFromNav && progs.find((p) => p.id === programaIdFromNav)
          ? programaIdFromNav
          : progs[0]?.id ?? null
        setProgramaId(initial)
      })
      .catch(() => setError('No se pudo cargar la información del período.'))
      .finally(() => setLoadingInit(false))
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pprUser.employeeId])

  useEffect(() => {
    if (!periodo || !programaId) return
    refreshValidationSummary(periodo.id, programaId)
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [periodo?.id, programaId, pprUser.employeeId])

  useEffect(() => {
    if (!programaId || !periodo) return
    setLoadingActs(true)
    setSigned(false)
    setSignedAt(null)
    setSignedDocument(null)
    fetchActividades(programaId, periodo.id, pprUser.employeeId)
      .then((acts) => {
        setActividades(acts)
        if (acts.length > 0 && acts[0].signed) setSigned(true)
      })
      .catch(() => setError('No se pudo cargar las actividades.'))
      .finally(() => setLoadingActs(false))
  }, [programaId, periodo, pprUser.employeeId])

  useEffect(() => {
    if (!signed || !periodo || !programaId) return
    let active = true
    fetchSignedDocumentInfo(periodo.id, pprUser.employeeId, programaId)
      .then((document) => {
        if (!active) return
        setSignedDocument(document)
        if (document?.signedAt) setSignedAt(document.signedAt)
      })
      .catch(() => {
        if (active) setSignedDocument(null)
      })
    return () => {
      active = false
    }
  }, [signed, periodo, programaId, pprUser.employeeId])

  useEffect(() => {
    return () => {
      if (draftPdfUrl) URL.revokeObjectURL(draftPdfUrl)
    }
  }, [draftPdfUrl])

  async function handleValorChange(activityId: number, rawValue: string, notes: string) {
    if (!periodo) return
    const numVal = parseFloat(rawValue)
    if (isNaN(numVal)) return
    setSaving(true)
    try {
      await saveValor({
        activityId,
        periodId: periodo.id,
        employeeId: pprUser.employeeId,
        value: numVal,
        notes,
      })
      setActividades((prev) => prev.map((a) => (
        a.id === activityId
          ? {
              ...a,
              value: numVal,
              notes,
              validationStatus: 'pending',
              validatedAt: null,
              valueSource: a.valueSource === 'source' ? 'manual_override' : (a.valueSource ?? 'manual'),
            }
          : a
      )))
      await refreshValidationSummary(periodo.id)
      setSavedFlash(true)
      setTimeout(() => setSavedFlash(false), 1500)
    } catch {
      setError('Error al guardar el valor.')
    } finally {
      setSaving(false)
    }
  }

  async function handleValidar(activityId: number) {
    if (!periodo) return
    setValidatingId(activityId)
    setError(null)
    try {
      const result = await validarValor({
        activityId,
        periodId: periodo.id,
        employeeId: pprUser.employeeId,
      })
      setActividades((prev) => prev.map((a) => (
        a.id === activityId
          ? { ...a, validationStatus: 'validated', validatedAt: result.validatedAt }
          : a
      )))
      await refreshValidationSummary(periodo.id)
    } catch (validationError) {
      setError(resolveErrorMessage(validationError, 'Error al validar la actividad.'))
    } finally {
      setValidatingId(null)
    }
  }

  async function handleFirmar(forceForTesting = false) {
    if (!periodo || !programaId) return
    setSigning(true)
    setError(null)
    try {
      const result = await firmarPeriodo(
        periodo.id,
        pprUser.employeeId,
        programaId,
        forceForTesting,
      )
      setSigned(true)
      setSignedAt(result.signedAt)
      setSignedDocument(result.document)
      setActividades((prev) => prev.map((a) => ({ ...a, signed: true })))
      await refreshValidationSummary(periodo.id)
      setConfirmSignOpen(false)
      setDocumentDialogOpen(false)
      setDraftPdf(null)
      setDraftPdfUrl(null)
      try {
        await downloadSignedPeriodPdf(periodo.id, pprUser.employeeId, programaId, result.document.fileName)
      } catch (downloadError) {
        setError(resolveErrorMessage(
          downloadError,
          'El periodo fue firmado, pero no se pudo descargar el PDF. Puede intentarlo nuevamente.',
        ))
      }
    } catch (signError) {
      setError(resolveErrorMessage(signError, 'Error al firmar el período.'))
    } finally {
      setSigning(false)
    }
  }

  async function handleOpenDocument() {
    if (!periodo || !programaId) return
    setLoadingDraft(true)
    setError(null)
    try {
      const file = await fetchPprDraftPdf(periodo.id, pprUser.employeeId, programaId)
      setDraftPdf(file)
      setDraftPdfUrl(URL.createObjectURL(file.blob))
      setDocumentDialogOpen(true)
    } catch (draftError) {
      setError(resolveErrorMessage(draftError, 'No se pudo generar el borrador del documento.'))
    } finally {
      setLoadingDraft(false)
    }
  }

  function handleDownloadDraft() {
    if (draftPdf) triggerPprPdfDownload(draftPdf)
  }

  function handleDocumentDialogChange(open: boolean) {
    setDocumentDialogOpen(open)
    if (!open) setConfirmSignOpen(false)
  }

  async function handleDownloadSignedPdf() {
    if (!periodo || !programaId || !signedDocument) return
    setDownloadingPdf(true)
    setError(null)
    try {
      await downloadSignedPeriodPdf(periodo.id, pprUser.employeeId, programaId, signedDocument.fileName)
    } catch (downloadError) {
      setError(resolveErrorMessage(downloadError, 'No se pudo descargar el PDF firmado.'))
    } finally {
      setDownloadingPdf(false)
    }
  }

  const editableActividades = actividades.filter((a) => a.canEdit)
  const validadasActuales = editableActividades.filter((a) => a.validationStatus === 'validated').length
  const conValorActuales = editableActividades.filter((a) => a.value != null).length
  const pendientesActuales = editableActividades.filter((a) => a.value == null).length
  const visibleActividades = editableActividades.filter((a) => {
    if (activityView === 'pending') return a.value == null
    if (activityView === 'filled') return a.value != null && a.validationStatus !== 'validated'
    if (activityView === 'validated') return a.validationStatus === 'validated'
    return true
  })
  const total = validationSummary?.total ?? editableActividades.length
  const completadas = validationSummary?.validated ?? validadasActuales
  const conValor = validationSummary?.withValue ?? conValorActuales
  const pctTotal = total > 0 ? Math.round((completadas / total) * 100) : 0
  const canSign = !signed && (validationSummary?.canSign ?? false) && (periodo?.isOpen ?? false)
  const canForceTestSign = pprUser.role === 'admin'
    && !signed
    && !canSign
    && (periodo?.isOpen ?? false)
  const signEnabled = canSign || canForceTestSign
  const programaActual = programas.find((p) => p.id === programaId)
  const programaActualGroups = programaActual?.activityScope?.length
    ? programaActual.activityScope
    : programaActual?.activityGroups ?? []
  const actividadGroups = groupActividades(visibleActividades)
  const activityViewOptions: Array<{ value: ActivityView; label: string; count: number }> = [
    { value: 'all', label: 'Todas', count: editableActividades.length },
    { value: 'pending', label: 'Pendientes', count: pendientesActuales },
    { value: 'filled', label: 'Con valor', count: Math.max(conValorActuales - validadasActuales, 0) },
    { value: 'validated', label: 'Validadas', count: validadasActuales },
  ]

  return (
    <div className="space-y-5">
      {/* Back link */}
      {periodoFromNav && (
        <Link
          to="/ppr/periodos"
          className="inline-flex items-center gap-1.5 text-xs text-slate-400 transition hover:text-teal-700"
        >
          <ArrowLeft className="h-3.5 w-3.5" />
          Volver a Períodos
        </Link>
      )}
      {!periodoFromNav && programaIdFromNav && (
        <Link
          to="/ppr"
          className="inline-flex items-center gap-1.5 text-xs text-slate-400 transition hover:text-teal-700"
        >
          <ArrowLeft className="h-3.5 w-3.5" />
          Volver al dashboard
        </Link>
      )}

      {/* Header */}
      <PprSectionHeader
        eyebrow="Registro mensual"
        title="Ingreso de datos"
        description={
          periodo
            ? <>
              Período: <span className="font-semibold text-slate-900">{periodo.label}</span>
              {programaActual && <> · Programa: <span className="font-semibold text-slate-900">{programaActual.name}</span></>}
              {programaActualGroups.length > 0 && <> · Grupo: <span className="font-semibold text-slate-900">{programaActualGroups.map((group) => group.name).join(', ')}</span></>}
            </>
            : 'Cargando período...'
        }
        right={
          signed ? (
            <div className="flex flex-wrap items-center justify-end gap-2">
              <PprPill tone="emerald" icon={CheckCircle2} size="md">
              Período firmado
              {signedAt && (
                <span className="ml-1 font-normal opacity-80">
                  {new Date(signedAt).toLocaleDateString('es-PE')}
                </span>
              )}
              </PprPill>
              {signedDocument && (
                <button
                  onClick={handleDownloadSignedPdf}
                  disabled={downloadingPdf}
                  className="inline-flex items-center gap-1.5 rounded-lg border border-emerald-200 bg-white px-3 py-2 text-xs font-semibold text-emerald-700 transition hover:bg-emerald-50 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  {downloadingPdf
                    ? <Loader2 className="h-3.5 w-3.5 animate-spin" />
                    : <FileDown className="h-3.5 w-3.5" />}
                  Descargar PDF
                </button>
              )}
            </div>
          ) : (
            <button
              onClick={handleOpenDocument}
              disabled={!signEnabled || signing || loadingDraft}
              title={!signEnabled ? 'Valide todas las actividades para preparar el documento' : 'Revisar documento'}
              className={cn(
                'flex items-center gap-1.5 rounded-lg px-4 py-2 text-xs font-semibold text-white shadow-sm transition disabled:cursor-not-allowed disabled:opacity-40 disabled:shadow-none',
                canForceTestSign
                  ? 'bg-amber-600 hover:bg-amber-700'
                  : 'bg-teal-700 hover:bg-teal-800',
              )}
            >
              {loadingDraft
                ? <Loader2 className="h-3.5 w-3.5 animate-spin" />
                : <FileText className="h-3.5 w-3.5" />}
              Revisar documento
            </button>
          )
        }
      />

      {/* Error */}
      {error && (
        <PprAlert tone="error" onClose={() => setError(null)}>
          {error}
        </PprAlert>
      )}

      {loadingInit ? (
        <div className="space-y-4">
          <PprSkeleton className="h-10 w-full rounded-lg" />
          <PprSkeleton className="h-16 w-full rounded-lg" />
          <PprSkeleton className="h-96 w-full rounded-lg" />
        </div>
      ) : (
        <>
          {/* Program tabs */}
          {programas.length > 1 && (
            <div className="flex flex-wrap items-center gap-2">
              <span className="text-[10px] font-semibold uppercase tracking-wide text-slate-400">
                Programa:
              </span>
              <div className="flex flex-wrap gap-1.5">
                {programas.map((p) => (
                  <button
                    key={p.id}
                    onClick={() => setProgramaId(p.id)}
                    className={cn(
                      'rounded-lg border px-3 py-1.5 text-xs font-medium transition',
                      programaId === p.id
                        ? 'border-teal-700 bg-teal-700 text-white shadow-sm'
                        : 'border-slate-200 bg-white text-slate-900 hover:border-teal-300 hover:bg-teal-50',
                    )}
                  >
                    <span>
                      {p.code && <span className="mr-1 opacity-70">{p.code}</span>}
                      {p.name}
                    </span>
                    {(p.activityScope?.length ? p.activityScope : p.activityGroups ?? []).map((group) => (
                      <span
                        key={group.code}
                        className={cn(
                          'ml-1 rounded px-1.5 py-0.5 text-[10px] font-semibold',
                          programaId === p.id ? 'bg-white/20 text-white' : 'bg-cyan-50 text-cyan-700',
                        )}
                      >
                        {group.name}
                      </span>
                    ))}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* No programs */}
          {programas.length === 0 && (
            <PprEmptyState
              icon={ClipboardCheck}
              title="Sin programas asignados"
              description="Contacte al administrador para que le asigne programas PPR."
            />
          )}

          {/* Progress summary */}
          {total > 0 && (
            <div className="rounded-lg border border-slate-200 bg-white px-5 py-4 shadow-[0_1px_2px_rgba(15,23,42,0.04)]">
              <div className="mb-2 flex items-center justify-between">
                <div>
                  <p className="text-[10px] font-semibold uppercase tracking-widest text-slate-400">
                    Validación del mes
                  </p>
                  <p className={cn('mt-0.5 text-lg font-bold tabular-nums', pctTextColor(pctTotal))}>
                    {pctTotal}%
                    <span className="ml-2 text-xs font-normal text-slate-500">
                      {completadas}/{total} validadas · {conValor} con valor
                    </span>
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  {savedFlash && (
                    <div className="flex items-center gap-1 rounded-md bg-emerald-50 px-2 py-1 text-[10px] font-semibold text-emerald-600 animate-ppr-fade">
                      <CheckCircle2 className="h-3 w-3" />
                      Guardado
                    </div>
                  )}
                  {saving && (
                    <div className="flex items-center gap-1 rounded-md bg-cyan-50 px-2 py-1 text-[10px] font-semibold text-cyan-700">
                      <Save className="h-3 w-3 animate-pulse" />
                      Guardando…
                    </div>
                  )}
                </div>
              </div>
              <PprProgressBar value={pctTotal} size="md" />
            </div>
          )}

          {editableActividades.length > 0 && (
            <div className="flex flex-wrap gap-1.5 rounded-lg border border-slate-200 bg-white p-2 shadow-[0_1px_2px_rgba(15,23,42,0.04)]">
              {activityViewOptions.map((option) => (
                <button
                  key={option.value}
                  onClick={() => setActivityView(option.value)}
                  className={cn(
                    'rounded-md px-2.5 py-1.5 text-[11px] font-semibold transition',
                    activityView === option.value
                      ? 'bg-slate-900 text-white'
                      : 'bg-slate-100 text-slate-600 hover:bg-teal-50 hover:text-teal-700',
                  )}
                >
                  {option.label}
                  <span className="ml-1 opacity-70">{option.count}</span>
                </button>
              ))}
            </div>
          )}

          {/* Activities — table on lg+, cards on mobile */}
          {programaId !== null && (
            <>
              {loadingActs ? (
                <div className="space-y-3">
                  {Array.from({ length: 4 }).map((_, i) => (
                    <PprSkeleton key={i} className="h-16 w-full rounded-lg" />
                  ))}
                </div>
              ) : editableActividades.length === 0 ? (
                <PprEmptyState
                  icon={ClipboardCheck}
                  title="Sin actividades asignadas para registro"
                  description="Este programa tiene actividades, pero ninguna pertenece al alcance editable de este coordinador."
                />
              ) : visibleActividades.length === 0 ? (
                <PprEmptyState
                  icon={ClipboardCheck}
                  title="Sin actividades en este filtro"
                  description="Cambia el filtro para revisar otras actividades del programa."
                />
              ) : (
                <>
                  {/* Mobile cards */}
                  <div className="ppr-stagger space-y-2.5 lg:hidden">
                    {actividadGroups.map((group) => (
                      <div key={group.key} className="space-y-2.5">
                        {group.name && (
                          <div className="flex items-center justify-between rounded-lg border border-slate-200 bg-slate-50 px-3 py-2">
                            <span className="text-xs font-bold text-slate-700">{group.name}</span>
                            <span className="rounded-md bg-white px-2 py-0.5 text-[10px] font-semibold text-slate-500">
                              {group.actividades.length}
                            </span>
                          </div>
                        )}
                        {group.actividades.map((act) => (
                          <ActividadCard
                            key={act.id}
                            actividad={act}
                            disabled={signed || !(periodo?.isOpen ?? false) || !act.canEdit}
                            onChange={handleValorChange}
                            onValidate={handleValidar}
                            validating={validatingId === act.id}
                          />
                        ))}
                      </div>
                    ))}
                  </div>

                  {/* Desktop table */}
                  <div className="hidden overflow-hidden rounded-lg border border-slate-200 bg-white shadow-[0_1px_2px_rgba(15,23,42,0.04)] lg:block">
                    <div className="overflow-x-auto">
                      <table className="w-full text-sm">
                        <thead>
                          <tr className="border-b border-slate-200 bg-slate-50">
                            <th className="py-3 pl-4 pr-2 text-left text-xs font-semibold text-slate-900">Actividad</th>
                            <th className="px-2 py-3 text-center text-xs font-semibold text-slate-900">Unidad</th>
                            <th className="px-2 py-3 text-center text-xs font-semibold text-slate-900">Meta anual</th>
                            <th className="px-2 py-3 text-center text-xs font-semibold text-slate-900">Valor mes</th>
                            <th className="px-2 py-3 text-left text-xs font-semibold text-slate-900">Observaciones</th>
                            <th className="px-2 py-3 text-center text-xs font-semibold text-slate-900">Estado</th>
                            <th className="px-2 py-3 text-center text-xs font-semibold text-slate-900">% Avance</th>
                            <th className="px-3 py-3 text-center text-xs font-semibold text-slate-900">Validación</th>
                          </tr>
                        </thead>
                        <tbody>
                          {actividadGroups.map((group) => (
                            <Fragment key={group.key}>
                              {group.name && (
                                <tr className="border-b border-slate-200 bg-slate-100">
                                  <td colSpan={8} className="px-4 py-2">
                                    <div className="flex items-center justify-between">
                                      <span className="text-xs font-bold text-slate-700">{group.name}</span>
                                      <span className="rounded-md bg-white px-2 py-0.5 text-[10px] font-semibold text-slate-500">
                                        {group.actividades.length} actividades
                                      </span>
                                    </div>
                                  </td>
                                </tr>
                              )}
                              {group.actividades.map((act) => (
                                <ActividadRow
                                  key={act.id}
                                  actividad={act}
                                  disabled={signed || !(periodo?.isOpen ?? false) || !act.canEdit}
                                  onChange={handleValorChange}
                                  onValidate={handleValidar}
                                  validating={validatingId === act.id}
                                />
                              ))}
                            </Fragment>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                </>
              )}
            </>
          )}

          {periodo && !periodo.isOpen && (
            <p className="text-center text-xs text-slate-400">
              Este período está cerrado. Solo lectura.
            </p>
          )}
        </>
      )}

      <Dialog open={documentDialogOpen} onOpenChange={handleDocumentDialogChange}>
        <DialogContent className="flex max-h-[94vh] w-[min(96vw,1180px)] max-w-none flex-col">
          <DialogHeader>
            <DialogTitle>Documento mensual sin firma</DialogTitle>
            <DialogDescription>
              Revise el contenido antes de descargar el borrador o confirmar la firma.
            </DialogDescription>
          </DialogHeader>

          <div className="min-h-0 flex-1 overflow-hidden rounded-lg border border-slate-200 bg-slate-100">
            {draftPdfUrl ? (
              <iframe
                src={draftPdfUrl}
                title="Vista previa del documento mensual PPR"
                className="h-[68vh] w-full bg-white"
              />
            ) : (
              <div className="flex h-[68vh] items-center justify-center text-sm text-slate-500">
                No se pudo cargar la vista previa.
              </div>
            )}
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={handleDownloadDraft} disabled={!draftPdf}>
              <FileDown className="h-4 w-4" />
              Descargar borrador
            </Button>
            <Button
              variant={canForceTestSign ? 'danger' : 'brand'}
              onClick={() => setConfirmSignOpen(true)}
              disabled={signing}
            >
              <PenLine className="h-4 w-4" />
              Firmar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={confirmSignOpen} onOpenChange={setConfirmSignOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Confirmar firma del período</DialogTitle>
            <DialogDescription>
              ¿Está seguro de firmar este documento? Después de confirmar, el período quedará bloqueado
              y se descargará una copia con la firma incluida.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setConfirmSignOpen(false)} disabled={signing}>
              Cancelar
            </Button>
            <Button
              variant={canForceTestSign ? 'danger' : 'brand'}
              onClick={() => handleFirmar(canForceTestSign)}
              disabled={signing}
            >
              {signing ? <Loader2 className="h-4 w-4 animate-spin" /> : <PenLine className="h-4 w-4" />}
              {canForceTestSign ? 'Sí, firmar con pendientes' : 'Sí, firmar y descargar'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
