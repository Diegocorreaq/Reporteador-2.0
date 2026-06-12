import {
  executeProcedure_Sigh1 as executeProcedure,
  executeQuery_Sigh1 as executeQuery,
  sql,
} from './sigh-sql-helpers.js'
import { buildProduccionObstetrasWorkbook, MIME_XLSX } from './excel-export.service.js'
import { buildProduccionObstetrasPdf, MIME_PDF } from './pdf-export.service.js'

const REPORT_TIMEOUT_MS = 180000
const MAX_RANGE_DAYS = 31
const ACTIVITIES = [
  'ATENCION_CE',
  'TRIAJE_CE',
  'TRIAJE_EMERGENCIA',
  'ATENCIONES_SERVICIOS_GO',
  'FICHAS_EVOLUCION',
  'MONITOREO_FETAL',
  'ATENCION_PARTO',
  'REGISTRO_CNV',
  'PLANIFICACION_FAMILIAR_HOSP',
]

function toDateOnly(value) {
  return String(value ?? '').trim().slice(0, 10)
}

function validateDateRange(fechaInicio, fechaFin) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(fechaInicio) || !/^\d{4}-\d{2}-\d{2}$/.test(fechaFin)) {
    throw new Error('Ingrese un rango de fechas válido.')
  }
  if (fechaInicio > fechaFin) throw new Error('La fecha inicial no puede ser mayor que la fecha final.')
  const days = Math.floor((new Date(`${fechaFin}T00:00:00`) - new Date(`${fechaInicio}T00:00:00`)) / 86400000) + 1
  if (days > MAX_RANGE_DAYS) throw new Error(`La diferencia de fechas no debe exceder ${MAX_RANGE_DAYS} días.`)
}

function readValue(row, names) {
  const entries = Object.entries(row ?? {})
  for (const name of names) {
    const match = entries.find(([key]) => key.toLowerCase() === name.toLowerCase())
    if (match) return match[1]
  }
  return undefined
}

function normalizeSummaryRows(rows, dayRange) {
  const byActivity = new Map(
    (Array.isArray(rows) ? rows : []).map((row) => [
      String(readValue(row, ['TIPOACTIVIDAD', 'TIPO_ACTIVIDAD', 'ACTIVIDAD']) ?? '').trim().toUpperCase(),
      row,
    ]),
  )

  return ACTIVITIES.map((activity, index) => {
    const source = byActivity.get(activity) ?? {}
    const normalized = {
      ...source,
      ORD: Number(readValue(source, ['ORD', 'COD_ACT']) ?? index + 1),
      TIPOACTIVIDAD: activity,
    }
    if (dayRange) {
      for (let day = dayRange.diaInicio; day <= dayRange.diaFin; day += 1) {
        if (normalized[String(day)] == null) normalized[String(day)] = 0
      }
    }
    return normalized
  })
}

