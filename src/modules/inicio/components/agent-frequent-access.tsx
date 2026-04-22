import { Link } from 'react-router-dom'
import { ArrowRight } from 'lucide-react'
import { getFeaturedResources } from '@/modules/inicio/utils/search'
import { resourceTypeLabels } from '@/config/navigation-catalog'

export function AgentFrequentAccess() {
  const featured = getFeaturedResources()

  return (
    <section aria-label="Accesos frecuentes">
      <div className="mb-4">
        <h2 className="text-base font-semibold text-brand-strong">Accesos frecuentes</h2>
        <p className="text-sm text-muted">
          Recursos destacados del sistema de uso habitual.
        </p>
      </div>

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {featured.map((resource) => (
          <Link
            key={resource.id}
            to={resource.route}
            className="group flex items-start gap-3 rounded-xl border border-border bg-white p-4 shadow-sm transition hover:border-brand/30 hover:shadow-panel focus:outline-none focus-visible:ring-2 focus-visible:ring-brand focus-visible:ring-offset-1"
          >
            <div className="flex-1 min-w-0">
              <div className="flex items-start justify-between gap-2">
                <p className="font-semibold text-sm text-brand-strong leading-snug group-hover:text-brand transition">
                  {resource.title}
                </p>
                <ArrowRight className="mt-0.5 h-4 w-4 shrink-0 text-muted opacity-0 transition group-hover:opacity-100" />
              </div>
              <p className="mt-0.5 text-xs text-muted">{resource.workspaceLabel}</p>
              <p className="mt-1 line-clamp-1 text-xs text-muted/70">
                {resourceTypeLabels[resource.type]} · {resource.category}
              </p>
            </div>
          </Link>
        ))}
      </div>
    </section>
  )
}
