import { executeProcedure_Sigh1 as executeProcedure, executeQuery_Sigh1 as executeQuery, sql } from './sigh-sql-helpers.js'
import { buildProduccionMedicosWorkbook, MIME_XLSX } from './excel-export.service.js'
import { buildProduccionMedicosPdf, MIME_PDF } from './pdf-export.service.js'

const REPORT_TIMEOUT_MS = 180000
const MAX_RANGE_DAYS = 31

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

  const start = new Date(`${fechaInicio}T00:00:00`)
  const end = new Date(`${fechaFin}T00:00:00`)
  const days = Math.floor(Math.abs(end.getTime() - start.getTime()) / 86400000) + 1
  if (days > MAX_RANGE_DAYS) {
    throw new Error(`El rango de fechas no debe exceder ${MAX_RANGE_DAYS} dias.`)
  }

  return days
}

function sanitizeFileNamePart(value) {
  return String(value ?? '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-zA-Z0-9._-]+/g, '_')
    .replace(/^_+|_+$/g, '')
    .slice(0, 120)
}

function buildExportFileName({ employeeName, fechaInicio, fechaFin, extension }) {
  const doctor = sanitizeFileNamePart(employeeName) || 'produccion-medicos'
  const range = fechaInicio === fechaFin ? fechaInicio : `${fechaInicio}_a_${fechaFin}`
  return `${doctor}_${range}.${extension}`
}

async function getProduccionMedicoEmpleado(empleadoId) {
  const rows = await executeQuery(
    `SELECT TOP 1
       IDEMPLEADO AS idEmpleado,
       DNI AS dni,
       UPPER(ApellidoPaterno + ' ' + ApellidoMaterno + ' ' + Nombres) AS empleado,
       UPPER(TE.Descripcion) AS tipoEmpleado
     FROM SIGH..Empleados E
     INNER JOIN SIGH..TiposEmpleado TE ON TE.IdTipoEmpleado = E.IdTipoEmpleado
     WHERE E.IDEMPLEADO = @empleadoId`,
    [{ name: 'empleadoId', type: sql.Int, value: Number(empleadoId ?? 0) }],
    { timeoutMs: REPORT_TIMEOUT_MS },
  )

  const row = rows[0] ?? {}
  return {
    idEmpleado: Number(row.idEmpleado ?? empleadoId ?? 0),
    dni: String(row.dni ?? '').trim(),
    empleado: String(row.empleado ?? '').trim(),
    especialidad: String(row.tipoEmpleado ?? '').trim(),
  }
}

export async function searchProduccionMedicos(term) {
  const queryTerm = String(term ?? '').trim()
  if (queryTerm.length < 3) {
    return []
  }

  const rows = await executeQuery(
    `SELECT D1.*
     FROM (
       SELECT
         IDEMPLEADO AS idEmpleado,
         DNI AS dni,
         UPPER(ApellidoPaterno + ' ' + ApellidoMaterno + ' ' + Nombres) AS empleado,
         UPPER(TE.Descripcion) AS tipoEmpleado
       FROM SIGH..Empleados E
       INNER JOIN SIGH..TiposEmpleado TE ON TE.IdTipoEmpleado = E.IdTipoEmpleado
       WHERE (TE.Abreviatura = 'M. C.' OR E.IdTipoEmpleado IN (247,55,234,239))
     ) D1
     WHERE D1.empleado LIKE @term + '%'`,
    [{ name: 'term', type: sql.NVarChar, value: queryTerm }],
    { timeoutMs: REPORT_TIMEOUT_MS },
  )

  return rows.map((row) => ({
    idEmpleado: Number(row.idEmpleado ?? 0),
    dni: String(row.dni ?? '').trim(),
    empleado: String(row.empleado ?? '').trim(),
    especialidad: String(row.tipoEmpleado ?? '').trim(),
  }))
}

export async function getProduccionMedicosResumen(filters) {
  const fechaInicio = toDateOnly(filters.fechaInicio)
  const fechaFin = toDateOnly(filters.fechaFin)
  const empleadoId = Number(filters.empleadoId ?? 0)

  if (!empleadoId) {
    throw new Error('Debe seleccionar un profesional valido.')
  }

  validateDateRange(fechaInicio, fechaFin)

  const [daysRows, summaryRows] = await Promise.all([
    executeProcedure(
      'SP_REPORTE_PROD_MED_FECHA',
      [
        { name: 'fecini', type: sql.NVarChar, value: fechaInicio },
        { name: 'fecfin', type: sql.NVarChar, value: fechaFin },
      ],
      { timeoutMs: REPORT_TIMEOUT_MS },
    ),
    executeProcedure(
      'SP_REPORTE_PRODUCCION_P1',
      [
        { name: 'feci', type: sql.NVarChar, value: fechaInicio },
        { name: 'fecf', type: sql.NVarChar, value: fechaFin },
        { name: 'dni', type: sql.Int, value: empleadoId },
      ],
      { timeoutMs: REPORT_TIMEOUT_MS },
    ),
  ])

  const dayRange = daysRows[0]
    ? {
        diaInicio: Number(daysRows[0].DIA_INI ?? 1),
        diaFin: Number(daysRows[0].DIA_FIN ?? 1),
        numeroDias: Number(daysRows[0].NRO_DIA ?? 1),
      }
    : null

  return {
    filters: { fechaInicio, fechaFin, empleadoId },
    dayRange,
    rows: summaryRows,
  }
}

export async function getProduccionMedicosDetalle(filters) {
  const fechaInicio = toDateOnly(filters.fechaInicio)
  const fechaFin = toDateOnly(filters.fechaFin)
  const empleadoId = Number(filters.empleadoId ?? 0)
  const orden = Number(filters.orden ?? 0)

  if (!empleadoId || !orden) {
    throw new Error('Faltan parametros para consultar el detalle.')
  }

  validateDateRange(fechaInicio, fechaFin)

  const rows = await executeProcedure(
    'SP_REPORTE_PRODUCCION_P2',
    [
      { name: 'feci', type: sql.NVarChar, value: fechaInicio },
      { name: 'fecf', type: sql.NVarChar, value: fechaFin },
      { name: 'idemp', type: sql.Int, value: empleadoId },
    ],
    { timeoutMs: REPORT_TIMEOUT_MS },
  )

  const filtered = rows.filter((row) => Number(row.COD_ACT ?? row.cod_act ?? 0) === orden)

  return {
    filters: { fechaInicio, fechaFin, empleadoId, orden },
    rows: filtered,
  }
}

export async function exportProduccionMedicosExcel(filters) {
  const fechaInicio = toDateOnly(filters.fechaInicio)
  const fechaFin = toDateOnly(filters.fechaFin)
  const empleadoId = Number(filters.empleadoId ?? 0)

  if (!empleadoId) {
    throw new Error('Debe seleccionar un profesional valido.')
  }

  validateDateRange(fechaInicio, fechaFin)

  const [rows, employee] = await Promise.all([
    executeProcedure(
      'SP_REPORTE_PRODUCCION_P2',
      [
        { name: 'feci', type: sql.NVarChar, value: fechaInicio },
        { name: 'fecf', type: sql.NVarChar, value: fechaFin },
        { name: 'idemp', type: sql.Int, value: empleadoId },
      ],
      { timeoutMs: REPORT_TIMEOUT_MS },
    ),
    getProduccionMedicoEmpleado(empleadoId),
  ])

  const content = await buildProduccionMedicosWorkbook({
    rows,
    startDate: fechaInicio,
    endDate: fechaFin,
    title: buildExportFileName({
      employeeName: employee.empleado,
      fechaInicio,
      fechaFin,
      extension: 'xlsx',
    }),
  })

  return {
    fileName: buildExportFileName({
      employeeName: employee.empleado,
      fechaInicio,
      fechaFin,
      extension: 'xlsx',
    }),
    mimeType: MIME_XLSX,
    content,
  }
}

export async function exportProduccionMedicosPdf(filters) {
  const [report, employee] = await Promise.all([
    getProduccionMedicosResumen(filters),
    getProduccionMedicoEmpleado(filters.empleadoId),
  ])

  const content = buildProduccionMedicosPdf({
    employee,
    rows: report.rows,
    dayRange: report.dayRange,
    startDate: report.filters.fechaInicio,
    endDate: report.filters.fechaFin,
  })

  return {
    fileName: buildExportFileName({
      employeeName: employee.empleado,
      fechaInicio: report.filters.fechaInicio,
      fechaFin: report.filters.fechaFin,
      extension: 'pdf',
    }),
    mimeType: MIME_PDF,
    content,
  }
}
