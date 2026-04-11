import type { FormEvent } from 'react'
import { RotateCcw, Search, SlidersHorizontal } from 'lucide-react'
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
      <CardHeader className="flex flex-col gap-3 border-b border-border pb-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-3">
          <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-brand-soft">
            <SlidersHorizontal className="h-4 w-4 text-brand-strong" />
          </div>
          <div>
            <CardTitle>Filtros</CardTitle>
            {summary ? (
              <p className="mt-0.5 text-xs text-muted">{summary}</p>
            ) : null}
          </div>
        </div>
      </CardHeader>
      <CardContent className="pt-4">
        <form className="space-y-4" onSubmit={handleSubmit}>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
            {fields.map((field) => (
              <div className="space-y-1.5" key={field.id}>
                <label
                  className="text-xs font-semibold text-brand-strong"
                  htmlFor={field.id}
                >
                  {field.label}
                </label>
                {field.type === 'select' ? (
                  <Select
                    id={field.id}
                    value={values[field.id] ?? ''}
                    onChange={(event) => onChange(field.id, event.target.value)}
                  >
                    <option value="">{field.placeholder ?? 'Todos'}</option>
                    {field.options?.map((option) => (
                      <option key={option.value} value={option.value}>
                        {option.label}
                      </option>
                    ))}
                  </Select>
                ) : (
                  <Input
                    id={field.id}
                    type={field.type === 'date' ? 'date' : 'text'}
                    value={values[field.id] ?? ''}
                    onChange={(event) => onChange(field.id, event.target.value)}
                    placeholder={field.placeholder}
                  />
                )}
              </div>
            ))}
          </div>
          <div className="flex flex-wrap gap-2 border-t border-border pt-4">
            <Button size="sm" type="submit">
              <Search className="h-4 w-4" />
              Aplicar filtros
            </Button>
            <Button size="sm" type="button" variant="outline" onClick={onReset}>
              <RotateCcw className="h-4 w-4" />
              Limpiar
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  )
}
