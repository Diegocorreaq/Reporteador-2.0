import type { ReactNode } from 'react'
import { Search } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { cn } from '@/lib/utils'

interface SighFilterPanelProps {
  children: ReactNode
  onProcess?: () => void
  processLabel?: string
  className?: string
  rightSlot?: ReactNode
}

export function SighFilterPanel({
  children,
  onProcess,
  processLabel = 'Procesar',
  className,
  rightSlot,
}: SighFilterPanelProps) {
  return (
    <Card className={cn('border-border/70', className)}>
      <CardHeader className="border-b border-border/60 pb-3">
        <CardTitle className="text-sm">Filtros</CardTitle>
      </CardHeader>
      <CardContent className="pt-4">
        <div className="flex flex-col gap-3 md:flex-row md:flex-wrap md:items-end">{children}</div>
        {onProcess || rightSlot ? (
          <div className="mt-3 flex flex-col gap-2 border-t border-border/60 pt-3 sm:flex-row sm:items-center sm:justify-between">
            <div className="min-w-0">{rightSlot}</div>
            {onProcess ? (
              <Button className="w-full sm:w-auto" size="sm" variant="brand" onClick={onProcess}>
                <Search className="h-4 w-4" />
                {processLabel}
              </Button>
            ) : null}
          </div>
        ) : null}
      </CardContent>
    </Card>
  )
}
