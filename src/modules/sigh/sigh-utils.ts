import type { SighCellValue, SighTableRow } from '@/modules/sigh/types'

const dateOnlyFormatter = new Intl.DateTimeFormat('es-PE', {
  day: '2-digit',
  month: '2-digit',
  year: 'numeric',
})

const timeOnlyFormatter = new Intl.DateTimeFormat('es-PE', {
  hour: '2-digit',
  minute: '2-digit',
  second: '2-digit',
  hour12: false,
})

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

function buildLocalDate(year: number, month: number, day: number) {
  const date = new Date(year, month - 1, day)
  if (
    date.getFullYear() !== year ||
    date.getMonth() !== month - 1 ||
    date.getDate() !== day
  ) {
    return null
  }

  return date
}

export function formatDateOnlyLabel(value: unknown) {
  const raw = String(value ?? '').trim()
  if (!raw) return ''

  const ymd = raw.match(/^(\d{4})[-/](\d{1,2})[-/](\d{1,2})/)
  if (ymd) {
    const date = buildLocalDate(Number(ymd[1]), Number(ymd[2]), Number(ymd[3]))
    return date ? dateOnlyFormatter.format(date) : raw
  }

  const dmy = raw.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})/)
  if (dmy) {
    const date = buildLocalDate(Number(dmy[3]), Number(dmy[2]), Number(dmy[1]))
    return date ? dateOnlyFormatter.format(date) : raw
  }

  const parsed = new Date(raw)
  return Number.isNaN(parsed.getTime()) ? raw : dateOnlyFormatter.format(parsed)
}

export function formatTimeOnlyLabel(value: unknown) {
  const raw = String(value ?? '').trim()
  if (!raw) return ''

  const time = raw.match(/(\d{1,2}):(\d{2})(?::(\d{2}))?/)
  if (time) {
    const hours = Number(time[1])
    const minutes = Number(time[2])
    const seconds = Number(time[3] ?? 0)
    if (hours < 24 && minutes < 60 && seconds < 60) {
      return [
        String(hours).padStart(2, '0'),
        String(minutes).padStart(2, '0'),
        String(seconds).padStart(2, '0'),
      ].join(':')
    }
  }

  const parsed = new Date(raw)
  return Number.isNaN(parsed.getTime()) ? raw : timeOnlyFormatter.format(parsed)
}

export function normalizeKeyToken(value: string) {
  return String(value ?? '')
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]/g, '')
}

export function isBlankText(value: unknown) {
  if (value === null || value === undefined) {
    return true
  }

  return String(value).trim() === ''
}

export function normalizeComparableText(value: unknown) {
  return String(value ?? '')
    .trim()
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
}

export function compareNullableTextLast(left: unknown, right: unknown) {
  const leftBlank = isBlankText(left)
  const rightBlank = isBlankText(right)

  if (leftBlank && rightBlank) {
    return 0
  }

  if (leftBlank) {
    return 1
  }

  if (rightBlank) {
    return -1
  }

  const normalizedLeft = normalizeComparableText(left)
  const normalizedRight = normalizeComparableText(right)
  if (normalizedLeft !== normalizedRight) {
    return normalizedLeft.localeCompare(normalizedRight, 'es')
  }

  return String(left).trim().localeCompare(String(right).trim(), 'es')
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
