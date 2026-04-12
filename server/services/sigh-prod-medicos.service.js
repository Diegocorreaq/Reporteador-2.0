import { executeProcedure, executeQuery, sql } from './legacy-sql.service.js'

const REPORT_TIMEOUT_MS = 180000
const MAX_RANGE_DAYS = 31

function toDateOnly(value) {
  return String(value ?? '').trim().slice(0, 10)
}

function validateDateRange(fechaInicio, fechaFin) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(fechaInicio) || !/^\d{4}-\d{2}-\d{2}$/.test(fechaFin)) {
    throw new Error('Las fechas deben enviarse en formato YYYY-MM-DD.')
  }

  if (fechaInicio > fechaFin) {
    throw new Error('La fecha de inicio no puede ser mayor que la fecha fin.')
  }

  const start = new Date(`${fechaInicio}T00:00:00`)
  const end = new Date(`${fechaFin}T00:00:00`)
  const days = Math.floor(Math.abs(end.getTime() - start.getTime()) / 86400000) + 1
  if (days > MAX_RANGE_DAYS) {
    throw new Error(`El rango de fechas no debe exceder ${MAX_RANGE_DAYS} dias.`)
  }

  return days
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

function buildPrintableHtml(title, subtitle, rows) {
  const safeRows =
    rows.length > 0
      ? rows
      : [
          {
            mensaje: 'No se encontraron registros para los filtros solicitados.',
          },
        ]

  const headers = Object.keys(safeRows[0] ?? {})
  const tableHeaders = headers.map((header) => `<th>${escapeHtml(header)}</th>`).join('')
  const tableRows = safeRows
    .map(
      (row) =>
        `<tr>${headers.map((header) => `<td>${escapeHtml(row[header])}</td>`).join('')}</tr>`,
    )
    .join('')

  return `<!DOCTYPE html>
<html lang="es">
  <head>
    <meta charset="utf-8" />
    <title>${escapeHtml(title)}</title>
    <style>
      body {
        font-family: Arial, sans-serif;
        margin: 24px;
        color: #1f2937;
      }
      h1 {
        font-size: 18px;
        margin: 0 0 8px 0;
      }
      p {
        margin: 0 0 16px 0;
        font-size: 13px;
      }
      table {
        border-collapse: collapse;
        width: 100%;
        font-size: 12px;
      }
      th,
      td {
        border: 1px solid #d1d5db;
        padding: 6px 8px;
        vertical-align: top;
      }
      th {
        background: #eff6ff;
        text-transform: uppercase;
        font-size: 11px;
      }
      @media print {
        body {
          margin: 8px;
        }
      }
    </style>
  </head>
  <body>
    <h1>${escapeHtml(title)}</h1>
    <p>${escapeHtml(subtitle)}</p>
    <table>
      <thead>
        <tr>${tableHeaders}</tr>
      </thead>
      <tbody>${tableRows}</tbody>
    </table>
  </body>
</html>`
}

export async function searchProduccionMedicos(term) {
  const queryTerm = String(term ?? '').trim()
  if (queryTerm.length < 3) {
    return []
  }

  const rows = await executeQuery(
    `SELECT D1.*
     FROM (
       SELECT
         IDEMPLEADO AS idEmpleado,
         DNI AS dni,
         UPPER(ApellidoPaterno + ' ' + ApellidoMaterno + ' ' + Nombres) AS empleado,
         UPPER(TE.Descripcion) AS tipoEmpleado
       FROM SIGH..Empleados E
       INNER JOIN SIGH..TiposEmpleado TE ON TE.IdTipoEmpleado = E.IdTipoEmpleado
       WHERE (TE.Abreviatura = 'M. C.' OR E.IdTipoEmpleado IN (247,55,234,239))
     ) D1
     WHERE D1.empleado LIKE @term + '%'`,
    [{ name: 'term', type: sql.NVarChar, value: queryTerm }],
    { timeoutMs: REPORT_TIMEOUT_MS },
  )

  return rows.map((row) => ({
    idEmpleado: Number(row.idEmpleado ?? 0),
    dni: String(row.dni ?? '').trim(),
    empleado: String(row.empleado ?? '').trim(),
    especialidad: String(row.tipoEmpleado ?? '').trim(),
  }))
}

