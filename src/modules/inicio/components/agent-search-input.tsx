import { useRef, type ChangeEvent, type KeyboardEvent } from 'react'
import { Search, X } from 'lucide-react'

interface AgentSearchInputProps {
  value: string
  onChange: (value: string) => void
  onSubmit: (value: string) => void
  onClear: () => void
}

export function AgentSearchInput({ value, onChange, onSubmit, onClear }: AgentSearchInputProps) {
  const inputRef = useRef<HTMLInputElement>(null)

  function handleChange(e: ChangeEvent<HTMLInputElement>) {
    onChange(e.target.value)
  }

  function handleKeyDown(e: KeyboardEvent<HTMLInputElement>) {
    if (e.key === 'Enter') {
      onSubmit(value)
      return
    }

    if (e.key === 'Escape') {
      onClear()
      inputRef.current?.blur()
    }
  }

  return (
    <div className="relative">
      <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-4">
        <Search className="h-5 w-5 text-brand/60" />
      </div>
      <input
        ref={inputRef}
        type="text"
        value={value}
        onChange={handleChange}
        onKeyDown={handleKeyDown}
        placeholder="Busca por nombre, módulo o intención: camas, hospitalizados, producción..."
        aria-label="Buscar reportes, tableros y exportables"
        className="w-full rounded-xl border-2 border-brand/20 bg-white py-3.5 pl-12 pr-12 text-base text-brand-strong placeholder:text-muted/60 shadow-sm transition focus:border-brand focus:outline-none focus:ring-0"
      />
      {value && (
        <button
          type="button"
          onClick={onClear}
          aria-label="Limpiar búsqueda"
          className="absolute inset-y-0 right-0 flex items-center pr-4 text-muted transition hover:text-brand-strong"
        >
          <X className="h-4 w-4" />
        </button>
      )}
    </div>
  )
}
