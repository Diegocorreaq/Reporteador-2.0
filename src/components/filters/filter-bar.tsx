import type { FormEvent } from 'react'
import { Search, RotateCcw, SlidersHorizontal } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Select } from '@/components/ui/select'
import type { FilterFieldConfig } from '@/types/report'

interface FilterBarProps {
  fields: FilterFieldConfig[]
  values: Record<string, string>
  onChange: (field: string, value: string) => void
  onSubmit?: () => void
  onReset?: () => void
  summary?: string
}

export function FilterBar({
  fields,
  values,
  onChange,
  onSubmit,
  onReset,
  summary,
}: FilterBarProps) {
  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    onSubmit?.()
  }

  return (
    <Card>
      <CardHeader className="flex flex-col gap-3 border-b border-border/70 pb-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-3">
          <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-brand-soft">
            <SlidersHorizontal className="h-5 w-5 text-brand-strong" />
          </div>
          <div>
            <CardTitle>Filtros operativos</CardTitle>
            <p className="text-sm leading-6 text-muted">
              Reutilizable para módulos de tabla, exportación y dashboards analíticos.
            </p>
          </div>
        </div>
        {summary ? <p className="max-w-sm text-sm text-muted">{summary}</p> : null}
      </CardHeader>
      <CardContent className="pt-6">
        <form className="space-y-5" onSubmit={handleSubmit}>
          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
            {fields.map((field) => (
              <label className="space-y-2" key={field.id}>
                <span className="text-xs font-semibold uppercase tracking-[0.16em] text-muted">
                  {field.label}
                </span>
                {field.type === 'select' ? (
                  <Select value={values[field.id] ?? ''} onChange={(event) => onChange(field.id, event.target.value)}>
                    <option value="">{field.placeholder ?? 'Todos'}</option>
                    {field.options?.map((option) => (
                      <option key={option.value} value={option.value}>
                        {option.label}
                      </option>
                    ))}
                  </Select>
                ) : (
                  <Input
                    type={field.type === 'date' ? 'date' : 'text'}
                    value={values[field.id] ?? ''}
                    onChange={(event) => onChange(field.id, event.target.value)}
                    placeholder={field.placeholder}
                  />
                )}
              </label>
            ))}
          </div>
          <div className="flex flex-wrap gap-3">
            <Button type="submit">
              <Search className="h-4 w-4" />
              Aplicar filtros
            </Button>
            <Button type="button" variant="outline" onClick={onReset}>
              <RotateCcw className="h-4 w-4" />
              Limpiar
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  )
}
