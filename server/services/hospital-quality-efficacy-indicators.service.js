import ExcelJS from 'exceljs'
import { executeProcedureRecordsets, sql } from './legacy-sql.service.js'
import { MIME_XLSX, getSheetNameFromFileName } from './excel-export.service.js'

const REPORT_TIMEOUT_MS = 180000
const DATA_SOURCE = 'Sisgalen Plus'
const MONTH_LABELS = ['Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun', 'Jul', 'Ago', 'Sep', 'Oct', 'Nov', 'Dic']
const HEADER_FILL = 'D7EDF7'
const TITLE_FILL = 'E7F5FE'
const MIN_REPORT_DATE = '2019-01-01'
const BORDER = {
  top: { style: 'thin' },
  left: { style: 'thin' },
  bottom: { style: 'thin' },
  right: { style: 'thin' },
}

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
    throw new Error('Solo se puede consultar información desde el 2019.')
  }

  return { fechaInicio, fechaFin }
}

function procedureParams(filters) {
  return [
    { name: 'FechaInicio', type: sql.Date, value: filters.fechaInicio },
    { name: 'FechaFin', type: sql.Date, value: filters.fechaFin },
  ]
}

async function runWorkbookProcedure(procedureName, filters) {
  return executeProcedureRecordsets(procedureName, procedureParams(filters), {
    connection: 'general',
    timeoutMs: REPORT_TIMEOUT_MS,
  })
}

async function getEfficacyRows(filters) {
  const [
    presencial = [],
    telemonitoreo = [],
    emergencia = [],
    urgencia = [],
  ] = await runWorkbookProcedure('dbo.usp_Reporteador_IndicadoresEficaciaExcel', filters)

  return {
    presencial,
    telemonitoreo,
    emergencia,
    urgencia,
  }
}

async function getQualityRows(filters) {
  const [
    mortalidadNeta = [],
    perinatal = [],
    precoz = [],
    tardia = [],
    suspendidas = [],
    cesarea = [],
    muerteMaterna = [],
    razon = [],
  ] = await runWorkbookProcedure('dbo.usp_Reporteador_IndicadoresCalidadExcel', filters)

  return {
    mortalidadNeta,
    perinatal,
    precoz,
    tardia,
    suspendidas,
    cesarea,
    muerteMaterna,
    razon,
  }
}

function argbFill(hex) {
  return {
    type: 'pattern',
    pattern: 'solid',
    fgColor: { argb: `FF${String(hex).replace('#', '')}` },
  }
}

function applyHeaderStyle(cell, fill = HEADER_FILL) {
  cell.fill = argbFill(fill)
  cell.font = { bold: true, size: 10, color: { argb: 'FF123B63' } }
  cell.border = BORDER
  cell.alignment = { horizontal: 'center', vertical: 'middle', wrapText: true }
}

function applyDataStyle(cell, { horizontal = 'center', numFmt } = {}) {
  cell.font = { size: 10 }
  cell.border = BORDER
  cell.alignment = { horizontal, vertical: 'middle', wrapText: true }

  if (numFmt) {
    cell.numFmt = numFmt
  }
}

function applyTotalStyle(cell, { horizontal = 'center', numFmt } = {}) {
  cell.fill = argbFill(HEADER_FILL)
  cell.font = { bold: true, size: 10, color: { argb: 'FF123B63' } }
  cell.border = BORDER
  cell.alignment = { horizontal, vertical: 'middle', wrapText: true }

  if (numFmt) {
    cell.numFmt = numFmt
  }
}

function toNumber(value) {
  const number = Number(value)
  return Number.isFinite(number) ? number : 0
}

function nullableNumber(value) {
  if (value === null || value === undefined || value === '') {
    return null
  }

  const number = Number(value)
  return Number.isFinite(number) ? number : null
}

