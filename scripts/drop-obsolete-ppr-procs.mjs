import fs from 'node:fs/promises'
import path from 'node:path'
import { getSqlPool, closeSqlPool, sql } from '../server/db/sql-server.js'

const obsoleteProcedures = [
  'sp_PPR_0002_Diario',
  'sp_PPR_0129_Diario',
  'sp_PPR_024_Diario',
  'sp_Load_PPR_002',
  'sp_Load_PPR_0129',
  'sp_Load_PPR_024',
  'sp_Update_PPR_0002_Consolida',
  'sp_Update_PpR_0018',
  'sp_Update_PpR_0024',
  'sp_Update_PPR_0129_Consolida',
  'sp_Update_PPR_024_Consolida',
  'SP_PPR_GUARDAR_VALOR',
]

const backupDir = path.join(
  'informes',
  'ppr-sp-backups',
  `drop-obsolete-${new Date().toISOString().replace(/[:.]/g, '-')}`,
)

async function readDefinition(pool, procedureName) {
  const result = await pool.request()
    .input('procedure_name', sql.NVarChar(128), procedureName)
    .query(`
      SELECT OBJECT_DEFINITION(OBJECT_ID('dbo.' + @procedure_name)) AS definition;
    `)
  return result.recordset[0]?.definition ?? null
}

async function main() {
  await fs.mkdir(backupDir, { recursive: true })

  const pool = await getSqlPool('general')
  try {
    for (const procedureName of obsoleteProcedures) {
      const definition = await readDefinition(pool, procedureName)
      if (!definition) {
        console.log(`NO EXISTE dbo.${procedureName}`)
        continue
      }
      await fs.writeFile(path.join(backupDir, `${procedureName}.sql`), definition, 'utf8')
    }

    for (const procedureName of obsoleteProcedures) {
      await pool.request()
        .input('procedure_name', sql.NVarChar(128), procedureName)
        .query(`
          DECLARE @sql NVARCHAR(MAX);
          IF OBJECT_ID(N'dbo.' + QUOTENAME(@procedure_name), 'P') IS NOT NULL
          BEGIN
            SET @sql = N'DROP PROCEDURE dbo.' + QUOTENAME(@procedure_name) + N';';
            EXEC sys.sp_executesql @sql;
          END
        `)
      console.log(`DROP dbo.${procedureName}`)
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
