import { Hospital } from 'lucide-react'
import { useState } from 'react'
import type { ColumnDef } from '@tanstack/react-table'
import { TrendChart } from '@/components/charts/trend-chart'
import { DataTable } from '@/components/data-display/data-table'
import { DetailModal } from '@/components/data-display/detail-modal'
import { AnalyticsReportLayout } from '@/components/data-display/report-layouts'
import { FilterBar } from '@/components/filters/filter-bar'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { workspaceMeta } from '@/config/module-registry'
import { useActiveNavigationItem } from '@/hooks/use-active-navigation-item'
import { buildInitialFilterState } from '@/lib/utils'
import { hospitalFilters, hospitalRows, hospitalSeries, weeklyCategories } from '@/lib/mock-data'

type HospitalRow = (typeof hospitalRows)[number]

export function ProduccionHospitalariaPage() {
  const [filters, setFilters] = useState(buildInitialFilterState(hospitalFilters))
  const [selected, setSelected] = useState<HospitalRow | null>(null)
  const { item } = useActiveNavigationItem()

  const columns: ColumnDef<HospitalRow>[] = [
    { accessorKey: 'servicio', header: 'Servicio' },
    { accessorKey: 'egresos', header: 'Egresos' },
    { accessorKey: 'estancia', header: 'Estancia promedio' },
    { accessorKey: 'ocupacion', header: 'Ocupacion' },
    { accessorKey: 'observacion', header: 'Observacion' },
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
        eyebrow={workspaceMeta.main.shortLabel}
        title={item?.label ?? 'Hospitalizacion'}
        description={item?.description ?? 'Consulte egresos, estancia y ocupacion por servicio.'}
        actions={
          <Button>
            <Hospital className="h-4 w-4" />
            Descargar consolidado
          </Button>
        }
        chart={
          <TrendChart
            categories={weeklyCategories}
            series={hospitalSeries}
            subtitle="Ultimos siete cortes"
            title="Egresos y estancia"
          />
        }
        filters={
          <FilterBar
            fields={hospitalFilters}
            onChange={(field, value) => setFilters((current) => ({ ...current, [field]: value }))}
            onReset={() => setFilters(buildInitialFilterState(hospitalFilters))}
            summary="Filtre por servicio, periodo, sede y fecha."
            values={filters}
          />
        }
        sideContent={
          <Card>
            <CardHeader>
              <CardTitle>Consultas relacionadas</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3 text-sm leading-7 text-muted">
              <p>Produccion diaria por servicio.</p>
              <p>Comparativos por servicio y periodo.</p>
              <p>Seguimiento de estancia y ocupacion.</p>
            </CardContent>
          </Card>
        }
        table={<DataTable columns={columns} data={hospitalRows} description="" title="Consolidado por servicio" />}
      />
      <DetailModal
        description="Revise el detalle del servicio seleccionado."
        items={
          selected
            ? [
                { label: 'Servicio', value: selected.servicio },
                { label: 'Egresos', value: String(selected.egresos) },
                { label: 'Estancia promedio', value: selected.estancia },
                { label: 'Ocupacion', value: selected.ocupacion },
                { label: 'Observacion', value: selected.observacion },
              ]
            : []
        }
        onOpenChange={(open) => !open && setSelected(null)}
        open={Boolean(selected)}
        title={selected ? selected.servicio : 'Detalle'}
      />
    </>
  )
}
