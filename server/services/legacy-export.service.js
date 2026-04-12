import { executeProcedure, sql } from './legacy-sql.service.js'

const CURRENT_EXPORTS = {
  exportaxls_1: { procedure: 'SP_REPORTE_EXCEL1', fileName: 'reporte-informe-familia.xls' },
  exportaxls_2: { procedure: 'SP_REPORTE_EXCEL2', fileName: 'reporte-oxigenoterapia-hospitalizacion.xls' },
  exportaxls_3: { procedure: 'SP_REPORTE_EXCEL3', fileName: 'reporte-oxigenoterapia-emergencia-y-uci.xls' },
  exportaxls_10: { procedure: 'SP_REPORTE_EXCEL10', fileName: 'reporte-pacientes-hospitalizados-corte.xls' },
  exportaxls_int_a: { procedure: 'SP_REPORTE_EXCEL8A', fileName: 'reporte-interconsultas-uci.xls' },
  exportaxls_int_b: { procedure: 'SP_REPORTE_EXCEL8B', fileName: 'reporte-interconsultas-hospitalizacion.xls' },
  exportaxls_int_c: { procedure: 'SP_REPORTE_EXCEL8C', fileName: 'reporte-interconsultas-otros.xls' },
  exportaxls_4: { procedure: 'SP_REPORTE_EXCEL4', fileName: 'reporte-diario-pacientes-hospitalizados.xls' },
  exportaxls_5: { procedure: 'SP_REPORTE_EXCEL5', fileName: 'reporte-diario-pacientes-alta.xls' },
  exportaxls_6: { procedure: 'SP_REPORTE_EXCEL6', fileName: 'reporte-diario-pacientes-fallecidos.xls' },
  exportaxls_7: { procedure: 'SP_REPORTE_EXCEL7', fileName: 'reporte-diario-camas.xls' },
  exportaxls_8: { procedure: 'SP_REPORTE_EXCEL1_FAM', fileName: 'reporte-familia-programado.xls' },
  exportaxls_13: { procedure: 'SP_REPORTE_EXCEL13', fileName: 'reporte-pacientes-con-vacunas.xls' },
}

const CURRENT_EXPORTS_SIGH = {
  ...CURRENT_EXPORTS,
  exportaxls_10: { procedure: 'SP_REPORTE_EXCEL10_2026', fileName: 'reporte-pacientes-hospitalizados-corte.xls' },
}

const RANGE_EXPORTS = {
  exporta_d_xls_1: {
    procedure: 'SP_REPORTE_D_EXCEL1',
    fileName: 'historias-clinicas.xls',
    maxDays: 31,
  },
  exporta_d_xls_2: {
    procedure: 'SP_REPORTE_D_EXCEL2',
    fileName: 'atenciones-telemonitoreo.xls',
    maxDays: 31,
  },
  exporta_d_xls_3: {
    procedure: 'SP_REPORTE_D_EXCEL3',
    fileName: 'solicitud-teleorientacion.xls',
    maxDays: 31,
  },
  exporta_d_xls_4: {
    procedure: 'SP_REPORTE_D_EXCEL4',
    fileName: 'transferencias.xls',
    maxDays: 31,
  },
  exporta_d_xls_5: {
    procedure: 'SP_REPORTE_D_EXCEL5',
    fileName: 'pacientes-altas.xls',
    maxDays: 31,
  },
  exporta_d_xls_6: {
    procedure: 'SP_REPORTE_D_EXCEL6',
    fileName: 'pacientes-fallecidos.xls',
    maxDays: 31,
  },
  exporta_d_xls_6_h: {
    procedure: 'SP_REPORTE_D_EXCEL6_H',
    fileName: 'pacientes-fallecidos-hospitalizados.xls',
    maxDays: 31,
  },
  exporta_d_xls_7: {
    procedure: 'SP_REPORTE_D_EXCEL7',
    fileName: 'pacientes-referidos.xls',
    maxDays: 33,
  },
  exporta_d_xls_8: {
    procedure: 'SP_REPORTE_D_EXCEL8',
    fileName: 'pacientes-atendidos.xls',
    maxDays: 31,
  },
  exporta_d_xls_9: {
    procedure: 'SP_REPORTE_D_EXCEL9',
    fileName: 'interconsulta-uci-adultos.xls',
    maxDays: 31,
  },
  exporta_d_xls_10: {
    procedure: 'SP_REPORTE_D_EXCEL10',
    fileName: 'interconsulta-otros.xls',
    maxDays: 31,
  },
  exporta_d_xls_11: {
    procedure: 'SP_REPORTE_D_EXCEL11_A_2026',
    fileName: 'bai-morbilidad-materna-extrema.xls',
    maxDays: 92,
  },
  exporta_d_xls_12: {
    procedure: 'SP_REPORTE_D_EXCEL12',
    fileName: 'pacientes-hospitalizados.xls',
    maxDays: 31,
  },
  exporta_d_xls_13: {
    procedure: 'SP_REPORTE_D_EXCEL13',
    fileName: 'pacientes-nuevos-emergencia.xls',
    maxDays: 31,
  },
  exporta_d_xls_14: {
    procedure: 'SP_REPORTE_D_EXCEL14',
    fileName: 'pacientes-nuevos-uca.xls',
    maxDays: 31,
  },
  exporta_d_xls_15: {
    procedure: 'SP_REPORTE_D_EXCEL15',
    fileName: 'pacientes-ficha-covid.xls',
    maxDays: 31,
  },
  exporta_d_xls_16: {
    procedure: 'SP_REPORTE_D_EXCEL16',
    fileName: 'produccion-admision.xls',
    maxDays: 31,
  },
}

