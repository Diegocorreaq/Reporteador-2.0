export interface CriticalCareFilters {
  fechaInicio: string
  fechaFin: string
}

export interface CriticalCareSection {
  key: string
  title: string
  procedure: string
  rows: Array<Record<string, unknown>>
}

export interface CriticalCarePriorityDetail {
  prioridad: string
  detalle: Array<Record<string, unknown>>
  detalleOperativo: Array<Record<string, unknown>>
}

export interface CriticalCareReportResponse {
  module: 'ucca' | 'uccp'
  filters: CriticalCareFilters
  generatedAt: string
  sections: Record<string, CriticalCareSection>
  detailPrioridad: CriticalCarePriorityDetail[]
}
