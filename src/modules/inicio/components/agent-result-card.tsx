import { useState } from 'react'
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

interface ContextBlockProps {
  title: string
  items?: string[]
}

function ContextBlock({ title, items }: ContextBlockProps) {
  if (!items || items.length === 0) return null

  const visibleItems = items.slice(0, 3)
  const remainingItems = items.length - visibleItems.length

  return (
    <div>
      <p className="text-xs font-semibold text-brand-strong">{title}</p>
      <ul className="mt-1.5 space-y-1 text-xs leading-relaxed text-muted">
        {visibleItems.map((item) => (
          <li key={item} className="flex gap-1.5">
            <span className="mt-1.5 h-1 w-1 shrink-0 rounded-full bg-brand/50" />
            <span>{item}</span>
          </li>
        ))}
        {remainingItems > 0 && (
          <li className="pl-2.5 text-muted/80">+ {remainingItems} más</li>
        )}
      </ul>
    </div>
  )
}

export function AgentResultCard({ resource }: AgentResultCardProps) {
  const [expanded, setExpanded] = useState(false)
  const isExternal = false
  const primaryText = resource.summary ?? resource.description
  const hasContext =
    Boolean(resource.useCases?.length) ||
    Boolean(resource.questions?.length) ||
    Boolean(resource.mainIndicators?.length)

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
      <p className="mt-1.5 line-clamp-2 text-sm leading-relaxed text-muted">{primaryText}</p>

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
        {hasContext && (
          <button
            type="button"
            onClick={() => setExpanded((current) => !current)}
            aria-expanded={expanded}
            className="inline-flex items-center rounded-lg px-2.5 py-1.5 text-sm font-medium text-brand transition hover:bg-brand-soft/60 focus:outline-none focus-visible:ring-2 focus-visible:ring-brand focus-visible:ring-offset-1"
          >
            {expanded ? 'Ocultar detalle' : 'Ver detalle'}
          </button>
        )}
      </div>

      {hasContext && expanded && (
        <div className="mt-4 space-y-3 border-t border-border/70 pt-3">
          <ContextBlock title="Te sirve para" items={resource.useCases ?? resource.questions} />
          <ContextBlock title="Indicadores principales" items={resource.mainIndicators} />
        </div>
      )}
    </div>
  )
}
