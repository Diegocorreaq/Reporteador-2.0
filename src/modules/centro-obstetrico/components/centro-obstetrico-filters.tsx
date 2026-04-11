import type { FormEvent } from 'react'
import { RefreshCw, RotateCcw } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import type { CentroObstetricoFilters } from '@/modules/centro-obstetrico/types'

interface CentroObstetricoFiltersProps {
  values: CentroObstetricoFilters
  onChange: (field: keyof CentroObstetricoFilters, value: string) => void
  onSubmit: () => void
  onReset: () => void
  isLoading?: boolean
}

export function CentroObstetricoFilters({
  values,
  onChange,
  onSubmit,
  onReset,
  isLoading,
}: CentroObstetricoFiltersProps) {
  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    onSubmit()
  }

  return (
    <Card>
      <CardContent className="p-4">
        <form className="flex flex-col gap-3 xl:flex-row xl:items-end" onSubmit={handleSubmit}>
          <div className="grid flex-1 gap-3 sm:grid-cols-2">
            <label className="space-y-2">
              <span className="text-[11px] font-semibold uppercase tracking-[0.16em] text-muted">Desde</span>
              <Input
                className="h-10 rounded-xl"
                type="date"
                value={values.fechaInicio}
                onChange={(event) => onChange('fechaInicio', event.target.value)}
              />
            </label>
            <label className="space-y-2">
              <span className="text-[11px] font-semibold uppercase tracking-[0.16em] text-muted">Hasta</span>
              <Input
                className="h-10 rounded-xl"
                type="date"
                value={values.fechaFin}
                onChange={(event) => onChange('fechaFin', event.target.value)}
              />
            </label>
          </div>
          <div className="flex flex-wrap gap-2">
            <Button className="h-10 rounded-xl px-3 text-xs font-medium" size="sm" type="submit" disabled={isLoading}>
              <RefreshCw className="h-4 w-4" />
              {isLoading ? 'Procesando...' : 'Aplicar periodo'}
            </Button>
            <Button
              className="h-10 rounded-xl px-3 text-xs font-medium"
              size="sm"
              type="button"
              variant="outline"
              onClick={onReset}
              disabled={isLoading}
            >
              <RotateCcw className="h-4 w-4" />
              Limpiar
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  )
}
