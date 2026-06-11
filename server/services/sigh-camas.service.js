import { executeProcedure_Sigh1 as executeProcedure, executeQuery_Sigh1 as executeQuery, sql } from './sigh-sql-helpers.js'
import { buildMonitoreoCamasSusaludWorkbook, buildMonitoreoCamasWorkbook, MIME_XLSX } from './excel-export.service.js'
import { buildSusaludExportPayload } from './susalud/susalud-pipeline.js'

const REPORT_TIMEOUT_MS = 180000

function normalizeRows(rows = []) {
  return rows.map((row) =>
    Object.fromEntries(Object.entries(row).map(([key, value]) => [key, value ?? ''])),
  )
}

function pick(row, ...keys) {
  for (const k of keys) {
    if (k in row && row[k] !== null && row[k] !== undefined && row[k] !== '') return row[k]
  }
  return ''
}

function pickNum(row, ...keys) {
  const v = pick(row, ...keys)
  if (v === '') return 0
  const n = Number(v)
  return Number.isFinite(n) ? n : 0
}

function normalizeLookupToken(value) {
  return String(value ?? '')
    .trim()
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]/g, '')
}

function detailValueText(value) {
  if (value === null || value === undefined) {
    return ''
  }

  return String(value).trim()
}

function buildRowLookupMap(row) {
  const map = new Map()
  for (const [key, value] of Object.entries(row ?? {})) {
    map.set(normalizeLookupToken(key), value)
  }

  return map
}

function pickFromLookupMap(lookupMap, aliases = []) {
  for (const alias of aliases) {
    const token = normalizeLookupToken(alias)
    if (!lookupMap.has(token)) {
      continue
    }

    const value = lookupMap.get(token)
    if (value === null || value === undefined) {
      continue
    }

    if (typeof value === 'string' && value.trim() === '') {
      continue
    }

    return value
  }

  return ''
}

