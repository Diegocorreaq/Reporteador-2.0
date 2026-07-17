import {
  executeProcedure_Cnv,
  executeProcedure_Sigh1 as executeProcedure,
  sql,
} from './sigh-sql-helpers.js'
import { buildProduccionObstetrasWorkbook, MIME_XLSX } from './excel-export.service.js'
import { buildProduccionObstetrasPdf, MIME_PDF } from './pdf-export.service.js'
import { logger } from '../utils/logger.js'

const REPORT_TIMEOUT_MS = 180000
const MAX_RANGE_DAYS = 31
const CNV_ACTIVITY = 'REGISTRO_CNV'
const CNV_WARNING = {
  code: 'CNV_SOURCE_UNAVAILABLE',
  message: 'La produccion CNV no pudo cargarse.',
}
const ACTIVITIES = [
  'ATENCION_CE',
  'TRIAJE_CE',
  'TRIAJE_EMERGENCIA',
  'ATENCIONES_SERVICIOS_GO',
  'FICHAS_EVOLUCION',
  'MONITOREO_FETAL',
  'ATENCION_PARTO',
  CNV_ACTIVITY,
  'PLANIFICACION_FAMILIAR_HOSP',
]

export const OBSTETRA_DETAIL_COLUMNS = [
  'COD_ACT', 'TIPO_ACTIVIDAD', 'CANTIDAD', 'NOMBRE_PROFESIONAL', 'DNI', 'TIPO_EMPLEADO',
  'SERVICIO_ACTIVIDAD', 'CUENTA', 'FECHA', 'HORA', 'NOMBRE_PACIENTE', 'NRO_DOCUMENTO',
  'NRO_HISTORIA', 'PRIORIDAD', 'TIPO_ATENCION_CE', 'COD_DX1', 'DESCRIPCION_DX1',
  'CODIGO_CPT', 'DESCRIPCION_CPT', 'IDRECETA', 'PUNTO_CARGA', 'FUNCION', 'COMPLEJIDAD',
  'FECHA_INI_CIRUGIA', 'FECHA_FIN_CIRUGIA', 'CODCPT1', 'DESCPT1', 'CODCPT2', 'DESCPT2',
  'CODCPT3', 'DESCPT3', 'CODCPT4', 'DESCPT4', 'FUENTE_FINANCIAMIENTO',
]

function toDateOnly(value) {
  return String(value ?? '').trim().slice(0, 10)
}

function validateDateRange(fechaInicio, fechaFin) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(fechaInicio) || !/^\d{4}-\d{2}-\d{2}$/.test(fechaFin)) {
    throw new Error('Ingrese un rango de fechas valido.')
  }
  if (fechaInicio > fechaFin) throw new Error('La fecha inicial no puede ser mayor que la fecha final.')
  const days = Math.floor((new Date(`${fechaFin}T00:00:00`) - new Date(`${fechaInicio}T00:00:00`)) / 86400000) + 1
  if (days > MAX_RANGE_DAYS) throw new Error(`La diferencia de fechas no debe exceder ${MAX_RANGE_DAYS} dias.`)
}

function readValue(row, names) {
  const entries = Object.entries(row ?? {})
  for (const name of names) {
    const match = entries.find(([key]) => key.toLowerCase() === name.toLowerCase())
    if (match) return match[1]
  }
  return undefined
}

function activityOf(row) {
  return String(readValue(row, ['TIPOACTIVIDAD', 'TIPO_ACTIVIDAD', 'ACTIVIDAD']) ?? '').trim().toUpperCase()
}

function normalizeDetailRow(row) {
  return Object.fromEntries(
    OBSTETRA_DETAIL_COLUMNS.map((column) => [column, readValue(row, [column]) ?? '']),
  )
}

function compareDetailRows(left, right) {
  const fields = ['COD_ACT', 'FECHA', 'HORA', 'CUENTA']
  for (const field of fields) {
    const leftValue = String(left[field] ?? '')
    const rightValue = String(right[field] ?? '')
    const comparison = leftValue.localeCompare(rightValue, 'es', { numeric: true })
    if (comparison !== 0) return comparison
  }
  return 0
}

