import test from 'node:test'
import assert from 'node:assert/strict'
import ExcelJS from 'exceljs'

import { buildSusaludExportPayload } from '../services/susalud/susalud-pipeline.js'
import { buildMonitoreoCamasSusaludWorkbook } from '../services/excel-export.service.js'
import {
  corteRowsFixture,
  resumenRowsFixture,
  expectedParity,
} from './fixtures/susalud-parity-fixture.js'

function buildPayload() {
  return buildSusaludExportPayload({
    corteRows: corteRowsFixture,
    resumenRows: resumenRowsFixture,
    corteTimestamp: new Date('2026-04-19T02:00:00.000Z'),
    includeAudit: true,
  })
}

function rowMap(rows, key) {
  return new Map(rows.map((row) => [row[key], row]))
}

function toUciTuple(row) {
  return [
    row.total,
    row.inoperativos,
    row.operativos,
    row.libres,
    row.ocupados,
    row.sinVm,
    row.conVm,
    row.reserva,
  ]
}

function toUcinTuple(row) {
  return [
    row.total,
    row.inoperativos,
    row.operativos,
    row.libres,
    row.ocupados,
    row.sinOxigeno,
    row.conOxigeno,
    row.conVm,
    row.reserva,
  ]
}

function toHospitalizacionTuple(row) {
  return [
    row.total,
    row.inoperativos,
    row.operativos,
    row.libres,
    row.ocupados,
    row.sinOxigeno,
    row.conOxigeno,
    row.reserva,
  ]
}

function toEmergenciaTuple(row) {
  return [
    row.total,
    row.inoperativos,
    row.operativos,
    row.libres,
    row.ocupados,
    row.sinOxigeno,
    row.conOxigeno,
    row.conVm,
    row.reserva,
  ]
}

function toRecursoTuple(row) {
  return [row.total, row.inoperativos, row.operativos, row.disponibles, row.enUso]
}

test('SUSALUD: dataset intermedio normalizado es auditable', () => {
  const payload = buildPayload()

  assert.ok(payload.normalizedDataset.length > 0)

  const sample = payload.normalizedDataset[0]
  const requiredFields = [
    'corte_timestamp',
    'consultorio',
    'idservicio',
    'tipo',
    'area_equivalente_legacy',
    'bloque_susalud',
    'categoria_susalud',
    'total',
    'cinah',
    'chabi',
    'clibr',
    'cocup',
    'c_vm',
    'c_oxi',
    'vmopera',
    'vminopera',
    'fvopera',
    'fvinopera',
    'con_oxi',
    'sin_oxi',
  ]

  for (const field of requiredFields) {
    assert.ok(Object.hasOwn(sample, field), `Campo faltante en dataset normalizado: ${field}`)
  }

  assert.ok(payload.mappingRows.some((row) => row.categoria_legacy === 'UCI ADULTOS'))
  assert.ok(payload.mappingRows.some((row) => row.categoria_legacy === 'EMERGENCIA PEDIATRICA'))
  assert.ok(payload.mappingRows.some((row) => row.idservicio_incluidos.includes(672)))
})

test('SUSALUD: paridad por bloque con corte validado', () => {
  const payload = buildPayload()

  // Verifica que cuadros principales no mezclan fuente resumen.
  const uciAdultos = payload.uciRows.find((row) => row.upssUci === 'UCI ADULTOS')
  assert.equal(uciAdultos.total, 18)

  const uciByCategory = rowMap(payload.uciRows, 'upssUci')
  for (const [category, expected] of Object.entries(expectedParity.uci)) {
    assert.ok(uciByCategory.has(category), `Falta categoria UCI: ${category}`)
    assert.deepEqual(toUciTuple(uciByCategory.get(category)), expected, `Diferencia en UCI: ${category}`)
  }

  const ucinByCategory = rowMap(payload.ucinRows, 'upssUcin')
  for (const [category, expected] of Object.entries(expectedParity.ucin)) {
    assert.ok(ucinByCategory.has(category), `Falta categoria UCIN: ${category}`)
    assert.deepEqual(toUcinTuple(ucinByCategory.get(category)), expected, `Diferencia en UCIN: ${category}`)
  }

  const hospitalizacionByCategory = rowMap(payload.hospitalizacionRows, 'upssHospitalizacion')
  for (const [category, expected] of Object.entries(expectedParity.hospitalizacion)) {
    assert.ok(hospitalizacionByCategory.has(category), `Falta categoria Hospitalizacion: ${category}`)
    assert.deepEqual(
      toHospitalizacionTuple(hospitalizacionByCategory.get(category)),
      expected,
      `Diferencia en Hospitalizacion: ${category}`,
    )
  }

  const emergenciaByCategory = rowMap(payload.emergenciaRows, 'upssEmergencia')
  for (const [category, expected] of Object.entries(expectedParity.emergencia)) {
    assert.ok(emergenciaByCategory.has(category), `Falta categoria Emergencia: ${category}`)
    assert.deepEqual(toEmergenciaTuple(emergenciaByCategory.get(category)), expected, `Diferencia en Emergencia: ${category}`)
  }

  assert.equal(payload.emergenciaAmpliadaRows.length, 1)
  assert.deepEqual(
    [
      payload.emergenciaAmpliadaRows[0].total,
      payload.emergenciaAmpliadaRows[0].conOxigeno,
      payload.emergenciaAmpliadaRows[0].sinOxigeno,
    ],
    expectedParity.emergenciaAmpliada,
  )

  const recursosByName = rowMap(payload.ventiladoresMonitores, 'recurso')
  for (const [category, expected] of Object.entries(expectedParity.recursos)) {
    assert.ok(recursosByName.has(category), `Falta recurso critico: ${category}`)
    assert.deepEqual(toRecursoTuple(recursosByName.get(category)), expected, `Diferencia en recurso critico: ${category}`)
  }

  assert.equal(payload.dengueSections.length, 3)
  for (const section of payload.dengueSections) {
    assert.equal(section.rows.length, 4)
    for (const row of section.rows) {
      assert.equal(row.casos, 0)
    }
  }
})

test('SUSALUD: workbook contiene hoja de auditoria oculta', async () => {
  const payload = buildPayload()
  const buffer = await buildMonitoreoCamasSusaludWorkbook({
    title: 'reporte-camas-susalud.xlsx',
    sheetName: 'Resumen SUSALUD',
    generatedAt: new Date('2026-04-19T02:00:00.000Z'),
    ...payload,
  })

  const wb = new ExcelJS.Workbook()
  await wb.xlsx.load(buffer)

  const mainSheet = wb.getWorksheet('Resumen SUSALUD')
  assert.ok(mainSheet)

  const auditSheet = wb.getWorksheet('AUDIT_SUSALUD')
  assert.ok(auditSheet)
  assert.equal(auditSheet.state, 'hidden')

  const header = auditSheet.getRow(1).values
  assert.ok(header.includes('audit_tipo'))
})
