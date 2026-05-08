import { Link } from 'react-router-dom'
import {
  ArrowRight,
  BedDouble,
  Brain,
  CalendarClock,
  Download,
  ShieldPlus,
  LineChart,
  Monitor,
} from 'lucide-react'

interface IntentCard {
  id: string
  label: string
  description: string
  icon: React.ElementType
  action: 'search' | 'navigate'
  searchTerm?: string
  route?: string
}

const intentCards: IntentCard[] = [
  {
    id: 'exportar',
    label: 'Quiero exportar información',
    description: 'Datos exportables, registros nominales y descargas por periodo.',
    icon: Download,
    action: 'search',
    searchTerm: 'exportar',
  },
  {
    id: 'dia',
    label: 'Quiero ver datos del día',
    description: 'Monitoreo en tiempo real: camas, pacientes, emergencia.',
    icon: Monitor,
    action: 'search',
    searchTerm: 'monitoreo',
  },
  {
    id: 'indicadores',
    label: 'Quiero ver indicadores',
    description: 'Indicadores de eficiencia, eficacia y calidad hospitalaria.',
    icon: LineChart,
    action: 'search',
    searchTerm: 'indicadores hospitalarios',
  },
  {
    id: 'salud-mental',
    label: 'Quiero ubicar salud mental',
    description: 'Reportes de monitoreo: violencia, ansiedad, depresión y tamizaje.',
    icon: Brain,
    action: 'search',
    searchTerm: 'salud mental',
  },
  {
    id: 'epidemiologia',
    label: 'Quiero exportables de epidemiologia',
    description: 'Oncologicos, PFA, sifilis, sarampion, ISQx, mordedura, cirugia y dengue.',
    icon: ShieldPlus,
    action: 'search',
    searchTerm: 'exportables epidemiologia',
  },
  {
    id: 'camas',
    label: 'Quiero ubicar gestión de camas',
    description: 'Monitoreo, resumen, ocupación y estancia de camas.',
    icon: BedDouble,
    action: 'search',
    searchTerm: 'camas',
  },
  {
    id: 'citas',
    label: 'Quiero ver citas y tickets',
    description: 'Gestión de citas, monitoreo de tickets y ventanilla.',
    icon: CalendarClock,
    action: 'search',
    searchTerm: 'citas',
  },
  {
    id: 'hospitalizados',
    label: 'Quiero ver hospitalizados',
    description: 'Pacientes internados, altas, fallecidos y estadísticas diarias.',
    icon: ArrowRight,
    action: 'search',
    searchTerm: 'hospitalizados',
  },
]

interface AgentIntentCardsProps {
  onSearch: (query: string) => void
}

export function AgentIntentCards({ onSearch }: AgentIntentCardsProps) {
  return (
    <section aria-label="Navegación por intención">
      <div className="mb-4">
        <h2 className="text-base font-semibold text-brand-strong">
          O también puedes entrar por intención
        </h2>
        <p className="text-sm text-muted">
          Selecciona lo que quieres hacer y el agente filtrará los recursos relevantes.
        </p>
      </div>

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
        {intentCards.map((card) => {
          const Icon = card.icon

          if (card.action === 'navigate' && card.route) {
            return (
              <Link
                key={card.id}
                to={card.route}
                className="group flex flex-col gap-3 rounded-xl border border-border bg-white p-4 shadow-sm transition hover:border-brand/30 hover:shadow-panel focus:outline-none focus-visible:ring-2 focus-visible:ring-brand focus-visible:ring-offset-1"
              >
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-brand-soft transition group-hover:bg-brand group-hover:text-white">
                  <Icon className="h-5 w-5 text-brand group-hover:text-white" />
                </div>
                <div className="flex-1">
                  <p className="text-sm font-semibold leading-snug text-brand-strong">{card.label}</p>
                  <p className="mt-1 text-xs text-muted">{card.description}</p>
                </div>
                <div className="flex items-center gap-1 text-xs font-medium text-brand">
                  Ir al módulo
                  <ArrowRight className="h-3.5 w-3.5" />
                </div>
              </Link>
            )
          }

          return (
            <button
              key={card.id}
              type="button"
              onClick={() => card.searchTerm && onSearch(card.searchTerm)}
              className="group flex flex-col gap-3 rounded-xl border border-border bg-white p-4 shadow-sm transition hover:border-brand/30 hover:shadow-panel text-left focus:outline-none focus-visible:ring-2 focus-visible:ring-brand focus-visible:ring-offset-1"
            >
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-brand-soft transition group-hover:bg-brand group-hover:text-white">
                <Icon className="h-5 w-5 text-brand group-hover:text-white" />
              </div>
              <div className="flex-1">
                <p className="text-sm font-semibold leading-snug text-brand-strong">{card.label}</p>
                <p className="mt-1 text-xs text-muted">{card.description}</p>
              </div>
              <div className="flex items-center gap-1 text-xs font-medium text-brand">
                Buscar
                <ArrowRight className="h-3.5 w-3.5" />
              </div>
            </button>
          )
        })}
      </div>
    </section>
  )
}
