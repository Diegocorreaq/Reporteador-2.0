import { ArrowUpRight, Archive } from 'lucide-react'
import { PageHeader } from '@/components/data-display/page-header'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { workspaceMeta } from '@/config/module-registry'
import type { WorkspaceKey } from '@/types/auth'

interface WorkspaceReportesHistoricosPageProps {
  workspace: WorkspaceKey
}

const historicalReports = [
  {
    key: 'desembalse',
    label: 'Desembalse Quirurgico 2024',
    description: 'Tablero referencial del seguimiento institucional del 2024.',
    href: 'https://app.powerbi.com/view?r=eyJrIjoiNDFlMTdmNGQtMWM3MC00NTI3LWFjYmEtNWU2NjBhMTk0NjVmIiwidCI6ImIwZDQ1ZmViLTM5MzUtNGE4ZS04YTc1LTNhYWM4MGQ4NTMzYSJ9',
  },
  {
    key: 'operacion-vida',
    label: 'Operacion VIDA',
    description: 'Tablero referencial para consulta institucional historica.',
    href: 'https://app.powerbi.com/view?r=eyJrIjoiZDQ2Y2ZmNTktMzY4Ny00NzQxLTk3OTgtOWRhYmQyY2RmYzU2IiwidCI6ImIwZDQ1ZmViLTM5MzUtNGE4ZS04YTc1LTNhYWM4MGQ4NTMzYSJ9',
  },
]

export function WorkspaceReportesHistoricosPage({ workspace }: WorkspaceReportesHistoricosPageProps) {
  return (
    <section className="space-y-6">
      <PageHeader
        eyebrow={workspaceMeta[workspace].shortLabel}
        title="Reportes historicos"
        description="Consulta tableros institucionales anteriores o de referencia."
      />

      <div className="grid gap-4 lg:grid-cols-2">
        {historicalReports.map((report) => (
          <Card key={report.key}>
            <CardHeader className="space-y-3 border-b border-border pb-4">
              <div className="flex items-start justify-between gap-3">
                <div className="flex items-start gap-3">
                  <div className="mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-brand-soft">
                    <Archive className="h-4 w-4 text-brand-strong" />
                  </div>
                  <div className="space-y-1">
                    <CardTitle className="text-base">{report.label}</CardTitle>
                    <p className="text-sm text-muted">{report.description}</p>
                  </div>
                </div>
                <Badge variant="neutral">Historico</Badge>
              </div>
            </CardHeader>
            <CardContent className="pt-4">
              <Button asChild size="sm" variant="outline">
                <a href={report.href} rel="noopener noreferrer" target="_blank">
                  Abrir reporte
                  <ArrowUpRight className="h-4 w-4" />
                </a>
              </Button>
            </CardContent>
          </Card>
        ))}
      </div>
    </section>
  )
}
