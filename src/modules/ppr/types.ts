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
  completadas: number
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
