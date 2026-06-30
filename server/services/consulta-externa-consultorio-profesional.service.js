import ExcelJS from 'exceljs'
import { executeProcedure, sql } from './legacy-sql.service.js'
import { MIME_XLSX, getSheetNameFromFileName } from './excel-export.service.js'

const REPORT_TIMEOUT_MS = 180000
const PROCEDURE_NAME = 'dbo.usp_Reporteador_ConsultaExternaConsultorioProfesionalExcel'
const MIN_REPORT_DATE = '2020-01-01'
const DATA_SOURCE = 'SisGalenPlus'

const HEADER_FILL = 'D7EDF7'
const META_FILL = 'E7F5FE'
const BORDER = {
  top: { style: 'thin' },
  left: { style: 'thin' },
  bottom: { style: 'thin' },
  right: { style: 'thin' },
}

const RAW_COLUMNS = [
  { key: 'UPSS', label: 'UPSS', width: 36 },
  { key: 'FECHA', label: 'FECHA', width: 12, format: 'date' },
  { key: 'ANIO', label: 'ANIO', width: 10, numeric: true },
  { key: 'MES', label: 'MES', width: 8, numeric: true },
  { key: 'NMES', label: 'NMES', width: 10 },
  { key: 'COD_DEPARTAMENTO', label: 'COD_DEPARTAMENTO', width: 18, numeric: true },
  { key: 'DES_DEPARTAMENTO', label: 'DES_DEPARTAMENTO', width: 32 },
  { key: 'Departamento', label: 'Departamento', width: 32 },
  { key: 'COD_SERVICIO', label: 'COD_SERVICIO', width: 14, numeric: true },
  { key: 'DES_SERVICIO', label: 'DES_SERVICIO', width: 32 },
  { key: 'COD_ESPECIALIDAD', label: 'COD_ESPECIALIDAD', width: 18, numeric: true },
  { key: 'DES_ESPECIALIDAD', label: 'DES_ESPECIALIDAD', width: 32 },
  { key: 'COD_CONSULTORIO', label: 'COD_CONSULTORIO', width: 18, numeric: true },
  { key: 'DES_CONSULTORIO', label: 'DES_CONSULTORIO', width: 34 },
  { key: 'TOTATENCIONES', label: 'TOTATENCIONES', width: 16, numeric: true },
  { key: 'ATENCIONES', label: 'ATENCIONES', width: 14, numeric: true },
  { key: 'TIPO', label: 'TIPO', width: 8, numeric: true },
  { key: 'TURNO', label: 'TURNO', width: 12 },
  { key: 'MEDICO', label: 'MEDICO', width: 36 },
  { key: 'TipoEmpleado', label: 'TipoEmpleado', width: 20 },
  { key: 'TOTCUPOS', label: 'TOTCUPOS', width: 14, numeric: true },
  { key: 'ADICIONAL', label: 'ADICIONAL', width: 14, numeric: true },
  { key: 'AUSENCIA', label: 'AUSENCIA', width: 14, numeric: true },
  { key: 'CUPOVACIO', label: 'CUPOVACIO', width: 14, numeric: true },
  { key: 'ATC', label: 'ATC', width: 10, numeric: true },
  { key: 'EST', label: 'EST', width: 10, numeric: true },
  { key: 'AUSENTE', label: 'AUSENTE', width: 12, numeric: true },
  { key: 'HorasPrg', label: 'HorasPrg', width: 12, numeric: true },
  { key: 'HorasEfectiva', label: 'HorasEfectiva', width: 15, numeric: true },
]

const ATTENTION_COLUMNS = [
  { key: 'ANIO', label: 'ANIO', width: 10, numeric: true },
  { key: 'MES', label: 'MES', width: 8, numeric: true },
  { key: 'NMES', label: 'NMES', width: 10 },
  { key: 'COD_ESPECIALIDAD', label: 'COD_ESPECIALIDAD', width: 18, numeric: true },
  { key: 'DES_ESPECIALIDAD', label: 'DES_ESPECIALIDAD', width: 32 },
  { key: 'COD_CONSULTORIO', label: 'COD_CONSULTORIO', width: 18, numeric: true },
  { key: 'DES_CONSULTORIO', label: 'DES_CONSULTORIO', width: 34 },
  { key: 'TOTATENCIONES', label: 'TOTATENCIONES', width: 16, numeric: true },
]

