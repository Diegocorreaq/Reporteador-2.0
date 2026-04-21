import fs from 'node:fs'
import process from 'node:process'
import ExcelJS from 'exceljs'

import { buildSusaludExportPayload } from '../services/susalud/susalud-pipeline.js'

const DEFAULT_LEGACY_PATH = 'C:/Users/diego.correa/Downloads/resumen_susalud (4).xls'
const DEFAULT_CURRENT_PATH = 'C:/Users/diego.correa/Downloads/reporte-camas-susalud.xlsx'

function normalizeSpaces(value) {
  return String(value ?? '')
    .replace(/<[^>]*>/g, ' ')
    .replace(/&nbsp;/gi, ' ')
    .replace(/\s+/g, ' ')
    .trim()
}

function toNumber(value) {
  const num = Number(value ?? 0)
  return Number.isFinite(num) ? num : 0
}

function parseLegacyTableMap(html, headerCell) {
  const tables = [...html.matchAll(/<table[^>]*>([\s\S]*?)<\/table>/gi)].map((match) => match[1])

  for (const tableBody of tables) {
    const rows = [...tableBody.matchAll(/<tr[^>]*>([\s\S]*?)<\/tr>/gi)].map((rowMatch) => {
      const cells = [...rowMatch[1].matchAll(/<(td|th)[^>]*>([\s\S]*?)<\/\1>/gi)]
      return cells.map((cell) => normalizeSpaces(cell[2]))
    })

    if (!rows.length || !rows[0].length || rows[0][0] !== headerCell) continue
    return rows
  }

  return []
}

function parseLegacyMatrix(legacyPath) {
  const html = fs.readFileSync(legacyPath, 'utf8')

  const uciTable = parseLegacyTableMap(html, 'UPSS UCI')
  const ucinTable = parseLegacyTableMap(html, 'UPSS UCIN')
  const hospTable = parseLegacyTableMap(html, 'UPSS HOSPITALIZACION')
  const emergenciaTable = parseLegacyTableMap(html, 'UPSS EMERGENCIA')
  const emergenciaAmpliadaTable = parseLegacyTableMap(html, 'ZONA DE EMERGENCIA AMPLIADA')
  const recursosTable = parseLegacyTableMap(html, 'RESUMEN DE VENTILADORES Y MONITORES')

  const toMap = (rows, keyIdx, valueStartIdx) =>
    Object.fromEntries(rows.slice(1).map((row) => [row[keyIdx], row.slice(valueStartIdx).map(toNumber)]))

  return {
    uci: toMap(uciTable, 0, 2),
    ucin: toMap(ucinTable, 0, 2),
    hospitalizacion: toMap(hospTable, 0, 2),
    emergencia: toMap(emergenciaTable, 0, 2),
    emergenciaAmpliada: (emergenciaAmpliadaTable[1] ?? []).slice(1).map(toNumber),
    recursos: Object.fromEntries((recursosTable ?? []).slice(1).map((row) => [row[0], row.slice(1).map(toNumber)])),
  }
}

async function parseCurrentAuditDataset(currentPath) {
  const workbook = new ExcelJS.Workbook()
  await workbook.xlsx.readFile(currentPath)
  const auditSheet = workbook.getWorksheet('AUDIT_SUSALUD')
  if (!auditSheet) {
    throw new Error('No se encontro hoja AUDIT_SUSALUD en el archivo actual')
  }

  const headers = auditSheet.getRow(1).values.slice(1).map((value) => String(value ?? ''))
  const headerIndex = Object.fromEntries(headers.map((header, idx) => [header, idx + 1]))

  const normalizedRows = []
  for (let rowNum = 2; rowNum <= auditSheet.rowCount; rowNum += 1) {
    const row = auditSheet.getRow(rowNum)
    const auditType = String(row.getCell(headerIndex.audit_tipo).value ?? '')
    if (auditType !== 'DATASET_NORMALIZADO') continue

    const normalized = {}
    headers.forEach((header) => {
      normalized[header] = row.getCell(headerIndex[header]).value ?? ''
    })
    normalizedRows.push(normalized)
  }

  const corteRows = normalizedRows.filter((row) => String(row.source_tag) === 'corte')
  const resumenRows = normalizedRows.filter((row) => String(row.source_tag) === 'resumen')

  return { corteRows, resumenRows }
}

