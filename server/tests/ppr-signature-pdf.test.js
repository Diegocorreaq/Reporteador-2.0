import assert from 'node:assert/strict'
import test from 'node:test'
import { buildPprMonthlySignaturePdf, MIME_PDF } from '../services/pdf-export.service.js'

test('genera un PDF PPR multipagina con firma ficticia', () => {
  const rows = Array.from({ length: 45 }, (_, index) => ({
    programCode: index < 25 ? '129' : '9002',
    activityCode: `AOI${String(index + 1).padStart(12, '0')}`,
    activityName: `Actividad operativa de prueba ${index + 1}`,
    unit: 'ATENCION',
    annualGoal: 120,
    monthValue: index,
    accumulatedValue: index * 3,
    annualProgress: index * 2.5,
  }))

  const pdf = buildPprMonthlySignaturePdf({
    document: {
      year: 2026,
      month: 5,
      signerDni: '12345678',
      signerName: 'USUARIO DE PRUEBA',
      signedAt: new Date('2026-06-15T15:00:00Z'),
      documentCode: 'PPR-2026-05-1-TEST',
      contentHash: 'a'.repeat(64),
      signatureLabel: 'FIRMA FICTICIA DE PRUEBA - NO RENIEC',
      totalActivities: rows.length,
    },
    rows,
  })

  assert.equal(MIME_PDF, 'application/pdf')
  assert.ok(Buffer.isBuffer(pdf))
  assert.equal(pdf.subarray(0, 8).toString('ascii'), '%PDF-1.3')
  assert.ok(pdf.length > 4_000)
  assert.match(pdf.toString('binary'), /\/Count 3/)
})

test('genera un borrador PPR sin requerir datos de firma', () => {
  const pdf = buildPprMonthlySignaturePdf({
    document: {
      year: 2026,
      month: 6,
      signerDni: '12345678',
      signerName: 'USUARIO DE PRUEBA',
      signedAt: null,
      isSigned: false,
      documentCode: 'BORRADOR - SIN FIRMA',
      contentHash: '',
      signatureLabel: '',
      totalActivities: 1,
    },
    rows: [{
      programCode: '1001',
      activityCode: 'AOI001',
      activityName: 'Actividad de prueba',
      unit: 'ATENCION',
      annualGoal: 100,
      monthValue: 10,
      accumulatedValue: 30,
      annualProgress: 30,
    }],
  })

  assert.ok(Buffer.isBuffer(pdf))
  assert.equal(pdf.subarray(0, 8).toString('ascii'), '%PDF-1.3')
  assert.ok(pdf.length > 1_000)
})
