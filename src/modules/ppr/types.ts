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
  activityGroups?: Array<{ code: string; name: string; sortOrder: number }>
  activityScope?: Array<{ code: string; name: string; sortOrder: number }>
}

export interface PprProgramDocument {
  id: number
  documentType: string
  documentKey: string | null
  documentYear: number
  versionLabel: string
  displayName: string
  fileName: string
  mimeType: string
  sizeBytes: number
  contentHash: string
  sourceUrl: string | null
  sortOrder: number
  uploadedAt: string
  programCode: string
  programName: string
  notes: string | null
}

export interface PprActividad {
  id: number
  code: string
  name: string
  activityGroup: { code: string; name: string; sortOrder: number } | null
  canEdit: boolean
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

export interface PprActivityGroup {
  code: string
  name: string
  sortOrder: number
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
  rowKey?: string
  programaId: number
  code: string
  name: string
  activityGroup: PprActivityGroup | null
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
  activityGroups?: PprActivityGroup[]
}

export interface PprActividadAdmin {
  id: number
  programId: number
  code: string
  name: string
  activityGroupCode: string | null
  activityGroup: PprActivityGroup | null
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
  sourceKey: string | null
  name: string
  activityGroup: PprActivityGroup | null
  unit: string
  annualGoal: number | null
  sortOrder: number
  months: PprActividadMes[]
}

export interface PprProgramaDetalle {
  programId: number
  programCode: string
  programName: string
  activityGroups?: PprActivityGroup[]
  activityScope?: PprActivityGroup[]
  activities: PprActividadDetalle[]
}

export interface PprPreliminarActividad {
  activityId: number
  code: string
  name: string
  unit: string
  annualGoal: number | null
  monthlyGoal: number | null
  monthlyGoalFull?: number | null
  monthlyGoalPct: number | null
  sourceKey: string | null
  value: number
}

export interface PprProgramaPreliminar {
  programId: number
  programCode: string
  programName: string
  sourceId: string
  sourceLabel: string
  isPreliminary: boolean
  generatedAt: string
  cutoffAt: string
  cutoffLabel: string
  timeZone: string
  rangeStart: string
  rangeEnd: string
  totalActivities: number
  rowsRead: number
  rowsMatched: number
  rowsUnmatched: number
  totalValue: number
  monthlyGoal: number
  monthlyGoalFull?: number
  cutoffGoalFactor?: number
  cutoffDay?: number | null
  daysInMonth?: number | null
  monthlyGoalPct: number | null
  items: PprPreliminarActividad[]
  unmatchedSourceRows: Array<{ sourceKey: string; sourceValue: number }>
  manualActivities: Array<{ activityId: number; activityName: string; sourceKey: string | null }>
}

export interface PprEvaluacionMensualActividad {
  activityId: number
  code: string
  name: string
  unit: string
  annualGoal: number | null
  monthlyGoal: number | null
  monthlyGoalFull?: number | null
  value: number | null
  monthlyGoalPct: number | null
  status: 'en_meta' | 'seguimiento' | 'critico' | 'pendiente_automatizacion' | 'sin_dato' | 'con_avance' | 'sin_meta' | string
  isPendingAutomation?: boolean
  sourceKey: string | null
}

export interface PprEvaluacionMensual {
  programId: number
  programCode: string
  programName: string
  year: number
  month: number
  monthLabel: string
  sourceMode: 'preliminary' | 'consolidated' | string
  periodId: number | null
  periodIsOpen: boolean
  isPreliminary: boolean
  cutoffAt: string | null
  cutoffLabel: string | null
  rangeStart: string | null
  rangeEnd: string | null
  totalActivities: number
  withValue: number
  totalValue: number
  monthlyGoal: number
  monthlyGoalFull?: number
  cutoffGoalFactor?: number
  cutoffDay?: number | null
  daysInMonth?: number | null
  monthlyGoalPct: number | null
  statusCounts: Record<string, number>
  activities: PprEvaluacionMensualActividad[]
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
  programCodes?: string[]
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