const PROFESSIONAL_COLUMNS = [
  { key: 'ANIO', label: 'ANIO', width: 10, numeric: true },
  { key: 'MES', label: 'MES', width: 8, numeric: true },
  { key: 'NMES', label: 'NMES', width: 10 },
  { key: 'COD_ESPECIALIDAD', label: 'COD_ESPECIALIDAD', width: 18, numeric: true },
  { key: 'DES_ESPECIALIDAD', label: 'DES_ESPECIALIDAD', width: 32 },
  { key: 'COD_CONSULTORIO', label: 'COD_CONSULTORIO', width: 18, numeric: true },
  { key: 'DES_CONSULTORIO', label: 'DES_CONSULTORIO', width: 34 },
  { key: 'MEDICO', label: 'MEDICO', width: 38 },
  { key: 'TipoEmpleado', label: 'TipoEmpleado', width: 20 },
  { key: 'TOTATENCIONES', label: 'TOTATENCIONES', width: 16, numeric: true },
]

const PROGRAMMED_COLUMNS = [
  { key: 'ANIO', label: 'ANIO', width: 10, numeric: true },
  { key: 'MES', label: 'MES', width: 8, numeric: true },
  { key: 'NMES', label: 'NMES', width: 10 },
  { key: 'COD_ESPECIALIDAD', label: 'COD_ESPECIALIDAD', width: 18, numeric: true },
  { key: 'DES_ESPECIALIDAD', label: 'DES_ESPECIALIDAD', width: 32 },
  { key: 'COD_CONSULTORIO', label: 'COD_CONSULTORIO', width: 18, numeric: true },
  { key: 'DES_CONSULTORIO', label: 'DES_CONSULTORIO', width: 34 },
  { key: 'MEDICO', label: 'MEDICO', width: 38 },
  { key: 'TipoEmpleado', label: 'TipoEmpleado', width: 20 },
  { key: 'TURNO', label: 'Turno', width: 12 },
  { key: 'CUPOS', label: 'Cupos', width: 12, numeric: true },
  { key: 'TOT_OFERTADO', label: 'Tot_Ofertado', width: 14, numeric: true },
  { key: 'TOTATENCIONES', label: 'TotAtencion', width: 14, numeric: true },
  { key: 'ATENCIONES', label: 'Atenciones', width: 14, numeric: true },
  { key: 'ADICIONAL', label: 'Adicional', width: 12, numeric: true },
  { key: 'AUSENCIA', label: 'Ausencia', width: 12, numeric: true },
  { key: 'CUPOVACIO', label: 'NoOfertado', width: 14, numeric: true },
]

function normalizeDate(value) {
  return typeof value === 'string' ? value.trim().slice(0, 10) : ''
}

function parseDateRange(rawFilters = {}) {
  const currentYear = new Date().getFullYear()
  const fechaInicio = normalizeDate(rawFilters.fechaInicio || `${currentYear}-01-01`)
  const fechaFin = normalizeDate(rawFilters.fechaFin || new Date().toISOString().slice(0, 10))

  if (!/^\d{4}-\d{2}-\d{2}$/.test(fechaInicio) || !/^\d{4}-\d{2}-\d{2}$/.test(fechaFin)) {
    throw new Error('Las fechas deben enviarse en formato YYYY-MM-DD.')
  }

  if (fechaInicio > fechaFin) {
    throw new Error('fechaInicio no puede ser mayor que fechaFin.')
  }

  if (fechaInicio < MIN_REPORT_DATE || fechaFin < MIN_REPORT_DATE) {
    throw new Error('Solo se puede consultar información desde el 2020.')
  }

  return { fechaInicio, fechaFin }
}

function queryParams(filters) {
  return [
    { name: 'FechaInicio', type: sql.Date, value: filters.fechaInicio },
    { name: 'FechaFin', type: sql.Date, value: filters.fechaFin },
  ]
}

async function getAtenProdMedRows(filters) {
  return executeProcedure(PROCEDURE_NAME, queryParams(filters), {
    connection: 'general',
    timeoutMs: REPORT_TIMEOUT_MS,
  })
}

function argbFill(hex) {
  return {
    type: 'pattern',
    pattern: 'solid',
    fgColor: { argb: `FF${String(hex).replace('#', '')}` },
  }
}

function applyHeaderStyle(cell) {
  cell.fill = argbFill(HEADER_FILL)
  cell.font = { bold: true, size: 10, color: { argb: 'FF123B63' } }
  cell.border = BORDER
  cell.alignment = { horizontal: 'center', vertical: 'middle', wrapText: true }
}

