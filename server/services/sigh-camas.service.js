import { executeProcedure_Sigh1 as executeProcedure, executeQuery_Sigh1 as executeQuery, sql } from './sigh-sql-helpers.js'

const REPORT_TIMEOUT_MS = 180000

function normalizeRows(rows = []) {
  return rows.map((row) =>
    Object.fromEntries(Object.entries(row).map(([key, value]) => [key, value ?? ''])),
  )
}

const DETAIL_PROCEDURE_BY_TYPE = {
  '1': { procedure: 'SP_CAMA_DETALLE_1', params: ['idServicio', 'tipo'] },
  '2': { procedure: 'SP_CAMA_DETALLE_2', params: ['idServicio', 'tipo'] },
  '3': { procedure: 'SP_CAMA_DETALLE_3', params: ['idServicio', 'tipo'] },
  '4': { procedure: 'SP_CAMA_DETALLE_4', params: ['idServicio', 'tipo'] },
  '5': { procedure: 'SP_CAMA_DETALLE_5', params: ['idServicio', 'tipo'] },
  '6': { procedure: 'SP_CAMA_DETALLE_6', params: ['idServicio'] },
  '7': { procedure: 'SP_CAMA_DETALLE_7', params: ['idServicio'] },
  '8': { procedure: 'SP_CAMA_DETALLE_8', params: ['idServicio', 'tipo'] },
  '9': { procedure: 'SP_CAMA_DETALLE_9', params: ['idServicio', 'tipo'] },
  '9a': { procedure: 'SP_CAMA_DETALLE_9A', params: ['idServicio', 'tipo'] },
}

export async function listCamasServiciosAgrupados() {
  const rows = await executeQuery(
    `SELECT DISTINCT
      TipoAgrupa AS tipo,
      NomAgrupa AS nombre
     FROM T_Upss_Consultorio
     WHERE NomAgrupa IS NOT NULL
     ORDER BY nombre`,
    [],
    { timeoutMs: REPORT_TIMEOUT_MS },
  )

  return rows.map((row) => ({
    tipo: String(row.tipo ?? '').trim(),
    nombre: String(row.nombre ?? '').trim(),
  }))
}

export async function getCamasServicioAgrupadoInfo(nombre) {
  const rows = await executeQuery(
    `SELECT DISTINCT
      TipoAgrupa AS tipo,
      NomAgrupa AS nombre,
      IdAgrupa AS idTipo
     FROM T_Upss_Consultorio
     WHERE NomAgrupa = @nombre`,
    [{ name: 'nombre', type: sql.NVarChar, value: String(nombre ?? '').trim() }],
    { timeoutMs: REPORT_TIMEOUT_MS },
  )

  return rows[0] ?? null
}

export async function getGestionEstanciaReport(filters) {
  const servicio = String(filters.servicio ?? '').trim()
  const tipo = String(filters.tipo ?? '').trim()
  const idTipo = String(filters.idTipo ?? '').trim()

  if (!servicio) {
    throw new Error('Debe seleccionar un servicio para consultar la estancia.')
  }

  const rows = await executeProcedure(
    'EstanciaHospitalaria',
    [
      { name: 'servicio', type: sql.NVarChar, value: servicio },
      { name: 'tipo', type: sql.NVarChar, value: tipo },
      { name: 'idtipo', type: sql.NVarChar, value: idTipo },
    ],
    { timeoutMs: REPORT_TIMEOUT_MS },
  )

  return normalizeRows(rows)
}

export async function getGestionEstanciaMovimientos(filters) {
  const upss = String(filters.upss ?? '').trim()
  const servicio = String(filters.servicio ?? '').trim()
  if (!upss || !servicio) {
    throw new Error('Faltan parametros para consultar movimientos de estancia.')
  }

  const rows = await executeProcedure(
    'BIMovPacienteCama',
    [
      { name: 'upss', type: sql.NVarChar, value: upss },
      { name: 'servicio', type: sql.NVarChar, value: servicio },
    ],
    { timeoutMs: REPORT_TIMEOUT_MS },
  )

  return normalizeRows(rows)
}

async function getMovimientoDetalle(procedure, orden) {
  if (!orden) {
    throw new Error('No se pudo identificar el registro para consultar el detalle.')
  }

  const rows = await executeProcedure(
    procedure,
    [{ name: 'orden', type: sql.Int, value: Number(orden) }],
    { timeoutMs: REPORT_TIMEOUT_MS },
  )

  return normalizeRows(rows)
}

