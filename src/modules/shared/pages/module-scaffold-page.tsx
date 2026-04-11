import { Link } from 'react-router-dom'
import { ArrowLeft, CheckCircle2, Clock, Settings } from 'lucide-react'
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
          <Button asChild variant="outline" size="sm">
            <Link to={homeRoute}>
              <ArrowLeft className="h-4 w-4" />
              Volver al inicio
            </Link>
          </Button>
        }
      />

      <div className="grid gap-5 lg:grid-cols-3">
        {/* Status Card */}
        <Card>
          <CardHeader className="border-b border-border pb-4">
            <div className="flex items-center gap-3">
              <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-accent-soft">
                <Clock className="h-5 w-5 text-accent-strong" />
              </div>
              <CardTitle>Estado</CardTitle>
            </div>
          </CardHeader>
          <CardContent className="space-y-3 pt-4">
            <div className="flex items-center justify-between rounded-lg bg-canvas p-3">
              <span className="text-sm text-muted">Prioridad</span>
              <Badge variant="accent">{module.priority}</Badge>
            </div>
            <div className="flex items-center justify-between rounded-lg bg-canvas p-3">
              <span className="text-sm text-muted">Ambiente</span>
              <span className="text-sm font-medium text-brand-strong">
                {module.workspace === 'main' ? 'Principal' : 'SIGH'}
              </span>
            </div>
            <div className="rounded-lg bg-canvas p-3">
              <span className="text-sm text-muted">Ruta</span>
              <code className="mt-1 block text-xs text-brand">
                /{module.workspace === 'main' ? 'app' : 'sigh'}/{module.path}
              </code>
            </div>
          </CardContent>
        </Card>

        {/* Patterns Card */}
        <Card>
          <CardHeader className="border-b border-border pb-4">
            <div className="flex items-center gap-3">
              <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-brand-soft">
                <Settings className="h-5 w-5 text-brand-strong" />
              </div>
              <CardTitle>Patrones Previstos</CardTitle>
            </div>
          </CardHeader>
          <CardContent className="pt-4">
            <div className="flex flex-wrap gap-2">
              {module.patterns.map((pattern) => (
                <Badge key={pattern} variant="brand">
                  {screenPatternLabels[pattern]}
                </Badge>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Goals Card */}
        <Card>
          <CardHeader className="border-b border-border pb-4">
            <div className="flex items-center gap-3">
              <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-emerald-100">
                <CheckCircle2 className="h-5 w-5 text-emerald-600" />
              </div>
              <CardTitle>Objetivos</CardTitle>
            </div>
          </CardHeader>
          <CardContent className="pt-4">
            <ul className="space-y-2">
              {module.goals.map((goal) => (
                <li
                  className="flex items-start gap-2 text-sm text-muted"
                  key={goal}
                >
                  <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-brand" />
                  {goal}
                </li>
              ))}
            </ul>
          </CardContent>
        </Card>
      </div>

      {/* Main Content Card */}
      <Card>
        <CardHeader className="border-b border-border">
          <CardTitle>Ruta Reservada para Migracion</CardTitle>
        </CardHeader>
        <CardContent className="pt-5">
          <p className="text-sm leading-relaxed text-muted">
            Esta pantalla ya existe como punto de entrada oficial en la nueva arquitectura. 
            El siguiente paso sera conectar sus filtros, acciones y reportes al backend legacy 
            o a una API formal del modulo.
          </p>
        </CardContent>
      </Card>
    </section>
  )
}
