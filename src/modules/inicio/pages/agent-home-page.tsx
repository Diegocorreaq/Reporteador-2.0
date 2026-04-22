import { useState, useMemo } from 'react'
import { AgentHero } from '@/modules/inicio/components/agent-hero'
import { AgentResults } from '@/modules/inicio/components/agent-results'
import { AgentIntentCards } from '@/modules/inicio/components/agent-intent-cards'
import { AgentFrequentAccess } from '@/modules/inicio/components/agent-frequent-access'
import { AgentHelpBlock } from '@/modules/inicio/components/agent-help-block'
import { searchCatalog } from '@/modules/inicio/utils/search'

export function AgentHomePage() {
  const [inputValue, setInputValue] = useState('')
  const [query, setQuery] = useState('')

  const results = useMemo(() => searchCatalog(query), [query])

  const isSearching = query.trim().length >= 2

  function handleSearch(value: string) {
    setInputValue(value)
    setQuery(value)
    if (value.trim().length >= 2) {
      // Scroll results into view after a brief delay for render
      setTimeout(() => {
        document.getElementById('agent-results')?.scrollIntoView({ behavior: 'smooth', block: 'start' })
      }, 50)
    }
  }

  function handleQueryChange(value: string) {
    setInputValue(value)
  }

  function handleClear() {
    setInputValue('')
    setQuery('')
  }

  return (
    <div className="space-y-8">
      {/* A. HERO — siempre visible */}
      <AgentHero
        query={inputValue}
        activeQuery={query}
        onQueryChange={handleQueryChange}
        onQuerySubmit={handleSearch}
        onQueryClear={handleClear}
      />

      {/* B. RESULTADOS — visible solo cuando hay query */}
      {isSearching && (
        <div id="agent-results">
          <AgentResults
            query={query}
            results={results}
            onRelatedSearch={handleSearch}
          />
        </div>
      )}

      {/* C. NAVEGACIÓN POR INTENCIÓN — visible siempre, subordinada cuando hay resultados */}
      <AgentIntentCards onSearch={handleSearch} />

      {/* D. ACCESOS FRECUENTES — visible cuando no hay búsqueda activa */}
      {!isSearching && <AgentFrequentAccess />}

      {/* E. AYUDA — siempre al final */}
      <AgentHelpBlock />
    </div>
  )
}
