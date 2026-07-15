/**
 * Primitivas UI compartidas del módulo PPR.
 * Mantienen un estilo visual consistente en todas las páginas.
 */

import { Loader2 } from 'lucide-react'
import { cn } from '@/lib/utils'
import type { ReactNode } from 'react'

// ─── Card ─────────────────────────────────────────────────────────────────────

export function PprCard({
  children,
  className,
  hoverable = false,
  padding = 'md',
}: {
  children: ReactNode
  className?: string
  hoverable?: boolean
  padding?: 'none' | 'sm' | 'md' | 'lg'
}) {
  const padCls = {
    none: '',
    sm:   'p-3',
    md:   'p-4',
    lg:   'p-5',
  }[padding]
  return (
    <div
      className={cn(
        'rounded-lg border border-slate-200 bg-white shadow-[0_1px_2px_rgba(15,23,42,0.04)]',
        padCls,
        hoverable && 'transition hover:border-teal-300 hover:shadow-[0_8px_24px_rgba(15,23,42,0.08)]',
        className,
      )}
    >
      {children}
    </div>
  )
}

// ─── Status Pill ──────────────────────────────────────────────────────────────

type PillTone =
  | 'indigo'   // Brand
  | 'emerald'  // Success / ≥100%
  | 'amber'    // Warning / admin
  | 'rose'     // Danger / <60%
  | 'sky'      // Active period / current
  | 'slate'    // Neutral
  | 'navy'     // Strong navy
  // Aliases — backwards compat
  | 'green'
  | 'red'
  | 'blue'

export function PprPill({
  children,
  tone = 'slate',
  icon: Icon,
  className,
  size = 'sm',
}: {
  children: ReactNode
  tone?: PillTone
  icon?: React.ElementType
  className?: string
  size?: 'sm' | 'md'
}) {
  const tones: Record<PillTone, string> = {
    indigo:  'bg-blue-50 text-blue-700 ring-blue-200',
    emerald: 'bg-emerald-50 text-emerald-700 ring-emerald-200',
    amber:   'bg-amber-50 text-amber-800 ring-amber-200',
    rose:    'bg-rose-50 text-rose-700 ring-rose-200',
    sky:     'bg-cyan-50 text-cyan-700 ring-cyan-200',
    slate:   'bg-slate-100 text-slate-600 ring-slate-200',
    navy:    'bg-slate-900 text-white ring-slate-900',
    // Aliases
    green:   'bg-emerald-50 text-emerald-700 ring-emerald-200',
    red:     'bg-rose-50 text-rose-700 ring-rose-200',
    blue:    'bg-cyan-50 text-cyan-700 ring-cyan-200',
  }
  const sizeCls = size === 'md'
    ? 'px-2.5 py-1 text-[11px]'
    : 'px-2 py-0.5 text-[10px]'
  return (
    <span
      className={cn(
        'inline-flex items-center gap-1 rounded-md font-semibold ring-1 ring-inset',
        tones[tone],
        sizeCls,
        className,
      )}
    >
      {Icon && <Icon className="h-3 w-3" />}
      {children}
    </span>
  )
}

// ─── Progress Bar ─────────────────────────────────────────────────────────────

export function PprProgressBar({
  value,
  max = 100,
  size = 'md',
  showLabel = false,
  className,
  animated = true,
}: {
  value: number
  max?: number
  size?: 'sm' | 'md' | 'lg'
  showLabel?: boolean
  className?: string
  animated?: boolean
}) {
  const pct = max > 0 ? Math.min(Math.max((value / max) * 100, 0), 100) : 0
  const heightCls = { sm: 'h-1', md: 'h-1.5', lg: 'h-2.5' }[size]
  const barColor =
    pct >= 100 ? 'bg-emerald-500'
    : pct >= 80 ? 'bg-teal-500'
    : pct >= 60 ? 'bg-amber-500'
    : 'bg-rose-500'
  return (
    <div className={cn('w-full', className)}>
      <div className={cn('w-full overflow-hidden rounded bg-slate-100 ring-1 ring-inset ring-slate-200/70', heightCls)}>
        <div
          className={cn(
            'h-full rounded',
            barColor,
            animated && 'transition-all duration-500 ease-out',
          )}
          style={{ width: `${pct}%` }}
        />
      </div>
      {showLabel && (
        <p className="mt-1 text-right text-[10px] font-semibold text-slate-500">
          {Math.round(pct)}%
        </p>
      )}
    </div>
  )
}

// ─── Empty State ──────────────────────────────────────────────────────────────

export function PprEmptyState({
  icon: Icon,
  title,
  description,
  action,
  className,
}: {
  icon: React.ElementType
  title: string
  description?: ReactNode
  action?: ReactNode
  className?: string
}) {
  return (
    <div
      className={cn(
        'flex flex-col items-center gap-3 rounded-lg border border-dashed border-slate-300 bg-white px-6 py-12 text-center',
        className,
      )}
    >
      <div className="flex h-11 w-11 items-center justify-center rounded-lg bg-slate-100">
        <Icon className="h-5 w-5 text-slate-400" />
      </div>
      <div className="space-y-1">
        <p className="text-sm font-semibold text-slate-900">{title}</p>
        {description && (
          <p className="mx-auto max-w-sm text-xs leading-5 text-slate-500">{description}</p>
        )}
      </div>
      {action && <div className="mt-2">{action}</div>}
    </div>
  )
}

// ─── Loading State ────────────────────────────────────────────────────────────