const DETAIL_FIELDS_BY_TYPE = {
  '1': {
    codigocama: ['NROCAMA', 'CAMA', 'CODIGOCAMA'],
    estadocama: ['ESTADOCAMA', 'ESTADO'],
    piso: ['PISO'],
    paciente: ['PACIENTE'],
  },
  '2': {
    codigocama: ['NROCAMA', 'CAMA', 'CODIGOCAMA'],
    estadocama: ['ESTADOCAMA', 'ESTADO'],
    piso: ['PISO'],
    paciente: ['PACIENTE'],
  },
  '3': {
    codigocama: ['NROCAMA', 'CAMA', 'CODIGOCAMA'],
    estadocama: ['ESTADOCAMA', 'ESTADO'],
    piso: ['PISO'],
    libre: ['LIBRE', 'LIBREDESDE'],
  },
  '4': {
    codigocama: ['NROCAMA', 'CAMA', 'CODIGOCAMA'],
    estadocama: ['ESTADOCAMA', 'ESTADO'],
    piso: ['PISO'],
    paciente: ['PACIENTE'],
  },
  '5': {
    codigocama: ['NROCAMA', 'CAMA', 'CODIGOCAMA'],
    estadocama: ['ESTADOCAMA', 'ESTADO'],
    piso: ['PISO'],
    paciente: ['PACIENTE'],
  },
  '6': {
    idcuenta: ['IDCUENTA', 'IDCUENTAATENCION', 'IdCuentaAtencion'],
    codigocama: ['CAMA', 'NROCAMA', 'CODIGOCAMA'],
    estadocama: ['ESTADOCAMA', 'ESTADO'],
    paciente: ['PACIENTE'],
  },
  '7': {
    idcuenta: ['IDCUENTA', 'IDCUENTAATENCION', 'IdCuentaAtencion'],
    codigocama: ['CAMA', 'NROCAMA', 'CODIGOCAMA'],
    estadocama: ['ESTADOCAMA', 'ESTADO'],
    paciente: ['PACIENTE'],
  },
  '8': {
    idcuenta: ['IDCUENTA', 'IDCUENTAATENCION', 'IdCuentaAtencion'],
    paciente: ['PACIENTE'],
    cama: ['CAMA', 'NROCAMA'],
    tipomuestra: ['TIPOMUESTRA'],
    tipoprueba: ['TIPOPRUEBA'],
    fecha_i: ['FECHAINGRESO', 'FECHA_I'],
    fecha_s: ['FECHASINTOMA', 'FECHA_S'],
    fecha_m: ['FECHAMUESTRA', 'FECHA_M'],
    fecha_r: ['FECHARESULTADO', 'FECHA_R'],
    dias: ['DIAS'],
    diah: ['DIAH'],
    caso: ['TIPOCASO', 'CASO'],
  },
  '9': {
    idcuenta: ['IDCUENTA', 'IDCUENTAATENCION', 'IdCuentaAtencion'],
    paciente: ['PACIENTE'],
    cama: ['CAMA', 'NROCAMA'],
    tipomuestra: ['TIPOMUESTRA'],
    tipoprueba: ['TIPOPRUEBA'],
    fecha_i: ['FECHAINGRESO', 'FECHA_I'],
    fecha_s: ['FECHASINTOMA', 'FECHA_S'],
    fecha_m: ['FECHAMUESTRA', 'FECHA_M'],
    fecha_r: ['FECHARESULTADO', 'FECHA_R'],
    dias: ['DIAS'],
    diah: ['DIAH'],
    caso: ['TIPOCASO', 'CASO'],
  },
  '9a': {
    idcuenta: ['IDCUENTA', 'IDCUENTAATENCION', 'IdCuentaAtencion'],
    paciente: ['PACIENTE'],
    cama: ['CAMA', 'NROCAMA'],
    tipomuestra: ['TIPOMUESTRA'],
    tipoprueba: ['TIPOPRUEBA'],
    fecha_i: ['FECHAINGRESO', 'FECHA_I'],
    fecha_s: ['FECHASINTOMA', 'FECHA_S'],
    fecha_m: ['FECHAMUESTRA', 'FECHA_M'],
    fecha_r: ['FECHARESULTADO', 'FECHA_R'],
    dias: ['DIAS'],
    diah: ['DIAH'],
    caso: ['TIPOCASO', 'CASO'],
  },
}

export function normalizeCamasDetalleRows(tipoDetalle, rows = []) {
  const key = String(tipoDetalle ?? '').toLowerCase()
  const fieldsByKey = DETAIL_FIELDS_BY_TYPE[key]
  const safeRows = normalizeRows(rows)

  if (!fieldsByKey) {
    return safeRows
  }

  return safeRows.map((row) => {
    const lookupMap = buildRowLookupMap(row)
    const normalizedRow = {}

    for (const [targetKey, aliases] of Object.entries(fieldsByKey)) {
      normalizedRow[targetKey] = detailValueText(pickFromLookupMap(lookupMap, aliases))
    }

    return normalizedRow
  })
}