function sanitizeFileNamePart(value) {
  return String(value ?? '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-zA-Z0-9._-]+/g, '_')
    .replace(/^_+|_+$/g, '')
    .slice(0, 80)
}

async function getObstetra(empleadoId) {
  const rows = await executeQuery(
    `SELECT TOP 1
       E.IdEmpleado AS idEmpleado,
       E.DNI AS dni,
       UPPER(E.ApellidoPaterno + ' ' + E.ApellidoMaterno + ' ' + E.Nombres) AS nombre,
       UPPER(TE.Descripcion) AS tipoEmpleado
     FROM SIGH..Empleados E
     INNER JOIN SIGH..TiposEmpleado TE ON TE.IdTipoEmpleado = E.IdTipoEmpleado
     WHERE E.IdEmpleado = @empleadoId AND E.IdTipoEmpleado = 28`,
    [{ name: 'empleadoId', type: sql.Int, value: Number(empleadoId ?? 0) }],
    { timeoutMs: REPORT_TIMEOUT_MS },
  )
  if (!rows[0]) throw new Error('Seleccione un profesional de la lista de resultados.')
  return {
    idEmpleado: Number(rows[0].idEmpleado),
    dni: String(rows[0].dni ?? '').trim(),
    nombre: String(rows[0].nombre ?? '').trim(),
    tipoEmpleado: String(rows[0].tipoEmpleado ?? '').trim(),
  }
}

export async function searchProduccionObstetras(term) {
  const queryTerm = String(term ?? '').trim()
  if (queryTerm.length < 3) return []
  const rows = await executeQuery(
    `SELECT TOP 30
       E.IdEmpleado AS idEmpleado,
       E.DNI AS dni,
       UPPER(E.ApellidoPaterno + ' ' + E.ApellidoMaterno + ' ' + E.Nombres) AS nombre,
       UPPER(TE.Descripcion) AS tipoEmpleado
     FROM SIGH..Empleados E
     INNER JOIN SIGH..TiposEmpleado TE ON TE.IdTipoEmpleado = E.IdTipoEmpleado
     WHERE E.IdTipoEmpleado = 28
       AND UPPER(E.ApellidoPaterno + ' ' + E.ApellidoMaterno + ' ' + E.Nombres) LIKE UPPER(@term) + '%'
     ORDER BY E.ApellidoPaterno, E.ApellidoMaterno, E.Nombres`,
    [{ name: 'term', type: sql.NVarChar, value: queryTerm }],
    { timeoutMs: REPORT_TIMEOUT_MS },
  )
  return rows.map((row) => ({
    idEmpleado: Number(row.idEmpleado ?? 0),
    dni: String(row.dni ?? '').trim(),
    nombre: String(row.nombre ?? '').trim(),
    tipoEmpleado: String(row.tipoEmpleado ?? '').trim(),
  }))
}

export async function getProduccionObstetrasResumen(filters) {
  const fechaInicio = toDateOnly(filters.fechaInicio)
  const fechaFin = toDateOnly(filters.fechaFin)
  const empleadoId = Number(filters.empleadoId ?? 0)
  if (!empleadoId) throw new Error('Seleccione un profesional de la lista de resultados.')
  validateDateRange(fechaInicio, fechaFin)
  await getObstetra(empleadoId)

  const daysRows = await executeProcedure(
    'SP_REPORTE_PROD_MED_FECHA',
    [
      { name: 'fechaInicio', type: sql.NVarChar, value: fechaInicio },
      { name: 'fechaFin', type: sql.NVarChar, value: fechaFin },
    ],
    { timeoutMs: REPORT_TIMEOUT_MS },
  )
  const dayRange = daysRows[0]
    ? {
        diaInicio: Number(daysRows[0].DIA_INI ?? 1),
        diaFin: Number(daysRows[0].DIA_FIN ?? 1),
        numeroDias: Number(daysRows[0].NRO_DIA ?? 1),
      }
    : null
  const summaryRows = await executeProcedure(
    'SP_REPORTE_PRODUCCION_OBST_P1',
    [
      { name: 'FECHAINICIO', type: sql.NVarChar, value: fechaInicio },
      { name: 'FECHAFIN', type: sql.NVarChar, value: fechaFin },
      { name: 'DNI', type: sql.Int, value: empleadoId },
    ],
    { timeoutMs: REPORT_TIMEOUT_MS },
  )
  return {
    filters: { fechaInicio, fechaFin, empleadoId },
    dayRange,
    rows: normalizeSummaryRows(summaryRows, dayRange),
  }
}

export async function exportProduccionObstetrasExcel(filters) {
  const fechaInicio = toDateOnly(filters.fechaInicio)
  const fechaFin = toDateOnly(filters.fechaFin)
  const empleadoId = Number(filters.empleadoId ?? 0)
  if (!empleadoId) throw new Error('Seleccione un profesional de la lista de resultados.')
  validateDateRange(fechaInicio, fechaFin)

  const employee = await getObstetra(empleadoId)
  const rows = await executeProcedure(
    'SP_REPORTE_PRODUCCION_OBST_P2',
    [
      { name: 'FECHAINICIO', type: sql.NVarChar, value: fechaInicio },
      { name: 'FECHAFIN', type: sql.NVarChar, value: fechaFin },
      { name: 'DNI', type: sql.Int, value: empleadoId },
    ],
    { timeoutMs: REPORT_TIMEOUT_MS },
  )
  const fileName = `produccion_obstetra_${sanitizeFileNamePart(employee.dni || empleadoId)}.xlsx`
  return {
    fileName,
    mimeType: MIME_XLSX,
    content: await buildProduccionObstetrasWorkbook({ rows, startDate: fechaInicio, endDate: fechaFin, title: fileName }),
  }
}

export async function exportProduccionObstetrasPdf(filters) {
  const [report, employee] = await Promise.all([
    getProduccionObstetrasResumen(filters),
    getObstetra(filters.empleadoId),
  ])
  return {
    fileName: `produccion_obstetra_${sanitizeFileNamePart(employee.dni || employee.idEmpleado)}.pdf`,
    mimeType: MIME_PDF,
    content: buildProduccionObstetrasPdf({
      employee,
      rows: report.rows,
      dayRange: report.dayRange,
      startDate: report.filters.fechaInicio,
      endDate: report.filters.fechaFin,
    }),
  }
}
