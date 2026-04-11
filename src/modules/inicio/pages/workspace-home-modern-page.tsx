import { Link } from 'react-router-dom'
import { ArrowRight, BarChart3, FileText, Users } from 'lucide-react'
import { workspaceMeta } from '@/config/module-registry'
import { isNavigationGroup } from '@/config/navigation-builders'
import { menuService } from '@/services/menu/menu.service'
import { PageHeader } from '@/components/data-display/page-header'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { useAuthStore } from '@/modules/auth/store/use-auth-store'
import type { WorkspaceKey } from '@/types/auth'

interface WorkspaceHomeModernPageProps {
  workspace: WorkspaceKey
}

const quickStats = [
  { label: 'Reportes Activos', value: '24', icon: BarChart3 },
  { label: 'Usuarios del Sistema', value: '156', icon: Users },
  { label: 'Documentos Generados', value: '1,234', icon: FileText },
]

export function WorkspaceHomeModernPage({ workspace }: WorkspaceHomeModernPageProps) {
  const user = useAuthStore((state) => state.user)
  const content = menuService.getHomeContent(workspace)
  const featuredItems = menuService.getFeaturedItems(workspace, user)
  const sections = menuService.getSections(workspace, user).filter((section) => section.key !== 'home')
  const firstFeaturedItem = featuredItems[0]

  return (
    <section className="space-y-6">
      <PageHeader
        eyebrow={workspaceMeta[workspace].shortLabel}
        title={content.title}
        description={content.description}
        actions={
          firstFeaturedItem ? (
            <Button asChild size="sm">
              <Link to={firstFeaturedItem.to}>
                Abrir {firstFeaturedItem.label}
                <ArrowRight className="h-4 w-4" />
              </Link>
            </Button>
          ) : null
        }
      />

      {/* Quick Stats */}
      <div className="grid gap-4 sm:grid-cols-3">
        {quickStats.map((stat) => (
          <Card key={stat.label}>
            <CardContent className="flex items-center gap-4 p-5">
              <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-brand-soft">
                <stat.icon className="h-6 w-6 text-brand" />
              </div>
              <div>
                <p className="text-2xl font-bold text-brand-strong">{stat.value}</p>
                <p className="text-xs font-medium text-muted">{stat.label}</p>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Featured Items */}
      <Card>
        <CardHeader className="border-b border-border">
          <CardTitle>{content.featuredTitle}</CardTitle>
          <p className="text-sm text-muted">{content.featuredDescription}</p>
        </CardHeader>
        <CardContent className="grid gap-4 p-5 md:grid-cols-2 xl:grid-cols-3">
          {featuredItems.map((item) => (
            <Link
              className="group flex items-start gap-4 rounded-xl border border-border bg-white p-4 transition hover:border-brand/40 hover:shadow-sm"
              key={item.key}
              to={item.to}
            >
              <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-accent-soft transition group-hover:bg-accent group-hover:text-white">
                <item.icon className="h-5 w-5 text-accent-strong group-hover:text-white" />
              </div>
              <div className="min-w-0 flex-1">
                <h3 className="font-semibold text-brand-strong">{item.label}</h3>
                <p className="mt-1 line-clamp-2 text-sm text-muted">{item.description}</p>
              </div>
              <ArrowRight className="mt-1 h-4 w-4 shrink-0 text-muted opacity-0 transition group-hover:opacity-100" />
            </Link>
          ))}
        </CardContent>
      </Card>

      {/* Navigation Sections */}
      {sections.map((section) => (
        <Card key={section.key}>
          <CardHeader className="border-b border-border">
            <CardTitle>
              {section.key === 'menu' ? content.supportTitle : section.title}
            </CardTitle>
            <p className="text-sm text-muted">
              {section.key === 'menu'
                ? content.supportDescription
                : 'Opciones adicionales del sistema.'}
            </p>
          </CardHeader>
          <CardContent className="grid gap-4 p-5 md:grid-cols-2 xl:grid-cols-3">
            {section.entries.map((entry) =>
              isNavigationGroup(entry) ? (
                <div
                  className="rounded-xl border border-border bg-canvas p-4"
                  key={entry.key}
                >
                  <div className="flex items-center gap-3">
                    <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-brand-soft">
                      <entry.icon className="h-5 w-5 text-brand-strong" />
                    </div>
                    <div>
                      <p className="font-semibold text-brand-strong">{entry.label}</p>
                      <p className="text-xs text-muted">{entry.description}</p>
                    </div>
                  </div>
                  <div className="mt-3 space-y-1">
                    {entry.items.map((item) => (
                      <Link
                        className="flex items-center justify-between rounded-lg border border-border bg-white px-3 py-2 text-sm text-text transition hover:border-brand/40 hover:bg-brand-soft/30"
                        key={item.key}
                        to={item.to}
                      >
                        <span>{item.label}</span>
                        <ArrowRight className="h-4 w-4 text-muted" />
                      </Link>
                    ))}
                  </div>
                </div>
              ) : (
                <Link
                  className="flex items-center gap-3 rounded-xl border border-border bg-white p-4 transition hover:border-brand/40 hover:bg-brand-soft/20"
                  key={entry.key}
                  to={entry.to}
                >
                  <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-brand-soft">
                    <entry.icon className="h-5 w-5 text-brand-strong" />
                  </div>
                  <div>
                    <p className="font-semibold text-brand-strong">{entry.label}</p>
                    <p className="text-xs text-muted">{entry.description}</p>
                  </div>
                </Link>
              ),
            )}
          </CardContent>
        </Card>
      ))}
    </section>
  )
}
