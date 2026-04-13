import { executeConfiguredExport } from './legacy-export.service.js'
import { executeProcedure_General as executeProcedure, executeQuery_General as executeQuery, sql } from './sigh-sql-helpers.js'

const REPORT_TIMEOUT_MS = 120000

function normalizeDate(value) {
  if (typeof value !== 'string') {
    return ''
  }

  return value.trim().slice(0, 10)
}

function parseDateRange(rawFilters) {
  const currentYear = new Date().getFullYear()
  const fallbackStart = `${currentYear}-01-01`
  const fallbackEnd = `${currentYear}-12-31`
  const fechaInicio = normalizeDate(rawFilters.fechaInicio || fallbackStart)
  const fechaFin = normalizeDate(rawFilters.fechaFin || fallbackEnd)

  if (!/^\d{4}-\d{2}-\d{2}$/.test(fechaInicio) || !/^\d{4}-\d{2}-\d{2}$/.test(fechaFin)) {
    throw new Error('Las fechas deben enviarse en formato YYYY-MM-DD.')
  }

  if (fechaInicio > fechaFin) {
    throw new Error('fechaInicio no puede ser mayor que fechaFin.')
  }

  return { fechaInicio, fechaFin }
}

function normalizeTipo(rawTipo) {
  if (rawTipo === undefined || rawTipo === null || rawTipo === '') {
    return 0
  }

  const value = Number(rawTipo)
  if (!Number.isInteger(value) || value < 0) {
    throw new Error('El tipo de formato enviado no es valido.')
  }

  return value
}

function normalizeRegistroBase(payload) {
  const tipo = normalizeTipo(payload.tipo)
  const empleadoId = Number(payload.empleadoId)
  const fechaRegistro = normalizeDate(payload.fechaRegistro)
  const tiempo = String(payload.tiempo ?? '').trim()
  const observacion = String(payload.observacion ?? '').trim()
  const upss = String(payload.upss ?? '').trim()
  const servicio = String(payload.servicio ?? '').trim()

  if (!Number.isInteger(empleadoId) || empleadoId <= 0) {
    throw new Error('Debe seleccionar un empleado valido.')
  }

  if (!fechaRegistro || !/^\d{4}-\d{2}-\d{2}$/.test(fechaRegistro)) {
    throw new Error('Debe enviar fechaRegistro en formato YYYY-MM-DD.')
  }

  if (!tipo) {
    throw new Error('Debe seleccionar el tipo de formato.')
  }

  const items = Array.isArray(payload.items) ? payload.items : []
  if (items.length === 0) {
    throw new Error('Debe enviar al menos una actividad para registrar.')
  }

  return {
    tipo,
    empleadoId,
    fechaRegistro,
    tiempo,
    observacion,
    upss,
    servicio,
    items,
  }
}

function normalizeStandardItems(items, tipo) {
  return items.map((item) => {
    const idActividad = Number(item.idActividad)
    if (!Number.isInteger(idActividad) || idActividad <= 0) {
      throw new Error('Cada actividad debe tener idActividad valido.')
    }

    return {
      idActividad,
      valor: Number(item.valor) ? 1 : 0,
      tipo,
    }
  })
}

function normalizeMomentoItems(items, tipo) {
  return items.map((item) => {
    const idActividad = Number(item.idActividad)
    if (!Number.isInteger(idActividad) || idActividad <= 0) {
      throw new Error('Cada actividad debe tener idActividad valido.')
    }

    return {
      idActividad,
      valor: Number(item.valor) ? 1 : 0,
      omision: Number(item.omision) ? 1 : 0,
      lavado: Number(item.lavado) ? 1 : 0,
      friccion: Number(item.friccion) ? 1 : 0,
      guantes: Number(item.guantes) ? 1 : 0,
      tipo,
    }
  })
}

async function insertStandardDetailItems(idRegistro, items, tipo) {
  await Promise.all(
    normalizeStandardItems(items, tipo).map((item) =>
      executeProcedure(
        'SP_EPI_REGISTRO_ITEM',
        [
          { name: 'idregistro', type: sql.Int, value: idRegistro },
          { name: 'idactividad', type: sql.Int, value: item.idActividad },
          { name: 'valoractividad', type: sql.Int, value: item.valor },
          { name: 'tipo', type: sql.Int, value: item.tipo },
        ],
        { timeoutMs: REPORT_TIMEOUT_MS },
      ),
    ),
  )
}

