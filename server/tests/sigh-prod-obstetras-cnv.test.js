import assert from 'node:assert/strict'
import test from 'node:test'
import ExcelJS from 'exceljs'
import {
  createObstetricProductionService,
  mergeCnvIntoDetail,
  mergeCnvIntoSummary,
} from '../services/sigh-prod-obstetras.service.js'
import { buildProduccionObstetrasWorkbook } from '../services/excel-export.service.js'

const filters = {
  empleadoId: 5900,
  fechaInicio: '2026-06-04',
  fechaFin: '2026-06-04',
}

const employee = {
  idEmpleado: 5900,
  dni: '12345678',
  nombre: 'RODRIGUEZ CANGALAYA CYNTHIA STEPHANIE',
  tipoEmpleado: 'OBSTETRA',
}

function cnvRow(index, overrides = {}) {
  return {
    COD_ACT: 7,
    TIPO_ACTIVIDAD: 'REGISTRO_CNV',
    CANTIDAD: 1,
    NOMBRE_PROFESIONAL: employee.nombre,
    DNI: employee.dni,
    TIPO_EMPLEADO: employee.tipoEmpleado,
    SERVICIO_ACTIVIDAD: 'CENTRO OBSTETRICO',
    CUENTA: 1000 + index,
    FECHA: '2026-06-04',
    HORA: `08:0${index}:00`,
    NOMBRE_PACIENTE: `PACIENTE ${index}`,
    PUNTO_CARGA: 'SIGH_DEPURA.dbo.Rpt_Indicador_Cnv',
    ...overrides,
  }
}

function createService({
  cnvRows = [cnvRow(1), cnvRow(2), cnvRow(3), cnvRow(4)],
  cnvError = null,
  summaryRows,
  detailRows,
  buildWorkbook = async () => Buffer.from('xlsx'),
  buildPdf = () => Buffer.from('pdf'),
} = {}) {
  const loggedErrors = []
  const service = createObstetricProductionService({
    executeMainQuery: async () => [employee],
    executeMainProcedure: async (name) => {
      if (name === 'SP_REPORTE_PROD_MED_FECHA') {
        return [{ DIA_INI: 4, DIA_FIN: 4, NRO_DIA: 1 }]
      }
      if (name === 'SP_REPORTE_PRODUCCION_OBST_P1') {
        return summaryRows ?? [
          { ORD: 1, TIPOACTIVIDAD: 'ATENCION_CE', 4: 2 },
          { ORD: 8, TIPOACTIVIDAD: 'REGISTRO_CNV', 4: 99 },
        ]
      }
      if (name === 'SP_REPORTE_PRODUCCION_OBST_P2') {
        return detailRows ?? [
          { COD_ACT: 1, TIPO_ACTIVIDAD: 'ATENCION_CE', CUENTA: 50, FECHA: '2026-06-04' },
          { COD_ACT: 8, TIPO_ACTIVIDAD: 'REGISTRO_CNV', CUENTA: 999, FECHA: '2026-06-04' },
        ]
      }
      throw new Error(`Unexpected procedure: ${name}`)
    },
    executeCnvProcedure: async () => {
      if (cnvError) throw cnvError
      return cnvRows
    },
    buildWorkbook,
    buildPdf,
    log: {
      error: (entry) => loggedErrors.push(entry),
    },
  })
  return { service, loggedErrors }
}

test('reemplaza CNV principal y conserva las demas actividades', () => {
  const result = mergeCnvIntoDetail(
    [
      { COD_ACT: 2, TIPO_ACTIVIDAD: 'ATENCION_PARTO', CUENTA: 2 },
      { COD_ACT: 8, TIPO_ACTIVIDAD: 'REGISTRO_CNV', CUENTA: 999 },
    ],
    [cnvRow(1), cnvRow(2)],
  )

  assert.equal(result.filter((row) => row.TIPO_ACTIVIDAD === 'REGISTRO_CNV').length, 2)
  assert.equal(result.some((row) => row.CUENTA === 999), false)
  assert.equal(result.some((row) => row.TIPO_ACTIVIDAD === 'ATENCION_PARTO'), true)
})

