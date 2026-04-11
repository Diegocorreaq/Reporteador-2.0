import { useEffect, useRef, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { ExternalLink, LogOut, Menu, MoreHorizontal } from 'lucide-react'
import { workspaceMeta } from '@/config/module-registry'
import { menuService } from '@/services/menu/menu.service'
import { useAuthStore } from '@/modules/auth/store/use-auth-store'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog'
import { cn } from '@/lib/utils'
import type { WorkspaceQuickLink } from '@/types/navigation'
import type { WorkspaceKey } from '@/types/auth'

interface TopbarProps {
  workspace: WorkspaceKey
  onOpenMobile: () => void
}

function getInitials(name?: string) {
  if (!name) return 'US'

  return name
    .split(' ')
    .filter(Boolean)
    .slice(0, 2)
    .map((segment) => segment[0]?.toUpperCase() ?? '')
    .join('')
}

function QuickLinkButton({
  className,
  link,
  onSelect,
}: {
  className?: string
  link: WorkspaceQuickLink
  onSelect?: () => void
}) {
  const Icon = link.icon ?? ExternalLink

  if (link.to) {
    return (
      <Button asChild className={cn('h-8 rounded-xl px-2.5 text-xs font-medium', className)} size="sm" variant="outline">
        <Link to={link.to} onClick={onSelect}>
          <Icon className="h-3.5 w-3.5" />
          <span>{link.label}</span>
        </Link>
      </Button>
    )
  }

  return (
    <Button asChild className={cn('h-8 rounded-xl px-2.5 text-xs font-medium', className)} size="sm" variant="outline">
      <a
        href={link.href}
        rel={link.external ? 'noreferrer' : undefined}
        target={link.external ? '_blank' : undefined}
        onClick={onSelect}
      >
        <Icon className="h-3.5 w-3.5" />
        <span>{link.label}</span>
      </a>
    </Button>
  )
}

function WorkspaceSwitchButton({
  active,
  label,
  to,
}: {
  active: boolean
  label: string
  to: string
}) {
  return (
    <Button
      asChild
      className={cn(
        'h-8 rounded-[10px] px-2.5 text-xs font-semibold shadow-none sm:px-3',
        active ? 'pointer-events-none' : '',
      )}
      size="sm"
      variant={active ? 'default' : 'ghost'}
    >
      <Link to={to}>{label}</Link>
    </Button>
  )
}

function QuickLinksOverflow({ links }: { links: WorkspaceQuickLink[] }) {
  const [open, setOpen] = useState(false)
  const containerRef = useRef<HTMLDivElement | null>(null)

  useEffect(() => {
    if (!open) {
      return
    }

    const handlePointerDown = (event: MouseEvent) => {
      if (!containerRef.current?.contains(event.target as Node)) {
        setOpen(false)
      }
    }

    document.addEventListener('mousedown', handlePointerDown)
    return () => document.removeEventListener('mousedown', handlePointerDown)
  }, [open])

  if (!links.length) {
    return null
  }

  return (
    <div className="relative" ref={containerRef}>
      <Button
        className="h-8 rounded-xl px-2.5 text-xs font-medium"
        size="sm"
        type="button"
        variant="outline"
        onClick={() => setOpen((current) => !current)}
      >
        <MoreHorizontal className="h-3.5 w-3.5" />
        Mas
      </Button>
      {open ? (
        <div className="absolute right-0 top-full z-30 mt-2 flex min-w-[270px] flex-col gap-1 rounded-2xl border border-white/80 bg-white/95 p-2 shadow-shell backdrop-blur">
          {links.map((link) => (
            <QuickLinkButton className="justify-start" key={link.key} link={link} onSelect={() => setOpen(false)} />
          ))}
        </div>
      ) : null}
    </div>
  )
}

export function Topbar({ workspace, onOpenMobile }: TopbarProps) {
  const navigate = useNavigate()
  const user = useAuthStore((state) => state.user)
  const signOut = useAuthStore((state) => state.signOut)
  const quickLinks = menuService.getQuickLinks(workspace, user)
  const compactQuickLinks = quickLinks.slice(0, 2)
  const overflowQuickLinks = quickLinks.slice(2)

  const handleLogout = () => {
    signOut()
    navigate('/login')
  }

  return (
    <header className="sticky top-0 z-20 border-b border-white/70 bg-canvas/94 backdrop-blur">
      <div className="mx-auto flex h-14 max-w-[1680px] items-center gap-2 px-3 sm:px-5 lg:px-6">
        <Button className="h-8 w-8 rounded-xl lg:hidden" size="icon" variant="outline" onClick={onOpenMobile}>
          <Menu className="h-4 w-4" />
        </Button>

        <Link className="flex items-center gap-2" to={workspace === 'main' ? '/app' : '/sigh'}>
          <span className="flex h-8 w-8 items-center justify-center rounded-xl bg-white shadow-sm">
            <img alt="Reporteador" className="h-5 w-5" src="/logo-mark.svg" />
          </span>
          <span className="hidden text-sm font-semibold text-text sm:inline">Reporteador HEVES</span>
        </Link>

        <div className="ml-1 flex min-w-0 items-center rounded-[14px] border border-border bg-white/85 p-1">
          <WorkspaceSwitchButton active={workspace === 'main'} label="Principal" to="/app" />
          <WorkspaceSwitchButton active={workspace === 'sigh'} label="Datos en Linea" to="/sigh" />
        </div>

        <div className="ml-auto flex items-center gap-1.5">
          <div className="hidden items-center gap-1.5 lg:flex 2xl:hidden">
            {compactQuickLinks.map((link) => (
              <QuickLinkButton key={link.key} link={link} />
            ))}
            <QuickLinksOverflow links={overflowQuickLinks} />
          </div>

          <div className="hidden items-center gap-1.5 2xl:flex">
            {quickLinks.map((link) => (
              <QuickLinkButton key={link.key} link={link} />
            ))}
          </div>

          <div className="lg:hidden">
            <QuickLinksOverflow links={quickLinks} />
          </div>

          <Dialog>
            <DialogTrigger asChild>
              <Button className="h-8 w-8 rounded-xl" size="icon" variant="outline">
                <span className="text-xs font-semibold text-text">{getInitials(user?.name)}</span>
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-lg">
              <DialogHeader>
                <DialogTitle>Cuenta</DialogTitle>
                <DialogDescription>Revise sus datos de acceso y cierre la sesion cuando termine.</DialogDescription>
              </DialogHeader>
              <div className="grid gap-3 sm:grid-cols-2">
                <div className="rounded-[24px] border border-border bg-panelAlt/50 p-4">
                  <p className="text-xs font-semibold uppercase tracking-[0.16em] text-muted">Usuario</p>
                  <p className="mt-2 text-sm font-semibold text-text">{user?.name ?? 'Usuario'}</p>
                  <p className="mt-1 text-sm text-muted">{user?.email ?? 'sin correo registrado'}</p>
                </div>
                <div className="rounded-[24px] border border-border bg-panelAlt/50 p-4">
                  <p className="text-xs font-semibold uppercase tracking-[0.16em] text-muted">Perfil</p>
                  <p className="mt-2 text-sm font-semibold text-text">{user?.role ?? 'Sin perfil'}</p>
                  <p className="mt-1 text-sm text-muted">{user?.service ?? 'Sin servicio asignado'}</p>
                </div>
                <div className="rounded-[24px] border border-border bg-panelAlt/50 p-4 sm:col-span-2">
                  <p className="text-xs font-semibold uppercase tracking-[0.16em] text-muted">Ambiente actual</p>
                  <p className="mt-2 text-sm font-semibold text-text">{workspaceMeta[workspace].label}</p>
                </div>
              </div>
              <DialogFooter>
                <Button variant="danger" onClick={handleLogout}>
                  <LogOut className="h-4 w-4" />
                  Cerrar sesion
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>
      </div>
    </header>
  )
}