function monthLabel(row) {
  const month = Number(row.MES ?? row.Mes ?? row.mes)

  if (Number.isInteger(month) && month >= 1 && month <= 12) {
    return MONTH_LABELS[month - 1]
  }

  const raw = String(row.NMES ?? row.NMes ?? row.nmes ?? '').trim()
  return raw ? raw.slice(0, 3) : ''
}

function readRowValue(row, key) {
  return row[key] ?? row[key?.toLowerCase?.()] ?? row[key?.toUpperCase?.()]
}

function normalizeMonthlyRows(rows, mapper) {
  return [...rows]
    .sort((left, right) => {
      const leftYear = Number(left.ANIO ?? left.Anio ?? left.anio ?? 0)
      const rightYear = Number(right.ANIO ?? right.Anio ?? right.anio ?? 0)
      const leftMonth = Number(left.MES ?? left.Mes ?? left.mes ?? 0)
      const rightMonth = Number(right.MES ?? right.Mes ?? right.mes ?? 0)

      return rightYear - leftYear || leftMonth - rightMonth
    })
    .map((row) => ({
      anio: Number(row.ANIO ?? row.Anio ?? row.anio ?? 0),
      mes: Number(row.MES ?? row.Mes ?? row.mes ?? 0),
      nmes: monthLabel(row),
      ...mapper(row),
    }))
}

function ratioTotal(rows, numeratorKey, denominatorKey, multiplier = 1) {
  const numerator = rows.reduce((sum, row) => sum + toNumber(row[numeratorKey]), 0)
  const denominator = rows.reduce((sum, row) => sum + toNumber(row[denominatorKey]), 0)

  return denominator ? (numerator / denominator) * multiplier : null
}

function rowRatio(row, numeratorKey, denominatorKey, multiplier) {
  const numerator = toNumber(row[numeratorKey])
  const denominator = toNumber(row[denominatorKey])
  return denominator ? (numerator / denominator) * multiplier : null
}

function buildRatioSection({ title, headers, rows, numeratorKey, denominatorKey, numeratorLabel, denominatorLabel, multiplier = 1 }) {
  return {
    title,
    columns: [
      { key: 'anio', label: 'Año/Mes', width: 11, align: 'center', totalLabel: 'TOTAL' },
      { key: 'nmes', label: 'NMES', width: 10, align: 'left' },
      { key: 'numerator', label: numeratorLabel ?? headers[0], width: 46, numeric: true, total: 'sum' },
      { key: 'denominator', label: denominatorLabel ?? headers[1], width: 46, numeric: true, total: 'sum' },
      {
        key: 'indicador',
        label: headers[2] ?? 'Indicador',
        width: 13,
        numeric: true,
        numFmt: '0.00',
        total: 'ratio',
        numeratorKey: 'numerator',
        denominatorKey: 'denominator',
        multiplier,
      },
    ],
    rows: normalizeMonthlyRows(rows, (row) => {
      const numerator = toNumber(readRowValue(row, numeratorKey))
      const denominator = toNumber(readRowValue(row, denominatorKey))

      return {
        numerator,
        denominator,
        indicador: nullableNumber(row.INDICADOR ?? row.Indicador ?? row.indicador)
          ?? rowRatio({ numerator, denominator }, 'numerator', 'denominator', multiplier),
      }
    }),
  }
}

function buildMultiColumnSection({ title, columns, rows }) {
  return {
    title,
    columns: [
      { key: 'anio', label: 'Año/Mes', width: 11, align: 'center', totalLabel: 'TOTAL' },
      { key: 'nmes', label: 'NMES', width: 10, align: 'left' },
      ...columns,
    ],
    rows: normalizeMonthlyRows(rows, (row) =>
      Object.fromEntries(columns.map((column) => [column.key, toNumber(readRowValue(row, column.sourceKey ?? column.key))])),
    ),
  }
}

function resolveTotalValue(section, column) {
  if (column.total === 'sum') {
    return section.rows.reduce((sum, row) => sum + toNumber(row[column.key]), 0)
  }

  if (column.total === 'ratio') {
    return ratioTotal(section.rows, column.numeratorKey, column.denominatorKey, column.multiplier ?? 1)
  }

  return ''
}