function buildCurrentMatrixFromPayload(payload) {
  const tupleMap = (rows, key, fields) =>
    Object.fromEntries(rows.map((row) => [row[key], fields.map((field) => toNumber(row[field]))]))

  return {
    uci: tupleMap(payload.uciRows, 'upssUci', [
      'total',
      'inoperativos',
      'operativos',
      'libres',
      'ocupados',
      'sinVm',
      'conVm',
      'reserva',
    ]),
    ucin: tupleMap(payload.ucinRows, 'upssUcin', [
      'total',
      'inoperativos',
      'operativos',
      'libres',
      'ocupados',
      'sinOxigeno',
      'conOxigeno',
      'conVm',
      'reserva',
    ]),
    hospitalizacion: tupleMap(payload.hospitalizacionRows, 'upssHospitalizacion', [
      'total',
      'inoperativos',
      'operativos',
      'libres',
      'ocupados',
      'sinOxigeno',
      'conOxigeno',
      'reserva',
    ]),
    emergencia: tupleMap(payload.emergenciaRows, 'upssEmergencia', [
      'total',
      'inoperativos',
      'operativos',
      'libres',
      'ocupados',
      'sinOxigeno',
      'conOxigeno',
      'conVm',
      'reserva',
    ]),
    emergenciaAmpliada: [
      toNumber(payload.emergenciaAmpliadaRows?.[0]?.total),
      toNumber(payload.emergenciaAmpliadaRows?.[0]?.conOxigeno),
      toNumber(payload.emergenciaAmpliadaRows?.[0]?.sinOxigeno),
    ],
    recursos: tupleMap(payload.ventiladoresMonitores, 'recurso', [
      'total',
      'inoperativos',
      'operativos',
      'disponibles',
      'enUso',
    ]),
  }
}

function compareSection(section, legacy, current) {
  const items = []
  for (const [category, legacyTuple] of Object.entries(legacy)) {
    const currentTuple = current[category] ?? []
    const ok = JSON.stringify(legacyTuple) === JSON.stringify(currentTuple)
    items.push({ section, category, legacy: legacyTuple, current: currentTuple, ok })
  }
  return items
}

async function main() {
  const legacyPath = process.env.LEGACY_XLS_PATH ?? DEFAULT_LEGACY_PATH
  const currentPath = process.env.CURRENT_SUSALUD_XLSX_PATH ?? DEFAULT_CURRENT_PATH

  if (!fs.existsSync(legacyPath)) {
    throw new Error(`No se encontro archivo legacy: ${legacyPath}`)
  }
  if (!fs.existsSync(currentPath)) {
    throw new Error(`No se encontro archivo actual: ${currentPath}`)
  }

  const legacyMatrix = parseLegacyMatrix(legacyPath)
  const { corteRows, resumenRows } = await parseCurrentAuditDataset(currentPath)
  const payload = buildSusaludExportPayload({
    corteRows,
    resumenRows,
    includeAudit: false,
    corteTimestamp: new Date('2026-04-19T11:01:00.000Z'),
  })
  const currentMatrix = buildCurrentMatrixFromPayload(payload)

  const results = [
    ...compareSection('UCI', legacyMatrix.uci, currentMatrix.uci),
    ...compareSection('UCIN', legacyMatrix.ucin, currentMatrix.ucin),
    ...compareSection('HOSPITALIZACION', legacyMatrix.hospitalizacion, currentMatrix.hospitalizacion),
    ...compareSection('EMERGENCIA', legacyMatrix.emergencia, currentMatrix.emergencia),
    ...compareSection('RECURSOS', legacyMatrix.recursos, currentMatrix.recursos),
    {
      section: 'EMERGENCIA_AMPLIADA',
      category: 'RESUMEN_UNICO',
      legacy: legacyMatrix.emergenciaAmpliada,
      current: currentMatrix.emergenciaAmpliada,
      ok: JSON.stringify(legacyMatrix.emergenciaAmpliada) === JSON.stringify(currentMatrix.emergenciaAmpliada),
    },
  ]

  const hasDiff = results.some((result) => !result.ok)
  for (const result of results) {
    const status = result.ok ? 'OK' : 'DIFF'
    // eslint-disable-next-line no-console
    console.log(`${result.section} | ${result.category} | ${status} | legacy=${JSON.stringify(result.legacy)} | current=${JSON.stringify(result.current)}`)
  }

  if (hasDiff) {
    throw new Error('Paridad legacy vs actual: se encontraron diferencias')
  }

  // eslint-disable-next-line no-console
  console.log('Paridad legacy vs actual: OK en todas las categorias')
}

main().catch((error) => {
  // eslint-disable-next-line no-console
  console.error(error.message || error)
  process.exit(1)
})
