import { CalendarRange } from 'lucide-react'
import { useState } from 'react'
import type { ColumnDef } from '@tanstack/react-table'
import { DataTable } from '@/components/data-display/data-table'
import { DetailModal } from '@/components/data-display/detail-modal'
import { TableReportLayout } from '@/components/data-display/report-layouts'
import { FilterBar } from '@/components/filters/filter-bar'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { workspaceMeta } from '@/config/module-registry'
import { useActiveNavigationItem } from '@/hooks/use-active-navigation-item'
import { appointmentFilters, appointmentRows } from '@/lib/mock-data'
import { buildInitialFilterState } from '@/lib/utils'
import type { WorkspaceKey } from '@/types/auth'

type AppointmentRow = (typeof appointmentRows)[number]

interface GestionCitaPageProps {
  workspace: WorkspaceKey
}

export function GestionCitaPage({ workspace }: GestionCitaPageProps) {
  const [filters, setFilters] = useState(buildInitialFilterState(appointmentFilters))
  const [selected, setSelected] = useState<AppointmentRow | null>(null)
  const { item } = useActiveNavigationItem()

  const columns: ColumnDef<AppointmentRow>[] = [
    { accessorKey: 'agenda', header: 'Agenda' },
    { accessorKey: 'especialidad', header: 'Especialidad' },
    { accessorKey: 'profesional', header: 'Profesional' },
    { accessorKey: 'programadas', header: 'Programadas' },
    { accessorKey: 'atendidas', header: 'Atendidas' },
    { accessorKey: 'inasistencias', header: 'Inasistencias' },
    { accessorKey: 'novedad', header: 'Novedad' },
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
        title={item?.label ?? 'Gestion de Citas'}
        description={item?.description ?? 'Consulte agendas, cumplimiento e inasistencias por especialidad y profesional.'}
        actions={
          <Button className="h-8 rounded-xl px-2.5 text-xs font-medium" size="sm">
            <CalendarRange className="h-4 w-4" />
            Exportar agenda
          </Button>
        }
        filters={
          <FilterBar
            fields={appointmentFilters}
            onChange={(field, value) => setFilters((current) => ({ ...current, [field]: value }))}
            onReset={() => setFilters(buildInitialFilterState(appointmentFilters))}
            summary="Filtre por especialidad, sede, profesional y fecha."
            values={filters}
          />
        }
        sideContent={
          <Card>
            <CardHeader>
              <CardTitle>Consultas relacionadas</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3 text-sm leading-7 text-muted">
              <p>Gestion de agendas y roles de consulta.</p>
              <p>Monitoreo de tickets y seguimiento de ventanilla.</p>
              <p>Revision de tiempos de espera y reprogramaciones.</p>
            </CardContent>
          </Card>
        }
        table={<DataTable columns={columns} data={appointmentRows} description="" title="Seguimiento diario" />}
      />
      <DetailModal
        description="Revise el detalle de la agenda seleccionada."
        items={
          selected
            ? [
                { label: 'Agenda', value: selected.agenda },
                { label: 'Especialidad', value: selected.especialidad },
                { label: 'Profesional', value: selected.profesional },
                { label: 'Programadas', value: String(selected.programadas) },
                { label: 'Atendidas', value: String(selected.atendidas) },
                { label: 'Novedad', value: selected.novedad },
              ]
            : []
        }
        onOpenChange={(open) => !open && setSelected(null)}
        open={Boolean(selected)}
        title={selected ? `Agenda ${selected.agenda}` : 'Detalle'}
      />
    </>
  )
}
