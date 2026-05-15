import { useEffect, useRef, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { LogOut, Menu, MoreHorizontal, User } from 'lucide-react'
import { menuService } from '@/services/menu/menu.service'
import { useAuthStore } from '@/modules/auth/store/use-auth-store'
import { clearCentroOrientacionOnboardingSession } from '@/modules/onboarding/hooks/use-centro-orientacion-onboarding'
import { WorkspaceQuickLinkAction } from '@/components/navigation/workspace-quick-link-action'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'
import type { WorkspaceQuickLink } from '@/types/navigation'
import type { WorkspaceKey } from '@/types/auth'

interface TopbarProps {
  workspace: WorkspaceKey
  onOpenMobile: () => void
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
            <WorkspaceQuickLinkAction
              className="justify-start"
              key={link.key}
              link={link}
              onSelect={() => setOpen(false)}
            />
          ))}
        </div>
      ) : null}
    </div>
  )
}

function resolveUserDisplayName(rawName?: string | null) {
  const cleanName = rawName?.trim().replace(/\s+/g, ' ') ?? ''

  return cleanName || null
}

function UserMenu({
  onLogout,
  userName,
}: {
  onLogout: () => void
  userName?: string | null
}) {
  const [open, setOpen] = useState(false)
  const containerRef = useRef<HTMLDivElement | null>(null)
  const displayName = resolveUserDisplayName(userName) ?? 'Usuario'

  useEffect(() => {
    if (!open) {
      return
    }

    const handlePointerDown = (event: MouseEvent) => {
      if (!containerRef.current?.contains(event.target as Node)) {
        setOpen(false)
      }
    }

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        setOpen(false)
      }
    }

    document.addEventListener('mousedown', handlePointerDown)
    document.addEventListener('keydown', handleKeyDown)
    return () => {
      document.removeEventListener('mousedown', handlePointerDown)
      document.removeEventListener('keydown', handleKeyDown)
    }
  }, [open])

  const handleLogout = () => {
    setOpen(false)
    onLogout()
  }

  return (
    <div className="relative" ref={containerRef}>
      <Button
        aria-expanded={open}
        aria-haspopup="menu"
        aria-label="Opciones de usuario"
        className="h-8 max-w-[220px] rounded-lg bg-brand-soft px-2.5 text-brand-strong hover:bg-brand-soft/80 hover:text-brand-strong"
        size="sm"
        title="Opciones de usuario"
        type="button"
        variant="ghost"
        onClick={() => setOpen((current) => !current)}
      >
        <User className="h-4 w-4" />
        <span className="hidden max-w-[150px] truncate whitespace-nowrap text-xs font-semibold md:inline">
          {displayName}
        </span>
      </Button>
      {open ? (
        <div className="absolute right-0 top-full z-30 mt-2 min-w-[180px] rounded-xl border border-border bg-white p-1.5 shadow-lg">
          <button
            className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-sm font-medium text-text transition hover:bg-canvas"
            type="button"
            onClick={handleLogout}
          >
            <LogOut className="h-4 w-4" />
            Cerrar sesion
          </button>
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
    // Clear the server-side session cookie before wiping local state
    import('@/services/auth/auth.service').then(({ authService }) => {
      authService.signOut().catch(() => {
        // Proceed with local cleanup even if the backend call fails
      })
    })
    clearCentroOrientacionOnboardingSession()
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

        {/* Workspace switcher */}
        <div className="flex items-center rounded-lg border border-border bg-canvas p-0.5">
          <WorkspaceSwitchButton active={workspace === 'main'} label="Principal" to="/app" />
          <WorkspaceSwitchButton active={workspace === 'sigh'} label="Datos en Linea" to="/sigh" />
        </div>

        {/* Right side actions */}
        <div className="ml-auto flex items-center gap-2">
          {/* Quick links - desktop */}
          <div className="hidden items-center gap-1.5 lg:flex xl:hidden">
            {compactQuickLinks.map((link) => (
              <WorkspaceQuickLinkAction key={link.key} link={link} />
            ))}
            <QuickLinksOverflow links={overflowQuickLinks} />
          </div>

          {/* Quick links - large desktop */}
          <div className="hidden items-center gap-1.5 xl:flex">
            {quickLinks.map((link) => (
              <WorkspaceQuickLinkAction key={link.key} link={link} />
            ))}
          </div>

          {/* Quick links - mobile */}
          <div className="lg:hidden">
            <QuickLinksOverflow links={quickLinks} />
          </div>

          {/* User menu */}
          <UserMenu onLogout={handleLogout} userName={user?.name} />
        </div>
      </div>
    </header>
  )
}
