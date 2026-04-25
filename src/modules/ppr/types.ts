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