function writeSourceNote(ws, rowNumber, totalCols) {
  ws.mergeCells(rowNumber, 1, rowNumber, totalCols)
  const cell = ws.getCell(rowNumber, 1)
  cell.value = `Fuente: ${DATA_SOURCE}`
  cell.font = { italic: true, size: 9, color: { argb: 'FF425466' } }
  cell.alignment = { horizontal: 'left', vertical: 'middle', wrapText: true }
  ws.getRow(rowNumber).height = 16
}

function writeSection(ws, section, startRow) {
  const totalCols = section.columns.length
  ws.mergeCells(startRow, 1, startRow, totalCols)

  const titleCell = ws.getCell(startRow, 1)
  titleCell.value = section.title
  titleCell.fill = argbFill(TITLE_FILL)
  titleCell.font = { bold: true, size: 11, color: { argb: 'FF123B63' } }
  titleCell.border = BORDER
  titleCell.alignment = { horizontal: 'left', vertical: 'middle', wrapText: true }
  ws.getRow(startRow).height = 22

  const headerRow = startRow + 1
  section.columns.forEach((column, index) => {
    const cell = ws.getCell(headerRow, index + 1)
    cell.value = column.label
    applyHeaderStyle(cell)
    ws.getColumn(index + 1).width = Math.max(ws.getColumn(index + 1).width ?? 0, column.width ?? 14)
  })
  ws.getRow(headerRow).height = 34

  if (section.rows.length === 0) {
    ws.mergeCells(headerRow + 1, 1, headerRow + 1, totalCols)
    const emptyCell = ws.getCell(headerRow + 1, 1)
    emptyCell.value = 'No se encontraron registros para el rango seleccionado.'
    applyDataStyle(emptyCell, { horizontal: 'center' })
  } else {
    section.rows.forEach((row, index) => {
      const excelRow = headerRow + index + 1
      section.columns.forEach((column, colIndex) => {
        const cell = ws.getCell(excelRow, colIndex + 1)
        cell.value = row[column.key] ?? ''
        applyDataStyle(cell, {
          horizontal: column.align ?? (column.numeric ? 'center' : 'left'),
          numFmt: column.numeric ? column.numFmt ?? '#,##0' : undefined,
        })
      })
    })
  }

  const totalRow = headerRow + Math.max(section.rows.length, 1) + 1
  section.columns.forEach((column, index) => {
    const cell = ws.getCell(totalRow, index + 1)
    cell.value = column.totalLabel ?? resolveTotalValue(section, column)
    applyTotalStyle(cell, {
      horizontal: column.align ?? 'center',
      numFmt: column.numeric ? column.numFmt ?? '#,##0' : undefined,
    })
  })
  ws.getRow(totalRow).height = 20

  const sourceRow = totalRow + 1
  writeSourceNote(ws, sourceRow, totalCols)
  return sourceRow + 3
}

function buildWorkbook({ fileTitle, sheets }) {
  const wb = new ExcelJS.Workbook()
  wb.creator = 'Reporteador-2.0'
  wb.created = new Date()

  sheets.forEach((sheet) => {
    const ws = wb.addWorksheet(getSheetNameFromFileName(sheet.name || fileTitle))
    let rowCursor = 1
    sheet.sections.forEach((section) => {
      rowCursor = writeSection(ws, section, rowCursor)
    })
  })

  return wb.xlsx.writeBuffer()
}

