import { Link } from 'react-router-dom'
import {
  Activity,
  ArrowRight,
  BedDouble,
  Brain,
  CalendarClock,
  FlaskConical,
  HeartPulse,
  ShieldPlus,
  LineChart,
  Scissors,
  Stethoscope,
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
    id: 'indicadores-hospitalarios',
    label: 'Quiero ver indicadores hospitalarios',
    description: 'Eficiencia, eficacia, calidad, productividad, camas y sala de operaciones.',
    icon: LineChart,
    action: 'search',
    searchTerm: 'indicadores eficiencia calidad hospitalarios',
  },
  {
    id: 'consulta-externa',
    label: 'Quiero revisar consulta externa',
    description: 'Producción, diagnósticos, servicio, consultorio y profesional.',
    icon: Stethoscope,
    action: 'search',
    searchTerm: 'consulta externa producción diagnósticos servicio consultorio',
  },
  {
    id: 'emergencia',
    label: 'Quiero analizar emergencia',
    description: 'Triaje, prioridad, observación, reingresos y pacientes pendientes.',
    icon: Activity,
    action: 'search',
    searchTerm: 'emergencia triaje prioridad observación pacientes pendientes',
  },
  {
    id: 'hospitalizacion-camas',
    label: 'Quiero revisar hospitalización y camas',
    description: 'Ocupación, permanencia, rendimiento, camas y egresos.',
    icon: BedDouble,
    action: 'search',
    searchTerm: 'hospitalización camas ocupación permanencia rendimiento',
  },
  {
    id: 'referencias',
    label: 'Quiero revisar referencias',
    description: 'Aceptadas, rechazadas, no coordinadas, emergencia y consulta externa.',
    icon: ShieldPlus,
    action: 'search',
    searchTerm: 'referencias aceptadas rechazadas no coordinadas emergencia consulta externa',
  },
  {
    id: 'apoyo-diagnostico',
    label: 'Quiero revisar apoyo al diagnóstico',
    description: 'Laboratorio, imagenología, exámenes, estudios y producción.',
    icon: FlaskConical,
    action: 'search',
    searchTerm: 'laboratorio imagenología exámenes estudios producción',
  },
  {
    id: 'sala-operaciones',
    label: 'Quiero revisar sala de operaciones',
    description: 'Centro quirúrgico, cirugías, procedimientos y suspendidas.',
    icon: Scissors,
    action: 'search',
    searchTerm: 'centro quirúrgico cirugías sala operaciones suspendidas',
  },
  {
    id: 'salud-mental',
    label: 'Quiero revisar salud mental',
    description: 'Tamizaje, violencia, deterioro cognitivo y neurodesarrollo.',
    icon: Brain,
    action: 'search',
    searchTerm: 'salud mental tamizaje violencia deterioro neurodesarrollo maltrato trastornos',
  },
  {
    id: 'epidemiologia-iaas',
    label: 'Quiero revisar epidemiología e IAAS',
    description: 'Infecciones, vigilancia, dengue y accidente de tránsito.',
    icon: HeartPulse,
    action: 'search',
    searchTerm: 'iaas epidemiología infecciones vigilancia dengue accidente tránsito',
  },
  {
    id: 'citas',
    label: 'Quiero revisar citas',
    description: 'Citas reprogramadas, médico, turno, atención y consultorio.',
    icon: CalendarClock,
    action: 'search',
    searchTerm: 'citas reprogramadas médico turno atención consultorio',
  },
  {
    id: 'enfermeria',
    label: 'Quiero revisar enfermería',
    description: 'NEMS, TISS, Braden, LPP, vacunas y tamizaje neonatal.',
    icon: ArrowRight,
    action: 'search',
    searchTerm: 'enfermería nems tiss braden lpp vacunas tamizaje neonatal',
  },
]

interface AgentIntentCardsProps {
  onSearch: (query: string) => void
}

export function AgentIntentCards({ onSearch }: AgentIntentCardsProps) {
  return (
    <section aria-label="Navegación por intención" data-tour="orientation-intents">
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
