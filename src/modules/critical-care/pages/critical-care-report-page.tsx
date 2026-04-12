import { useCallback, useEffect, useMemo, useState } from 'react'
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
import { CriticalCareChartBlock } from '@/modules/critical-care/components/critical-care-chart-block'
import { CriticalCareModuleCard } from '@/modules/critical-care/components/critical-care-module-card'
import { CriticalCareTableBlock } from '@/modules/critical-care/components/critical-care-table-block'
import { normalizeKeyToken } from '@/modules/critical-care/components/critical-care-utils'
import { UCCA_LAYOUT } from '@/modules/critical-care/config/ucca-layout'
import { UCCP_LAYOUT } from '@/modules/critical-care/config/uccp-layout'
import {
  buildDefaultCriticalCareFilters,
  fetchCriticalCareReport,
} from '@/modules/critical-care/services/critical-care.service'
import type {
  CriticalCareFilters,
  CriticalCareModule,
  CriticalCarePriorityDetail,
  CriticalCareReportResponse,
} from '@/modules/critical-care/types'

interface DetailTableProps {
  rows: Array<Record<string, unknown>>
  emptyMessage: string
}

function toDisplayValue(value: unknown) {
  if (value === null || value === undefined || value === '') {
    return '-'
  }

  if (typeof value === 'number') {
    return Number.isInteger(value) ? value.toString() : value.toFixed(1)
  }

  return String(value)
}

