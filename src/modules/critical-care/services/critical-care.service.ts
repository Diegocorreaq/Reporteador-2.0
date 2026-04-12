import { httpClient } from '@/services/http/client'
import type {
  CriticalCareFilters,
  CriticalCareModule,
  CriticalCareReportResponse,
} from '@/modules/critical-care/types'

function normalizeDate(value: string) {
  return value.slice(0, 10)
}

export function buildDefaultCriticalCareFilters() {
  const today = new Date()
  const year = today.getFullYear()

  return {
    fechaInicio: `${year}-01-01`,
    fechaFin: `${year}-12-31`,
  } satisfies CriticalCareFilters
}

export async function fetchCriticalCareReport(
  module: CriticalCareModule,
  filters: CriticalCareFilters,
) {
  const response = await httpClient.get<CriticalCareReportResponse>(`/reports/${module}`, {
    params: {
      fechaInicio: normalizeDate(filters.fechaInicio),
      fechaFin: normalizeDate(filters.fechaFin),
    },
    timeout: 180000,
  })

  return response.data
}