export function getGestionEstanciaMovimientoDiagnosticos(orden) {
  return getMovimientoDetalle('BIMovPacienteCamaDX', orden)
}

export function getGestionEstanciaMovimientoTransferencias(orden) {
  return getMovimientoDetalle('BIMovPacienteCamaTR', orden)
}

export function getGestionEstanciaMovimientoCabecera(orden) {
  return getMovimientoDetalle('BIMovPacienteCamaCB', orden)
}

export function getGestionEstanciaMovimientoProfesionales(orden) {
  return getMovimientoDetalle('BIMovPacienteCamaPR', orden)
}

export function getGestionEstanciaMovimientoProcedimientos(orden) {
  return getMovimientoDetalle('BIMovPacienteCamaPRC', orden)
}

export function getGestionEstanciaMovimientoDxCqx(orden) {
  return getMovimientoDetalle('BIMovPacienteCamaDXCQX', orden)
}

export async function getMonitoreoCamasReport() {
  const rows = await executeProcedure('SP_CAMA_RESUMEN', [], { timeoutMs: REPORT_TIMEOUT_MS })
  return normalizeRows(rows)
}

export async function listTiposCama() {
  const rows = await executeQuery(
    `SELECT IdTipoCama AS idTipo, Descripcion AS tipo
     FROM sigh..TiposCama
     WHERE idestado = 1
     ORDER BY IdTipoCama`,
    [],
    { timeoutMs: REPORT_TIMEOUT_MS },
  )

  return rows.map((row) => ({
    idTipo: String(row.idTipo ?? '').trim(),
    tipo: String(row.tipo ?? '').trim(),
  }))
}

export async function getResumenCamasReport(tipoCama) {
  const rows = await executeProcedure(
    'SP_CAMA_RESUMEN_1',
    [{ name: 'IdTipoCama', type: sql.Int, value: Number(tipoCama ?? 0) || 0 }],
    { timeoutMs: REPORT_TIMEOUT_MS },
  )

  return normalizeRows(rows)
}

export async function getOcupacionHospitalizacionReport() {
  const rows = await executeProcedure('SP_CAMA_OCUPA', [], { timeoutMs: REPORT_TIMEOUT_MS })
  return normalizeRows(rows)
}

export async function getOcupacionUciReport() {
  const rows = await executeProcedure('SP_CAMA_OCUPA_U', [], { timeoutMs: REPORT_TIMEOUT_MS })
  return normalizeRows(rows)
}

export async function getCamasDetalle(tipoDetalle, filters) {
  const key = String(tipoDetalle ?? '').toLowerCase()
  const definition = DETAIL_PROCEDURE_BY_TYPE[key]

  if (!definition) {
    throw new Error('No existe la consulta de detalle solicitada.')
  }

  const params = definition.params.map((paramName) => {
    if (paramName === 'idServicio') {
      return { name: 'idservicio', type: sql.Int, value: Number(filters.idServicio ?? 0) || 0 }
    }

    return { name: 'tipo', type: sql.NVarChar, value: String(filters.tipo ?? '').trim() }
  })

  const rows = await executeProcedure(definition.procedure, params, { timeoutMs: REPORT_TIMEOUT_MS })
  return normalizeRows(rows)
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

export async function exportMonitoreoCamasResumen() {
  const rows = await executeProcedure('SP_CAMA_RESUMEN', [], { timeoutMs: REPORT_TIMEOUT_MS })
  const normalizedRows = normalizeRows(rows)

  return {
    fileName: 'reporte-monitoreo-camas-resumen.xls',
    mimeType: 'application/vnd.ms-excel; charset=utf-8',
    content: buildSpreadsheetHtml('Monitoreo Camas Resumen', normalizedRows),
    rowCount: normalizedRows.length,
  }
}

export async function exportMonitoreoCamasSusalud() {
  const rows = await executeProcedure('SP_CAMA_RESUMEN', [], { timeoutMs: REPORT_TIMEOUT_MS })
  const normalizedRows = normalizeRows(rows)

  return {
    fileName: 'reporte-camas-susalud.xls',
    mimeType: 'application/vnd.ms-excel; charset=utf-8',
    content: buildSpreadsheetHtml('Reporte SUSALUD Camas', normalizedRows),
    rowCount: normalizedRows.length,
  }
}
