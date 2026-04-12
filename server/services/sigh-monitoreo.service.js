import { executeProcedure, executeQuery, sql } from './legacy-sql.service.js'

const REPORT_TIMEOUT_MS = 180000

function parseNumeric(value) {
  const parsed = Number(value)
  return Number.isFinite(parsed) ? parsed : 0
}

function parseHoursFromLegacyTime(value) {
  if (value === null || value === undefined) {
    return 0
  }

  if (typeof value === 'number') {
    return value
  }

  const raw = String(value).trim()
  if (!raw) {
    return 0
  }

  if (/^\d+(\.\d+)?$/.test(raw)) {
    return Number(raw)
  }

  if (/^\d{1,2}:\d{2}(:\d{2})?$/.test(raw)) {
    const [hours, minutes] = raw.split(':')
    return parseNumeric(hours) + parseNumeric(minutes) / 60
  }

  const dayMatch = raw.match(/(\d+(?:\.\d+)?)\s*d/i)
  const hourMatch = raw.match(/(\d+(?:\.\d+)?)\s*h/i)
  const minuteMatch = raw.match(/(\d+(?:\.\d+)?)\s*m/i)

  if (dayMatch || hourMatch || minuteMatch) {
    const days = dayMatch ? parseNumeric(dayMatch[1]) : 0
    const hours = hourMatch ? parseNumeric(hourMatch[1]) : 0
    const minutes = minuteMatch ? parseNumeric(minuteMatch[1]) : 0
    return days * 24 + hours + minutes / 60
  }

  const hoursFromWords = raw.match(/(\d+(?:\.\d+)?)\s*hora/i)
  const daysFromWords = raw.match(/(\d+(?:\.\d+)?)\s*dia/i)
  const minutesFromWords = raw.match(/(\d+(?:\.\d+)?)\s*min/i)
  if (hoursFromWords || daysFromWords || minutesFromWords) {
    const days = daysFromWords ? parseNumeric(daysFromWords[1]) : 0
    const hours = hoursFromWords ? parseNumeric(hoursFromWords[1]) : 0
    const minutes = minutesFromWords ? parseNumeric(minutesFromWords[1]) : 0
    return days * 24 + hours + minutes / 60
  }

  return 0
}

function resolveAlertState(row) {
  const legacyState = String(row.ESTADO_REGISTRO_LLAMA ?? row.estado ?? '').trim().toUpperCase()
  const days = parseNumeric(row.DIASHOSP ?? row.dias)
  const hoursWithoutReport = parseHoursFromLegacyTime(row.TIEMPO_SIN_INFORME ?? row.tiempo)

  if ((days >= 1 && (legacyState === 'MAY24' || legacyState === 'NO')) || hoursWithoutReport >= 24) {
    return 'over24'
  }

  if (hoursWithoutReport >= 12 || legacyState === 'MAY12') {
    return 'over12'
  }

  return 'normal'
}

export async function listFamiliaPendienteUpss() {
  const rows = await executeQuery(
    `SELECT cod_upss AS codUpSs, des_upss AS desUpSs
     FROM T_Upss
     WHERE cod_upss IN (2,3,4,6)
     ORDER BY des_upss`,
    [],
    { timeoutMs: REPORT_TIMEOUT_MS },
  )

  return rows.map((row) => ({
    value: String(row.codUpSs ?? '').trim(),
    label: String(row.desUpSs ?? '').trim(),
  }))
}

export async function getFamiliaPendienteReport(upss) {
  const rows = await executeProcedure(
    'SP_REPORTE_FAMILIA_PENDIENTE',
    [{ name: 'upss', type: sql.NVarChar, value: String(upss ?? '').trim() }],
    { timeoutMs: REPORT_TIMEOUT_MS },
  )

  const mappedRows = rows.map((row) => {
    const alertState = resolveAlertState(row)
    return {
      servicioActual: String(row.SERVICIOACTUAL ?? '').trim(),
      idCuenta: String(row.IDCUENTA ?? '').trim(),
      paciente: String(row.PACIENTES ?? '').trim(),
      fechaIngreso: String(row.FECHAINGRESO ?? '').trim(),
      fechaUltInforme: String(row.FECHA_ULT_REG ?? '').trim(),
      seInformo: String(row.SEINFORMO ?? '').trim(),
      diasHosp: String(row.DIASHOSP ?? '').trim(),
      tiempoSinInforme: String(row.TIEMPO_SIN_INFORME ?? '').trim(),
      fechaCorte: String(row.FECHACORTE ?? '').trim(),
      estado: String(row.ESTADO_REGISTRO_LLAMA ?? '').trim(),
      alertState,
      raw: row,
    }
  })

  const counters = mappedRows.reduce(
    (accumulator, row) => {
      if (row.alertState === 'over24') {
        accumulator.over24 += 1
      } else if (row.alertState === 'over12') {
        accumulator.over12 += 1
      }

      return accumulator
    },
    { over12: 0, over24: 0 },
  )

  return {
    rows: mappedRows,
    counters,
  }
}

function escapeHtml(value) {
  return String(value ?? '')
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#039;')
}

function buildSpreadsheetHtml(title, rows) {
  const safeRows =
    rows.length > 0
      ? rows
      : [
          {
            mensaje: 'No se encontraron registros para los filtros solicitados.',
          },
        ]

  const headers = Object.keys(safeRows[0] ?? {})
  const thead = headers.map((header) => `<th>${escapeHtml(header)}</th>`).join('')
  const tbody = safeRows
    .map(
      (row) =>
        `<tr>${headers.map((header) => `<td>${escapeHtml(row[header])}</td>`).join('')}</tr>`,
    )
    .join('')

  return `<!DOCTYPE html>
<html>
  <head>
    <meta charset="utf-8" />
    <title>${escapeHtml(title)}</title>
  </head>
  <body>
    <table border="1">
      <thead>
        <tr>${thead}</tr>
      </thead>
      <tbody>${tbody}</tbody>
    </table>
  </body>
</html>`
}

export async function exportFamiliaPendienteNominal({ upss, empleadoId }) {
  const rows = await executeProcedure(
    'SP_REPORTE_FAMILIA_PENDIENTE',
    [{ name: 'upss', type: sql.NVarChar, value: String(upss ?? '').trim() }],
    { timeoutMs: REPORT_TIMEOUT_MS },
  )

  const mappedRows = rows.map((row) => ({
    servicioActual: String(row.SERVICIOACTUAL ?? '').trim(),
    idCuenta: String(row.IDCUENTA ?? '').trim(),
    paciente: String(row.PACIENTES ?? '').trim(),
    fechaIngreso: String(row.FECHAINGRESO ?? '').trim(),
    fechaUltInforme: String(row.FECHA_ULT_REG ?? '').trim(),
    seInformo: String(row.SEINFORMO ?? '').trim(),
    diasHosp: String(row.DIASHOSP ?? '').trim(),
    tiempoSinInforme: String(row.TIEMPO_SIN_INFORME ?? '').trim(),
    fechaCorte: String(row.FECHACORTE ?? '').trim(),
    estado: String(row.ESTADO_REGISTRO_LLAMA ?? '').trim(),
  }))

  return {
    fileName: 'reporte-informe-familia-pendiente.xls',
    mimeType: 'application/vnd.ms-excel; charset=utf-8',
    content: buildSpreadsheetHtml('Informe Familia Pendiente', mappedRows),
    rowCount: mappedRows.length,
  }
}
