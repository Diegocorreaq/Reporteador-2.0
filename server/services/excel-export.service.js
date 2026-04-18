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
  if (value === '{{reportDateTime}}') return reportDateTime
  return value ?? ''
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

function resolveColumnWidth({ header, samples = [], explicitWidth, fallback = 12 }) {
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

  if (isSessionIndexHeader(normalizedHeader)) {
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

  // H.C. spans both header rows
  mergeCellsAndStyle(ws, ROW_GRP, 1, ROW_SUB, 1, {
    value: 'H.C.',
    fill: argbFill('FA7985'),
    font: HEADER_FONT,
    border: THIN_BORDER,
    alignment: { vertical: 'middle', horizontal: 'center', wrapText: true },
  })

  // PACIENTE spans both header rows
  mergeCellsAndStyle(ws, ROW_GRP, 2, ROW_SUB, 2, {
    value: 'PACIENTE',
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
        samples: sampledRows.map((row) => col(row, key)),
        fallback: 9,
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
// Re-export MIME type so callers do not hardcode the string
// ---------------------------------------------------------------------------
export { MIME_XLSX }