test('agrupa el CNV externo por dia y reemplaza el total principal', () => {
  const rows = mergeCnvIntoSummary(
    [{ ORD: 8, TIPOACTIVIDAD: 'REGISTRO_CNV', 4: 99, 5: 88 }],
    [cnvRow(1), cnvRow(2), cnvRow(3, { FECHA: '2026-06-05', CANTIDAD: 3 })],
    { diaInicio: 4, diaFin: 5, numeroDias: 2 },
  )
  const cnv = rows.find((row) => row.TIPOACTIVIDAD === 'REGISTRO_CNV')

  assert.equal(cnv['4'], 2)
  assert.equal(cnv['5'], 3)
})

test('una respuesta CNV exitosa sin filas deja el resumen en cero y elimina el detalle principal', async () => {
  const { service } = createService({ cnvRows: [] })
  const [summary, detail] = await Promise.all([
    service.getDailySummary(filters),
    service.getDetailedProduction(filters),
  ])

  assert.equal(summary.rows.find((row) => row.TIPOACTIVIDAD === 'REGISTRO_CNV')['4'], 0)
  assert.equal(detail.rows.some((row) => row.TIPO_ACTIVIDAD === 'REGISTRO_CNV'), false)
  assert.deepEqual(summary.warnings, [])
})

test('la caida de CNV conserva los registros principales y devuelve advertencia controlada', async () => {
  const { service, loggedErrors } = createService({ cnvError: new Error('login failed password=secret') })
  const [summary, detail] = await Promise.all([
    service.getDailySummary(filters),
    service.getDetailedProduction(filters),
  ])

  assert.equal(summary.rows.find((row) => row.TIPOACTIVIDAD === 'REGISTRO_CNV')['4'], 99)
  assert.equal(detail.rows.some((row) => row.TIPO_ACTIVIDAD === 'REGISTRO_CNV'), true)
  assert.equal(summary.warnings[0].code, 'CNV_SOURCE_UNAVAILABLE')
  assert.equal(summary.warnings[0].message.includes('secret'), false)
  assert.equal(loggedErrors.length, 2)
})

test('IdEmpleado 5900 del 2026-06-04 produce cuatro CNV externos sin duplicados', async () => {
  const { service } = createService()
  const [summary, detail] = await Promise.all([
    service.getDailySummary(filters),
    service.getDetailedProduction(filters),
  ])
  const cnvRows = detail.rows.filter((row) => row.TIPO_ACTIVIDAD === 'REGISTRO_CNV')

  assert.equal(summary.rows.find((row) => row.TIPOACTIVIDAD === 'REGISTRO_CNV')['4'], 4)
  assert.equal(cnvRows.length, 4)
  assert.equal(cnvRows.every((row) => row.COD_ACT === 7), true)
  assert.equal(cnvRows.every((row) => row.FECHA === '2026-06-04'), true)
  assert.equal(cnvRows.every((row) => row.PUNTO_CARGA === 'SIGH_DEPURA.dbo.Rpt_Indicador_Cnv'), true)
})

test('Excel contiene cuatro CNV externos y ninguna fila CNV principal', async () => {
  const { service } = createService({ buildWorkbook: buildProduccionObstetrasWorkbook })
  const file = await service.exportExcel(filters)
  const workbook = new ExcelJS.Workbook()
  await workbook.xlsx.load(file.content)
  const sheet = workbook.worksheets[0]
  const headers = sheet.getRow(4).values
  const activityColumn = headers.indexOf('TIPO_ACTIVIDAD')
  const accountColumn = headers.indexOf('CUENTA')
  const cnvAccounts = []

  sheet.eachRow((row, rowNumber) => {
    if (rowNumber >= 5 && row.getCell(activityColumn).value === 'REGISTRO_CNV') {
      cnvAccounts.push(Number(row.getCell(accountColumn).value))
    }
  })

  assert.deepEqual(cnvAccounts.sort((a, b) => a - b), [1001, 1002, 1003, 1004])
})

test('PDF recibe el resumen combinado con cuatro CNV', async () => {
  let receivedRows = []
  const { service } = createService({
    buildPdf: ({ rows }) => {
      receivedRows = rows
      return Buffer.from('pdf')
    },
  })
  await service.exportPdf(filters)

  assert.equal(receivedRows.find((row) => row.TIPOACTIVIDAD === 'REGISTRO_CNV')['4'], 4)
})
