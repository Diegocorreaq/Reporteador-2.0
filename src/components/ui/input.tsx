import { forwardRef, type InputHTMLAttributes } from 'react'
import { cn } from '@/lib/utils'

export const Input = forwardRef<HTMLInputElement, InputHTMLAttributes<HTMLInputElement>>(
  ({ className, ...props }, ref) => (
    <input
      ref={ref}
      className={cn(
        'flex h-11 w-full rounded-2xl border border-border bg-white px-3.5 text-sm text-text shadow-sm outline-none transition placeholder:text-muted focus:border-brand/60 focus:ring-4 focus:ring-brand/10',
        className,
      )}
      {...props}
    />
  ),
)

Input.displayName = 'Input'