export async function exportEfficacyIndicatorsExcel(rawFilters = {}) {
  const filters = parseDateRange(rawFilters)
  const rows = await getEfficacyRows(filters)
  const content = await buildWorkbook({
    fileTitle: 'Indicadores Eficacia',
    sheets: [
      {
        name: 'Eficacia',
        sections: [
          buildRatioSection({
            title: '1. Concentracion de atenciones (Presencial)',
            rows: rows.presencial,
            numeratorKey: 'ATENCIONES',
            denominatorKey: 'ATENDIDOS',
            numeratorLabel: 'Total de atenciones',
            denominatorLabel: 'Total Atendidos (nuevos y reingresos)',
            headers: ['Total de atenciones', 'Total Atendidos (nuevos y reingresos)', 'Indicador'],
          }),
          buildRatioSection({
            title: '2. Concentracion de atenciones (Telemonitoreo)',
            rows: rows.telemonitoreo,
            numeratorKey: 'ATENCIONES',
            denominatorKey: 'ATENDIDOS',
            numeratorLabel: 'Total de atenciones',
            denominatorLabel: 'Total de atendidos (Nuevos y reingresos).',
            headers: ['Total de atenciones', 'Total de atendidos (Nuevos y reingresos).', 'Indicador'],
          }),
          buildRatioSection({
            title: '3. Atenciones medicas en emergencia de tipo I y II',
            rows: rows.emergencia,
            numeratorKey: 'ATENCIONESEME',
            denominatorKey: 'ATENCIONES',
            numeratorLabel: 'Total de atenciones medicas en emergencia de tipo I y II',
            denominatorLabel: 'Total de atenciones medicas realizadas en consulta externa',
            headers: ['Total de atenciones medicas en emergencia de tipo I y II', 'Total de atenciones medicas realizadas en consulta externa', 'Indicador'],
          }),
          buildRatioSection({
            title: '4. Atenciones medicas en emergencia de tipo III y IV',
            rows: rows.urgencia,
            numeratorKey: 'ATENCIONESEME',
            denominatorKey: 'ATENCIONES',
            numeratorLabel: 'Total de atenciones medicas en emergencia de tipo III y IV',
            denominatorLabel: 'Total de atenciones medicas en consulta externa',
            headers: ['Total de atenciones medicas en emergencia de tipo III y IV', 'Total de atenciones medicas en consulta externa', 'Indicador'],
          }),
        ],
      },
    ],
  })

  return {
    content,
    fileName: `indicadores-eficacia_${filters.fechaInicio}_${filters.fechaFin}.xlsx`,
    mimeType: MIME_XLSX,
  }
}