async function insertMomentoDetailItems(idRegistro, items, tipo) {
  await Promise.all(
    normalizeMomentoItems(items, tipo).map((item) =>
      executeProcedure(
        'SP_EPI_REGISTRO_ITEM_C',
        [
          { name: 'idregistro', type: sql.Int, value: idRegistro },
          { name: 'idactividad', type: sql.Int, value: item.idActividad },
          { name: 'valoractividad', type: sql.Int, value: item.valor },
          { name: 'omision', type: sql.Int, value: item.omision },
          { name: 'lavado', type: sql.Int, value: item.lavado },
          { name: 'friccion', type: sql.Int, value: item.friccion },
          { name: 'guantes', type: sql.Int, value: item.guantes },
          { name: 'tipo', type: sql.Int, value: item.tipo },
        ],
        { timeoutMs: REPORT_TIMEOUT_MS },
      ),
    ),
  )
}

async function getDetalleByTipo(idRegistro, tipo) {
  const detailView = Number(tipo) === 3 ? 'v_registro_detalle_c' : 'v_registro_detalle'
  const detailRows = await executeQuery(
    `SELECT * FROM ${detailView} WHERE idregistro = @idregistro ORDER BY idactividad`,
    [{ name: 'idregistro', type: sql.Int, value: idRegistro }],
    { timeoutMs: REPORT_TIMEOUT_MS },
  )

  return detailRows
}

export async function listLavadoManos({ fechaInicio, fechaFin, tipo }) {
  const filters = parseDateRange({ fechaInicio, fechaFin })
  const tipoNormalizado = normalizeTipo(tipo)
  const rows = await executeProcedure(
    'SP_EPI_LISTA_ACTOS',
    [
      { name: 'fecini', type: sql.NVarChar, value: filters.fechaInicio },
      { name: 'fecfin', type: sql.NVarChar, value: filters.fechaFin },
      { name: 'tipo', type: sql.Int, value: tipoNormalizado },
    ],
    { timeoutMs: REPORT_TIMEOUT_MS },
  )

  return {
    filters: { ...filters, tipo: tipoNormalizado },
    rows,
  }
}

export async function listLavadoActividades(tipo) {
  const tipoNormalizado = normalizeTipo(tipo)
  if (!tipoNormalizado) {
    return []
  }

  return executeQuery(
    'SELECT idactividad, actividad, tipo FROM t_Actividad WHERE tipo = @tipo ORDER BY idactividad',
    [{ name: 'tipo', type: sql.Int, value: tipoNormalizado }],
  )
}

export async function searchLavadoEmpleados(nombre) {
  const nombreNormalizado = String(nombre ?? '').trim()
  if (nombreNormalizado.length < 2) {
    return []
  }

  return executeProcedure(
    'SP_EPI_EMPLEADO',
    [{ name: 'nombre', type: sql.NVarChar, value: nombreNormalizado }],
    { timeoutMs: REPORT_TIMEOUT_MS },
  )
}

export async function getLavadoRegistro(idRegistro) {
  const id = Number(idRegistro)
  if (!Number.isInteger(id) || id <= 0) {
    throw new Error('El identificador del registro no es valido.')
  }

  const rows = await executeQuery(
    'SELECT * FROM v_registro WHERE idregistro = @idregistro',
    [{ name: 'idregistro', type: sql.Int, value: id }],
    { timeoutMs: REPORT_TIMEOUT_MS },
  )
  const row = rows[0]
  if (!row) {
    throw new Error('No se encontro el registro solicitado.')
  }

  const detalle = await getDetalleByTipo(id, row.tipo)

  return {
    registro: row,
    detalle,
  }
}

