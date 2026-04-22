interface AgentSuggestionChipsProps {
  suggestions: string[]
  onSelect: (value: string) => void
  activeQuery: string
}

export function AgentSuggestionChips({ suggestions, onSelect, activeQuery }: AgentSuggestionChipsProps) {
  return (
    <div className="flex flex-wrap gap-2">
      {suggestions.map((suggestion) => {
        const isActive = activeQuery.trim().toLowerCase() === suggestion.toLowerCase()
        return (
          <button
            key={suggestion}
            type="button"
            onClick={() => onSelect(suggestion)}
            aria-pressed={isActive}
            className={`rounded-full border px-3.5 py-1.5 text-sm font-medium transition focus:outline-none focus-visible:ring-2 focus-visible:ring-brand focus-visible:ring-offset-1 ${
              isActive
                ? 'border-brand bg-brand text-white shadow-sm'
                : 'border-brand/20 bg-white text-brand-strong hover:border-brand/40 hover:bg-brand-soft/50'
            }`}
          >
            {suggestion}
          </button>
        )
      })}
    </div>
  )
}
