import { Link } from 'react-router-dom'
import { ArrowRight, ExternalLink } from 'lucide-react'
import { DatosEnLineaLauncher } from '@/components/navigation/datos-en-linea-launcher'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'
import type { WorkspaceQuickLink } from '@/types/navigation'

interface WorkspaceQuickLinkActionProps {
  link: WorkspaceQuickLink
  view?: 'topbar' | 'home'
  className?: string
  onSelect?: () => void
}

function getAnchorTarget(link: WorkspaceQuickLink) {
  return link.external ? '_blank' : undefined
}

function getAnchorRel(link: WorkspaceQuickLink) {
  return link.external ? 'noopener noreferrer' : undefined
}

export function WorkspaceQuickLinkAction({
  link,
  view = 'topbar',
  className,
  onSelect,
}: WorkspaceQuickLinkActionProps) {
  const Icon = link.icon ?? ExternalLink
  const isPortalPpr = link.key === 'portal-ppr'
  const portalPprTopbarClass =
    'border-[#6D28D9] bg-[#6D28D9] text-white shadow-sm shadow-violet-500/25 hover:border-[#5B21B6] hover:bg-[#5B21B6] hover:text-white'
  const portalPprHomeClass = 'border-[#6D28D9]/35 bg-violet-50 hover:border-[#6D28D9]/70 hover:bg-violet-100'
  const portalPprIconClass = 'bg-[#6D28D9] text-white'

  if (link.actionType === 'datos-en-linea-launcher') {
    return (
      <DatosEnLineaLauncher
        className={className}
        description={link.description}
        icon={Icon}
        label={link.label}
        view={view}
        onLinkOpened={onSelect}
      />
    )
  }

  if (view === 'home') {
    if (link.to) {
      return (
        <Link
          className={cn(
            'group flex w-full items-center gap-3 rounded-xl border border-border bg-white p-4 transition hover:border-brand/40 hover:bg-brand-soft/20',
            isPortalPpr && portalPprHomeClass,
            className,
          )}
          to={link.to}
        >
          <div
            className={cn(
              'flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-brand-soft',
              isPortalPpr && portalPprIconClass,
            )}
          >
            <Icon className={cn('h-5 w-5 text-brand-strong', isPortalPpr && 'text-white')} />
          </div>
          <div className="min-w-0 flex-1">
            <p className="font-semibold text-brand-strong">{link.label}</p>
            <p className="text-xs text-muted">{link.description}</p>
          </div>
          <ArrowRight className="h-4 w-4 shrink-0 text-muted" />
        </Link>
      )
    }

    return (
      <a
        className={cn(
          'group flex w-full items-center gap-3 rounded-xl border border-border bg-white p-4 transition hover:border-brand/40 hover:bg-brand-soft/20',
          isPortalPpr && portalPprHomeClass,
          className,
        )}
        href={link.href}
        rel={getAnchorRel(link)}
        target={getAnchorTarget(link)}
      >
        <div
          className={cn(
            'flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-brand-soft',
            isPortalPpr && portalPprIconClass,
          )}
        >
          <Icon className={cn('h-5 w-5 text-brand-strong', isPortalPpr && 'text-white')} />
        </div>
        <div className="min-w-0 flex-1">
          <p className="font-semibold text-brand-strong">{link.label}</p>
          <p className="text-xs text-muted">{link.description}</p>
        </div>
        <ArrowRight className="h-4 w-4 shrink-0 text-muted" />
      </a>
    )
  }

  if (link.to) {
    return (
      <Button
        asChild
        className={cn('h-8 rounded-lg px-3 text-xs font-medium', isPortalPpr && portalPprTopbarClass, className)}
        size="sm"
        variant="outline"
      >
        <Link to={link.to} onClick={onSelect}>
          <Icon className="h-3.5 w-3.5" />
          <span>{link.label}</span>
        </Link>
      </Button>
    )
  }

  return (
    <Button asChild className={cn('h-8 rounded-lg px-3 text-xs font-medium', className)} size="sm" variant="outline">
      <a href={link.href} rel={getAnchorRel(link)} target={getAnchorTarget(link)} onClick={onSelect}>
        <Icon className="h-3.5 w-3.5" />
        <span>{link.label}</span>
      </a>
    </Button>
  )
}
