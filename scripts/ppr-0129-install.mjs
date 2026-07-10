import { readFile } from 'node:fs/promises'
import { fileURLToPath } from 'node:url'
import { dirname, join } from 'node:path'
import { getSqlPool, closeSqlPool } from '../server/db/sql-server.js'

const __dirname = dirname(fileURLToPath(import.meta.url))

function buildProcedureSql(sourceSql) {
  const body = sourceSql
    .replace(/^\uFEFF/, '')
    .split(/\r?\n/)
    .filter((line) => !/^\s*use\s+SIGH_DEPURA\b/i.test(line))
    .filter((line) => !/^\s*DECLARE\s+@FECHAINICIO\b/i.test(line))
    .filter((line) => !/^\s*DECLARE\s+@FECHAFIN\b/i.test(line))
    .join('\n')
    .replace(/@FECHAINICIO/gi, '@FechaInicio')
    .replace(/@FECHAFIN/gi, '@FechaFin')
    .trim()

  return `
CREATE_OR_ALTER PROCEDURE dbo.usp_PPR_0129
  @FechaInicio DATE,
  @FechaFin DATE
WITH RECOMPILE
AS
BEGIN
  SET NOCOUNT ON;

${body}
END
`
}

function normalizeRows(rows) {
  return rows.map((row) => ({
    actividad: String(row.ACTIVIDAD ?? row.Actividad ?? row.actividad ?? ''),
    total: Number(row.TOTAL ?? row.Total ?? row.total ?? 0),
  }))
}

const sourceSql = await readFile(join(__dirname, 'ppr-0129.sql'), 'utf8')
const procedureSql = buildProcedureSql(sourceSql)
const pool = await getSqlPool('general')

try {
  const existsResult = await pool.request().query("SELECT OBJECT_ID('dbo.usp_PPR_0129', 'P') AS id")
  const verb = existsResult.recordset[0]?.id ? 'ALTER' : 'CREATE'

  const installRequest = pool.request()
  installRequest.timeout = 300000
  await installRequest.query(procedureSql.replace('CREATE_OR_ALTER', verb))
  console.log('dbo.usp_PPR_0129 creado/actualizado.')

  const verifyRequest = pool.request()
  verifyRequest.timeout = 300000
  const verifyResult = await verifyRequest.query(`
    EXEC dbo.usp_PPR_0129
      @FechaInicio = '2026-06-01',
      @FechaFin = '2026-06-30';
  `)
  console.table(normalizeRows(verifyResult.recordset))
} finally {
  await closeSqlPool('general')
}
