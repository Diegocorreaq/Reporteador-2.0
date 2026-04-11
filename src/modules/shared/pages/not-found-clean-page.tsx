import { Link } from 'react-router-dom'
import { Home, ArrowLeft } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'

export function NotFoundCleanPage() {
  return (
    <div className="flex min-h-[60vh] items-center justify-center p-6">
      <Card className="max-w-md text-center">
        <CardContent className="p-8">
          <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-xl bg-accent-soft">
            <span className="text-3xl font-bold text-accent">404</span>
          </div>
          <h1 className="mt-5 text-xl font-semibold text-brand-strong">Pagina no encontrada</h1>
          <p className="mt-2 text-sm text-muted">
            La opcion que busca no esta disponible o ha cambiado de ubicacion dentro del sistema.
          </p>
          <div className="mt-6 flex flex-col gap-2 sm:flex-row sm:justify-center">
            <Button asChild>
              <Link to="/app">
                <Home className="h-4 w-4" />
                Ir al Reporteador
              </Link>
            </Button>
            <Button asChild variant="outline">
              <Link to="/sigh">
                <ArrowLeft className="h-4 w-4" />
                Ir a Datos en Linea
              </Link>
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
