import { httpClient } from '@/services/http/client'

export interface LegacyReportRequest {
  module: string
  action: string
  filters: Record<string, string>
}

export async function fetchLegacyReport<T>(request: LegacyReportRequest) {
  const response = await httpClient.get<T>('/reports', {
    params: request,
  })

  return response.data
}
