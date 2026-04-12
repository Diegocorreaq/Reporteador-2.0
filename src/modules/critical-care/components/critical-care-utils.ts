import type { CriticalCareTableColumn } from '@/modules/critical-care/types'

export const MONTH_KEYS = ['ene', 'feb', 'mar', 'abr', 'may', 'jun', 'jul', 'agt', 'sep', 'oct', 'nov', 'dic'] as const
export const MONTH_LABELS = ['Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun', 'Jul', 'Agt', 'Sep', 'Oct', 'Nov', 'Dic'] as const

export function normalizeKeyToken(value: string) {
  return String(value ?? '')
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]/g, '')
}

function resolveByNormalizedKey(row: Record<string, unknown>, expectedTokens: Set<string>) {
  for (const [key, value] of Object.entries(row)) {
    if (expectedTokens.has(normalizeKeyToken(key))) {
      return value
    }
  }

  return undefined
}

export function resolveRowValue(
  row: Record<string, unknown>,
  key: string,
  aliases: string[] = [],
) {
  const candidates = [key, ...aliases].filter(Boolean)

  for (const candidate of candidates) {
    if (candidate in row) {
      return row[candidate]
    }
  }

  const normalizedCandidates = new Set(candidates.map((candidate) => normalizeKeyToken(candidate)))
  return resolveByNormalizedKey(row, normalizedCandidates)
}

export function resolveColumnValue(row: Record<string, unknown>, column: CriticalCareTableColumn) {
  return resolveRowValue(row, column.key, column.aliases ?? [])
}

export function toNumberValue(value: unknown) {
  if (typeof value === 'number') {
    return Number.isFinite(value) ? value : null
  }

  if (typeof value === 'string') {
    const normalized = value.replace(/,/g, '').trim()
    if (!normalized.length) {
      return null
    }

    const parsed = Number(normalized)
    return Number.isFinite(parsed) ? parsed : null
  }

  return null
}

export function formatNumeric(value: number, decimals?: number) {
  if (!Number.isFinite(value)) {
    return '-'
  }

  if (typeof decimals === 'number') {
    return value.toFixed(decimals)
  }

  return Number.isInteger(value) ? value.toString() : value.toFixed(1)
}

export function resolveMonthValue(row: Record<string, unknown>, monthKey: string) {
  return toNumberValue(resolveRowValue(row, monthKey, [monthKey.toUpperCase()])) ?? 0
}

export function sumByKey(rows: Array<Record<string, unknown>>, key: string, aliases: string[] = []) {
  return rows.reduce((accumulator, row) => {
    const value = toNumberValue(resolveRowValue(row, key, aliases))
    return accumulator + (value ?? 0)
  }, 0)
}
