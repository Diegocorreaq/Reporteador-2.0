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
    onlyTipoCama: true,
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

test('SUSALUD: emergencia ampliada usa demanda de monitoreo si no hay detalle con/sin oxigeno', () => {
  const payload = buildSusaludExportPayload({
    resumenRows: [
      {
        idservicio: 418,
        piso: 'Emergencia 1er Piso',
        servicio: 'OBSERVACION GINECO-OBSTETRICIA',
        tipo: 'Cama',
        camas: 10,
        tocupa: 0,
        total: 10,
        cocup: 8,
      },
      {
        idservicio: 418,
        piso: 'Emergencia 1er Piso',
        servicio: 'OBSERVACION GINECO-OBSTETRICIA',
        tipo: 'Silla',
        camas: 10,
        tocupa: 0,
        total: 10,
        cocup: 7,
      },
      {
        idservicio: 443,
        piso: 'Emergencia 1er Piso',
        servicio: 'OBSERVACION MEDICINA 1',
        tipo: 'Cama',
        camas: 4,
        tocupa: 9,
        total: 4,
        cocup: 4,
      },
      {
        idservicio: 424,
        piso: 'Hospitalizacion',
        servicio: 'HOSPITALIZACION MEDICINA',
        tipo: 'Cama',
        camas: 4,
        tocupa: 20,
        total: 4,
        cocup: 4,
      },
    ],
    corteTimestamp: new Date('2026-04-19T02:00:00.000Z'),
    includeAudit: true,
    onlyTipoCama: true,
  })

  assert.deepEqual(
    [
      payload.emergenciaAmpliadaRows[0].total,
      payload.emergenciaAmpliadaRows[0].conOxigeno,
      payload.emergenciaAmpliadaRows[0].sinOxigeno,
    ],
    [10, 0, 10],
  )

  const auditRow = payload.auditRows.find(
    (row) => row.audit_tipo === 'RESULTADO_BLOQUE' && row.bloque === 'EMERGENCIA_AMPLIADA',
  )
  assert.equal(auditRow.fuente_demanda_ampliada, 'demanda_monitoreo_primer_piso')
})

test('SUSALUD: emergencia ampliada clasifica oxigeno en recursos de exceso', () => {
  const payload = buildSusaludExportPayload({
    resumenRows: [
      {
        idservicio: 664,
        piso: 'Emergencia 1er Piso',
        servicio: 'OBSERVACION MEDICINA 3',
        tipo: 'Cama',
        camas: 2,
        total: 2,
        cocup: 2,
        tocupa: 13,
        c_oxigenoterapia: 2,
      },
      {
        idservicio: 664,
        piso: 'Emergencia 1er Piso',
        servicio: 'OBSERVACION MEDICINA 3',
        tipo: 'Silla',
        camas: 2,
        total: 5,
        cocup: 5,
        tocupa: 13,
        c_oxigenoterapia: 1,
      },
      {
        idservicio: 664,
        piso: 'Emergencia 1er Piso',
        servicio: 'OBSERVACION MEDICINA 3',
        tipo: 'Chailones',
        camas: 2,
        total: 6,
        cocup: 6,
        tocupa: 13,
        c_oxigenoterapia: 2,
      },
    ],
    corteTimestamp: new Date('2026-04-19T02:00:00.000Z'),
    includeAudit: true,
    onlyTipoCama: true,
  })

  assert.deepEqual(
    [
      payload.emergenciaAmpliadaRows[0].total,
      payload.emergenciaAmpliadaRows[0].conOxigeno,
      payload.emergenciaAmpliadaRows[0].sinOxigeno,
    ],
    [11, 3, 8],
  )
})

