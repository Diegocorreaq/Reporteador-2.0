/**
 * excel-export.service.js
 *
 * Pure presentation layer - builds real .xlsx workbooks via ExcelJS.
 * No SQL, no routing, no catalog knowledge.
 *
 * Exports:
 *   buildSimpleWorkbook({ title, rows })
 *     -> flat table with styled header row; used for current/range/lavado catalogs
 *
 *   buildStructuredWorkbook({ config, rows, startDate, endDate, title })
 *     -> metadata block + two-level grouped headers; used for salud-mental
 *        config shape matches MENTAL_HEALTH_TEMPLATE_CONFIG in legacy-export.service.js
 */

import ExcelJS from 'exceljs'

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const MIME_XLSX = 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
const DEFAULT_SAMPLE_SIZE = 60

const BORDER_BY_STYLE = new Map()

function borderOf(style = 'thin') {
  const borderStyle = String(style || 'thin')
  if (!BORDER_BY_STYLE.has(borderStyle)) {
    BORDER_BY_STYLE.set(borderStyle, {
      top: { style: borderStyle },
      left: { style: borderStyle },
      bottom: { style: borderStyle },
      right: { style: borderStyle },
    })
  }
  return BORDER_BY_STYLE.get(borderStyle)
}

const THIN_BORDER = borderOf('thin')

const HEADER_FONT = { bold: true, size: 10 }
const DATA_FONT = { size: 10 }
const META_LABEL_FILL = argbFill('E7F5FE')

const LONG_TEXT_HEADER_TOKENS = [
  'PACIENTE',
  'NOMBRE',
  'SERVICIO',
  'DIAGNOSTICO',
  'OBSERVACION',
  'OBSERVACIONES',
  'MOTIVO',
  'PROCEDENCIA',
  'DIRECCION',
  'DESCRIPCION',
]

const CENTER_DATA_HEADER_TOKENS = [
  'ANIO',
  'ANO',
  'MES',
  'EDAD',
  'TIPO EDAD',
  'NRO',
  'NUMERO',
  'CUENTA',
  'CODIGO',
  'COD',
  'DNI',
]

// ---------------------------------------------------------------------------
// Style helpers
// ---------------------------------------------------------------------------

/** Converts a 6-char RGB hex string (with or without #) to ExcelJS ARGB fill */
function argbFill(hex) {
  return {
    type: 'pattern',
    pattern: 'solid',
    fgColor: { argb: toArgbColor(hex) },
  }
}

function toArgbColor(hex) {
  return 'FF' + String(hex ?? '').replace('#', '')
}

function applyCellStyle(cell, { fill, font, border, alignment, numFmt } = {}) {
  if (fill) cell.fill = fill
  if (font) cell.font = font
  if (border) cell.border = border
  if (alignment) cell.alignment = alignment
  if (numFmt) cell.numFmt = numFmt
}

function applyHeaderStyle(
  cell,
  colorHex,
  { horizontal = 'center', wrapText = true, borderStyle = 'thin', fontColor } = {},
) {
  const font = { ...HEADER_FONT }
  if (fontColor) {
    font.color = { argb: toArgbColor(fontColor) }
  }

  applyCellStyle(cell, {
    fill: argbFill(colorHex),
    font,
    border: borderOf(borderStyle),
    alignment: { vertical: 'middle', horizontal, wrapText },
  })
}

function applyDataStyle(cell, { horizontal = 'left', wrapText = false, borderStyle = 'thin' } = {}) {
  applyCellStyle(cell, {
    font: DATA_FONT,
    border: borderOf(borderStyle),
    alignment: { vertical: 'middle', horizontal, wrapText },
  })
}

function forEachCellInRange(ws, startRow, startCol, endRow, endCol, visitor) {
  for (let row = startRow; row <= endRow; row++) {
    for (let col = startCol; col <= endCol; col++) {
      visitor(ws.getCell(row, col), row, col)
    }
  }
}

function mergeCellsAndStyle(ws, startRow, startCol, endRow, endCol, { value, ...style } = {}) {
  ws.mergeCells(startRow, startCol, endRow, endCol)
  forEachCellInRange(ws, startRow, startCol, endRow, endCol, (cell) => applyCellStyle(cell, style))
  if (value !== undefined) {
    ws.getCell(startRow, startCol).value = value
  }
}

// ---------------------------------------------------------------------------
// Shared tiny helpers (self-contained - no import from legacy-export)
// ---------------------------------------------------------------------------

/** PHP date("d/m/y H:i a") replica - e.g. 17/04/26 14:30 pm */
function formatDateTime(date = new Date()) {
  const dd = String(date.getDate()).padStart(2, '0')
  const mm = String(date.getMonth() + 1).padStart(2, '0')
  const yy = String(date.getFullYear()).slice(2)
  const HH = String(date.getHours()).padStart(2, '0')
  const ii = String(date.getMinutes()).padStart(2, '0')
  const ampm = date.getHours() < 12 ? 'am' : 'pm'
  return `${dd}/${mm}/${yy} ${HH}:${ii} ${ampm}`
}

/**
 * Reads the first matching key from a row, trying exact -> UPPER -> lower.
 * Handles SP result sets regardless of column name casing.
 */
function col(row, ...keys) {
  for (const k of keys) {
    if (Object.prototype.hasOwnProperty.call(row, k)) return row[k]
    if (Object.prototype.hasOwnProperty.call(row, k.toUpperCase())) return row[k.toUpperCase()]
    if (Object.prototype.hasOwnProperty.call(row, k.toLowerCase())) return row[k.toLowerCase()]
  }
  return ''
}

/** Clamp a number between min and max */
function clamp(value, min, max) {
  return Math.min(Math.max(value, min), max)
}

/** Removes the trailing extension (if any), keeping the base name only. */
function removeFileExtension(name) {
  return String(name ?? '').replace(/\.[^.]+$/i, '')
}

/**
 * Sanitize to valid Excel sheet name:
 * - no extension
 * - no invalid chars: \ / ? * [ ] :
 * - max 31 chars
 * - no leading/trailing apostrophe
 */
