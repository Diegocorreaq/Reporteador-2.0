import { useCallback, useEffect, useMemo, useState } from 'react'
import ReactECharts from 'echarts-for-react'
import { AlertCircle } from 'lucide-react'
import { EmptyState } from '@/components/feedback/empty-state'
import { LoadingState } from '@/components/feedback/loading-state'
import { PageHeader } from '@/components/data-display/page-header'
import { Alert } from '@/components/ui/alert'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Select } from '@/components/ui/select'
import { workspaceMeta } from '@/config/module-registry'
import { useActiveNavigationItem } from '@/hooks/use-active-navigation-item'
import {
  buildDefaultCriticalCareFilters,
  fetchCriticalCareReport,
  type CriticalCareModule,
} from '@/modules/critical-care/services/critical-care.service'
import type {
  CriticalCareFilters,
  CriticalCarePriorityDetail,
  CriticalCareReportResponse,
  CriticalCareSection,
} from '@/modules/critical-care/types'

const MONTH_KEYS = ['ene', 'feb', 'mar', 'abr', 'may', 'jun', 'jul', 'agt', 'sep', 'oct', 'nov', 'dic']
const MONTH_LABELS = ['Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun', 'Jul', 'Agt', 'Sep', 'Oct', 'Nov', 'Dic']

function normalizeKey(value: string) {
  return value.toLowerCase().replaceAll('ñ', 'n')
}

function toNumeric(value: unknown) {
  if (typeof value === 'number') {
    return Number.isFinite(value) ? value : 0
  }

  const parsed = Number(value)
  return Number.isFinite(parsed) ? parsed : 0
}

function getValueByKey(row: Record<string, unknown>, expectedKey: string) {
  const direct = row[expectedKey]
  if (direct !== undefined) {
    return direct
  }

  const normalizedExpected = normalizeKey(expectedKey)
  const foundEntry = Object.entries(row).find(([key]) => normalizeKey(key) === normalizedExpected)
  return foundEntry?.[1]
}

function hasMonthlyColumns(rows: Array<Record<string, unknown>>) {
  if (!rows.length) {
    return false
  }

  return MONTH_KEYS.some((monthKey) => getValueByKey(rows[0], monthKey) !== undefined)
}

function inferRowLabel(row: Record<string, unknown>) {
  const preferredKeys = ['tipo', 'prioridad', 'servicio', 'especialidad', 'motivo', 'opcion', 'codigo', 'mes', 'nmes', 'nmess']

  for (const preferredKey of preferredKeys) {
    const value = getValueByKey(row, preferredKey)
    if (value !== undefined && value !== null && String(value).trim().length > 0) {
      return String(value)
    }
  }

  const generic = Object.values(row).find(
    (value) => typeof value === 'string' && value.trim().length > 0 && Number.isNaN(Number(value)),
  )

  return generic ? String(generic) : 'Serie'
}

function toRenderableValue(value: unknown) {
  if (value === undefined || value === null || value === '') {
    return '-'
  }

  if (typeof value === 'number') {
    return Number.isInteger(value) ? value.toString() : value.toFixed(2)
  }

  return String(value)
}

function SectionChart({ section }: { section: CriticalCareSection }) {
  const rows = section.rows.slice(0, 8)
  const chartSeries = rows.map((row) => ({
    name: inferRowLabel(row),
    type: 'line',
    smooth: true,
    data: MONTH_KEYS.map((monthKey) => toNumeric(getValueByKey(row, monthKey))),
  }))

  return (
    <ReactECharts
      style={{ height: 280 }}
      option={{
        animationDuration: 350,
        tooltip: { trigger: 'axis' },
        legend: {
          type: 'scroll',
          bottom: 0,
        },
        grid: { top: 28, left: 16, right: 12, bottom: 58, containLabel: true },
        xAxis: {
          type: 'category',
          data: MONTH_LABELS,
        },
        yAxis: {
          type: 'value',
        },
        series: chartSeries,
      }}
    />
  )
}

