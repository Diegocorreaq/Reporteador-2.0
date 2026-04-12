import type { ReactNode } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'

interface CriticalCareModuleCardProps {
  numberLabel: string
  title: string
  children: ReactNode
}

export function CriticalCareModuleCard({ numberLabel, title, children }: CriticalCareModuleCardProps) {
  return (
    <Card className="border-border/70">
      <CardHeader className="pb-3">
        <CardTitle className="text-sm font-semibold text-brand-strong sm:text-base">
          <span className="mr-1">{numberLabel}</span>
          <span>{title}</span>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">{children}</CardContent>
    </Card>
  )
}
