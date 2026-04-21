export type SighCellValue = string | number | boolean | null

export type SighTableRow = Record<string, SighCellValue>

export interface EstanciaHospitalariaRow {
  servicio: string
  idcuenta: string
  paciente: string
  edad: string
  tedad: string
  codServicio: string
  ffto: string
  diash: string
  diass: string
  horas: string
  dxing1: string
  dxevo1: string
  dxevo2: string
}

export interface GestionEstanciaResumenRow {
  disponible: number
  ocupado: number
  libre: number
}

export type NumeroCamasRow = GestionEstanciaResumenRow

export interface MovimientoCamaRow {
  orden: string
  servicio: string
  fecha: string
}

export interface MovimientoDxRow {
  tipoeval: string
  ciex: string
  desciex: string
  tipodx: string
  medico: string
}

export interface MovimientoTransferenciaRow {
  secuencia: string
  fechao: string
  servicio: string
  cama: string
  fechad: string
  dias: string
  ciex: string
  desciex: string
  medico: string
}

export interface MovimientoCabeceraRow {
  fecha: string
  servicio: string
  sop: string
}

export interface MovimientoProfesionalRow {
  tipo: string
  empleado: string
  especialidad: string
  destipo: string
}

export interface MovimientoProcedimientoRow {
  codigo: string
  nombre: string
}

export interface MovimientoDxCqxRow {
  ciex: string
  nombre: string
  tipo: string
}

export interface SighOption {
  value: string
  label: string
}

export interface LegacyValidationResponse {
  ok: boolean
  employeeId: number | null
  employeeName: string
  message: string
}

export interface SighExportCatalogOption {
  key: string
  fileName: string
  maxDays: number | null
}

export interface FamiliaPendienteRow {
  servicioActual: string
  idCuenta: string
  paciente: string
  fechaIngreso: string
  fechaUltInforme: string
  seInformo: string
  diasHosp: string
  tiempoSinInforme: string
  fechaCorte: string
  estado: string
  alertState: 'over12' | 'over24'
}

export interface FamiliaPendienteReport {
  rows: FamiliaPendienteRow[]
  counters: {
    over12: number
    over24: number
  }
}

export interface ProduccionMedicoEmpleado {
  idEmpleado: number
  dni: string
  empleado: string
  especialidad: string
}

export interface ProduccionMedicosResumenReport {
  filters: {
    fechaInicio: string
    fechaFin: string
    empleadoId: number
  }
  dayRange: {
    diaInicio: number
    diaFin: number
    numeroDias: number
  } | null
  rows: SighTableRow[]
}

export interface ProduccionMedicosDetalleReport {
  filters: {
    fechaInicio: string
    fechaFin: string
    empleadoId: number
    orden: number
  }
  rows: SighTableRow[]
}

export interface GestionCitasBlockReport {
  id: string
  title: string
  days: string[]
  rows: SighTableRow[]
}

export interface GestionCitasReport {
  filters: {
    fechaInicio: string
    fechaFin: string
  }
  blocks: GestionCitasBlockReport[]
}

export interface MonitoreoTicketsSummary {
  tiempoMinimo: string
  tiempoPromedio: string
  tiempoMaximo: string
  enEspera: number
}

export interface MonitoreoTicketsReport {
  generatedAt: string
  summary: MonitoreoTicketsSummary
  rows: SighTableRow[]
}

export interface MonitoreoVentanillaReport {
  generatedAt: string
  rows: SighTableRow[]
}
