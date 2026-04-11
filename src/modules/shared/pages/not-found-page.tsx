import { Link } from 'react-router-dom'
import { EmptyState } from '@/components/feedback/empty-state'
import { Button } from '@/components/ui/button'

export function NotFoundPage() {
  return (
    <div className="space-y-6">
      <EmptyState
        title="Ruta no encontrada"
        description="La base nueva ya tiene routing para main y /sigh. Si esta ruta debería existir, conviene declararla en el registro de módulos."
      />
      <div className="flex gap-3">
        <Button asChild>
          <Link to="/app">Ir al ambiente principal</Link>
        </Button>
        <Button asChild variant="outline">
          <Link to="/sigh">Ir a /sigh</Link>
        </Button>
      </div>
    </div>
  )
}
