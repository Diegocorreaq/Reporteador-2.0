import { Link } from 'react-router-dom'
import { EmptyState } from '@/components/feedback/empty-state'
import { Button } from '@/components/ui/button'

export function NotFoundCleanPage() {
  return (
    <div className="space-y-6">
      <EmptyState
        title="Ruta no encontrada"
        description="La opción que busca no está disponible o ya cambió de ubicación dentro del menú."
      />
      <div className="flex flex-wrap gap-3">
        <Button asChild>
          <Link to="/app">Ir al Reporteador</Link>
        </Button>
        <Button asChild variant="outline">
          <Link to="/sigh">Ir a Datos en Línea</Link>
        </Button>
      </div>
    </div>
  )
}
