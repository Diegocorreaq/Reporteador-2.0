import { Link } from 'react-router-dom'
import { ArrowRight, ExternalLink } from 'lucide-react'
import { resourceTypeLabels, type CatalogResource } from '@/config/navigation-catalog'

interface AgentResultCardProps {
  resource: CatalogResource
}

const workspaceBadgeClass: Record<CatalogResource['workspace'], string> = {
  principal: 'bg-brand-soft text-brand border-brand/20',
  'datos-en-linea': 'bg-accent-soft text-accent-strong border-accent/20',
}

const typeBadgeClass: Record<CatalogResource['type'], string> = {
  exportable: 'bg-emerald-50 text-emerald-700 border-emerald-200',
  tablero: 'bg-violet-50 text-violet-700 border-violet-200',
  monitoreo: 'bg-sky-50 text-sky-700 border-sky-200',
  vista: 'bg-slate-50 text-slate-700 border-slate-200',
  reporte: 'bg-orange-50 text-orange-700 border-orange-200',
}

export function AgentResultCard({ resource }: AgentResultCardProps) {
  const isExternal = false

  return (
    <div className="group rounded-xl border border-border bg-white p-4 shadow-sm transition hover:border-brand/30 hover:shadow-panel">
      {/* Badges row */}
      <div className="mb-3 flex flex-wrap items-center gap-2">
        <span
          className={`inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-medium ${workspaceBadgeClass[resource.workspace]}`}
        >
          {resource.workspaceLabel}
        </span>
        <span
          className={`inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-medium ${typeBadgeClass[resource.type]}`}
        >
          {resourceTypeLabels[resource.type]}
        </span>
      </div>

      {/* Title and description */}
      <h3 className="font-semibold text-brand-strong leading-snug">{resource.title}</h3>
      {resource.legacyName && (
        <p className="mt-0.5 text-xs text-muted/80 italic">{resource.legacyName}</p>
      )}
      <p className="mt-1.5 line-clamp-2 text-sm text-muted">{resource.description}</p>

      {/* Breadcrumb path */}
      <p className="mt-2 text-xs text-muted/70">
        <span className="font-medium">{resource.breadcrumb}</span>
      </p>

      {/* Actions */}
      <div className="mt-3 flex flex-wrap items-center gap-2">
        <Link
          to={resource.route}
          className="inline-flex items-center gap-1.5 rounded-lg bg-brand px-3.5 py-1.5 text-sm font-medium text-white transition hover:bg-brand-strong focus:outline-none focus-visible:ring-2 focus-visible:ring-brand focus-visible:ring-offset-1"
        >
          {isExternal ? <ExternalLink className="h-3.5 w-3.5" /> : <ArrowRight className="h-3.5 w-3.5" />}
          Abrir
        </Link>
      </div>
    </div>
  )
}