const SALUD_MENTAL_EXPORTS = {
  exporta_xls_1: { procedure: 'SP_REPORTE_SM_EXCEL_1', fileName: 'salud-mental-p0070610.xls' },
  exporta_xls_2: { procedure: 'SP_REPORTE_SM_EXCEL_2', fileName: 'salud-mental-p0060614.xls' },
  exporta_xls_3: { procedure: 'SP_REPORTE_SM_EXCEL_3', fileName: 'salud-mental-p0070611.xls' },
  exporta_xls_4: { procedure: 'SP_REPORTE_SM_EXCEL_4', fileName: 'salud-mental-p0070612.xls' },
  exporta_xls_5: { procedure: 'SP_REPORTE_SM_EXCEL_5', fileName: 'salud-mental-p5005190.xls' },
  exporta_xls_6: { procedure: 'SP_REPORTE_SM_EXCEL6', fileName: 'salud-mental-p5005190b.xls' },
  exporta_xls_7: { procedure: 'SP_REPORTE_SM_EXCEL_7', fileName: 'salud-mental-p5005927.xls' },
  exporta_xls_8: { procedure: 'SP_REPORTE_SM_EXCEL_8', fileName: 'salud-mental-p0070615.xls' },
  exporta_xls_9: { procedure: 'SP_REPORTE_SM_EXCEL_9', fileName: 'salud-mental-p0070616.xls' },
  exporta_xls_10: { procedure: 'SP_REPORTE_SM_EXCEL_10', fileName: 'salud-mental-p5005195.xls' },
  exporta_xls_11: { procedure: 'SP_REPORTE_SM_EXCEL_11', fileName: 'salud-mental-p5005192.xls' },
  exporta_xls_12: { procedure: 'SP_REPORTE_SM_EXCEL_12', fileName: 'salud-mental-tambcong.xls' },
  exporta_xls_13: { procedure: 'SP_REPORTE_SM_EXCEL_13', fileName: 'salud-mental-tespvsex.xls' },
  exporta_xls_14: { procedure: 'SP_REPORTE_SM_EXCEL_14', fileName: 'salud-mental-intaltab.xls' },
}

