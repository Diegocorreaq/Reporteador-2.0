import fs from 'node:fs/promises'
import path from 'node:path'
import { getSqlPool, closeSqlPool, sql } from '../server/db/sql-server.js'

const backupDir = path.join('informes', 'ppr-sp-backups', new Date().toISOString().replace(/[:.]/g, '-'))

async function readDefinition(pool, procedureName) {
  const result = await pool.request()
    .input('procedure_name', sql.NVarChar(128), procedureName)
    .query(`
      SELECT OBJECT_DEFINITION(OBJECT_ID('dbo.' + @procedure_name)) AS definition;
    `)
  const definition = result.recordset[0]?.definition
  if (!definition) throw new Error(`No se encontro dbo.${procedureName}`)
  return definition
}

function toAlter(definition) {
  return definition.replace(/^\s*CREATE\s+PROCEDURE/i, 'ALTER PROCEDURE')
}

function patch0024(definition) {
  const needle = `) FinalRows
    GROUP BY ACTIVIDAD`
  const replacement = `) FinalRows
    WHERE LEFT(LTRIM(ACTIVIDAD), 7) <> '0215098'
    GROUP BY ACTIVIDAD`
  if (definition.includes(replacement)) return definition
  if (!definition.includes(needle)) throw new Error('No se encontro punto de parche para usp_PPR_0024')
  return definition.replace(needle, replacement)
}

function patch0129(definition) {
  return definition
    .replace('--0515008 ENFERMEDAD CEREBRO VASCULAR', '--0515105 ENFERMEDAD CEREBRO VASCULARES')
    .replace(
      "SELECT '0515008 - ENFERMEDAD CEREBRO VASCULAR' [ACTIVIDAD]",
      "SELECT '0515105 - ENFERMEDAD CEREBRO VASCULARES' [ACTIVIDAD]",
    )
}

function patch9002(definition) {
  const needle = `  ) R;
END`
  const replacement = `  ) R
  WHERE SOURCE_KEY NOT IN (
    'AOI00167000349',
    'AOI00167000363',
    'AOI00167000365',
    'AOI00167000366',
    'AOI00167000367'
  );
END`
  if (definition.includes(replacement)) return definition
  if (!definition.includes(needle)) throw new Error('No se encontro punto de parche para usp_PPR_9002')
  return definition.replace(needle, replacement)
}

const patches = [
  { name: 'usp_PPR_0024', patch: patch0024 },
  { name: 'usp_PPR_0129', patch: patch0129 },
  { name: 'usp_PPR_9002', patch: patch9002 },
]

async function main() {
  await fs.mkdir(backupDir, { recursive: true })

  const pool = await getSqlPool('general')
  try {
    for (const item of patches) {
      const original = await readDefinition(pool, item.name)
      await fs.writeFile(path.join(backupDir, `${item.name}.sql`), original, 'utf8')

      const patched = toAlter(item.patch(original))
      if (patched === toAlter(original)) {
        console.log(`SIN CAMBIOS dbo.${item.name}`)
        continue
      }

      await pool.request()
        .input('definition', sql.NVarChar(sql.MAX), patched)
        .query('EXEC sys.sp_executesql @definition;')
      console.log(`OK dbo.${item.name}`)
    }

    console.log(`Respaldos: ${backupDir}`)
  } finally {
    await closeSqlPool('general')
  }
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(`ERROR ${error.message}`)
    process.exit(1)
  })
