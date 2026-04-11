import { UsersRound } from 'lucide-react'
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
import { professionalFilters, professionalRows, professionalSeries, weeklyCategories } from '@/lib/mock-data'
import type { WorkspaceKey } from '@/types/auth'

type ProfessionalRow = (typeof professionalRows)[number]

interface ProdProfesionalPageProps {
  workspace: WorkspaceKey
}

export function ProdProfesionalPage({ workspace }: ProdProfesionalPageProps) {
  const [filters, setFilters] = useState(buildInitialFilterState(professionalFilters))
  const [selected, setSelected] = useState<ProfessionalRow | null>(null)
  const { item } = useActiveNavigationItem()

  const columns: ColumnDef<ProfessionalRow>[] = [
    { accessorKey: 'profesional', header: 'Profesional' },
    { accessorKey: 'especialidad', header: 'Especialidad' },
    { accessorKey: 'atenciones', header: 'Atenciones' },
    { accessorKey: 'rendimiento', header: 'Rendimiento' },
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
        eyebrow={workspaceMeta[workspace].shortLabel}
        title={item?.label ?? 'Produccion de Actividades'}
        description={item?.description ?? 'Consulte atenciones, rendimiento y observaciones por profesional.'}
        actions={
          <Button>
            <UsersRound className="h-4 w-4" />
            Exportar ranking
          </Button>
        }
        chart={
          <TrendChart
            categories={weeklyCategories}
            series={professionalSeries}
            subtitle="Ultimos siete cortes"
            title="Atenciones y rendimiento"
          />
        }
        filters={
          <FilterBar
            fields={professionalFilters}
            onChange={(field, value) => setFilters((current) => ({ ...current, [field]: value }))}
            onReset={() => setFilters(buildInitialFilterState(professionalFilters))}
            summary="Filtre por especialidad, periodo, profesional y fecha."
            values={filters}
          />
        }
        sideContent={
          <Card>
            <CardHeader>
              <CardTitle>Consultas relacionadas</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3 text-sm leading-7 text-muted">
              <p>Comparativos por profesional y especialidad.</p>
              <p>Lectura conjunta de volumen y rendimiento.</p>
              <p>Revision rapida de observaciones y productividad.</p>
            </CardContent>
          </Card>
        }
        table={<DataTable columns={columns} data={professionalRows} description="" title="Consolidado individual" />}
      />
      <DetailModal
        description="Revise el detalle del profesional seleccionado."
        items={
          selected
            ? [
                { label: 'Profesional', value: selected.profesional },
                { label: 'Especialidad', value: selected.especialidad },
                { label: 'Atenciones', value: String(selected.atenciones) },
                { label: 'Rendimiento', value: selected.rendimiento },
                { label: 'Observacion', value: selected.observacion },
              ]
            : []
        }
        onOpenChange={(open) => !open && setSelected(null)}
        open={Boolean(selected)}
        title={selected ? selected.profesional : 'Detalle'}
      />
    </>
  )
}
