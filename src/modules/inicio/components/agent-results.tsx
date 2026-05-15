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
    <section aria-label="Resultados del agente" aria-live="polite" data-tour="orientation-results">
      <div className="mb-4 flex items-baseline justify-between">
        <div>
          <h2 className="text-base font-semibold text-brand-strong">Resultados encontrados</h2>
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
          <p className="text-base font-medium text-brand-strong">No encontré coincidencias exactas</p>
          <p className="mt-1 max-w-xl text-sm text-muted">
            Intenta buscar por tema, indicador, área o necesidad. Por ejemplo:{' '}
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
              onClick={() => onRelatedSearch('dengue')}
            >
              dengue
            </button>
            {', '}
            <button
              type="button"
              className="text-brand underline-offset-2 hover:underline"
              onClick={() => onRelatedSearch('referencias')}
            >
              referencias
            </button>
            {', '}
            <button
              type="button"
              className="text-brand underline-offset-2 hover:underline"
              onClick={() => onRelatedSearch('citas')}
            >
              citas
            </button>
            {', '}
            <button
              type="button"
              className="text-brand underline-offset-2 hover:underline"
              onClick={() => onRelatedSearch('emergencia')}
            >
              emergencia
            </button>
            {', '}
            <button
              type="button"
              className="text-brand underline-offset-2 hover:underline"
              onClick={() => onRelatedSearch('IAAS')}
            >
              IAAS
            </button>
            {', '}
            <button
              type="button"
              className="text-brand underline-offset-2 hover:underline"
              onClick={() => onRelatedSearch('salud mental')}
            >
              salud mental
            </button>
            {' o '}
            <button
              type="button"
              className="text-brand underline-offset-2 hover:underline"
              onClick={() => onRelatedSearch('diagnósticos frecuentes')}
            >
              diagnósticos frecuentes
            </button>
            .
          </p>
        </div>
      ) : (
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {results.map((result) => (
            <AgentResultCard
              key={result.resource.id}
              resource={result.resource}
            />
          ))}
        </div>
      )}
    </section>
  )
}
