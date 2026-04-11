import { useCallback, useEffect, useState } from 'react'
import { AlertCircle } from 'lucide-react'
import { LoadingState } from '@/components/feedback/loading-state'
import { PageHeader } from '@/components/data-display/page-header'
import { Alert } from '@/components/ui/alert'
import { workspaceMeta } from '@/config/module-registry'
import { useActiveNavigationItem } from '@/hooks/use-active-navigation-item'
import { CentroObstetricoFilters } from '@/modules/centro-obstetrico/components/centro-obstetrico-filters'
import { CentroObstetricoLastUpdated } from '@/modules/centro-obstetrico/components/centro-obstetrico-last-updated'
import { CentroObstetricoSummaryTable } from '@/modules/centro-obstetrico/components/centro-obstetrico-summary-table'
import { MetricLineChart } from '@/modules/centro-obstetrico/components/metric-line-chart'
import { MetricPanel } from '@/modules/centro-obstetrico/components/metric-panel'
import { MetricPivotTable, type MetricTableColumn } from '@/modules/centro-obstetrico/components/metric-pivot-table'
import { fetchCentroObstetricoPage } from '@/modules/centro-obstetrico/services/centro-obstetrico.service'
import type {
  CentroObstetricoFilters as CentroObstetricoFiltersValue,
  CentroObstetricoPagePayload,
  OcupacionRow,
  OcupacionTotals,
  PermanenciaRow,
  PermanenciaTotals,
  RendimientoRow,
  RendimientoTotals,
  SustitucionRow,
  SustitucionTotals,
} from '@/modules/centro-obstetrico/types'
import {
  buildDefaultCentroObstetricoFilters,
  formatDecimal,
  formatInteger,
} from '@/modules/centro-obstetrico/utils'

const permanenciaColumns: MetricTableColumn<PermanenciaRow, PermanenciaTotals>[] = [
  {
    key: 'anio',
    header: 'Año',
    cell: (row) => row.anio,
    total: () => 'Total',
  },
  {
    key: 'mes',
    header: 'Mes',
    cell: (row) => row.mesLabel,
    total: () => '',
  },
  {
    key: 'estancia',
    header: 'Total dias de Estancia',
    align: 'right',
    cell: (row) => formatInteger(row.totalDiasEstancia),
    total: (totals) => formatInteger(totals.totalDiasEstancia),
  },
  {
    key: 'egresos',
    header: 'Nro. de egreso Hospitalarios',
    align: 'right',
    cell: (row) => formatInteger(row.nroEgresosHospitalarios),
    total: (totals) => formatInteger(totals.nroEgresosHospitalarios),
  },
  {
    key: 'indicador',
    header: 'Indicador',
    align: 'right',
    cell: (row) => formatDecimal(row.indicador),
    total: (totals) => formatDecimal(totals.indicador),
  },
]

const sustitucionColumns: MetricTableColumn<SustitucionRow, SustitucionTotals>[] = [
  {
    key: 'anio',
    header: 'Año',
    cell: (row) => row.anio,
    total: () => 'Total',
  },
  {
    key: 'mes',
    header: 'Mes',
    cell: (row) => row.mesLabel,
    total: () => '',
  },
  {
    key: 'diferencia',
    header: 'N° camas dia - N° paciente dia',
    align: 'right',
    cell: (row) => formatInteger(row.camasDiaMenosPacienteDia),
    total: (totals) => formatInteger(totals.camasDiaMenosPacienteDia),
  },
  {
    key: 'egresos',
    header: 'Numero de egresos hospitalarios',
    align: 'right',
    cell: (row) => formatInteger(row.nroEgresosHospitalarios),
    total: (totals) => formatInteger(totals.nroEgresosHospitalarios),
  },
  {
    key: 'indicador',
    header: 'Indicador',
    align: 'right',
    cell: (row) => formatDecimal(row.indicador),
    total: (totals) => formatDecimal(totals.indicador),
  },
  {
    key: 'horas',
    header: 'Nro Horas',
    align: 'right',
    cell: (row) => formatDecimal(row.nroHoras),
    total: (totals) => formatDecimal(totals.nroHoras),
  },
]

const ocupacionColumns: MetricTableColumn<OcupacionRow, OcupacionTotals>[] = [
  {
    key: 'anio',
    header: 'Año',
    cell: (row) => row.anio,
    total: () => 'Total',
  },
  {
    key: 'mes',
    header: 'Mes',
    cell: (row) => row.mesLabel,
    total: () => '',
  },
  {
    key: 'paciente-dia',
    header: 'N° de paciente dia',
    align: 'right',
    cell: (row) => formatInteger(row.pacienteDia),
    total: (totals) => formatInteger(totals.pacienteDia),
  },
  {
    key: 'cama-dia',
    header: 'N° dias cama disponible',
    align: 'right',
    cell: (row) => formatInteger(row.diasCamaDisponible),
    total: (totals) => formatInteger(totals.diasCamaDisponible),
  },
  {
    key: 'indicador',
    header: 'Indicador',
    align: 'right',
    cell: (row) => `${formatDecimal(row.indicador)}%`,
    total: (totals) => `${formatDecimal(totals.indicador)}%`,
  },
]

