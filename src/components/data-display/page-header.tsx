import type { ReactNode } from 'react'
import { Badge } from '@/components/ui/badge'

interface PageHeaderProps {
  eyebrow?: string
  title: string
  description: string
  actions?: ReactNode
}

export function PageHeader({ eyebrow, title, description, actions }: PageHeaderProps) {
  return (
    <div className="flex flex-col gap-5 lg:flex-row lg:items-start lg:justify-between">
      <div className="space-y-3">
        {eyebrow ? <Badge variant="brand">{eyebrow}</Badge> : null}
        <div className="space-y-2">
          <h1 className="text-3xl font-semibold tracking-tight text-text sm:text-[2rem]">{title}</h1>
          <p className="max-w-3xl text-sm leading-7 text-muted sm:text-base">{description}</p>
        </div>
      </div>
      {actions ? <div className="flex flex-wrap gap-3">{actions}</div> : null}
    </div>
  )
}
