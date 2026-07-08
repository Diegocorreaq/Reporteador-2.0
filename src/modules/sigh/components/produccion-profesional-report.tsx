import { useEffect, useMemo, useRef, useState } from 'react'
import { Download, FileText, Search } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Alert } from '@/components/ui/alert'
import { SighFilterPanel } from '@/modules/sigh/components/sigh-filter-panel'
import { SighPageShell } from '@/modules/sigh/components/sigh-page-shell'
import { SighTable, type SighTableColumn } from '@/modules/sigh/components/sigh-table'
import {
  countDaysBetween,
  formatDateOnlyLabel,
  getTodayDate,
  resolveRowNumber,
  resolveRowText,
} from '@/modules/sigh/sigh-utils'
import type {
  ProduccionDetalleReport,
  ProduccionProfesional,
  ProduccionResumenReport,
  ReportWarning,
  SighTableRow,
} from '@/modules/sigh/types'

const MAX_RANGE_DAYS = 31
const INVALID_PROFESSIONAL_MESSAGE = 'Seleccione un profesional de la lista de resultados.'

interface ProductionFilters {
  fechaInicio: string
  fechaFin: string
  empleadoId: number
}

interface ProduccionProfesionalReportProps {
  description: string
  professionalLabel: string
  searchProfessionals: (term: string) => Promise<ProduccionProfesional[]>
  getSummary: (filters: ProductionFilters) => Promise<ProduccionResumenReport>
  downloadPdf: (filters: ProductionFilters) => Promise<ReportWarning[] | void>
  downloadExcel: (filters: ProductionFilters) => Promise<ReportWarning[] | void>
  getDetail?: (filters: ProductionFilters & { orden: number; actividad: string }) => Promise<ProduccionDetalleReport>
}

function validateFilters(
  searchText: string,
  professional: ProduccionProfesional | null,
  fechaInicio: string,
  fechaFin: string,
) {
  if (!professional || searchText.trim() !== professional.nombre.trim()) {
    return INVALID_PROFESSIONAL_MESSAGE
  }
  if (!fechaInicio || !fechaFin) {
    return 'Ingrese un rango de fechas válido.'
  }
  if (fechaInicio > fechaFin) {
    return 'La fecha inicial no puede ser mayor que la fecha final.'
  }
  if (countDaysBetween(fechaInicio, fechaFin) > MAX_RANGE_DAYS) {
    return `La diferencia de fechas no debe exceder ${MAX_RANGE_DAYS} días.`
  }
  return null
}

