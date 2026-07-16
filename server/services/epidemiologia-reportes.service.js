import ExcelJS from 'exceljs'
import { executeProcedure, executeQuery, sql } from './legacy-sql.service.js'

const MIME_XLSX = 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
const DATE_RE = /^\d{4}-\d{2}-\d{2}$/
const TIMEOUT_MS = 180000

const DISEASE_REPORTS = {
  pfa: {
    title: 'PFA',
    filePrefix: 'PFA',
    summaryProcedure: 'sp_r_pfa_general',
    detailPrefix: 'sp_r_pfa',
  },
  sifilis: {
    title: 'SIFILIS',
    filePrefix: 'SIFILIS',
    summaryProcedure: 'sp_r_sifilis_general',
    secondarySummaryProcedure: 'sp_r_sifilis_general2',
    detailPrefix: 'sp_r_sifilis',
  },
  sarampion: {
    title: 'SARAMPION',
    filePrefix: 'SARAMPION',
    summaryProcedure: 'sp_r_sarampion_general',
    detailPrefix: 'sp_r_sarampion',
  },
  rubeola: {
    title: 'SRC',
    filePrefix: 'SRC',
    summaryProcedure: 'sp_r_rubeola_general',
    detailPrefix: 'sp_r_rubeola',
  },
}

function assertDate(value, label) {
  const safe = String(value ?? '').trim()
  if (!DATE_RE.test(safe)) {
    throw new Error(`${label} no tiene un formato valido.`)
  }
  return safe
}

function assertRange(startDate, endDate) {
  const start = assertDate(startDate, 'La fecha inicial')
  const end = assertDate(endDate, 'La fecha final')
  if (start > end) {
    throw new Error('La fecha inicial no puede ser mayor que la fecha final.')
  }
  return { start, end }
}

function formatDate(date) {
  if (!date) return ''
  const [year, month, day] = String(date).slice(0, 10).split('-')
  return `${day}/${month}/${year}`
}

