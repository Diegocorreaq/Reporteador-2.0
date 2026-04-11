import type { ReactNode } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { MetricFooter } from '@/modules/centro-obstetrico/components/metric-footer'

interface MetricPanelProps {
  title: string
  table: ReactNode
  chart: ReactNode
  note?: string
}

export function MetricPanel({ title, table, chart, note }: MetricPanelProps) {
  return (
    <Card>
      <CardHeader className="border-b border-border/70 pb-3">
        <CardTitle className="text-base">{title}</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4 p-4">
        <div className="grid gap-4 xl:grid-cols-[minmax(0,1.1fr)_minmax(320px,0.9fr)] xl:items-start">
          <div>{table}</div>
          <div className="rounded-[24px] border border-border/70 bg-panelAlt/35 p-3">{chart}</div>
        </div>
        <MetricFooter note={note} />
      </CardContent>
    </Card>
  )
}
