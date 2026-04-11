import { Link } from 'react-router-dom'
import { ArrowLeft } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { workspaceMeta } from '@/config/module-registry'
import { PageHeader } from '@/components/data-display/page-header'
import { useActiveNavigationItem } from '@/hooks/use-active-navigation-item'

export function ModuleStatusPage() {
  const { item, workspace } = useActiveNavigationItem()
  const homeRoute = workspace === 'main' ? '/app' : '/sigh'

  return (
    <section className="space-y-6">
      <PageHeader
        eyebrow={workspaceMeta[workspace].shortLabel}
        title={item?.label ?? 'Módulo'}
        actions={
          <Button asChild className="h-8 px-2.5 text-xs font-medium" size="sm" variant="ghost">
            <Link to={homeRoute}>
              <ArrowLeft className="h-3.5 w-3.5" />
              Volver al inicio
            </Link>
          </Button>
        }
      />
      <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_340px]">
        <Card>
          <CardHeader>
            <CardTitle>Estado del módulo</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3 text-sm leading-7 text-muted">
            <p>El contenido de este módulo no está habilitado en esta fase del proyecto.</p>
            <p>Mientras tanto, puede continuar usando los módulos que ya están disponibles.</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>Información</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3 text-sm leading-7 text-muted">
            <p>El acceso ya está presente dentro del menú para mantener continuidad con el sistema anterior.</p>
            <p>Este módulo será implementado en futuras versiones.</p>
          </CardContent>
        </Card>
      </div>
    </section>
  )
}
