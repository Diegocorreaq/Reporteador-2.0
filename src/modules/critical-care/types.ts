export type CriticalCareModule = 'ucca' | 'uccp'

export interface CriticalCareFilters {
  fechaInicio: string
  fechaFin: string
}

export interface CriticalCareDataset {
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
  module: CriticalCareModule
  filters: CriticalCareFilters
  generatedAt: string
  datasets: Record<string, CriticalCareDataset>
  sections?: Record<string, CriticalCareDataset>
  detailPrioridad: CriticalCarePriorityDetail[]
}

export interface CriticalCareTableHeaderCell {
  label: string
  colSpan?: number
  rowSpan?: number
  align?: 'left' | 'center' | 'right'
}

export interface CriticalCareTableColumn {
  key: string
  label: string
  aliases?: string[]
  align?: 'left' | 'center' | 'right'
  sum?: boolean
  decimals?: number
  multiplier?: number
  suffix?: string
  derivePercentOfKey?: string
  collapseDuplicates?: boolean
}

export interface CriticalCareTableTotalsFormula {
  targetKey: string
  numeratorKey: string
  denominatorKey: string
  multiplier?: number
  decimals?: number
}

export interface CriticalCareTableTotals {
  enabled?: boolean
  label?: string
  labelColSpan?: number
  formulas?: CriticalCareTableTotalsFormula[]
}

export interface CriticalCareTableSummaryCell {
  targetKey: string
  operation: 'sum' | 'ratio'
  sourceKey?: string
  numeratorKey?: string
  denominatorKey?: string
  multiplier?: number
  decimals?: number
}

export interface CriticalCareTableSummaryRow {
  label: string
  labelColSpan: number
  highlight?: boolean
  cells: CriticalCareTableSummaryCell[]
}

export interface CriticalCareTableBlockConfig {
  kind: 'table'
  datasetKey: string
  subtitle?: string
  columns: CriticalCareTableColumn[]
  headerRows?: CriticalCareTableHeaderCell[][]
  totals?: CriticalCareTableTotals
  summaryRows?: CriticalCareTableSummaryRow[]
  emptyMessage?: string
  priorityClickable?: boolean
}

export interface CriticalCareChartBlockConfig {
  kind: 'chart'
  datasetKey: string
  subtitle?: string
  title?: string
  chartType: 'line' | 'bar' | 'pie' | 'stacked_bar'
  seriesField?: string
  seriesAliases?: string[]
  categoryField?: string
  categoryAliases?: string[]
  valueField?: string
  valueAliases?: string[]
  filterField?: string
  filterAliases?: string[]
  filterEquals?: string
  invertFilter?: boolean
  startSeriesIndex?: number
  maxSeries?: number
  height?: number
}

export interface CriticalCareHeadingBlockConfig {
  kind: 'heading'
  text: string
}

export type CriticalCareModuleBlockConfig =
  | CriticalCareTableBlockConfig
  | CriticalCareChartBlockConfig
  | CriticalCareHeadingBlockConfig

export interface CriticalCareLayoutModule {
  id: string
  numberLabel: string
  title: string
  blocks: CriticalCareModuleBlockConfig[]
}

export interface CriticalCareLayoutConfig {
  module: CriticalCareModule
  modules: CriticalCareLayoutModule[]
}
