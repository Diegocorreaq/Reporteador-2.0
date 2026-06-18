import { Link } from 'react-router-dom'
import { ArrowLeft, Home, ShieldAlert } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'

export function AccessDeniedPage() {
  return (
    <div className="flex min-h-[60vh] items-center justify-center p-6">
      <Card className="max-w-lg text-center">
        <CardContent className="p-8">
          <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-xl bg-accent-soft text-accent">
            <ShieldAlert className="h-8 w-8" />
          </div>
          <h1 className="mt-5 text-xl font-semibold text-brand-strong">No tienes acceso a este reporte</h1>
          <p className="mt-2 text-sm leading-relaxed text-muted">
            El reporte existe, pero tu usuario no esta autorizado para visualizarlo. Solicita la habilitacion
            correspondiente si necesitas consultar esta informacion.
          </p>
          <div className="mt-6 flex flex-col gap-2 sm:flex-row sm:justify-center">
            <Button asChild>
              <Link to="/sigh">
                <Home className="h-4 w-4" />
                Ir a Datos en Linea
              </Link>
            </Button>
            <Button asChild variant="outline">
              <Link to="/app">
                <ArrowLeft className="h-4 w-4" />
                Ir al Reporteador
              </Link>
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
