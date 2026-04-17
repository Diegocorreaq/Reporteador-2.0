/**
 * excel-export.service.js
 *
 * Pure presentation layer — builds real .xlsx workbooks via ExcelJS.
 * No SQL, no routing, no catalog knowledge.
 *
 * Exports:
 *   buildSimpleWorkbook({ title, rows })
 *     → flat table with styled header row; used for current/range/lavado catalogs
 *
 *   buildStructuredWorkbook({ config, rows, startDate, endDate, title })
 *     → metadata block + two-level grouped headers; used for salud-mental
 *       config shape matches MENTAL_HEALTH_TEMPLATE_CONFIG in legacy-export.service.js
 */

import ExcelJS from 'exceljs'

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const MIME_XLSX = 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'

const THIN_BORDER = {
  top:    { style: 'thin' },
  left:   { style: 'thin' },
  bottom: { style: 'thin' },
  right:  { style: 'thin' },
}

const HEADER_FONT     = { bold: true, size: 10 }
const DATA_FONT       = { size: 10 }
const META_LABEL_FILL = argbFill('E7F5FE')

// ---------------------------------------------------------------------------
// Style helpers
// ---------------------------------------------------------------------------

/** Converts a 6-char RGB hex string (with or without #) to ExcelJS ARGB fill */
function argbFill(hex) {
  return {
    type: 'pattern',
    pattern: 'solid',
    fgColor: { argb: 'FF' + hex.replace('#', '') },
  }
}

function applyBorder(cell) {
  cell.border = THIN_BORDER
}

function applyHeaderStyle(cell, colorHex, { horizontal = 'center', wrapText = true } = {}) {
  cell.fill      = argbFill(colorHex)
  cell.font      = HEADER_FONT
  cell.border    = THIN_BORDER
  cell.alignment = { vertical: 'middle', horizontal, wrapText }
}

function applyDataStyle(cell, { horizontal = 'left' } = {}) {
  cell.font      = DATA_FONT
  cell.border    = THIN_BORDER
  cell.alignment = { vertical: 'middle', horizontal }
}

// ---------------------------------------------------------------------------
// Shared tiny helpers (self-contained — no import from legacy-export)
// ---------------------------------------------------------------------------

/** PHP date("d/m/y H:i a") replica — e.g. 17/04/26 14:30 pm */
function formatDateTime(date = new Date()) {
  const dd   = String(date.getDate()).padStart(2, '0')
  const mm   = String(date.getMonth() + 1).padStart(2, '0')
  const yy   = String(date.getFullYear()).slice(2)
  const HH   = String(date.getHours()).padStart(2, '0')
  const ii   = String(date.getMinutes()).padStart(2, '0')
  const ampm = date.getHours() < 12 ? 'am' : 'pm'
  return `${dd}/${mm}/${yy} ${HH}:${ii} ${ampm}`
}

/**
 * Reads the first matching key from a row, trying exact → UPPER → lower.
 * Handles SP result sets regardless of column name casing.
 */
function col(row, ...keys) {
  for (const k of keys) {
    if (Object.prototype.hasOwnProperty.call(row, k))           return row[k]
    if (Object.prototype.hasOwnProperty.call(row, k.toUpperCase())) return row[k.toUpperCase()]
    if (Object.prototype.hasOwnProperty.call(row, k.toLowerCase())) return row[k.toLowerCase()]
  }
  return ''
}

/** Clamp a number between min and max */
function clamp(value, min, max) {
  return Math.min(Math.max(value, min), max)
}