test('SUSALUD: filtro Cama excluye otros recursos antes de sumar y auditar', () => {
  const payload = buildSusaludExportPayload({
    resumenRows: [
      { idservicio: 418, piso: 'Emergencia 1er Piso', servicio: 'OBSERVACION GINECO-OBSTETRICIA', tipo: ' Cama ', camas: 262, total: 262, chabi: 262, cocup: 100, clibr: 162 },
      { idservicio: 418, piso: 'Emergencia 1er Piso', servicio: 'OBSERVACION GINECO-OBSTETRICIA', tipo: 'Silla', total: 58, chabi: 58, cocup: 58, clibr: 0 },
      { idservicio: 418, piso: 'Emergencia 1er Piso', servicio: 'OBSERVACION GINECO-OBSTETRICIA', tipo: 'Cuna', total: 34, chabi: 34, cocup: 34, clibr: 0 },
      { idservicio: 418, piso: 'Emergencia 1er Piso', servicio: 'OBSERVACION GINECO-OBSTETRICIA', tipo: 'Chailones', total: 24, chabi: 24, cocup: 24, clibr: 0 },
      { idservicio: 418, piso: 'Emergencia 1er Piso', servicio: 'OBSERVACION GINECO-OBSTETRICIA', tipo: 'Incubadora', total: 13, chabi: 13, cocup: 13, clibr: 0 },
      { idservicio: 418, piso: 'Emergencia 1er Piso', servicio: 'OBSERVACION GINECO-OBSTETRICIA', tipo: 'Camillas', total: 1, chabi: 1, cocup: 1, clibr: 0 },
    ],
    corteTimestamp: new Date('2026-04-19T02:00:00.000Z'),
    includeAudit: true,
    onlyTipoCama: true,
  })

  const emergenciaAdultos = payload.emergenciaRows.find((row) => row.upssEmergencia === 'EMERGENCIA ADULTOS')
  assert.equal(emergenciaAdultos.total, 262)
  assert.equal(payload.normalizedDataset.length, 1)
  assert.equal(payload.normalizedDataset[0].tipo, 'Cama')

  const auditDatasetRows = payload.auditRows.filter((row) => row.audit_tipo === 'DATASET_NORMALIZADO')
  assert.equal(auditDatasetRows.length, 1)
  assert.equal(String(auditDatasetRows[0].tipo).trim().toUpperCase(), 'CAMA')
})

test('SUSALUD: incluye cunas de hospitalizacion pediatrica', () => {
  const payload = buildSusaludExportPayload({
    resumenRows: [
      { idservicio: 650, piso: 'Hospitalizacion 4to Piso', servicio: 'HOSPITALIZACION PEDIATRIA', tipo: 'Cama', camas: 30, total: 20, chabi: 19, cocup: 18, clibr: 1, cinah: 1 },
      { idservicio: 650, piso: 'Hospitalizacion 4to Piso', servicio: 'HOSPITALIZACION PEDIATRIA', tipo: 'Cuna', camas: 30, total: 12, chabi: 12, cocup: 12, clibr: 0, cinah: 0 },
      { idservicio: 418, piso: 'Emergencia 1er Piso', servicio: 'OBSERVACION GINECO-OBSTETRICIA', tipo: 'Cuna', total: 34, chabi: 34, cocup: 34, clibr: 0 },
    ],
    corteTimestamp: new Date('2026-04-19T02:00:00.000Z'),
    includeAudit: true,
    onlyTipoCama: true,
  })

  const hospitalizacionPediatrica = payload.hospitalizacionRows.find(
    (row) => row.upssHospitalizacion === 'HOSPITALIZACION PEDIATRICA',
  )

  assert.deepEqual(toHospitalizacionTuple(hospitalizacionPediatrica), [30, 0, 30, 0, 30, 30, 0, 0])
  assert.equal(payload.normalizedDataset.length, 2)
  assert.ok(payload.normalizedDataset.some((row) => row.idservicio === 650 && row.tipo === 'Cuna'))
  assert.equal(payload.normalizedDataset.some((row) => row.idservicio === 418 && row.tipo === 'Cuna'), false)
})

