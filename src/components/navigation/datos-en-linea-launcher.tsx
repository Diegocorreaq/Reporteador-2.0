import { useMemo, useState } from 'react'
import { AlertCircle, ExternalLink, Server } from 'lucide-react'
import type { LucideIcon } from 'lucide-react'
import { datosEnLineaServers } from '@/config/datos-en-linea-servers'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { cn } from '@/lib/utils'

interface DatosEnLineaLauncherProps {
  label: string
  description: string
  icon?: LucideIcon
  view?: 'topbar' | 'home'
  className?: string
  onLinkOpened?: () => void
}

function ServerOptionCard({
  name,
  detail,
  href,
  available,
  onOpen,
}: {
  name: string
  detail: string
  href: string
  available: boolean
  onOpen: () => void
}) {
  return (
    <article
      className={cn(
        'rounded-xl border p-3',
        available ? 'border-border/80 bg-white' : 'border-amber-200/70 bg-amber-50/40',
      )}
    >
      <div className="flex items-start justify-between gap-2">
        <div className="space-y-1">
          <p className="text-sm font-semibold text-brand-strong">{name}</p>
          <p className="text-xs text-muted">{detail}</p>
        </div>
        <Badge variant={available ? 'success' : 'warning'}>
          {available ? 'Disponible' : 'Sin URL'}
        </Badge>
      </div>
      <p className="mt-2 break-all rounded-md border border-border/70 bg-canvas/40 px-2 py-1 text-[11px] text-muted">
        {available ? href : 'URL no configurada en variables de entorno.'}
      </p>
      <div className="mt-3 flex justify-end">
        {available ? (
          <Button asChild size="sm" variant="outline">
            <a href={href} rel="noopener noreferrer" target="_blank" onClick={onOpen}>
              <ExternalLink className="h-3.5 w-3.5" />
              Abrir
            </a>
          </Button>
        ) : (
          <Button disabled size="sm" variant="outline">
            No disponible
          </Button>
        )}
      </div>
    </article>
  )
}

export function DatosEnLineaLauncher({
  label,
  description,
  icon: TriggerIcon = Server,
  view = 'topbar',
  className,
  onLinkOpened,
}: DatosEnLineaLauncherProps) {
  const [open, setOpen] = useState(false)

  const availableCount = useMemo(
    () => datosEnLineaServers.filter((server) => server.available).length,
    [],
  )

  const handleServerOpen = () => {
    setOpen(false)
  }

  const handleDialogOpenChange = (nextOpen: boolean) => {
    setOpen(nextOpen)
    if (!nextOpen) {
      onLinkOpened?.()
    }
  }

  return (
    <>
      {view === 'home' ? (
        <button
          aria-haspopup="dialog"
          className={cn(
            'group flex w-full items-center gap-3 rounded-xl border border-border bg-white p-4 text-left transition hover:border-brand/40 hover:bg-brand-soft/20 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand/40',
            className,
          )}
          type="button"
          onClick={() => setOpen(true)}
        >
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-brand-soft">
            <TriggerIcon className="h-5 w-5 text-brand-strong" />
          </div>
          <div className="min-w-0 flex-1">
            <p className="font-semibold text-brand-strong">{label}</p>
            <p className="text-xs text-muted">{description}</p>
            <p className="mt-1 text-[11px] text-muted">
              {availableCount > 0
                ? `${availableCount} servidor(es) disponible(s)`
                : 'No hay servidores configurados'}
            </p>
          </div>
          <ExternalLink className="h-4 w-4 shrink-0 text-muted" />
        </button>
      ) : (
        <Button
          aria-haspopup="dialog"
          className={cn('h-8 rounded-lg px-3 text-xs font-medium', className)}
          size="sm"
          type="button"
          variant="outline"
          onClick={() => setOpen(true)}
        >
          <TriggerIcon className="h-3.5 w-3.5" />
          <span>{label}</span>
        </Button>
      )}

      <Dialog open={open} onOpenChange={handleDialogOpenChange}>
        <DialogContent className="w-[min(96vw,760px)]">
          <DialogHeader>
            <DialogTitle>Datos en Linea</DialogTitle>
            <DialogDescription>
              Seleccione el servidor que desea abrir para realizar su consulta.
            </DialogDescription>
          </DialogHeader>

          {availableCount === 0 ? (
            <div className="rounded-xl border border-amber-200 bg-amber-50/60 p-4 text-sm text-amber-800">
              <div className="flex items-center gap-2 font-semibold">
                <AlertCircle className="h-4 w-4" />
                No hay servidores configurados
              </div>
              <p className="mt-1 text-xs">
                Configure al menos una URL `VITE_DATOS_EN_LINEA_SERVER_*_URL` para habilitar este acceso.
              </p>
            </div>
          ) : null}

          <div className="grid gap-3 sm:grid-cols-2">
            {datosEnLineaServers.map((server) => (
              <ServerOptionCard
                key={server.id}
                available={server.available}
                detail={server.description}
                href={server.href}
                name={server.label}
                onOpen={handleServerOpen}
              />
            ))}
          </div>
        </DialogContent>
      </Dialog>
    </>
  )
}
