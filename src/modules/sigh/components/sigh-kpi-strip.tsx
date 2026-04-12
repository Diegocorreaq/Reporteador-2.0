import { Card, CardContent } from '@/components/ui/card'

export interface SighKpiItem {
  label: string
  value: string | number
}

interface SighKpiStripProps {
  items: SighKpiItem[]
}

export function SighKpiStrip({ items }: SighKpiStripProps) {
  return (
    <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
      {items.map((item) => (
        <Card key={item.label} className="border-border/70">
          <CardContent className="p-4">
            <p className="text-[11px] font-semibold uppercase tracking-[0.08em] text-muted">{item.label}</p>
            <p className="mt-1 text-xl font-semibold text-brand-strong">{item.value}</p>
          </CardContent>
        </Card>
      ))}
    </div>
  )
}
