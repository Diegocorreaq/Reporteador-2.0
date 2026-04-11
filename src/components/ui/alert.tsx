import type { HTMLAttributes } from 'react'
import { cn } from '@/lib/utils'

export function Alert({ className, ...props }: HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={cn(
        'rounded-3xl border border-brand/15 bg-brand-soft/70 px-4 py-3 text-sm leading-6 text-brand-strong',
        className,
      )}
      {...props}
    />
  )
}
