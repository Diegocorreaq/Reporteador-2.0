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
        'rounded-2xl border border-slate-200 bg-white transition-all',
        padCls,
        hoverable && 'hover:border-indigo-300 hover:shadow-md hover:-translate-y-0.5',
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
    indigo:  'bg-indigo-100 text-indigo-700 border-indigo-200',
    emerald: 'bg-emerald-100 text-emerald-700 border-emerald-200',
    amber:   'bg-amber-100 text-amber-700 border-amber-200',
    rose:    'bg-rose-100 text-rose-700 border-rose-200',
    sky:     'bg-sky-100 text-sky-700 border-sky-200',
    slate:   'bg-slate-100 text-slate-600 border-slate-200',
    navy:    'bg-[#0f172a] text-white border-[#0f172a]',
    // Aliases
    green:   'bg-indigo-100 text-indigo-700 border-indigo-200',
    red:     'bg-rose-100 text-rose-700 border-rose-200',
    blue:    'bg-sky-100 text-sky-700 border-sky-200',
  }
  const sizeCls = size === 'md'
    ? 'px-2.5 py-1 text-[11px]'
    : 'px-2 py-0.5 text-[10px]'
  return (
    <span
      className={cn(
        'inline-flex items-center gap-1 rounded-full border font-semibold',
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
    : pct >= 80 ? 'bg-amber-500'
    : pct >= 60 ? 'bg-amber-400'
    : 'bg-rose-500'
  return (
    <div className={cn('w-full', className)}>
      <div className={cn('w-full overflow-hidden rounded-full bg-slate-100', heightCls)}>
        <div
          className={cn(
            'h-full rounded-full',
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
        'flex flex-col items-center gap-3 rounded-2xl border border-dashed border-[#cbd5e1] bg-white py-12 px-6 text-center',
        className,
      )}
    >
      <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-slate-100">
        <Icon className="h-6 w-6 text-slate-400" />
      </div>
      <div className="space-y-1">
        <p className="text-sm font-semibold text-[#0c2340]">{title}</p>
        {description && (
          <p className="mx-auto max-w-sm text-xs text-slate-500">{description}</p>
        )}
      </div>
      {action && <div className="mt-2">{action}</div>}
    </div>
  )
}

// ─── Loading State ────────────────────────────────────────────────────────────

export function PprLoading({
  label = 'Cargando…',
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
      <Loader2 className="h-6 w-6 animate-spin text-indigo-600" />
      <p className="text-xs text-slate-400">{label}</p>
    </div>
  )
}

// ─── Skeleton ─────────────────────────────────────────────────────────────────

export function PprSkeleton({ className }: { className?: string }) {
  return (
    <div
      className={cn(
        'animate-pulse rounded-md bg-gradient-to-r from-slate-100 via-slate-200 to-slate-100 bg-[length:200%_100%]',
        className,
      )}
      style={{ animation: 'ppr-shimmer 1.4s ease-in-out infinite' }}
    />
  )
}

export function PprSkeletonCard() {
  return (
    <div className="rounded-2xl border border-[#e2e8f0] bg-white p-5 space-y-3">
      <div className="flex items-center gap-3">
        <PprSkeleton className="h-10 w-10 rounded-xl" />
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
    <div className={cn('flex flex-wrap items-end justify-between gap-3', className)}>
      <div className="space-y-1">
        {eyebrow && (
          <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-slate-400">
            {eyebrow}
          </p>
        )}
        <h1 className="text-xl font-bold text-[#0c2340]">{title}</h1>
        {description && (
          <p className="text-xs text-slate-500">{description}</p>
        )}
      </div>
      {right && <div className="flex flex-wrap items-center gap-2">{right}</div>}
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
    info:    'border-sky-200 bg-sky-50 text-sky-800',
    warning: 'border-amber-200 bg-amber-50 text-amber-800',
    error:   'border-rose-200 bg-rose-50 text-rose-700',
    success: 'border-emerald-200 bg-emerald-50 text-emerald-800',
  }
  const iconCls = {
    info:    'text-sky-500',
    warning: 'text-amber-500',
    error:   'text-rose-500',
    success: 'text-emerald-500',
  }
  return (
    <div
      className={cn(
        'flex items-start gap-3 rounded-2xl border px-4 py-3',
        tones[tone],
      )}
    >
      {Icon && (
        <Icon className={cn('mt-0.5 h-4 w-4 shrink-0', iconCls[tone])} />
      )}
      <div className="flex-1 text-xs">
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
    lg: 'h-12 w-12 text-sm',
  }[size]
  const toneCls = {
    indigo: 'bg-gradient-to-br from-indigo-500 to-indigo-700 text-white',
    amber:  'bg-gradient-to-br from-amber-400 to-amber-600 text-white',
    navy:   'bg-gradient-to-br from-slate-700 to-slate-900 text-white',
    green:  'bg-gradient-to-br from-indigo-500 to-indigo-700 text-white', // alias
  }[tone]
  return (
    <div
      className={cn(
        'flex shrink-0 items-center justify-center rounded-xl font-bold shadow-sm',
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
  if (pct >= 80)  return 'amber'
  if (pct >= 60)  return 'amber'
  return 'rose'
}

export function pctTextColor(pct: number) {
  if (pct >= 100) return 'text-emerald-600'
  if (pct >= 80)  return 'text-amber-600'
  if (pct >= 60)  return 'text-amber-600'
  return 'text-rose-600'
}

export function pctBarColor(pct: number) {
  if (pct >= 100) return 'bg-emerald-500'
  if (pct >= 80)  return 'bg-amber-500'
  if (pct >= 60)  return 'bg-amber-400'
  return 'bg-rose-500'
}
