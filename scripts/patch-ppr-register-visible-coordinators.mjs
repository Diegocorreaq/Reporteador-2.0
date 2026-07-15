import fs from 'node:fs/promises'
import path from 'node:path'
import { getSqlPool, closeSqlPool, sql } from '../server/db/sql-server.js'
import { getCoordinadores } from '../server/services/ppr-data.service.js'

const stamp = new Date().toISOString().replace(/[:.]/g, '-')
const backupDir = path.join('informes', 'ppr-sp-backups', `ppr-visible-coordinators-${stamp}`)
const adminId = 5713
const employeeIds = [4226, 1780, 2791, 2586, 2865, 4758]

async function backupState(suffix) {
  const pool = await getSqlPool('general')
  const coordinadores = await pool.request().query(`
    SELECT *
    FROM dbo.ppr_coordinadores
    WHERE idempleado IN (${employeeIds.join(',')})
    ORDER BY idempleado;
  `)

  await fs.writeFile(
    path.join(backupDir, `ppr_coordinadores-${suffix}.json`),
    JSON.stringify(coordinadores.recordset, null, 2),
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

  try {
    await backupState('before')

    const pool = await getSqlPool('general')
    for (const employeeId of employeeIds) {
      const result = await pool.request()
        .input('idempleado', sql.Int, employeeId)
        .input('admin_id', sql.Int, adminId)
        .query(`
          DECLARE @nombre NVARCHAR(255);
          DECLARE @dni NVARCHAR(20);

          SELECT
            @nombre = LTRIM(RTRIM(Empleado)),
            @dni = LTRIM(RTRIM(DNI))
          FROM dbo.T_Empleado
          WHERE IdEmpleado = @idempleado;

          IF @nombre IS NULL
            THROW 50001, 'No existe empleado en dbo.T_Empleado', 1;

          IF EXISTS (SELECT 1 FROM dbo.ppr_coordinadores WHERE idempleado = @idempleado)
          BEGIN
            UPDATE dbo.ppr_coordinadores
            SET nombre = @nombre,
                dni = @dni,
                activo = 1,
                admin_id = @admin_id
            WHERE idempleado = @idempleado;

            SELECT 'actualizado' AS action, @nombre AS nombre;
          END
          ELSE
          BEGIN
            INSERT INTO dbo.ppr_coordinadores (idempleado, nombre, dni, activo, fecha_alta, admin_id)
            VALUES (@idempleado, @nombre, @dni, 1, GETDATE(), @admin_id);

            SELECT 'insertado' AS action, @nombre AS nombre;
          END
        `)
      const row = result.recordset[0]
      console.log(`${employeeId}: ${row.action} ${row.nombre}`)
    }

    await backupState('after')
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
