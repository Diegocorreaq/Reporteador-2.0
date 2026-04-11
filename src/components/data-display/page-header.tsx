import type { ReactNode } from 'react'

interface PageHeaderProps {
  eyebrow?: string
  title: string
  description?: string
  actions?: ReactNode
}

export function PageHeader({ eyebrow, title, description, actions }: PageHeaderProps) {
  return (
    <div className="flex flex-col gap-2.5 sm:flex-row sm:items-start sm:justify-between">
      <div className="min-w-0">
        <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
          {eyebrow ? (
            <span className="text-[11px] font-semibold uppercase tracking-[0.16em] text-muted">{eyebrow}</span>
          ) : null}
          <h1 className="text-xl font-semibold tracking-tight text-text sm:text-2xl">{title}</h1>
        </div>
        {description ? <p className="mt-1 hidden max-w-3xl text-sm leading-6 text-muted 2xl:block">{description}</p> : null}
      </div>
      {actions ? <div className="flex flex-wrap items-center gap-2">{actions}</div> : null}
    </div>
  )
}
