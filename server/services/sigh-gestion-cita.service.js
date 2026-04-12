import { executeProcedure, sql } from './legacy-sql.service.js'

const REPORT_TIMEOUT_MS = 180000

function toDateOnly(value) {
  return String(value ?? '').trim().slice(0, 10)
}

function validateDateRange(fechaInicio, fechaFin) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(fechaInicio) || !/^\d{4}-\d{2}-\d{2}$/.test(fechaFin)) {
    throw new Error('Las fechas deben enviarse en formato YYYY-MM-DD.')
  }

  if (fechaInicio > fechaFin) {
    throw new Error('La fecha de inicio no puede ser mayor que la fecha fin.')
  }
}

async function runDateProcedure(procedure, fechaInicio, fechaFin) {
  const rows = await executeProcedure(
    procedure,
    [
      { name: 'fecini', type: sql.NVarChar, value: fechaInicio },
      { name: 'fecfin', type: sql.NVarChar, value: fechaFin },
    ],
    { timeoutMs: REPORT_TIMEOUT_MS },
  )

  return rows.map((row) => String(row.DIASERIE ?? row.diaserie ?? '').trim()).filter(Boolean)
}

async function runRowsProcedure(procedure, fechaInicio, fechaFin) {
  const rows = await executeProcedure(
    procedure,
    [
      { name: 'fecini', type: sql.NVarChar, value: fechaInicio },
      { name: 'fecfin', type: sql.NVarChar, value: fechaFin },
    ],
    { timeoutMs: REPORT_TIMEOUT_MS },
  )

  return rows
}

function normalizeTicketSummary(rows) {
  const row = rows[0]
  if (!row) {
    return {
      tiempoMinimo: '',
      tiempoPromedio: '',
      tiempoMaximo: '',
      enEspera: 0,
    }
  }

  return {
    tiempoMinimo: String(row.T_MIN ?? '').trim(),
    tiempoPromedio: String(row.T_PROM ?? '').trim(),
    tiempoMaximo: String(row.T_MAX ?? '').trim(),
    enEspera: Number(row.CANTIDAD ?? 0),
  }
}

export async function getGestionCitasReport(filters) {
  const fechaInicio = toDateOnly(filters.fechaInicio)
  const fechaFin = toDateOnly(filters.fechaFin)
  validateDateRange(fechaInicio, fechaFin)

  const [daysCe, rowsCe, daysCeProd, rowsCeProd, daysTm, rowsTm, daysTo, rowsTo] = await Promise.all([
    runDateProcedure('SP_MONITOREO_FECHA_AVANCE', fechaInicio, fechaFin),
    runRowsProcedure('SP_UPSS_MONITOREO_5', fechaInicio, fechaFin),
    runDateProcedure('SP_MONITOREO_FECHA_AVANCE_1', fechaInicio, fechaFin),
    runRowsProcedure('SP_UPSS_MONITOREO_6', fechaInicio, fechaFin),
    runDateProcedure('SP_MONITOREO_FECHA_AVANCE_2', fechaInicio, fechaFin),
    runRowsProcedure('SP_UPSS_MONITOREO_7', fechaInicio, fechaFin),
    runDateProcedure('SP_MONITOREO_FECHA_AVANCE_3', fechaInicio, fechaFin),
    runRowsProcedure('SP_UPSS_MONITOREO_8', fechaInicio, fechaFin),
  ])

  return {
    filters: { fechaInicio, fechaFin },
    blocks: [
      {
        id: 'ce',
        title: 'Consultorios Ambulatorios',
        days: daysCe,
        rows: rowsCe,
      },
      {
        id: 'ceprod',
        title: 'Produccion Consulta Externa',
        days: daysCeProd,
        rows: rowsCeProd,
      },
      {
        id: 'tm',
        title: 'Telemonitoreo',
        days: daysTm,
        rows: rowsTm,
      },
      {
        id: 'to',
        title: 'Teleorientacion',
        days: daysTo,
        rows: rowsTo,
      },
    ],
  }
}

export async function getRolConsultaExternaReport(filters) {
  const fechaInicio = toDateOnly(filters.fechaInicio)
  const fechaFin = toDateOnly(filters.fechaFin)
  validateDateRange(fechaInicio, fechaFin)

  const [daysCe, rowsCe, daysProc, rowsProc, daysInt, rowsInt] = await Promise.all([
    runDateProcedure('SP_MONITOREO_FECHA_AVANCE_A', fechaInicio, fechaFin),
    runRowsProcedure('SP_UPSS_MONITOREO_P1', fechaInicio, fechaFin),
    runDateProcedure('SP_MONITOREO_FECHA_AVANCE', fechaInicio, fechaFin),
    runRowsProcedure('SP_UPSS_MONITOREO_P2', fechaInicio, fechaFin),
    runDateProcedure('SP_MONITOREO_FECHA_AVANCE_4', fechaInicio, fechaFin),
    runRowsProcedure('SP_UPSS_MONITOREO_P3', fechaInicio, fechaFin),
  ])

  return {
    filters: { fechaInicio, fechaFin },
    blocks: [
      {
        id: 'ce',
        title: 'Consultorios ambulatorios',
        days: daysCe,
        rows: rowsCe,
      },
      {
        id: 'proc',
        title: 'Procedimientos',
        days: daysProc,
        rows: rowsProc,
      },
      {
        id: 'int',
        title: 'Interconsultas',
        days: daysInt,
        rows: rowsInt,
      },
    ],
  }
}

export async function getMonitoreoTicketsReport() {
  const [summaryRows, detailRows] = await Promise.all([
    executeProcedure('SP_VENTANILLA_PROMEDIO', [], { timeoutMs: REPORT_TIMEOUT_MS }),
    executeProcedure('SP_VENTANILLA_DATOS', [], { timeoutMs: REPORT_TIMEOUT_MS }),
  ])

  return {
    generatedAt: new Date().toISOString(),
    summary: normalizeTicketSummary(summaryRows),
    rows: detailRows,
  }
}

export async function getMonitoreoVentanillaReport() {
  const rows = await executeProcedure('SP_VENTANILLA_TIEMPO', [], { timeoutMs: REPORT_TIMEOUT_MS })
  return {
    generatedAt: new Date().toISOString(),
    rows,
  }
}