function mapCamasRow(row) {
  return {
    idservicio: pickNum(row, 'IDSERVICIO', 'idservicio'),
    piso:       String(pick(row, 'PISO', 'piso') ?? '').trim(),
    servicio:   String(pick(row, 'CONSULTORIO', 'SERVICIO', 'servicio') ?? '').trim(),
    tipo:       String(pick(row, 'TIPO', 'tipo') ?? '').trim(),
    orden:      pickNum(row, 'ORDEN', 'orden'),
    camas:      pickNum(row, 'CAMASARQ', 'CAMAS', 'camas'),
    c_vm:       pickNum(row, 'C_VM', 'c_vm'),
    c_fl:       pickNum(row, 'C_FL', 'c_fl'),
    c_oxi:      pickNum(row, 'OXIG', 'C_OXI', 'c_oxi'),
    total:      pickNum(row, 'TOTAL', 'total', 'TOTCAMAS', 'tcamas'),
    chabi:      pickNum(row, 'C_HABI', 'CHABI', 'chabi'),
    cocup:      pickNum(row, 'C_OCUP', 'COCUP', 'cocup'),
    clibr:      pickNum(row, 'C_LIBR', 'CLIBR', 'clibr'),
    ctran:      pickNum(row, 'C_TRAN', 'CTRAN', 'ctran'),
    cinah:      pickNum(row, 'C_INAH', 'CINAH', 'cinah'),
    totcamas:   pickNum(row, 'TOTCAMAS', 'totcamas'),
    tocupa:     pickNum(row, 'TOTOCUPA', 'TOCUPA', 'tocupa'),
    ordenvm:    pickNum(row, 'ORDENVM', 'ordenvm'),
    totalvm:    pickNum(row, 'VENTILADOR_M', 'TOTALVM', 'totalvm'),
    vmopera:    pickNum(row, 'VENTILADOR_M_O', 'VMOPERA', 'vmopera'),
    vminopera:  pickNum(row, 'VENTILADOR_M_I', 'VMINOPERA', 'vminopera'),
    totalaf:    pickNum(row, 'VENTILADOR_AF', 'TOTALAF', 'totalaf'),
    afopera:    pickNum(row, 'VENTILADOR_AF_O', 'AFOPERA', 'afopera'),
    afinopera:  pickNum(row, 'VENTILADOR_AF_I', 'AFINOPERA', 'afinopera'),
    pcr:        pickNum(row, 'PCR', 'pcr'),
    espera:     pickNum(row, 'ESPERA', 'espera'),
    espera_ant: pickNum(row, 'ESPERA_ANT', 'espera_ant'),
    espera_mol: pickNum(row, 'ESPERA_MOL', 'espera_mol'),
    con_oxi:    pickNum(row, 'E_HOSP_OX', 'CON_OXI', 'con_oxi', 'e_hosp_ox'),
    sin_oxi:    pickNum(row, 'E_HOSP', 'SIN_OXI', 'sin_oxi', 'e_hosp'),
    totvm:      pickNum(row, 'TOTVM', 'totvm'),
    totfl:      pickNum(row, 'TOTFL', 'totfl'),
    monitor_total: pickNum(row, 'MONITOR_FV', 'MONITOR_TOTAL', 'monitor_total'),
    monitor_operativos: pickNum(row, 'MONITOR_FV_O', 'MONITOR_OPERATIVOS', 'monitor_operativos'),
    monitor_inoperativos: pickNum(row, 'MONITOR_FV_I', 'MONITOR_INOPERATIVOS', 'monitor_inoperativos'),
    fvopera: pickNum(row, 'MONITOR_FV_O', 'FVOPERA', 'fvopera'),
    fvinopera: pickNum(row, 'MONITOR_FV_I', 'FVINOPERA', 'fvinopera'),
    veces:      pickNum(row, 'VECES', 'veces') || 1,
    veces1:     pickNum(row, 'VECES1', 'veces1') || 1,
  }
}

function safePercentValue(numerator, denominator) {
  const safeNumerator = Number.isFinite(numerator) ? numerator : 0
  const safeDenominator = Number.isFinite(denominator) ? denominator : 0
  if (safeDenominator <= 0) {
    return 0
  }

  return (safeNumerator / safeDenominator) * 100
}

function clampPercent(value) {
  if (!Number.isFinite(value)) {
    return 0
  }

  if (value < 0) {
    return 0
  }

  if (value > 100) {
    return 100
  }

  return value
}

function emptyMonitoreoSums() {
  return {
    camas: 0,
    totcamas: 0,
    tocupa: 0,
    demanda: 0,
    total: 0,
    chabi: 0,
    cocup: 0,
    clibr: 0,
    ctran: 0,
    cinah: 0,
    pcr: 0,
    espera: 0,
    espera_ant: 0,
    espera_mol: 0,
    c_vm: 0,
    totalvm: 0,
    vmopera: 0,
    vminopera: 0,
    c_fl: 0,
    totalaf: 0,
    afopera: 0,
    afinopera: 0,
    monitor_total: 0,
    monitor_operativos: 0,
    monitor_inoperativos: 0,
  }
}