export async function getProduccionMedicosResumen(filters) {
  const fechaInicio = toDateOnly(filters.fechaInicio)
  const fechaFin = toDateOnly(filters.fechaFin)
  const empleadoId = Number(filters.empleadoId ?? 0)

  if (!empleadoId) {
    throw new Error('Debe seleccionar un profesional valido.')
  }

  validateDateRange(fechaInicio, fechaFin)

  const [daysRows, summaryRows] = await Promise.all([
    executeProcedure(
      'SP_REPORTE_PROD_MED_FECHA',
      [
        { name: 'fecini', type: sql.NVarChar, value: fechaInicio },
        { name: 'fecfin', type: sql.NVarChar, value: fechaFin },
      ],
      { timeoutMs: REPORT_TIMEOUT_MS },
    ),
    executeProcedure(
      'SP_REPORTE_PRODUCCION_P1',
      [
        { name: 'feci', type: sql.NVarChar, value: fechaInicio },
        { name: 'fecf', type: sql.NVarChar, value: fechaFin },
        { name: 'dni', type: sql.Int, value: empleadoId },
      ],
      { timeoutMs: REPORT_TIMEOUT_MS },
    ),
  ])

  const dayRange = daysRows[0]
    ? {
        diaInicio: Number(daysRows[0].DIA_INI ?? 1),
        diaFin: Number(daysRows[0].DIA_FIN ?? 1),
        numeroDias: Number(daysRows[0].NRO_DIA ?? 1),
      }
    : null

  return {
    filters: { fechaInicio, fechaFin, empleadoId },
    dayRange,
    rows: summaryRows,
  }
}

export async function getProduccionMedicosDetalle(filters) {
  const fechaInicio = toDateOnly(filters.fechaInicio)
  const fechaFin = toDateOnly(filters.fechaFin)
  const empleadoId = Number(filters.empleadoId ?? 0)
  const orden = Number(filters.orden ?? 0)

  if (!empleadoId || !orden) {
    throw new Error('Faltan parametros para consultar el detalle.')
  }

  validateDateRange(fechaInicio, fechaFin)

  const rows = await executeProcedure(
    'SP_REPORTE_PRODUCCION_P2',
    [
      { name: 'feci', type: sql.NVarChar, value: fechaInicio },
      { name: 'fecf', type: sql.NVarChar, value: fechaFin },
      { name: 'idemp', type: sql.Int, value: empleadoId },
    ],
    { timeoutMs: REPORT_TIMEOUT_MS },
  )

  const filtered = rows.filter((row) => Number(row.COD_ACT ?? row.cod_act ?? 0) === orden)

  return {
    filters: { fechaInicio, fechaFin, empleadoId, orden },
    rows: filtered,
  }
}

export async function exportProduccionMedicosExcel(filters) {
  const report = await getProduccionMedicosResumen(filters)
  const content = buildSpreadsheetHtml('produccion-medicos.xls', report.rows)

  return {
    fileName: 'produccion-medicos.xls',
    mimeType: 'application/vnd.ms-excel; charset=utf-8',
    content,
  }
}

export async function exportProduccionMedicosPdf(filters) {
  const report = await getProduccionMedicosResumen(filters)
  const subtitle = `Periodo: ${report.filters.fechaInicio} al ${report.filters.fechaFin}`
  const content = buildPrintableHtml('Produccion de Actividades Realizadas y Registradas', subtitle, report.rows)

  return {
    fileName: 'produccion-medicos.html',
    mimeType: 'text/html; charset=utf-8',
    content,
  }
}
