import { MonitorDot } from 'lucide-react'
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
import { monitoringFilters, monitoringRows } from '@/lib/mock-data'
import type { WorkspaceKey } from '@/types/auth'

type MonitoringRow = (typeof monitoringRows)[number]

interface MonitoreoPageProps {
  workspace: WorkspaceKey
}

function statusVariant(status: MonitoringRow['estado']) {
  if (status === 'Abierto') return 'warning'
  if (status === 'En seguimiento') return 'brand'
  return 'success'
}

export function MonitoreoPage({ workspace }: MonitoreoPageProps) {
  const [filters, setFilters] = useState(buildInitialFilterState(monitoringFilters))
  const [selected, setSelected] = useState<MonitoringRow | null>(null)
  const { item } = useActiveNavigationItem()

  const columns: ColumnDef<MonitoringRow>[] = [
    { accessorKey: 'ticket', header: 'Ticket' },
    { accessorKey: 'origen', header: 'Origen' },
    { accessorKey: 'asunto', header: 'Asunto' },
    {
      accessorKey: 'estado',
      header: 'Estado',
      cell: ({ row }) => <Badge variant={statusVariant(row.original.estado)}>{row.original.estado}</Badge>,
    },
    { accessorKey: 'responsable', header: 'Responsable' },
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
        title={item?.label ?? 'Monitoreo'}
        description={item?.description ?? 'Haga seguimiento a observaciones, responsables y estado de atencion.'}
        actions={
          <Button className="h-8 rounded-xl px-2.5 text-xs font-medium" size="sm">
            <MonitorDot className="h-4 w-4" />
            Exportar seguimiento
          </Button>
        }
        filters={
          <FilterBar
            fields={monitoringFilters}
            onChange={(field, value) => setFilters((current) => ({ ...current, [field]: value }))}
            onReset={() => setFilters(buildInitialFilterState(monitoringFilters))}
            summary="Filtre por estado, responsable, origen y fecha."
            values={filters}
          />
        }
        sideContent={
          <Card>
            <CardHeader>
              <CardTitle>Consultas relacionadas</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3 text-sm leading-7 text-muted">
              <p>Seguimiento por responsables y origen.</p>
              <p>Revision de pendientes y observaciones por corte.</p>
              <p>Detalle de casos con estado operativo.</p>
            </CardContent>
          </Card>
        }
        table={<DataTable columns={columns} data={monitoringRows} description="" title="Cola operativa" />}
      />
      <DetailModal
        description="Revise el detalle del seguimiento seleccionado."
        items={
          selected
            ? [
                { label: 'Ticket', value: selected.ticket },
                { label: 'Origen', value: selected.origen },
                { label: 'Asunto', value: selected.asunto },
                { label: 'Estado', value: selected.estado },
                { label: 'Responsable', value: selected.responsable },
              ]
            : []
        }
        onOpenChange={(open) => !open && setSelected(null)}
        open={Boolean(selected)}
        title={selected ? selected.ticket : 'Detalle'}
      />
    </>
  )
}