export function getSheetNameFromFileName(fileName) {
  let name = String(fileName ?? '').trim()
  name = name.replace(/^.*[\\/]/, '')
  name = removeFileExtension(name)
  name = name.replace(/[\\/*?:[\]]/g, '')
  name = name.replace(/^'+|'+$/g, '')
  name = name.replace(/\s+/g, ' ').trim()
  if (!name) return 'Hoja1'
  return name.slice(0, 31)
}

/** Formats a date/datetime value as dd/mm/yyyy hh:mm:ss (legacy display format) */
function formatDateTimeLegacy(value) {
  if (!value) return ''
  const date = new Date(value)
  if (isNaN(date.getTime())) return String(value)
  const dd = String(date.getDate()).padStart(2, '0')
  const mm = String(date.getMonth() + 1).padStart(2, '0')
  const yyyy = String(date.getFullYear())
  const HH = String(date.getHours()).padStart(2, '0')
  const ii = String(date.getMinutes()).padStart(2, '0')
  const ss = String(date.getSeconds()).padStart(2, '0')
  return `${dd}/${mm}/${yyyy} ${HH}:${ii}:${ss}`
}

/** Formats datetime as yyyy-mm-dd hh:mm:ss.000 (legacy lavado display format) */
function formatDateTimeSqlLegacy(value) {
  if (value == null || value === '') return ''

  const raw = String(value).trim()
  const normalizedRawMatch = raw.match(/^(\d{4})-(\d{2})-(\d{2})[T\s](\d{2}:\d{2}:\d{2})/)
  if (normalizedRawMatch) {
    return `${normalizedRawMatch[1]}-${normalizedRawMatch[2]}-${normalizedRawMatch[3]} ${normalizedRawMatch[4]}.000`
  }

  const date = new Date(value)
  if (isNaN(date.getTime())) return raw

  const yyyy = String(date.getFullYear())
  const mm = String(date.getMonth() + 1).padStart(2, '0')
  const dd = String(date.getDate()).padStart(2, '0')
  const HH = String(date.getHours()).padStart(2, '0')
  const ii = String(date.getMinutes()).padStart(2, '0')
  const ss = String(date.getSeconds()).padStart(2, '0')

  return `${yyyy}-${mm}-${dd} ${HH}:${ii}:${ss}.000`
}

function resolveTabulatedMetadataValue(value, { startDate, endDate, reportDateTime }) {
  if (value === '{{startDate}}') return formatMetadataDateValue(startDate)
  if (value === '{{endDate}}') return formatMetadataDateValue(endDate)
  if (value === '{{dateRange}}') {
    return `${formatMetadataDateDisplayValue(startDate)} al ${formatMetadataDateDisplayValue(endDate)}`
  }
  if (value === '{{reportDateTime}}') return reportDateTime
  return value ?? ''
}

function formatMetadataDateDisplayValue(value) {
  if (value == null || value === '') return ''

  const raw = String(value).trim()
  const dateMatch = raw.match(/^(\d{4})[-/](\d{2})[-/](\d{2})$/)
  if (dateMatch) {
    return `${dateMatch[3]}/${dateMatch[2]}/${dateMatch[1]}`
  }

  const parsed = parseExcelDateValue(raw)
  if (!parsed) return raw

  const yyyy = String(parsed.getFullYear())
  const mm = String(parsed.getMonth() + 1).padStart(2, '0')
  const dd = String(parsed.getDate()).padStart(2, '0')
  return `${dd}/${mm}/${yyyy}`
}

function formatMetadataDateValue(value) {
  if (value == null || value === '') return ''

  const raw = String(value).trim()
  const dateMatch = raw.match(/^(\d{4})[-/](\d{2})[-/](\d{2})$/)
  if (dateMatch) {
    return `${dateMatch[1]}/${dateMatch[2]}/${dateMatch[3]}`
  }

  const parsed = parseExcelDateValue(raw)
  if (!parsed) return raw

  const yyyy = String(parsed.getFullYear())
  const mm = String(parsed.getMonth() + 1).padStart(2, '0')
  const dd = String(parsed.getDate()).padStart(2, '0')
  return `${yyyy}/${mm}/${dd}`
}

function isValidDateValue(value) {
  return value instanceof Date && !isNaN(value.getTime())
}

function parseExcelDateValue(rawValue) {
  if (rawValue == null || rawValue === '') return null

  if (rawValue instanceof Date) {
    return isValidDateValue(rawValue) ? rawValue : null
  }

  if (typeof rawValue === 'number' && Number.isFinite(rawValue)) {
    const fromNumber = new Date(rawValue)
    return isValidDateValue(fromNumber) ? fromNumber : null
  }

  const raw = String(rawValue).trim()
  if (!raw) return null

  let match = raw.match(/^(\d{4})-(\d{2})-(\d{2})$/)
  if (match) {
    return new Date(Number(match[1]), Number(match[2]) - 1, Number(match[3]))
  }

  match = raw.match(
    /^(\d{4})-(\d{2})-(\d{2})[T\s](\d{2}):(\d{2})(?::(\d{2}))?(?:\.\d+)?(?:Z|[+-]\d{2}:?\d{2})?$/i,
  )
  if (match) {
    return new Date(
      Number(match[1]),
      Number(match[2]) - 1,
      Number(match[3]),
      Number(match[4]),
      Number(match[5]),
      Number(match[6] ?? 0),
    )
  }

  match = raw.match(/^(\d{2})\/(\d{2})\/(\d{4})$/)
  if (match) {
    return new Date(Number(match[3]), Number(match[2]) - 1, Number(match[1]))
  }

  match = raw.match(/^(\d{2})\/(\d{2})\/(\d{4})[T\s](\d{2}):(\d{2})(?::(\d{2}))?$/)
  if (match) {
    return new Date(
      Number(match[3]),
      Number(match[2]) - 1,
      Number(match[1]),
      Number(match[4]),
      Number(match[5]),
      Number(match[6] ?? 0),
    )
  }

  const fallback = new Date(raw)
  return isValidDateValue(fallback) ? fallback : null
}

function toDateOnly(value) {
  if (!isValidDateValue(value)) return null
  return new Date(value.getFullYear(), value.getMonth(), value.getDate())
}

function parseExcelTimeValue(rawValue) {
  if (rawValue == null || rawValue === '') return null

  if (typeof rawValue === 'number' && Number.isFinite(rawValue)) {
    return rawValue >= 0 && rawValue < 1 ? rawValue : null
  }

  if (rawValue instanceof Date && isValidDateValue(rawValue)) {
    return (
      rawValue.getHours() * 3600 +
      rawValue.getMinutes() * 60 +
      rawValue.getSeconds()
    ) / 86400
  }

  const raw = String(rawValue).trim()
  if (!raw) return null

  let match = raw.match(/^(\d{1,2}):(\d{2})(?::(\d{2}))?$/)
  if (match) {
    const hours = Number(match[1])
    const minutes = Number(match[2])
    const seconds = Number(match[3] ?? 0)
    return (hours * 3600 + minutes * 60 + seconds) / 86400
  }

  const parsedDate = parseExcelDateValue(raw)
  if (!parsedDate) return null

  return (
    parsedDate.getHours() * 3600 +
    parsedDate.getMinutes() * 60 +
    parsedDate.getSeconds()
  ) / 86400
}

function normalizeTabulatedCellValue(rawValue, column) {
  let value = rawValue

  if (column.blankWhenZero) {
    if (value == null || value === '') {
      value = ''
    } else {
      const numeric = Number(value)
      if (Number.isFinite(numeric) && numeric === 0) {
        value = ''
      }
    }
  }

  if (column.format === 'datetime-legacy') {
    return formatDateTimeLegacy(value)
  }

  if (column.format === 'datetime-sql-legacy') {
    return formatDateTimeSqlLegacy(value)
  }

  return value ?? ''
}

function normalizeTabulatedCellPayload(rawValue, column) {
  const value = normalizeTabulatedCellValue(rawValue, column)

  if (column.format === 'excel-date') {
    const parsed = toDateOnly(parseExcelDateValue(value))
    return {
      value: parsed ?? '',
      numFmt: parsed ? column.numFmt ?? 'dd/mm/yyyy' : undefined,
    }
  }

  if (column.format === 'excel-datetime') {
    const parsed = parseExcelDateValue(value)
    return {
      value: parsed ?? '',
      numFmt: parsed ? column.numFmt ?? 'dd/mm/yyyy hh:mm' : undefined,
    }
  }

  if (column.format === 'excel-time') {
    const parsed = parseExcelTimeValue(value)
    return {
      value: parsed ?? '',
      numFmt: parsed != null ? column.numFmt ?? 'hh:mm' : undefined,
    }
  }

  return {
    value,
    numFmt: column.numFmt,
  }
}

function applyFreezePane(ws, freezeRows) {
  const ySplit = Number.isFinite(Number(freezeRows)) ? Math.max(0, Math.floor(Number(freezeRows))) : 0
  if (ySplit > 0) {
    ws.views = [{ state: 'frozen', ySplit }]
  }
}

function resolveFreezeRows({ freezeRows, metadataRows = 0, spacerRows = 0, headerRows = 1 }) {
  if (Number.isFinite(Number(freezeRows))) {
    return Math.max(0, Math.floor(Number(freezeRows)))
  }
  return Math.max(0, metadataRows + spacerRows + headerRows)
}

function normalizeHeaderToken(value) {
  return String(value ?? '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toUpperCase()
    .replace(/[^A-Z0-9]+/g, ' ')
    .trim()
}

function isSessionIndexHeader(normalizedHeader) {
  return /^\d+$/.test(normalizedHeader.replace(/\s+/g, ''))
}

function isHcHeader(normalizedHeader) {
  const compact = normalizedHeader.replace(/\s+/g, '')
  return compact === 'HC' || compact === 'HISTORIACLINICA' || compact.includes('NROHC')
}

function isPacienteHeader(normalizedHeader) {
  return (
    normalizedHeader.includes('PACIENTE') ||
    normalizedHeader.includes('NOMBRE PACIENTE') ||
    normalizedHeader.includes('APELLIDOS NOMBRES')
  )
}

function containsAnyToken(normalizedHeader, tokens) {
  return tokens.some((token) => normalizedHeader.includes(token))
}

function estimateSampleWidth(values, { min = 8, max = 40, padding = 2 } = {}) {
  const longest = values.reduce((currentMax, value) => {
    return Math.max(currentMax, String(value ?? '').trim().length)
  }, 0)
  return clamp(longest + padding, min, max)
}

function resolveColumnWidth({ header, samples = [], explicitWidth, fallback = 12, fitSessionSamples = false }) {
  if (Number.isFinite(Number(explicitWidth))) {
    return Math.max(2, Number(explicitWidth))
  }

  const normalizedHeader = normalizeHeaderToken(header)
  const sampledWidth = estimateSampleWidth(samples, { min: fallback, max: 42, padding: 2 })

  if (isHcHeader(normalizedHeader)) {
    return clamp(Math.max(sampledWidth, 12), 12, 14)
  }

  if (isPacienteHeader(normalizedHeader)) {
    return clamp(Math.max(sampledWidth, 28), 28, 40)
  }

  if (isSessionIndexHeader(normalizedHeader) && !fitSessionSamples) {
    return 9
  }

  if (containsAnyToken(normalizedHeader, LONG_TEXT_HEADER_TOKENS)) {
    return clamp(Math.max(sampledWidth, 18), 18, 40)
  }

  return clamp(sampledWidth, 10, 34)
}

function resolveDataHorizontal(header, explicitHorizontal) {
  if (explicitHorizontal) return explicitHorizontal

  const normalizedHeader = normalizeHeaderToken(header)
  if (isSessionIndexHeader(normalizedHeader)) return 'center'
  if (containsAnyToken(normalizedHeader, CENTER_DATA_HEADER_TOKENS)) return 'center'
  return 'left'
}

// ---------------------------------------------------------------------------
// A. Simple workbook - flat header + data rows
// ---------------------------------------------------------------------------
//
// Used for: current / current-sigh / range / lavado exports
// Structure:
//   Row 1 : column headers (styled)
//   Row 2+: data rows
// ---------------------------------------------------------------------------

export async function buildSimpleWorkbook({ title, rows }) {
  const wb = new ExcelJS.Workbook()
  wb.creator = 'Reporteador-2.0'

  const sourceRows = Array.isArray(rows) ? rows : []
  const safeRows =
    sourceRows.length > 0
      ? sourceRows
      : [{ MENSAJE: 'No se encontraron registros para los filtros solicitados.' }]

  const headers = Object.keys(safeRows[0] ?? {})
  const sampledRows = safeRows.slice(0, DEFAULT_SAMPLE_SIZE)

  const ws = wb.addWorksheet(getSheetNameFromFileName(title))

  ws.columns = headers.map((header) => {
    const samples = sampledRows.map((row) => row[header])
    return {
      width: resolveColumnWidth({ header, samples, fallback: 12 }),
    }
  })

  // Header row
  const headerRow = ws.addRow(headers)
  headerRow.height = 20
  headerRow.eachCell((cell) => {
    applyHeaderStyle(cell, 'E7F5FE', { horizontal: 'center', wrapText: true })
  })

  // Freeze below header row
  applyFreezePane(
    ws,
    resolveFreezeRows({
      metadataRows: 0,
      headerRows: 1,
      spacerRows: 0,
    }),
  )

  // Data rows
  safeRows.forEach((row) => {
    const values = headers.map((h) => row[h] ?? '')
    const dataRow = ws.addRow(values)
    dataRow.height = 16
    dataRow.eachCell((cell, colNumber) => {
      const header = headers[colNumber - 1]
      applyDataStyle(cell, {
        horizontal: resolveDataHorizontal(header),
      })
    })
  })

  return wb.xlsx.writeBuffer()
}

// ---------------------------------------------------------------------------
// B. Structured workbook - metadata block + two-level grouped headers
// ---------------------------------------------------------------------------
//
// Used for: salud-mental exports (MENTAL_HEALTH_TEMPLATE_CONFIG entries)
//
// config shape:
//   {
//     tipoReporte  : string,
//     groups       : [{ title, color, keys }],
//     freezeRows?  : number, // optional override
//     spacerRows?  : number, // optional (default: 1)
//     columnWidths?: {
//       hc?: number,
//       paciente?: number,
//       numeric?: number,
//       byKey?: Record<string, number>,
//     }
//     headerLabels?: {
//       hc?: string,
//       paciente?: string,
//     }
//   }
//
// Layout (default):
//   Rows 1-4 : metadata (Desde / Hasta / Fecha y Hora / Tipo de reporte)
//   Row  5   : spacer
//   Row  6   : H.C.(merged v2) | PACIENTE(merged v2) | group headers (merged h)
//   Row  7   : -               | -                    | sub-column numbers 1, 2, 3...
//   Row  8+  : data rows (HC forced as text to preserve leading zeros)
// ---------------------------------------------------------------------------

export async function buildStructuredWorkbook({ config, rows, startDate, endDate, title }) {
  const wb = new ExcelJS.Workbook()
  wb.creator = 'Reporteador-2.0'

  const ws = wb.addWorksheet(getSheetNameFromFileName(title))

  const sourceRows = Array.isArray(rows) ? rows : []

  // Pre-calculations
  const totalDataCols = config.groups.reduce((sum, g) => sum + g.keys.length, 0)
  const totalCols = 2 + totalDataCols // col 1 = HC, col 2 = PACIENTE, col 3+ = data

  // Sort by PACIENTE ascending - matches legacy visual output
  const sorted = [...sourceRows].sort((a, b) => {
    const pa = String(col(a, 'paciente')).toUpperCase()
    const pb = String(col(b, 'paciente')).toUpperCase()
    return pa < pb ? -1 : pa > pb ? 1 : 0
  })

  const sampledRows = sorted.slice(0, DEFAULT_SAMPLE_SIZE)

  // Rows 1-4: Metadata
  const metaItems = [
    ['Desde', startDate],
    ['Hasta', endDate],
    ['Fecha y Hora de Reporte', formatDateTime()],
    ['Tipo de reporte', config.tipoReporte],
  ]

  const metadataRows = metaItems.length
  const spacerRows = Number.isFinite(Number(config.spacerRows))
    ? Math.max(0, Math.floor(Number(config.spacerRows)))
    : 1

  const ROW_GRP = metadataRows + spacerRows + 1
  const ROW_SUB = ROW_GRP + 1
  const DATA_START = ROW_SUB + 1

  metaItems.forEach(([label, value], i) => {
    const rowNum = i + 1

    // Label: cols 1-2 merged
    mergeCellsAndStyle(ws, rowNum, 1, rowNum, 2, {
      value: label,
      fill: META_LABEL_FILL,
      font: DATA_FONT,
      border: THIN_BORDER,
      alignment: { vertical: 'middle', horizontal: 'left', wrapText: true },
    })

    // Value: cols 3-totalCols merged
    mergeCellsAndStyle(ws, rowNum, 3, rowNum, totalCols, {
      value: String(value ?? ''),
      font: { bold: true, size: 10 },
      border: THIN_BORDER,
      alignment: { vertical: 'middle', horizontal: 'left', wrapText: true },
    })

    ws.getRow(rowNum).height = 18
  })

  // Spacer rows
  for (let spacerIdx = 1; spacerIdx <= spacerRows; spacerIdx++) {
    ws.getRow(metadataRows + spacerIdx).height = 5
  }

  // Two-level grouped headers
  ws.getRow(ROW_GRP).height = 22
  ws.getRow(ROW_SUB).height = 20

  const headerLabels = config.headerLabels ?? {}

  // H.C. spans both header rows
  mergeCellsAndStyle(ws, ROW_GRP, 1, ROW_SUB, 1, {
    value: headerLabels.hc ?? 'H.C.',
    fill: argbFill('FA7985'),
    font: HEADER_FONT,
    border: THIN_BORDER,
    alignment: { vertical: 'middle', horizontal: 'center', wrapText: true },
  })

  // PACIENTE spans both header rows
  mergeCellsAndStyle(ws, ROW_GRP, 2, ROW_SUB, 2, {
    value: headerLabels.paciente ?? 'PACIENTE',
    fill: argbFill('FA7985'),
    font: HEADER_FONT,
    border: THIN_BORDER,
    alignment: { vertical: 'middle', horizontal: 'center', wrapText: true },
  })

  let colCursor = 3
  for (const group of config.groups) {
    const size = group.keys.length
    const colorHex = group.color.replace('#', '')
    const endCol = colCursor + size - 1

    // Group header in row ROW_GRP (merged if multi-column)
    if (size > 1) {
      ws.mergeCells(ROW_GRP, colCursor, ROW_GRP, endCol)
    }
    forEachCellInRange(ws, ROW_GRP, colCursor, ROW_GRP, endCol, (cell) => {
      applyHeaderStyle(cell, colorHex, { horizontal: 'center', wrapText: true })
    })
    ws.getCell(ROW_GRP, colCursor).value = group.title

    // Sub-column numbers in row ROW_SUB
    group.keys.forEach((_, keyIdx) => {
      const subCell = ws.getCell(ROW_SUB, colCursor + keyIdx)
      applyHeaderStyle(subCell, colorHex, { horizontal: 'center', wrapText: true })
      subCell.value = keyIdx + 1
    })

    colCursor = endCol + 1
  }

  // Data rows
  if (sorted.length === 0) {
    mergeCellsAndStyle(ws, DATA_START, 1, DATA_START, totalCols, {
      value: 'No se encontraron registros para los filtros solicitados.',
      font: DATA_FONT,
      border: THIN_BORDER,
      alignment: { horizontal: 'center', vertical: 'middle', wrapText: true },
    })
    ws.getRow(DATA_START).height = 16
  } else {
    sorted.forEach((row, rowIdx) => {
      const excelRowNum = DATA_START + rowIdx
      ws.getRow(excelRowNum).height = 16

      // H.C. as text to preserve leading zeros
      const hcCell = ws.getCell(excelRowNum, 1)
      hcCell.value = String(col(row, 'hc'))
      applyDataStyle(hcCell, { horizontal: 'left' })
      hcCell.numFmt = '@'

      // PACIENTE
      const pacCell = ws.getCell(excelRowNum, 2)
      pacCell.value = String(col(row, 'paciente'))
      applyDataStyle(pacCell, { horizontal: 'left' })

      // Data columns
      let dataCol = 3
      for (const group of config.groups) {
        for (const k of group.keys) {
          const dataCell = ws.getCell(excelRowNum, dataCol)
          const rawVal = col(row, k)
          dataCell.value = rawVal === '' || rawVal == null ? null : rawVal
          applyDataStyle(dataCell, { horizontal: 'center' })
          dataCol++
        }
      }
    })
  }

  // Column widths
  const widthConfig = config.columnWidths ?? {}

  ws.getColumn(1).width = resolveColumnWidth({
    header: 'H.C.',
    explicitWidth: widthConfig.hc,
    samples: sampledRows.map((row) => col(row, 'hc')),
    fallback: 12,
  })

  ws.getColumn(2).width = resolveColumnWidth({
    header: 'PACIENTE',
    explicitWidth: widthConfig.paciente,
    samples: sampledRows.map((row) => col(row, 'paciente')),
    fallback: 30,
  })

  let widthColCursor = 3
  for (const group of config.groups) {
    for (const key of group.keys) {
      const explicit = widthConfig.byKey?.[key] ?? widthConfig.numeric
      ws.getColumn(widthColCursor).width = resolveColumnWidth({
        header: String(widthColCursor - 2),
        explicitWidth: explicit,
        samples: sorted.map((row) => col(row, key)),
        fallback: 9,
        fitSessionSamples: true,
      })
      widthColCursor++
    }
  }

  // Freeze rows below metadata + header block (or explicit override)
  applyFreezePane(
    ws,
    resolveFreezeRows({
      freezeRows: config.freezeRows,
      metadataRows,
      spacerRows,
      headerRows: 2,
    }),
  )

  return wb.xlsx.writeBuffer()
}

// ---------------------------------------------------------------------------
// C. Tabulated workbook - column-mapped flat table
// ---------------------------------------------------------------------------
//
// Used for exports that need explicit column selection, visible labels,
// per-column header colors, datetime formatting, and configurable freeze panes.
//
// template shape:
//   {
//     sheetName?    : string,  // optional clean sheet name
//     freezeRows?   : number,  // explicit row count to freeze
//     metadataRows? : number,  // optional row count to compute freeze position
//     spacerRows?   : number,  // optional row count to compute freeze position
//     headerRows?   : number,  // optional row count to compute freeze position (default: 1)
//     columnWidths? : Record<string, number>, // optional by key or label
//     headerRowHeight?: number, // optional header row height
//     dataRowHeight?: number,   // optional data row height
//     headerBorderStyle?: string, // optional border style for headers
//     dataBorderStyle?: string,   // optional border style for data cells
//     autoFilter?   : boolean, // optional autofilter toggle
//     emitEmptyTemplate?: boolean, // optional: when true and no data, keep only header/template
//     columns       : Array<{
//       key         : string,  // SP result column name (case-insensitive lookup)
//       label       : string,  // visible header label
//       width?      : number,  // optional width in Excel character units
//       align?      : string,  // optional horizontal alignment
//       headerColor : string,  // 6-char RGB hex without #
//       format?     : string,  // 'datetime-legacy' | 'datetime-sql-legacy' | 'excel-date' | 'excel-datetime'
//       dataColor?  : string,  // optional data cell fill
//       numFmt?     : string,  // optional explicit Excel numFmt
//     }>
//   }
// ---------------------------------------------------------------------------

export async function buildTabulatedWorkbook({ template, rows, title, startDate, endDate }) {
  const wb = new ExcelJS.Workbook()
  wb.creator = 'Reporteador-2.0'

  const sourceRows = Array.isArray(rows) ? rows : []
  const sampledRows = sourceRows.slice(0, DEFAULT_SAMPLE_SIZE)
  const reportDateTime = formatDateTime()

  const {
    sheetName,
    columns,
    freezeRows,
    metadata = [],
    metadataLayout = {},
    metadataRows = 0,
    spacerRows = 0,
    headerRows = 1,
    columnWidths = {},
    headerRowHeight = 30,
    dataRowHeight = 16,
    headerBorderStyle = 'thin',
    dataBorderStyle = 'thin',
    autoFilter = false,
    emitEmptyTemplate = false,
  } = template

  const ws = wb.addWorksheet(getSheetNameFromFileName(sheetName || title))
  const totalCols = columns.length
  const hasMetadata = Array.isArray(metadata) && metadata.length > 0
  const effectiveMetadataRows = hasMetadata ? metadata.length : metadataRows
  const effectiveSpacerRows = Math.max(0, Number(spacerRows) || 0)

  if (hasMetadata) {
    const labelStartCol = Math.min(Math.max(Number(metadataLayout.labelStartCol) || 1, 1), totalCols)
    const labelEndCol = Math.min(
      Math.max(Number(metadataLayout.labelEndCol) || 2, labelStartCol),
      totalCols,
    )
    const valueStartCol = Math.min(
      Math.max(Number(metadataLayout.valueStartCol) || 3, labelEndCol + 1),
      totalCols,
    )
    const valueEndCol = Math.min(
      Math.max(Number(metadataLayout.valueEndCol) || totalCols, valueStartCol),
      totalCols,
    )
    const labelFill = argbFill(metadataLayout.labelColor ?? 'E7F5FE')

    metadata.forEach((item, index) => {
      const rowNumber = index + 1
      const label = String(item?.label ?? '')
      const value = String(
        resolveTabulatedMetadataValue(item?.value, {
          startDate,
          endDate,
          reportDateTime,
        }),
      )

      mergeCellsAndStyle(ws, rowNumber, labelStartCol, rowNumber, labelEndCol, {
        value: label,
        fill: labelFill,
        font: HEADER_FONT,
        border: THIN_BORDER,
        alignment: { vertical: 'middle', horizontal: 'left', wrapText: true },
      })

      mergeCellsAndStyle(ws, rowNumber, valueStartCol, rowNumber, valueEndCol, {
        value,
        font: HEADER_FONT,
        border: THIN_BORDER,
        alignment: { vertical: 'middle', horizontal: 'left', wrapText: true },
      })

      ws.getRow(rowNumber).height = 18
    })
  }

  for (let spacerIndex = 1; spacerIndex <= effectiveSpacerRows; spacerIndex++) {
    ws.getRow(effectiveMetadataRows + spacerIndex).height = 5
  }

  ws.columns = columns.map((column) => {
    const explicitWidth =
      column.width ??
      columnWidths[column.key] ??
      columnWidths[column.label]

    return {
      width: resolveColumnWidth({
        header: column.label ?? column.key,
        explicitWidth,
        samples: sampledRows.map((row) => col(row, column.key)),
        fallback: 12,
      }),
    }
  })

  // Header row
  const headerRowIndex = effectiveMetadataRows + effectiveSpacerRows + 1
  const headerRow = ws.addRow(columns.map((column) => column.label ?? column.key))
  headerRow.height = Number.isFinite(Number(headerRowHeight)) ? Number(headerRowHeight) : 30
  headerRow.eachCell((cell, colNumber) => {
    const column = columns[colNumber - 1]
    applyHeaderStyle(cell, column.headerColor ?? 'E7F5FE', {
      horizontal: column.headerAlign ?? 'center',
      wrapText: column.headerWrapText ?? true,
      borderStyle: column.headerBorderStyle ?? headerBorderStyle,
      fontColor: column.headerFontColor,
    })
  })

  // Freeze below the complete header block (or explicit override)
  applyFreezePane(
    ws,
    resolveFreezeRows({
      freezeRows,
      metadataRows: effectiveMetadataRows,
      spacerRows: effectiveSpacerRows,
      headerRows,
    }),
  )

  // No data case
  if (sourceRows.length === 0) {
    if (autoFilter) {
      ws.autoFilter = {
        from: { row: headerRowIndex, column: 1 },
        to: { row: headerRowIndex, column: columns.length },
      }
    }

    if (emitEmptyTemplate) {
      return wb.xlsx.writeBuffer()
    }

    const messageRowIndex = headerRowIndex + 1
    mergeCellsAndStyle(ws, messageRowIndex, 1, messageRowIndex, columns.length, {
      value: 'No se encontraron registros para los filtros solicitados.',
      font: DATA_FONT,
      border: THIN_BORDER,
      alignment: { horizontal: 'center', vertical: 'middle', wrapText: true },
    })
    ws.getRow(messageRowIndex).height = Number.isFinite(Number(dataRowHeight)) ? Number(dataRowHeight) : 16
    return wb.xlsx.writeBuffer()
  }

  if (autoFilter) {
    ws.autoFilter = {
      from: { row: headerRowIndex, column: 1 },
      to: { row: headerRowIndex, column: columns.length },
    }
  }

  // Data rows
  sourceRows.forEach((row) => {
    const dataRow = ws.addRow([])
    dataRow.height = Number.isFinite(Number(dataRowHeight)) ? Number(dataRowHeight) : 16
    columns.forEach((column, index) => {
      const cell = dataRow.getCell(index + 1)
      const raw = col(row, column.key)
      const payload = normalizeTabulatedCellPayload(raw, column)
      const normalizedValue = payload.value

      if (column.asText) {
        cell.value = normalizedValue === '' ? '' : String(normalizedValue)
        cell.numFmt = '@'
      } else {
        cell.value = normalizedValue
        if (payload.numFmt) {
          cell.numFmt = payload.numFmt
        }
      }

      applyDataStyle(cell, {
        horizontal: resolveDataHorizontal(column.label ?? column.key, column.align),
        wrapText: column.wrapText ?? false,
        borderStyle: column.dataBorderStyle ?? dataBorderStyle,
      })

      if (column.dataColor) {
        cell.fill = argbFill(column.dataColor)
      }
    })
  })

  return wb.xlsx.writeBuffer()
}

// ---------------------------------------------------------------------------
// D. Camas resumen workbook - legacy layout with summary + grouped subtotals
// ---------------------------------------------------------------------------
//
// Used for: current-sigh/exportaxls_7 (reporte_camas legacy parity)
//
// Layout:
//   Row 1   : summary header (NRO TRIAJES / NRO ATENDIDOS)
//   Row 2   : summary values
//   Row 3   : spacer
//   Row 4   : main table header (12 visible columns)
//   Row 5+  : detail rows + subtotal rows + total general row
//
// Legacy behaviors preserved:
//   - subtotal break on PISO changes
//   - initial comparison baseline = "Emergencia 1er Piso"
//   - servicio cell is blank when repeated consecutively
//   - piso cell is blank inside a group except first row
// ---------------------------------------------------------------------------

function toFiniteNumber(value) {
  const numeric = Number(value)
  return Number.isFinite(numeric) ? numeric : 0
}

export async function buildCamasResumenWorkbook({ summary = {}, rows = [], title, sheetName }) {
  const wb = new ExcelJS.Workbook()
  wb.creator = 'Reporteador-2.0'

  const ws = wb.addWorksheet(getSheetNameFromFileName(sheetName || title))

  const columns = [
    { key: 'piso', label: 'PISO', width: 26, align: 'left' },
    { key: 'servicio', label: 'SERVICIO', width: 38, align: 'left' },
    { key: 'tipo', label: 'TIPO CAMA', width: 16, align: 'left' },
    { key: 'c_vm', label: 'VENITLACION MECANICA', width: 22, align: 'center' },
    { key: 'c_fl', label: 'OXIGENO ALTO FLUJO', width: 20, align: 'center' },
    { key: 'total', label: 'CAMAS TOTALES', width: 16, align: 'center' },
    { key: 'chabi', label: 'CAMAS HABILITADAS', width: 18, align: 'center' },
    { key: 'cocup', label: 'CAMAS OCUPADAS', width: 16, align: 'center' },
    { key: 'clibr', label: 'CAMAS DISPONIBLES', width: 18, align: 'center' },
    { key: 'ctran', label: 'CAMAS TRANSITORIAS', width: 18, align: 'center' },
    { key: 'cinah', label: 'CAMAS INHABILITADAS', width: 18, align: 'center' },
    { key: 'fecha', label: 'FECHA CORTE', width: 20, align: 'center' },
  ]

  ws.columns = columns.map((column) => ({ width: column.width }))

  const summaryHeader = ws.addRow(['NRO TRIAJES', 'NRO ATENDIDOS'])
  summaryHeader.height = 20
  applyHeaderStyle(summaryHeader.getCell(1), '75ABFD', { horizontal: 'center' })
  applyHeaderStyle(summaryHeader.getCell(2), '75ABFD', { horizontal: 'center' })

  const summaryValues = ws.addRow([
    toFiniteNumber(summary.triajes),
    toFiniteNumber(summary.atendidos),
  ])
  summaryValues.height = 18
  applyDataStyle(summaryValues.getCell(1), { horizontal: 'center' })
  applyDataStyle(summaryValues.getCell(2), { horizontal: 'center' })

  const spacer = ws.addRow([])
  spacer.height = 6

  const headerRow = ws.addRow(columns.map((column) => column.label))
  headerRow.height = 22
  headerRow.eachCell((cell) => {
    applyHeaderStyle(cell, 'D9D9D9', {
      horizontal: 'center',
      borderStyle: 'thin',
      wrapText: true,
    })
  })

  const totals = {
    c_vm: 0,
    c_fl: 0,
    total: 0,
    chabi: 0,
    cocup: 0,
    clibr: 0,
    ctran: 0,
    cinah: 0,
  }

  const groupSums = {
    c_vm: 0,
    c_fl: 0,
    total: 0,
    chabi: 0,
    cocup: 0,
    clibr: 0,
    ctran: 0,
    cinah: 0,
  }

  const addToSums = (target, row) => {
    target.c_vm += toFiniteNumber(row.c_vm)
    target.c_fl += toFiniteNumber(row.c_fl)
    target.total += toFiniteNumber(row.total)
    target.chabi += toFiniteNumber(row.chabi)
    target.cocup += toFiniteNumber(row.cocup)
    target.clibr += toFiniteNumber(row.clibr)
    target.ctran += toFiniteNumber(row.ctran)
    target.cinah += toFiniteNumber(row.cinah)
  }

  const resetGroupSums = () => {
    groupSums.c_vm = 0
    groupSums.c_fl = 0
    groupSums.total = 0
    groupSums.chabi = 0
    groupSums.cocup = 0
    groupSums.clibr = 0
    groupSums.ctran = 0
    groupSums.cinah = 0
  }

  const styleSubtotalRow = ({ rowNumber, labelFill = 'E0E0E0' }) => {
    ws.mergeCells(rowNumber, 1, rowNumber, 3)
    forEachCellInRange(ws, rowNumber, 1, rowNumber, 3, (cell) => {
      applyDataStyle(cell, { horizontal: 'right', borderStyle: 'thin' })
      cell.font = HEADER_FONT
      cell.fill = argbFill(labelFill)
    })

    for (let col = 4; col <= 11; col++) {
      const cell = ws.getCell(rowNumber, col)
      applyDataStyle(cell, { horizontal: 'center', borderStyle: 'thin' })
      cell.font = HEADER_FONT
      cell.fill = argbFill('E0E0E0')
    }

    const lastCell = ws.getCell(rowNumber, 12)
    applyDataStyle(lastCell, { horizontal: 'center', borderStyle: 'thin' })
    lastCell.fill = argbFill('E0E0E0')
  }

  const appendSubtotalRow = ({ label = 'Sub Total', labelFill = 'E0E0E0' } = {}) => {
    const subtotalRow = ws.addRow([
      label,
      '',
      '',
      groupSums.c_vm,
      groupSums.c_fl,
      groupSums.total,
      groupSums.chabi,
      groupSums.cocup,
      groupSums.clibr,
      groupSums.ctran,
      groupSums.cinah,
      '',
    ])
    subtotalRow.height = 18
    styleSubtotalRow({ rowNumber: subtotalRow.number, labelFill })
    return subtotalRow
  }

  let previousFloor = 'Emergencia 1er Piso'
  let previousService = ''

  rows.forEach((rawRow, index) => {
    const row = {
      piso: rawRow?.piso ?? '',
      servicio: rawRow?.servicio ?? '',
      tipo: rawRow?.tipo ?? '',
      c_vm: toFiniteNumber(rawRow?.c_vm),
      c_fl: toFiniteNumber(rawRow?.c_fl),
      total: toFiniteNumber(rawRow?.total),
      chabi: toFiniteNumber(rawRow?.chabi),
      cocup: toFiniteNumber(rawRow?.cocup),
      clibr: toFiniteNumber(rawRow?.clibr),
      ctran: toFiniteNumber(rawRow?.ctran),
      cinah: toFiniteNumber(rawRow?.cinah),
      fecha: rawRow?.fecha ?? '',
    }

    const floorChanged = previousFloor !== row.piso
    if (floorChanged) {
      appendSubtotalRow()
      resetGroupSums()
    }

    const showFloor = floorChanged || index === 0 ? row.piso : ''
    const showService = row.servicio === previousService ? '' : row.servicio

    const parsedDate = parseExcelDateValue(row.fecha)
    const detailRow = ws.addRow([
      showFloor,
      showService,
      row.tipo,
      row.c_vm,
      row.c_fl,
      row.total,
      row.chabi,
      row.cocup,
      row.clibr,
      row.ctran,
      row.cinah,
      parsedDate ?? row.fecha,
    ])
    detailRow.height = 18

    columns.forEach((column, colIndex) => {
      const cell = detailRow.getCell(colIndex + 1)
      applyDataStyle(cell, {
        horizontal: column.align,
        borderStyle: 'thin',
      })
    })

    if (showService !== '') {
      detailRow.getCell(2).fill = argbFill('F7F7F7')
    }

    detailRow.getCell(4).fill = argbFill('B8E6FC')
    detailRow.getCell(5).fill = argbFill('B8E6FC')
    detailRow.getCell(8).fill = argbFill('F3D979')
    detailRow.getCell(9).fill = argbFill('BFFCB3')

    if (parsedDate) {
      detailRow.getCell(12).numFmt = 'yyyy-mm-dd hh:mm'
    }

    previousService = row.servicio
    previousFloor = row.piso

    addToSums(groupSums, row)
    addToSums(totals, row)

    if (index === rows.length - 1) {
      appendSubtotalRow({ label: 'Sub Total', labelFill: 'F0F1F1' })
      resetGroupSums()
    }
  })

  const totalRow = ws.addRow([
    'Total General',
    '',
    '',
    totals.c_vm,
    totals.c_fl,
    totals.total,
    totals.chabi,
    totals.cocup,
    totals.clibr,
    totals.ctran,
    totals.cinah,
    '',
  ])
  totalRow.height = 20
  ws.mergeCells(totalRow.number, 1, totalRow.number, 3)
  forEachCellInRange(ws, totalRow.number, 1, totalRow.number, 12, (cell) => {
    applyDataStyle(cell, { horizontal: 'center', borderStyle: 'thin' })
    cell.fill = argbFill('D7D7D7')
    cell.font = HEADER_FONT
  })
  const totalLabelCell = ws.getCell(totalRow.number, 1)
  totalLabelCell.value = 'Total General'
  totalLabelCell.alignment = { vertical: 'middle', horizontal: 'right', wrapText: true }

  return wb.xlsx.writeBuffer()
}

// ---------------------------------------------------------------------------
// E. Monitoreo de camas workbook - resumen operativo (.xlsx real)
// ---------------------------------------------------------------------------
//
// Layout:
//   Rows 1-3 : metadata del reporte
//   Row  4   : separador
//   Row  5   : encabezado agrupado por bloques
//   Row  6   : sub-encabezado de columnas
//   Row  7+  : detalle + subtotales por piso + total general
// ---------------------------------------------------------------------------

function semaforoPorcentajeFill(pct) {
  const value = clamp(toFiniteNumber(pct), 0, 100)
  if (value <= 60) return argbFill('9DDE58')
  if (value <= 80) return argbFill('F6F871')
  if (value <= 90) return argbFill('F2B66D')
  return argbFill('FB6C5D')
}

function semaforoPresionFill(value) {
  const amount = toFiniteNumber(value)
  if (amount <= 0) return null
  if (amount <= 2) return argbFill('F6F3A2')
  if (amount <= 5) return argbFill('F2C27A')
  return argbFill('F4A6A6')
}

function semaforoDisponiblesFill(disponibles, total) {
  const totalSeguro = toFiniteNumber(total)
  const disponiblesSeguro = toFiniteNumber(disponibles)

  if (totalSeguro <= 0) return argbFill('F8FAFC')
  if (disponiblesSeguro <= 0) return argbFill('F4A6A6')

  const ratio = disponiblesSeguro / totalSeguro
  if (ratio <= 0.15) return argbFill('F2C27A')
  if (ratio <= 0.3) return argbFill('F6F3A2')
  return argbFill('BFFCB3')
}

function semaforoInhabilitadasFill(inhabilitadas, total) {
  const totalSeguro = toFiniteNumber(total)
  const inhabilitadasSeguro = toFiniteNumber(inhabilitadas)

  if (inhabilitadasSeguro <= 0) return null
  const ratio = totalSeguro > 0 ? inhabilitadasSeguro / totalSeguro : 1
  if (ratio <= 0.1) return argbFill('F6F3A2')
  if (ratio <= 0.25) return argbFill('F2C27A')
  return argbFill('F4A6A6')
}

function makeMonitoreoCamasSummary(values) {
  const camas = toFiniteNumber(values.camas)
  const tocupa = toFiniteNumber(values.tocupa)
  const ocupacionBase = Math.min(tocupa, camas)
  const afPctDisplay = resolveAfPercentDisplay(values.c_fl, values.afopera, values.totalaf)

  return {
    camas,
    demanda: toFiniteNumber(values.demanda),
    pctOcupacion: Math.round(clamp(safePercentValue(ocupacionBase, camas), 0, 100)),
    total: toFiniteNumber(values.total),
    chabi: toFiniteNumber(values.chabi),
    cocup: toFiniteNumber(values.cocup),
    clibr: toFiniteNumber(values.clibr),
    ctran: toFiniteNumber(values.ctran),
    cinah: toFiniteNumber(values.cinah),
    pcr: toFiniteNumber(values.pcr),
    espera: toFiniteNumber(values.espera),
    espera_ant: toFiniteNumber(values.espera_ant),
    espera_mol: toFiniteNumber(values.espera_mol),
    c_vm: toFiniteNumber(values.c_vm),
    totalvm: toFiniteNumber(values.totalvm),
    vmopera: toFiniteNumber(values.vmopera),
    vminopera: toFiniteNumber(values.vminopera),
    pctVm: Math.round(clamp(safePercentValue(values.c_vm, values.vmopera), 0, 100)),
    c_fl: toFiniteNumber(values.c_fl),
    totalaf: toFiniteNumber(values.totalaf),
    afopera: toFiniteNumber(values.afopera),
    afinopera: toFiniteNumber(values.afinopera),
    pctAf:
      typeof afPctDisplay === 'number'
        ? afPctDisplay
        : Math.round(clamp(safePercentValue(values.c_fl, values.afopera), 0, 100)),
    pctAfDisplay: afPctDisplay,
    monitor_total: toFiniteNumber(values.monitor_total),
    monitor_operativos: toFiniteNumber(values.monitor_operativos),
    monitor_inoperativos: toFiniteNumber(values.monitor_inoperativos),
  }
}

function safePercentValue(numerator, denominator) {
  const safeNumerator = toFiniteNumber(numerator)
  const safeDenominator = toFiniteNumber(denominator)
  if (safeDenominator <= 0) {
    return 0
  }
  return (safeNumerator / safeDenominator) * 100
}

function resolveAfPercentDisplay(enUso, operativas, total) {
  const operativasSeguras = toFiniteNumber(operativas)
  const totalSeguro = toFiniteNumber(total)
  if (operativasSeguras <= 0 && totalSeguro <= 0) {
    return '—'
  }
  if (operativasSeguras <= 0) {
    return '—'
  }
  return Math.round(clamp(safePercentValue(enUso, operativasSeguras), 0, 100))
}

function applyTopBorder(ws, rowNumber, totalCols, style = 'medium') {
  for (let col = 1; col <= totalCols; col++) {
    const cell = ws.getCell(rowNumber, col)
    const current = cell.border ?? {}
    cell.border = {
      ...current,
      top: { style },
      left: current.left ?? { style: 'thin' },
      right: current.right ?? { style: 'thin' },
      bottom: current.bottom ?? { style: 'thin' },
    }
  }
}

export async function buildMonitoreoCamasWorkbook({ title, sheetName, generatedAt, rows = [] }) {
  const wb = new ExcelJS.Workbook()
  wb.creator = 'Reporteador-2.0'

  const ws = wb.addWorksheet(getSheetNameFromFileName(sheetName || 'Resumen de Camas'))

  const columns = [
    { key: 'piso', label: 'Piso', width: 18, align: 'left' },
    { key: 'servicio', label: 'Servicio', width: 40, align: 'left' },
    { key: 'tipo', label: 'Tipo', width: 18, align: 'left' },
    { key: 'camas_aprobadas', label: 'Camas aprobadas', width: 13, align: 'center' },
    { key: 'demanda_adicional', label: 'Demanda adicional', width: 13, align: 'center' },
    { key: 'pct_ocupacion', label: '% ocupación', width: 11, align: 'center' },
    { key: 'camas_totales', label: 'Camas totales', width: 11, align: 'center' },
    { key: 'camas_operativas', label: 'Camas operativas', width: 12, align: 'center' },
    { key: 'camas_ocupadas', label: 'Camas ocupadas', width: 11, align: 'center' },
    { key: 'camas_disponibles', label: 'Camas disponibles', width: 12, align: 'center' },
    { key: 'camas_transitorias', label: 'Camas transitorias', width: 12, align: 'center' },
    { key: 'camas_inhabilitadas', label: 'Camas inhabilitadas', width: 12, align: 'center' },
    { key: 'pacientes_pos', label: 'Pacientes (+)', width: 11, align: 'center' },
    { key: 'espera_resultado', label: 'Espera resultado', width: 12, align: 'center' },
    { key: 'espera_antigena', label: 'Antígena', width: 10, align: 'center' },
    { key: 'espera_molecular', label: 'Molecular', width: 10, align: 'center' },
    { key: 'vm_en_uso', label: 'VM en uso', width: 10, align: 'center' },
    { key: 'vm_total', label: 'VM total', width: 10, align: 'center' },
    { key: 'vm_operativas', label: 'VM operativas', width: 11, align: 'center' },
    { key: 'vm_inoperativas', label: 'VM inoperativas', width: 12, align: 'center' },
    { key: 'vm_pct', label: '% uso VM', width: 10, align: 'center' },
    { key: 'af_en_uso', label: 'AF en uso', width: 10, align: 'center' },
    { key: 'af_total', label: 'AF total', width: 10, align: 'center' },
    { key: 'af_operativos', label: 'AF operativos', width: 11, align: 'center' },
    { key: 'af_inoperativos', label: 'AF inoperativos', width: 12, align: 'center' },
    { key: 'af_pct', label: '% uso AF', width: 10, align: 'center' },
    { key: 'mon_total', label: 'Total', width: 10, align: 'center' },
    { key: 'mon_operativos', label: 'Operativos', width: 11, align: 'center' },
    { key: 'mon_inoperativos', label: 'Inoperativos', width: 11, align: 'center' },
  ]

  const totalCols = columns.length
  ws.columns = columns.map((column) => ({ width: column.width }))

  const reportDate = generatedAt instanceof Date ? generatedAt : new Date(generatedAt ?? Date.now())
  const reportDateTime = isValidDateValue(reportDate) ? formatDateTime(reportDate) : formatDateTime()

  const metadata = [
    ['Fecha y Hora de Reporte', reportDateTime],
    ['Tipo de reporte', 'Resumen de Camas'],
    ['Módulo', 'Gestión de Camas / Monitoreo de Camas'],
  ]

  metadata.forEach(([label, value], index) => {
    const row = index + 1
    mergeCellsAndStyle(ws, row, 1, row, 3, {
      value: label,
      fill: argbFill('E7F5FE'),
      font: HEADER_FONT,
      border: THIN_BORDER,
      alignment: { horizontal: 'left', vertical: 'middle', wrapText: true },
    })
    mergeCellsAndStyle(ws, row, 4, row, totalCols, {
      value: String(value ?? ''),
      font: { bold: true, size: 10 },
      border: THIN_BORDER,
      alignment: { horizontal: 'left', vertical: 'middle', wrapText: true },
    })
    ws.getRow(row).height = 18
  })

  const spacerRow = metadata.length + 1
  ws.getRow(spacerRow).height = 6

  const GROUP_ROW = spacerRow + 1
  const SUBHEADER_ROW = GROUP_ROW + 1
  const DATA_START = SUBHEADER_ROW + 1

  const groupedHeaders = [
    { title: 'Ubicación', start: 1, end: 3 },
    { title: 'Escenario / Capacidad', start: 4, end: 6 },
    { title: 'Camas según condición', start: 7, end: 12 },
    { title: 'Resultado Espera', start: 13, end: 16 },
    { title: 'Ventilación Mecánica', start: 17, end: 21 },
    { title: 'Oxígeno Alto Flujo', start: 22, end: 26 },
    { title: 'Monitores', start: 27, end: 29 },
  ]

  ws.getRow(GROUP_ROW).height = 22
  groupedHeaders.forEach((group) => {
    mergeCellsAndStyle(ws, GROUP_ROW, group.start, GROUP_ROW, group.end, {
      value: group.title,
      fill: argbFill('005F8F'),
      font: { bold: true, size: 10, color: { argb: 'FFFFFFFF' } },
      border: THIN_BORDER,
      alignment: { horizontal: 'center', vertical: 'middle', wrapText: true },
    })
  })

  const headerRow = ws.getRow(SUBHEADER_ROW)
  headerRow.height = 20
  columns.forEach((column, index) => {
    const cell = ws.getCell(SUBHEADER_ROW, index + 1)
    cell.value = column.label
    applyHeaderStyle(cell, '2C6E99', {
      horizontal: 'center',
      wrapText: true,
      fontColor: 'FFFFFF',
    })
  })

  applyFreezePane(ws, SUBHEADER_ROW)
  ws.autoFilter = {
    from: { row: SUBHEADER_ROW, column: 1 },
    to: { row: SUBHEADER_ROW, column: totalCols },
  }

  const safeRows = Array.isArray(rows) ? rows : []
  if (safeRows.length === 0) {
    mergeCellsAndStyle(ws, DATA_START, 1, DATA_START, totalCols, {
      value: 'No se encontraron registros para los filtros solicitados.',
      font: DATA_FONT,
      border: THIN_BORDER,
      alignment: { horizontal: 'center', vertical: 'middle', wrapText: true },
    })
    ws.getRow(DATA_START).height = 18
    return wb.xlsx.writeBuffer()
  }

  safeRows.forEach((item) => {
    if (item.kind === 'data') {
      const metrics = item.metrics ?? {}
      const detail = item.detail ?? {}
      const isFirstServiceRow = Boolean(item.isFirstOfService)

      const valuesByKey = {
        piso: String(item.piso ?? ''),
        servicio: String(item.servicio ?? ''),
        tipo: String(item.tipo ?? ''),
        camas_aprobadas: toFiniteNumber(metrics.camas),
        demanda_adicional: toFiniteNumber(metrics.demanda),
        pct_ocupacion: Math.round(toFiniteNumber(metrics.porcentaje)),
        camas_totales: toFiniteNumber(detail.camasTotales),
        camas_operativas: toFiniteNumber(detail.camasOperativas),
        camas_ocupadas: toFiniteNumber(detail.camasOcupadas),
        camas_disponibles: toFiniteNumber(detail.camasDisponibles),
        camas_transitorias: toFiniteNumber(detail.camasTransitorias),
        camas_inhabilitadas: toFiniteNumber(detail.camasInhabilitadas),
        pacientes_pos: toFiniteNumber(detail.pacientesPositivos),
        espera_resultado: toFiniteNumber(detail.esperaResultado),
        espera_antigena: toFiniteNumber(detail.esperaAntigena),
        espera_molecular: toFiniteNumber(detail.esperaMolecular),
        vm_en_uso: toFiniteNumber(metrics.c_vm),
        vm_total: toFiniteNumber(metrics.totalvm),
        vm_operativas: toFiniteNumber(metrics.vmopera),
        vm_inoperativas: toFiniteNumber(metrics.vminopera),
        vm_pct: Math.round(toFiniteNumber(metrics.vmPct)),
        af_en_uso: toFiniteNumber(metrics.c_fl),
        af_total: toFiniteNumber(metrics.totalaf),
        af_operativos: toFiniteNumber(metrics.afopera),
        af_inoperativos: toFiniteNumber(metrics.afinopera),
        af_pct: resolveAfPercentDisplay(metrics.c_fl, metrics.afopera, metrics.totalaf),
        mon_total: toFiniteNumber(metrics.monitor_total),
        mon_operativos: toFiniteNumber(metrics.monitor_operativos),
        mon_inoperativos: toFiniteNumber(metrics.monitor_inoperativos),
      }

      const dataRow = ws.addRow(columns.map((column) => valuesByKey[column.key]))
      dataRow.height = 17

      columns.forEach((column, idx) => {
        const cell = dataRow.getCell(idx + 1)
        applyDataStyle(cell, { horizontal: column.align, borderStyle: 'thin' })
      })

      const tipoCell = dataRow.getCell(3)
      tipoCell.alignment = { vertical: 'middle', horizontal: 'left', indent: 1, wrapText: true }

      if (isFirstServiceRow) {
        const servicioCell = dataRow.getCell(2)
        servicioCell.font = { ...HEADER_FONT, color: { argb: 'FF123B63' } }
        servicioCell.fill = argbFill('F3F7FC')
        applyTopBorder(ws, dataRow.number, totalCols, 'medium')
      }

      const pctOcupCell = dataRow.getCell(6)
      pctOcupCell.fill = semaforoPorcentajeFill(valuesByKey.pct_ocupacion)

      const demandaCell = dataRow.getCell(5)
      const demandaFill = semaforoPresionFill(valuesByKey.demanda_adicional)
      if (demandaFill) {
        demandaCell.fill = demandaFill
        demandaCell.font = { ...HEADER_FONT, color: { argb: 'FF8A3D00' } }
      }

      const vmPctCell = dataRow.getCell(21)
      if (toFiniteNumber(metrics.vmopera) > 0) {
        vmPctCell.fill = semaforoPorcentajeFill(valuesByKey.vm_pct)
      }

      const afPctCell = dataRow.getCell(26)
      if (typeof valuesByKey.af_pct === 'number') {
        afPctCell.fill = semaforoPorcentajeFill(valuesByKey.af_pct)
      }

      const afInactive =
        toFiniteNumber(metrics.c_fl) === 0 &&
        toFiniteNumber(metrics.totalaf) === 0 &&
        toFiniteNumber(metrics.afopera) === 0 &&
        toFiniteNumber(metrics.afinopera) === 0

      if (afInactive) {
        for (let col = 22; col <= 26; col++) {
          const cell = dataRow.getCell(col)
          cell.fill = argbFill('F8FAFC')
          cell.font = { ...DATA_FONT, color: { argb: 'FF94A3B8' } }
        }
      }

      const disponiblesCell = dataRow.getCell(10)
      disponiblesCell.fill = semaforoDisponiblesFill(valuesByKey.camas_disponibles, valuesByKey.camas_totales)

      const inhabilitadasCell = dataRow.getCell(12)
      const inhabilitadasFill = semaforoInhabilitadasFill(valuesByKey.camas_inhabilitadas, valuesByKey.camas_totales)
      if (inhabilitadasFill) {
        inhabilitadasCell.fill = inhabilitadasFill
      }

      const antigenaCell = dataRow.getCell(15)
      const antigenaFill = semaforoPresionFill(valuesByKey.espera_antigena)
      if (antigenaFill) {
        antigenaCell.fill = antigenaFill
      }

      const molecularCell = dataRow.getCell(16)
      const molecularFill = semaforoPresionFill(valuesByKey.espera_molecular)
      if (molecularFill) {
        molecularCell.fill = molecularFill
      }

      return
    }

    if (item.kind === 'subtotal') {
      const sums = makeMonitoreoCamasSummary(item.sums ?? {})
      const subtotalRow = ws.addRow([
        `Sub Total ${String(item.piso ?? '').trim()}`,
        '',
        '',
        sums.camas,
        sums.demanda,
        sums.pctOcupacion,
        sums.total,
        sums.chabi,
        sums.cocup,
        sums.clibr,
        sums.ctran,
        sums.cinah,
        sums.pcr,
        sums.espera,
        sums.espera_ant,
        sums.espera_mol,
        sums.c_vm,
        sums.totalvm,
        sums.vmopera,
        sums.vminopera,
        sums.pctVm,
        sums.c_fl,
        sums.totalaf,
        sums.afopera,
        sums.afinopera,
        sums.pctAfDisplay,
        sums.monitor_total,
        sums.monitor_operativos,
        sums.monitor_inoperativos,
      ])

      subtotalRow.height = 19
      ws.mergeCells(subtotalRow.number, 1, subtotalRow.number, 3)
      forEachCellInRange(ws, subtotalRow.number, 1, subtotalRow.number, totalCols, (cell, _row, col) => {
        applyDataStyle(cell, { horizontal: col === 1 ? 'left' : 'center', borderStyle: 'thin' })
        cell.fill = argbFill('E8EEF5')
        cell.font = HEADER_FONT
      })
      applyTopBorder(ws, subtotalRow.number, totalCols, 'medium')
      return
    }

    if (item.kind === 'total') {
      const sums = makeMonitoreoCamasSummary(item.sums ?? {})
      const totalRow = ws.addRow([
        'Total General',
        '',
        '',
        sums.camas,
        sums.demanda,
        sums.pctOcupacion,
        sums.total,
        sums.chabi,
        sums.cocup,
        sums.clibr,
        sums.ctran,
        sums.cinah,
        sums.pcr,
        sums.espera,
        sums.espera_ant,
        sums.espera_mol,
        sums.c_vm,
        sums.totalvm,
        sums.vmopera,
        sums.vminopera,
        sums.pctVm,
        sums.c_fl,
        sums.totalaf,
        sums.afopera,
        sums.afinopera,
        sums.pctAfDisplay,
        sums.monitor_total,
        sums.monitor_operativos,
        sums.monitor_inoperativos,
      ])

      totalRow.height = 22
      ws.mergeCells(totalRow.number, 1, totalRow.number, 3)
      forEachCellInRange(ws, totalRow.number, 1, totalRow.number, totalCols, (cell, _row, col) => {
        applyDataStyle(cell, { horizontal: col === 1 ? 'left' : 'center', borderStyle: 'thin' })
        cell.fill = argbFill('D6E4F1')
        cell.font = { bold: true, size: 11, color: { argb: 'FF123B63' } }
      })
      applyTopBorder(ws, totalRow.number, totalCols, 'thick')
    }
  })

  return wb.xlsx.writeBuffer()
}

// ---------------------------------------------------------------------------
// F. Monitoreo de camas SUSALUD workbook - resumen por bloques
// ---------------------------------------------------------------------------

function addSusaludBlock(ws, {
  startRow,
  totalCols,
  title,
  columns,
  rows,
  includeTotal = true,
  theme = {},
  addSpacerAfter = true,
}) {
  const resolvedTheme = {
    titleFill: 'D7EDF7',
    titleFontColor: 'FF123B63',
    headerFill: '96FCF3',
    headerFontColor: 'FF123B63',
    categoryFill: 'DFF4FB',
    categoryFontColor: 'FF123B63',
    totalFill: 'EAF1F6',
    exceptionFill: 'F9C8C4',
    rowTitleHeight: 13.2,
    rowHeaderHeight: 13.2,
    rowDataHeight: 13,
    rowTotalHeight: 13.2,
    ...theme,
  }

  const normalize = (value) =>
    String(value ?? '')
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .toUpperCase()
      .trim()

  mergeCellsAndStyle(ws, startRow, 1, startRow, totalCols, {
    value: title,
    fill: argbFill(resolvedTheme.titleFill),
    font: { bold: true, size: 9, color: { argb: resolvedTheme.titleFontColor } },
    border: THIN_BORDER,
    alignment: { horizontal: 'left', vertical: 'middle', wrapText: true },
  })
  ws.getRow(startRow).height = resolvedTheme.rowTitleHeight

  const headerRowNumber = startRow + 1
  const headerRow = ws.getRow(headerRowNumber)
  headerRow.height = resolvedTheme.rowHeaderHeight
  columns.forEach((column, index) => {
    const cell = ws.getCell(headerRowNumber, index + 1)
    cell.value = column.label
    applyHeaderStyle(cell, resolvedTheme.headerFill, {
      horizontal: 'center',
      wrapText: true,
      fontColor: resolvedTheme.headerFontColor.replace(/^FF/, ''),
    })
  })

  let currentRow = headerRowNumber + 1
  const safeRows = Array.isArray(rows) ? rows : []

  if (safeRows.length === 0) {
    mergeCellsAndStyle(ws, currentRow, 1, currentRow, columns.length, {
      value: 'Sin registros',
      font: DATA_FONT,
      border: THIN_BORDER,
      alignment: { horizontal: 'center', vertical: 'middle', wrapText: true },
    })
    ws.getRow(currentRow).height = resolvedTheme.rowDataHeight
    currentRow += 1
  } else {
    for (const item of safeRows) {
      const row = ws.getRow(currentRow)
      row.height = resolvedTheme.rowDataHeight

      const isException =
        normalize(item[columns[0]?.key]).includes('NO SUSALUD') ||
        normalize(item[columns[1]?.key]).includes('NO SUSALUD')

      columns.forEach((column, index) => {
        const cell = ws.getCell(currentRow, index + 1)
        cell.value = item[column.key] ?? ''
        applyDataStyle(cell, { horizontal: column.align ?? 'center', wrapText: Boolean(column.wrapText) })
        if (index === 0) {
          cell.fill = argbFill(resolvedTheme.categoryFill)
          cell.font = { ...DATA_FONT, bold: true, color: { argb: resolvedTheme.categoryFontColor } }
        }
      })

      if (isException) {
        const exceptionLabelCell = ws.getCell(currentRow, 1)
        exceptionLabelCell.fill = argbFill(resolvedTheme.exceptionFill)
        exceptionLabelCell.font = { ...DATA_FONT, bold: true, color: { argb: 'FF7A2F2A' } }
        if (columns.length > 1) {
          const exceptionAreaCell = ws.getCell(currentRow, 2)
          exceptionAreaCell.fill = argbFill(resolvedTheme.exceptionFill)
          exceptionAreaCell.font = { ...DATA_FONT, color: { argb: 'FF7A2F2A' } }
        }
      }

      currentRow += 1
    }

    if (includeTotal) {
      const totalRowNumber = currentRow
      const totalRow = ws.getRow(totalRowNumber)
      totalRow.height = resolvedTheme.rowTotalHeight

      columns.forEach((column, index) => {
        const cell = ws.getCell(totalRowNumber, index + 1)
        if (index === 0) {
          cell.value = 'Total bloque'
          applyDataStyle(cell, { horizontal: 'left' })
        } else if (column.numeric) {
          const total = safeRows.reduce((sum, item) => sum + (Number(item[column.key]) || 0), 0)
          cell.value = total
          applyDataStyle(cell, { horizontal: 'center' })
        } else {
          cell.value = ''
          applyDataStyle(cell, { horizontal: 'center' })
        }
        cell.fill = argbFill(resolvedTheme.totalFill)
        cell.font = HEADER_FONT
      })
      applyTopBorder(ws, totalRowNumber, columns.length, 'medium')
      currentRow += 1
    }
  }

  if (addSpacerAfter) {
    ws.getRow(currentRow).height = 7
    return currentRow + 1
  }

  return currentRow
}

export async function buildMonitoreoCamasSusaludWorkbook({
  title,
  sheetName,
  generatedAt,
  uciRows = [],
  ucinRows = [],
  hospitalizacionRows = [],
  emergenciaRows = [],
  emergenciaAmpliadaRows = [],
  ventiladoresMonitores = [],
  dengueSections = [],
  auditRows = [],
  includeAuditSheet = true,
}) {
  const wb = new ExcelJS.Workbook()
  wb.creator = 'Reporteador-2.0'

  const ws = wb.addWorksheet(getSheetNameFromFileName(sheetName || title || 'Resumen SUSALUD'))
  const totalCols = 11
  ws.columns = [
    { width: 32 }, // categoria
    { width: 56 }, // areas
    { width: 12 },
    { width: 12 },
    { width: 12 },
    { width: 12 },
    { width: 12 },
    { width: 12 },
    { width: 12 },
    { width: 12 },
    { width: 12 },
  ]

  const reportDate = generatedAt instanceof Date ? generatedAt : new Date(generatedAt ?? Date.now())
  const reportDateTime = isValidDateValue(reportDate) ? formatDateTime(reportDate) : formatDateTime()

  const metadata = [
    ['Fecha y Hora de Reporte', reportDateTime],
    ['Tipo de reporte', 'Resumen de Camas SUSALUD'],
    ['Modulo', 'Gestion de Camas / Exportable SUSALUD'],
  ]

  metadata.forEach(([label, value], index) => {
    const row = index + 1
    mergeCellsAndStyle(ws, row, 1, row, 2, {
      value: label,
      fill: argbFill('E7F5FE'),
      font: HEADER_FONT,
      border: THIN_BORDER,
      alignment: { horizontal: 'left', vertical: 'middle', wrapText: true },
    })
    mergeCellsAndStyle(ws, row, 3, row, totalCols, {
      value: String(value ?? ''),
      font: { bold: true, size: 10 },
      border: THIN_BORDER,
      alignment: { horizontal: 'left', vertical: 'middle', wrapText: true },
    })
    ws.getRow(row).height = 13.2
  })

  ws.getRow(4).height = 7
  applyFreezePane(ws, 4)

  const standardTheme = {
    titleFill: 'D7EDF7',
    titleFontColor: 'FF123B63',
    headerFill: '96FCF3',
    headerFontColor: 'FF123B63',
    categoryFill: 'DFF4FB',
    categoryFontColor: 'FF123B63',
    totalFill: 'EAF1F6',
    exceptionFill: 'F9C8C4',
    rowTitleHeight: 13.2,
    rowHeaderHeight: 13.2,
    rowDataHeight: 13,
    rowTotalHeight: 13.2,
  }

  const dengueTheme = {
    titleFill: 'F7DB77',
    titleFontColor: 'FF7B5A00',
    headerFill: 'FFECA6',
    headerFontColor: 'FF6E5600',
    categoryFill: 'FFF4C9',
    categoryFontColor: 'FF6E5600',
    totalFill: 'FDEFB5',
    exceptionFill: 'F9C8C4',
    rowTitleHeight: 13.2,
    rowHeaderHeight: 13.2,
    rowDataHeight: 13,
    rowTotalHeight: 13.2,
  }

  let rowCursor = 5
  rowCursor = addSusaludBlock(ws, {
    startRow: rowCursor,
    totalCols,
    title: 'UCI',
    columns: [
      { key: 'upssUci', label: 'UPSS UCI', align: 'left' },
      { key: 'areas', label: 'ÁREAS QUE COMPONEN', align: 'left', wrapText: true },
      { key: 'total', label: 'TOTAL', numeric: true },
      { key: 'inoperativos', label: 'INOPERATIVOS', numeric: true },
      { key: 'operativos', label: 'OPERATIVOS', numeric: true },
      { key: 'libres', label: 'LIBRES', numeric: true },
      { key: 'ocupados', label: 'OCUPADOS', numeric: true },
      { key: 'sinVm', label: 'Sin VM', numeric: true },
      { key: 'conVm', label: 'Con VM', numeric: true },
      { key: 'reserva', label: 'RESERVA', numeric: true },
    ],
    rows: uciRows,
    theme: standardTheme,
  })

  rowCursor = addSusaludBlock(ws, {
    startRow: rowCursor,
    totalCols,
    title: 'UCIN',
    columns: [
      { key: 'upssUcin', label: 'UPSS UCIN', align: 'left' },
      { key: 'areas', label: 'ÁREAS QUE COMPONEN', align: 'left', wrapText: true },
      { key: 'total', label: 'TOTAL', numeric: true },
      { key: 'inoperativos', label: 'INOPERATIVOS', numeric: true },
      { key: 'operativos', label: 'OPERATIVOS', numeric: true },
      { key: 'libres', label: 'LIBRES', numeric: true },
      { key: 'ocupados', label: 'OCUPADOS', numeric: true },
      { key: 'sinOxigeno', label: 'S/OXIGENO', numeric: true },
      { key: 'conOxigeno', label: 'C/OXIGENO', numeric: true },
      { key: 'conVm', label: 'Con VM', numeric: true },
      { key: 'reserva', label: 'RESERVA', numeric: true },
    ],
    rows: ucinRows,
    theme: standardTheme,
  })

  rowCursor = addSusaludBlock(ws, {
    startRow: rowCursor,
    totalCols,
    title: 'Hospitalizacion',
    columns: [
      { key: 'upssHospitalizacion', label: 'UPSS Hospitalizacion', align: 'left' },
      { key: 'areas', label: 'ÁREAS QUE COMPONEN', align: 'left', wrapText: true },
      { key: 'total', label: 'TOTAL', numeric: true },
      { key: 'inoperativos', label: 'INOPERATIVOS', numeric: true },
      { key: 'operativos', label: 'OPERATIVOS', numeric: true },
      { key: 'libres', label: 'LIBRES', numeric: true },
      { key: 'ocupados', label: 'OCUPADOS', numeric: true },
      { key: 'sinOxigeno', label: 'S/OXIGENO', numeric: true },
      { key: 'conOxigeno', label: 'C/OXIGENO', numeric: true },
      { key: 'reserva', label: 'RESERVA', numeric: true },
    ],
    rows: hospitalizacionRows,
    theme: standardTheme,
  })

  rowCursor = addSusaludBlock(ws, {
    startRow: rowCursor,
    totalCols,
    title: 'Emergencia',
    columns: [
      { key: 'upssEmergencia', label: 'UPSS Emergencia', align: 'left' },
      { key: 'areas', label: 'ÁREAS QUE COMPONEN', align: 'left', wrapText: true },
      { key: 'total', label: 'TOTAL', numeric: true },
      { key: 'inoperativos', label: 'INOPERATIVOS', numeric: true },
      { key: 'operativos', label: 'OPERATIVOS', numeric: true },
      { key: 'libres', label: 'LIBRES', numeric: true },
      { key: 'ocupados', label: 'OCUPADOS', numeric: true },
      { key: 'sinOxigeno', label: 'S/OXIGENO', numeric: true },
      { key: 'conOxigeno', label: 'C/OXIGENO', numeric: true },
      { key: 'conVm', label: 'Con VM', numeric: true },
      { key: 'reserva', label: 'RESERVA', numeric: true },
    ],
    rows: emergenciaRows,
    theme: standardTheme,
  })

  rowCursor = addSusaludBlock(ws, {
    startRow: rowCursor,
    totalCols,
    title: 'ZONA DE EMERGENCIA AMPLIADA',
    columns: [
      { key: 'area', label: 'DETALLE', align: 'left', wrapText: true },
      { key: 'total', label: 'TOTAL', numeric: true },
      { key: 'conOxigeno', label: 'C/OXIGENO', numeric: true },
      { key: 'sinOxigeno', label: 'S/OXIGENO', numeric: true },
    ],
    rows: emergenciaAmpliadaRows,
    theme: standardTheme,
  })

  rowCursor = addSusaludBlock(ws, {
    startRow: rowCursor,
    totalCols,
    title: 'RESUMEN DE VENTILADORES Y MONITORES',
    columns: [
      { key: 'recurso', label: 'RECURSO', align: 'left' },
      { key: 'total', label: 'TOTAL', numeric: true },
      { key: 'inoperativos', label: 'INOPERATIVOS', numeric: true },
      { key: 'operativos', label: 'OPERATIVOS', numeric: true },
      { key: 'disponibles', label: 'DISPONIBLES', numeric: true },
      { key: 'enUso', label: 'EN USO', numeric: true },
    ],
    rows: ventiladoresMonitores,
    theme: standardTheme,
  })

  mergeCellsAndStyle(ws, rowCursor, 1, rowCursor, totalCols, {
    value: 'ZONA DENGUE',
    fill: argbFill(dengueTheme.titleFill),
    font: { bold: true, size: 9, color: { argb: dengueTheme.titleFontColor } },
    border: THIN_BORDER,
    alignment: { horizontal: 'left', vertical: 'middle', wrapText: true },
  })
  ws.getRow(rowCursor).height = 13.2
  rowCursor += 1

  const safeDengueSections = Array.isArray(dengueSections) ? dengueSections : []
  for (const section of safeDengueSections) {
    rowCursor = addSusaludBlock(ws, {
      startRow: rowCursor,
      totalCols,
      title: String(section.title ?? '').trim() || 'Subbloque',
      columns: [
        { key: 'categoria', label: 'CATEGORIA', align: 'left' },
        { key: 'casos', label: 'TOTAL', numeric: true },
      ],
      rows: section.rows ?? [],
      theme: dengueTheme,
    })
  }

  if (includeAuditSheet && Array.isArray(auditRows) && auditRows.length > 0) {
    const auditSheet = wb.addWorksheet('AUDIT_SUSALUD', { state: 'hidden' })
    const headers = [...new Set(auditRows.flatMap((row) => Object.keys(row ?? {})))]
    auditSheet.columns = headers.map((header) => ({
      header,
      key: header,
      width: Math.min(Math.max(header.length + 4, 12), 42),
    }))

    const headerRow = auditSheet.getRow(1)
    headerRow.height = 14
    headers.forEach((header, index) => {
      const cell = auditSheet.getCell(1, index + 1)
      cell.value = header
      applyHeaderStyle(cell, '96FCF3', { horizontal: 'center', wrapText: true, fontColor: '123B63' })
    })

    auditRows.forEach((item) => {
      const row = auditSheet.addRow(headers.map((header) => item[header] ?? ''))
      row.height = 13
      headers.forEach((_header, index) => {
        const cell = row.getCell(index + 1)
        applyDataStyle(cell, { horizontal: index === 0 ? 'left' : 'center', wrapText: true })
      })
    })
    auditSheet.autoFilter = {
      from: { row: 1, column: 1 },
      to: { row: 1, column: headers.length },
    }
  }

  return wb.xlsx.writeBuffer()
}

// ---------------------------------------------------------------------------
// G. Produccion Medicos workbook
// ---------------------------------------------------------------------------
//
// Layout:
//   Rows 1-4 : metadata (Desde / Hasta / Fecha y Hora / Tipo de reporte)
//   Row  5   : group headers (empty | DATOS DE ATENCION | DIAGNOSTICO-CPTS-RECETA | ATENCION CQX)
//   Row  6   : individual column headers (33 columns)
//   Row  7+  : data rows (nominal detail)
// ---------------------------------------------------------------------------

const PROD_MEDICOS_COLS = [
  { key: 'COD_ACT',            label: 'CODIGO',             width: 10  },
  { key: 'TIPO_ACTIVIDAD',     label: 'ACTIVIDAD',          width: 18  },
  { key: 'NOMBRE_PROFESIONAL', label: 'NOMBRE_PROFESIONAL', width: 26  },
  { key: 'DNI',                label: 'NRO DNI',            width: 12,  asText: true },
  { key: 'TIPO_EMPLEADO',      label: 'TIPO_EMPLEADO',      width: 16  },
  { key: 'SERVICIO_ACTIVIDAD', label: 'SERVICIO_ACTIVIDAD', width: 22  },
  { key: 'CUENTA',             label: 'N\u00b0_CUENTA',     width: 12  },
  { key: 'CANTIDAD',           label: 'CANTIDAD',           width: 10  },
  { key: 'FECHA',              label: 'FECHA_REGISTRO',     width: 14,  format: 'excel-date',     numFmt: 'dd/mm/yyyy' },
  { key: 'HORA',               label: 'HORA_REGISTRO',      width: 12,  format: 'excel-time',     numFmt: 'hh:mm' },
  { key: 'NOMBRE_PACIENTE',    label: 'NOMBRE_PACIENTE',    width: 32  },
  { key: 'NRO_DOCUMENTO',      label: 'NRO_DOCUMENTO',      width: 13,  asText: true },
  { key: 'NRO_HISTORIA',       label: 'NRO HISTORIA',       width: 13,  asText: true },
  { key: 'PRIORIDAD',          label: 'PRIORIDAD',          width: 11  },
  { key: 'TIPO_ATENCION_CE',   label: 'TIPO_ATENCION_CE',   width: 15  },
  { key: 'COD_DX1',            label: 'COD CIE 10',         width: 12  },
  { key: 'DESCRIPCION_DX1',    label: 'DIAGNOSTICO',        width: 30  },
  { key: 'CODIGO_CPT',         label: 'COD CMPS',           width: 12  },
  { key: 'DESCRIPCION_CPT',    label: 'DESCRIPCION CMPS',   width: 24  },
  { key: 'IDRECETA',           label: 'IDRECETA',           width: 12  },
  { key: 'PUNTO_CARGA',        label: 'PUNTO CARGA',        width: 14  },
  { key: 'FUNCION',            label: 'FUNCION',            width: 14  },
  { key: 'COMPLEJIDAD',        label: 'COMPLEJIDAD',        width: 13  },
  { key: 'FECHA_INI_CIRUGIA',  label: 'INICIO DE CIRUGIA', width: 18,  format: 'excel-datetime', numFmt: 'dd/mm/yyyy hh:mm' },
  { key: 'FECHA_FIN_CIRUGIA',  label: 'FIN DE CIRUGIA',    width: 18,  format: 'excel-datetime', numFmt: 'dd/mm/yyyy hh:mm' },
  { key: 'CODCPT1',            label: 'CODIGO CPT 1',       width: 13  },
  { key: 'DESCPT1',            label: 'DESCRIPCION CPT 1',  width: 22  },
  { key: 'CODCPT2',            label: 'CODIGO CPT 2',       width: 13  },
  { key: 'DESCPT2',            label: 'DESCRIPCION CPT 2',  width: 22  },
  { key: 'CODCPT3',            label: 'CODIGO CPT 3',       width: 13  },
  { key: 'DESCPT3',            label: 'DESCRIPCION CPT 3',  width: 22  },
  { key: 'CODCPT4',            label: 'CODIGO CPT 4',       width: 13  },
  { key: 'DESCPT4',            label: 'DESCRIPCION CPT 4',  width: 22  },
]

export async function buildProduccionMedicosWorkbook({ rows, startDate, endDate, title }) {
  const wb = new ExcelJS.Workbook()
  wb.creator = 'Reporteador-2.0'

  const ws = wb.addWorksheet(getSheetNameFromFileName(title || 'produccion-medicos'))

  const totalCols = PROD_MEDICOS_COLS.length // 33

  ws.columns = PROD_MEDICOS_COLS.map((c) => ({ width: c.width }))

  // Rows 1-4: metadata
  const metaItems = [
    ['Desde', startDate ?? ''],
    ['Hasta', endDate ?? ''],
    ['Fecha y Hora de Reporte', formatDateTime()],
    ['Tipo de reporte', 'Produccion de Medicos'],
  ]

  metaItems.forEach(([label, value], i) => {
    const rowNum = i + 1
    mergeCellsAndStyle(ws, rowNum, 1, rowNum, 2, {
      value: label,
      fill: META_LABEL_FILL,
      font: DATA_FONT,
      border: THIN_BORDER,
      alignment: { vertical: 'middle', horizontal: 'left', wrapText: true },
    })
    mergeCellsAndStyle(ws, rowNum, 3, rowNum, totalCols, {
      value: String(value ?? ''),
      font: { bold: true, size: 10 },
      border: THIN_BORDER,
      alignment: { vertical: 'middle', horizontal: 'left', wrapText: true },
    })
    ws.getRow(rowNum).height = 18
  })

  // Row 5: group header row
  const GRP_ROW = 5
  ws.getRow(GRP_ROW).height = 22

  // cols 1-2: empty gray placeholder
  mergeCellsAndStyle(ws, GRP_ROW, 1, GRP_ROW, 2, {
    fill: argbFill('E1E1E0'),
    border: THIN_BORDER,
    alignment: { vertical: 'middle', horizontal: 'center' },
  })
  // cols 3-15: DATOS DE ATENCION (13 cols)
  mergeCellsAndStyle(ws, GRP_ROW, 3, GRP_ROW, 15, {
    value: 'DATOS DE ATENCION',
    fill: argbFill('9BDEFA'),
    font: HEADER_FONT,
    border: THIN_BORDER,
    alignment: { vertical: 'middle', horizontal: 'center', wrapText: true },
  })
  // cols 16-21: DIAGNOSTICO - CPTS - RECETA (6 cols)
  mergeCellsAndStyle(ws, GRP_ROW, 16, GRP_ROW, 21, {
    value: 'DIAGNOSTICO - CPTS - RECETA',
    fill: argbFill('FEF593'),
    font: HEADER_FONT,
    border: THIN_BORDER,
    alignment: { vertical: 'middle', horizontal: 'center', wrapText: true },
  })
  // cols 22-33: ATENCION EN CENTRO QUIRURGICO (12 cols)
  mergeCellsAndStyle(ws, GRP_ROW, 22, GRP_ROW, 33, {
    value: 'ATENCION EN CENTRO QUIRURGICO',
    fill: argbFill('A0E7E6'),
    font: HEADER_FONT,
    border: THIN_BORDER,
    alignment: { vertical: 'middle', horizontal: 'center', wrapText: true },
  })

  // Row 6: individual column headers
  const HDR_ROW = 6
  ws.getRow(HDR_ROW).height = 20
  PROD_MEDICOS_COLS.forEach((c, i) => {
    const cell = ws.getCell(HDR_ROW, i + 1)
    cell.value = c.label
    applyHeaderStyle(cell, 'E1E1E0', { horizontal: 'center', wrapText: true })
  })

  // Freeze rows 1-6
  applyFreezePane(ws, 6)

  // Rows 7+: data
  const DATA_START = 7
  const sourceRows = Array.isArray(rows) ? rows : []

  if (sourceRows.length === 0) {
    mergeCellsAndStyle(ws, DATA_START, 1, DATA_START, totalCols, {
      value: 'No se encontraron registros para los filtros solicitados.',
      font: DATA_FONT,
      border: THIN_BORDER,
      alignment: { horizontal: 'center', vertical: 'middle', wrapText: true },
    })
    ws.getRow(DATA_START).height = 16
  } else {
    sourceRows.forEach((row, rowIdx) => {
      const excelRowNum = DATA_START + rowIdx
      ws.getRow(excelRowNum).height = 16

      PROD_MEDICOS_COLS.forEach((c, colIdx) => {
        const cell = ws.getCell(excelRowNum, colIdx + 1)
        const raw = col(row, c.key)

        if (c.asText) {
          cell.value = raw === '' || raw == null ? '' : String(raw)
          cell.numFmt = '@'
        } else if (c.format) {
          const payload = normalizeTabulatedCellPayload(raw, c)
          cell.value = payload.value
          if (payload.numFmt) cell.numFmt = payload.numFmt
        } else {
          cell.value = raw === '' || raw == null ? '' : raw
        }

        applyDataStyle(cell, { horizontal: resolveDataHorizontal(c.label, c.align) })
      })
    })
  }

  return wb.xlsx.writeBuffer()
}

export async function buildProduccionObstetrasWorkbook({ rows, startDate, endDate, title }) {
  const wb = new ExcelJS.Workbook()
  wb.creator = 'Reporteador-2.0'
  const ws = wb.addWorksheet(getSheetNameFromFileName(title || 'produccion-obstetras'))
  const sourceRows = Array.isArray(rows) ? rows : []
  const keys = [
    'COD_ACT', 'TIPO_ACTIVIDAD', 'CANTIDAD', 'NOMBRE_PROFESIONAL', 'DNI', 'TIPO_EMPLEADO',
    'SERVICIO_ACTIVIDAD', 'CUENTA', 'FECHA', 'HORA', 'NOMBRE_PACIENTE', 'NRO_DOCUMENTO',
    'NRO_HISTORIA', 'PRIORIDAD', 'TIPO_ATENCION_CE', 'COD_DX1', 'DESCRIPCION_DX1',
    'CODIGO_CPT', 'DESCRIPCION_CPT', 'IDRECETA', 'PUNTO_CARGA', 'FUNCION', 'COMPLEJIDAD',
    'FECHA_INI_CIRUGIA', 'FECHA_FIN_CIRUGIA', 'CODCPT1', 'DESCPT1', 'CODCPT2', 'DESCPT2',
    'CODCPT3', 'DESCPT3', 'CODCPT4', 'DESCPT4', 'FUENTE_FINANCIAMIENTO',
  ]

  const totalCols = Math.max(keys.length, 1)
  ws.mergeCells(1, 1, 1, totalCols)
  const titleCell = ws.getCell(1, 1)
  titleCell.value = 'DETALLE DE PRODUCCIÓN OBSTETRA'
  titleCell.font = { bold: true, size: 14 }
  titleCell.alignment = { horizontal: 'center', vertical: 'middle' }
  ws.getRow(1).height = 24

  ws.mergeCells(2, 1, 2, totalCols)
  ws.getCell(2, 1).value = `Desde: ${startDate} | Hasta: ${endDate} | Fecha y hora: ${formatDateTime()}`
  ws.getCell(2, 1).alignment = { horizontal: 'left', vertical: 'middle' }

  keys.forEach((key, index) => {
    const cell = ws.getCell(4, index + 1)
    cell.value = key
    applyHeaderStyle(cell, '123B63', { horizontal: 'center', wrapText: true, fontColor: 'FFFFFF' })
    ws.getColumn(index + 1).width = Math.min(Math.max(String(cell.value).length + 4, 14), 36)
  })

  sourceRows.forEach((row, rowIndex) => {
    keys.forEach((key, columnIndex) => {
      const cell = ws.getCell(rowIndex + 5, columnIndex + 1)
      const raw = col(row, key)
      const token = String(key).normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/[^a-zA-Z0-9]/g, '').toUpperCase()
      const asText = token.includes('DNI') || token.includes('DOCUMENTO') || token.includes('HISTORIA')
      cell.value = asText && raw !== '' && raw != null ? String(raw) : raw
      if (asText) cell.numFmt = '@'
      applyDataStyle(cell, { horizontal: asText ? 'left' : 'center', wrapText: true })
    })
  })

  ws.views = [{ state: 'frozen', ySplit: 4 }]
  if (keys.length > 0) {
    ws.autoFilter = { from: { row: 4, column: 1 }, to: { row: 4, column: keys.length } }
  }
  return wb.xlsx.writeBuffer()
}

// ---------------------------------------------------------------------------
// Re-export MIME type so callers do not hardcode the string
// ---------------------------------------------------------------------------
export { MIME_XLSX }
