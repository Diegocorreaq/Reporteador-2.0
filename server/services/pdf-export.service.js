import zlib from 'node:zlib'

export const MIME_PDF = 'application/pdf'

const PAGE_WIDTH = 841.89
const PAGE_HEIGHT = 595.28
const FONT_SIZE = 7.5
const LINE_WIDTH = 0.375

function escapePdfText(value) {
  return String(value ?? '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^\x20-\x7E]/g, '')
    .replace(/\\/g, '\\\\')
    .replace(/\(/g, '\\(')
    .replace(/\)/g, '\\)')
}

function formatDateForLegacy(value) {
  const raw = String(value ?? '').trim().slice(0, 10)
  if (!/^\d{4}-\d{2}-\d{2}$/.test(raw)) return raw
  const [year, month, day] = raw.split('-')
  return `${year}/${month}/${day}`
}

function formatPrintDate(date = new Date()) {
  const parts = new Intl.DateTimeFormat('es-PE', {
    timeZone: 'America/Bogota',
    year: '2-digit',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    hour12: true,
  }).formatToParts(date)

  const pick = (type) => parts.find((part) => part.type === type)?.value ?? ''
  const dayPeriod = pick('dayPeriod').toLowerCase().replace(/\s/g, '')
  return `${pick('day')}/${pick('month')}/${pick('year')} ${pick('hour')}:${pick('minute')} ${dayPeriod}`
}

function readNumber(row, key) {
  const value = row?.[key] ?? row?.[String(key).toUpperCase()] ?? row?.[String(key).toLowerCase()]
  const numeric = Number(value ?? 0)
  return Number.isFinite(numeric) ? numeric : 0
}

function readText(row, keys) {
  for (const key of keys) {
    const value = row?.[key] ?? row?.[String(key).toUpperCase()] ?? row?.[String(key).toLowerCase()]
    const text = String(value ?? '').trim()
    if (text) return text
  }
  return ''
}

function pdfText(text, x, y, { font = 'F2', size = FONT_SIZE } = {}) {
  return `BT ${x.toFixed(3)} ${y.toFixed(3)} Td /${font} ${size} Tf [(${escapePdfText(text)})] TJ ET`
}

function line(x1, y1, x2, y2) {
  return `${LINE_WIDTH} w 0 J [  ] 0 d\n${x1.toFixed(3)} ${y1.toFixed(3)} m ${x2.toFixed(3)} ${y2.toFixed(3)} l S`
}

function fillRect(x, y, width, height, gray = 0.914) {
  return `${gray.toFixed(3)} ${gray.toFixed(3)} ${gray.toFixed(3)} rg\n${x.toFixed(3)} ${y.toFixed(3)} ${width.toFixed(3)} ${height.toFixed(3)} re f\n0.000 0.000 0.000 rg`
}

function cellBox(commands, x, y, width, height, { fill = null } = {}) {
  if (fill != null) {
    commands.push(fillRect(x, y, width, height, fill))
  }
  commands.push(line(x, y + height, x + width, y + height))
  commands.push(line(x, y, x + width, y))
  commands.push(line(x, y + height, x, y))
  commands.push(line(x + width, y + height, x + width, y))
}

function cellText(commands, text, x, y, width, height, options = {}) {
  const font = options.bold ? 'F1' : 'F2'
  const size = options.size ?? FONT_SIZE
  const safeText = String(text ?? '')
  const approximateWidth = safeText.length * size * 0.48
  let textX = x + 2
  if (options.align === 'center') {
    textX = x + Math.max(2, (width - approximateWidth) / 2)
  } else if (options.align === 'right') {
    textX = x + Math.max(2, width - approximateWidth - 2)
  }
  commands.push(pdfText(safeText, textX, y + (height - size) / 2 + 1.2, { font, size }))
}

function createPdf(pages) {
  const objects = []
  const add = (body) => {
    objects.push(body)
    return objects.length
  }

  const catalogId = add('<< /Type /Catalog /Pages 2 0 R >>')
  const pagesId = add('')
  const fontBoldId = add('<< /Type /Font /Subtype /Type1 /Name /F1 /BaseFont /Helvetica-Bold /Encoding /WinAnsiEncoding >>')
  const fontRegularId = add('<< /Type /Font /Subtype /Type1 /Name /F2 /BaseFont /Helvetica /Encoding /WinAnsiEncoding >>')

  const pageIds = []
  for (const content of pages) {
    const compressed = zlib.deflateSync(Buffer.from(content, 'latin1'))
    const contentId = add(`<< /Filter /FlateDecode /Length ${compressed.length} >>\nstream\n${compressed.toString('binary')}\nendstream`)
    const pageId = add(`<< /Type /Page /MediaBox [0 0 ${PAGE_WIDTH} ${PAGE_HEIGHT}] /Parent ${pagesId} 0 R /Contents ${contentId} 0 R /Resources << /ProcSet [/PDF /Text] /Font << /F1 ${fontBoldId} 0 R /F2 ${fontRegularId} 0 R >> >> >>`)
    pageIds.push(pageId)
  }

  objects[pagesId - 1] = `<< /Type /Pages /Kids [${pageIds.map((id) => `${id} 0 R`).join(' ')}] /Count ${pageIds.length} >>`

  const chunks = ['%PDF-1.3\n']
  const offsets = [0]
  objects.forEach((body, index) => {
    offsets.push(Buffer.byteLength(chunks.join(''), 'binary'))
    chunks.push(`${index + 1} 0 obj\n${body}\nendobj\n`)
  })

  const xrefOffset = Buffer.byteLength(chunks.join(''), 'binary')
  chunks.push(`xref\n0 ${objects.length + 1}\n`)
  chunks.push('0000000000 65535 f \n')
  for (let index = 1; index < offsets.length; index += 1) {
    chunks.push(`${String(offsets[index]).padStart(10, '0')} 00000 n \n`)
  }
  chunks.push(`trailer\n<< /Size ${objects.length + 1} /Root ${catalogId} 0 R >>\nstartxref\n${xrefOffset}\n%%EOF`)

  return Buffer.from(chunks.join(''), 'binary')
}

function buildPageContent({
  employee,
  startDate,
  endDate,
  days,
  pageRows,
  pageIndex,
  pageCount,
  reportTitle,
}) {
  const commands = ['0.000 0.000 0.000 rg']
  commands.push(pdfText(reportTitle, 300.000, 543.963, { font: 'F1' }))

  const headerY1 = 519.624
  const headerY2 = 507.467
  const headerH = 12.157
  const headerColumns = [34.391, 121.381, 206.307, 350.887, 553.102, 673.505, 807.499]

  cellBox(commands, headerColumns[0], headerY1, headerColumns[1] - headerColumns[0], headerH)
  cellText(commands, 'N° de DNI:', headerColumns[0], headerY1, headerColumns[1] - headerColumns[0], headerH, { bold: true, align: 'center' })
  cellBox(commands, headerColumns[1], headerY1, headerColumns[2] - headerColumns[1], headerH, { fill: 0.898 })
  cellText(commands, employee.dni, headerColumns[1], headerY1, headerColumns[2] - headerColumns[1], headerH, { align: 'center' })

  cellBox(commands, headerColumns[2], headerY1, headerColumns[3] - headerColumns[2], headerH)
  cellText(commands, 'Nombre de Profesional:', headerColumns[2], headerY1, headerColumns[3] - headerColumns[2], headerH, { bold: true, align: 'center' })
  cellBox(commands, headerColumns[3], headerY1, headerColumns[4] - headerColumns[3], headerH, { fill: 0.898 })
  cellText(commands, employee.nombre, headerColumns[3], headerY1, headerColumns[4] - headerColumns[3], headerH, { align: 'center' })

  cellBox(commands, headerColumns[4], headerY1, headerColumns[5] - headerColumns[4], headerH)
  cellText(commands, 'Tipo de Empleado:', headerColumns[4], headerY1, headerColumns[5] - headerColumns[4], headerH, { bold: true, align: 'center' })
  cellBox(commands, headerColumns[5], headerY1, headerColumns[6] - headerColumns[5], headerH, { fill: 0.898 })
  cellText(commands, employee.tipoEmpleado, headerColumns[5], headerY1, headerColumns[6] - headerColumns[5], headerH, { align: 'center' })

  cellBox(commands, headerColumns[0], headerY2, headerColumns[1] - headerColumns[0], headerH)
  cellText(commands, 'Fecha Desde:', headerColumns[0], headerY2, headerColumns[1] - headerColumns[0], headerH, { bold: true, align: 'center' })
  cellBox(commands, headerColumns[1], headerY2, headerColumns[2] - headerColumns[1], headerH, { fill: 0.898 })
  cellText(commands, formatDateForLegacy(startDate), headerColumns[1], headerY2, headerColumns[2] - headerColumns[1], headerH, { align: 'center' })
  cellBox(commands, headerColumns[2], headerY2, headerColumns[3] - headerColumns[2], headerH)
  cellText(commands, 'Hasta:', headerColumns[2], headerY2, headerColumns[3] - headerColumns[2], headerH, { bold: true, align: 'center' })
  cellBox(commands, headerColumns[3], headerY2, headerColumns[4] - headerColumns[3], headerH, { fill: 0.898 })
  cellText(commands, formatDateForLegacy(endDate), headerColumns[3], headerY2, headerColumns[4] - headerColumns[3], headerH, { align: 'center' })
  cellBox(commands, headerColumns[4], headerY2, headerColumns[6] - headerColumns[4], headerH)

  const tableLeft = 34.391
  const tableRight = 807.499
  const tableTop = 497.717
  const rowH = 12.157
  const headerRowH = 10.657
  const codeW = 72.343
  const totalW = 79.684
  const dayCount = Math.max(1, days.length)
  const dayW = Math.max(11, Math.min(40.38, 40.38 - Math.max(0, dayCount - 3) * 1.25))
  const activityW = tableRight - tableLeft - codeW - totalW - dayW * dayCount
  const codeX = tableLeft
  const activityX = codeX + codeW
  const daysX = activityX + activityW
  const totalX = daysX + dayW * dayCount

  cellBox(commands, codeX, tableTop - headerRowH, codeW, headerRowH, { fill: 0.914 })
  cellBox(commands, activityX, tableTop - headerRowH, activityW, headerRowH, { fill: 0.914 })
  cellText(commands, 'Actividad', activityX, tableTop - headerRowH, activityW, headerRowH, { bold: true, align: 'center' })
  days.forEach((day, index) => {
    const x = daysX + index * dayW
    cellBox(commands, x, tableTop - headerRowH, dayW, headerRowH, { fill: 0.914 })
    cellText(commands, day, x, tableTop - headerRowH, dayW, headerRowH, { bold: true, align: 'center' })
  })
  cellBox(commands, totalX, tableTop - headerRowH, totalW, headerRowH, { fill: 0.914 })
  cellText(commands, 'Total', totalX, tableTop - headerRowH, totalW, headerRowH, { bold: true, align: 'center' })

  pageRows.forEach((row, index) => {
    const y = tableTop - headerRowH - rowH * (index + 1)
    const ord = readText(row, ['ORD', 'ord', 'COD_ACT', 'cod_act'])
    const activity = readText(row, ['TIPOACTIVIDAD', 'tipoactividad'])
    const total = days.reduce((sum, day) => sum + readNumber(row, String(day)), 0)

    cellBox(commands, codeX, y, codeW, rowH)
    cellText(commands, ord, codeX, y, codeW, rowH, { align: 'center' })
    cellBox(commands, activityX, y, activityW, rowH)
    cellText(commands, activity, activityX, y, activityW, rowH)
    days.forEach((day, dayIndex) => {
      const value = readNumber(row, String(day))
      const x = daysX + dayIndex * dayW
      cellBox(commands, x, y, dayW, rowH)
      cellText(commands, value > 0 ? value : '-', x, y, dayW, rowH, { align: 'center' })
    })
    cellBox(commands, totalX, y, totalW, rowH, { fill: 0.914 })
    cellText(commands, total, totalX, y, totalW, rowH, { align: 'center' })
  })

  commands.push(pdfText('Fuete:', 34.016, 119.291))
  commands.push(pdfText('Base de Datos Sisgalen', 57.363, 119.291, { font: 'F1' }))
  commands.push(pdfText('Unidad de Inteligencia Sanitaria', 34.016, 102.633, { font: 'F1' }))
  commands.push(pdfText('Area de Estadistica', 34.016, 85.976, { font: 'F1' }))
  commands.push(pdfText(`Fecha y Hora Impresion: ${formatPrintDate()}`, 34.016, 69.318))
  if (pageCount > 1) {
    commands.push(pdfText(`Pagina ${pageIndex + 1} de ${pageCount}`, 746.000, 69.318, { font: 'F1' }))
  }

  return commands.join('\n')
}

function buildProduccionProfesionalPdf({
  employee,
  rows,
  dayRange,
  startDate,
  endDate,
  reportTitle,
}) {
  const days = []
  if (dayRange) {
    for (let day = Number(dayRange.diaInicio); day <= Number(dayRange.diaFin); day += 1) {
      days.push(day)
    }
  }

  const sourceRows = Array.isArray(rows) && rows.length > 0
    ? rows
    : [{ ORD: '', TIPOACTIVIDAD: 'No se encontraron registros para los filtros solicitados.' }]
  const rowsPerPage = 30
  const pageCount = Math.max(1, Math.ceil(sourceRows.length / rowsPerPage))
  const pages = []

  for (let pageIndex = 0; pageIndex < pageCount; pageIndex += 1) {
    pages.push(buildPageContent({
      employee,
      startDate,
      endDate,
      days,
      pageRows: sourceRows.slice(pageIndex * rowsPerPage, (pageIndex + 1) * rowsPerPage),
      pageIndex,
      pageCount,
      reportTitle,
    }))
  }

  return createPdf(pages)
}

export function buildProduccionMedicosPdf(options) {
  return buildProduccionProfesionalPdf({
    ...options,
    reportTitle: 'REPORTE DE PRODUCCION DE MEDICOS',
  })
}

export function buildProduccionObstetrasPdf(options) {
  return buildProduccionProfesionalPdf({
    ...options,
    reportTitle: 'REPORTE DE PRODUCCION DE OBSTETRAS',
  })
}

const PPR_MONTHS = [
  'ENERO', 'FEBRERO', 'MARZO', 'ABRIL', 'MAYO', 'JUNIO',
  'JULIO', 'AGOSTO', 'SETIEMBRE', 'OCTUBRE', 'NOVIEMBRE', 'DICIEMBRE',
]

function truncateText(value, maxLength) {
  const text = String(value ?? '').trim()
  if (text.length <= maxLength) return text
  return `${text.slice(0, Math.max(0, maxLength - 3))}...`
}

function formatPprNumber(value) {
  if (value == null || value === '') return '-'
  const numeric = Number(value)
  if (!Number.isFinite(numeric)) return '-'
  return numeric.toLocaleString('en-US', { maximumFractionDigits: 2 })
}

function formatPprSignedAt(value) {
  const date = value instanceof Date ? value : new Date(value)
  if (Number.isNaN(date.getTime())) return String(value ?? '')
  return new Intl.DateTimeFormat('es-PE', {
    timeZone: 'America/Bogota',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: false,
  }).format(date)
}

function buildPprSignaturePage({
  document,
  rows,
  pageIndex,
  pageCount,
  isLastPage,
}) {
  const isSigned = Boolean(document.isSigned ?? document.signedAt)
  const commands = ['0.000 0.000 0.000 rg']
  const left = 24
  const right = 817
  const pageWidth = right - left

  commands.push(pdfText('REPORTE MENSUAL DE ACTIVIDADES PPR', 272, 563, { font: 'F1', size: 11 }))
  commands.push(pdfText(
    `Periodo: ${PPR_MONTHS[Number(document.month) - 1] ?? document.month} ${document.year}`,
    341,
    547,
    { font: 'F1', size: 8 },
  ))

  const metaTop = 522
  const metaHeight = 17
  const metaWidths = [100, 250, 80, 128, 95, 140]
  const metaLabels = [
    ['Responsable', document.signerName],
    ['DNI', document.signerDni],
    ['Fecha de firma', isSigned ? formatPprSignedAt(document.signedAt) : 'Pendiente de firma'],
  ]
  let metaX = left
  metaLabels.forEach(([label, value], index) => {
    const labelWidth = metaWidths[index * 2]
    const valueWidth = metaWidths[index * 2 + 1]
    cellBox(commands, metaX, metaTop, labelWidth, metaHeight, { fill: 0.914 })
    cellText(commands, label, metaX, metaTop, labelWidth, metaHeight, { bold: true, align: 'center', size: 7 })
    metaX += labelWidth
    cellBox(commands, metaX, metaTop, valueWidth, metaHeight)
    cellText(commands, truncateText(value, index === 0 ? 42 : 26), metaX, metaTop, valueWidth, metaHeight, {
      align: 'center',
      size: 7,
    })
    metaX += valueWidth
  })

  const codeY = 502
  cellBox(commands, left, codeY, 115, 16, { fill: 0.914 })
  cellText(commands, 'Codigo de documento', left, codeY, 115, 16, { bold: true, align: 'center', size: 7 })
  cellBox(commands, left + 115, codeY, pageWidth - 115, 16)
  cellText(commands, document.documentCode, left + 115, codeY, pageWidth - 115, 16, { size: 7 })

  const tableTop = 493
  const headerHeight = 18
  const rowHeight = 17
  const columns = [
    { key: 'programCode', label: 'PP', width: 50, align: 'center', max: 9 },
    { key: 'activityCode', label: 'Codigo actividad', width: 92, align: 'center', max: 20 },
    { key: 'activityName', label: 'Actividad operativa', width: 302, align: 'left', max: 71 },
    { key: 'unit', label: 'Unidad', width: 78, align: 'center', max: 17 },
    { key: 'annualGoal', label: 'Meta anual', width: 66, align: 'right', max: 14, numeric: true },
    { key: 'monthValue', label: 'Valor mes', width: 66, align: 'right', max: 14, numeric: true },
    { key: 'accumulatedValue', label: 'Acumulado', width: 72, align: 'right', max: 14, numeric: true },
    { key: 'annualProgress', label: '% anual', width: 67, align: 'right', max: 14, percent: true },
  ]

  let x = left
  columns.forEach((column) => {
    cellBox(commands, x, tableTop - headerHeight, column.width, headerHeight, { fill: 0.875 })
    cellText(commands, column.label, x, tableTop - headerHeight, column.width, headerHeight, {
      bold: true,
      align: 'center',
      size: 6.5,
    })
    x += column.width
  })

  rows.forEach((row, rowIndex) => {
    const y = tableTop - headerHeight - rowHeight * (rowIndex + 1)
    let rowX = left
    columns.forEach((column) => {
      cellBox(commands, rowX, y, column.width, rowHeight, {
        fill: rowIndex % 2 === 1 ? 0.975 : null,
      })
      let value = row[column.key]
      if (column.numeric) value = formatPprNumber(value)
      if (column.percent) value = value == null ? '-' : `${formatPprNumber(value)}%`
      cellText(commands, truncateText(value, column.max), rowX, y, column.width, rowHeight, {
        align: column.align,
        size: 6.2,
      })
      rowX += column.width
    })
  })

  if (isLastPage) {
    const signatureY = 43
    const signatureHeight = 69
    cellBox(commands, left, signatureY, pageWidth, signatureHeight, { fill: 0.945 })
    if (isSigned) {
      commands.push(pdfText(document.signatureLabel, 265, signatureY + 51, { font: 'F1', size: 9 }))
      commands.push(pdfText(
        `Firmado por: ${truncateText(document.signerName, 75)} | DNI: ${document.signerDni}`,
        left + 12,
        signatureY + 35,
        { font: 'F1', size: 7.2 },
      ))
      commands.push(pdfText(
        `Fecha: ${formatPprSignedAt(document.signedAt)} | Actividades: ${document.totalActivities}`,
        left + 12,
        signatureY + 22,
        { size: 6.8 },
      ))
      commands.push(pdfText(
        `Huella de contenido SHA-256: ${document.contentHash.slice(0, 32)}`,
        left + 12,
        signatureY + 10,
        { size: 6.2 },
      ))
      commands.push(pdfText(document.contentHash.slice(32), left + 170, signatureY + 10, { size: 6.2 }))
    } else {
      commands.push(pdfText('DOCUMENTO BORRADOR - SIN FIRMA', 309, signatureY + 43, {
        font: 'F1',
        size: 10,
      }))
      commands.push(pdfText(
        'Revise la informacion antes de confirmar la firma del periodo.',
        275,
        signatureY + 25,
        { size: 7.2 },
      ))
      commands.push(pdfText(
        `Actividades incluidas: ${document.totalActivities}`,
        left + 12,
        signatureY + 10,
        { size: 6.8 },
      ))
    }
  }

  commands.push(pdfText(
    `Documento generado por Reporteador 2.0 - Pagina ${pageIndex + 1} de ${pageCount}`,
    left,
    19,
    { size: 6.2 },
  ))
  commands.push(pdfText(
    isSigned
      ? 'La firma mostrada es ficticia y no corresponde a RENIEC.'
      : 'Borrador sin firma y sin validez como constancia.',
    isSigned ? 592 : 615,
    19,
    { font: 'F1', size: 6.2 },
  ))

  return commands.join('\n')
}

export function buildPprMonthlySignaturePdf({ document, rows }) {
  const sourceRows = Array.isArray(rows) ? rows : []
  const rowsPerPage = 20
  const pageCount = Math.max(1, Math.ceil(sourceRows.length / rowsPerPage))
  const pages = []

  for (let pageIndex = 0; pageIndex < pageCount; pageIndex += 1) {
    pages.push(buildPprSignaturePage({
      document,
      rows: sourceRows.slice(pageIndex * rowsPerPage, (pageIndex + 1) * rowsPerPage),
      pageIndex,
      pageCount,
      isLastPage: pageIndex === pageCount - 1,
    }))
  }

  return createPdf(pages)
}