export async function createLavadoRegistro(payload) {
  const normalized = normalizeRegistroBase(payload)
  const isMomento = normalized.tipo === 3

  const procedure = isMomento ? 'SP_EPI_REGISTRO_NEW_C' : 'SP_EPI_REGISTRO_NEW'
  const params = isMomento
    ? [
        { name: 'idempleado', type: sql.Int, value: normalized.empleadoId },
        { name: 'observacion', type: sql.NVarChar, value: normalized.observacion },
        { name: 'tipo', type: sql.Int, value: normalized.tipo },
        { name: 'upss', type: sql.NVarChar, value: normalized.upss },
        { name: 'servicio', type: sql.NVarChar, value: normalized.servicio },
        { name: 'fecha', type: sql.NVarChar, value: normalized.fechaRegistro },
      ]
    : [
        { name: 'idempleado', type: sql.Int, value: normalized.empleadoId },
        { name: 'tiempo', type: sql.NVarChar, value: normalized.tiempo },
        { name: 'observacion', type: sql.NVarChar, value: normalized.observacion },
        { name: 'tipo', type: sql.Int, value: normalized.tipo },
        { name: 'upss', type: sql.NVarChar, value: normalized.upss },
        { name: 'servicio', type: sql.NVarChar, value: normalized.servicio },
        { name: 'fecha', type: sql.NVarChar, value: normalized.fechaRegistro },
      ]

  const result = await executeProcedure(procedure, params, { timeoutMs: REPORT_TIMEOUT_MS })
  const idRegistro = Number(result[0]?.NUMEROEXP ?? result[0]?.numeroexp ?? result[0]?.idregistro)

  if (!Number.isInteger(idRegistro) || idRegistro <= 0) {
    throw new Error('No se pudo crear el registro de lavado de manos.')
  }

  if (isMomento) {
    await insertMomentoDetailItems(idRegistro, normalized.items, normalized.tipo)
  } else {
    await insertStandardDetailItems(idRegistro, normalized.items, normalized.tipo)
  }

  return getLavadoRegistro(idRegistro)
}

export async function updateLavadoRegistro(idRegistro, payload) {
  const id = Number(idRegistro)
  if (!Number.isInteger(id) || id <= 0) {
    throw new Error('El identificador del registro no es valido.')
  }

  const normalized = normalizeRegistroBase(payload)
  const isMomento = normalized.tipo === 3

  await executeProcedure(
    'SP_EPI_REGISTRO_UPD',
    [
      { name: 'idregistro', type: sql.Int, value: id },
      { name: 'idempleado', type: sql.Int, value: normalized.empleadoId },
      { name: 'tiempo', type: sql.NVarChar, value: normalized.tiempo },
      { name: 'observacion', type: sql.NVarChar, value: normalized.observacion },
      { name: 'tipo', type: sql.Int, value: normalized.tipo },
      { name: 'upss', type: sql.NVarChar, value: normalized.upss },
      { name: 'servicio', type: sql.NVarChar, value: normalized.servicio },
      { name: 'fecha', type: sql.NVarChar, value: normalized.fechaRegistro },
    ],
    { timeoutMs: REPORT_TIMEOUT_MS },
  )

  const deleteTarget = isMomento ? 'SIGH_DEPURA..E_MomentoDetalle' : 'E_LavadoDetalle'
  await executeQuery(
    `DELETE FROM ${deleteTarget} WHERE idregistro = @idregistro`,
    [{ name: 'idregistro', type: sql.Int, value: id }],
    { timeoutMs: REPORT_TIMEOUT_MS },
  )

  if (isMomento) {
    await insertMomentoDetailItems(id, normalized.items, normalized.tipo)
  } else {
    await insertStandardDetailItems(id, normalized.items, normalized.tipo)
  }

  return getLavadoRegistro(id)
}

export async function anularLavadoRegistro(idRegistro) {
  const id = Number(idRegistro)
  if (!Number.isInteger(id) || id <= 0) {
    throw new Error('El identificador del registro no es valido.')
  }

  const rows = await executeProcedure(
    'SP_EPI_REGISTRO_ANULA',
    [{ name: 'idregistro', type: sql.Int, value: id }],
    { timeoutMs: REPORT_TIMEOUT_MS },
  )

  const row = rows[0] ?? {}
  return {
    estado: Number(row.ESTADO ?? row.estado ?? 0),
    mensaje: String(row.MENSAJE ?? row.mensaje ?? 'Sin respuesta del procedimiento.'),
  }
}

export async function exportLavadoRegistros({ fechaInicio, fechaFin }) {
  const filters = parseDateRange({ fechaInicio, fechaFin })

  return executeConfiguredExport({
    catalog: 'lavado',
    key: 'listado_registro',
    startDate: filters.fechaInicio,
    endDate: filters.fechaFin,
    employeeId: 0,
    ip: '0.0.0.0',
  })
}