function sanitizeSheetName(name) {
  return String(name || 'Reporte')
    .replace(/[\\/*?:[\]]/g, ' ')
    .slice(0, 31)
    .trim() || 'Reporte'
}

function valueFor(row, key) {
  if (!row || !key) return ''
  if (Object.prototype.hasOwnProperty.call(row, key)) return row[key] ?? ''
  const lower = key.toLowerCase()
  const found = Object.keys(row).find((candidate) => candidate.toLowerCase() === lower)
  return found ? row[found] ?? '' : ''
}

function resolveHeaders(rows, preferredHeaders = []) {
  const seen = new Set()
  const headers = []

  for (const header of preferredHeaders) {
    if (!seen.has(header)) {
      seen.add(header)
      headers.push(header)
    }
  }

  for (const row of rows) {
    for (const key of Object.keys(row ?? {})) {
      if (!seen.has(key)) {
        seen.add(key)
        headers.push(key)
      }
    }
  }

  return headers.length ? headers : ['MENSAJE']
}

function addTitle(ws, title, subtitle, lastColumn = 6) {
  ws.mergeCells(1, 1, 1, Math.max(lastColumn, 1))
  ws.mergeCells(2, 1, 2, Math.max(lastColumn, 1))
  ws.getCell(1, 1).value = title
  ws.getCell(2, 1).value = subtitle
  ws.getRow(1).height = 22
  ws.getRow(2).height = 18
  for (const rowNumber of [1, 2]) {
    ws.getRow(rowNumber).font = { bold: true, color: { argb: 'FFFFFFFF' } }
    ws.getRow(rowNumber).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF005F8F' } }
    ws.getRow(rowNumber).alignment = { vertical: 'middle' }
  }
}

function addTable(ws, rows, { title, subtitle, headers: preferredHeaders, startRow = 1, headerFill = 'FFE7F5FE' } = {}) {
  const safeRows = rows.length ? rows : [{ MENSAJE: 'No se encontraron registros para los filtros solicitados.' }]
  const headers = resolveHeaders(safeRows, preferredHeaders)

  if (title) {
    addTitle(ws, title, subtitle, headers.length)
    startRow = Math.max(startRow, 4)
  }

  const headerRow = ws.getRow(startRow)
  headerRow.values = [, ...headers]
  headerRow.height = 22
  headerRow.eachCell((cell) => {
    cell.font = { bold: true, color: { argb: 'FF0F172A' } }
    cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: headerFill } }
    cell.alignment = { horizontal: 'center', vertical: 'middle', wrapText: true }
    cell.border = {
      top: { style: 'thin', color: { argb: 'FFD5D5D5' } },
      left: { style: 'thin', color: { argb: 'FFD5D5D5' } },
      bottom: { style: 'thin', color: { argb: 'FFD5D5D5' } },
      right: { style: 'thin', color: { argb: 'FFD5D5D5' } },
    }
  })

  safeRows.forEach((row, index) => {
    const excelRow = ws.getRow(startRow + 1 + index)
    excelRow.values = [, ...headers.map((header) => valueFor(row, header))]
    excelRow.eachCell((cell) => {
      cell.alignment = { vertical: 'top', wrapText: true }
    })
  })

  ws.views = [{ state: 'frozen', ySplit: startRow }]
  ws.autoFilter = {
    from: { row: startRow, column: 1 },
    to: { row: startRow, column: headers.length },
  }
  headers.forEach((header, index) => {
    ws.getColumn(index + 1).width = Math.min(Math.max(String(header).length + 4, 12), 42)
  })

  return safeRows.length
}

async function procedureRows({ name, params, connection = 'general' }) {
  return executeProcedure(name, params, { connection, timeoutMs: TIMEOUT_MS })
}

async function buildWorkbookBuffer(wb) {
  wb.creator = 'Reporteador-2.0'
  return wb.xlsx.writeBuffer()
}

async function buildSimpleProcedureWorkbook({ title, fileName, procedure, params, connection, startDate, endDate, headers }) {
  const rows = await procedureRows({ name: procedure, params, connection })
  const wb = new ExcelJS.Workbook()
  const ws = wb.addWorksheet(sanitizeSheetName(title))
  addTable(ws, rows, {
    title,
    subtitle: endDate ? `Periodo: ${formatDate(startDate)} al ${formatDate(endDate)}` : `Fecha: ${formatDate(startDate)}`,
    headers,
  })

  return {
    fileName,
    mimeType: MIME_XLSX,
    content: await buildWorkbookBuffer(wb),
    rowCount: rows.length,
  }
}

const CANCER_COLUMNS = [
  { key: 'NroHistoriaClinica', header: 'Historia Clinica', width: 18 },
  { key: 'NombrePaciente', header: 'Paciente', width: 45 },
  { key: 'IdCuentaAtencion', header: 'Cuenta Atencion', width: 18 },
  { key: 'FechaIngreso', header: 'Fecha Ingreso', width: 18, date: true },
  { key: 'cod_dx', header: 'CIE10', width: 12 },
  { key: 'des_dx', header: 'Diagnostico', width: 55 },
  { key: 'tipo_dx', header: 'Tipo Dx', width: 10 },
  { key: 'Clasif_cancer', header: 'Clasificacion Cancer', width: 28 },
  { key: 'IdCuenta_AP1', header: 'AP: IdCuenta', width: 16 },
  { key: 'AP_Fecha1', header: 'AP: Fecha', width: 18, date: true },
  { key: 'AP_CodDx1', header: 'AP: Cod Dx', width: 14 },
  { key: 'AP_DesDx1', header: 'AP: Diagnostico', width: 42 },
  { key: 'AP_Resultado1', header: 'AP: Resultado', width: 70 },
  { key: 'AP_Control1', header: 'AP: Control Cancer', width: 16 },
  { key: 'CQX_IdCuenta1', header: 'CQX: IdCuenta (1)', width: 16 },
  { key: 'CQX_Codigo1', header: 'CQX: Codigo (1)', width: 14 },
  { key: 'CQX_Proced1', header: 'CQX: Procedimiento (1)', width: 42 },
  { key: 'CQX_Comp1', header: 'CQX: Complejidad (1)', width: 18 },
  { key: 'CQX_Fecha1', header: 'CQX: Fecha (1)', width: 18, date: true },
  { key: 'CQX_IdCuenta2', header: 'CQX: IdCuenta (2)', width: 16 },
  { key: 'CQX_Codigo2', header: 'CQX: Codigo (2)', width: 14 },
  { key: 'CQX_Proced2', header: 'CQX: Procedimiento (2)', width: 42 },
  { key: 'CQX_Comp2', header: 'CQX: Complejidad (2)', width: 18 },
  { key: 'CQX_Fecha2', header: 'CQX: Fecha (2)', width: 18, date: true },
  { key: 'CQX_IdCuenta3', header: 'CQX: IdCuenta (3)', width: 16 },
  { key: 'CQX_Codigo3', header: 'CQX: Codigo (3)', width: 14 },
  { key: 'CQX_Proced3', header: 'CQX: Procedimiento (3)', width: 42 },
  { key: 'CQX_Comp3', header: 'CQX: Complejidad (3)', width: 18 },
  { key: 'CQX_Fecha3', header: 'CQX: Fecha (3)', width: 18, date: true },
  { key: 'REC_Fecha1', header: 'Receta 1: Fecha', width: 18, date: true },
  { key: 'REC_Med11', header: 'Receta 1: Med1', width: 32 },
  { key: 'REC_Med12', header: 'Receta 1: Med2', width: 32 },
  { key: 'REC_Med13', header: 'Receta 1: Med3', width: 32 },
  { key: 'REC_Med14', header: 'Receta 1: Med4', width: 32 },
  { key: 'REC_Med15', header: 'Receta 1: Med5', width: 32 },
  { key: 'REC_Fecha2', header: 'Receta 2: Fecha', width: 18, date: true },
  { key: 'REC_Med21', header: 'Receta 2: Med1', width: 32 },
  { key: 'REC_Med22', header: 'Receta 2: Med2', width: 32 },
  { key: 'REC_Med23', header: 'Receta 2: Med3', width: 32 },
  { key: 'REC_Med24', header: 'Receta 2: Med4', width: 32 },
  { key: 'REC_Med25', header: 'Receta 2: Med5', width: 32 },
  { key: 'REC_Fecha3', header: 'Receta 3: Fecha', width: 18, date: true },
  { key: 'REC_Med31', header: 'Receta 3: Med1', width: 32 },
  { key: 'REC_Med32', header: 'Receta 3: Med2', width: 32 },
  { key: 'REC_Med33', header: 'Receta 3: Med3', width: 32 },
  { key: 'REC_Med34', header: 'Receta 3: Med4', width: 32 },
  { key: 'REC_Med35', header: 'Receta 3: Med5', width: 32 },
]

const CANCER_GROUPS = [
  { range: 'A6:D6', label: 'Datos del paciente' },
  { range: 'E6:H6', label: 'Diagnostico' },
  { range: 'I6:N6', label: 'Anatomia Patologica' },
  { range: 'O6:S6', label: 'Centro Quirurgico - 1ra' },
  { range: 'T6:X6', label: 'Centro Quirurgico - 2da' },
  { range: 'Y6:AC6', label: 'Centro Quirurgico - 3ra' },
  { range: 'AD6:AI6', label: 'Receta 1' },
  { range: 'AJ6:AO6', label: 'Receta 2' },
  { range: 'AP6:AU6', label: 'Receta 3' },
]

function toExcelDate(value) {
  if (!value) return null
  const raw = value instanceof Date ? value.toISOString() : String(value).trim()
  const match = raw.match(/^(\d{4})-(\d{2})-(\d{2})(?:[T\s](\d{2}):(\d{2})(?::(\d{2}))?)?/)
  if (!match) return value

  const [, year, month, day, hour = '0', minute = '0', second = '0'] = match
  return new Date(
    Number(year),
    Number(month) - 1,
    Number(day),
    Number(hour),
    Number(minute),
    Number(second),
  )
}

function cleanCellValue(value) {
  if (value === null || value === undefined) return ''
  if (typeof value === 'string') {
    const safe = value.trim()
    if (!safe || safe.toLowerCase() === 'null' || safe.toLowerCase() === 'undefined') return ''
    return safe
  }
  return value
}

function limaCutoffStamp(date = new Date()) {
  const parts = Object.fromEntries(
    new Intl.DateTimeFormat('en-US', {
      timeZone: 'America/Lima',
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
      hour12: true,
    })
      .formatToParts(date)
      .filter((part) => part.type !== 'literal')
      .map((part) => [part.type, part.value]),
  )
  return `${parts.day}/${parts.month}/${parts.year} ${parts.hour}:${parts.minute} ${parts.dayPeriod.toLowerCase()}`
}

function applyCancerBorder(cell) {
  cell.border = {
    top: { style: 'thin', color: { argb: 'FFD5D5D5' } },
    left: { style: 'thin', color: { argb: 'FFD5D5D5' } },
    bottom: { style: 'thin', color: { argb: 'FFD5D5D5' } },
    right: { style: 'thin', color: { argb: 'FFD5D5D5' } },
  }
}

async function buildCancerWorkbook({ rows, startDate, endDate, fileName }) {
  const wb = new ExcelJS.Workbook()
  const ws = wb.addWorksheet('Base')

  ws.mergeCells('A1:D1')
  ws.mergeCells('A2:D2')
  ws.mergeCells('A3:D3')
  ws.getCell('A1').value = 'REPORTE CANCER SEGUIMIENTO'
  ws.getCell('A2').value = `PERIODO: ${formatDate(startDate)} al ${formatDate(endDate)}`
  ws.getCell('A3').value = `FECHA DE CORTE: ${limaCutoffStamp()}`

  for (const rowNumber of [1, 2, 3]) {
    ws.getRow(rowNumber).font = { name: 'Arial', size: 9, bold: true, color: { argb: 'FF000000' } }
    ws.getRow(rowNumber).alignment = { vertical: 'middle' }
  }

  for (const group of CANCER_GROUPS) {
    ws.mergeCells(group.range)
    const cell = ws.getCell(group.range.split(':')[0])
    cell.value = group.label
  }

  const groupRow = ws.getRow(6)
  groupRow.height = 24
  for (let columnIndex = 1; columnIndex <= CANCER_COLUMNS.length; columnIndex += 1) {
    const cell = groupRow.getCell(columnIndex)
    cell.font = { name: 'Arial', size: 9, bold: true, color: { argb: 'FF000000' } }
    cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFEFD032' } }
    cell.alignment = { horizontal: 'center', vertical: 'middle', wrapText: true }
    applyCancerBorder(cell)
  }

  const headerRow = ws.getRow(7)
  headerRow.values = [, ...CANCER_COLUMNS.map((column) => column.header)]
  headerRow.height = 36
  headerRow.eachCell((cell) => {
    cell.font = { name: 'Arial', size: 9, bold: true, color: { argb: 'FF000000' } }
    cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFF8E77E' } }
    cell.alignment = { horizontal: 'center', vertical: 'middle', wrapText: true }
    applyCancerBorder(cell)
  })

  CANCER_COLUMNS.forEach((column, index) => {
    ws.getColumn(index + 1).width = column.width
  })

  rows.forEach((row, rowIndex) => {
    const excelRow = ws.getRow(8 + rowIndex)
    CANCER_COLUMNS.forEach((column, columnIndex) => {
      const cell = excelRow.getCell(columnIndex + 1)
      const rawValue = cleanCellValue(valueFor(row, column.key))
      cell.value = column.date ? toExcelDate(rawValue) : rawValue
      if (column.date && cell.value) cell.numFmt = 'dd/mm/yyyy hh:mm'
      cell.font = { name: 'Arial', size: 9 }
      cell.alignment = { vertical: 'top', wrapText: true }
    })
  })

  ws.autoFilter = 'A7:AU7'
  ws.views = [{ state: 'frozen', ySplit: 7, topLeftCell: 'A8' }]

  return {
    fileName,
    mimeType: MIME_XLSX,
    content: await buildWorkbookBuffer(wb),
    rowCount: rows.length,
  }
}

async function exportCancer({ startDate, endDate }) {
  const { start, end } = assertRange(startDate, endDate)
  const rows = await procedureRows({
    name: 'dbo.SP_ReporteCancerSeguimiento',
    params: [
      { name: 'FechaInicio', type: sql.NVarChar, value: start },
      { name: 'FechaFin', type: sql.NVarChar, value: end },
    ],
    connection: 'general',
  })
  return buildCancerWorkbook({
    rows,
    startDate: start,
    endDate: end,
    fileName: `BAI_ReporteCancerSeguimiento_${start}_${end}.xlsx`,
  })
}

async function addSummarySheet(wb, report, start, end) {
  const ws = wb.addWorksheet(`${report.title}_RESUMEN`)
  addTitle(ws, `DATOS DE ENFERMEDADES TRANSMISIBLES - ${report.title}`, `Periodo: ${formatDate(start)} al ${formatDate(end)}`, 9)

  const blocks = [
    { label: 'CONSULTORIO EXTERNO', type: 'CE', col: 2, fill: 'FFEFD032' },
    { label: 'EMERGENCIA', type: 'EM', col: 5, fill: 'FF73C6EA' },
    { label: 'HOSPITALIZACION', type: 'HO', col: 8, fill: 'FF73EAA7' },
  ]

  for (const block of blocks) {
    const rows = await procedureRows({
      name: report.summaryProcedure,
      params: [
        { name: 'fechaInicio', type: sql.NVarChar, value: start },
        { name: 'fechaFin', type: sql.NVarChar, value: end },
        { name: 'tipo', type: sql.NVarChar, value: block.type },
      ],
      connection: 'general',
    })
    ws.mergeCells(5, block.col, 5, block.col + 1)
    ws.getCell(5, block.col).value = block.label
    ws.getCell(6, block.col).value = 'MES'
    ws.getCell(6, block.col + 1).value = 'TOTAL ATENCIONES'
    for (const cellRef of [ws.getCell(5, block.col), ws.getCell(6, block.col), ws.getCell(6, block.col + 1)]) {
      cellRef.font = { bold: true }
      cellRef.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: block.fill } }
      cellRef.alignment = { horizontal: 'center' }
    }
    rows.forEach((row, index) => {
      ws.getCell(7 + index, block.col).value = valueFor(row, 'NMES')
      ws.getCell(7 + index, block.col + 1).value = valueFor(row, 'TOTAL')
    })

    if (report.secondarySummaryProcedure) {
      const secondaryRows = await procedureRows({
        name: report.secondarySummaryProcedure,
        params: [
          { name: 'fechaInicio', type: sql.NVarChar, value: start },
          { name: 'fechaFin', type: sql.NVarChar, value: end },
          { name: 'tipo', type: sql.NVarChar, value: block.type },
        ],
        connection: 'general',
      })
      const offsetCol = block.col + 10
      ws.mergeCells(5, offsetCol, 5, offsetCol + 1)
      ws.getCell(5, offsetCol).value = `${block.label} - GESTANTES`
      ws.getCell(6, offsetCol).value = 'MES'
      ws.getCell(6, offsetCol + 1).value = 'TOTAL ATENCIONES'
      secondaryRows.forEach((row, index) => {
        ws.getCell(7 + index, offsetCol).value = valueFor(row, 'NMES')
        ws.getCell(7 + index, offsetCol + 1).value = valueFor(row, 'TOTAL')
      })
    }
  }

  for (let col = 1; col <= 20; col++) ws.getColumn(col).width = 18
}

async function addDiseaseDetailSheet(wb, sheetName, procedure, start, end, type, fill) {
  const rows = await procedureRows({
    name: procedure,
    params: [
      { name: 'fechaInicio', type: sql.NVarChar, value: start },
      { name: 'fechaFin', type: sql.NVarChar, value: end },
    ],
    connection: 'general',
  })
  const ws = wb.addWorksheet(sanitizeSheetName(sheetName))
  addTable(ws, rows, { startRow: 1, headerFill: fill })
  return rows.length
}

const PFA_DIAGNOSTICS =
  "'G37.3','G61.9','G82.0','G82.2','G82.3','G90.0','G61.0','A86.X','A88.8','G03.0','G37.8','G72.8','G72.9','G82.5','G83.0','G83.1','G83.2','G83.3','G83.9','M86.1'"
const PFA_CATEGORIES = "'A80','A05','G83','G64'"

const PFA_CE_HEADERS = [
  'FechaIngreso',
  'IdPaciente',
  'NUMHC',
  'NroDocumento',
  'NOMBRES_PACIENTE',
  'SEXO',
  'Condicion_al_Servicio',
  'FuenteFinancia',
  'EDAD',
  'TIPOEDAD',
  'DireccionDomicilio',
  'Telefono',
  'Telefono2',
  'UBIGEO_DOMICLIO',
  'DISTRITO_DOMICILIO',
  'PAIS_PROCED',
  'DISTRITO_PROCEDEN',
  'PROVINCIA_PROCEDEN',
  'DEPARTAMENTO_PROCEDEN',
  'cod_Consultorio',
  'SERVICIO',
  'IDESPECIALIDAD',
  'ESPECIALIDAD',
  'IdOrigenAtencion',
  'EE_SS',
  'EE_SS_ORIGEN',
  'NroReferenciaOrigen',
  'Cod_Dx1',
  'Tipo_Dx1',
  'Des_Dx1',
  'Cod_Dx2',
  'Tipo_Dx2',
  'Des_Dx2',
  'Cod_Dx3',
  'Tipo_Dx3',
  'Des_Dx3',
]

const PFA_EMER_HEADERS = [
  'IdAtencion',
  'IdCuentaAtencion',
  'NUMHC',
  'NOMBRES',
  'APELLIDOS',
  'NroDocumento',
  'SEXO',
  'FECNAC',
  'EDAD',
  'TIPOEDAD',
  'DireccionDomicilio',
  'UBIGEO_DOMICLIO',
  'DISTRITO_DOMICILIO',
  'PAIS_PROCED',
  'DISTRITO_PROCEDEN',
  'PROVINCIA_PROCEDEN',
  'DEPARTAMENTO_PROCEDEN',
  'Prioridad',
  'FECHAINGRESO',
  'FECHAEGRESO',
  'ESTANCIA',
  'cod_Consultorio',
  'SERVICIO',
  'IDESPECIALIDAD',
  'ESPECIALIDAD',
  'CONDICION',
  'ESTADO_PAC',
  'Cod_Dx_Egs1',
  'Tipo_Dx_Egs1',
  'Des_Dx_Egs1',
  'Cod_Dx_Egs2',
  'Tipo_Dx_Egs2',
  'Des_Dx_Egs2',
  'Cod_Dx_Egs3',
  'Tipo_Dx_Egs3',
  'Des_Dx_Egs3',
  'Cod_Dx_Evol1',
  'Tipo_Dx_Evol1',
  'Des_Dx_Evol1',
  'Cod_Dx_Evol2',
  'Tipo_Dx_Evol2',
  'Des_Dx_Evol2',
  'Cod_Dx_Evol3',
  'Tipo_Dx_Evol3',
  'Des_Dx_Evol3',
  'Cod_Dx_Evol4',
  'Tipo_Dx_Evol4',
  'Des_Dx_Evol4',
  'Cod_Dx_Evol5',
  'Tipo_Dx_Evol5',
  'Des_Dx_Evol5',
  'Cod_Dx_Evol6',
  'Tipo_Dx_Evol6',
  'Des_Dx_Evol6',
  'CODCPT1',
  'DES_CPT1',
  'CODCPT2',
  'DES_CPT2',
  'CODCPT3',
  'DES_CPT3',
  'CODCPT4',
  'DES_CPT4',
  'nmuerto',
  'FECHAREG',
]

const PFA_HOSP_HEADERS = [
  'IdAtencion',
  'IdCuentaAtencion',
  'NUMHC',
  'NOMBRES',
  'APELLIDOS',
  'NroDocumento',
  'SEXO',
  'FECNAC',
  'EDAD',
  'TIPOEDAD',
  'DireccionDomicilio',
  'UBIGEO_DOMICLIO',
  'DISTRITO_DOMICILIO',
  'PAIS_PROCED',
  'DISTRITO_PROCEDEN',
  'PROVINCIA_PROCEDEN',
  'DEPARTAMENTO_PROCEDEN',
  'FECHAINGRESO',
  'FECHAEGRESO',
  'ESTANCIA',
  'cod_Consultorio',
  'SERVICIO',
  'IDESPECIALIDAD',
  'ESPECIALIDAD',
  'CONDICION',
  'ESTADO_PAC',
  'Cod_Dx_Egs1',
  'Tipo_Dx_Egs1',
  'Des_Dx_Egs1',
  'Cod_Dx_Egs2',
  'Tipo_Dx_Egs2',
  'Des_Dx_Egs2',
  'Cod_Dx_Egs3',
  'Tipo_Dx_Egs3',
  'Des_Dx_Egs3',
  'Cod_Dx_Egs4',
  'Tipo_Dx_Egs4',
  'Des_Dx_Egs4',
  'Cod_Dx_Evol1',
  'Tipo_Dx_Evol1',
  'Des_Dx_Evol1',
  'Cod_Dx_Evol3',
  'Tipo_Dx_Evol3',
  'Des_Dx_Evol3',
  'Cod_Dx_Evol4',
  'Tipo_Dx_Evol4',
  'Des_Dx_Evol4',
  'Cod_Dx_Evol5',
  'Tipo_Dx_Evol5',
  'Des_Dx_Evol5',
  'Cod_Dx_Evol6',
  'Tipo_Dx_Evol6',
  'Des_Dx_Evol6',
  'CODCPT1',
  'DES_CPT1',
  'CODCPT2',
  'DES_CPT2',
  'CODCPT3',
  'DES_CPT3',
  'CODCPT4',
  'DES_CPT4',
  'ESTADIO',
  'VALOR_T',
  'VALOR_N',
  'VALOR_M',
  'TRATAMIEN',
  'PROF_PARTO',
  'FEC_PARTO',
  'RNVIVO',
  'rnmuerto',
  'FECHAREG',
  'DES_CPT4',
  'rnmuerto',
  'FECHAREG',
]

const PFA_DATE_HEADERS = new Set(['FechaIngreso', 'FECNAC', 'FECHAINGRESO', 'FECHAEGRESO', 'FECHAREG', 'FEC_PARTO'])

function formatDateTimeForPfa(value) {
  if (!value) return ''

  if (value instanceof Date) {
    const year = value.getFullYear()
    const month = String(value.getMonth() + 1).padStart(2, '0')
    const day = String(value.getDate()).padStart(2, '0')
    const hour = String(value.getHours()).padStart(2, '0')
    const minute = String(value.getMinutes()).padStart(2, '0')
    const second = String(value.getSeconds()).padStart(2, '0')
    return `${year}-${month}-${day} ${hour}:${minute}:${second}`
  }

  const raw = String(value).trim()
  const match = raw.match(/^(\d{4})-(\d{2})-(\d{2})(?:[T\s](\d{2}):(\d{2})(?::(\d{2}))?)?/)
  if (!match) return raw

  const [, year, month, day, hour = '00', minute = '00', second = '00'] = match
  return `${year}-${month}-${day} ${hour}:${minute}:${second}`
}

function applyThinBorder(cell) {
  cell.border = {
    top: { style: 'thin', color: { argb: 'FFD5D5D5' } },
    left: { style: 'thin', color: { argb: 'FFD5D5D5' } },
    bottom: { style: 'thin', color: { argb: 'FFD5D5D5' } },
    right: { style: 'thin', color: { argb: 'FFD5D5D5' } },
  }
}

async function pfaRows(procedure, start, end) {
  return procedureRows({
    name: procedure,
    params: [
      { name: 'fechaInicio', type: sql.NVarChar, value: start },
      { name: 'fechaFin', type: sql.NVarChar, value: end },
    ],
    connection: 'general',
  })
}

async function pfaSummaryRows(start, end, type) {
  return procedureRows({
    name: 'sp_r_pfa_general',
    params: [
      { name: 'fechaInicio', type: sql.NVarChar, value: start },
      { name: 'fechaFin', type: sql.NVarChar, value: end },
      { name: 'tipo', type: sql.NVarChar, value: type },
    ],
    connection: 'general',
  })
}

async function addPfaSummarySheet(wb, start, end) {
  const ws = wb.addWorksheet('PFA_RESUMEN')
  ws.getCell('A1').value = 'DATOS DE ENFERMEDADES TRANSMISIBLES - PFA'
  ws.mergeCells('A1:C1')
  ws.getCell('A2').value = 'PERIODO:'
  ws.getCell('B2').value = `${formatDate(start)} al ${formatDate(end)}`
  ws.getCell('A3').value = 'DIAGNOSTICOS:'
  ws.getCell('B3').value = PFA_DIAGNOSTICS
  ws.mergeCells('B3:Q3')
  ws.getCell('A4').value = 'CATEGORIAS:'
  ws.getCell('B4').value = PFA_CATEGORIES

  for (let row = 1; row <= 100; row += 1) {
    ws.getRow(row).font = { name: 'Arial', size: 9 }
  }
  for (const cellRef of ['A1', 'A2', 'A3', 'A4']) {
    ws.getCell(cellRef).font = { name: 'Arial', size: 9, bold: true, color: { argb: 'FF000000' } }
  }

  const blocks = [
    { label: 'CONSULTORIO EXTERNO', type: 'CE', col: 2, fill: 'FFEFD032' },
    { label: 'EMERGENCIA', type: 'EM', col: 5, fill: 'FF73C6EA' },
    { label: 'HOSPITALIZACION', type: 'HO', col: 8, fill: 'FF73EAA7' },
  ]

  for (const block of blocks) {
    const dataRows = await pfaSummaryRows(start, end, block.type)

    ws.mergeCells(6, block.col, 6, block.col + 1)
    ws.getCell(6, block.col).value = block.label
    ws.getCell(7, block.col).value = 'MES'
    ws.getCell(7, block.col + 1).value = 'TOTAL ATENCIONES'

    for (const cell of [ws.getCell(6, block.col), ws.getCell(6, block.col + 1), ws.getCell(7, block.col), ws.getCell(7, block.col + 1)]) {
      cell.font = { name: 'Arial', size: 9, bold: true, color: { argb: 'FF000000' } }
      cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: block.fill } }
      cell.alignment = { horizontal: 'center', vertical: 'middle', wrapText: true }
      applyThinBorder(cell)
    }

    dataRows.forEach((row, index) => {
      ws.getCell(8 + index, block.col).value = valueFor(row, 'NMES')
      ws.getCell(8 + index, block.col + 1).value = valueFor(row, 'TOTAL')
    })
  }

  const widths = [14, 25, 19, 9, 6, 19, 9, 6, 19]
  widths.forEach((width, index) => {
    ws.getColumn(index + 1).width = width
  })
}

function addPfaDetailSheet(wb, sheetName, rows, headers, headerFill) {
  const ws = wb.addWorksheet(sheetName)
  const minimumRows = Math.max(rows.length + 1, 100)

  for (let row = 1; row <= minimumRows; row += 1) {
    const worksheetRow = ws.getRow(row)
    worksheetRow.font = { name: 'Arial', size: 9 }
    worksheetRow.height = 15
  }

  const headerRow = ws.getRow(1)
  headerRow.values = [, ...headers]
  headerRow.eachCell((cell) => {
    cell.font = { name: 'Arial', size: 9, bold: true, color: { argb: 'FF000000' } }
    cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: headerFill } }
    cell.alignment = { horizontal: 'center', vertical: 'middle', wrapText: true }
    applyThinBorder(cell)
  })

  rows.forEach((row, rowIndex) => {
    const excelRow = ws.getRow(2 + rowIndex)
    headers.forEach((header, columnIndex) => {
      const cell = excelRow.getCell(columnIndex + 1)
      const value = cleanCellValue(valueFor(row, header))
      cell.value = PFA_DATE_HEADERS.has(header) ? formatDateTimeForPfa(value) : value
      cell.alignment = { vertical: 'top', wrapText: true }
    })
  })

  headers.forEach((header, index) => {
    ws.getColumn(index + 1).width = Math.min(Math.max(String(header).length + 2, 10), 32)
  })
}

async function buildPfaWorkbook({ start, end }) {
  const wb = new ExcelJS.Workbook()
  await addPfaSummarySheet(wb, start, end)

  const ceRows = await pfaRows('sp_r_pfa_ce', start, end)
  const emRows = await pfaRows('sp_r_pfa_emer', start, end)
  const hoRows = await pfaRows('sp_r_pfa_hospi', start, end)

  addPfaDetailSheet(wb, 'PFA_CE', ceRows, PFA_CE_HEADERS, 'FFEFD032')
  addPfaDetailSheet(wb, 'PFA_EMER', emRows, PFA_EMER_HEADERS, 'FF73C6EA')
  addPfaDetailSheet(wb, 'PFA_HOSP', hoRows, PFA_HOSP_HEADERS, 'FF73EAA7')

  return {
    fileName: `PFA_${start}_${end}.xlsx`,
    mimeType: MIME_XLSX,
    content: await buildWorkbookBuffer(wb),
    rowCount: ceRows.length + emRows.length + hoRows.length,
  }
}

const FIXED_DISEASE_CONFIG = {
  sifilis: {
    filePrefix: 'SIFILIS',
    summarySheet: 'SIFILIS_RESUMEN',
    ceSheet: 'SIFILIS_CE',
    emerSheet: 'SIFILIS_EMER',
    hospSheet: 'SIFILIS_HOSP',
    title: 'DATOS DE ENFERMEDADES TRANSMISIBLES - SIFILIS',
    diagnostics: "'O98.1','P37.8'",
    categories: "'A50','A51','A52','A53'",
    summaryProcedure: 'sp_r_sifilis_general',
    secondarySummaryProcedure: 'sp_r_sifilis_general2',
    detailPrefix: 'sp_r_sifilis',
  },
  sarampion: {
    filePrefix: 'SARAMPION',
    summarySheet: 'SARAMPION_RESUMEN',
    ceSheet: 'Sarampion_CE',
    emerSheet: 'Sarampion_EMER',
    hospSheet: 'Sarampion_HOSP',
    title: 'DATOS DE ENFERMEDADES TRANSMISIBLES - SARAMPION',
    diagnostics: "'A38.X','A90.X / A97.0 '",
    categories: "'B05','B06','B08','B09X','P350'",
    summaryProcedure: 'sp_r_sarampion_general',
    detailPrefix: 'sp_r_sarampion',
  },
  rubeola: {
    filePrefix: 'SRC',
    summarySheet: 'SRC_RESUMEN',
    ceSheet: 'SRC_CE',
    emerSheet: 'SRC_EMER',
    hospSheet: 'SRC_HOSP',
    title: 'DATOS DE ENFERMEDADES TRANSMISIBLES - SARAMPION RUBEOLA CONGENITA',
    diagnostics: "'Q12.0','Q15.0','Q25.0','Q25.6'",
    categories: 'Q02',
    summaryProcedure: 'sp_r_rubeola_general',
    detailPrefix: 'sp_r_rubeola',
  },
}

async function diseaseSummaryRows(procedure, start, end, type) {
  return procedureRows({
    name: procedure,
    params: [
      { name: 'fechaInicio', type: sql.NVarChar, value: start },
      { name: 'fechaFin', type: sql.NVarChar, value: end },
      { name: 'tipo', type: sql.NVarChar, value: type },
    ],
    connection: 'general',
  })
}

function styleDiseaseSummaryBase(ws, title, diagnostics, categories, start, end) {
  ws.getCell('A1').value = title
  ws.mergeCells('A1:C1')
  ws.getCell('A2').value = 'PERIODO:'
  ws.getCell('B2').value = `${formatDate(start)} al ${formatDate(end)}`
  ws.getCell('A3').value = 'DIAGNOSTICOS:'
  ws.getCell('B3').value = diagnostics
  ws.mergeCells('B3:Q3')
  ws.getCell('A4').value = 'CATEGORIAS:'
  ws.getCell('B4').value = categories

  for (let row = 1; row <= 100; row += 1) {
    ws.getRow(row).font = { name: 'Arial', size: 9 }
  }
  for (const cellRef of ['A1', 'A2', 'A3', 'A4']) {
    ws.getCell(cellRef).font = { name: 'Arial', size: 9, bold: true, color: { argb: 'FF000000' } }
  }
  const widths = [14, 25, 19, 9, 6, 19, 9, 6, 19, 9, 25, 19, 9, 6, 19, 9, 6, 19]
  widths.forEach((width, index) => {
    ws.getColumn(index + 1).width = width
  })
}

function styleSummaryBlock(ws, row, col, label, fill) {
  ws.mergeCells(row, col, row, col + 1)
  ws.getCell(row, col).value = label
  ws.getCell(row + 1, col).value = 'MES'
  ws.getCell(row + 1, col + 1).value = 'TOTAL ATENCIONES'

  for (const cell of [
    ws.getCell(row, col),
    ws.getCell(row, col + 1),
    ws.getCell(row + 1, col),
    ws.getCell(row + 1, col + 1),
  ]) {
    cell.font = { name: 'Arial', size: 9, bold: true, color: { argb: 'FF000000' } }
    cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: fill } }
    cell.alignment = { horizontal: 'center', vertical: 'middle', wrapText: true }
    applyThinBorder(cell)
  }
}

async function fillSummaryBlock(ws, { procedure, start, end, type, col, headerRow, dataRow }) {
  const rows = await diseaseSummaryRows(procedure, start, end, type)
  const fill = type === 'CE' ? 'FFEFD032' : type === 'EM' ? 'FF73C6EA' : 'FF73EAA7'
  const label = type === 'CE' ? 'CONSULTORIO EXTERNO' : type === 'EM' ? 'EMERGENCIA' : 'HOSPITALIZACION'
  styleSummaryBlock(ws, headerRow, col, label, fill)
  rows.forEach((row, index) => {
    ws.getCell(dataRow + index, col).value = valueFor(row, 'NMES')
    ws.getCell(dataRow + index, col + 1).value = valueFor(row, 'TOTAL')
  })
}

async function addStandardDiseaseSummarySheet(wb, config, start, end) {
  const ws = wb.addWorksheet(config.summarySheet)
  styleDiseaseSummaryBase(ws, config.title, config.diagnostics, config.categories, start, end)

  await fillSummaryBlock(ws, { procedure: config.summaryProcedure, start, end, type: 'CE', col: 2, headerRow: 6, dataRow: 8 })
  await fillSummaryBlock(ws, { procedure: config.summaryProcedure, start, end, type: 'EM', col: 5, headerRow: 6, dataRow: 8 })
  await fillSummaryBlock(ws, { procedure: config.summaryProcedure, start, end, type: 'HO', col: 8, headerRow: 6, dataRow: 8 })
}

async function addSifilisSummarySheet(wb, config, start, end) {
  const ws = wb.addWorksheet(config.summarySheet)
  styleDiseaseSummaryBase(ws, config.title, config.diagnostics, config.categories, start, end)
  ws.getCell('B6').value = 'ATENCIONES EN TODAS LAS EDADES'
  ws.getCell('K6').value = 'ATENCIONES EN MENORES DE 1 AÑO'
  for (const cellRef of ['B6', 'K6']) {
    ws.getCell(cellRef).font = { name: 'Arial', size: 9, bold: true, color: { argb: 'FF000000' } }
  }

  await fillSummaryBlock(ws, { procedure: config.summaryProcedure, start, end, type: 'CE', col: 2, headerRow: 8, dataRow: 10 })
  await fillSummaryBlock(ws, { procedure: config.summaryProcedure, start, end, type: 'EM', col: 5, headerRow: 8, dataRow: 10 })
  await fillSummaryBlock(ws, { procedure: config.summaryProcedure, start, end, type: 'HO', col: 8, headerRow: 8, dataRow: 10 })
  await fillSummaryBlock(ws, { procedure: config.secondarySummaryProcedure, start, end, type: 'CE', col: 11, headerRow: 8, dataRow: 10 })
  await fillSummaryBlock(ws, { procedure: config.secondarySummaryProcedure, start, end, type: 'EM', col: 14, headerRow: 8, dataRow: 10 })
  await fillSummaryBlock(ws, { procedure: config.secondarySummaryProcedure, start, end, type: 'HO', col: 17, headerRow: 8, dataRow: 10 })
}

async function buildFixedDiseaseWorkbook({ subtype, start, end }) {
  const config = FIXED_DISEASE_CONFIG[subtype]
  const wb = new ExcelJS.Workbook()
  if (subtype === 'sifilis') {
    await addSifilisSummarySheet(wb, config, start, end)
  } else {
    await addStandardDiseaseSummarySheet(wb, config, start, end)
  }

  const ceRows = await pfaRows(`${config.detailPrefix}_ce`, start, end)
  const emRows = await pfaRows(`${config.detailPrefix}_emer`, start, end)
  const hoRows = await pfaRows(`${config.detailPrefix}_hospi`, start, end)

  addPfaDetailSheet(wb, config.ceSheet, ceRows, PFA_CE_HEADERS, 'FFEFD032')
  addPfaDetailSheet(wb, config.emerSheet, emRows, PFA_EMER_HEADERS, 'FF73C6EA')
  addPfaDetailSheet(wb, config.hospSheet, hoRows, PFA_HOSP_HEADERS, 'FF73EAA7')

  return {
    fileName: `${config.filePrefix}_${start}_${end}.xlsx`,
    mimeType: MIME_XLSX,
    content: await buildWorkbookBuffer(wb),
    rowCount: ceRows.length + emRows.length + hoRows.length,
  }
}

async function exportDisease({ subtype, startDate, endDate }) {
  const report = DISEASE_REPORTS[subtype]
  if (!report) {
    throw new Error('El subtipo de enfermedad transmisible no es valido.')
  }

  const { start, end } = assertRange(startDate, endDate)
  if (subtype === 'pfa') {
    return buildPfaWorkbook({ start, end })
  }
  if (FIXED_DISEASE_CONFIG[subtype]) {
    return buildFixedDiseaseWorkbook({ subtype, start, end })
  }

  const wb = new ExcelJS.Workbook()
  await addSummarySheet(wb, report, start, end)

  const ceCount = await addDiseaseDetailSheet(wb, `${report.title}_CE`, `${report.detailPrefix}_ce`, start, end, 'CE', 'FFEFD032')
  const emCount = await addDiseaseDetailSheet(wb, `${report.title}_EMER`, `${report.detailPrefix}_emer`, start, end, 'EM', 'FF73C6EA')
  const hoCount = await addDiseaseDetailSheet(wb, `${report.title}_HOSP`, `${report.detailPrefix}_hospi`, start, end, 'HO', 'FF73EAA7')

  return {
    fileName: `${report.filePrefix}_${start}_${end}.xlsx`,
    mimeType: MIME_XLSX,
    content: await buildWorkbookBuffer(wb),
    rowCount: ceCount + emCount + hoCount,
  }
}

const ISQX_REINGRESOS_COLUMNS = [
  { header: 'SITUACION', key: 'SITUACION', width: 14.85 },
  { header: 'Fecha de Cirugia', key: 'fechaInicioCirugia', width: 22.85, date: true },
  { header: 'Procedimiento realizado', key: 'PROCEDIMIENTO:', width: 27.42 },
  { header: 'Volvio en (Dias)', key: 'DIAS DESPUES', width: 19.41 },
  { header: 'UPSS de Regreso', key: 'TIPO', width: 13 },
  { header: 'IDATENCION', key: 'IDATENCION', width: 12.56 },
  { header: 'CuentaAtencion', key: 'idcuentaatencion', width: 17.13 },
  { header: 'NroHistoriaClinica', key: 'NroHistoriaClinica', width: 21.69 },
  { header: 'Tipo_doc', key: 'Tipo_doc', width: 10.27 },
  { header: 'NRODOCUMENTO', key: 'NRODOCUMENTO', width: 14.85 },
  { header: 'Paciente', key: 'PACIENTE', width: 28.55 },
  { header: 'Genero', key: 'Descripcion', width: 10.27 },
  { header: 'Especialidad', key: 'des_especialidad', width: 26.27 },
  { header: 'Consultorio', key: 'des_Consultorio', width: 23.98 },
  { header: 'FechaIngreso', key: 'FECHAINGRESO', width: 22.85, date: true },
  { header: 'Temperatura', key: 'TEMP', width: 13.7 },
  { header: 'Cita Motivo', key: 'CITAMOTIVO', width: 89.05 },
  { header: 'Aspecto General', key: 'ASPECTOGENERAL', width: 244.5 },
  { header: 'OTROS', key: 'OTROSEXREGIONAL', width: 162.23 },
  { header: 'CitaTratamiento', key: 'CITATRATAMIENTO', width: 18.27 },
  { header: 'CitaObservaciones', key: 'CITAOBSERVACIONES', width: 20.55 },
  { header: 'D1_CEXT', key: 'D1_CEX', width: 84.54 },
  { header: 'D2_CEXT', key: 'D2_CEX', width: 9.14 },
  { header: 'D3_CEXT', key: 'D3_CEX', width: 13 },
  { header: 'Motivo Emergencia', key: 'MOTIVO', width: 20.55 },
  { header: 'Relato Emergencia', key: 'RELATO', width: 13 },
  { header: 'Antecedentes', key: 'ANTECEDENTES', width: 14.85 },
  { header: 'EF GENERAL', key: 'EFGENERAL', width: 12.56 },
  { header: 'EF RESPIRATORIO', key: 'EFRESPIRATORIO', width: 18.27 },
  { header: 'EF CARDIOVASCULAR', key: 'EFCARDIOVASCULAR', width: 20.55 },
  { header: 'EF EF ABDOMEN', key: 'EFABDOMEN', width: 15.99 },
  { header: 'EF NEUROLOGICO', key: 'EFNEUROLOGICO', width: 17.13 },
  { header: 'OTROS EMERGENCIA', key: 'OTROS', width: 19.41 },
  { header: 'D1_EMER', key: 'D1_EME', width: 9.14 },
  { header: 'D2_EMER', key: 'D2_EME', width: 13 },
  { header: 'D3_EMER', key: 'D3_EME', width: 13 },
  { header: 'MEDICAM_ANTIB_1', key: 'MED1', width: 25.12 },
  { header: 'MEDICAM_ANTIB_2', key: 'MED2', width: 18.27 },
  { header: 'MEDICAM_ANTIB_3', key: 'MED3', width: 13 },
  { header: 'MEDICAM_ANTIB_4', key: 'MED4', width: 13 },
]

function formatDateTimeForIsqx(value) {
  if (!value) return ''

  if (value instanceof Date) {
    const year = value.getFullYear()
    const month = String(value.getMonth() + 1).padStart(2, '0')
    const day = String(value.getDate()).padStart(2, '0')
    const hour = String(value.getHours()).padStart(2, '0')
    const minute = String(value.getMinutes()).padStart(2, '0')
    const second = String(value.getSeconds()).padStart(2, '0')
    return `${year}-${month}-${day} ${hour}:${minute}:${second}`
  }

  const raw = String(value).trim()
  const match = raw.match(/^(\d{4})-(\d{2})-(\d{2})(?:[T\s](\d{2}):(\d{2})(?::(\d{2}))?)?/)
  if (!match) return raw

  const [, year, month, day, hour = '00', minute = '00', second = '00'] = match
  return `${year}-${month}-${day} ${hour}:${minute}:${second}`
}

async function buildIsqxReingresosWorkbook({ day, rows }) {
  const wb = new ExcelJS.Workbook()
  const ws = wb.addWorksheet('Reingresos Monitoreo')

  ws.mergeCells('A1:G1')
  ws.mergeCells('A2:G2')
  ws.mergeCells('A3:G3')
  ws.getCell('A1').value = 'Monitoreo de pacientes con reingresos segun los procedimientos del BAI ISQx'
  ws.getCell('A2').value = `Dia de monitoreo ${formatDate(day)}`
  ws.getCell('A3').value = `FECHA DE CORTE: ${limaCutoffStamp()}`

  for (const rowNumber of [1, 2, 3]) {
    const row = ws.getRow(rowNumber)
    row.height = 18
    for (let col = 1; col <= 7; col += 1) {
      const cell = row.getCell(col)
      cell.font = { name: 'Arial', size: 10, bold: true, color: { argb: 'FFFFFFFF' } }
      cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF3A85DE' } }
      cell.alignment = { horizontal: 'center', vertical: 'middle' }
    }
  }

  const headerRow = ws.getRow(5)
  headerRow.values = [, ...ISQX_REINGRESOS_COLUMNS.map((column) => column.header)]
  headerRow.height = 12.8
  for (let col = 1; col <= ISQX_REINGRESOS_COLUMNS.length; col += 1) {
    const cell = headerRow.getCell(col)
    cell.font = { name: 'Arial', size: 10, bold: true, color: { argb: 'FFFFFFFF' } }
    cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFA9A9A9' } }
    cell.alignment = { vertical: 'middle' }
  }

  ISQX_REINGRESOS_COLUMNS.forEach((column, index) => {
    ws.getColumn(index + 1).width = column.width
  })

  rows.forEach((sourceRow, rowIndex) => {
    const row = ws.getRow(6 + rowIndex)
    ISQX_REINGRESOS_COLUMNS.forEach((column, columnIndex) => {
      const cell = row.getCell(columnIndex + 1)
      const value = cleanCellValue(valueFor(sourceRow, column.key))
      cell.value = column.date ? formatDateTimeForIsqx(value) : value
      cell.font = { name: 'Arial', size: 10, color: { argb: 'FF000000' } }
      cell.alignment = { vertical: 'middle' }
    })
  })

  const minimumRows = Math.max(1000, rows.length + 5)
  for (let rowNumber = 1; rowNumber <= minimumRows; rowNumber += 1) {
    const row = ws.getRow(rowNumber)
    if (!row.height) row.height = 15
    row.font = row.font ?? { name: 'Arial', size: 10 }
  }

  return {
    fileName: `Monitoreo_BAI_ISQX_${day}.xlsx`,
    mimeType: MIME_XLSX,
    content: await buildWorkbookBuffer(wb),
    rowCount: rows.length,
  }
}

async function exportIsqxReingresos({ date }) {
  const day = assertDate(date, 'La fecha de monitoreo')
  const patients = await procedureRows({
    name: 'sp_r_reingreso_baiisqpac',
    params: [{ name: 'fecha', type: sql.NVarChar, value: day }],
    connection: 'sigh1',
  })

  const rows = []
  for (const patient of patients) {
    const history = valueFor(patient, 'NroHistoriaClinica')
    if (!history) continue
    const historyRows = await procedureRows({
      name: 'sp_r_reingresos_baiisqxhistoria',
      params: [
        { name: 'historia', type: sql.NVarChar, value: String(history) },
        { name: 'fecha', type: sql.NVarChar, value: day },
      ],
      connection: 'sigh1',
    })
    rows.push(...historyRows)
  }

  return buildIsqxReingresosWorkbook({ day, rows })
}

async function buildSimpleProcedureRowsWorkbook({ title, fileName, rows, startDate, endDate }) {
  const wb = new ExcelJS.Workbook()
  const ws = wb.addWorksheet(sanitizeSheetName(title))
  addTable(ws, rows, {
    title,
    subtitle: endDate ? `Periodo: ${formatDate(startDate)} al ${formatDate(endDate)}` : `Fecha: ${formatDate(startDate)}`,
  })
  return {
    fileName,
    mimeType: MIME_XLSX,
    content: await buildWorkbookBuffer(wb),
    rowCount: rows.length,
  }
}

async function exportIsqxOperados({ startDate, endDate }) {
  const { start, end } = assertRange(startDate, endDate)
  return buildSimpleProcedureWorkbook({
    title: 'Operados BAI ISQx',
    fileName: `Operados_${start}_${end}.xlsx`,
    procedure: 'sp_r_operados_baiisq',
    params: [
      { name: 'fechaInicio', type: sql.NVarChar, value: start },
      { name: 'fechaFin', type: sql.NVarChar, value: end },
    ],
    connection: 'general',
    startDate: start,
    endDate: end,
  })
}

const CANINA_COLUMNS = [
  { header: 'NroHistoriaClinica', source: 'NroHistoriaClinica', width: 19.41 },
  { header: 'NroDocumento', source: 'NroDocumento', width: 13.27 },
  { header: 'PACIENTE', source: 'PACIENTE', width: 24.55 },
  { header: 'Genero', source: 'TipoSexo', width: 7.14 },
  { header: 'IdCuentaAtencion', source: 'IdCuentaAtencion', width: 17.42 },
  { header: 'Condicion_EESS', source: 'Condicion_EESS', width: 15.27 },
  { header: 'PRIMER_SERVICIO', source: 'PRIMER_SERVICIO', width: 26.69 },
  { header: 'FechaIngreso', source: 'FechaIngreso', width: 20.41, date: true },
  { header: 'HoraIngreso', source: 'HoraIngreso', width: 12.27 },
  { header: 'ULTIMO_SERVICIO', source: 'ULTIMO_SERVICIO', width: 26.69 },
  { header: 'FechaEgreso', source: 'FechaEgreso', width: 20.41, date: true },
  { header: 'HoraEgreso', source: 'HoraEgreso', width: 11.27 },
  { header: 'FechaNacimiento', source: 'FechaNacimiento', width: 20.41, date: true },
  { header: 'Edad', source: 'Edad', width: 4.99 },
  { header: 'Tipoedad', source: 'TipoEdad', width: 9.14 },
  { header: 'DireccionDomicilio', source: 'DireccionDomicilio', width: 52.41 },
  { header: 'IdReniec', source: 'IdreniecProc', width: 9.14 },
  { header: 'DISTRITO', source: 'DistritoProc', width: 24.55 },
  { header: 'PROVINCIA', source: 'ProvinciaProc', width: 10.13 },
  { header: 'DEPARTAMENTO', source: 'DepartamentoProc', width: 13.27 },
  { header: 'ALTA', source: 'TipoAlta', width: 27.69 },
  { header: 'CONDICION_ALTA', source: 'CondicionAlta', width: 15.27 },
  { header: 'COD_DIAG_EGR1', source: 'COD_DIAG_ING1', width: 14.27 },
  { header: 'DES_DIAG_ING1', source: 'DES_DIAG_ING1', width: 19.41 },
  { header: 'TIPO_DIAG_ING1', source: 'TIPO_DIAG_ING1', width: 15.27 },
  { header: 'COD_DIAG_EGR1', source: 'COD_DIAG_EGR1', width: 14.27 },
  { header: 'DES_DIAG_EGR1', source: 'DES_DIAG_EGR1', width: 29.69 },
  { header: 'TIPO_DIAG_EGR2', source: 'TIPO_DIAG_EGR1', width: 15.27 },
  { header: 'DxEvoCovid', source: 'DxEvoCovid', width: 33.84 },
]

function formatDateTimeForCanina(value) {
  if (!value) return ''

  if (value instanceof Date) {
    const year = value.getFullYear()
    const month = String(value.getMonth() + 1).padStart(2, '0')
    const day = String(value.getDate()).padStart(2, '0')
    const hour = String(value.getHours()).padStart(2, '0')
    const minute = String(value.getMinutes()).padStart(2, '0')
    const second = String(value.getSeconds()).padStart(2, '0')
    return `${year}-${month}-${day} ${hour}:${minute}:${second}`
  }

  const raw = String(value).trim()
  const match = raw.match(/^(\d{4})-(\d{2})-(\d{2})(?:[T\s](\d{2}):(\d{2})(?::(\d{2}))?)?/)
  if (!match) return raw

  const [, year, month, day, hour = '00', minute = '00', second = '00'] = match
  return `${year}-${month}-${day} ${hour}:${minute}:${second}`
}

async function buildCaninaWorkbook({ start, end, rows }) {
  const wb = new ExcelJS.Workbook()
  const ws = wb.addWorksheet('Worksheet')

  ws.mergeCells('A1:H1')
  ws.getCell('A1').value = `LISTA DE PACIENTES CON DX MORDEDURAS (Desde ${start}  Hasta ${end})`
  ws.getCell('A1').font = { name: 'Arial', size: 12, bold: true, color: { argb: 'FF000000' } }
  ws.getCell('A1').alignment = { horizontal: 'center', vertical: 'middle' }
  ws.getRow(1).height = 12.8

  const headerRow = ws.getRow(2)
  headerRow.values = [, ...CANINA_COLUMNS.map((column) => column.header)]
  headerRow.height = 12.8
  for (let col = 1; col <= CANINA_COLUMNS.length; col += 1) {
    const cell = headerRow.getCell(col)
    cell.font = { name: 'Arial', size: 9, bold: true, color: { argb: 'FF000000' } }
    cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF73EAA7' } }
    cell.alignment = { horizontal: 'center', vertical: 'middle' }
  }

  CANINA_COLUMNS.forEach((column, index) => {
    ws.getColumn(index + 1).width = column.width
  })

  rows.forEach((sourceRow, rowIndex) => {
    const row = ws.getRow(3 + rowIndex)
    CANINA_COLUMNS.forEach((column, columnIndex) => {
      const cell = row.getCell(columnIndex + 1)
      const value = cleanCellValue(valueFor(sourceRow, column.source))
      cell.value = column.date ? formatDateTimeForCanina(value) : value
      cell.font = { name: 'Arial', size: 9, color: { argb: 'FF000000' } }
      cell.alignment = { horizontal: 'center', vertical: 'middle' }
    })
  })

  const minimumRows = Math.max(1000, rows.length + 2)
  for (let rowNumber = 1; rowNumber <= minimumRows; rowNumber += 1) {
    const row = ws.getRow(rowNumber)
    if (!row.height) row.height = 15
    row.font = row.font ?? { name: 'Arial', size: 9 }
  }

  return {
    fileName: `Mordedura_canina_${start}_${end}.xlsx`,
    mimeType: MIME_XLSX,
    content: await buildWorkbookBuffer(wb),
    rowCount: rows.length,
  }
}

async function exportCanina({ startDate, endDate }) {
  const { start, end } = assertRange(startDate, endDate)
  const rows = await procedureRows({
    name: 'sp_r_canino',
    params: [
      { name: 'fechaInicio', type: sql.NVarChar, value: start },
      { name: 'fechaFin', type: sql.NVarChar, value: end },
    ],
    connection: 'general',
  })
  return buildCaninaWorkbook({ start, end, rows })
}

const CIRUGIA_COLUMNS = [
  { header: 'Año', sources: ['Anio', 'Año'], width: 4.99 },
  { header: 'Mes', sources: ['Mes'], width: 3.99 },
  { header: 'Procedimiento', sources: ['Procedimiento'], width: 111.97 },
  { header: 'Cantidad', sources: ['CANTIDAD', 'Cantidad'], width: 9.14 },
  { header: 'Grupo de Procedimiento', sources: ['GrupoProcedimiento', 'Grupo de Procedimiento'], width: 73.97 },
]

function valueForAny(row, keys) {
  for (const key of keys) {
    const value = cleanCellValue(valueFor(row, key))
    if (value !== '') return value
  }
  return ''
}

const DENGUE_DNI_KEYS = ['DNI', 'NroDocumento', 'Nro_Documento', 'NumeroDocumento', 'Documento', 'NroDoc']
const DENGUE_DNI_LOOKUP_CHUNK_SIZE = 1000

function normalizeDenguePatientId(value) {
  const parsed = Number(value)
  return Number.isInteger(parsed) && parsed > 0 ? parsed : null
}

function dengueDniFor(row) {
  const dni = valueForAny(row, DENGUE_DNI_KEYS)
  return dni === '' ? '' : String(dni)
}

async function hydrateDengueDni(rows, connection) {
  if (!Array.isArray(rows) || !rows.length) return rows

  const patientIds = [
    ...new Set(
      rows
        .filter((row) => dengueDniFor(row) === '')
        .map((row) => normalizeDenguePatientId(valueForAny(row, ['IdPaciente'])))
        .filter((id) => id !== null),
    ),
  ]

  if (!patientIds.length) return rows

  const dniByPatientId = new Map()

  for (let index = 0; index < patientIds.length; index += DENGUE_DNI_LOOKUP_CHUNK_SIZE) {
    const chunk = patientIds.slice(index, index + DENGUE_DNI_LOOKUP_CHUNK_SIZE)
    const params = chunk.map((id, paramIndex) => ({
      name: `id${paramIndex}`,
      type: sql.Int,
      value: id,
    }))
    const placeholders = params.map((param) => `@${param.name}`).join(', ')
    const dniRows = await executeQuery(
      `
        SELECT
          P.IdPaciente,
          ISNULL(CONVERT(VARCHAR(20), P.NroDocumento), '') AS DNI
        FROM SIGH..Pacientes P
        WHERE P.IdPaciente IN (${placeholders})
      `,
      params,
      { connection, timeoutMs: TIMEOUT_MS },
    )

    dniRows.forEach((row) => {
      const patientId = normalizeDenguePatientId(row.IdPaciente)
      const dni = cleanCellValue(row.DNI)
      if (patientId !== null && dni !== '') {
        dniByPatientId.set(patientId, String(dni))
      }
    })
  }

  if (!dniByPatientId.size) return rows

  return rows.map((row) => {
    if (dengueDniFor(row) !== '') return row

    const patientId = normalizeDenguePatientId(valueForAny(row, ['IdPaciente']))
    const dni = patientId !== null ? dniByPatientId.get(patientId) : ''
    return dni ? { ...row, DNI: dni } : row
  })
}

async function buildCirugiaProcedimientoWorkbook({ start, end, rows }) {
  const wb = new ExcelJS.Workbook()
  const ws = wb.addWorksheet('Bai_Transm')

  ws.mergeCells('A1:G1')
  ws.mergeCells('A2:G2')
  ws.mergeCells('A3:G3')

  ws.getCell('A1').value = 'Procedimiento Quirúrgicos - Cirugías'
  ws.getCell('A2').value = `Del ${formatDate(start)} al ${formatDate(end)}`
  ws.getCell('A3').value = ''

  for (const rowNumber of [1, 2, 3]) {
    const row = ws.getRow(rowNumber)
    row.height = 12.8
    for (let col = 1; col <= 7; col += 1) {
      const cell = row.getCell(col)
      cell.font = { name: 'Arial', size: 9, bold: true, color: { argb: 'FF000000' } }
      cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFA2CEF1' } }
      cell.alignment = { horizontal: 'center', vertical: 'middle' }
    }
  }

  const headerRow = ws.getRow(5)
  headerRow.values = [, ...CIRUGIA_COLUMNS.map((column) => column.header)]
  headerRow.height = 12.8
  for (let col = 1; col <= CIRUGIA_COLUMNS.length; col += 1) {
    const cell = headerRow.getCell(col)
    cell.font = { name: 'Arial', size: 9, bold: true, color: { argb: 'FFFFFFFF' } }
    cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF9B9B9B' } }
    cell.alignment = { horizontal: 'left', vertical: 'middle' }
    applyThinBorder(cell)
  }

  CIRUGIA_COLUMNS.forEach((column, index) => {
    ws.getColumn(index + 1).width = column.width
  })
  for (let col = 6; col <= 14; col += 1) {
    ws.getColumn(col).width = 0.99
  }

  rows.forEach((sourceRow, rowIndex) => {
    const row = ws.getRow(6 + rowIndex)
    CIRUGIA_COLUMNS.forEach((column, columnIndex) => {
      const cell = row.getCell(columnIndex + 1)
      cell.value = valueForAny(sourceRow, column.sources)
      cell.font = { name: 'Arial', size: 9, color: { argb: 'FF000000' } }
      cell.alignment = { horizontal: 'left', vertical: 'middle' }
    })
  })

  const minimumRows = Math.max(1000, rows.length + 5)
  for (let rowNumber = 1; rowNumber <= minimumRows; rowNumber += 1) {
    const row = ws.getRow(rowNumber)
    if (!row.height) row.height = 15
    row.font = row.font ?? { name: 'Arial', size: 9 }
  }

  return {
    fileName: `Bai_Trans_${start}_${end}.xlsx`,
    mimeType: MIME_XLSX,
    content: await buildWorkbookBuffer(wb),
    rowCount: rows.length,
  }
}

async function exportCirugiaProcedimiento({ startDate, endDate }) {
  const { start, end } = assertRange(startDate, endDate)
  const rows = await procedureRows({
    name: 'sp_r_cirugias_procedimientos',
    params: [
      { name: 'fechaInicio', type: sql.NVarChar, value: start },
      { name: 'fechaFin', type: sql.NVarChar, value: end },
    ],
    connection: 'general',
  })
  return buildCirugiaProcedimientoWorkbook({ start, end, rows })
}

const DENGUE_CORTE_COLUMNS = [
  { header: 'IdAtencion', value: (row) => valueForAny(row, ['IdAtencion']) },
  { header: 'IdPaciente', value: (row) => valueForAny(row, ['IdPaciente']) },
  { header: 'DNI', value: dengueDniFor },
  { header: 'IdCuentaAtencion', value: (row) => valueForAny(row, ['IdCuentaAtencion']) },
  { header: 'FechaIngreso', value: (row) => formatDateForDengue(valueForAny(row, ['FechaIngreso'])) },
  { header: 'HoraIngreso', value: (row) => formatTimeAmPmForDengue(valueForAny(row, ['HoraIngreso'])) },
  { header: 'SerIngreso', value: (row) => valueForAny(row, ['SerIngreso']) },
  { header: 'Paciente', value: (row) => valueForAny(row, ['Paciente']) },
  { header: 'DestinoAtencion', value: (row) => valueForAny(row, ['DestinoAtencion']) },
  { header: 'CondicionAlta', value: (row) => valueForAny(row, ['CondicionAlta']) },
  { header: 'TipoAlta', value: (row) => valueForAny(row, ['TipoAlta']) },
  { header: 'FechaEgreso', value: (row) => formatDateForDengue(valueForAny(row, ['FechaEgreso'])) },
  { header: 'HoraEgreso', value: (row) => formatTimeAmPmForDengue(valueForAny(row, ['HoraEgreso'])) },
  { header: 'SerEgreso', value: (row) => valueForAny(row, ['SerEgreso']) },
  { header: 'Tipoedad', value: (row) => valueForAny(row, ['Tipoedad']) },
  { header: 'Edad', value: (row) => valueForAny(row, ['Edad']) },
  { header: 'Sexo', value: (row) => valueForAny(row, ['Sexo']) },
  { header: 'FechaConsulta', value: (row) => formatDateForDengue(valueForAny(row, ['FechaConsulta'])) },
  { header: 'DX_1', value: (row) => valueForAny(row, ['DX_1']) },
  { header: 'TIPO_1', value: (row) => valueForAny(row, ['TIPO_1']) },
  { header: 'DESDX_1', value: (row) => valueForAny(row, ['DESDX_1']) },
  { header: 'DX_2', value: (row) => valueForAny(row, ['DX_2']) },
  { header: 'TIPO_2', value: (row) => valueForAny(row, ['TIPO_2']) },
  { header: 'DESDX_2', value: (row) => valueForAny(row, ['DESDX_2']) },
  { header: 'DX_EVO_1', value: (row) => valueForAny(row, ['DX_EVO_1']) },
  { header: 'TIPO_DX_EVO_1', value: (row) => valueForAny(row, ['TIPO_DX_EVO_1']) },
  { header: 'DES_DX_EVO_1', value: (row) => valueForAny(row, ['DES_DX_EVO_1']) },
  { header: 'TIP_DXS1', value: (row) => valueForAny(row, ['TIP_DXS1']) },
  { header: 'COD_DXS1', value: (row) => valueForAny(row, ['COD_DXS1']) },
  { header: 'DES_DXS1', value: (row) => valueForAny(row, ['DES_DXS1']) },
  { header: 'TIP_DXR1', value: (row) => valueForAny(row, ['TIP_DXR1']) },
  { header: 'COD_DXR1', value: (row) => valueForAny(row, ['COD_DXR1']) },
  { header: 'DES_DXR1', value: (row) => valueForAny(row, ['DES_DXR1']) },
]

const DENGUE_COLUMN_WIDTHS = [
  13.0, 13.0, 12.0, 17.0, 13.0, 13.0, 27.99, 31.99, 18.0, 15.0, 18.0, 13.0, 13.0, 39.99, 13.0, 11.99, 13.0,
  18.0, 13.0, 13.0, 39.99, 13.0, 13.0, 39.99, 13.0, 16.0, 39.99, 13.0, 13.0, 39.99, 13.0, 13.0, 39.99,
]

function formatDateForDengue(value) {
  if (!value) return ''

  if (value instanceof Date) {
    const day = String(value.getDate()).padStart(2, '0')
    const month = String(value.getMonth() + 1).padStart(2, '0')
    const year = value.getFullYear()
    return `${day}/${month}/${year}`
  }

  const raw = String(value).trim()
  const match = raw.match(/^(\d{4})-(\d{2})-(\d{2})/)
  if (!match) return raw

  const [, year, month, day] = match
  return `${day}/${month}/${year}`
}

function formatTimeAmPmForDengue(value) {
  if (!value) return ''
  const raw = String(value).trim()
  const timeMatch = raw.match(/(\d{1,2}):(\d{2})/)
  if (!timeMatch) return raw

  let hour = Number(timeMatch[1])
  const minute = timeMatch[2]
  const suffix = hour >= 12 ? 'pm' : 'am'
  hour %= 12
  if (hour === 0) hour = 12
  return `${String(hour).padStart(2, '0')}:${minute} ${suffix}`
}

function parseDateTimeParts(value) {
  if (!value) return null
  if (value instanceof Date) {
    return {
      day: String(value.getDate()).padStart(2, '0'),
      month: String(value.getMonth() + 1).padStart(2, '0'),
      year: String(value.getFullYear()),
      hour24: String(value.getHours()).padStart(2, '0'),
      minute: String(value.getMinutes()).padStart(2, '0'),
    }
  }

  const raw = String(value).trim()
  const match = raw.match(/^(\d{4})-(\d{2})-(\d{2})(?:[T\s](\d{2}):(\d{2}))?/)
  if (!match) return null
  return {
    day: match[3],
    month: match[2],
    year: match[1],
    hour24: match[4] ?? '00',
    minute: match[5] ?? '00',
  }
}

function formatCutoffDateTime(value) {
  const parts = parseDateTimeParts(value)
  if (!parts) return limaCutoffStamp()
  let hour = Number(parts.hour24)
  const suffix = hour >= 12 ? 'pm' : 'am'
  hour %= 12
  if (hour === 0) hour = 12
  return `${parts.day}/${parts.month}/${parts.year} ${String(hour).padStart(2, '0')}:${parts.minute} ${suffix}`
}

async function buildDengueCorteWorkbook({ day, rows }) {
  const wb = new ExcelJS.Workbook()
  const ws = wb.addWorksheet('Hoja1')

  ws.mergeCells('A1:G2')
  ws.mergeCells('I1:K2')
  ws.getCell('A1').value = `PACIENTES HOSPITALIZADOS CON DENGUE AL ${formatDate(day)}`

  const cutoffSource = rows.length ? valueForAny(rows[0], ['FechaConsulta']) : null
  ws.getCell('I1').value = `FECHA DE CORTE: ${formatCutoffDateTime(cutoffSource)}`

  for (let rowNumber = 1; rowNumber <= 2; rowNumber += 1) {
    const row = ws.getRow(rowNumber)
    row.height = 12.8
    for (let col = 1; col <= 11; col += 1) {
      const cell = row.getCell(col)
      if ((col >= 1 && col <= 7) || (col >= 9 && col <= 11)) {
        cell.font = { name: 'Arial', size: 9, bold: true, color: { argb: 'FF000000' } }
        cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFF1D8A2' } }
        cell.alignment = { horizontal: 'center', vertical: 'middle', wrapText: true }
      }
    }
  }

  const headerRow = ws.getRow(4)
  headerRow.values = [, ...DENGUE_CORTE_COLUMNS.map((column) => column.header)]
  headerRow.height = 26
  for (let col = 1; col <= DENGUE_CORTE_COLUMNS.length; col += 1) {
    const cell = headerRow.getCell(col)
    cell.font = { name: 'Arial', size: 9, bold: true, color: { argb: 'FF000000' } }
    cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFE2C855' } }
    cell.alignment = { horizontal: 'center', vertical: 'middle', wrapText: true }
    applyThinBorder(cell)
  }

  DENGUE_COLUMN_WIDTHS.forEach((width, index) => {
    ws.getColumn(index + 1).width = width
  })
  for (let col = DENGUE_CORTE_COLUMNS.length + 1; col <= 52; col += 1) {
    ws.getColumn(col).width = 13
  }

  rows.forEach((sourceRow, rowIndex) => {
    const row = ws.getRow(5 + rowIndex)
    DENGUE_CORTE_COLUMNS.forEach((column, columnIndex) => {
      const cell = row.getCell(columnIndex + 1)
      cell.value = cleanCellValue(column.value(sourceRow))
      cell.font = { name: 'Arial', size: 9, color: { argb: 'FF000000' } }
      cell.alignment = { horizontal: 'center', vertical: 'middle' }
    })
  })

  const minimumRows = Math.max(1000, rows.length + 4)
  for (let rowNumber = 1; rowNumber <= minimumRows; rowNumber += 1) {
    const row = ws.getRow(rowNumber)
    if (!row.height) row.height = 15
    row.font = row.font ?? { name: 'Arial', size: 9 }
  }

  return {
    fileName: `HospitalizadosDengue_${day}.xlsx`,
    mimeType: MIME_XLSX,
    content: await buildWorkbookBuffer(wb),
    rowCount: rows.length,
  }
}

async function buildDengueRangoWorkbook({ start, end, rows }) {
  const wb = new ExcelJS.Workbook()
  const ws = wb.addWorksheet('Hoja1')

  ws.mergeCells('A1:G2')
  ws.mergeCells('I1:K2')
  ws.getCell('A1').value = `PACIENTES HOSPITALIZADOS CON DENGUE DEL ${formatDate(start)} AL ${formatDate(end)}`

  const cutoffSource = rows.length ? valueForAny(rows[0], ['FechaConsulta']) : null
  ws.getCell('I1').value = `FECHA DE CORTE: ${formatCutoffDateTime(cutoffSource)}`

  for (let rowNumber = 1; rowNumber <= 2; rowNumber += 1) {
    const row = ws.getRow(rowNumber)
    row.height = 12.8
    for (let col = 1; col <= 11; col += 1) {
      const cell = row.getCell(col)
      if ((col >= 1 && col <= 7) || (col >= 9 && col <= 11)) {
        cell.font = { name: 'Arial', size: 9, bold: true, color: { argb: 'FF000000' } }
        cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFF1D8A2' } }
        cell.alignment = { horizontal: 'center', vertical: 'middle', wrapText: true }
      }
    }
  }

  const headerRow = ws.getRow(4)
  headerRow.values = [, ...DENGUE_CORTE_COLUMNS.map((column) => column.header)]
  headerRow.height = 26
  for (let col = 1; col <= DENGUE_CORTE_COLUMNS.length; col += 1) {
    const cell = headerRow.getCell(col)
    cell.font = { name: 'Arial', size: 9, bold: true, color: { argb: 'FF000000' } }
    cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFE2C855' } }
    cell.alignment = { horizontal: 'center', vertical: 'middle', wrapText: true }
    applyThinBorder(cell)
  }

  DENGUE_COLUMN_WIDTHS.forEach((width, index) => {
    ws.getColumn(index + 1).width = width
  })
  for (let col = DENGUE_CORTE_COLUMNS.length + 1; col <= 52; col += 1) {
    ws.getColumn(col).width = 13
  }

  rows.forEach((sourceRow, rowIndex) => {
    const row = ws.getRow(5 + rowIndex)
    DENGUE_CORTE_COLUMNS.forEach((column, columnIndex) => {
      const cell = row.getCell(columnIndex + 1)
      cell.value = cleanCellValue(column.value(sourceRow))
      cell.font = { name: 'Arial', size: 9, color: { argb: 'FF000000' } }
      cell.alignment = { horizontal: 'center', vertical: 'middle' }
    })
  })

  const minimumRows = Math.max(1000, rows.length + 4)
  for (let rowNumber = 1; rowNumber <= minimumRows; rowNumber += 1) {
    const row = ws.getRow(rowNumber)
    if (!row.height) row.height = 15
    row.font = row.font ?? { name: 'Arial', size: 9 }
  }

  return {
    fileName: `HospitalizadosDengue_Rango_${start}_${end}.xlsx`,
    mimeType: MIME_XLSX,
    content: await buildWorkbookBuffer(wb),
    rowCount: rows.length,
  }
}

async function exportDengue({ startDate, endDate, date }) {
  const baseDate = date ?? startDate
  const { start, end } = assertRange(baseDate, endDate ?? baseDate)
  const isRange = start !== end
  if (!isRange) {
    const rows = await procedureRows({
      name: 'sp_r_hospitalizado_dengue',
      params: [{ name: 'fecha', type: sql.NVarChar, value: start }],
      connection: 'sigh1',
    })
    const rowsWithDni = await hydrateDengueDni(rows, 'sigh1')
    return buildDengueCorteWorkbook({ day: start, rows: rowsWithDni })
  }

  const rows = await procedureRows({
    name: 'sp_r_hospitalizado_dengue_rango',
    params: [
      { name: 'fechai', type: sql.NVarChar, value: start },
      { name: 'fechafin', type: sql.NVarChar, value: end },
    ],
    connection: 'sigh2',
  })
  const rowsWithDni = await hydrateDengueDni(rows, 'sigh2')
  return buildDengueRangoWorkbook({ start, end, rows: rowsWithDni })
}

export async function exportEpidemiologiaReporte({ report, subtype, startDate, endDate, date }) {
  switch (report) {
    case 'pacientes-oncologicos':
      return exportCancer({ startDate, endDate })
    case 'pfa-sifilis-sarampion':
      return exportDisease({ subtype, startDate, endDate })
    case 'isqx':
      return subtype === 'operados'
        ? exportIsqxOperados({ startDate, endDate })
        : exportIsqxReingresos({ date })
    case 'mordedura-canina':
      return exportCanina({ startDate, endDate })
    case 'cirugia-procedimiento':
      return exportCirugiaProcedimiento({ startDate, endDate })
    case 'seguimiento-dengue':
      return exportDengue({ startDate, endDate, date })
    default:
      throw new Error('El reporte solicitado no existe en Epidemiologia.')
  }
}