function normalizeSummaryRows(rows, dayRange) {
  const sourceRows = Array.isArray(rows) ? rows : []
  const normalized = sourceRows.map((source, index) => ({
    ...source,
    ORD: Number(readValue(source, ['ORD', 'COD_ACT']) ?? index + 1),
    TIPOACTIVIDAD: activityOf(source),
  }))
  const present = new Set(normalized.map(activityOf))

  ACTIVITIES.forEach((activity, index) => {
    if (!present.has(activity)) {
      normalized.push({ ORD: index + 1, TIPOACTIVIDAD: activity })
    }
  })

  if (dayRange) {
    normalized.forEach((row) => {
      for (let day = dayRange.diaInicio; day <= dayRange.diaFin; day += 1) {
        if (row[String(day)] == null) row[String(day)] = 0
      }
    })
  }
  return normalized
}

export function mergeCnvIntoDetail(detailRows, cnvRows) {
  const mainWithoutCnv = (Array.isArray(detailRows) ? detailRows : []).filter(
    (row) => activityOf(row) !== CNV_ACTIVITY,
  )
  return [...mainWithoutCnv, ...(Array.isArray(cnvRows) ? cnvRows : [])]
    .map(normalizeDetailRow)
    .sort(compareDetailRows)
}

export function mergeCnvIntoSummary(summaryRows, cnvRows, dayRange) {
  const rows = normalizeSummaryRows(summaryRows, dayRange)
  const totalsByDay = new Map()

  for (const row of Array.isArray(cnvRows) ? cnvRows : []) {
    const date = toDateOnly(readValue(row, ['FECHA']))
    const day = Number(date.slice(8, 10))
    if (!day) continue
    const quantity = Number(readValue(row, ['CANTIDAD']) ?? 0)
    totalsByDay.set(day, (totalsByDay.get(day) ?? 0) + (Number.isFinite(quantity) ? quantity : 0))
  }

  let cnvRow = rows.find((row) => activityOf(row) === CNV_ACTIVITY)
  if (!cnvRow) {
    cnvRow = { ORD: 8, TIPOACTIVIDAD: CNV_ACTIVITY }
    rows.push(cnvRow)
  }
  if (dayRange) {
    for (let day = dayRange.diaInicio; day <= dayRange.diaFin; day += 1) {
      cnvRow[String(day)] = totalsByDay.get(day) ?? 0
    }
  }
  return rows
}