function applyDataStyle(cell, column) {
  cell.font = { size: 10 }
  cell.border = BORDER
  cell.alignment = { horizontal: column.numeric ? 'center' : 'left', vertical: 'middle', wrapText: true }

  if (column.numeric) {
    cell.numFmt = '#,##0'
  }

  if (column.format === 'date') {
    cell.numFmt = 'dd/mm/yyyy'
    cell.alignment = { horizontal: 'center', vertical: 'middle' }
  }
}

function writeMetadata(ws, title, filters, totalCols) {
  const metaRows = [
    ['Reporte', title],
    ['Desde', filters.fechaInicio],
    ['Hasta', filters.fechaFin],
    ['Fuente', DATA_SOURCE],
  ]

  metaRows.forEach(([label, value], index) => {
    const rowNumber = index + 1
    ws.mergeCells(rowNumber, 1, rowNumber, 2)
    const labelCell = ws.getCell(rowNumber, 1)
    labelCell.value = label
    labelCell.fill = argbFill(META_FILL)
    labelCell.font = { bold: true, size: 10, color: { argb: 'FF123B63' } }
    labelCell.border = BORDER
    labelCell.alignment = { vertical: 'middle', horizontal: 'left' }

    ws.mergeCells(rowNumber, 3, rowNumber, totalCols)
    const valueCell = ws.getCell(rowNumber, 3)
    valueCell.value = value
    valueCell.font = { size: 10 }
    valueCell.border = BORDER
    valueCell.alignment = { vertical: 'middle', horizontal: 'left' }
  })
}

function parseDateValue(value) {
  if (!value) return ''
  const date = value instanceof Date ? value : new Date(value)
  return Number.isNaN(date.getTime()) ? value : date
}

function normalizeCellValue(value, column) {
  if (column.format === 'date') {
    return parseDateValue(value)
  }

  if (value === null || value === undefined) {
    return ''
  }

  return value
}

function writeTableSheet(wb, { name, title, rows, columns, filters }) {
  const ws = wb.addWorksheet(getSheetNameFromFileName(name))
  const totalCols = Math.max(columns.length, 3)
  ws.columns = columns.map((column) => ({ width: column.width ?? 14 }))
  writeMetadata(ws, title, filters, totalCols)

  const headerRowNumber = 6
  columns.forEach((column, index) => {
    const cell = ws.getCell(headerRowNumber, index + 1)
    cell.value = column.label
    applyHeaderStyle(cell)
  })
  ws.getRow(headerRowNumber).height = 22

  const safeRows = rows.length > 0 ? rows : [{ MENSAJE: 'No se encontraron registros para el rango seleccionado.' }]

  if (rows.length === 0) {
    ws.mergeCells(headerRowNumber + 1, 1, headerRowNumber + 1, columns.length)
    const cell = ws.getCell(headerRowNumber + 1, 1)
    cell.value = safeRows[0].MENSAJE
    cell.font = { size: 10 }
    cell.border = BORDER
    cell.alignment = { horizontal: 'center', vertical: 'middle', wrapText: true }
  } else {
    rows.forEach((row, rowIndex) => {
      const excelRow = ws.getRow(headerRowNumber + rowIndex + 1)
      excelRow.height = 18
      columns.forEach((column, columnIndex) => {
        const cell = excelRow.getCell(columnIndex + 1)
        cell.value = normalizeCellValue(row[column.key], column)
        applyDataStyle(cell, column)
      })
    })
  }

  ws.views = [{ state: 'frozen', ySplit: headerRowNumber }]
  ws.autoFilter = {
    from: { row: headerRowNumber, column: 1 },
    to: { row: headerRowNumber, column: columns.length },
  }
}

function toNumber(value) {
  const number = Number(value)
  return Number.isFinite(number) ? number : 0
}

function minText(left, right) {
  const leftText = String(left ?? '').trim()
  const rightText = String(right ?? '').trim()
  if (!leftText) return rightText
  if (!rightText) return leftText
  return leftText.localeCompare(rightText, 'es') <= 0 ? leftText : rightText
}

function normalizeGroupKeyValue(value) {
  return value === null || value === undefined ? '' : value
}

