import { buildLegacyCategoryMappingRows } from './susalud-mapping.js'
import { normalizeSusaludDataset } from './susalud-normalizer.js'
import {
  calculateUciBlock,
  calculateUcinBlock,
  calculateHospitalizacionBlock,
  calculateEmergenciaBlock,
  calculateEmergenciaAmpliadaBlock,
  calculateVentiladoresMonitoresBlock,
  calculateDengueBlock,
} from './susalud-calculators.js'
import { buildSusaludAuditRows } from './susalud-audit.js'

function isTipoCama(row) {
  return String(row?.tipo ?? '').trim().toUpperCase() === 'CAMA'
}

function filterOnlyTipoCama(rows = []) {
  return (Array.isArray(rows) ? rows : []).filter(isTipoCama)
}

export function buildSusaludExportPayload({
  corteRows = [],
  resumenRows = [],
  sourceRows = [],
  corteTimestamp,
  includeAudit = true,
  onlyTipoCama = false,
}) {
  const rawCorteRows = Array.isArray(corteRows) ? corteRows : []
  const rawResumenRows =
    Array.isArray(resumenRows) && resumenRows.length > 0
      ? resumenRows
      : Array.isArray(sourceRows)
        ? sourceRows
        : []
  const safeCorteRows = onlyTipoCama ? filterOnlyTipoCama(rawCorteRows) : rawCorteRows
  const safeResumenRows = onlyTipoCama ? filterOnlyTipoCama(rawResumenRows) : rawResumenRows
  const mappingRows = buildLegacyCategoryMappingRows()

  const timestamp =
    corteTimestamp instanceof Date
      ? corteTimestamp.toISOString()
      : String(corteTimestamp ?? new Date().toISOString())

  const normalizedCorteRows = normalizeSusaludDataset(safeCorteRows, {
    sourceTag: 'corte',
    corteTimestamp: timestamp,
  })

  const normalizedResumenRows = normalizeSusaludDataset(safeResumenRows, {
    sourceTag: 'resumen',
    corteTimestamp: timestamp,
  })
  const normalizedRows = [...normalizedCorteRows, ...normalizedResumenRows]

  const uci = calculateUciBlock(normalizedRows)
  const ucin = calculateUcinBlock(normalizedRows)
  const hospitalizacion = calculateHospitalizacionBlock(normalizedRows)
  const emergencia = calculateEmergenciaBlock(normalizedRows)
  const emergenciaAmpliada = calculateEmergenciaAmpliadaBlock(normalizedRows)
  const recursosCriticos = calculateVentiladoresMonitoresBlock(normalizedRows)
  const dengue = calculateDengueBlock(normalizedRows)

  const calculationAuditRows = [
    ...uci.audit,
    ...ucin.audit,
    ...hospitalizacion.audit,
    ...emergencia.audit,
    ...emergenciaAmpliada.audit,
    ...recursosCriticos.audit,
    ...dengue.audit,
  ]

  const auditRows = includeAudit
    ? buildSusaludAuditRows({ mappingRows, normalizedRows, calculationAuditRows })
    : []

  return {
    normalizedDataset: normalizedRows,
    mappingRows,
    uciRows: uci.rows,
    ucinRows: ucin.rows,
    hospitalizacionRows: hospitalizacion.rows,
    emergenciaRows: emergencia.rows,
    emergenciaAmpliadaRows: emergenciaAmpliada.rows,
    ventiladoresMonitores: recursosCriticos.rows,
    dengueSections: dengue.sections,
    auditRows,
  }
}
