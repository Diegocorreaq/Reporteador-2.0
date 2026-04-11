import { BarChart3 } from 'lucide-react'
import { useState } from 'react'
import type { ColumnDef } from '@tanstack/react-table'
import { TrendChart } from '@/components/charts/trend-chart'
import { DataTable } from '@/components/data-display/data-table'
import { DetailModal } from '@/components/data-display/detail-modal'
import { AnalyticsReportLayout } from '@/components/data-display/report-layouts'
import { FilterBar } from '@/components/filters/filter-bar'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { useActiveNavigationItem } from '@/hooks/use-active-navigation-item'
import { buildInitialFilterState } from '@/lib/utils'
import { indicatorsFilters, indicatorsRows, indicatorsSeries, weeklyCategories } from '@/lib/mock-data'

type IndicatorRow = (typeof indicatorsRows)[number]

export function IndicadoresPage() {
  const [filters, setFilters] = useState(buildInitialFilterState(indicatorsFilters))
  const [selected, setSelected] = useState<IndicatorRow | null>(null)
  const { item } = useActiveNavigationItem()

  const columns: ColumnDef<IndicatorRow>[] = [
    { accessorKey: 'indicador', header: 'Indicador' },
    { accessorKey: 'valor', header: 'Valor' },
    { accessorKey: 'meta', header: 'Meta' },
    { accessorKey: 'tendencia', header: 'Tendencia' },
    { accessorKey: 'corte', header: 'Corte' },
    {
      id: 'acciones',
      header: 'Acciones',
      cell: ({ row }) => (
        <Button size="sm" variant="ghost" onClick={() => setSelected(row.original)}>
          Ver detalle
        </Button>
      ),
    },
  ]

  return (
    <>
      <AnalyticsReportLayout
        eyebrow="Indicadores hospitalarios"
        title={item?.label ?? 'Indicadores Hospitalarios'}
        description={item?.description ?? 'Consulte valores, metas y tendencia de los indicadores institucionales.'}
        actions={
          <Button>
            <BarChart3 className="h-4 w-4" />
            Descargar tablero
          </Button>
        }
        chart={
          <TrendChart
            categories={weeklyCategories}
            series={indicatorsSeries}
            subtitle="Últimos siete cortes"
            title="Valor actual vs meta"
          />
        }
        filters={
          <FilterBar
            fields={indicatorsFilters}
            onChange={(field, value) => setFilters((current) => ({ ...current, [field]: value }))}
            onReset={() => setFilters(buildInitialFilterState(indicatorsFilters))}
            summary="Filtre por indicador, corte, servicio y fecha."
            values={filters}
          />
        }
        sideContent={
          <Card>
            <CardHeader>
              <CardTitle>Consultas relacionadas</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3 text-sm leading-7 text-muted">
              <p>Series históricas por indicador y meta.</p>
              <p>Comparativos por periodo o servicio.</p>
              <p>Revisión detallada por corte.</p>
            </CardContent>
          </Card>
        }
        table={
          <DataTable columns={columns} data={indicatorsRows} description="" title="Indicadores consolidados" />
        }
      />
      <DetailModal
        description="Revise el detalle del indicador seleccionado."
        items={
          selected
            ? [
                { label: 'Indicador', value: selected.indicador },
                { label: 'Valor', value: selected.valor },
                { label: 'Meta', value: selected.meta },
                { label: 'Tendencia', value: selected.tendencia },
                { label: 'Corte', value: selected.corte },
              ]
            : []
        }
        onOpenChange={(open) => !open && setSelected(null)}
        open={Boolean(selected)}
        title={selected ? selected.indicador : 'Detalle'}
      />
    </>
  )
}
