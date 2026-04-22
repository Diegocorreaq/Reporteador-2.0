import { BookOpenText, ExternalLink, FileText } from 'lucide-react'

const helpLinks = [
  {
    key: 'manuales',
    label: 'Ver manuales y tutoriales',
    description: 'Biblioteca institucional de apoyo al usuario del Reporteador.',
    href: 'https://recursos.heves.gob.pe/',
    icon: BookOpenText,
  },
  {
    key: 'formulario',
    label: 'Formulario de solicitud de información',
    description: 'Registra nuevas solicitudes de información institucional.',
    href: 'https://docs.google.com/forms/d/e/1FAIpQLSe2MFZojk3J2nIPS_UCGmDIHjID3s1qwDb9OYEvG6XwG2fKew/viewform',
    icon: FileText,
  },
]

export function AgentHelpBlock() {
  return (
    <section
      aria-label="Ayuda y orientación"
      className="rounded-xl border border-border bg-canvas p-5"
    >
      <h2 className="mb-3 text-sm font-semibold text-brand-strong">Ayuda y orientación</h2>

      <div className="grid gap-3 sm:grid-cols-2">
        {helpLinks.map((link) => {
          const Icon = link.icon
          return (
            <a
              key={link.key}
              href={link.href}
              target="_blank"
              rel="noopener noreferrer"
              className="group flex items-start gap-3 rounded-lg border border-border bg-white p-3.5 transition hover:border-brand/30 focus:outline-none focus-visible:ring-2 focus-visible:ring-brand focus-visible:ring-offset-1"
            >
              <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-brand-soft">
                <Icon className="h-4 w-4 text-brand" />
              </div>
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-1">
                  <p className="text-sm font-medium text-brand-strong">{link.label}</p>
                  <ExternalLink className="h-3 w-3 shrink-0 text-muted" />
                </div>
                <p className="mt-0.5 text-xs text-muted">{link.description}</p>
              </div>
            </a>
          )
        })}
      </div>
    </section>
  )
}
