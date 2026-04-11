import { BedDouble } from 'lucide-react'
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
import { bedFilters, bedRows, bedSeries, weeklyCategories } from '@/lib/mock-data'
import { buildInitialFilterState } from '@/lib/utils'
import type { WorkspaceKey } from '@/types/auth'

type BedRow = (typeof bedRows)[number]

interface CamasCovidPageProps {
  workspace: WorkspaceKey
}

export function CamasCovidPage({ workspace }: CamasCovidPageProps) {
  const [filters, setFilters] = useState(buildInitialFilterState(bedFilters))
  const [selected, setSelected] = useState<BedRow | null>(null)
  const { item } = useActiveNavigationItem()

  const columns: ColumnDef<BedRow>[] = [
    { accessorKey: 'area', header: 'Area' },
    { accessorKey: 'disponibles', header: 'Disponibles' },
    { accessorKey: 'ocupadas', header: 'Ocupadas' },
    { accessorKey: 'aislamiento', header: 'Aislamiento' },
    { accessorKey: 'traslados', header: 'Traslados' },
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
        eyebrow={workspaceMeta[workspace].shortLabel}
        title={item?.label ?? 'Gestion de Camas'}
        description={item?.description ?? 'Consulte ocupacion, disponibilidad, aislamiento y traslados por area.'}
        actions={
          <Button>
            <BedDouble className="h-4 w-4" />
            Actualizar corte
          </Button>
        }
        chart={<TrendChart categories={weeklyCategories} series={bedSeries} subtitle="Ultimos siete cortes" title="Capacidad monitoreada" />}
        filters={
          <FilterBar
            fields={bedFilters}
            onChange={(field, value) => setFilters((current) => ({ ...current, [field]: value }))}
            onReset={() => setFilters(buildInitialFilterState(bedFilters))}
            summary="Filtre por unidad, turno, servicio y fecha."
            values={filters}
          />
        }
        sideContent={
          <Card>
            <CardHeader>
              <CardTitle>Consultas relacionadas</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3 text-sm leading-7 text-muted">
              <p>Disponibilidad por unidad, turno y servicio.</p>
              <p>Seguimiento de estancias, aislamientos y traslados.</p>
              <p>Resumenes y porcentajes de ocupacion por corte.</p>
            </CardContent>
          </Card>
        }
        table={<DataTable columns={columns} data={bedRows} description="" title="Consolidado por area" />}
      />
      <DetailModal
        description="Revise el detalle del area seleccionada."
        items={
          selected
            ? [
                { label: 'Area', value: selected.area },
                { label: 'Disponibles', value: String(selected.disponibles) },
                { label: 'Ocupadas', value: String(selected.ocupadas) },
                { label: 'Aislamiento', value: String(selected.aislamiento) },
                { label: 'Traslados', value: String(selected.traslados) },
                { label: 'Observacion', value: selected.detalle },
              ]
            : []
        }
        onOpenChange={(open) => !open && setSelected(null)}
        open={Boolean(selected)}
        title={selected ? selected.area : 'Detalle'}
      />
    </>
  )
}
