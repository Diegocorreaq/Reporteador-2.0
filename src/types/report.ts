export type FilterFieldType = 'search' | 'select' | 'date'

export interface FilterOption {
  label: string
  value: string
}

export interface FilterFieldConfig {
  id: string
  label: string
  type: FilterFieldType
  placeholder?: string
  options?: FilterOption[]
}

export interface DetailItem {
  label: string
  value: string
}

export interface ChartSeriesConfig {
  name: string
  type: 'line' | 'bar'
  data: number[]
}
