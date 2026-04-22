import { Navigate } from 'react-router-dom'
import { LoginCleanForm } from '@/modules/auth/components/login-clean-form'
import { useAuthStore } from '@/modules/auth/store/use-auth-store'
import { Activity, BarChart3, ClipboardList, Heart, Shield, Users } from 'lucide-react'

export function LoginCleanPage() {
  const user = useAuthStore((state) => state.user)
  const activeWorkspace = useAuthStore((state) => state.activeWorkspace)

  if (user) {
    return <Navigate replace to={activeWorkspace === 'main' ? '/app' : '/sigh'} />
  }

  return (
    <div className="flex min-h-screen">
      {/* Left Panel - Branding */}
      <div className="relative hidden w-[55%] flex-col justify-between overflow-hidden bg-gradient-to-br from-[#123B63] via-[#005F8F] to-[#2C6E99] p-10 lg:flex xl:p-14">
        {/* Decorative shapes */}
        <div className="pointer-events-none absolute inset-0">
          <div className="absolute -left-24 -top-24 h-96 w-96 rounded-full bg-white/5" />
          <div className="absolute -bottom-32 -right-32 h-[500px] w-[500px] rounded-full bg-white/3" />
          <div className="absolute right-20 top-1/3 h-64 w-64 rounded-full bg-[#D98B27]/10" />
          {/* Diagonal accent line */}
          <div className="absolute -right-20 top-0 h-full w-1 rotate-[20deg] bg-gradient-to-b from-transparent via-white/10 to-transparent" />
        </div>

        {/* Header with logo */}
        <div className="relative z-10">
          <div className="mb-6 flex items-center gap-4">
            <div className="flex h-14 w-14 items-center justify-center rounded-2xl border border-white/20 bg-white/10 backdrop-blur-sm">
              <img alt="Logo HEVES" className="h-9 w-9" src="/oso_estad.webp" />
            </div>
            <div>
              <p className="text-xs font-medium uppercase tracking-[0.2em] text-white/60">
                Hospital de Emergencias
              </p>
              <p className="text-sm font-semibold text-white/90">Villa El Salvador</p>
            </div>
          </div>
        </div>

        {/* Main content */}
        <div className="relative z-10 max-w-xl space-y-8">
          <div className="space-y-4">
            <h1 className="text-balance text-4xl font-bold tracking-tight text-white xl:text-5xl">
              Reporteador HEVES
            </h1>
            <p className="text-pretty text-lg leading-relaxed text-white/70 xl:text-xl">
              Sistema integrado de reportes y gestión de datos hospitalarios para una mejor toma de decisiones.
            </p>
          </div>

          {/* Feature highlights */}
          <div className="grid grid-cols-2 gap-4">
            <FeatureCard
              icon={<BarChart3 className="h-5 w-5" />}
              title="Reportes en tiempo real"
              description="Datos actualizados al instante"
            />
            <FeatureCard
              icon={<ClipboardList className="h-5 w-5" />}
              title="Gestión integrada"
              description="Todo en un solo lugar"
            />
            <FeatureCard
              icon={<Users className="h-5 w-5" />}
              title="Multi-usuario"
              description="Control de accesos y permisos"
            />
            <FeatureCard
              icon={<Shield className="h-5 w-5" />}
              title="Seguro y confiable"
              description="Protección de datos sensibles"
            />
          </div>
        </div>

        {/* Footer */}
        <div className="relative z-10 flex items-center gap-3 text-white/50">
          <Heart className="h-4 w-4 text-[#D98B27]" />
          <span className="text-sm">Comprometidos con la salud de nuestra comunidad</span>
        </div>
      </div>

      {/* Right Panel - Login Form */}
      <div className="flex w-full flex-col justify-center px-6 py-10 lg:w-[45%] lg:px-12 xl:px-20">
        {/* Mobile header */}
        <div className="mb-10 flex items-center gap-3 lg:hidden">
          <div className="flex h-12 w-12 items-center justify-center rounded-xl border border-brand/20 bg-brand/10">
            <img alt="Logo HEVES" className="h-7 w-7" src="/oso_estad.webp" />
          </div>
          <div>
            <p className="text-xs font-medium uppercase tracking-wider text-muted">
              Hospital de Emergencias Villa El Salvador
            </p>
            <p className="text-lg font-semibold text-brand-strong">Reporteador HEVES</p>
          </div>
        </div>

        {/* Welcome text */}
        <div className="mb-8">
          <p className="mb-2 text-sm font-medium uppercase tracking-wider text-brand">
            Bienvenido
          </p>
          <h2 className="text-2xl font-bold tracking-tight text-brand-strong lg:text-3xl">
            Ingrese a su cuenta
          </h2>
          <p className="mt-2 text-muted">
            Use sus credenciales institucionales para acceder al sistema.
          </p>
        </div>

        {/* Login Form */}
        <LoginCleanForm />

        {/* Footer info */}
        <div className="mt-10 space-y-4 border-t border-border pt-6">
          <p className="text-center text-sm text-muted">
            Si tiene problemas para acceder, contacte a soporte técnico.
          </p>
          <div className="flex items-center justify-center gap-2 text-xs text-muted/70">
            <Activity className="h-3.5 w-3.5 text-brand" />
            <span>Sistema de Gestión Hospitalaria HEVES</span>
          </div>
        </div>
      </div>
    </div>
  )
}

function FeatureCard({
  icon,
  title,
  description,
}: {
  icon: React.ReactNode
  title: string
  description: string
}) {
  return (
    <div className="rounded-2xl border border-white/10 bg-white/5 p-4 backdrop-blur-sm">
      <div className="mb-2 flex h-9 w-9 items-center justify-center rounded-xl bg-[#D98B27]/20 text-[#D98B27]">
        {icon}
      </div>
      <p className="font-medium text-white">{title}</p>
      <p className="text-sm text-white/60">{description}</p>
    </div>
  )
}
