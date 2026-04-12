import type { ReactNode } from 'react'
import { AlertCircle } from 'lucide-react'
import { PageHeader } from '@/components/data-display/page-header'
import { Alert } from '@/components/ui/alert'
import { workspaceMeta } from '@/config/module-registry'
import { useActiveNavigationItem } from '@/hooks/use-active-navigation-item'

interface SighPageShellProps {
  title?: string
  description?: string
  actions?: ReactNode
  error?: string | null
  children: ReactNode
}

export function SighPageShell({
  title,
  description,
  actions,
  error,
  children,
}: SighPageShellProps) {
  const { item } = useActiveNavigationItem()

  return (
    <section className="space-y-4">
      <PageHeader
        eyebrow={workspaceMeta.sigh.shortLabel}
        title={title ?? item?.label ?? 'Datos en Linea'}
        description={description ?? item?.description}
        actions={actions}
      />
      {error ? (
        <Alert className="flex items-center gap-2">
          <AlertCircle className="h-4 w-4" />
          <span>{error}</span>
        </Alert>
      ) : null}
      {children}
    </section>
  )
}
