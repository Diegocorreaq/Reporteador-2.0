export interface PprPeriodo {
  id: number
  year: number
  month: number
  label: string
  isOpen: boolean
  deadline: string | null
}

export interface PprPrograma {
  id: number
  code: string
  name: string
  totalActividades: number
  conDatos: number
  sumLogrado: number
  sumMetaEsperada: number
  sumMetaAnual: number
  mesesCompletos: number
}

export interface PprActividad {
  id: number
  code: string
  name: string
  unit: string
  annualGoal: number | null
  sortOrder: number
  value: number | null
  notes: string
  signed: boolean
  valueSource: 'manual' | 'source' | 'manual_override' | string
  sourceKey: string | null
  sourceValue: number | null
  loadedAt: string | null
  validatedAt: string | null
  validationStatus: 'pending' | 'validated' | string
}

export interface PprPeriodoItem extends PprPeriodo {
  isSigned: boolean
  signedAt: string | null
  completadas: number
  totalActividades: number
}

export interface PprResumenMes {
  periodoId: number | null
  month: number
  label: string
  completadas: number
  totalActividades: number
  isSigned: boolean
}

export interface PprResumenPrograma {
  programaId: number
  code: string
  name: string
  meses: PprResumenMes[]
}

export interface PprCoordinador {
  employeeId: number
  employeeName: string
  dni: string
  activo: boolean
  fechaAlta: string | null
  programas: Array<{ id: number; code: string; name: string }>
}

export interface PprProgramaAdmin {
  id: number
  code: string
  name: string
}

export interface PprActividadAdmin {
  id: number
  programId: number
  code: string
  name: string
  unit: string
  annualGoal: number | null
  sortOrder: number
  isActive: boolean
}

export interface PprEmpleadoResult {
  employeeId: number
  name: string
  dni: string
  cargo: string
}

export interface PprActividadMes {
  month: number
  periodId: number | null
  value: number | null
  notes: string | null
}

export interface PprActividadDetalle {
  id: number
  code: string
  name: string
  unit: string
  annualGoal: number | null
  sortOrder: number
  months: PprActividadMes[]
}

export interface PprProgramaDetalle {
  programId: number
  programCode: string
  programName: string
  activities: PprActividadDetalle[]
}

export interface PprValidationSummary {
  total: number
  withValue: number
  validated: number
  pending: number
  imported: number
  edited: number
  manual: number
  canSign: boolean
}

export interface PprImportSource {
  id: string
  label: string
  procedureName: string
  description: string
}

export interface PprImportResult {
  runId: number
  periodId: number
  periodLabel: string
  programId: number
  sourceId: string
  sourceLabel: string
  startedAt: string | null
  completedAt: string | null
  rowsRead: number
  rowsMatched: number
  rowsUpdated: number
  rowsUnmatched: number
  unmatchedSourceRows: Array<{ sourceKey: string; sourceValue: number }>
  manualActivities: Array<{ activityId: number; activityName: string; sourceKey: string | null }>
}
