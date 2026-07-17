import { executeProcedure_Sigh1 as executeProcedure, sql } from './sigh-sql-helpers.js'

const REPORT_TIMEOUT_MS = 180000

function parseNumeric(value) {
  const parsed = Number(value)
  return Number.isFinite(parsed) ? parsed : 0
}

function resolveAlertState(row) {
  const legacyState = String(row.ESTADO_REGISTRO_LLAMA ?? row.estado ?? '').trim().toUpperCase()
  const days = parseNumeric(row.DIASHOSP ?? row.dias)

  if (days >= 1 && (legacyState === 'MAY24' || legacyState === 'NO')) {
    return 'over24'
  }

  return 'over12'
}

export async function listFamiliaPendienteUpss() {
  const rows = await executeProcedure('SP_APP_FAMILIA_PENDIENTE_UPSS', [], { timeoutMs: REPORT_TIMEOUT_MS })

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