const rendimientoColumns: MetricTableColumn<RendimientoRow, RendimientoTotals>[] = [
  {
    key: 'anio',
    header: 'Año',
    cell: (row) => row.anio,
    total: () => 'Total',
  },
  {
    key: 'mes',
    header: 'Mes',
    cell: (row) => row.mesLabel,
    total: () => '',
  },
  {
    key: 'egresos',
    header: 'N° de egresos hospitalarios',
    align: 'right',
    cell: (row) => formatInteger(row.nroEgresosHospitalarios),
    total: (totals) => formatInteger(totals.nroEgresosHospitalarios),
  },
  {
    key: 'camas',
    header: 'N° de camas disponibles',
    align: 'right',
    cell: (row) => formatDecimal(row.nroCamasDisponibles),
    total: (totals) => formatDecimal(totals.nroCamasDisponibles),
  },
  {
    key: 'indicador',
    header: 'Indicador',
    align: 'right',
    cell: (row) => formatDecimal(row.indicador),
    total: (totals) => formatDecimal(totals.indicador),
  },
]

function isInvalidRange(filters: CentroObstetricoFiltersValue) {
  return filters.fechaInicio > filters.fechaFin
}

const DEFAULT_FILTERS = buildDefaultCentroObstetricoFilters()

export function CentroObstetricoPage() {
  const { item } = useActiveNavigationItem()
  const [draftFilters, setDraftFilters] = useState<CentroObstetricoFiltersValue>(DEFAULT_FILTERS)
  const [dashboard, setDashboard] = useState<CentroObstetricoPagePayload | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const loadDashboard = useCallback(async (nextFilters: CentroObstetricoFiltersValue) => {
    setIsLoading(true)
    setError(null)

    try {
      const nextDashboard = await fetchCentroObstetricoPage(nextFilters)
      setDashboard(nextDashboard)
    } catch (loadError) {
      const message = loadError instanceof Error ? loadError.message : 'No se pudo cargar el dashboard.'
      setError(message)
    } finally {
      setIsLoading(false)
    }
  }, [])

  useEffect(() => {
    void loadDashboard(DEFAULT_FILTERS)
  }, [loadDashboard])

  const handleApplyFilters = () => {
    if (isInvalidRange(draftFilters)) {
      setError('El rango de fechas no es valido. Revise las fechas ingresadas.')
      return
    }

    void loadDashboard(draftFilters)
  }

  const handleResetFilters = () => {
    const nextFilters = buildDefaultCentroObstetricoFilters(dashboard?.lastUpdated)
    setDraftFilters(nextFilters)
    void loadDashboard(nextFilters)
  }

  return (
    <section className="space-y-4">
      <PageHeader eyebrow={workspaceMeta.main.shortLabel} title={item?.label ?? 'Centro Obstetrico'} />

      <div className="grid gap-3 xl:grid-cols-[minmax(0,1fr)_248px]">
        <CentroObstetricoFilters
          values={draftFilters}
          onChange={(field, value) => setDraftFilters((current) => ({ ...current, [field]: value }))}
          onSubmit={handleApplyFilters}
          onReset={handleResetFilters}
          isLoading={isLoading}
        />
        <CentroObstetricoLastUpdated value={dashboard?.lastUpdated ?? '2026-04-09'} />
      </div>

      {error ? (
        <Alert className="flex items-start gap-2">
          <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
          <span>{error}</span>
        </Alert>
      ) : null}

      {isLoading && !dashboard ? (
        <LoadingState />
      ) : dashboard ? (
        <>
          <CentroObstetricoSummaryTable
            title={dashboard.summary.title}
            rows={dashboard.summary.rows}
            totals={dashboard.summary.totals}
          />

          <MetricPanel
            title={dashboard.panels.permanencia.title}
            note={dashboard.panels.permanencia.note}
            table={
              <MetricPivotTable
                rows={dashboard.panels.permanencia.tableRows}
                totals={dashboard.panels.permanencia.totals}
                columns={permanenciaColumns}
              />
            }
            chart={<MetricLineChart data={dashboard.panels.permanencia.chart} />}
          />

          <MetricPanel
            title={dashboard.panels.sustitucion.title}
            note={dashboard.panels.sustitucion.note}
            table={
              <MetricPivotTable
                rows={dashboard.panels.sustitucion.tableRows}
                totals={dashboard.panels.sustitucion.totals}
                columns={sustitucionColumns}
              />
            }
            chart={<MetricLineChart data={dashboard.panels.sustitucion.chart} />}
          />

          <MetricPanel
            title={dashboard.panels.ocupacion.title}
            note={dashboard.panels.ocupacion.note}
            table={
              <MetricPivotTable
                rows={dashboard.panels.ocupacion.tableRows}
                totals={dashboard.panels.ocupacion.totals}
                columns={ocupacionColumns}
              />
            }
            chart={<MetricLineChart data={dashboard.panels.ocupacion.chart} isPercentage />}
          />

          <MetricPanel
            title={dashboard.panels.rendimiento.title}
            note={dashboard.panels.rendimiento.note}
            table={
              <MetricPivotTable
                rows={dashboard.panels.rendimiento.tableRows}
                totals={dashboard.panels.rendimiento.totals}
                columns={rendimientoColumns}
              />
            }
            chart={<MetricLineChart data={dashboard.panels.rendimiento.chart} />}
          />
        </>
      ) : null}
    </section>
  )
}