function computeServiceMetrics(rows) {
  const camas = rows.reduce((max, row) => Math.max(max, row.camas), 0)
  const totalFilas = rows.reduce((sum, row) => sum + row.total, 0)
  const totcamas = rows.reduce((max, row) => Math.max(max, row.totcamas), totalFilas)
  const tocupaPorTipos = rows.reduce((sum, row) => sum + row.cocup, 0)
  const tocupaSp = rows.reduce((max, row) => Math.max(max, row.tocupa), 0)
  const tocupa = Math.max(tocupaPorTipos, tocupaSp)
  const ocupacionBase = Math.min(tocupa, camas)
  const demanda = Math.max(tocupa - camas, 0)

  const c_vm = rows.reduce((max, row) => Math.max(max, row.c_vm), 0)
  const totalvm = rows.reduce((max, row) => Math.max(max, row.totalvm), 0)
  const vmopera = rows.reduce((max, row) => Math.max(max, row.vmopera), 0)
  const vminopera = rows.reduce((max, row) => Math.max(max, row.vminopera), 0)

  const c_fl = rows.reduce((max, row) => Math.max(max, row.c_fl), 0)
  const totalaf = rows.reduce((max, row) => Math.max(max, row.totalaf), 0)
  const afopera = rows.reduce((max, row) => Math.max(max, row.afopera), 0)
  const afinopera = rows.reduce((max, row) => Math.max(max, row.afinopera), 0)

  const monitor_total = rows.reduce((max, row) => Math.max(max, row.monitor_total), 0)
  const monitor_operativos = rows.reduce((max, row) => Math.max(max, row.monitor_operativos), 0)
  const monitor_inoperativos = rows.reduce((max, row) => Math.max(max, row.monitor_inoperativos), 0)

  return {
    camas,
    totcamas,
    tocupa,
    demanda,
    porcentaje: clampPercent(safePercentValue(ocupacionBase, camas)),
    c_vm,
    totalvm,
    vmopera,
    vminopera,
    vmPct: clampPercent(safePercentValue(c_vm, vmopera)),
    c_fl,
    totalaf,
    afopera,
    afinopera,
    afPct: clampPercent(safePercentValue(c_fl, afopera)),
    monitor_total,
    monitor_operativos,
    monitor_inoperativos,
  }
}

function buildServiceGroups(rows) {
  const groups = []

  for (const row of rows) {
    const key = `${row.piso}|${row.idservicio}|${row.servicio}`
    const lastGroup = groups[groups.length - 1]

    if (lastGroup && lastGroup.key === key) {
      lastGroup.rows.push(row)
      continue
    }

    groups.push({
      key,
      piso: row.piso,
      servicio: row.servicio,
      rows: [row],
      metrics: computeServiceMetrics([row]),
    })
  }

  for (const group of groups) {
    group.metrics = computeServiceMetrics(group.rows)
  }

  return groups
}

function addGroupToSums(sums, group) {
  sums.camas += group.metrics.camas
  sums.totcamas += group.metrics.totcamas
  sums.tocupa += group.metrics.tocupa
  sums.demanda += group.metrics.demanda

  sums.total += group.rows.reduce((sum, row) => sum + row.total, 0)
  sums.chabi += group.rows.reduce((sum, row) => sum + row.chabi, 0)
  sums.cocup += group.rows.reduce((sum, row) => sum + row.cocup, 0)
  sums.clibr += group.rows.reduce((sum, row) => sum + row.clibr, 0)
  sums.ctran += group.rows.reduce((sum, row) => sum + row.ctran, 0)
  sums.cinah += group.rows.reduce((sum, row) => sum + row.cinah, 0)
  sums.pcr += group.rows.reduce((sum, row) => sum + row.pcr, 0)
  sums.espera += group.rows.reduce((sum, row) => sum + row.espera, 0)
  sums.espera_ant += group.rows.reduce((sum, row) => sum + row.espera_ant, 0)
  sums.espera_mol += group.rows.reduce((sum, row) => sum + row.espera_mol, 0)

  // VM/AF/Monitores are service-level capacities and can repeat by subtype.
  sums.c_vm += group.metrics.c_vm
  sums.totalvm += group.metrics.totalvm
  sums.vmopera += group.metrics.vmopera
  sums.vminopera += group.metrics.vminopera
  sums.c_fl += group.metrics.c_fl
  sums.totalaf += group.metrics.totalaf
  sums.afopera += group.metrics.afopera
  sums.afinopera += group.metrics.afinopera
  sums.monitor_total += group.metrics.monitor_total
  sums.monitor_operativos += group.metrics.monitor_operativos
  sums.monitor_inoperativos += group.metrics.monitor_inoperativos
}

