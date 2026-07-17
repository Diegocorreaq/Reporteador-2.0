import assert from 'node:assert/strict'
import fs from 'node:fs/promises'
import path from 'node:path'
import test from 'node:test'
import { fileURLToPath, pathToFileURL } from 'node:url'

const rootDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..')

const migratedServiceFiles = [
  'server/services/centro-obstetrico-report.service.js',
  'server/services/epidemiologia-reportes.service.js',
  'server/services/lavado-manos.service.js',
  'server/services/legacy-export.service.js',
  'server/services/legacy-sql.service.js',
  'server/services/ppr-data.service.js',
  'server/services/ppr-program-documents.service.js',
  'server/services/ppr-signature-document.service.js',
  'server/services/sigh-camas.service.js',
  'server/services/sigh-monitoreo.service.js',
  'server/services/sigh-prod-medicos.service.js',
  'server/services/sigh-prod-obstetras.service.js',
  'server/services/sigh-sql-helpers.js',
]

const expectedExports = new Map([
  ['server/services/centro-obstetrico-report.service.js', ['getCentroObstetricoReport']],
  ['server/services/epidemiologia-reportes.service.js', ['exportEpidemiologiaReporte']],
  ['server/services/lavado-manos.service.js', ['listLavadoManos', 'createLavadoRegistro', 'anularLavadoRegistro']],
  ['server/services/legacy-export.service.js', ['executeConfiguredExport', 'validateLegacyUser', 'listCatalogExports']],
  ['server/services/legacy-sql.service.js', ['executeProcedure', 'executeProcedureRecordsets', 'sql']],
  ['server/services/ppr-data.service.js', ['getPeriodoActivo', 'runPprImport', 'getEvaluacionMensual']],
  ['server/services/ppr-program-documents.service.js', ['canAccessPprProgramDocument', 'getPprProgramDocumentFile', 'upsertPprProgramDocument']],
  ['server/services/ppr-signature-document.service.js', ['getPprDraftDocumentFile', 'signPprPeriodWithMockDocument', 'getPprSignedDocumentFile']],
  ['server/services/sigh-camas.service.js', ['listTiposCama', 'getCamasDetalle', 'normalizeCamasDetalleRows']],
  ['server/services/sigh-monitoreo.service.js', ['listFamiliaPendienteUpss', 'getFamiliaPendienteReport']],
  ['server/services/sigh-prod-medicos.service.js', ['searchProduccionMedicos', 'getProduccionMedicosResumen']],
  ['server/services/sigh-prod-obstetras.service.js', ['searchProduccionObstetras', 'createObstetricProductionService']],
  ['server/services/sigh-sql-helpers.js', ['executeProcedure_Sigh1', 'executeProcedure_Sigh2', 'executeProcedure_Cnv', 'executeProcedure_General', 'sql']],
])

const sqlFiles = [
  'server/sql/001-app-report-procedures.sql',
  'server/sql/002-ppr-data-procedures.sql',
  'server/sql/003-ppr-document-procedures.sql',
  'server/sql/004-legacy-export-procedures.sql',
]

function absolutePath(relativePath) {
  return path.join(rootDir, relativePath)
}

async function readProjectFile(relativePath) {
  return fs.readFile(absolutePath(relativePath), 'utf8')
}

test('los servicios migrados cargan y mantienen sus exports publicos', async () => {
  for (const file of migratedServiceFiles) {
    const moduleUrl = pathToFileURL(absolutePath(file)).href
    const serviceModule = await import(moduleUrl)

    for (const exportName of expectedExports.get(file) ?? []) {
      assert.ok(
        Object.prototype.hasOwnProperty.call(serviceModule, exportName),
        `${file} debe exportar ${exportName}`,
      )
    }
  }
})

test('los servicios migrados no contienen consultas SQL directas', async () => {
  const forbiddenPatterns = [
    /\bexecuteQuery\b/i,
    /\.query\s*\(/i,
    /\bSELECT\s+/i,
    /\bINSERT\s+INTO\b/i,
    /\bUPDATE\s+/i,
    /\bDELETE\s+FROM\b/i,
    /\bCREATE\s+TABLE\b/i,
    /\bALTER\s+TABLE\b/i,
  ]

  for (const file of migratedServiceFiles) {
    const source = await readProjectFile(file)
    for (const pattern of forbiddenPatterns) {
      assert.equal(pattern.test(source), false, `${file} no debe contener ${pattern}`)
    }
  }
})

test('todo procedimiento SP_APP usado por servicios tiene definicion SQL', async () => {
  const serviceSources = await Promise.all(migratedServiceFiles.map((file) => readProjectFile(file)))
  const usedProcedures = new Set()

  for (const source of serviceSources) {
    for (const match of source.matchAll(/['"`](SP_APP_[A-Z0-9_]+)['"`]/g)) {
      usedProcedures.add(match[1])
    }
  }

  assert.ok(usedProcedures.size > 0, 'debe detectar procedimientos SP_APP usados por servicios')

  const sqlSource = (await Promise.all(sqlFiles.map((file) => readProjectFile(file)))).join('\n')

  for (const procedureName of [...usedProcedures].sort()) {
    assert.match(
      sqlSource,
      new RegExp(`CREATE\\s+OR\\s+ALTER\\s+PROCEDURE\\s+dbo\\.${procedureName}\\b`, 'i'),
      `${procedureName} debe estar definido en server/sql`,
    )
  }
})

test('los helpers SQL solo exponen ejecucion de procedimientos', async () => {
  const legacySql = await import(pathToFileURL(absolutePath('server/services/legacy-sql.service.js')).href)
  const sighHelpers = await import(pathToFileURL(absolutePath('server/services/sigh-sql-helpers.js')).href)

  assert.equal('executeQuery' in legacySql, false)
  assert.equal('executeQuery_General' in sighHelpers, false)
  assert.equal('executeQuery_Sigh1' in sighHelpers, false)
  assert.equal('executeQuery_Sigh2' in sighHelpers, false)
})
