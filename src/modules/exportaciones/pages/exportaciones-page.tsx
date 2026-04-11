import { FileDown } from 'lucide-react'
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
import { buildInitialFilterState, formatDate } from '@/lib/utils'
import { exportFilters, exportRows } from '@/lib/mock-data'

type ExportRow = (typeof exportRows)[number]

function statusVariant(status: ExportRow['estado']) {
  if (status === 'Generado') return 'success'
  if (status === 'En cola') return 'warning'
  return 'neutral'
}

export function ExportacionesPage() {
  const [filters, setFilters] = useState(buildInitialFilterState(exportFilters))
  const [selected, setSelected] = useState<ExportRow | null>(null)
  const { item, workspace } = useActiveNavigationItem()

  const columns: ColumnDef<ExportRow>[] = [
    { accessorKey: 'id', header: 'ID' },
    { accessorKey: 'modulo', header: 'Módulo' },
    { accessorKey: 'corte', header: 'Corte' },
    { accessorKey: 'formato', header: 'Formato' },
    {
      accessorKey: 'estado',
      header: 'Estado',
      cell: ({ row }) => <Badge variant={statusVariant(row.original.estado)}>{row.original.estado}</Badge>,
    },
    { accessorKey: 'usuario', header: 'Solicitante' },
    {
      accessorKey: 'actualizado',
      header: 'Última ejecución',
      cell: ({ row }) => formatDate(row.original.actualizado),
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
        title={item?.label ?? 'Exportar Datos'}
        description={item?.description ?? 'Revise solicitudes, cortes y descargas recientes desde un solo lugar.'}
        actions={
          <Button className="h-8 rounded-xl px-2.5 text-xs font-medium" size="sm">
            <FileDown className="h-4 w-4" />
            Nuevo exporte
          </Button>
        }
        filters={
          <FilterBar
            fields={exportFilters}
            onChange={(field, value) => setFilters((current) => ({ ...current, [field]: value }))}
            onReset={() => setFilters(buildInitialFilterState(exportFilters))}
            summary="Filtre por corte, estado, solicitante y fecha."
            values={filters}
          />
        }
        sideContent={
          <Card>
            <CardHeader>
              <CardTitle>Consultas relacionadas</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3 text-sm leading-7 text-muted">
              <p>Exportar Datos.</p>
              <p>Zona de Descarga de Información por Periodos.</p>
              <p>Seguimiento del estado de cada solicitud.</p>
            </CardContent>
          </Card>
        }
        table={
          <DataTable columns={columns} data={exportRows} description="" title="Histórico reciente" />
        }
      />
      <DetailModal
        description="Revise el detalle del exporte seleccionado."
        items={
          selected
            ? [
                { label: 'Identificador', value: selected.id },
                { label: 'Módulo', value: selected.modulo },
                { label: 'Corte', value: selected.corte },
                { label: 'Formato', value: selected.formato },
                { label: 'Estado', value: selected.estado },
                { label: 'Notas', value: selected.detalle.join(' | ') },
              ]
            : []
        }
        onOpenChange={(open) => !open && setSelected(null)}
        open={Boolean(selected)}
        title={selected ? `Solicitud ${selected.id}` : 'Detalle'}
      />
    </>
  )
}
