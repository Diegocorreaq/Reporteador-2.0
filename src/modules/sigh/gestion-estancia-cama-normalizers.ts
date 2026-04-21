import type {
  EstanciaHospitalariaRow,
  GestionEstanciaResumenRow,
  MovimientoCabeceraRow,
  MovimientoCamaRow,
  MovimientoDxCqxRow,
  MovimientoDxRow,
  MovimientoProcedimientoRow,
  MovimientoProfesionalRow,
  MovimientoTransferenciaRow,
  SighCellValue,
  SighTableRow,
} from '@/modules/sigh/types'

function pickText(row: SighTableRow, candidates: string[]) {
  for (const candidate of candidates) {
    const value = row[candidate]
    if (value === null || value === undefined) {
      continue
    }

    const text = String(value).trim()
    if (text !== '') {
      return text
    }
  }

  return ''
}

function pickNumber(row: SighTableRow, candidates: string[]) {
  const value = pickText(row, candidates)
  if (value === '') {
    return 0
  }

  const parsed = Number(String(value).replaceAll(',', ''))
  return Number.isFinite(parsed) ? parsed : 0
}

function toSafeCellValue(value: SighCellValue) {
  return value === null || value === undefined ? '' : value
}

export function normalizeEstanciaHospitalariaRow(row: SighTableRow): EstanciaHospitalariaRow {
  return {
    servicio: pickText(row, ['servicio', 'SERVICIO']),
    idcuenta: pickText(row, ['idcuenta', 'IDCUENTAATENCION', 'IDCUENTA', 'IdCuentaAtencion']),
    paciente: pickText(row, ['paciente', 'PACIENTE']),
    edad: pickText(row, ['edad', 'EDAD']),
    tedad: pickText(row, ['tedad', 'tipoedad', 'TIPOEDAD']),
    codServicio: pickText(row, ['cod_servicio', 'codServicio', 'COD_SERVICIO']),
    ffto: pickText(row, ['ffto', 'FTEFTO']),
    diash: pickText(row, ['diash', 'DIAHOSP', 'DIAH']),
    diass: pickText(row, ['diass', 'DIASERV', 'DIAS']),
    horas: pickText(row, ['horas', 'HORASERV', 'HORA']),
    dxing1: pickText(row, ['dxing1', 'DESDX', 'DXING1']),
    dxevo1: pickText(row, ['dxevo1', 'DXEVO1']),
    dxevo2: pickText(row, ['dxevo2', 'DXEVO2']),
  }
}

export function normalizeGestionEstanciaResumenRow(
  row: SighTableRow | null | undefined,
): GestionEstanciaResumenRow | null {
  if (!row) {
    return null
  }

  const hasAnySummaryField = ['disponible', 'DISPONIBLE', 'ocupado', 'OCUPADO', 'libre', 'LIBRE'].some(
    (key) => key in row,
  )
  if (!hasAnySummaryField) {
    return null
  }

  return {
    disponible: pickNumber(row, ['disponible', 'DISPONIBLE']),
    ocupado: pickNumber(row, ['ocupado', 'OCUPADO']),
    libre: pickNumber(row, ['libre', 'LIBRE']),
  }
}

export function buildEstanciaDisplayValue(row: EstanciaHospitalariaRow) {
  const isHoras = row.codServicio === '75'
  if (isHoras) {
    const horas = row.horas.trim()
    return horas ? `${horas} Hrs` : ''
  }

  return row.diass
}

export function normalizeMovimientoCamaRow(row: SighTableRow): MovimientoCamaRow {
  return {
    orden: pickText(row, ['orden', 'ORDEN']),
    servicio: pickText(row, ['servicio', 'SERVICIO', 'detalle', 'DETALLE']),
    fecha: pickText(row, ['fecha', 'FECHA']),
  }
}

export function normalizeMovimientoDxRow(row: SighTableRow): MovimientoDxRow {
  return {
    tipoeval: pickText(row, ['tipoeval', 'TIPOEVAL']),
    ciex: pickText(row, ['ciex', 'CIEX10', 'CIEX']),
    desciex: pickText(row, ['desciex', 'DESCIEX10', 'DESCIEX']),
    tipodx: pickText(row, ['tipodx', 'TIPODX']),
    medico: pickText(row, ['medico', 'MEDICO']),
  }
}

export function normalizeMovimientoTransferenciaRow(row: SighTableRow): MovimientoTransferenciaRow {
  return {
    secuencia: pickText(row, ['secuencia', 'SECUENCIA']),
    fechao: pickText(row, ['fechao', 'FECHAO', 'FECHAOCUPA']),
    servicio: pickText(row, ['servicio', 'SERVICIO']),
    cama: pickText(row, ['cama', 'CAMA']),
    fechad: pickText(row, ['fechad', 'FECHAD', 'FECHADESOCUPA']),
    dias: pickText(row, ['dias', 'DIAS', 'DIASESTANCIA']),
    ciex: pickText(row, ['ciex', 'CIEX']),
    desciex: pickText(row, ['desciex', 'DESCIEX']),
    medico: pickText(row, ['medico', 'MEDICO']),
  }
}

export function normalizeMovimientoCabeceraRow(row: SighTableRow): MovimientoCabeceraRow {
  return {
    fecha: pickText(row, ['fecha', 'FECHA']),
    servicio: pickText(row, ['servicio', 'SERVICIO']),
    sop: pickText(row, ['sop', 'SOP']),
  }
}

export function normalizeMovimientoProfesionalRow(row: SighTableRow): MovimientoProfesionalRow {
  return {
    tipo: pickText(row, ['tipo', 'TIPO']),
    empleado: pickText(row, ['empleado', 'EMPLEADO']),
    especialidad: pickText(row, ['especialidad', 'ESPECIALIDAD']),
    destipo: pickText(row, ['destipo', 'DESTIPO']),
  }
}

export function normalizeMovimientoProcedimientoRow(row: SighTableRow): MovimientoProcedimientoRow {
  return {
    codigo: pickText(row, ['codigo', 'CODIGO']),
    nombre: pickText(row, ['nombre', 'NOMBRE']),
  }
}

export function normalizeMovimientoDxCqxRow(row: SighTableRow): MovimientoDxCqxRow {
  return {
    ciex: pickText(row, ['ciex', 'CIEX']),
    nombre: pickText(row, ['nombre', 'NOMBRE', 'DESCIEX']),
    tipo: pickText(row, ['tipo', 'TIPODX']),
  }
}

export function sanitizeRowValues(row: SighTableRow) {
  return Object.fromEntries(
    Object.entries(row).map(([key, value]) => [key, toSafeCellValue(value)]),
  ) as SighTableRow
}
