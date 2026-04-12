export interface LavadoFilters {
  fechaInicio: string
  fechaFin: string
  tipo: number
}

export interface LavadoRegistroListItem {
  idregistro: number
  empleado: string
  tipoempleado: string
  fecha: string
  observacion: string
  tiempo: string
  estado: string
  upss: string
  servicio: string
}

export interface LavadoActividad {
  idactividad: number
  actividad: string
  tipo: number
}

export interface LavadoEmpleado {
  dni: string
  unido: string
  empleado: string
  tipoempleado: string
  idempleado: string
  upss: string
  servicio: string
}

export interface LavadoRegistroDetalleItem {
  idactividad: number
  actividad: string
  valoractividad?: number
  omision?: number
  lavado?: number
  friccion?: number
  guantes?: number
  tipo: number
}

export interface LavadoRegistroCabecera {
  idregistro: number
  nro_documento: string
  idempleado: number
  empleado: string
  tipo: number
  nombre_cargo: string
  fecha: string
  upss: string
  servicio: string
  tiempo: string
  observacion: string
  estado: string
}

export interface LavadoRegistroDetalle {
  registro: LavadoRegistroCabecera
  detalle: LavadoRegistroDetalleItem[]
}

export interface LavadoItemPayload {
  idActividad: number
  valor: number
  omision?: number
  lavado?: number
  friccion?: number
  guantes?: number
}

export interface LavadoRegistroPayload {
  empleadoId: number
  fechaRegistro: string
  tipo: number
  upss: string
  servicio: string
  tiempo: string
  observacion: string
  items: LavadoItemPayload[]
}
