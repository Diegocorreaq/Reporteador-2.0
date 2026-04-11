import type { ReactNode } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { PageHeader } from '@/components/data-display/page-header'

interface BaseLayoutProps {
  eyebrow: string
  title: string
  description: string
  actions?: ReactNode
  filters: ReactNode
  note?: string
  sideContent?: ReactNode
}

interface TableReportLayoutProps extends BaseLayoutProps {
  table: ReactNode
}

interface AnalyticsReportLayoutProps extends BaseLayoutProps {
  chart: ReactNode
  table: ReactNode
}

export function TableReportLayout({
  eyebrow,
  title,
  description,
  actions,
  filters,
  table,
  sideContent,
}: TableReportLayoutProps) {
  return (
    <section className="space-y-4">
      <PageHeader eyebrow={eyebrow} title={title} description={description} actions={actions} />
      <div className="grid gap-4 2xl:grid-cols-[minmax(0,1fr)_320px]">
        <div className="space-y-4">
          {filters}
          {table}
        </div>
        {sideContent ? <div className="space-y-4">{sideContent}</div> : null}
      </div>
    </section>
  )
}

export function AnalyticsReportLayout({
  eyebrow,
  title,
  description,
  actions,
  filters,
  chart,
  table,
  sideContent,
}: AnalyticsReportLayoutProps) {
  return (
    <section className="space-y-4">
      <PageHeader eyebrow={eyebrow} title={title} description={description} actions={actions} />
      <div className="grid gap-4 2xl:grid-cols-[minmax(0,1fr)_320px]">
        <div className="space-y-4">
          {filters}
          <Card>
            <CardHeader className="border-b border-border/70 pb-3">
              <CardTitle className="text-base">Visual analitica</CardTitle>
            </CardHeader>
            <CardContent>{chart}</CardContent>
          </Card>
          {table}
        </div>
        {sideContent ? <div className="space-y-4">{sideContent}</div> : null}
      </div>
    </section>
  )
}
