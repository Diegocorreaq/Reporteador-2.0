import { zodResolver } from '@hookform/resolvers/zod'
import { LockKeyhole, UserRound } from 'lucide-react'
import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { useNavigate } from 'react-router-dom'
import { z } from 'zod'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { authService } from '@/services/auth/auth.service'
import { useAuthStore } from '@/modules/auth/store/use-auth-store'

const loginSchema = z.object({
  username: z.string().min(3, 'Ingresa al menos 3 caracteres'),
  password: z.string().min(4, 'Ingresa al menos 4 caracteres'),
})

type LoginFormValues = z.infer<typeof loginSchema>

export function LoginCleanForm() {
  const navigate = useNavigate()
  const saveSession = useAuthStore((state) => state.signIn)
  const [submitting, setSubmitting] = useState(false)
  const [submitError, setSubmitError] = useState<string | null>(null)
  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<LoginFormValues>({
    resolver: zodResolver(loginSchema),
    defaultValues: {
      username: '',
      password: '',
    },
  })

  const onSubmit = handleSubmit(async (values) => {
    try {
      setSubmitting(true)
      setSubmitError(null)
      const session = await authService.signIn(values)
      saveSession(session)
      navigate('/app')
    } catch {
      setSubmitError('No fue posible iniciar sesi\u00f3n. Verifica tus datos e int\u00e9ntalo nuevamente.')
    } finally {
      setSubmitting(false)
    }
  })

  return (
    <Card className="border-white/10 bg-white/95 shadow-shell">
      <CardHeader className="space-y-3">
        <Badge variant="brand">Acceso</Badge>
        <div className="space-y-2">
          <CardTitle className="text-2xl">Ingreso a Reporteador</CardTitle>
          <CardDescription>Ingrese con su usuario y clave para continuar.</CardDescription>
        </div>
      </CardHeader>
      <CardContent>
        <form className="space-y-5" onSubmit={onSubmit}>
          <label className="space-y-2">
            <span className="text-xs font-semibold uppercase tracking-[0.16em] text-muted">Usuario</span>
            <div className="relative">
              <UserRound className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted" />
              <Input className="pl-10" placeholder="DNI o usuario institucional" {...register('username')} />
            </div>
            {errors.username ? <p className="text-sm text-danger">{errors.username.message}</p> : null}
          </label>
          <label className="space-y-2">
            <span className="text-xs font-semibold uppercase tracking-[0.16em] text-muted">Clave</span>
            <div className="relative">
              <LockKeyhole className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted" />
              <Input className="pl-10" placeholder="********" type="password" {...register('password')} />
            </div>
            {errors.password ? <p className="text-sm text-danger">{errors.password.message}</p> : null}
          </label>
          {submitError ? (
            <p className="rounded-2xl border border-danger/20 bg-danger/5 px-4 py-3 text-sm text-danger">
              {submitError}
            </p>
          ) : null}
          <Button className="w-full" disabled={submitting} size="lg" type="submit">
            {submitting ? 'Ingresando...' : 'Ingresar'}
          </Button>
        </form>
      </CardContent>
    </Card>
  )
}
