import ExcelJS from 'exceljs'
import { executeProcedureRecordsets, sql } from './legacy-sql.service.js'
import { MIME_XLSX, getSheetNameFromFileName } from './excel-export.service.js'

const REPORT_TIMEOUT_MS = 180000
const PROCEDURE_NAME = 'dbo.usp_Reporteador_IndicadoresEficienciaExcel'
const MONTH_LABELS = ['Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun', 'Jul', 'Ago', 'Sep', 'Oct', 'Nov', 'Dic']
const HEADER_FILL = 'D7EDF7'
const TITLE_FILL = 'E7F5FE'
const DATA_SOURCE = 'Sisgalen Plus'
const MIN_REPORT_DATE = '2019-01-01'
const BORDER = {
  top: { style: 'thin' },
  left: { style: 'thin' },
  bottom: { style: 'thin' },
  right: { style: 'thin' },
}

function normalizeDate(value) {
  if (typeof value !== 'string') {
    return ''
  }

  return value.trim().slice(0, 10)
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

async function getEfficiencyRows(filters) {
  const [
    productividadPresencial = [],
    productividadTelemonitoreo = [],
    rendimientoPresencial = [],
    rendimientoTelemonitoreo = [],
    usoConsultorioPresencial = [],
    usoConsultorioTelemonitoreo = [],
    laboratorio = [],
    resolutividad = [],
    permanencia = [],
    sustitucion = [],
    ocupacion = [],
    rendimientoCama = [],
    salaOperaciones = [],
    salaEmergencia = [],
    salaProgramada = [],
  ] = await executeProcedureRecordsets(PROCEDURE_NAME, procedureParams(filters), {
    connection: 'general',
    timeoutMs: REPORT_TIMEOUT_MS,
  })

  return {
    productividadPresencial,
    productividadTelemonitoreo,
    rendimientoPresencial,
    rendimientoTelemonitoreo,
    usoConsultorioPresencial,
    usoConsultorioTelemonitoreo,
    laboratorio,
    resolutividad,
    permanencia,
    sustitucion,
    ocupacion,
    rendimientoCama,
    salaOperaciones,
    salaEmergencia,
    salaProgramada,
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

function toNullableNumber(value) {
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

function sortMonthlyRows(rows) {
  return [...rows].sort((left, right) => {
    const leftYear = Number(left.ANIO ?? left.Anio ?? left.anio ?? 0)
    const rightYear = Number(right.ANIO ?? right.Anio ?? right.anio ?? 0)
    const leftMonth = Number(left.MES ?? left.Mes ?? left.mes ?? 0)
    const rightMonth = Number(right.MES ?? right.Mes ?? right.mes ?? 0)

    return rightYear - leftYear || leftMonth - rightMonth
  })
}

function readRowValue(row, key) {
  return row[key] ?? row[key?.toLowerCase?.()] ?? row[key?.toUpperCase?.()]
}

function normalizeProcedureRows(rows, firstKey, secondKey) {
  return sortMonthlyRows(rows).map((row) => {
    const firstValue = toNumber(readRowValue(row, firstKey))
    const secondValue = toNumber(readRowValue(row, secondKey))
    const rawIndicator = row.INDICADOR ?? row.Indicador ?? row.indicador

    return {
      anio: Number(row.ANIO ?? row.Anio ?? row.anio ?? 0),
      mes: Number(row.MES ?? row.Mes ?? row.mes ?? 0),
      nmes: monthLabel(row),
      firstValue,
      secondValue,
      indicador: toNullableNumber(rawIndicator) ?? (secondValue ? firstValue / secondValue : null),
    }
  })
}

function calculateTotalIndicator(rows, firstTotal, secondTotal) {
  if (!secondTotal) {
    return null
  }

  const baseIndicator = firstTotal / secondTotal
  const sample = rows.find((row) => {
    const firstValue = Number(row.firstValue)
    const secondValue = Number(row.secondValue)
    const indicador = Number(row.indicador)

    return Number.isFinite(firstValue) && Number.isFinite(secondValue) && secondValue !== 0 && Number.isFinite(indicador)
  })

  if (!sample) {
    return baseIndicator
  }

  const sampleRatio = sample.firstValue / sample.secondValue

  if (!Number.isFinite(sampleRatio) || sampleRatio === 0) {
    return baseIndicator
  }

  const multiplier = sample.indicador / sampleRatio

  if (Math.abs(multiplier - 100) < 0.01) {
    return baseIndicator * 100
  }

  return baseIndicator
}

function buildSection({ title, headers, rows, firstKey, secondKey }) {
  return {
    title,
    headers,
    rows: normalizeProcedureRows(rows, firstKey, secondKey),
  }
}

function writeTotalRow(ws, rowNumber, section) {
  const firstTotal = section.rows.reduce((sum, row) => sum + toNumber(row.firstValue), 0)
  const secondTotal = section.rows.reduce((sum, row) => sum + toNumber(row.secondValue), 0)
  const indicatorTotal = calculateTotalIndicator(section.rows, firstTotal, secondTotal)
  const values = ['TOTAL', '', firstTotal, secondTotal, indicatorTotal]

  values.forEach((value, index) => {
    const cell = ws.getCell(rowNumber, index + 1)
    cell.value = value ?? ''
    applyTotalStyle(cell, {
      horizontal: index === 1 ? 'left' : 'center',
      numFmt: index === 2 || index === 3 ? '#,##0' : index === 4 ? '0.00' : undefined,
    })
  })

  ws.getRow(rowNumber).height = 20
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
  const totalCols = section.headers.length
  ws.mergeCells(startRow, 1, startRow, totalCols)

  const titleCell = ws.getCell(startRow, 1)
  titleCell.value = section.title
  titleCell.fill = argbFill(TITLE_FILL)
  titleCell.font = { bold: true, size: 11, color: { argb: 'FF123B63' } }
  titleCell.border = BORDER
  titleCell.alignment = { horizontal: 'left', vertical: 'middle', wrapText: true }
  ws.getRow(startRow).height = 22

  const headerRow = startRow + 1

  section.headers.forEach((header, index) => {
    const cell = ws.getCell(headerRow, index + 1)
    cell.value = header
    applyHeaderStyle(cell)
  })

  ws.getRow(headerRow).height = 34

  if (section.rows.length === 0) {
    ws.mergeCells(headerRow + 1, 1, headerRow + 1, totalCols)

    const emptyCell = ws.getCell(headerRow + 1, 1)
    emptyCell.value = 'No se encontraron registros para el rango seleccionado.'
    applyDataStyle(emptyCell, { horizontal: 'center' })

    const totalRow = headerRow + 2
    writeTotalRow(ws, totalRow, section)

    const sourceRow = totalRow + 1
    writeSourceNote(ws, sourceRow, totalCols)

    return sourceRow + 3
  }

  section.rows.forEach((row, index) => {
    const excelRow = headerRow + index + 1
    const values = [row.anio, row.nmes, row.firstValue, row.secondValue, row.indicador]

    values.forEach((value, colIndex) => {
      const cell = ws.getCell(excelRow, colIndex + 1)
      cell.value = value ?? ''
      applyDataStyle(cell, {
        horizontal: colIndex === 1 ? 'left' : 'center',
        numFmt: colIndex === 2 || colIndex === 3 ? '#,##0' : colIndex === 4 ? '0.00' : undefined,
      })
    })
  })

  const totalRow = headerRow + section.rows.length + 1
  writeTotalRow(ws, totalRow, section)

  const sourceRow = totalRow + 1
  writeSourceNote(ws, sourceRow, totalCols)

  return sourceRow + 3
}

function setupWorksheet(ws) {
  ws.columns = [
    { width: 11 },
    { width: 10 },
    { width: 42 },
    { width: 42 },
    { width: 13 },
  ]
}

function buildSheets(rows) {
  return [
    {
      name: 'Hora-Medico',
      sections: [
        buildSection({
          title: '1. Productividad Hora Medico (Presencial)',
          headers: ['Año/Mes', 'NMES', 'Total de atenciones medicas', 'Total de horas medico programadas', 'Indicador'],
          rows: rows.productividadPresencial,
          firstKey: 'ATENCIONES',
          secondKey: 'HORASMEDICAS',
        }),
        buildSection({
          title: '2. Productividad Hora Medico (Telemonitoreo)',
          headers: ['Año/Mes', 'NMES', 'Total de atenciones medicas', 'Total de horas medico programadas', 'Indicador'],
          rows: rows.productividadTelemonitoreo,
          firstKey: 'ATENCIONES',
          secondKey: 'HORASMEDICAS',
        }),
        buildSection({
          title: '3. Rendimiento Hora Medico (Presencial)',
          headers: ['Año/Mes', 'NMES', 'Total de atenciones medicas realizadas', 'Total de horas medico efectivas', 'Indicador (%)'],
          rows: rows.rendimientoPresencial,
          firstKey: 'ATENCIONES',
          secondKey: 'HORASMEDICAS',
        }),
        buildSection({
          title: '4. Rendimiento Hora Medico (Telemonitoreo)',
          headers: ['Año/Mes', 'NMES', 'Total de atenciones medicas realizadas', 'Total de horas medico efectivas', 'Indicador (%)'],
          rows: rows.rendimientoTelemonitoreo,
          firstKey: 'ATENCIONES',
          secondKey: 'HORASMEDICAS',
        }),
      ],
    },
    {
      name: 'Utilizacion de consultorios',
      sections: [
        buildSection({
          title: '5. Utilizacion de consultorio (Presencial)',
          headers: ['Año/Mes', 'NMES', 'Total de consultorios funcionales (Programados)', 'Total de consultorios fisicos (disponibles)', 'Indicador'],
          rows: rows.usoConsultorioPresencial,
          firstKey: 'FUNCIONAL',
          secondKey: 'FISICO',
        }),
        buildSection({
          title: '6. Utilizacion de consultorio (Telemonitoreo)',
          headers: ['Año/Mes', 'NMES', 'Total de consultorios funcionales (Programados)', 'Total de consultorios fisicos (disponibles)', 'Indicador'],
          rows: rows.usoConsultorioTelemonitoreo,
          firstKey: 'FUNCIONAL',
          secondKey: 'FISICO',
        }),
      ],
    },
    {
      name: 'Cama',
      sections: [
        buildSection({
          title: '1. Promedio permanencia cama',
          headers: ['Año/Mes', 'NMES', 'Total dias de estancia de los egresos en Hospitalizacion', 'Total de egresos hospitalarios', 'Indicador'],
          rows: rows.permanencia,
          firstKey: 'ESTANCIA',
          secondKey: 'EGRESOS',
        }),
        buildSection({
          title: '2. Intervalo Sustitucion Cama',
          headers: ['Año/Mes', 'NMES', 'Total dias cama disponible - Total paciente dia', 'Total de egresos hospitalarios', 'Indicador'],
          rows: rows.sustitucion,
          firstKey: 'DIFEREN1',
          secondKey: 'EGRESOS',
        }),
        buildSection({
          title: '3. Porcentaje Ocupacion Cama',
          headers: ['Año/Mes', 'NMES', 'Total Paciente Dia', 'Total camas dias disponibles', 'Indicador (%)'],
          rows: rows.ocupacion,
          firstKey: 'PACDIA',
          secondKey: 'CAMADIA',
        }),
        buildSection({
          title: '4. Rendimiento cama',
          headers: ['Año/Mes', 'NMES', 'Total egresos hospitalarios', 'Promedio de camas disponibles', 'Indicador'],
          rows: rows.rendimientoCama,
          firstKey: 'EGRESOS',
          secondKey: 'CAMAS',
        }),
      ],
    },
    {
      name: 'Sala de operaciones',
      sections: [
        buildSection({
          title: '1. Rendimiento Sala Operaciones',
          headers: ['Año/Mes', 'NMES', 'Total de intervenciones quirurgicas realizadas', 'Total de salas de operaciones utilizadas (Por turno de 06 horas)', 'Indicador'],
          rows: rows.salaOperaciones,
          firstKey: 'TOTINTQX',
          secondKey: 'TOTSALAS',
        }),
        buildSection({
          title: '2. Rendimiento Sala Operaciones (Emergencia)',
          headers: ['Año/Mes', 'NMES', 'Total de intervenciones quirurgicas de emergencias', 'Total de salas de operaciones utilizadas (Por turno de 12 horas)', 'Indicador'],
          rows: rows.salaEmergencia,
          firstKey: 'TOTINTQX',
          secondKey: 'TOTSALAS',
        }),
        buildSection({
          title: '3. Rendimiento Sala Operaciones (Programadas)',
          headers: ['Año/Mes', 'NMES', 'Total de intervenciones quirurgicas electivas o programadas realizadas', 'Total de salas de operaciones utilizadas (Por turno de 06 horas)', 'Indicador'],
          rows: rows.salaProgramada,
          firstKey: 'TOTINTQX',
          secondKey: 'TOTSALAS',
        }),
      ],
    },
    {
      name: 'Examenes - Resolutividad',
      sections: [
        buildSection({
          title: '1. Promedio de Examenes de Laboratorio por consulta externa',
          headers: ['Año/Mes', 'NMES', 'Total de examenes de laboratorio indicados en consulta externa y ejecutados', 'Total de atenciones medicas realizadas en consulta externa', 'Indicador'],
          rows: rows.laboratorio,
          firstKey: 'NROPRUEBAS',
          secondKey: 'ATENCIONES',
        }),
        buildSection({
          title: '2. Grado de Resolutividad',
          headers: ['Año/Mes', 'NMES', 'Total de referencias solicitadas de consulta externa y emergencia enviadas', 'Total de atenciones medicas en consulta externa + total de atenciones medicas en emergencia', 'Indicador (%)'],
          rows: rows.resolutividad,
          firstKey: 'NROSOLICITUD',
          secondKey: 'ATENCIONES',
        }),
      ],
    },
  ]
}

async function buildEfficiencyWorkbook({ filters }) {
  const rows = await getEfficiencyRows(filters)
  const wb = new ExcelJS.Workbook()
  wb.creator = 'Reporteador-2.0'
  wb.created = new Date()

  for (const sheet of buildSheets(rows)) {
    const ws = wb.addWorksheet(getSheetNameFromFileName(sheet.name))
    setupWorksheet(ws)

    let rowCursor = 1

    for (const section of sheet.sections) {
      rowCursor = writeSection(ws, section, rowCursor)
    }
  }

  return wb.xlsx.writeBuffer()
}

export async function exportEfficiencyIndicatorsExcel(rawFilters = {}) {
  const filters = parseDateRange(rawFilters)
  const content = await buildEfficiencyWorkbook({ filters })

  return {
    content,
    fileName: `indicadores-eficiencia_${filters.fechaInicio}_${filters.fechaFin}.xlsx`,
    mimeType: MIME_XLSX,
  }
}
