import { SearchX } from 'lucide-react'
import type { SearchResult } from '@/modules/inicio/utils/search'
import { AgentResultCard } from '@/modules/inicio/components/agent-result-card'

interface AgentResultsProps {
  query: string
  results: SearchResult[]
  onRelatedSearch: (query: string) => void
}

export function AgentResults({ query, results, onRelatedSearch }: AgentResultsProps) {
  if (!query.trim() || query.trim().length < 2) return null

  return (
    <section aria-label="Resultados del agente" aria-live="polite">
      <div className="mb-4 flex items-baseline justify-between">
        <div>
          <h2 className="text-base font-semibold text-brand-strong">Resultados del agente</h2>
          {results.length > 0 && (
            <p className="text-sm text-muted">
              {results.length} resultado{results.length !== 1 ? 's' : ''} para{' '}
              <span className="font-medium text-brand-strong">&ldquo;{query}&rdquo;</span>
            </p>
          )}
        </div>
      </div>

      {results.length === 0 ? (
        <div className="flex flex-col items-center justify-center rounded-xl border border-dashed border-border bg-canvas px-6 py-12 text-center">
          <SearchX className="mb-3 h-10 w-10 text-muted/40" />
          <p className="text-base font-medium text-brand-strong">Sin coincidencias exactas</p>
          <p className="mt-1 max-w-sm text-sm text-muted">
            No encontramos resultados para{' '}
            <span className="font-medium">&ldquo;{query}&rdquo;</span>. Prueba con:{' '}
            <button
              type="button"
              className="text-brand underline-offset-2 hover:underline"
              onClick={() => onRelatedSearch('camas')}
            >
              camas
            </button>
            {', '}
            <button
              type="button"
              className="text-brand underline-offset-2 hover:underline"
              onClick={() => onRelatedSearch('hospitalizados')}
            >
              hospitalizados
            </button>
            {', '}
            <button
              type="button"
              className="text-brand underline-offset-2 hover:underline"
              onClick={() => onRelatedSearch('producción')}
            >
              producción
            </button>
            {' o '}
            <button
              type="button"
              className="text-brand underline-offset-2 hover:underline"
              onClick={() => onRelatedSearch('salud mental')}
            >
              salud mental
            </button>
            .
          </p>
        </div>
      ) : (
        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
          {results.slice(0, 9).map((result) => (
            <AgentResultCard
              key={result.resource.id}
              resource={result.resource}
              onRelated={onRelatedSearch}
            />
          ))}
        </div>
      )}
    </section>
  )
}
