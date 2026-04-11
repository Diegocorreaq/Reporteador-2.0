export interface CentroObstetricoFilters {
  fechaInicio: string
  fechaFin: string
}

export interface CentroObstetricoRawRow {
  fecha: string
  anio: number
  mesNumero: number
  totalIngresos: number
  nroTransferidosHospObstetricia: number
  nroTransferidosUci: number
  nroTransferidosOtrosServicios: number
  altaMedica: number
  totalReferidos: number
  destinoVillaPanamericana: number
  destinoOtros: number
  fallecidos: number
  fallecidoMenor12Horas: number
  fallecidos12a48Horas: number
  fallecidosMayorIgual48Horas: number
  egresos: number
  estancia: number
  pacienteDia: number
  camaDia: number
  diferenciaCamasPacientes: number
  camasDisponiblesPromedio: number
}

export interface CentroObstetricoSummaryRow {
  anio: number
  mesNumero: number
  mesLabel: string
  totalIngresos: number
  nroTransferidosHospObstetricia: number
  nroTransferidosUci: number
  nroTransferidosOtrosServicios: number
  altaMedica: number
  totalReferidos: number
  destinoVillaPanamericana: number
  destinoOtros: number
  fallecidos: number
  fallecidoMenor12Horas: number
  fallecidos12a48Horas: number
  fallecidosMayorIgual48Horas: number
  egresos: number
}

export interface CentroObstetricoSummaryTotals {
  totalIngresos: number
  nroTransferidosHospObstetricia: number
  nroTransferidosUci: number
  nroTransferidosOtrosServicios: number
  altaMedica: number
  totalReferidos: number
  destinoVillaPanamericana: number
  destinoOtros: number
  fallecidos: number
  fallecidoMenor12Horas: number
  fallecidos12a48Horas: number
  fallecidosMayorIgual48Horas: number
  egresos: number
}

export interface PermanenciaRow {
  anio: number
  mesNumero: number
  mesLabel: string
  totalDiasEstancia: number
  nroEgresosHospitalarios: number
  indicador: number
}

export interface PermanenciaTotals {
  totalDiasEstancia: number
  nroEgresosHospitalarios: number
  indicador: number
}

export interface SustitucionRow {
  anio: number
  mesNumero: number
  mesLabel: string
  camasDiaMenosPacienteDia: number
  nroEgresosHospitalarios: number
  indicador: number
  nroHoras: number
}

export interface SustitucionTotals {
  camasDiaMenosPacienteDia: number
  nroEgresosHospitalarios: number
  indicador: number
  nroHoras: number
}

export interface OcupacionRow {
  anio: number
  mesNumero: number
  mesLabel: string
  pacienteDia: number
  diasCamaDisponible: number
  indicador: number
}

export interface OcupacionTotals {
  pacienteDia: number
  diasCamaDisponible: number
  indicador: number
}

export interface RendimientoRow {
  anio: number
  mesNumero: number
  mesLabel: string
  nroEgresosHospitalarios: number
  nroCamasDisponibles: number
  indicador: number
}

export interface RendimientoTotals {
  nroEgresosHospitalarios: number
  nroCamasDisponibles: number
  indicador: number
}

export interface MetricChartSeries {
  name: string
  data: number[]
}

export interface MetricChartData {
  categories: string[]
  series: MetricChartSeries[]
}

export interface MetricPanelPayload<TRow, TTotals> {
  title: string
  tableRows: TRow[]
  totals: TTotals
  chart: MetricChartData
  minReference: number
  maxReference: number
  note?: string
}

export interface CentroObstetricoPagePayload {
  filters: CentroObstetricoFilters
  lastUpdated: string
  summary: {
    title: string
    rows: CentroObstetricoSummaryRow[]
    totals: CentroObstetricoSummaryTotals
  }
  panels: {
    permanencia: MetricPanelPayload<PermanenciaRow, PermanenciaTotals>
    sustitucion: MetricPanelPayload<SustitucionRow, SustitucionTotals>
    ocupacion: MetricPanelPayload<OcupacionRow, OcupacionTotals>
    rendimiento: MetricPanelPayload<RendimientoRow, RendimientoTotals>
  }
  source: 'api' | 'fallback'
}

export interface CentroObstetricoRawResponse {
  lastUpdated: string
  rows: CentroObstetricoRawRow[]
}
