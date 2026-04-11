import type { CentroObstetricoFilters } from '@/modules/centro-obstetrico/types'

const integerFormatter = new Intl.NumberFormat('es-CO', {
  maximumFractionDigits: 0,
})

const decimalFormatter = new Intl.NumberFormat('es-CO', {
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
})

const singleDecimalFormatter = new Intl.NumberFormat('es-CO', {
  minimumFractionDigits: 1,
  maximumFractionDigits: 1,
})

const dateFormatter = new Intl.DateTimeFormat('es-CO', {
  year: 'numeric',
  month: 'long',
  day: '2-digit',
})

function padDatePart(value: number) {
  return String(value).padStart(2, '0')
}

function parseLocalDate(value: string) {
  const [year, month, day] = value.split('-').map(Number)
  return new Date(year, month - 1, day)
}

export function buildDefaultCentroObstetricoFilters(seed?: string | Date): CentroObstetricoFilters {
  const baseDate =
    typeof seed === 'string'
      ? parseLocalDate(seed)
      : seed ?? new Date()

  const year = baseDate.getFullYear()

  return {
    fechaInicio: `${year}-01-01`,
    fechaFin: `${year}-12-31`,
  }
}

export function formatInteger(value: number) {
  return integerFormatter.format(value)
}

export function formatDecimal(value: number, digits = 2) {
  if (digits === 1) {
    return singleDecimalFormatter.format(value)
  }

  return decimalFormatter.format(value)
}

export function formatDateLabel(value: string) {
  return dateFormatter.format(parseLocalDate(value))
}

export function formatInputDate(value: Date) {
  return `${value.getFullYear()}-${padDatePart(value.getMonth() + 1)}-${padDatePart(value.getDate())}`
}