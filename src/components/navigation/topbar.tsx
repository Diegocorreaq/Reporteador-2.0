import { useEffect, useRef, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { ChevronLeft, ChevronRight, ExternalLink, LogOut, Menu, MoreHorizontal, User } from 'lucide-react'
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
  collapsed: boolean
  workspace: WorkspaceKey
  onOpenMobile: () => void
  onToggleSidebar: () => void
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
      <Button asChild className={cn('h-8 rounded-lg px-3 text-xs font-medium', className)} size="sm" variant="outline">
        <Link to={link.to} onClick={onSelect}>
          <Icon className="h-3.5 w-3.5" />
          <span>{link.label}</span>
        </Link>
      </Button>
    )
  }

  return (
    <Button asChild className={cn('h-8 rounded-lg px-3 text-xs font-medium', className)} size="sm" variant="outline">
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
        'h-7 rounded-md px-3 text-xs font-semibold shadow-none',
        active
          ? 'bg-brand text-white hover:bg-brand'
          : 'bg-transparent text-muted hover:bg-panelAlt hover:text-text',
      )}
      size="sm"
      variant="ghost"
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
        className="h-8 rounded-lg px-2.5 text-xs font-medium"
        size="sm"
        type="button"
        variant="outline"
        onClick={() => setOpen((current) => !current)}
      >
        <MoreHorizontal className="h-3.5 w-3.5" />
        <span className="hidden sm:inline">Mas</span>
      </Button>
      {open ? (
        <div className="absolute right-0 top-full z-30 mt-2 flex min-w-[240px] flex-col gap-1 rounded-xl border border-border bg-white p-2 shadow-lg">
          {links.map((link) => (
            <QuickLinkButton className="justify-start" key={link.key} link={link} onSelect={() => setOpen(false)} />
          ))}
        </div>
      ) : null}
    </div>
  )
}

export function Topbar({ collapsed, workspace, onOpenMobile, onToggleSidebar }: TopbarProps) {
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
    <header className="sticky top-0 z-20 border-b border-border bg-white">
      <div className="mx-auto flex h-14 max-w-[1680px] items-center gap-3 px-4 sm:px-5 lg:px-6">
        {/* Mobile menu button */}
        <Button
          className="h-8 w-8 rounded-lg lg:hidden"
          size="icon"
          variant="outline"
          onClick={onOpenMobile}
        >
          <Menu className="h-4 w-4" />
        </Button>

        {/* Desktop sidebar toggle */}
        <Button
          className="hidden h-8 w-8 rounded-lg lg:inline-flex"
          size="icon"
          title={collapsed ? 'Expandir sidebar' : 'Colapsar sidebar'}
          variant="outline"
          onClick={onToggleSidebar}
        >
          {collapsed ? <ChevronRight className="h-4 w-4" /> : <ChevronLeft className="h-4 w-4" />}
        </Button>

        {/* Logo and workspace name */}
        <Link className="flex items-center gap-2.5" to={workspace === 'main' ? '/app' : '/sigh'}>
          <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-brand-soft">
            <img alt="Reporteador" className="h-5 w-5" src="/logo-mark.svg" />
          </span>
          <span className="hidden text-sm font-semibold text-brand-strong sm:inline">
            Reporteador HEVES
          </span>
        </Link>

        {/* Workspace switcher */}
        <div className="ml-1 flex items-center rounded-lg border border-border bg-canvas p-0.5">
          <WorkspaceSwitchButton active={workspace === 'main'} label="Principal" to="/app" />
          <WorkspaceSwitchButton active={workspace === 'sigh'} label="Datos en Linea" to="/sigh" />
        </div>

        {/* Right side actions */}
        <div className="ml-auto flex items-center gap-2">
          {/* Quick links - desktop */}
          <div className="hidden items-center gap-1.5 lg:flex 2xl:hidden">
            {compactQuickLinks.map((link) => (
              <QuickLinkButton key={link.key} link={link} />
            ))}
            <QuickLinksOverflow links={overflowQuickLinks} />
          </div>

          {/* Quick links - large desktop */}
          <div className="hidden items-center gap-1.5 2xl:flex">
            {quickLinks.map((link) => (
              <QuickLinkButton key={link.key} link={link} />
            ))}
          </div>

          {/* Quick links - mobile */}
          <div className="lg:hidden">
            <QuickLinksOverflow links={quickLinks} />
          </div>

          {/* User menu */}
          <Dialog>
            <DialogTrigger asChild>
              <Button className="h-8 w-8 rounded-lg bg-brand-soft hover:bg-brand-soft/80" size="icon" variant="ghost">
                <span className="text-xs font-bold text-brand-strong">{getInitials(user?.name)}</span>
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-md">
              <DialogHeader>
                <div className="flex items-center gap-3">
                  <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-brand-soft">
                    <User className="h-6 w-6 text-brand-strong" />
                  </div>
                  <div>
                    <DialogTitle>Mi Cuenta</DialogTitle>
                    <DialogDescription>Informacion de usuario y sesion activa</DialogDescription>
                  </div>
                </div>
              </DialogHeader>
              
              <div className="space-y-3">
                <div className="rounded-xl border border-border bg-canvas p-4">
                  <p className="text-[10px] font-bold uppercase tracking-[0.15em] text-muted">Usuario</p>
                  <p className="mt-1.5 text-sm font-semibold text-text">{user?.name ?? 'Usuario'}</p>
                  <p className="mt-0.5 text-sm text-muted">{user?.email ?? 'sin correo registrado'}</p>
                </div>
                
                <div className="grid grid-cols-2 gap-3">
                  <div className="rounded-xl border border-border bg-canvas p-4">
                    <p className="text-[10px] font-bold uppercase tracking-[0.15em] text-muted">Perfil</p>
                    <p className="mt-1.5 text-sm font-semibold text-text">{user?.role ?? 'Sin perfil'}</p>
                  </div>
                  <div className="rounded-xl border border-border bg-canvas p-4">
                    <p className="text-[10px] font-bold uppercase tracking-[0.15em] text-muted">Servicio</p>
                    <p className="mt-1.5 text-sm font-semibold text-text">{user?.service ?? 'Sin asignar'}</p>
                  </div>
                </div>
                
                <div className="rounded-xl border border-brand/20 bg-brand-soft/50 p-4">
                  <p className="text-[10px] font-bold uppercase tracking-[0.15em] text-brand">Ambiente Actual</p>
                  <p className="mt-1.5 text-sm font-semibold text-brand-strong">
                    {workspaceMeta[workspace].label}
                  </p>
                </div>
              </div>

              <DialogFooter>
                <Button className="w-full rounded-xl sm:w-auto" variant="danger" onClick={handleLogout}>
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
