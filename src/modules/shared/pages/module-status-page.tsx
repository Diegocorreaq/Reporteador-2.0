import { Link } from 'react-router-dom'
import { ArrowLeft, Clock, Info } from 'lucide-react'
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
        title={item?.label ?? 'Modulo'}
        actions={
          <Button asChild size="sm" variant="outline">
            <Link to={homeRoute}>
              <ArrowLeft className="h-4 w-4" />
              Volver al inicio
            </Link>
          </Button>
        }
      />

      <div className="grid gap-5 lg:grid-cols-2">
        <Card>
          <CardHeader className="border-b border-border pb-4">
            <div className="flex items-center gap-3">
              <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-accent-soft">
                <Clock className="h-5 w-5 text-accent-strong" />
              </div>
              <CardTitle>Estado del Modulo</CardTitle>
            </div>
          </CardHeader>
          <CardContent className="pt-5 text-sm leading-relaxed text-muted">
            <p>El contenido de este modulo no esta habilitado en esta fase del proyecto.</p>
            <p className="mt-3">Mientras tanto, puede continuar usando los modulos que ya estan disponibles.</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="border-b border-border pb-4">
            <div className="flex items-center gap-3">
              <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-brand-soft">
                <Info className="h-5 w-5 text-brand-strong" />
              </div>
              <CardTitle>Informacion</CardTitle>
            </div>
          </CardHeader>
          <CardContent className="pt-5 text-sm leading-relaxed text-muted">
            <p>El acceso ya esta presente dentro del menu para mantener continuidad con el sistema anterior.</p>
            <p className="mt-3">Este modulo sera implementado en futuras versiones.</p>
          </CardContent>
        </Card>
      </div>
    </section>
  )
}
