import { Link } from 'react-router-dom'
import { ArrowLeft } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { workspaceMeta } from '@/config/module-registry'
import { PageHeader } from '@/components/data-display/page-header'
import type { ModuleDefinition } from '@/types/navigation'

interface ModuleStatusPageProps {
  module: ModuleDefinition
}

export function ModuleStatusPage({ module }: ModuleStatusPageProps) {
  const homeRoute = module.workspace === 'main' ? '/app' : '/sigh'

  return (
    <section className="space-y-6">
      <PageHeader
        eyebrow={workspaceMeta[module.workspace].shortLabel}
        title={module.title}
        description={module.summary}
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
            <CardTitle>Que encontrara aqui</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3 text-sm leading-7 text-muted">
            {module.goals.map((goal) => (
              <p key={goal}>{goal}</p>
            ))}
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>Estado actual</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3 text-sm leading-7 text-muted">
            <p>El acceso ya esta presente dentro del menu para mantener continuidad con el sistema anterior.</p>
            <p>Mientras tanto, puede continuar usando los modulos que ya estan disponibles en esta version.</p>
          </CardContent>
        </Card>
      </div>
    </section>
  )
}
