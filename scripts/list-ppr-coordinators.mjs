import { getSqlPool, closeSqlPool } from '../server/db/sql-server.js'

async function main() {
  const pool = await getSqlPool('general')
  try {
    const result = await pool.request().query(`
      SELECT
        p.code AS program_code,
        p.name AS program_name,
        up.employee_id,
        e.DNI AS dni,
        UPPER(CONCAT(e.ApellidoPaterno, ' ', e.ApellidoMaterno, ' ', e.Nombres)) AS employee_name
      FROM dbo.ppr_programs p
      LEFT JOIN dbo.ppr_user_programs up
        ON up.program_id = p.id
       AND ISNULL(up.is_active, 1) = 1
      LEFT JOIN SIGH_DEPURA..T_Empleado e
        ON e.IDEMPLEADO = up.employee_id
      ORDER BY
        CASE WHEN ISNUMERIC(p.code) = 1 THEN CONVERT(INT, p.code) ELSE 999999 END,
        p.code,
        employee_name;
    `)

    let currentProgram = null
    for (const row of result.recordset) {
      const program = `${row.program_code} - ${row.program_name}`
      if (program !== currentProgram) {
        currentProgram = program
        console.log(`\n${program}`)
      }

      if (!row.employee_id) {
        console.log('  - Sin coordinadores activos')
        continue
      }

      console.log(`  - ${row.employee_name} | DNI ${row.dni} | employee_id ${row.employee_id}`)
    }
  } finally {
    await closeSqlPool('general')
  }
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error.message)
    process.exit(1)
  })
