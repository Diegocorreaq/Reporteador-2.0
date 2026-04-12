import { AlertCircle } from 'lucide-react'
import { Alert } from '@/components/ui/alert'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'

interface SisgalenValidationDialogProps {
  open: boolean
  username: string
  password: string
  isSubmitting?: boolean
  error?: string | null
  onUsernameChange: (value: string) => void
  onPasswordChange: (value: string) => void
  onSubmit: () => void
  onOpenChange?: (open: boolean) => void
  title?: string
  description?: string
}

export function SisgalenValidationDialog({
  open,
  username,
  password,
  isSubmitting = false,
  error = null,
  onUsernameChange,
  onPasswordChange,
  onSubmit,
  onOpenChange,
  title = 'Permisos para acceder a reportes nominales',
  description = 'Ingrese numero de DNI y contrasena SISGALEN.',
}: SisgalenValidationDialogProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
          <DialogDescription>{description}</DialogDescription>
        </DialogHeader>
        <div className="space-y-3">
          <div>
            <label className="mb-1 block text-xs font-semibold text-muted" htmlFor="sisgalen-usuario">
              Numero de DNI
            </label>
            <Input id="sisgalen-usuario" value={username} onChange={(event) => onUsernameChange(event.target.value)} />
          </div>
          <div>
            <label className="mb-1 block text-xs font-semibold text-muted" htmlFor="sisgalen-clave">
              Contrasena SISGALEN
            </label>
            <Input
              id="sisgalen-clave"
              type="password"
              value={password}
              onChange={(event) => onPasswordChange(event.target.value)}
            />
          </div>
          {error ? (
            <Alert className="flex items-center gap-2">
              <AlertCircle className="h-4 w-4" />
              <span>{error}</span>
            </Alert>
          ) : null}
        </div>
        <DialogFooter>
          <Button onClick={onSubmit} disabled={isSubmitting}>
            {isSubmitting ? 'Validando...' : 'Aceptar'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