export async function exportQualityIndicatorsExcel(rawFilters = {}) {
  const filters = parseDateRange(rawFilters)
  const rows = await getQualityRows(filters)
  const content = await buildWorkbook({
    fileTitle: 'Indicadores Calidad',
    sheets: [
      {
        name: 'Tasa Neta Mortalidad',
        sections: [
          buildRatioSection({
            title: '1. Tasa neta de mortalidad hospitalaria',
            rows: rows.mortalidadNeta,
            numeratorKey: 'CANTIDAD',
            denominatorKey: 'EGRESOS',
            numeratorLabel: 'Egresos por defuncion en internamiento hospitalario (Fallecido de 48h a mas de admision en Hosp.)',
            denominatorLabel: 'Total de egresos hospitalarios',
            headers: ['Egresos por defuncion en internamiento hospitalario (Fallecido de 48h a mas de admision en Hosp.)', 'Total de egresos hospitalarios', 'Indicador'],
            multiplier: 100,
          }),
          buildRatioSection({
            title: '2. Tasa de mortalidad perinatal',
            rows: rows.perinatal,
            numeratorKey: 'CANTIDAD1',
            denominatorKey: 'CANTIDAD2',
            numeratorLabel: 'Total de egresos por muerte Fetal + Total de egresos por muerte neonatal precoz hospitalaria',
            denominatorLabel: 'Total de R.N. vivos + Total de egresos por muerte fetal',
            headers: ['Total de egresos por muerte Fetal + Total de egresos por muerte neonatal precoz hospitalaria', 'Total de R.N. vivos + Total de egresos por muerte fetal', 'Indicador'],
            multiplier: 1000,
          }),
          buildRatioSection({
            title: '3. Tasa de mortalidad neonatal precoz',
            rows: rows.precoz,
            numeratorKey: 'CANTIDAD1',
            denominatorKey: 'CANTIDAD2',
            numeratorLabel: 'Total de R.N. hasta los 7 dias de vida, fallecidos en servicio de hospitalizacion',
            denominatorLabel: 'Total de R.N. vivos',
            headers: ['Total de R.N. hasta los 7 dias de vida, fallecidos en servicio de hospitalizacion', 'Total de R.N. vivos', 'Indicador'],
            multiplier: 1000,
          }),
          buildRatioSection({
            title: '4. Tasa de mortalidad neonatal tardia',
            rows: rows.tardia,
            numeratorKey: 'CANTIDAD1',
            denominatorKey: 'CANTIDAD2',
            numeratorLabel: 'Total de nacidos vivos entre los 08 a 28 dias de vida, fallecidos',
            denominatorLabel: 'Total de nacidos vivos',
            headers: ['Total de nacidos vivos entre los 08 a 28 dias de vida, fallecidos', 'Total de nacidos vivos', 'Indicador'],
            multiplier: 1000,
          }),
        ],
      },
      {
        name: 'Cirugias Suspendidas',
        sections: [
          buildRatioSection({
            title: '1. Cirugias suspendidas',
            rows: rows.suspendidas,
            numeratorKey: 'CANTIDAD1',
            denominatorKey: 'CANTIDAD2',
            numeratorLabel: 'Total de intervenciones quirurgicas electivas programadas suspendidas en un mismo periodo',
            denominatorLabel: 'Total de intervenciones quirurgicas electivas programadas en el mismo periodo',
            headers: ['Total de intervenciones quirurgicas electivas programadas suspendidas en un mismo periodo', 'Total de intervenciones quirurgicas electivas programadas en el mismo periodo', 'Indicador (%)'],
            multiplier: 100,
          }),
        ],
      },
      {
        name: 'Tasa Cesarea',
        sections: [
          buildRatioSection({
            title: '1. Tasa de cesarea',
            rows: rows.cesarea,
            numeratorKey: 'CESAREA',
            denominatorKey: 'PARTO',
            numeratorLabel: 'Total de cesareas realizadas',
            denominatorLabel: 'Total de partos atendidos',
            headers: ['Total de cesareas realizadas', 'Total de partos atendidos', 'Indicador (%)'],
            multiplier: 100,
          }),
        ],
      },
      {
        name: 'Tasa Muerte Materna',
        sections: [
          buildMultiColumnSection({
            title: '1. Muerte materna por tipo',
            rows: rows.muerteMaterna,
            columns: [
              { key: 'DIRECTA', label: 'Directa', width: 13, numeric: true, total: 'sum' },
              { key: 'DIRECTA_T', label: 'Directa Tardia', width: 15, numeric: true, total: 'sum' },
              { key: 'INDIRECTA', label: 'Indirecta', width: 13, numeric: true, total: 'sum' },
              { key: 'INDIRECTA_T', label: 'Indirecta Tardia', width: 15, numeric: true, total: 'sum' },
              { key: 'INCIDENTAL', label: 'Incidental', width: 13, numeric: true, total: 'sum' },
              { key: 'TOTAL', label: 'Total', width: 13, numeric: true, total: 'sum' },
            ],
          }),
          buildRatioSection({
            title: '2. Razon de muerte materna',
            rows: rows.razon,
            numeratorKey: 'MM',
            denominatorKey: 'RN',
            numeratorLabel: 'Casos de muerte materna',
            denominatorLabel: 'Recien nacidos vivos',
            headers: ['Casos de muerte materna', 'Recien nacidos vivos', 'Razon'],
            multiplier: 1000,
          }),
        ],
      },
    ],
  })

  return {
    content,
    fileName: `indicadores-calidad_${filters.fechaInicio}_${filters.fechaFin}.xlsx`,
    mimeType: MIME_XLSX,
  }
}
