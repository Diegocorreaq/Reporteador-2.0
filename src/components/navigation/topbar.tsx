import { useState } from 'react'
import { Link, useLocation, useNavigate } from 'react-router-dom'
import { ExternalLink, LogOut, Menu, UserRound } from 'lucide-react'
import { workspaceMeta } from '@/config/module-registry'
import { menuService } from '@/services/menu/menu.service'
import { useAuthStore } from '@/modules/auth/store/use-auth-store'
import { Badge } from '@/components/ui/badge'
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
}: {
  className?: string
  link: WorkspaceQuickLink
}) {
  const Icon = link.icon ?? ExternalLink

  if (link.to) {
    return (
      <Button asChild className={className} size="sm" variant="outline">
        <Link to={link.to}>
          <Icon className="h-4 w-4" />
          <span>{link.label}</span>
        </Link>
      </Button>
    )
  }

  return (
    <Button asChild className={className} size="sm" variant="outline">
      <a href={link.href} rel={link.external ? 'noreferrer' : undefined} target={link.external ? '_blank' : undefined}>
        <Icon className="h-4 w-4" />
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
    <Button asChild size="sm" variant={active ? 'default' : 'outline'}>
      <Link to={to}>{label}</Link>
    </Button>
  )
}

export function Topbar({ workspace, onOpenMobile }: TopbarProps) {
  const location = useLocation()
  const navigate = useNavigate()
  const user = useAuthStore((state) => state.user)
  const signOut = useAuthStore((state) => state.signOut)
  const currentItem = menuService.findItem(location.pathname)
  const quickLinks = menuService.getQuickLinks(workspace, user)
  const [mobileQuickLinksOpen, setMobileQuickLinksOpen] = useState(false)

  const handleLogout = () => {
    signOut()
    navigate('/login')
  }

  return (
    <header className="sticky top-0 z-20 border-b border-white/70 bg-canvas/92 backdrop-blur">
      <div className="mx-auto flex max-w-[1680px] flex-col gap-4 px-4 py-4 sm:px-6 lg:px-8">
        <div className="flex flex-col gap-4 xl:flex-row xl:items-start xl:justify-between">
          <div className="flex min-w-0 items-start gap-3">
            <Button className="mt-0.5 lg:hidden" size="icon" variant="outline" onClick={onOpenMobile}>
              <Menu className="h-4 w-4" />
            </Button>
            <div className="min-w-0 space-y-2">
              <div className="flex flex-wrap items-center gap-2">
                <Badge variant="brand">{workspaceMeta[workspace].shortLabel}</Badge>
                <span className="truncate text-base font-semibold text-text">
                  {currentItem?.label ?? workspaceMeta[workspace].label}
                </span>
              </div>
              <p className="max-w-3xl text-sm leading-6 text-muted">
                {currentItem?.description ??
                  (workspace === 'main'
                    ? 'Acceda a los reportes y consultas del Reporteador.'
                    : 'Acceda a las consultas operativas de Datos en Linea.')}
              </p>
            </div>
          </div>

          <Dialog>
            <DialogTrigger asChild>
              <Button className="h-auto justify-start rounded-[22px] px-3 py-2" variant="outline">
                <span className="flex h-10 w-10 items-center justify-center rounded-2xl bg-panelAlt text-text">
                  {getInitials(user?.name)}
                </span>
                <span className="min-w-0 text-left">
                  <span className="block truncate text-sm font-semibold text-text">{user?.name ?? 'Usuario'}</span>
                  <span className="block truncate text-xs text-muted">{user?.role ?? 'Sin perfil'}</span>
                </span>
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
                  <p className="mt-1 text-sm text-muted">
                    Puede cambiar entre Principal y Datos en Linea usando los botones superiores.
                  </p>
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

        <div className="flex flex-wrap items-center gap-2">
          <div className="flex flex-wrap items-center gap-2">
            <WorkspaceSwitchButton active={workspace === 'main'} label="Principal" to="/app" />
            <WorkspaceSwitchButton active={workspace === 'sigh'} label="Datos en Linea" to="/sigh" />
          </div>
          <div className="hidden flex-wrap items-center gap-2 lg:flex">
            {quickLinks.map((link) => (
              <QuickLinkButton key={link.key} link={link} />
            ))}
          </div>
          <Button
            className="lg:hidden"
            size="sm"
            variant="outline"
            onClick={() => setMobileQuickLinksOpen((current) => !current)}
          >
            <UserRound className="h-4 w-4" />
            Accesos rapidos
          </Button>
        </div>

        {mobileQuickLinksOpen ? (
          <div className="grid gap-2 lg:hidden">
            {quickLinks.map((link) => (
              <QuickLinkButton className="justify-between" key={link.key} link={link} />
            ))}
          </div>
        ) : null}
      </div>
    </header>
  )
}