function aggregateRows(rows, keys, numericKeys, extraAggregates = {}) {
  const grouped = new Map()

  rows.forEach((row) => {
    const key = JSON.stringify(keys.map((field) => normalizeGroupKeyValue(row[field])))
    const current = grouped.get(key)

    if (!current) {
      const base = Object.fromEntries(keys.map((field) => [field, normalizeGroupKeyValue(row[field])]))
      numericKeys.forEach((field) => {
        base[field] = toNumber(row[field])
      })
      Object.entries(extraAggregates).forEach(([targetKey, config]) => {
        base[targetKey] = config.type === 'minText' ? String(row[config.sourceKey] ?? '').trim() : toNumber(row[config.sourceKey])
      })
      grouped.set(key, base)
      return
    }

    numericKeys.forEach((field) => {
      current[field] += toNumber(row[field])
    })
    Object.entries(extraAggregates).forEach(([targetKey, config]) => {
      if (config.type === 'sum') {
        current[targetKey] += toNumber(row[config.sourceKey])
      } else if (config.type === 'minText') {
        current[targetKey] = minText(current[targetKey], row[config.sourceKey])
      }
    })
  })

  return [...grouped.values()].sort((left, right) => {
    const yearDiff = toNumber(right.ANIO) - toNumber(left.ANIO)
    if (yearDiff) return yearDiff
    const monthDiff = toNumber(right.MES) - toNumber(left.MES)
    if (monthDiff) return monthDiff
    const consultorioDiff = String(left.DES_CONSULTORIO ?? '').localeCompare(String(right.DES_CONSULTORIO ?? ''), 'es')
    if (consultorioDiff) return consultorioDiff
    return String(left.MEDICO ?? '').localeCompare(String(right.MEDICO ?? ''), 'es')
  })
}

function filterByTipos(rows, tipos) {
  const allowed = new Set(tipos.map((tipo) => Number(tipo)))
  return rows.filter((row) => allowed.has(Number(row.TIPO)))
}

function buildWorkbook({ rows, filters }) {
  const wb = new ExcelJS.Workbook()
  wb.creator = 'Reporteador-2.0'
  wb.created = new Date()

  const attentionKeys = [
    'ANIO',
    'MES',
    'NMES',
    'COD_ESPECIALIDAD',
    'DES_ESPECIALIDAD',
    'COD_CONSULTORIO',
    'DES_CONSULTORIO',
  ]
  const professionalKeys = [...attentionKeys, 'MEDICO', 'TipoEmpleado']

  writeTableSheet(wb, {
    name: 'Base general',
    title: 'Base general - Consulta externa por consultorio y profesional',
    rows,
    columns: RAW_COLUMNS,
    filters,
  })

  writeTableSheet(wb, {
    name: 'Consultorio ambulatorio',
    title: 'Nro de atenciones, segun consultorio ambulatorio - HEVES',
    rows: aggregateRows(filterByTipos(rows, [0, 1]), attentionKeys, ['TOTATENCIONES']),
    columns: ATTENTION_COLUMNS,
    filters,
  })

  writeTableSheet(wb, {
    name: 'Consultorio procedimiento',
    title: 'Nro de atenciones, segun consultorio de procedimiento - HEVES',
    rows: aggregateRows(filterByTipos(rows, [2, 3]), attentionKeys, ['TOTATENCIONES']),
    columns: ATTENTION_COLUMNS,
    filters,
  })

  writeTableSheet(wb, {
    name: 'Profesional consultorio',
    title: 'Nro de atenciones, segun profesional y consultorio - HEVES',
    rows: aggregateRows(rows, professionalKeys, ['TOTATENCIONES']),
    columns: PROFESSIONAL_COLUMNS,
    filters,
  })

  writeTableSheet(wb, {
    name: 'Programadas vs produccion',
    title: 'Atenciones programadas Vs Produccion segun consultorio y profesional',
    rows: aggregateRows(rows, professionalKeys, ['TOTATENCIONES', 'ATENCIONES', 'ADICIONAL', 'AUSENCIA', 'CUPOVACIO'], {
      TURNO: { type: 'minText', sourceKey: 'TURNO' },
      CUPOS: { type: 'sum', sourceKey: 'TOTCUPOS' },
      TOT_OFERTADO: { type: 'sum', sourceKey: 'TOTCUPOS' },
    }),
    columns: PROGRAMMED_COLUMNS,
    filters,
  })

  return wb.xlsx.writeBuffer()
}

export async function exportConsultaExternaConsultorioProfesionalExcel(rawFilters = {}) {
  const filters = parseDateRange(rawFilters)
  const rows = await getAtenProdMedRows(filters)
  const content = await buildWorkbook({ rows, filters })

  return {
    content,
    fileName: `consulta-externa-consultorio-profesional_${filters.fechaInicio}_${filters.fechaFin}.xlsx`,
    mimeType: MIME_XLSX,
  }
}
