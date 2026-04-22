import { Database, LayoutGrid, Layers } from 'lucide-react'
import { CATALOG_STATS } from '@/config/navigation-catalog'
import { AgentSearchInput } from '@/modules/inicio/components/agent-search-input'
import { AgentSuggestionChips } from '@/modules/inicio/components/agent-suggestion-chips'
import { getQuickSuggestions } from '@/modules/inicio/utils/search'

interface AgentHeroProps {
  query: string
  activeQuery: string
  onQueryChange: (value: string) => void
  onQuerySubmit: (value: string) => void
  onQueryClear: () => void
}

const stats = [
  {
    label: 'Reporteador',
    value: CATALOG_STATS.principal,
    icon: LayoutGrid,
    description: 'recursos navegables',
  },
  {
    label: 'Datos en Línea',
    value: CATALOG_STATS.datosEnLinea,
    icon: Database,
    description: 'recursos navegables',
  },
  {
    label: 'Total disponible',
    value: CATALOG_STATS.total,
    icon: Layers,
    description: 'en el catálogo',
  },
]

export function AgentHero({ query, activeQuery, onQueryChange, onQuerySubmit, onQueryClear }: AgentHeroProps) {
  const suggestions = getQuickSuggestions()

  return (
    <div className="overflow-hidden rounded-2xl border border-brand/10 bg-gradient-to-br from-brand-strong via-brand to-brand-medium shadow-shell">
      <div className="relative px-6 py-8 sm:px-8 sm:py-10">
        {/* Subtle grid pattern overlay */}
        <div
          className="pointer-events-none absolute inset-0 opacity-[0.06]"
          style={{
            backgroundImage: `url("data:image/svg+xml,%3Csvg width='40' height='40' viewBox='0 0 40 40' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='none' fill-rule='evenodd'%3E%3Cg fill='%23ffffff' fill-opacity='1'%3E%3Cpath d='M0 40L40 0H20L0 20M40 40V20L20 40'/%3E%3C/g%3E%3C/g%3E%3C/svg%3E")`,
          }}
        />

        <div className="relative">
          <div className="mb-8 lg:grid lg:grid-cols-[minmax(0,1fr)_minmax(0,520px)] lg:items-center lg:gap-8">
            <div className="max-w-2xl">
              {/* Header text */}
              <div className="mb-6">
                <p className="mb-2 text-sm font-semibold uppercase tracking-widest text-white/60">
                  Centro de orientación
                </p>
                <h1 className="text-2xl font-bold leading-tight text-white sm:text-3xl">
                  Encuentra reportes, tableros y exportables sin recorrer todo el menú
                </h1>
                <p className="mt-3 text-base text-white/70">
                  Busca por nombre, palabra clave o intención: camas, hospitalizados, salud mental,
                  producción médicos, epidemiología...
                </p>
              </div>

              {/* Search box */}
              <div className="mb-5">
                <AgentSearchInput
                  value={query}
                  onChange={onQueryChange}
                  onSubmit={onQuerySubmit}
                  onClear={onQueryClear}
                />
              </div>

              {/* Suggestion chips */}
              <div>
                <AgentSuggestionChips
                  suggestions={suggestions}
                  onSelect={onQuerySubmit}
                  activeQuery={activeQuery}
                />
              </div>
            </div>

            <div className="relative hidden h-[380px] items-end justify-end lg:flex">
              <img
                alt="Oso estadístico del Reporteador"
                className="h-full w-full max-w-[520px] object-contain object-right"
                loading="lazy"
                src="/oso_estadistico.webp"
              />
            </div>
          </div>

          {/* Stats row */}
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {stats.map((stat) => (
              <div
                key={stat.label}
                className="rounded-xl border border-white/10 bg-white/10 px-4 py-3 backdrop-blur-sm"
              >
                <div className="flex items-center gap-2">
                  <stat.icon className="h-4 w-4 shrink-0 text-white/70" />
                  <span className="text-xs font-medium text-white/70 truncate">{stat.label}</span>
                </div>
                <p className="mt-1 text-2xl font-bold text-white">{stat.value}</p>
                <p className="text-xs text-white/50">{stat.description}</p>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}
