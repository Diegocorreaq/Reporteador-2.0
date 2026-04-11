import type { ReactNode } from 'react'
import { BarChart3 } from 'lucide-react'
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
    <section className="space-y-5">
      <PageHeader eyebrow={eyebrow} title={title} description={description} actions={actions} />
      <div className="grid gap-5 2xl:grid-cols-[minmax(0,1fr)_340px]">
        <div className="space-y-5">
          {filters}
          {table}
        </div>
        {sideContent ? <div className="space-y-5">{sideContent}</div> : null}
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
    <section className="space-y-5">
      <PageHeader eyebrow={eyebrow} title={title} description={description} actions={actions} />
      <div className="grid gap-5 2xl:grid-cols-[minmax(0,1fr)_340px]">
        <div className="space-y-5">
          {filters}
          <Card>
            <CardHeader className="border-b border-border pb-4">
              <div className="flex items-center gap-3">
                <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-brand-soft">
                  <BarChart3 className="h-5 w-5 text-brand-strong" />
                </div>
                <CardTitle>Visual Analitica</CardTitle>
              </div>
            </CardHeader>
            <CardContent className="pt-5">{chart}</CardContent>
          </Card>
          {table}
        </div>
        {sideContent ? <div className="space-y-5">{sideContent}</div> : null}
      </div>
    </section>
  )
}