function sanitizeFileNamePart(value) {
  return String(value ?? '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-zA-Z0-9._-]+/g, '_')
    .replace(/^_+|_+$/g, '')
    .slice(0, 80)
}

function normalizeFilters(filters) {
  const fechaInicio = toDateOnly(filters.fechaInicio)
  const fechaFin = toDateOnly(filters.fechaFin)
  const empleadoId = Number(filters.empleadoId ?? 0)
  if (!empleadoId) throw new Error('Seleccione un profesional de la lista de resultados.')
  validateDateRange(fechaInicio, fechaFin)
  return { fechaInicio, fechaFin, empleadoId }
}

export function createObstetricProductionService(dependencies = {}) {
  const deps = {
    executeMainProcedure: executeProcedure,
    executeMainQuery: executeProcedure,
    executeCnvProcedure: executeProcedure_Cnv,
    buildWorkbook: buildProduccionObstetrasWorkbook,
    buildPdf: buildProduccionObstetrasPdf,
    log: logger,
    ...dependencies,
  }

  async function getObstetra(empleadoId) {
    const rows = await deps.executeMainQuery(
      'SP_APP_PROD_OBSTETRAS_EMPLEADO',
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

  async function getExternalCnv(filters) {
    try {
      const rows = await deps.executeCnvProcedure(
        'dbo.SP_REPORTE_PRODUCCION_OBST_CNV',
        [
          { name: 'FECHAINICIO', type: sql.Date, value: filters.fechaInicio },
          { name: 'FECHAFIN', type: sql.Date, value: filters.fechaFin },
          { name: 'DNI', type: sql.Int, value: filters.empleadoId },
        ],
        { timeoutMs: REPORT_TIMEOUT_MS },
      )
      return { available: true, rows: Array.isArray(rows) ? rows : [], warnings: [] }
    } catch (error) {
      deps.log.error({
        event: 'sigh:prod-obstetras:cnv-unavailable',
        empleadoId: filters.empleadoId,
        fechaInicio: filters.fechaInicio,
        fechaFin: filters.fechaFin,
        errorName: error instanceof Error ? error.name : 'UnknownError',
        errorCode: typeof error === 'object' && error !== null && 'code' in error ? String(error.code) : undefined,
      })
      return { available: false, rows: [], warnings: [CNV_WARNING] }
    }
  }

  async function getDailySummary(rawFilters) {
    const filters = normalizeFilters(rawFilters)
    await getObstetra(filters.empleadoId)
    const [daysRows, summaryRows, cnvResult] = await Promise.all([
      deps.executeMainProcedure(
        'SP_REPORTE_PROD_MED_FECHA',
        [
          { name: 'fechaInicio', type: sql.NVarChar, value: filters.fechaInicio },
          { name: 'fechaFin', type: sql.NVarChar, value: filters.fechaFin },
        ],
        { timeoutMs: REPORT_TIMEOUT_MS },
      ),
      deps.executeMainProcedure(
        'SP_REPORTE_PRODUCCION_OBST_P1',
        [
          { name: 'FECHAINICIO', type: sql.NVarChar, value: filters.fechaInicio },
          { name: 'FECHAFIN', type: sql.NVarChar, value: filters.fechaFin },
          { name: 'DNI', type: sql.Int, value: filters.empleadoId },
        ],
        { timeoutMs: REPORT_TIMEOUT_MS },
      ),
      getExternalCnv(filters),
    ])
    const dayRange = daysRows[0]
      ? {
          diaInicio: Number(daysRows[0].DIA_INI ?? 1),
          diaFin: Number(daysRows[0].DIA_FIN ?? 1),
          numeroDias: Number(daysRows[0].NRO_DIA ?? 1),
        }
      : null
    return {
      filters,
      dayRange,
      rows: cnvResult.available
        ? mergeCnvIntoSummary(summaryRows, cnvResult.rows, dayRange)
        : normalizeSummaryRows(summaryRows, dayRange),
      warnings: cnvResult.warnings,
    }
  }

  async function getDetailedProduction(rawFilters) {
    const filters = normalizeFilters(rawFilters)
    await getObstetra(filters.empleadoId)
    const [detailRows, cnvResult] = await Promise.all([
      deps.executeMainProcedure(
        'SP_REPORTE_PRODUCCION_OBST_P2',
        [
          { name: 'FECHAINICIO', type: sql.NVarChar, value: filters.fechaInicio },
          { name: 'FECHAFIN', type: sql.NVarChar, value: filters.fechaFin },
          { name: 'DNI', type: sql.Int, value: filters.empleadoId },
        ],
        { timeoutMs: REPORT_TIMEOUT_MS },
      ),
      getExternalCnv(filters),
    ])
    return {
      filters,
      rows: cnvResult.available
        ? mergeCnvIntoDetail(detailRows, cnvResult.rows)
        : (Array.isArray(detailRows) ? detailRows : []).map(normalizeDetailRow).sort(compareDetailRows),
      warnings: cnvResult.warnings,
    }
  }

  async function exportExcel(filters) {
    const [report, employee] = await Promise.all([
      getDetailedProduction(filters),
      getObstetra(filters.empleadoId),
    ])
    const fileName = `produccion_obstetra_${sanitizeFileNamePart(employee.dni || employee.idEmpleado)}.xlsx`
    return {
      fileName,
      mimeType: MIME_XLSX,
      warnings: report.warnings,
      content: await deps.buildWorkbook({
        rows: report.rows,
        startDate: report.filters.fechaInicio,
        endDate: report.filters.fechaFin,
        title: fileName,
      }),
    }
  }

  async function exportPdf(filters) {
    const [report, employee] = await Promise.all([
      getDailySummary(filters),
      getObstetra(filters.empleadoId),
    ])
    return {
      fileName: `produccion_obstetra_${sanitizeFileNamePart(employee.dni || employee.idEmpleado)}.pdf`,
      mimeType: MIME_PDF,
      warnings: report.warnings,
      content: deps.buildPdf({
        employee,
        rows: report.rows,
        dayRange: report.dayRange,
        startDate: report.filters.fechaInicio,
        endDate: report.filters.fechaFin,
      }),
    }
  }

  return { getDailySummary, getDetailedProduction, getExternalCnv, exportExcel, exportPdf }
}

const obstetricProductionService = createObstetricProductionService()

export async function searchProduccionObstetras(term) {
  const queryTerm = String(term ?? '').trim()
  if (queryTerm.length < 3) return []
  const rows = await executeProcedure(
    'SP_APP_PROD_OBSTETRAS_BUSCAR',
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

export const getProduccionObstetrasResumen = obstetricProductionService.getDailySummary
export const getProduccionObstetrasDetalle = obstetricProductionService.getDetailedProduction
export const exportProduccionObstetrasExcel = obstetricProductionService.exportExcel
export const exportProduccionObstetrasPdf = obstetricProductionService.exportPdf