/** Sanitize a string to be a valid Excel sheet name (≤ 31 chars, no extension, no special chars) */
function safeSheetName(name) {
  return name
    .replace(/\.xlsx?$/i, '')
    .replace(/[\\/*?:[\]]/g, '')
    .trim()
    .slice(0, 31) || 'Hoja1'
}

/** Formats a date/datetime value as dd/mm/yyyy hh:mm:ss (legacy display format) */
function formatDateTimeLegacy(value) {
  if (!value) return ''
  const date = new Date(value)
  if (isNaN(date.getTime())) return String(value)
  const dd   = String(date.getDate()).padStart(2, '0')
  const mm   = String(date.getMonth() + 1).padStart(2, '0')
  const yyyy = String(date.getFullYear())
  const HH   = String(date.getHours()).padStart(2, '0')
  const ii   = String(date.getMinutes()).padStart(2, '0')
  const ss   = String(date.getSeconds()).padStart(2, '0')
  return `${dd}/${mm}/${yyyy} ${HH}:${ii}:${ss}`
}

// ---------------------------------------------------------------------------
// A. Simple workbook — flat header + data rows
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

  const safeRows =
    rows.length > 0
      ? rows
      : [{ MENSAJE: 'No se encontraron registros para los filtros solicitados.' }]

  const headers = Object.keys(safeRows[0])

  const ws = wb.addWorksheet(safeSheetName(title))

  // --- Compute column widths from header name lengths (data width sampled below) ---
  const colWidths = headers.map((h) => clamp(h.length + 4, 10, 40))

  // Sample up to 50 rows for width estimation
  safeRows.slice(0, 50).forEach((row) => {
    headers.forEach((h, i) => {
      const len = String(row[h] ?? '').length
      colWidths[i] = clamp(Math.max(colWidths[i], len + 2), 10, 40)
    })
  })

  ws.columns = headers.map((h, i) => ({
    width: colWidths[i],
  }))

  // --- Header row ---
  const headerRow = ws.addRow(headers)
  headerRow.height = 20
  headerRow.eachCell((cell) => {
    applyHeaderStyle(cell, 'E7F5FE', { horizontal: 'center' })
  })

  // --- Data rows ---
  safeRows.forEach((row) => {
    const values = headers.map((h) => row[h] ?? '')
    const dataRow = ws.addRow(values)
    dataRow.height = 16
    dataRow.font   = DATA_FONT
    dataRow.eachCell((cell) => {
      applyBorder(cell)
      cell.alignment = { vertical: 'middle' }
    })
  })

  return wb.xlsx.writeBuffer()
}

// ---------------------------------------------------------------------------
// B. Structured workbook — metadata block + two-level grouped headers
// ---------------------------------------------------------------------------
//
// Used for: salud-mental exports (MENTAL_HEALTH_TEMPLATE_CONFIG entries)
//
// config shape:
//   {
//     tipoReporte : string,
//     metaColspan : number (legacy HTML hint; ignored here — span auto-computed),
//     groups      : [{ title, color, keys }]
//   }
//
// Layout:
//   Rows 1-4 : metadata (Desde / Hasta / Fecha y Hora / Tipo de reporte)
//   Row  5   : empty spacer
//   Row  6   : H.C.(merged ↕2) | PACIENTE(merged ↕2) | group headers (merged →)
//   Row  7   : —               | —                    | sub-column numbers 1, 2, 3…
//   Row  8+  : data rows (HC forced as text to preserve leading zeros)
// ---------------------------------------------------------------------------

export async function buildStructuredWorkbook({ config, rows, startDate, endDate, title }) {
  const wb = new ExcelJS.Workbook()
  wb.creator = 'Reporteador-2.0'

  const ws = wb.addWorksheet(safeSheetName(title))

  // --- Pre-calculations ---
  const totalDataCols = config.groups.reduce((sum, g) => sum + g.keys.length, 0)
  const totalCols     = 2 + totalDataCols   // col 1 = HC, col 2 = PACIENTE, col 3+ = data

  // Sort by PACIENTE ascending — matches legacy visual output
  const sorted = [...rows].sort((a, b) => {
    const pa = String(col(a, 'paciente')).toUpperCase()
    const pb = String(col(b, 'paciente')).toUpperCase()
    return pa < pb ? -1 : pa > pb ? 1 : 0
  })

  // --- Rows 1-4: Metadata ---
  const metaItems = [
    ['Desde',                  startDate],
    ['Hasta',                  endDate],
    ['Fecha y Hora de Reporte', formatDateTime()],
    ['Tipo de reporte',        config.tipoReporte],
  ]

  metaItems.forEach(([label, value], i) => {
    const rowNum = i + 1

    // Label: cols 1-2 merged
    ws.mergeCells(rowNum, 1, rowNum, 2)
    const labelCell = ws.getCell(rowNum, 1)
    labelCell.value     = label
    labelCell.fill      = META_LABEL_FILL
    labelCell.font      = DATA_FONT
    labelCell.border    = THIN_BORDER
    labelCell.alignment = { vertical: 'middle', horizontal: 'left' }

    // Value: cols 3-totalCols merged
    ws.mergeCells(rowNum, 3, rowNum, totalCols)
    const valueCell = ws.getCell(rowNum, 3)
    valueCell.value     = String(value ?? '')
    valueCell.font      = { bold: true, size: 10 }
    valueCell.border    = THIN_BORDER
    valueCell.alignment = { vertical: 'middle', horizontal: 'left' }

    ws.getRow(rowNum).height = 18
  })

  // --- Row 5: Spacer ---
  ws.getRow(5).height = 5

  // --- Rows 6-7: Two-level grouped headers ---
  const ROW_GRP  = 6
  const ROW_SUB  = 7
  ws.getRow(ROW_GRP).height = 22
  ws.getRow(ROW_SUB).height = 18

  // H.C. spans both header rows
  ws.mergeCells(ROW_GRP, 1, ROW_SUB, 1)
  applyHeaderStyle(ws.getCell(ROW_GRP, 1), 'FA7985')
  ws.getCell(ROW_GRP, 1).value = 'H.C.'

  // PACIENTE spans both header rows
  ws.mergeCells(ROW_GRP, 2, ROW_SUB, 2)
  applyHeaderStyle(ws.getCell(ROW_GRP, 2), 'FA7985')
  ws.getCell(ROW_GRP, 2).value = 'PACIENTE'

  let colCursor = 3
  for (const group of config.groups) {
    const size     = group.keys.length
    const colorHex = group.color.replace('#', '')
    const endCol   = colCursor + size - 1

    // Group header in row 6 (merged if multi-column)
    if (size > 1) {
      ws.mergeCells(ROW_GRP, colCursor, ROW_GRP, endCol)
    }
    applyHeaderStyle(ws.getCell(ROW_GRP, colCursor), colorHex)
    ws.getCell(ROW_GRP, colCursor).value = group.title

    // Sub-column numbers in row 7
    group.keys.forEach((_, keyIdx) => {
      const subCell = ws.getCell(ROW_SUB, colCursor + keyIdx)
      applyHeaderStyle(subCell, colorHex)
      subCell.value = keyIdx + 1
    })

    colCursor = endCol + 1
  }

  // --- Rows 8+: Data ---
  const DATA_START = 8

  if (sorted.length === 0) {
    ws.mergeCells(DATA_START, 1, DATA_START, totalCols)
    const emptyCell = ws.getCell(DATA_START, 1)
    emptyCell.value     = 'No se encontraron registros para los filtros solicitados.'
    emptyCell.font      = DATA_FONT
    emptyCell.alignment = { horizontal: 'center', vertical: 'middle' }
    emptyCell.border    = THIN_BORDER
    ws.getRow(DATA_START).height = 16
  } else {
    sorted.forEach((row, rowIdx) => {
      const excelRowNum = DATA_START + rowIdx
      ws.getRow(excelRowNum).height = 16

      // H.C. — store as plain string + text numFmt to preserve leading zeros
      const hcCell     = ws.getCell(excelRowNum, 1)
      hcCell.value     = String(col(row, 'hc'))
      hcCell.numFmt    = '@'
      hcCell.font      = DATA_FONT
      hcCell.border    = THIN_BORDER
      hcCell.alignment = { vertical: 'middle', horizontal: 'left' }

      // PACIENTE
      const pacCell     = ws.getCell(excelRowNum, 2)
      pacCell.value     = String(col(row, 'paciente'))
      pacCell.font      = DATA_FONT
      pacCell.border    = THIN_BORDER
      pacCell.alignment = { vertical: 'middle', horizontal: 'left' }

      // Data columns
      let dataCol = 3
      for (const group of config.groups) {
        for (const k of group.keys) {
          const dataCell     = ws.getCell(excelRowNum, dataCol)
          const rawVal       = col(row, k)
          dataCell.value     = rawVal === '' || rawVal == null ? null : rawVal
          dataCell.font      = DATA_FONT
          dataCell.border    = THIN_BORDER
          dataCell.alignment = { vertical: 'middle', horizontal: 'center' }
          dataCol++
        }
      }
    })
  }

  // --- Column widths ---
  ws.getColumn(1).width = 14   // H.C.
  ws.getColumn(2).width = 36   // PACIENTE (longest names)

  // Dynamically size PACIENTE column if data is wider
  if (sorted.length > 0) {
    const maxPac = sorted.reduce((max, row) => {
      return Math.max(max, String(col(row, 'paciente')).length)
    }, 10)
    ws.getColumn(2).width = clamp(maxPac + 2, 20, 50)
  }

  // Group data columns — compact (numeric values)
  for (let c = 3; c <= totalCols; c++) {
    ws.getColumn(c).width = 6
  }

  // Freeze rows through the header block (rows 1-7)
  ws.views = [{ state: 'frozen', ySplit: 7 }]

  return wb.xlsx.writeBuffer()
}

// ---------------------------------------------------------------------------
// C. Tabulated workbook — column-mapped flat table
// ---------------------------------------------------------------------------
//
// Used for exports that need explicit column selection, visible labels,
// per-column header colors, datetime formatting, and configurable freeze panes.
//
// template shape:
//   {
//     sheetName  : string          — clean sheet name (no file extension)
//     freezeRows : number          — rows to freeze from top (default: 1)
//     columns    : Array<{
//       key         : string       — SP result column name (case-insensitive lookup)
//       label       : string       — visible header label
//       width       : number       — column width in Excel character units
//       headerColor : string       — 6-char RGB hex without #, e.g. '79C9FD'
//       format?     : string       — 'datetime-legacy' → dd/mm/yyyy hh:mm:ss
//     }>
//   }
// ---------------------------------------------------------------------------

export async function buildTabulatedWorkbook({ template, rows }) {
  const wb = new ExcelJS.Workbook()
  wb.creator = 'Reporteador-2.0'

  const { sheetName, columns, freezeRows = 1 } = template
  const ws = wb.addWorksheet(sheetName)

  ws.columns = columns.map((c) => ({ width: c.width ?? 12 }))

  // --- Header row ---
  const headerRow = ws.addRow(columns.map((c) => c.label))
  headerRow.height = 30
  headerRow.eachCell((cell, colNumber) => {
    applyHeaderStyle(cell, columns[colNumber - 1].headerColor ?? 'E7F5FE', {
      horizontal: 'center',
      wrapText: true,
    })
  })

  // --- Freeze pane below header ---
  ws.views = [{ state: 'frozen', ySplit: freezeRows }]

  // --- No data case ---
  if (rows.length === 0) {
    ws.mergeCells(2, 1, 2, columns.length)
    const emptyCell = ws.getCell(2, 1)
    emptyCell.value     = 'No se encontraron registros para los filtros solicitados.'
    emptyCell.font      = DATA_FONT
    emptyCell.border    = THIN_BORDER
    emptyCell.alignment = { horizontal: 'center', vertical: 'middle' }
    ws.getRow(2).height = 16
    return wb.xlsx.writeBuffer()
  }

  // --- Data rows ---
  rows.forEach((row) => {
    const values = columns.map((colDef) => {
      const raw = col(row, colDef.key)
      if (colDef.format === 'datetime-legacy') return formatDateTimeLegacy(raw)
      return raw ?? ''
    })

    const dataRow = ws.addRow(values)
    dataRow.height = 16
    dataRow.eachCell((cell) => {
      cell.font      = DATA_FONT
      cell.border    = THIN_BORDER
      cell.alignment = { vertical: 'middle' }
    })
  })

  return wb.xlsx.writeBuffer()
}

// ---------------------------------------------------------------------------
// Re-export MIME type so callers don't hardcode the string
// ---------------------------------------------------------------------------
export { MIME_XLSX }