test('SUSALUD: incluye incubadora UCI neo y cuna UCIN neo', () => {
  const payload = buildSusaludExportPayload({
    resumenRows: [
      { idservicio: 430, piso: 'Hospitalizacion 2do Piso', servicio: 'UCI NEONATOLOGIA SALA 2', tipo: 'Incubadora', camas: 8, total: 8, chabi: 8, cocup: 7, clibr: 1, cinah: 0, tocupa: 7 },
      { idservicio: 440, piso: 'Hospitalizacion 2do Piso', servicio: 'UCIN NEONATOLOGIA SALA 1', tipo: 'Cuna', camas: 8, total: 16, chabi: 13, cocup: 8, clibr: 5, cinah: 3, tocupa: 8 },
      { idservicio: 440, piso: 'Hospitalizacion 2do Piso', servicio: 'UCIN NEONATOLOGIA SALA 1', tipo: 'Incubadora', camas: 8, total: 1, chabi: 0, cocup: 0, clibr: 0, cinah: 1, tocupa: 8 },
      { idservicio: 441, piso: 'Hospitalizacion 2do Piso', servicio: 'UCIN NEONATOLOGIA SALA 3', tipo: 'Cuna', camas: 7, total: 3, chabi: 3, cocup: 3, clibr: 0, cinah: 0, tocupa: 6 },
      { idservicio: 441, piso: 'Hospitalizacion 2do Piso', servicio: 'UCIN NEONATOLOGIA SALA 3', tipo: 'Incubadora', camas: 7, total: 4, chabi: 4, cocup: 4, clibr: 0, cinah: 0, tocupa: 6 },
    ],
    corteTimestamp: new Date('2026-04-19T02:00:00.000Z'),
    includeAudit: true,
    onlyTipoCama: true,
  })

  const uciNeonatologia = payload.uciRows.find((row) => row.upssUci === 'UCI NEONATOLOGIA')
  const ucinNeonatologia = payload.ucinRows.find((row) => row.upssUcin === 'UCIN NEONATOLOGIA')

  assert.deepEqual(toUciTuple(uciNeonatologia), [8, 0, 8, 1, 7, 7, 0, 0])
  assert.deepEqual(toUcinTuple(ucinNeonatologia), [15, 4, 11, 0, 11, 11, 0, 0, 0])
  assert.deepEqual(
    payload.normalizedDataset.map((row) => [row.idservicio, row.tipo]),
    [
      [430, 'Incubadora'],
      [440, 'Cuna'],
      [441, 'Cuna'],
    ],
  )
})

test('SUSALUD: capacidad oficial usa camas arq por servicio', () => {
  const payload = buildSusaludExportPayload({
    resumenRows: [
      { idservicio: 669, piso: 'Hospitalizacion 2do Piso', servicio: 'UCIN ADULTOS C', tipo: 'Cama', camas: 8, total: 10, chabi: 8, cocup: 8, clibr: 0, cinah: 2, tocupa: 8 },
    ],
    corteTimestamp: new Date('2026-04-19T02:00:00.000Z'),
    includeAudit: true,
    onlyTipoCama: true,
  })

  const ucinAdultos = payload.ucinRows.find((row) => row.upssUcin === 'UCIN ADULTO')
  assert.deepEqual(toUcinTuple(ucinAdultos), [8, 0, 8, 0, 8, 8, 0, 0, 0])
})

test('SUSALUD: areas que componen solo lista servicios presentes en el tablero', () => {
  const payload = buildPayload()
  const emergenciaAdultos = payload.emergenciaRows.find((row) => row.upssEmergencia === 'EMERGENCIA ADULTOS')

  assert.ok(emergenciaAdultos)
  assert.match(emergenciaAdultos.areas, /OBSERVACION GINECO-OBSTETRICIA/)
  assert.match(emergenciaAdultos.areas, /OBSERVACION MEDICINA 1/)
  assert.match(emergenciaAdultos.areas, /OBSERVACION QUIRURGICA/)
  assert.doesNotMatch(emergenciaAdultos.areas, /OBSERVACION MEDICINA 2/)
  assert.doesNotMatch(emergenciaAdultos.areas, /OBSERVACION MEDICINA 4/)
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
