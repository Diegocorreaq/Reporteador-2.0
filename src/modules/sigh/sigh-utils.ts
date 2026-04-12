import type { SighCellValue, SighTableRow } from '@/modules/sigh/types'

export function getTodayDate() {
  return new Date().toISOString().slice(0, 10)
}

export function getMonthStartDate() {
  const now = new Date()
  return new Date(now.getFullYear(), now.getMonth(), 1).toISOString().slice(0, 10)
}

export function getMonthEndDate() {
  const now = new Date()
  return new Date(now.getFullYear(), now.getMonth() + 1, 0).toISOString().slice(0, 10)
}

export function countDaysBetween(startDate: string, endDate: string) {
  const start = new Date(`${startDate}T00:00:00`)
  const end = new Date(`${endDate}T00:00:00`)
  return Math.floor(Math.abs(end.getTime() - start.getTime()) / 86400000) + 1
}

export function normalizeKeyToken(value: string) {
  return String(value ?? '')
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]/g, '')
}

export function resolveRowValue(
  row: SighTableRow,
  key: string,
  aliases: string[] = [],
): SighCellValue {
  const candidates = [key, ...aliases].filter(Boolean)
  for (const candidate of candidates) {
    if (candidate in row) {
      return row[candidate]
    }
  }

  const normalizedCandidates = new Set(candidates.map((candidate) => normalizeKeyToken(candidate)))
  for (const [currentKey, value] of Object.entries(row)) {
    if (normalizedCandidates.has(normalizeKeyToken(currentKey))) {
      return value
    }
  }

  return null
}

export function resolveRowText(row: SighTableRow, key: string, aliases: string[] = []) {
  const value = resolveRowValue(row, key, aliases)
  if (value === null || value === undefined) {
    return ''
  }
  return String(value)
}

export function resolveRowNumber(row: SighTableRow, key: string, aliases: string[] = []) {
  const raw = resolveRowValue(row, key, aliases)
  if (typeof raw === 'number') {
    return Number.isFinite(raw) ? raw : 0
  }
  const parsed = Number(String(raw ?? '').replace(/,/g, '').trim())
  return Number.isFinite(parsed) ? parsed : 0
}
