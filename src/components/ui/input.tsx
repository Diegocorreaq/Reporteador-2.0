import { forwardRef, type InputHTMLAttributes } from 'react'
import { cn } from '@/lib/utils'

export const Input = forwardRef<HTMLInputElement, InputHTMLAttributes<HTMLInputElement>>(
  ({ className, ...props }, ref) => (
    <input
      ref={ref}
      className={cn(
        'flex h-10 w-full rounded-lg border border-border bg-white px-3 text-sm text-text shadow-sm outline-none transition placeholder:text-muted/60 focus:border-brand focus:ring-2 focus:ring-brand/20 disabled:cursor-not-allowed disabled:bg-canvas disabled:opacity-60',
        className,
      )}
      {...props}
    />
  ),
)

Input.displayName = 'Input'
