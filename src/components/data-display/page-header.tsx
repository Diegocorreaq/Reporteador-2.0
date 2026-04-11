import type { ReactNode } from 'react'

interface PageHeaderProps {
  eyebrow?: string
  title: string
  description?: string
  actions?: ReactNode
}

export function PageHeader({ eyebrow, title, description, actions }: PageHeaderProps) {
  return (
    <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
      <div className="min-w-0">
        <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
          {eyebrow ? (
            <span className="rounded-md bg-brand-soft px-2 py-0.5 text-[10px] font-bold uppercase tracking-[0.12em] text-brand-strong">
              {eyebrow}
            </span>
          ) : null}
          <h1 className="text-xl font-semibold text-brand-strong sm:text-2xl">{title}</h1>
        </div>
        {description ? (
          <p className="mt-2 max-w-3xl text-sm leading-relaxed text-muted">{description}</p>
        ) : null}
      </div>
      {actions ? <div className="flex flex-wrap items-center gap-2">{actions}</div> : null}
    </div>
  )
}
