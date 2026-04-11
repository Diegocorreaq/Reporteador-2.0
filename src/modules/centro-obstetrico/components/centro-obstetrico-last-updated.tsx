import { Clock3 } from 'lucide-react'
import { Card, CardContent } from '@/components/ui/card'
import { formatDateLabel } from '@/modules/centro-obstetrico/utils'

interface CentroObstetricoLastUpdatedProps {
  value: string
}

export function CentroObstetricoLastUpdated({ value }: CentroObstetricoLastUpdatedProps) {
  return (
    <Card className="h-full">
      <CardContent className="flex h-full flex-col justify-center gap-1 p-4">
        <div className="flex items-center gap-2 text-[11px] font-semibold uppercase tracking-[0.16em] text-muted">
          <Clock3 className="h-3.5 w-3.5" />
          Fecha de ultimo registro
        </div>
        <p className="text-sm font-semibold text-text">{formatDateLabel(value)}</p>
        <p className="text-xs text-muted">SISGALENPLUS</p>
      </CardContent>
    </Card>
  )
}