export function PprLoading({
  label = 'Cargando...',
  className,
}: {
  label?: string
  className?: string
}) {
  return (
    <div
      className={cn(
        'flex flex-col items-center justify-center gap-2 py-16',
        className,
      )}
    >
      <Loader2 className="h-5 w-5 animate-spin text-teal-600" />
      <p className="text-xs text-slate-500">{label}</p>
    </div>
  )
}

// ─── Skeleton ─────────────────────────────────────────────────────────────────

export function PprSkeleton({ className }: { className?: string }) {
  return (
    <div
      className={cn(
        'animate-pulse rounded bg-gradient-to-r from-slate-100 via-slate-200 to-slate-100 bg-[length:200%_100%]',
        className,
      )}
      style={{ animation: 'ppr-shimmer 1.4s ease-in-out infinite' }}
    />
  )
}

export function PprSkeletonCard() {
  return (
    <div className="space-y-3 rounded-lg border border-slate-200 bg-white p-4">
      <div className="flex items-center gap-3">
        <PprSkeleton className="h-9 w-9 rounded-lg" />
        <div className="flex-1 space-y-2">
          <PprSkeleton className="h-3 w-2/3" />
          <PprSkeleton className="h-2 w-1/3" />
        </div>
      </div>
      <PprSkeleton className="h-2 w-full" />
      <div className="flex gap-2">
        <PprSkeleton className="h-8 flex-1" />
        <PprSkeleton className="h-8 flex-1" />
      </div>
    </div>
  )
}

// ─── Section Header ───────────────────────────────────────────────────────────

export function PprSectionHeader({
  eyebrow,
  title,
  description,
  right,
  className,
}: {
  eyebrow?: string
  title: string
  description?: ReactNode
  right?: ReactNode
  className?: string
}) {
  return (
    <div
      className={cn(
        'flex flex-col gap-3 rounded-lg border border-slate-200 bg-white px-4 py-3 shadow-[0_1px_2px_rgba(15,23,42,0.04)] sm:flex-row sm:items-end sm:justify-between',
        className,
      )}
    >
      <div className="min-w-0 space-y-1">
        {eyebrow && (
          <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-teal-700">
            {eyebrow}
          </p>
        )}
        <h1 className="text-lg font-bold leading-tight text-slate-950">{title}</h1>
        {description && (
          <p className="text-xs leading-5 text-slate-500">{description}</p>
        )}
      </div>
      {right && <div className="flex flex-wrap items-center gap-2 sm:justify-end">{right}</div>}
    </div>
  )
}

// ─── Inline Alert ─────────────────────────────────────────────────────────────

export function PprAlert({
  tone = 'info',
  title,
  children,
  onClose,
  icon: Icon,
}: {
  tone?: 'info' | 'warning' | 'error' | 'success'
  title?: string
  children?: ReactNode
  onClose?: () => void
  icon?: React.ElementType
}) {
  const tones = {
    info:    'border-cyan-200 bg-cyan-50 text-cyan-800',
    warning: 'border-amber-200 bg-amber-50 text-amber-800',
    error:   'border-rose-200 bg-rose-50 text-rose-700',
    success: 'border-emerald-200 bg-emerald-50 text-emerald-800',
  }
  const iconCls = {
    info:    'text-cyan-600',
    warning: 'text-amber-500',
    error:   'text-rose-500',
    success: 'text-emerald-500',
  }
  return (
    <div
      className={cn(
        'flex items-start gap-3 rounded-lg border px-4 py-3',
        tones[tone],
      )}
    >
      {Icon && (
        <Icon className={cn('mt-0.5 h-4 w-4 shrink-0', iconCls[tone])} />
      )}
      <div className="flex-1 text-xs leading-5">
        {title && <p className="font-semibold">{title}</p>}
        {children}
      </div>
      {onClose && (
        <button
          onClick={onClose}
          className="text-current opacity-60 transition hover:opacity-100"
        >
          <span className="text-base leading-none">×</span>
        </button>
      )}
    </div>
  )
}

// ─── Avatar with initials ─────────────────────────────────────────────────────

export function PprAvatar({
  name,
  size = 'md',
  tone = 'indigo',
  className,
}: {
  name: string
  size?: 'sm' | 'md' | 'lg'
  tone?: 'indigo' | 'amber' | 'navy' | 'green'
  className?: string
}) {
  const initials = name
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .map((p) => p[0]?.toUpperCase() ?? '')
    .join('')
  const sizeCls = {
    sm: 'h-7 w-7 text-[10px]',
    md: 'h-9 w-9 text-xs',
    lg: 'h-11 w-11 text-sm',
  }[size]
  const toneCls = {
    indigo: 'bg-blue-700 text-white',
    amber:  'bg-amber-600 text-white',
    navy:   'bg-slate-900 text-white',
    green:  'bg-teal-700 text-white',
  }[tone]
  return (
    <div
      className={cn(
        'flex shrink-0 items-center justify-center rounded-lg font-bold',
        sizeCls,
        toneCls,
        className,
      )}
    >
      {initials || '?'}
    </div>
  )
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

export function pctTone(pct: number): PillTone {
  if (pct >= 100) return 'emerald'
  if (pct >= 80)  return 'sky'
  if (pct >= 60)  return 'amber'
  return 'rose'
}

export function pctTextColor(pct: number) {
  if (pct >= 100) return 'text-emerald-700'
  if (pct >= 80)  return 'text-teal-700'
  if (pct >= 60)  return 'text-amber-700'
  return 'text-rose-700'
}

export function pctBarColor(pct: number) {
  if (pct >= 100) return 'bg-emerald-500'
  if (pct >= 80)  return 'bg-teal-500'
  if (pct >= 60)  return 'bg-amber-500'
  return 'bg-rose-500'
}