function DetailTable({ rows, emptyMessage }: DetailTableProps) {
  if (!rows.length) {
    return (
      <div className="rounded-md border border-border/60 bg-white px-3 py-5 text-center text-xs text-muted">
        {emptyMessage}
      </div>
    )
  }

  const columns = Object.keys(rows[0])

  return (
    <div className="overflow-x-auto rounded-md border border-border/70 bg-white">
      <table className="min-w-full border-collapse text-[11px]">
        <thead>
          <tr className="bg-[#eef5fb] text-[#123B63]">
            {columns.map((column) => (
              <th key={column} className="border-b border-border px-2 py-1 text-left font-semibold uppercase">
                {column}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((row, rowIndex) => (
            <tr key={`${rowIndex}-${JSON.stringify(row).slice(0, 24)}`} className="odd:bg-white even:bg-[#f8fbff]">
              {columns.map((column) => (
                <td key={`${rowIndex}-${column}`} className="border-b border-border/70 px-2 py-1">
                  {toDisplayValue(row[column])}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}

interface PriorityDetailDialogProps {
  open: boolean
  initialPriority: string
  details: CriticalCarePriorityDetail[]
  onOpenChange: (open: boolean) => void
}

function PriorityDetailDialog({
  open,
  initialPriority,
  details,
  onOpenChange,
}: PriorityDetailDialogProps) {
  const [selectedPriority, setSelectedPriority] = useState('')

  useEffect(() => {
    if (!open) {
      return
    }

    if (initialPriority && details.some((item) => item.prioridad === initialPriority)) {
      setSelectedPriority(initialPriority)
      return
    }

    setSelectedPriority(details[0]?.prioridad ?? '')
  }, [details, initialPriority, open])

  const selectedDetail = useMemo(
    () => details.find((item) => item.prioridad === selectedPriority) ?? details[0],
    [details, selectedPriority],
  )

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="w-[min(96vw,1180px)]">
        <DialogHeader>
          <DialogTitle>Detalle de prioridad</DialogTitle>
          <DialogDescription>
            Revise los detalles de motivos y opcion respondida para la prioridad seleccionada.
          </DialogDescription>
        </DialogHeader>
        {!details.length ? (
          <EmptyState title="Sin detalle" description="No existe detalle de prioridad para los filtros aplicados." />
        ) : (
          <div className="space-y-4">
            <div className="max-w-xs">
              <label className="mb-1 block text-xs font-semibold text-muted" htmlFor="priority-detail-select">
                Prioridad
              </label>
              <Select
                id="priority-detail-select"
                value={selectedDetail?.prioridad ?? ''}
                onChange={(event) => setSelectedPriority(event.target.value)}
              >
                {details.map((item) => (
                  <option key={item.prioridad} value={item.prioridad}>
                    {item.prioridad}
                  </option>
                ))}
              </Select>
            </div>
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-semibold">Motivos de Consulta</CardTitle>
              </CardHeader>
              <CardContent>
                <DetailTable rows={selectedDetail?.detalle ?? []} emptyMessage="No se encuentran registros" />
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-semibold">Opcion Respondida</CardTitle>
              </CardHeader>
              <CardContent>
                <DetailTable rows={selectedDetail?.detalleOperativo ?? []} emptyMessage="No se encuentran registros" />
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

const LAYOUT_BY_MODULE = {
  ucca: UCCA_LAYOUT,
  uccp: UCCP_LAYOUT,
} as const

function getRowsFromReport(report: CriticalCareReportResponse | null, key: string) {
  if (!report) {
    return []
  }

  const datasets = report.datasets ?? report.sections ?? {}
  const direct = datasets[key]
  if (direct) {
    return direct.rows ?? []
  }

  const normalizedKey = normalizeKeyToken(key)
  const fallbackEntry = Object.entries(datasets).find(([datasetKey]) => normalizeKeyToken(datasetKey) === normalizedKey)
  return fallbackEntry?.[1]?.rows ?? []
}

export function CriticalCareReportPage({ module }: CriticalCareReportPageProps) {
  const { item } = useActiveNavigationItem()
  const [filters, setFilters] = useState<CriticalCareFilters>(buildDefaultCriticalCareFilters())
  const [report, setReport] = useState<CriticalCareReportResponse | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [isPriorityDialogOpen, setIsPriorityDialogOpen] = useState(false)
  const [activePriority, setActivePriority] = useState('')

  const layout = LAYOUT_BY_MODULE[module]

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
  }, [loadReport])

  const handleSubmit = () => {
    if (filters.fechaInicio > filters.fechaFin) {
      setError('La fecha de inicio no puede ser mayor que la fecha fin.')
      return
    }

    void loadReport(filters)
  }

  const handlePriorityClick = (priority: string) => {
    setActivePriority(priority)
    setIsPriorityDialogOpen(true)
  }

  return (
    <section className="space-y-4">
      <PageHeader
        eyebrow={workspaceMeta.main.shortLabel}
        title={item?.label ?? (module === 'ucca' ? 'Indicadores UCCA (Adulto)' : 'Indicadores UCCP (Pediatrico)')}
        description="Panel analitico modernizado con estructura funcional de legacy por modulo, subtitulos y tablas internas."
        actions={
          <Button
            variant="outline"
            onClick={() => {
              setActivePriority('')
              setIsPriorityDialogOpen(true)
            }}
            disabled={!report?.detailPrioridad.length}
          >
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
      ) : report ? (
        layout.modules.map((layoutModule) => (
          <CriticalCareModuleCard
            key={layoutModule.id}
            numberLabel={layoutModule.numberLabel}
            title={layoutModule.title}
          >
            {layoutModule.blocks.map((block, blockIndex) => {
              if (block.kind === 'heading') {
                return (
                  <h4 key={`${layoutModule.id}-heading-${blockIndex}`} className="text-xs font-semibold text-[#1f4b6e]">
                    {block.text}
                  </h4>
                )
              }

              const rows = getRowsFromReport(report, block.datasetKey)
              if (block.kind === 'table') {
                return (
                  <CriticalCareTableBlock
                    key={`${layoutModule.id}-table-${block.datasetKey}-${blockIndex}`}
                    block={block}
                    rows={rows}
                    onPriorityClick={block.priorityClickable ? handlePriorityClick : undefined}
                  />
                )
              }

              return (
                <CriticalCareChartBlock
                  key={`${layoutModule.id}-chart-${block.datasetKey}-${blockIndex}`}
                  block={block}
                  rows={rows}
                />
              )
            })}
          </CriticalCareModuleCard>
        ))
      ) : (
        <EmptyState
          title="Sin resultados"
          description="No se encontraron indicadores para el rango de fechas seleccionado."
        />
      )}

      <PriorityDetailDialog
        open={isPriorityDialogOpen}
        initialPriority={activePriority}
        details={report?.detailPrioridad ?? []}
        onOpenChange={setIsPriorityDialogOpen}
      />
    </section>
  )
}
