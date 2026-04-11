import { zodResolver } from '@hookform/resolvers/zod'
import { AlertCircle, Eye, EyeOff, Loader2, LockKeyhole, UserRound } from 'lucide-react'
import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { useNavigate } from 'react-router-dom'
import { z } from 'zod'
import { authService } from '@/services/auth/auth.service'
import { useAuthStore } from '@/modules/auth/store/use-auth-store'
import { cn } from '@/lib/utils'

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
  const [showPassword, setShowPassword] = useState(false)

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
      setSubmitError('No fue posible iniciar sesión. Verifica tus datos e inténtalo nuevamente.')
    } finally {
      setSubmitting(false)
    }
  })

  return (
    <form className="space-y-6" onSubmit={onSubmit}>
      {/* Username field */}
      <div className="space-y-2">
        <label htmlFor="username" className="block text-sm font-semibold text-brand-strong">
          Usuario
        </label>
        <div className="relative">
          <UserRound className="pointer-events-none absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-muted" />
          <input
            id="username"
            type="text"
            placeholder="DNI o usuario institucional"
            className={cn(
              'h-12 w-full rounded-xl border bg-white pl-12 pr-4 text-brand-strong placeholder:text-muted/60',
              'transition-all duration-200',
              'focus:border-brand focus:outline-none focus:ring-2 focus:ring-brand/20',
              errors.username
                ? 'border-danger focus:border-danger focus:ring-danger/20'
                : 'border-border hover:border-brand/50'
            )}
            {...register('username')}
          />
        </div>
        {errors.username && (
          <p className="flex items-center gap-1.5 text-sm text-danger">
            <AlertCircle className="h-4 w-4" />
            {errors.username.message}
          </p>
        )}
      </div>

      {/* Password field */}
      <div className="space-y-2">
        <label htmlFor="password" className="block text-sm font-semibold text-brand-strong">
          Contraseña
        </label>
        <div className="relative">
          <LockKeyhole className="pointer-events-none absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-muted" />
          <input
            id="password"
            type={showPassword ? 'text' : 'password'}
            placeholder="Ingrese su contraseña"
            className={cn(
              'h-12 w-full rounded-xl border bg-white pl-12 pr-12 text-brand-strong placeholder:text-muted/60',
              'transition-all duration-200',
              'focus:border-brand focus:outline-none focus:ring-2 focus:ring-brand/20',
              errors.password
                ? 'border-danger focus:border-danger focus:ring-danger/20'
                : 'border-border hover:border-brand/50'
            )}
            {...register('password')}
          />
          <button
            type="button"
            onClick={() => setShowPassword(!showPassword)}
            className="absolute right-4 top-1/2 -translate-y-1/2 text-muted transition-colors hover:text-brand"
            tabIndex={-1}
          >
            {showPassword ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
          </button>
        </div>
        {errors.password && (
          <p className="flex items-center gap-1.5 text-sm text-danger">
            <AlertCircle className="h-4 w-4" />
            {errors.password.message}
          </p>
        )}
      </div>

      {/* Error message */}
      {submitError && (
        <div className="flex items-start gap-3 rounded-xl border border-danger/20 bg-danger/5 px-4 py-3">
          <AlertCircle className="mt-0.5 h-5 w-5 shrink-0 text-danger" />
          <p className="text-sm text-danger">{submitError}</p>
        </div>
      )}

      {/* Submit button */}
      <button
        type="submit"
        disabled={submitting}
        className={cn(
          'relative h-12 w-full rounded-xl font-semibold text-white',
          'transition-all duration-200',
          'bg-accent hover:bg-accent-strong',
          'focus:outline-none focus:ring-2 focus:ring-accent/40 focus:ring-offset-2',
          'disabled:cursor-not-allowed disabled:opacity-70'
        )}
      >
        {submitting ? (
          <span className="flex items-center justify-center gap-2">
            <Loader2 className="h-5 w-5 animate-spin" />
            Ingresando...
          </span>
        ) : (
          'Iniciar sesión'
        )}
      </button>
    </form>
  )
}
