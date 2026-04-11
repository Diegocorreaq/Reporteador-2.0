import { FlaskConical } from 'lucide-react'
import { useState } from 'react'
import type { ColumnDef } from '@tanstack/react-table'
import { DataTable } from '@/components/data-display/data-table'
import { DetailModal } from '@/components/data-display/detail-modal'
import { TableReportLayout } from '@/components/data-display/report-layouts'
import { FilterBar } from '@/components/filters/filter-bar'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { workspaceMeta } from '@/config/module-registry'
import { useActiveNavigationItem } from '@/hooks/use-active-navigation-item'
import { buildInitialFilterState } from '@/lib/utils'
import { laboratoryFilters, laboratoryRows } from '@/lib/mock-data'
import type { WorkspaceKey } from '@/types/auth'

type LaboratoryRow = (typeof laboratoryRows)[number]

interface LaboratorioPageProps {
  workspace: WorkspaceKey
}

function rowVariant(status: LaboratoryRow['estado']) {
  return status === 'Operativo' ? 'success' : 'warning'
}

export function LaboratorioPage({ workspace }: LaboratorioPageProps) {
  const [filters, setFilters] = useState(buildInitialFilterState(laboratoryFilters))
  const [selected, setSelected] = useState<LaboratoryRow | null>(null)
  const { item } = useActiveNavigationItem()

  const columns: ColumnDef<LaboratoryRow>[] = [
    { accessorKey: 'orden', header: 'Orden' },
    { accessorKey: 'area', header: 'Area' },
    { accessorKey: 'muestras', header: 'Muestras' },
    { accessorKey: 'criticos', header: 'Criticos' },
    { accessorKey: 'tmr', header: 'TMR' },
    {
      accessorKey: 'estado',
      header: 'Estado',
      cell: ({ row }) => <Badge variant={rowVariant(row.original.estado)}>{row.original.estado}</Badge>,
    },
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
      <TableReportLayout
        eyebrow={workspaceMeta[workspace].shortLabel}
        title={item?.label ?? 'Laboratorio'}
        description={item?.description ?? 'Consulte produccion, criticidad y tiempos de respuesta por area.'}
        actions={
          <Button className="h-8 rounded-xl px-2.5 text-xs font-medium" size="sm">
            <FlaskConical className="h-4 w-4" />
            Exportar resultados
          </Button>
        }
        filters={
          <FilterBar
            fields={laboratoryFilters}
            onChange={(field, value) => setFilters((current) => ({ ...current, [field]: value }))}
            onReset={() => setFilters(buildInitialFilterState(laboratoryFilters))}
            summary="Filtre por area, criticidad, orden y fecha."
            values={filters}
          />
        }
        sideContent={
          <Card>
            <CardHeader>
              <CardTitle>Consultas relacionadas</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3 text-sm leading-7 text-muted">
              <p>Produccion por area analitica.</p>
              <p>Tiempos de respuesta y pendientes criticos.</p>
              <p>Detalle por orden y seguimiento de resultados.</p>
            </CardContent>
          </Card>
        }
        table={<DataTable columns={columns} data={laboratoryRows} description="" title="Solicitudes consolidadas" />}
      />
      <DetailModal
        description="Revise el detalle de la orden seleccionada."
        items={
          selected
            ? [
                { label: 'Orden', value: selected.orden },
                { label: 'Area', value: selected.area },
                { label: 'Muestras', value: String(selected.muestras) },
                { label: 'Criticos', value: String(selected.criticos) },
                { label: 'TMR', value: selected.tmr },
                { label: 'Estado', value: selected.estado },
              ]
            : []
        }
        onOpenChange={(open) => !open && setSelected(null)}
        open={Boolean(selected)}
        title={selected ? `Orden ${selected.orden}` : 'Detalle'}
      />
    </>
  )
}
