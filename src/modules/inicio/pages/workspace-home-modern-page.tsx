import { Link } from 'react-router-dom'
import { ArrowRight } from 'lucide-react'
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
            <Button asChild>
              <Link to={firstFeaturedItem.to}>
                Abrir {firstFeaturedItem.label}
                <ArrowRight className="h-4 w-4" />
              </Link>
            </Button>
          ) : null
        }
      />

      <Card>
        <CardHeader>
          <CardTitle>{content.featuredTitle}</CardTitle>
          <p className="text-sm leading-6 text-muted">{content.featuredDescription}</p>
        </CardHeader>
        <CardContent className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {featuredItems.map((item) => (
            <Link
              className="rounded-[26px] border border-border bg-panelAlt/55 p-5 transition hover:-translate-y-0.5 hover:border-brand/30 hover:bg-white"
              key={item.key}
              to={item.to}
            >
              <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-white shadow-sm">
                <item.icon className="h-5 w-5 text-brand-strong" />
              </div>
              <h3 className="mt-4 text-base font-semibold text-text">{item.label}</h3>
              <p className="mt-2 text-sm leading-6 text-muted">{item.description}</p>
            </Link>
          ))}
        </CardContent>
      </Card>

      {sections.map((section) => (
        <Card key={section.key}>
          <CardHeader>
            <CardTitle>{section.key === 'menu' ? content.supportTitle : section.title}</CardTitle>
            <p className="text-sm leading-6 text-muted">
              {section.key === 'menu'
                ? content.supportDescription
                : 'Opciones adicionales preservadas para mantener continuidad con el sistema original.'}
            </p>
          </CardHeader>
          <CardContent className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
            {section.entries.map((entry) =>
              isNavigationGroup(entry) ? (
                <div className="rounded-[26px] border border-border bg-white p-4" key={entry.key}>
                  <div className="flex items-center gap-3">
                    <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-panelAlt text-brand-strong">
                      <entry.icon className="h-4 w-4" />
                    </div>
                    <div>
                      <p className="text-sm font-semibold text-text">{entry.label}</p>
                      <p className="text-xs text-muted">{entry.description}</p>
                    </div>
                  </div>
                  <div className="mt-4 space-y-2">
                    {entry.items.map((item) => (
                      <Link
                        className="flex items-center justify-between rounded-2xl border border-border bg-panelAlt/40 px-3 py-2 text-sm text-text transition hover:border-brand/30 hover:bg-panelAlt"
                        key={item.key}
                        to={item.to}
                      >
                        <span className="pr-3">{item.label}</span>
                        <ArrowRight className="h-4 w-4 shrink-0 text-muted" />
                      </Link>
                    ))}
                  </div>
                </div>
              ) : (
                <Link
                  className="rounded-[26px] border border-border bg-white p-4 transition hover:border-brand/30 hover:bg-panelAlt/40"
                  key={entry.key}
                  to={entry.to}
                >
                  <div className="flex items-center gap-3">
                    <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-panelAlt text-brand-strong">
                      <entry.icon className="h-4 w-4" />
                    </div>
                    <div>
                      <p className="text-sm font-semibold text-text">{entry.label}</p>
                      <p className="text-xs text-muted">{entry.description}</p>
                    </div>
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
