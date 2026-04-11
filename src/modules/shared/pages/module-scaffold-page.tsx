import { Link } from 'react-router-dom'
import { screenPatternLabels } from '@/config/module-registry'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { PageHeader } from '@/components/data-display/page-header'
import type { ModuleDefinition } from '@/types/navigation'

interface ModuleScaffoldPageProps {
  module: ModuleDefinition
}

export function ModuleScaffoldPage({ module }: ModuleScaffoldPageProps) {
  const homeRoute = module.workspace === 'main' ? '/app' : '/sigh'

  return (
    <section className="space-y-6">
      <PageHeader
        eyebrow={`Legacy: ${module.legacyModule}`}
        title={module.title}
        description={module.summary}
        actions={
          <Button asChild variant="outline">
            <Link to={homeRoute}>Volver al inicio</Link>
          </Button>
        }
      />
      <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_360px]">
        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Ruta reservada para migración</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4 text-sm leading-7 text-muted">
              <p>
                Esta pantalla ya existe como punto de entrada oficial en la nueva arquitectura. El siguiente paso será
                conectar sus filtros, acciones y reportes al backend legacy o a una API formal del módulo.
              </p>
              <div className="rounded-2xl border border-border bg-panelAlt/60 p-4">
                <p className="font-semibold text-text">Objetivos funcionales preservados</p>
                <ul className="mt-3 space-y-2">
                  {module.goals.map((goal) => (
                    <li key={goal}>- {goal}</li>
                  ))}
                </ul>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader>
              <CardTitle>Patrones previstos</CardTitle>
            </CardHeader>
            <CardContent className="flex flex-wrap gap-3">
              {module.patterns.map((pattern) => (
                <Badge key={pattern} variant="brand">
                  {screenPatternLabels[pattern]}
                </Badge>
              ))}
            </CardContent>
          </Card>
        </div>
        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Estado del módulo</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="rounded-2xl border border-amber-200 bg-amber-50 p-4 text-sm leading-7 text-amber-800">
                Prioridad: <strong className="font-semibold uppercase">{module.priority}</strong>
              </div>
              <div className="rounded-2xl border border-border bg-white p-4 text-sm leading-7 text-muted">
                Ambiente: <strong className="text-text">{module.workspace === 'main' ? 'Principal' : 'SIGH'}</strong>
              </div>
              <div className="rounded-2xl border border-border bg-white p-4 text-sm leading-7 text-muted">
                Ruta nueva: <code>/{module.workspace === 'main' ? 'app' : 'sigh'}/{module.path}</code>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </section>
  )
}
