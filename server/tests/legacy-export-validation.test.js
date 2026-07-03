import test from 'node:test'
import assert from 'node:assert/strict'

import { ExportValidationError, executeConfiguredExport } from '../services/legacy-export.service.js'

async function assertValidationError(payload, expectedMessage) {
  await assert.rejects(
    () => executeConfiguredExport(payload),
    (error) => {
      assert.ok(error instanceof ExportValidationError)
      assert.equal(error.statusCode, 400)
      assert.equal(error.message, expectedMessage)
      return true
    },
  )
}

const baseRangePayload = {
  catalog: 'range',
  key: 'exporta_d_xls_11',
  employeeId: 5713,
  ip: '127.0.0.1',
}

test('legacy export validation rejects unknown export definitions before SQL', async () => {
  await assertValidationError(
    {
      ...baseRangePayload,
      key: 'exporta_d_xls_desconocido',
      startDate: '2026-06-28',
      endDate: '2026-06-30',
    },
    'No se encontro la configuracion del exporte solicitado.',
  )
})

test('legacy export validation requires both dates for range catalogs', async () => {
  await assertValidationError(
    {
      ...baseRangePayload,
      startDate: '2026-06-28',
      endDate: undefined,
    },
    'Debe indicar fecha de inicio y fecha fin.',
  )
})

test('legacy export validation rejects malformed dates', async () => {
  await assertValidationError(
    {
      ...baseRangePayload,
      startDate: '28/06/2026',
      endDate: '2026-06-30',
    },
    'Las fechas deben tener formato YYYY-MM-DD.',
  )
})

test('legacy export validation rejects inverted ranges', async () => {
  await assertValidationError(
    {
      ...baseRangePayload,
      startDate: '2026-06-30',
      endDate: '2026-06-28',
    },
    'La fecha de inicio no puede ser mayor que la fecha fin.',
  )
})

test('legacy export validation enforces report max days', async () => {
  await assertValidationError(
    {
      ...baseRangePayload,
      startDate: '2026-01-01',
      endDate: '2026-07-03',
    },
    'El rango de fechas no debe exceder 92 dias.',
  )
})