export function ProduccionProfesionalReport({
  description,
  professionalLabel,
  searchProfessionals,
  getSummary,
  downloadPdf,
  downloadExcel,
  getDetail,
}: ProduccionProfesionalReportProps) {
  const [filters, setFilters] = useState({ fechaInicio: getTodayDate(), fechaFin: getTodayDate() })
  const [searchText, setSearchText] = useState('')
  const [professionals, setProfessionals] = useState<ProduccionProfesional[]>([])
  const [selectedProfessional, setSelectedProfessional] = useState<ProduccionProfesional | null>(null)
  const [report, setReport] = useState<ProduccionResumenReport | null>(null)
  const [hasQueried, setHasQueried] = useState(false)
  const [searching, setSearching] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [warnings, setWarnings] = useState<ReportWarning[]>([])
  const [openAutocomplete, setOpenAutocomplete] = useState(false)
  const [detailRows, setDetailRows] = useState<SighTableRow[]>([])
  const [detailTitle, setDetailTitle] = useState('')
  const [isDetailOpen, setIsDetailOpen] = useState(false)
  const [loadingDetail, setLoadingDetail] = useState(false)
  const autocompleteRef = useRef<HTMLDivElement | null>(null)
  const searchSequence = useRef(0)

  const clearReportResults = () => {
    setReport(null)
    setHasQueried(false)
    setDetailRows([])
    setIsDetailOpen(false)
    setWarnings([])
  }

  useEffect(() => {
    const sequence = ++searchSequence.current
    if (searchText.trim().length < 3 || selectedProfessional) {
      setProfessionals([])
      setSearching(false)
      return
    }

    const timeout = window.setTimeout(() => {
      setSearching(true)
      void searchProfessionals(searchText.trim())
        .then((rows) => {
          if (sequence === searchSequence.current) setProfessionals(Array.isArray(rows) ? rows : [])
        })
        .catch(() => {
          if (sequence === searchSequence.current) {
            setProfessionals([])
            setError('No se pudo buscar profesionales.')
          }
        })
        .finally(() => {
          if (sequence === searchSequence.current) setSearching(false)
        })
    }, 350)

    return () => window.clearTimeout(timeout)
  }, [searchProfessionals, searchText, selectedProfessional])

  useEffect(() => {
    const handleOutsideClick = (event: MouseEvent) => {
      if (autocompleteRef.current && !autocompleteRef.current.contains(event.target as Node)) {
        setOpenAutocomplete(false)
      }
    }
    window.addEventListener('mousedown', handleOutsideClick)
    return () => window.removeEventListener('mousedown', handleOutsideClick)
  }, [])

  const days = useMemo(() => {
    if (!report?.dayRange) return []
    return Array.from(
      { length: Math.max(0, report.dayRange.diaFin - report.dayRange.diaInicio + 1) },
      (_, index) => report.dayRange!.diaInicio + index,
    )
  }, [report?.dayRange])

  const rangeDays = filters.fechaInicio && filters.fechaFin
    ? countDaysBetween(filters.fechaInicio, filters.fechaFin)
    : 0

  const detailColumns = useMemo<SighTableColumn[]>(
    () => [
      { key: 'servicio', label: 'Servicio', render: (_, row) => resolveRowText(row, 'SERVICIO', ['servicio_actividad']) },
      {
        key: 'fecha',
        label: 'Fecha',
        align: 'center',
        render: (_, row) => formatDateOnlyLabel(resolveRowText(row, 'FECHA_REGISTRO', ['FECHA'])),
      },
      { key: 'hora', label: 'Hora', render: (_, row) => resolveRowText(row, 'HORA_REGISTRO', ['HORA']) },
      { key: 'cuenta', label: 'Cuenta', render: (_, row) => resolveRowText(row, 'NRO_CUENTA', ['CUENTA', 'idcuenta']) },
      { key: 'paciente', label: 'Paciente', render: (_, row) => resolveRowText(row, 'NOMBRE_PACIENTE', ['paciente']) },
    ],
    [],
  )

  const getValidatedFilters = () => {
    const validationError = validateFilters(
      searchText,
      selectedProfessional,
      filters.fechaInicio,
      filters.fechaFin,
    )
    if (validationError || !selectedProfessional) {
      setError(validationError ?? INVALID_PROFESSIONAL_MESSAGE)
      return null
    }
    return { ...filters, empleadoId: selectedProfessional.idEmpleado }
  }

  const handleSearchTextChange = (value: string) => {
    setSearchText(value)
    setSelectedProfessional(null)
    setProfessionals([])
    setOpenAutocomplete(true)
    setError(null)
    clearReportResults()
  }

  const handlePickProfessional = (professional: ProduccionProfesional) => {
    setSearchText(professional.nombre)
    setSelectedProfessional(professional)
    setProfessionals([])
    setOpenAutocomplete(false)
    setError(null)
    clearReportResults()
  }

  const handleDateChange = (key: 'fechaInicio' | 'fechaFin', value: string) => {
    setFilters((current) => ({ ...current, [key]: value }))
    setError(null)
    clearReportResults()
  }

  const handleProcess = async () => {
    const validFilters = getValidatedFilters()
    if (!validFilters) return

    setError(null)
    setWarnings([])
    setLoading(true)
    setHasQueried(true)
    setReport(null)
    try {
      const payload = await getSummary(validFilters)
      if (!payload || !Array.isArray(payload.rows)) throw new Error('El servidor devolvió una respuesta inválida.')
      setReport(payload)
      setWarnings(payload.warnings ?? [])
    } catch (processError) {
      setError(processError instanceof Error ? processError.message : 'No se pudo procesar el reporte.')
    } finally {
      setLoading(false)
    }
  }

  const handleExport = async (format: 'pdf' | 'excel') => {
    const validFilters = getValidatedFilters()
    if (!validFilters) return

    setError(null)
    setWarnings([])
    setLoading(true)
    try {
      const exportWarnings = await (format === 'pdf' ? downloadPdf(validFilters) : downloadExcel(validFilters))
      setWarnings(exportWarnings ?? [])
    } catch (exportError) {
      setError(exportError instanceof Error ? exportError.message : `No se pudo exportar en ${format.toUpperCase()}.`)
    } finally {
      setLoading(false)
    }
  }

  const handleOpenDetail = async (row: SighTableRow) => {
    if (!getDetail) return
    const validFilters = getValidatedFilters()
    const orden = resolveRowNumber(row, 'ORD', ['COD_ACT'])
    const actividad = resolveRowText(row, 'TIPOACTIVIDAD', ['TIPO_ACTIVIDAD'])
    if (!validFilters || !orden) return

    setLoadingDetail(true)
    setIsDetailOpen(true)
    setDetailRows([])
    setDetailTitle(resolveRowText(row, 'TIPOACTIVIDAD', ['TIPO_ACTIVIDAD']))
    try {
      const payload = await getDetail({ ...validFilters, orden, actividad })
      setDetailRows(Array.isArray(payload?.rows) ? payload.rows : [])
      setWarnings(payload.warnings ?? [])
    } catch (detailError) {
      setError(detailError instanceof Error ? detailError.message : 'No se pudo consultar el detalle.')
    } finally {
      setLoadingDetail(false)
    }
  }

  const controlsEnabled = !validateFilters(
    searchText,
    selectedProfessional,
    filters.fechaInicio,
    filters.fechaFin,
  )

  return (
    <SighPageShell error={error} description={description}>
      {warnings.map((warning) => (
        <Alert key={warning.code} variant="warning">
          El reporte se generó, pero no fue posible cargar la producción CNV.
        </Alert>
      ))}
      <SighFilterPanel
        onProcess={() => void handleProcess()}
        processLabel="Consultar"
        processDisabled={loading || !controlsEnabled}
      >
        <div className="w-full min-w-0 space-y-1 md:min-w-[280px] md:flex-1" ref={autocompleteRef}>
          <label className="text-xs font-semibold text-brand-strong" htmlFor="produccion-profesional-input">
            {professionalLabel}
          </label>
          <div className="relative">
            <Input
              id="produccion-profesional-input"
              placeholder="Escriba al menos 3 caracteres"
              value={searchText}
              onFocus={() => setOpenAutocomplete(true)}
              onChange={(event) => handleSearchTextChange(event.target.value)}
              autoComplete="off"
            />
            {openAutocomplete && searchText.trim().length >= 3 && !selectedProfessional ? (
              <div className="absolute z-20 mt-1 max-h-52 w-full overflow-auto rounded-md border border-border bg-white shadow-lg">
                {searching ? <div className="px-3 py-2 text-xs text-muted">Buscando...</div> : null}
                {!searching && professionals.length === 0 ? (
                  <div className="px-3 py-2 text-xs text-muted">No se encontraron profesionales.</div>
                ) : null}
                {professionals.map((professional) => (
                  <button
                    key={professional.idEmpleado}
                    type="button"
                    className="block w-full border-b border-border/40 px-3 py-2 text-left hover:bg-brand-soft/40"
                    onClick={() => handlePickProfessional(professional)}
                  >
                    <p className="text-xs font-medium text-text">{professional.nombre}</p>
                    <p className="text-[11px] text-muted">DNI: {professional.dni} | {professional.tipoEmpleado}</p>
                  </button>
                ))}
              </div>
            ) : null}
          </div>
        </div>

        <div className="w-full space-y-1 md:w-[220px]">
          <label className="text-xs font-semibold text-brand-strong" htmlFor="produccion-tipo-input">
            Tipo de profesional
          </label>
          <Input id="produccion-tipo-input" value={selectedProfessional?.tipoEmpleado ?? ''} readOnly />
        </div>

        <div className="w-full space-y-1 md:w-[160px]">
          <label className="text-xs font-semibold text-brand-strong" htmlFor="produccion-fecha-inicio">Desde</label>
          <Input
            id="produccion-fecha-inicio"
            type="date"
            value={filters.fechaInicio}
            onChange={(event) => handleDateChange('fechaInicio', event.target.value)}
          />
        </div>

        <div className="w-full space-y-1 md:w-[160px]">
          <label className="text-xs font-semibold text-brand-strong" htmlFor="produccion-fecha-fin">Hasta</label>
          <Input
            id="produccion-fecha-fin"
            type="date"
            value={filters.fechaFin}
            onChange={(event) => handleDateChange('fechaFin', event.target.value)}
          />
        </div>

        <div className="flex w-full flex-wrap items-end gap-2 md:w-auto md:pb-2">
          <Button size="sm" className="h-9 gap-1.5 px-3 font-semibold" onClick={() => void handleExport('pdf')} disabled={loading || !controlsEnabled}>
            <FileText className="h-4 w-4" />
            PDF
          </Button>
          <Button size="sm" className="h-9 gap-1.5 px-3 font-semibold" variant="brand" onClick={() => void handleExport('excel')} disabled={loading || !controlsEnabled}>
            <Download className="h-4 w-4" />
            Excel
          </Button>
        </div>
        <div className="w-full text-xs text-muted md:w-auto md:pb-2">Rango: {rangeDays} días</div>
      </SighFilterPanel>

      <Card className="border-border/70">
        <CardHeader className="border-b border-border/60 pb-3">
          <div className="flex flex-wrap items-start justify-between gap-2">
            <CardTitle className="text-sm">Producción por actividad</CardTitle>
            {selectedProfessional ? (
              <div className="text-[11px] leading-snug text-muted sm:text-right">
                <span className="font-semibold text-[#123B63]">{selectedProfessional.nombre}</span>
                {' · '}{selectedProfessional.tipoEmpleado}
                {' · '}{filters.fechaInicio} al {filters.fechaFin}
              </div>
            ) : null}
          </div>
        </CardHeader>
        <CardContent className="pt-4">
          <div className="overflow-x-auto rounded-md border border-border/70">
            <table className="min-w-[760px] border-collapse text-[11px] sm:text-[12px]">
              <thead>
                <tr className="bg-[#123B63] text-white">
                  <th className="border-b border-white/15 px-2 py-1.5 text-center">Código</th>
                  <th className="border-b border-white/15 px-2 py-1.5 text-left">Actividad</th>
                  {days.map((day) => <th key={day} className="border-b border-white/15 px-2 py-1.5 text-center">{day}</th>)}
                  <th className="border-b border-white/15 px-2 py-1.5 text-center">Total</th>
                  {getDetail ? <th className="border-b border-white/15 px-2 py-1.5 text-center">Detalle</th> : null}
                </tr>
              </thead>
              <tbody>
                {report?.rows.length ? report.rows.map((row, rowIndex) => {
                  const rowTotal = days.reduce((total, day) => total + resolveRowNumber(row, String(day)), 0)
                  return (
                    <tr key={`${resolveRowText(row, 'ORD', ['COD_ACT'])}-${rowIndex}`} className="odd:bg-white even:bg-[#f8fbff]">
                      <td className="border-b border-border/70 px-2 py-1 text-center">{resolveRowText(row, 'ORD', ['COD_ACT']) || '-'}</td>
                      <td className="border-b border-border/70 px-2 py-1">{resolveRowText(row, 'TIPOACTIVIDAD', ['TIPO_ACTIVIDAD']) || '-'}</td>
                      {days.map((day) => {
                        const value = resolveRowNumber(row, String(day))
                        return <td key={`${rowIndex}-${day}`} className="border-b border-border/70 px-2 py-1 text-center">{value || '-'}</td>
                      })}
                      <td className="border-b border-border/70 bg-[#f2f7fc] px-2 py-1 text-center font-semibold">{rowTotal}</td>
                      {getDetail ? (
                        <td className="border-b border-border/70 px-2 py-1 text-center">
                          <Button size="sm" variant="ghost" className="h-7 px-2 text-[11px]" onClick={() => void handleOpenDetail(row)}>
                            <Search className="h-3.5 w-3.5" /> Ver
                          </Button>
                        </td>
                      ) : null}
                    </tr>
                  )
                }) : (
                  <tr>
                    <td colSpan={days.length + (getDetail ? 4 : 3)} className="px-3 py-5 text-center text-xs text-muted">
                      {loading ? 'Procesando reporte...' : hasQueried ? 'No se encontraron resultados.' : 'Seleccione un profesional y consulte el reporte.'}
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>

      <Dialog open={isDetailOpen} onOpenChange={setIsDetailOpen}>
        <DialogContent className="flex max-h-[85vh] w-[min(95vw,1100px)] max-w-none flex-col overflow-hidden">
          <DialogHeader className="shrink-0">
            <DialogTitle>Detalle de actividad: {detailTitle || '-'}</DialogTitle>
          </DialogHeader>
          <div className="min-h-0 flex-1 overflow-y-auto pr-1">
            <SighTable
              rows={detailRows}
              columns={detailColumns}
              emptyMessage={loadingDetail ? 'Cargando detalle...' : 'No se encontraron registros para esta actividad.'}
            />
          </div>
        </DialogContent>
      </Dialog>
    </SighPageShell>
  )
}