const LAVADO_EXPORTS = {
  listado_registro: {
    procedure: 'SP_EPI_REPORTE_LAVADO',
    fileName: 'registro-lavado-de-manos.xls',
  },
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

export async function validateLegacyUser({ dni, password, ip, scope = 'general' }) {
  const procedure = scope === 'lavado' ? 'SP_USUARIO_VALIDA_LM' : 'SP_USUARIO_VALIDA'
  const rows = await executeProcedure(procedure, [
    { name: 'dni', type: sql.NVarChar, value: dni },
    { name: 'password', type: sql.NVarChar, value: password },
    { name: 'ip', type: sql.NVarChar, value: ip },
  ])

  const row = rows[0]
  if (!row) {
    return {
      ok: false,
      employeeId: null,
      employeeName: '',
      message: 'El usuario no tiene autorizacion para este reporte.',
    }
  }

  return {
    ok: true,
    employeeId: row.IDEMPLEADO ?? row.idempleado ?? null,
    employeeName: row.EMPLEADO ?? row.empleado ?? '',
    message: 'Usuario aceptado.',
  }
}

function getExportDefinition(key, catalog) {
  const catalogs = {
    current: CURRENT_EXPORTS,
    'current-sigh': CURRENT_EXPORTS_SIGH,
    range: RANGE_EXPORTS,
    'salud-mental': SALUD_MENTAL_EXPORTS,
    lavado: LAVADO_EXPORTS,
  }

  const selected = catalogs[catalog]
  if (!selected) {
    return null
  }

  return selected[key] ?? null
}

function daysBetween(startDate, endDate) {
  const start = new Date(startDate)
  const end = new Date(endDate)
  return Math.floor(Math.abs(end.getTime() - start.getTime()) / 86400000) + 1
}

export async function executeConfiguredExport({
  catalog,
  key,
  employeeId,
  ip,
  startDate,
  endDate,
}) {
  const exportDefinition = getExportDefinition(key, catalog)

  if (!exportDefinition) {
    throw new Error('No se encontro la configuracion del exporte solicitado.')
  }

  if (exportDefinition.maxDays && startDate && endDate) {
    const diff = daysBetween(startDate, endDate)
    if (diff > exportDefinition.maxDays) {
      throw new Error(`El rango de fechas no debe exceder ${exportDefinition.maxDays} dias.`)
    }
  }

  const params =
    catalog === 'range'
      ? [
          { name: 'fini', type: sql.NVarChar, value: startDate },
          { name: 'ffin', type: sql.NVarChar, value: endDate },
          { name: 'idemp', type: sql.Int, value: Number(employeeId) || 0 },
          { name: 'ip', type: sql.NVarChar, value: ip },
        ]
      : catalog === 'salud-mental'
        ? [
            { name: 'fini', type: sql.NVarChar, value: startDate },
            { name: 'ffin', type: sql.NVarChar, value: endDate },
            { name: 'idemp', type: sql.Int, value: Number(employeeId) || 0 },
            { name: 'ip', type: sql.NVarChar, value: ip },
          ]
        : catalog === 'lavado'
          ? [
              { name: 'fini', type: sql.NVarChar, value: startDate },
              { name: 'ffin', type: sql.NVarChar, value: endDate },
            ]
        : [
            { name: 'idemp', type: sql.Int, value: Number(employeeId) || 0 },
            { name: 'ip', type: sql.NVarChar, value: ip },
          ]

  const rows = await executeProcedure(exportDefinition.procedure, params, {
    timeoutMs: 120000,
  })

  return {
    fileName: exportDefinition.fileName,
    mimeType: 'application/vnd.ms-excel; charset=utf-8',
    content: buildSpreadsheetHtml(exportDefinition.fileName, rows),
    rowCount: rows.length,
  }
}

export function listCatalogExports(catalog) {
  const catalogs = {
    current: CURRENT_EXPORTS,
    'current-sigh': CURRENT_EXPORTS_SIGH,
    range: RANGE_EXPORTS,
    'salud-mental': SALUD_MENTAL_EXPORTS,
    lavado: LAVADO_EXPORTS,
  }

  const selected = catalogs[catalog]
  if (!selected) {
    return []
  }

  return Object.entries(selected).map(([key, definition]) => ({
    key,
    fileName: definition.fileName,
    maxDays: definition.maxDays ?? null,
  }))
}
