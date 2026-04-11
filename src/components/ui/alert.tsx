import { cva, type VariantProps } from 'class-variance-authority'
import { AlertCircle, CheckCircle2, Info, AlertTriangle } from 'lucide-react'
import type { HTMLAttributes } from 'react'
import { cn } from '@/lib/utils'

const alertVariants = cva(
  'flex items-start gap-3 rounded-lg border p-4 text-sm leading-relaxed',
  {
    variants: {
      variant: {
        default: 'border-brand/20 bg-brand-soft/60 text-brand-strong',
        success: 'border-emerald-200 bg-emerald-50 text-emerald-800',
        warning: 'border-amber-200 bg-amber-50 text-amber-800',
        danger: 'border-red-200 bg-red-50 text-red-800',
      },
    },
    defaultVariants: {
      variant: 'default',
    },
  },
)

const alertIcons = {
  default: Info,
  success: CheckCircle2,
  warning: AlertTriangle,
  danger: AlertCircle,
}

type AlertProps = HTMLAttributes<HTMLDivElement> & VariantProps<typeof alertVariants>

export function Alert({ className, variant = 'default', children, ...props }: AlertProps) {
  const Icon = alertIcons[variant ?? 'default']

  return (
    <div className={cn(alertVariants({ variant, className }))} {...props}>
      <Icon className="mt-0.5 h-4 w-4 shrink-0" />
      <div className="flex-1">{children}</div>
    </div>
  )
}
