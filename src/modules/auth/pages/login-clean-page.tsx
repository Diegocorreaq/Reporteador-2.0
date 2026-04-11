import { Navigate } from 'react-router-dom'
import { LoginCleanForm } from '@/modules/auth/components/login-clean-form'
import { useAuthStore } from '@/modules/auth/store/use-auth-store'

export function LoginCleanPage() {
  const user = useAuthStore((state) => state.user)
  const activeWorkspace = useAuthStore((state) => state.activeWorkspace)

  if (user) {
    return <Navigate replace to={activeWorkspace === 'main' ? '/app' : '/sigh'} />
  }

  return (
    <div className="mx-auto flex min-h-screen w-full max-w-[1320px] items-center px-4 py-8 sm:px-6 lg:px-8">
      <div className="grid w-full gap-10 lg:grid-cols-[1fr_480px] lg:gap-14">
        <section className="flex flex-col justify-center gap-6 text-white">
          <div className="space-y-4">
            <div className="inline-flex h-16 w-16 items-center justify-center rounded-[22px] border border-white/15 bg-white/10">
              <img alt="Reporteador" className="h-10 w-10" src="/logo-mark.svg" />
            </div>
            <div className="space-y-3">
              <p className="text-sm font-semibold uppercase tracking-[0.22em] text-white/60">
                Hospital de Emergencias Villa El Salvador
              </p>
              <h1 className="max-w-3xl text-4xl font-semibold tracking-tight sm:text-5xl">Reporteador HEVES</h1>
              <p className="max-w-2xl text-base leading-8 text-white/72 sm:text-lg">
                Ingrese con su acceso institucional para continuar. Despu\u00e9s del ingreso podr\u00e1 cambiar a Datos en
                L\u00ednea desde la aplicaci\u00f3n.
              </p>
            </div>
          </div>
          <div className="rounded-[28px] border border-white/10 bg-white/[0.06] p-6 backdrop-blur">
            <p className="text-sm leading-7 text-white/72">
              El acceso mantiene una entrada simple y directa, como en el sistema original: usuario, clave y continuar.
            </p>
          </div>
          <p className="text-sm text-white/50">Sitio institucional: https://www.heves.gob.pe/</p>
        </section>
        <section className="flex items-center">
          <div className="w-full">
            <LoginCleanForm />
          </div>
        </section>
      </div>
    </div>
  )
}