function GenericTable({ rows }: { rows: Array<Record<string, unknown>> }) {
  if (!rows.length) {
    return (
      <div className="py-6">
        <EmptyState title="Sin datos" description="No se encontraron registros para esta seccion." />
      </div>
    )
  }

  const columns = Object.keys(rows[0])

  return (
    <div className="overflow-x-auto">
      <table className="min-w-full border-collapse text-sm">
        <thead>
          <tr className="bg-canvas">
            {columns.map((column) => (
              <th key={column} className="border-b border-border px-3 py-2 text-left text-xs font-semibold uppercase text-muted">
                {column}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((row, index) => (
            <tr key={`${index}-${JSON.stringify(row).slice(0, 40)}`} className={index % 2 === 0 ? 'bg-white' : 'bg-canvas/40'}>
              {columns.map((column) => (
                <td key={`${index}-${column}`} className="border-b border-border px-3 py-2 align-top">
                  {toRenderableValue(row[column])}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}

function PriorityDetailDialog({
  open,
  onOpenChange,
  details,
}: {
  open: boolean
  onOpenChange: (value: boolean) => void
  details: CriticalCarePriorityDetail[]
}) {
  const [selectedPriority, setSelectedPriority] = useState('')

  useEffect(() => {
    if (details.length && !selectedPriority) {
      setSelectedPriority(details[0].prioridad)
    }
  }, [details, selectedPriority])

  const selected = useMemo(
    () => details.find((item) => item.prioridad === selectedPriority) ?? details[0],
    [details, selectedPriority],
  )

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="w-[min(96vw,1100px)]">
        <DialogHeader>
          <DialogTitle>Detalle de prioridad</DialogTitle>
          <DialogDescription>
            Revise el detalle de motivos y el detalle operativo para la prioridad seleccionada.
          </DialogDescription>
        </DialogHeader>
        {!details.length ? (
          <EmptyState title="Sin detalle" description="No existe detalle de prioridad para los filtros aplicados." />
        ) : (
          <div className="space-y-4">
            <div className="max-w-xs">
              <label className="mb-1 block text-xs font-semibold text-muted" htmlFor="priority-select">
                Prioridad
              </label>
              <Select id="priority-select" value={selected?.prioridad ?? ''} onChange={(event) => setSelectedPriority(event.target.value)}>
                {details.map((item) => (
                  <option key={item.prioridad} value={item.prioridad}>
                    {item.prioridad}
                  </option>
                ))}
              </Select>
            </div>
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-base">Detalle por motivo</CardTitle>
              </CardHeader>
              <CardContent>
                <GenericTable rows={selected?.detalle ?? []} />
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-base">Detalle operativo</CardTitle>
              </CardHeader>
              <CardContent>
                <GenericTable rows={selected?.detalleOperativo ?? []} />
              </CardContent>
            </Card>
          </div>
        )}
      </DialogContent>
    </Dialog>
  )
}

interface CriticalCareReportPageProps {
  module: CriticalCareModule
}

export function CriticalCareReportPage({ module }: CriticalCareReportPageProps) {
  const { item } = useActiveNavigationItem()
  const [filters, setFilters] = useState<CriticalCareFilters>(buildDefaultCriticalCareFilters())
  const [report, setReport] = useState<CriticalCareReportResponse | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [isPriorityDialogOpen, setIsPriorityDialogOpen] = useState(false)

  const loadReport = useCallback(async (nextFilters: CriticalCareFilters) => {
    setIsLoading(true)
    setError(null)
    try {
      const data = await fetchCriticalCareReport(module, nextFilters)
      setReport(data)
    } catch (loadError) {
      const message = loadError instanceof Error ? loadError.message : 'No se pudo obtener el reporte.'
      setError(message)
    } finally {
      setIsLoading(false)
    }
  }, [module])

  useEffect(() => {
    void loadReport(filters)
  }, [filters, loadReport])

  const sections = useMemo(() => {
    if (!report) {
      return []
    }

    return Object.values(report.sections)
  }, [report])

  const handleSubmit = () => {
    if (filters.fechaInicio > filters.fechaFin) {
      setError('La fecha de inicio no puede ser mayor que la fecha fin.')
      return
    }

    void loadReport(filters)
  }

  return (
    <section className="space-y-4">
      <PageHeader
        eyebrow={workspaceMeta.main.shortLabel}
        title={item?.label ?? (module === 'ucca' ? 'Indicadores UCCA (Adulto)' : 'Indicadores UCCP (Pediatrico)')}
        description="Panel analitico migrado desde legacy con tablas, graficos y detalle de prioridad."
        actions={
          <Button variant="outline" onClick={() => setIsPriorityDialogOpen(true)} disabled={!report?.detailPrioridad.length}>
            Ver detalle de prioridad
          </Button>
        }
      />

      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base">Filtros</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-[1fr_1fr_auto]">
            <div>
              <label className="mb-1 block text-xs font-semibold text-muted" htmlFor="fecha-inicio">
                Desde
              </label>
              <Input
                id="fecha-inicio"
                type="date"
                value={filters.fechaInicio}
                onChange={(event) => setFilters((current) => ({ ...current, fechaInicio: event.target.value }))}
              />
            </div>
            <div>
              <label className="mb-1 block text-xs font-semibold text-muted" htmlFor="fecha-fin">
                Hasta
              </label>
              <Input
                id="fecha-fin"
                type="date"
                value={filters.fechaFin}
                onChange={(event) => setFilters((current) => ({ ...current, fechaFin: event.target.value }))}
              />
            </div>
            <div className="flex items-end">
              <Button className="w-full" onClick={handleSubmit} disabled={isLoading}>
                Procesar
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {error ? (
        <Alert className="flex items-center gap-2">
          <AlertCircle className="h-4 w-4" />
          <span>{error}</span>
        </Alert>
      ) : null}

      {isLoading && !report ? (
        <LoadingState />
      ) : sections.length ? (
        sections.map((section) => (
          <Card key={section.key}>
            <CardHeader className="pb-3">
              <CardTitle className="text-base">{section.title}</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {hasMonthlyColumns(section.rows) ? <SectionChart section={section} /> : null}
              <GenericTable rows={section.rows} />
            </CardContent>
          </Card>
        ))
      ) : (
        <EmptyState
          title="Sin resultados"
          description="No se encontraron indicadores para el rango de fechas seleccionado."
        />
      )}

      <PriorityDetailDialog
        open={isPriorityDialogOpen}
        onOpenChange={setIsPriorityDialogOpen}
        details={report?.detailPrioridad ?? []}
      />
    </section>
  )
}