function buildMonitoreoCamasExportRows(rawRows) {
  const groups = buildServiceGroups(rawRows)
  const items = []

  const pisoRowSpanMap = new Map()
  for (const group of groups) {
    pisoRowSpanMap.set(group.piso, (pisoRowSpanMap.get(group.piso) ?? 0) + group.rows.length)
  }

  let currentPiso = groups[0]?.piso ?? ''
  let pisoSums = emptyMonitoreoSums()
  const globalSums = emptyMonitoreoSums()
  const renderedPisos = new Set()

  groups.forEach((group, groupIndex) => {
    const pisoChanged = groupIndex > 0 && group.piso !== currentPiso

    if (pisoChanged) {
      items.push({ kind: 'subtotal', piso: currentPiso, sums: { ...pisoSums } })
      pisoSums = emptyMonitoreoSums()
    }

    addGroupToSums(pisoSums, group)
    addGroupToSums(globalSums, group)

    group.rows.forEach((row, rowIndex) => {
      const isFirstOfService = rowIndex === 0
      const isFirstOfPiso = isFirstOfService && !renderedPisos.has(group.piso)
      if (isFirstOfPiso) {
        renderedPisos.add(group.piso)
      }

      items.push({
        kind: 'data',
        piso: group.piso,
        servicio: group.servicio,
        tipo: row.tipo,
        isFirstOfPiso,
        pisoRowSpan: pisoRowSpanMap.get(group.piso) ?? 1,
        isFirstOfService,
        serviceRowSpan: group.rows.length,
        metrics: group.metrics,
        detail: {
          camasTotales: row.total,
          camasOperativas: row.chabi,
          camasOcupadas: row.cocup,
          camasDisponibles: row.clibr,
          camasTransitorias: row.ctran,
          camasInhabilitadas: row.cinah,
          pacientesPositivos: row.pcr,
          esperaResultado: row.espera,
          esperaAntigena: row.espera_ant,
          esperaMolecular: row.espera_mol,
        },
      })
    })

    if (groupIndex === groups.length - 1) {
      items.push({ kind: 'subtotal', piso: group.piso, sums: { ...pisoSums } })
    }

    currentPiso = group.piso
  })

  if (rawRows.length > 0) {
    items.push({ kind: 'total', sums: globalSums })
  }

  return items
}

// SUSALUD export logic was moved to dedicated modules under ./susalud
// to keep normalization, mapping, calculations and audit trace isolated
// from this transport/service layer.

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

function normalizeNumeroCamasRows(rows = []) {
  return rows.map((row) => ({
    disponible: pickNum(row, 'DISPONIBLE', 'disponible'),
    ocupado: pickNum(row, 'OCUPADO', 'ocupado'),
    libre: pickNum(row, 'LIBRE', 'libre'),
  }))
}

async function queryNumeroCamasByCriteria(upss, servicio) {
  return executeProcedure(
    'SP_REPORTE_MONITOR3A',
    [
      { name: 'upss', type: sql.NVarChar, value: String(upss ?? '').trim() },
      { name: 'serv', type: sql.NVarChar, value: String(servicio ?? '').trim() },
    ],
    { timeoutMs: REPORT_TIMEOUT_MS },
  )
}

