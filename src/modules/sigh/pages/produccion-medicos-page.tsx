import { useEffect, useMemo, useRef, useState } from 'react'
import { Download, FileText, Search } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { SighFilterPanel } from '@/modules/sigh/components/sigh-filter-panel'
import { SighPageShell } from '@/modules/sigh/components/sigh-page-shell'
import { SighTable, type SighTableColumn } from '@/modules/sigh/components/sigh-table'
import { countDaysBetween, getTodayDate, resolveRowNumber, resolveRowText } from '@/modules/sigh/sigh-utils'
import {
  downloadProduccionMedicosExcel,
  downloadProduccionMedicosPdf,
  getProduccionMedicosDetalle,
  getProduccionMedicosResumen,
  searchProduccionMedicos,
} from '@/modules/sigh/services/sigh-reports.service'
import type { ProduccionMedicoEmpleado, ProduccionMedicosResumenReport, SighTableRow } from '@/modules/sigh/types'

const MAX_RANGE_DAYS = 31

export function ProduccionMedicosPage() {
  const [filters, setFilters] = useState({
    fechaInicio: getTodayDate(),
    fechaFin: getTodayDate(),
  })
  const [query, setQuery] = useState('')
  const [searching, setSearching] = useState(false)
  const [employees, setEmployees] = useState<ProduccionMedicoEmpleado[]>([])
  const [selectedEmployee, setSelectedEmployee] = useState<ProduccionMedicoEmpleado | null>(null)
  const [report, setReport] = useState<ProduccionMedicosResumenReport | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [detailRows, setDetailRows] = useState<SighTableRow[]>([])
  const [detailTitle, setDetailTitle] = useState('')
  const [isDetailOpen, setIsDetailOpen] = useState(false)
  const [loadingDetail, setLoadingDetail] = useState(false)
  const [openAutocomplete, setOpenAutocomplete] = useState(false)
  const autocompleteRef = useRef<HTMLDivElement | null>(null)

  const rangeDays = countDaysBetween(filters.fechaInicio, filters.fechaFin)

  useEffect(() => {
    if (query.trim().length < 3) {
      setEmployees([])
      return
    }

    const timeout = window.setTimeout(() => {
      void (async () => {
        setSearching(true)
        try {
          const rows = await searchProduccionMedicos(query.trim())
          setEmployees(rows)
        } catch (searchError) {
          console.warn('No se pudo buscar profesionales.', searchError)
        } finally {
          setSearching(false)
        }
      })()
    }, 350)

    return () => window.clearTimeout(timeout)
  }, [query])

  useEffect(() => {
    const handleOutsideClick = (event: MouseEvent) => {
      if (!autocompleteRef.current) return
      if (!autocompleteRef.current.contains(event.target as Node)) {
        setOpenAutocomplete(false)
      }
    }

    window.addEventListener('mousedown', handleOutsideClick)
    return () => window.removeEventListener('mousedown', handleOutsideClick)
  }, [])

  const days = useMemo(() => {
    if (!report?.dayRange) return []
    const values: number[] = []
    for (let day = report.dayRange.diaInicio; day <= report.dayRange.diaFin; day += 1) {
      values.push(day)
    }
    return values
  }, [report?.dayRange])

  const detailColumns = useMemo<SighTableColumn[]>(
    () => [
      {
        key: 'servicio',
        label: 'Servicio',
        render: (_, row) => resolveRowText(row, 'SERVICIO', ['servicio_actividad', 'servicio']),
      },
      {
        key: 'fecha',
        label: 'Fecha',
        render: (_, row) => resolveRowText(row, 'FECHA_REGISTRO', ['fecha']),
      },
      {
        key: 'hora',
        label: 'Hora',
        render: (_, row) => resolveRowText(row, 'HORA_REGISTRO', ['hora']),
      },
      {
        key: 'cuenta',
        label: 'Cuenta',
        render: (_, row) => resolveRowText(row, 'NRO_CUENTA', ['idcuenta']),
      },
      {
        key: 'paciente',
        label: 'Paciente',
        render: (_, row) => resolveRowText(row, 'NOMBRE_PACIENTE', ['paciente']),
      },
    ],
    [],
  )

  const handlePickEmployee = (employee: ProduccionMedicoEmpleado) => {
    setSelectedEmployee(employee)
    setQuery(employee.empleado)
    setOpenAutocomplete(false)
  }

  const handleProcess = async () => {
    if (!selectedEmployee) {
      setError('Debe seleccionar un profesional.')
      return
    }
    if (filters.fechaInicio > filters.fechaFin) {
      setError('La fecha de inicio no puede ser mayor a la fecha fin.')
      return
    }
    if (rangeDays > MAX_RANGE_DAYS) {
      setError(`La diferencia de fechas no debe exceder ${MAX_RANGE_DAYS} dias.`)
      return
    }

    setError(null)
    setLoading(true)
    try {
      const payload = await getProduccionMedicosResumen({
        fechaInicio: filters.fechaInicio,
        fechaFin: filters.fechaFin,
        empleadoId: selectedEmployee.idEmpleado,
      })
      setReport(payload)
    } catch (processError) {
      const message = processError instanceof Error ? processError.message : 'No se pudo procesar el reporte.'
      setError(message)
    } finally {
      setLoading(false)
    }
  }

  const handleExportExcel = async () => {
    if (!selectedEmployee) {
      setError('Debe seleccionar un profesional.')
      return
    }

    try {
      await downloadProduccionMedicosExcel({
        fechaInicio: filters.fechaInicio,
        fechaFin: filters.fechaFin,
        empleadoId: selectedEmployee.idEmpleado,
      })
    } catch (exportError) {
      const message = exportError instanceof Error ? exportError.message : 'No se pudo exportar en Excel.'
      setError(message)
    }
  }

  const handleExportPdf = async () => {
    if (!selectedEmployee) {
      setError('Debe seleccionar un profesional.')
      return
    }

    try {
      await downloadProduccionMedicosPdf({
        fechaInicio: filters.fechaInicio,
        fechaFin: filters.fechaFin,
        empleadoId: selectedEmployee.idEmpleado,
      })
    } catch (exportError) {
      const message = exportError instanceof Error ? exportError.message : 'No se pudo exportar en PDF.'
      setError(message)
    }
  }

  const handleOpenDetail = async (row: SighTableRow) => {
    if (!selectedEmployee) {
      return
    }

    const orden = resolveRowNumber(row, 'ORD', ['ord', 'COD_ACT', 'cod_act'])
    if (!orden) {
      return
    }

    setLoadingDetail(true)
    setIsDetailOpen(true)
    setDetailRows([])
    setDetailTitle(resolveRowText(row, 'TIPOACTIVIDAD', ['tipoactividad']))
    try {
      const payload = await getProduccionMedicosDetalle({
        fechaInicio: filters.fechaInicio,
        fechaFin: filters.fechaFin,
        empleadoId: selectedEmployee.idEmpleado,
        orden,
      })
      setDetailRows(payload.rows)
    } catch (detailError) {
      const message = detailError instanceof Error ? detailError.message : 'No se pudo consultar el detalle.'
      setError(message)
    } finally {
      setLoadingDetail(false)
    }
  }

  return (
    <SighPageShell
      error={error}
      description="Produccion de actividades realizadas y registradas por medico con detalle y exportacion."
    >
      <SighFilterPanel onProcess={() => void handleProcess()}>
        <div className="w-full min-w-0 space-y-1 md:min-w-[280px] md:flex-1" ref={autocompleteRef}>
          <label className="text-xs font-semibold text-brand-strong" htmlFor="prod-medico-input">
            Profesional
          </label>
          <div className="relative">
            <Input
              id="prod-medico-input"
              placeholder="Escriba al menos 3 caracteres"
              value={query}
              onFocus={() => setOpenAutocomplete(true)}
              onChange={(event) => {
                setQuery(event.target.value)
                setSelectedEmployee(null)
                setOpenAutocomplete(true)
              }}
            />
            {openAutocomplete && (employees.length > 0 || searching) ? (
              <div className="absolute z-20 mt-1 max-h-52 w-full overflow-auto rounded-md border border-border bg-white shadow-lg">
                {searching ? (
                  <div className="px-3 py-2 text-xs text-muted">Buscando...</div>
                ) : (
                  employees.map((employee) => (
                    <button
                      key={employee.idEmpleado}
                      type="button"
                      className="block w-full border-b border-border/40 px-3 py-2 text-left hover:bg-brand-soft/40"
                      onClick={() => handlePickEmployee(employee)}
                    >
                      <p className="text-xs font-medium text-text">{employee.empleado}</p>
                      <p className="text-[11px] text-muted">
                        DNI: {employee.dni} | {employee.especialidad}
                      </p>
                    </button>
                  ))
                )}
              </div>
            ) : null}
          </div>
        </div>

        <div className="w-full space-y-1 md:w-[220px]">
          <label className="text-xs font-semibold text-brand-strong" htmlFor="prod-especialidad-input">
            Especialidad
          </label>
          <Input id="prod-especialidad-input" value={selectedEmployee?.especialidad ?? ''} readOnly />
        </div>

        <div className="w-full space-y-1 md:w-[160px]">
          <label className="text-xs font-semibold text-brand-strong" htmlFor="prod-fecha-inicio">
            Desde
          </label>
          <Input
            id="prod-fecha-inicio"
            type="date"
            value={filters.fechaInicio}
            onChange={(event) => setFilters((current) => ({ ...current, fechaInicio: event.target.value }))}
          />
        </div>

        <div className="w-full space-y-1 md:w-[160px]">
          <label className="text-xs font-semibold text-brand-strong" htmlFor="prod-fecha-fin">
            Hasta
          </label>
          <Input
            id="prod-fecha-fin"
            type="date"
            value={filters.fechaFin}
            onChange={(event) => setFilters((current) => ({ ...current, fechaFin: event.target.value }))}
          />
        </div>

        <div className="flex w-full flex-wrap items-end gap-2 md:w-auto md:pb-2">
          <Button
            size="sm"
            className="h-9 gap-1.5 px-3 font-semibold"
            style={selectedEmployee ? { backgroundColor: '#D98B27', color: '#fff' } : undefined}
            variant={selectedEmployee ? 'default' : 'outline'}
            onClick={() => void handleExportPdf()}
            disabled={!selectedEmployee}
            title="Exportar producción en PDF"
          >
            <FileText className="h-4 w-4" />
            PDF
          </Button>
          <Button
            size="sm"
            className="h-9 gap-1.5 px-3 font-semibold"
            style={selectedEmployee ? { backgroundColor: '#005F8F', color: '#fff' } : undefined}
            variant={selectedEmployee ? 'default' : 'outline'}
            onClick={() => void handleExportExcel()}
            disabled={!selectedEmployee}
            title="Exportar producción en Excel"
          >
            <Download className="h-4 w-4" />
            Excel
          </Button>
        </div>
        <div className="w-full text-xs text-muted md:w-auto md:pb-2">Rango: {rangeDays} dias</div>
      </SighFilterPanel>

      <Card className="border-border/70">
        <CardHeader className="border-b border-border/60 pb-3">
          <div className="flex flex-wrap items-start justify-between gap-2">
            <CardTitle className="text-sm">Produccion por actividad</CardTitle>
            {selectedEmployee ? (
              <div className="text-[11px] text-left text-muted leading-snug sm:text-right">
                <span className="font-semibold text-[#123B63]">{selectedEmployee.empleado}</span>
                {' · '}
                <span>{selectedEmployee.especialidad}</span>
                {' · '}
                <span>{filters.fechaInicio} al {filters.fechaFin}</span>
              </div>
            ) : null}
          </div>
        </CardHeader>
        <CardContent className="pt-4">
          <p className="mb-2 text-[11px] text-muted sm:hidden">Desliza la tabla para revisar dias y totales.</p>
          <div className="overflow-x-auto rounded-md border border-border/70">
            <table className="min-w-[760px] border-collapse text-[11px] sm:text-[12px]">
              <thead>
                <tr className="bg-[#123B63] text-white">
                  <th className="border-b border-white/15 px-2 py-1.5 text-center text-[11px] font-semibold uppercase tracking-wide">Codigo</th>
                  <th className="border-b border-white/15 px-2 py-1.5 text-left text-[11px] font-semibold uppercase tracking-wide">Actividad</th>
                  {days.map((day) => (
                    <th key={day} className="border-b border-white/15 px-2 py-1.5 text-center text-[11px] font-semibold uppercase">
                      {day}
                    </th>
                  ))}
                  <th className="border-b border-white/15 px-2 py-1.5 text-center text-[11px] font-semibold uppercase tracking-wide">Total</th>
                  <th className="border-b border-white/15 px-2 py-1.5 text-center text-[11px] font-semibold uppercase tracking-wide">Detalle</th>
                </tr>
              </thead>
              <tbody>
                {report?.rows.length ? (
                  report.rows.map((row, rowIndex) => {
                    const rowTotal = days.reduce((accumulator, day) => accumulator + resolveRowNumber(row, String(day)), 0)
                    return (
                      <tr key={`${rowIndex}-${rowTotal}`} className="odd:bg-white even:bg-[#f8fbff]">
                        <td className="border-b border-border/70 px-2 py-1 text-center">
                          {resolveRowText(row, 'ORD', ['ord', 'COD_ACT', 'cod_act']) || '-'}
                        </td>
                        <td className="border-b border-border/70 px-2 py-1">
                          {resolveRowText(row, 'TIPOACTIVIDAD', ['tipoactividad']) || '-'}
                        </td>
                        {days.map((day) => {
                          const value = resolveRowNumber(row, String(day))
                          return (
                            <td key={`${rowIndex}-${day}`} className="border-b border-border/70 px-2 py-1 text-center">
                              {value > 0 ? value : '-'}
                            </td>
                          )
                        })}
                        <td className="border-b border-border/70 bg-[#f2f7fc] px-2 py-1 text-center font-semibold">
                          {rowTotal}
                        </td>
                        <td className="border-b border-border/70 px-2 py-1 text-center">
                          <Button size="sm" variant="ghost" className="h-7 px-2 text-[11px]" onClick={() => void handleOpenDetail(row)}>
                            <Search className="h-3.5 w-3.5" />
                            Ver
                          </Button>
                        </td>
                      </tr>
                    )
                  })
                ) : (
                  <tr>
                    <td colSpan={days.length + 4} className="px-3 py-5 text-center text-xs text-muted">
                      {loading ? 'Procesando reporte...' : 'No se encuentran registros.'}
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>

      <Dialog open={isDetailOpen} onOpenChange={setIsDetailOpen}>
        <DialogContent className="w-[min(95vw,1100px)] max-w-none">
          <DialogHeader>
            <DialogTitle>Detalle de actividad: {detailTitle || '-'}</DialogTitle>
          </DialogHeader>
          {selectedEmployee ? (
            <div className="rounded-md border border-[#d1dbe7] bg-[#f3f8fd] px-3 py-2 text-[12px]">
              <div className="flex flex-wrap gap-x-6 gap-y-1">
                <span>
                  <span className="font-semibold text-[#123B63]">Profesional:</span>{' '}
                  <span className="text-text">{selectedEmployee.empleado}</span>
                </span>
                <span>
                  <span className="font-semibold text-[#123B63]">Especialidad:</span>{' '}
                  <span className="text-text">{selectedEmployee.especialidad}</span>
                </span>
                <span>
                  <span className="font-semibold text-[#123B63]">Periodo:</span>{' '}
                  <span className="text-text">{filters.fechaInicio} al {filters.fechaFin}</span>
                </span>
              </div>
            </div>
          ) : null}
          <SighTable
            rows={detailRows}
            columns={detailColumns}
            emptyMessage={loadingDetail ? 'Cargando detalle...' : 'No se encontraron registros para esta actividad.'}
          />
        </DialogContent>
      </Dialog>
    </SighPageShell>
  )
}

