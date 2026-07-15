import fs from 'node:fs/promises'
import path from 'node:path'
import { getSqlPool, closeSqlPool, sql } from '../server/db/sql-server.js'
import { getCoordinadores } from '../server/services/ppr-data.service.js'

const stamp = new Date().toISOString().replace(/[:.]/g, '-')
const backupDir = path.join('informes', 'ppr-sp-backups', `remove-129-5211-${stamp}`)

async function backup(pool, suffix) {
  const rows = await pool.request().query(`
    SELECT
      up.id,
      up.employee_id,
      e.Empleado AS employee_name,
      e.DNI AS dni,
      up.program_id,
      p.code AS program_code,
      p.name AS program_name,
      up.is_active
    FROM dbo.ppr_user_programs up
    INNER JOIN dbo.ppr_programs p ON p.id = up.program_id
    INNER JOIN dbo.T_Empleado e ON e.IdEmpleado = up.employee_id
    WHERE up.employee_id = 5211
       OR p.code = '129'
    ORDER BY p.code, e.Empleado;
  `)

  await fs.writeFile(
    path.join(backupDir, `ppr_user_programs-${suffix}.json`),
    JSON.stringify(rows.recordset, null, 2),
    'utf8',
  )

  const moduleRows = await getCoordinadores()
  await fs.writeFile(
    path.join(backupDir, `SP_PPR_ADMIN_COORDINADORES-${suffix}.json`),
    JSON.stringify(moduleRows, null, 2),
    'utf8',
  )
}

async function main() {
  await fs.mkdir(backupDir, { recursive: true })

  const pool = await getSqlPool('general')
  try {
    await backup(pool, 'before')

    const result = await pool.request()
      .input('employee_id', sql.Int, 5211)
      .input('program_code', sql.VarChar(20), '129')
      .query(`
        UPDATE up
        SET is_active = 0
        FROM dbo.ppr_user_programs up
        INNER JOIN dbo.ppr_programs p ON p.id = up.program_id
        WHERE up.employee_id = @employee_id
          AND p.code = @program_code
          AND ISNULL(up.is_active, 1) = 1;

        SELECT @@ROWCOUNT AS affected;
      `)

    await backup(pool, 'after')

    console.log(`OK 5211 removido de 129; filas afectadas=${Number(result.recordset[0]?.affected ?? 0)}`)
    console.log(`Respaldos: ${backupDir}`)
  } finally {
    await closeSqlPool()
  }
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(`ERROR ${error.message}`)
    process.exit(1)
  })