function aggregateNumeroCamasRows(rows = []) {
  return rows.reduce(
    (accumulator, row) => ({
      disponible: accumulator.disponible + pickNum(row, 'DISPONIBLE', 'disponible'),
      ocupado: accumulator.ocupado + pickNum(row, 'OCUPADO', 'ocupado'),
      libre: accumulator.libre + pickNum(row, 'LIBRE', 'libre'),
    }),
    {
      disponible: 0,
      ocupado: 0,
      libre: 0,
    },
  )
}

export async function getGestionEstanciaResumen(filters) {
  const servicio = String(filters.servicio ?? '').trim()
  const tipo = String(filters.tipo ?? '').trim()
  const idTipo = String(filters.idTipo ?? '').trim()

  if (!servicio) {
    throw new Error('Debe seleccionar un servicio para consultar el numero de camas.')
  }

  const serviceRows = await executeQuery(
    `SELECT DISTINCT
      cod_upss AS upss,
      cod_consultorio AS serv
     FROM T_Upss_Consultorio
     WHERE NomAgrupa = @servicio`,
    [{ name: 'servicio', type: sql.NVarChar, value: servicio }],
    { timeoutMs: REPORT_TIMEOUT_MS },
  )

  const attempts = serviceRows.length > 0
    ? serviceRows.map((row) => ({
        upss: String(row.upss ?? '').trim(),
        serv: String(row.serv ?? '').trim(),
      }))
    : [{ upss: tipo, serv: idTipo }]

  const bucket = []
  for (const attempt of attempts) {
    if (!attempt.upss && !attempt.serv) {
      continue
    }

    try {
      const rows = await queryNumeroCamasByCriteria(attempt.upss, attempt.serv)
      bucket.push(...rows)
    } catch (error) {
      // Some legacy combinations can fail depending on current DB mappings.
      // We continue to avoid blocking valid combinations for the same group.
      console.warn('No se pudo consultar numero de camas para un servicio mapeado.', {
        upss: attempt.upss,
        serv: attempt.serv,
        error: error instanceof Error ? error.message : error,
      })
    }
  }

  if (bucket.length > 0) {
    return normalizeNumeroCamasRows([aggregateNumeroCamasRows(bucket)])
  }

  return []
}

export const getGestionEstanciaNumeroCamas = getGestionEstanciaResumen

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
  return rows.map(mapCamasRow)
}

export async function getMonitoreoCamasCorteReport() {
  const rows = await executeProcedure('SP_CAMA_RESUMEN_CORTE', [], { timeoutMs: REPORT_TIMEOUT_MS })
  return rows.map(mapCamasRow)
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
  return normalizeCamasDetalleRows(key, rows)
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
  const rows = await getMonitoreoCamasReport()
  const exportRows = buildMonitoreoCamasExportRows(rows)
  const content = await buildMonitoreoCamasWorkbook({
    title: 'reporte-monitoreo-camas-resumen.xlsx',
    sheetName: 'Resumen de Camas',
    generatedAt: new Date(),
    rows: exportRows,
  })

  return {
    fileName: 'reporte-monitoreo-camas-resumen.xlsx',
    mimeType: MIME_XLSX,
    content,
    rowCount: rows.length,
  }
}

export async function exportMonitoreoCamasSusalud() {
  const [corteRows, resumenRows] = await Promise.all([
    getMonitoreoCamasCorteReport(),
    getMonitoreoCamasReport(),
  ])
  const payload = buildSusaludExportPayload({
    corteRows,
    resumenRows,
    corteTimestamp: new Date(),
    includeAudit: true,
    onlyTipoCama: true,
  })
  const content = await buildMonitoreoCamasSusaludWorkbook({
    title: 'reporte-camas-susalud.xlsx',
    sheetName: 'Resumen SUSALUD',
    generatedAt: new Date(),
    ...payload,
  })

  return {
    fileName: 'reporte-camas-susalud.xlsx',
    mimeType: MIME_XLSX,
    content,
    rowCount: Math.max(corteRows.length, resumenRows.length),
  }
}
