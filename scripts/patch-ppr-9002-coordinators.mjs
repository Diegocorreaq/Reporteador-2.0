import fs from 'node:fs/promises'
import path from 'node:path'
import { getSqlPool, closeSqlPool, sql } from '../server/db/sql-server.js'
import { getCoordinadores } from '../server/services/ppr-data.service.js'

const stamp = new Date().toISOString().replace(/[:.]/g, '-')
const backupDir = path.join('informes', 'ppr-sp-backups', `ppr-9002-coordinators-${stamp}`)

const adminEmployeeId = 5713
const mainProgramCode = '9002'
const subprogramAssignments = [
  { programCode: '9002-NUT', employeeId: 4315, note: 'Nutricion' },
  { programCode: '9002-SS', employeeId: 2916, note: 'Asistencia Social' },
  { programCode: '9002-TS', employeeId: 2787, note: 'Telesalud' },
]

function employeeNameExpression(alias = 'e') {
  return `UPPER(CONCAT(${alias}.ApellidoPaterno, ' ', ${alias}.ApellidoMaterno, ' ', ${alias}.Nombres))`
}

function quote(value) {
  return `'${String(value).replace(/'/g, "''")}'`
}

async function query(pool, text) {
  const result = await pool.request().query(text)
  return result.recordset
}

async function scalar(pool, text) {
  const rows = await query(pool, text)
  return rows[0]
}

async function backupRows(pool, suffix) {
  const rows = await query(pool, `
    SELECT
      up.id,
      up.employee_id,
      ${employeeNameExpression('e')} AS employee_name,
      e.DNI AS dni,
      up.program_id,
      p.code AS program_code,
      p.name AS program_name,
      up.is_active
    FROM dbo.ppr_user_programs up
    INNER JOIN dbo.ppr_programs p ON p.id = up.program_id
    INNER JOIN SIGH_DEPURA..T_Empleado e ON e.IDEMPLEADO = up.employee_id
    WHERE p.code = ${quote(mainProgramCode)}
       OR p.code LIKE '9002-%'
       OR up.employee_id = ${adminEmployeeId}
    ORDER BY
      CASE WHEN ISNUMERIC(p.code) = 1 THEN CONVERT(INT, p.code) ELSE 999999 END,
      p.code,
      employee_name;
  `)

  await fs.writeFile(
    path.join(backupDir, `ppr_user_programs-${suffix}.json`),
    JSON.stringify(rows, null, 2),
    'utf8',
  )
}

async function backupModuleRows(suffix) {
  const rows = await getCoordinadores()
  await fs.writeFile(
    path.join(backupDir, `SP_PPR_ADMIN_COORDINADORES-${suffix}.json`),
    JSON.stringify(rows, null, 2),
    'utf8',
  )
}

async function upsertAssignment(pool, employeeId, programCode) {
  const program = await scalar(pool, `
    SELECT id, code, name
    FROM dbo.ppr_programs
    WHERE code = ${quote(programCode)};
  `)
  if (!program) throw new Error(`No existe programa PPR con code=${programCode}`)

  const employee = await scalar(pool, `
    SELECT
      IDEMPLEADO AS employee_id,
      DNI AS dni,
      ${employeeNameExpression('e')} AS employee_name
    FROM SIGH_DEPURA..T_Empleado e
    WHERE IDEMPLEADO = ${Number(employeeId)};
  `)
  if (!employee) throw new Error(`No existe empleado IDEMPLEADO=${employeeId}`)

  const existing = await scalar(pool, `
    SELECT id, is_active
    FROM dbo.ppr_user_programs
    WHERE employee_id = ${Number(employeeId)}
      AND program_id = ${Number(program.id)};
  `)

  if (existing) {
    await pool.request()
      .input('id', sql.Int, existing.id)
      .query('UPDATE dbo.ppr_user_programs SET is_active = 1 WHERE id = @id;')
    return { program, employee, action: existing.is_active ? 'ya activo' : 'reactivado' }
  }

  await pool.request()
    .input('employee_id', sql.Int, employeeId)
    .input('program_id', sql.Int, program.id)
    .query(`
      INSERT INTO dbo.ppr_user_programs (employee_id, program_id, is_active)
      VALUES (@employee_id, @program_id, 1);
    `)
  return { program, employee, action: 'insertado' }
}

async function main() {
  await fs.mkdir(backupDir, { recursive: true })

  const pool = await getSqlPool('general')
  try {
    await backupRows(pool, 'before')
    await backupModuleRows('before')

    const mainProgram = await scalar(pool, `
      SELECT id, code, name
      FROM dbo.ppr_programs
      WHERE code = ${quote(mainProgramCode)};
    `)
    if (!mainProgram) throw new Error(`No existe programa PPR con code=${mainProgramCode}`)

    const deactivateMain = await pool.request()
      .input('program_id', sql.Int, mainProgram.id)
      .input('admin_employee_id', sql.Int, adminEmployeeId)
      .query(`
        UPDATE dbo.ppr_user_programs
        SET is_active = 0
        WHERE program_id = @program_id
          AND employee_id <> @admin_employee_id
          AND ISNULL(is_active, 1) = 1;

        SELECT @@ROWCOUNT AS affected;
      `)

    const actions = []
    const programs = await query(pool, 'SELECT code FROM dbo.ppr_programs;')
    for (const program of programs) {
      const result = await upsertAssignment(pool, adminEmployeeId, program.code)
      actions.push({ type: 'admin_access', ...result })
    }

    for (const assignment of subprogramAssignments) {
      const result = await upsertAssignment(pool, assignment.employeeId, assignment.programCode)
      actions.push({ type: assignment.note, ...result })
    }

    await backupRows(pool, 'after')
    await backupModuleRows('after')

    console.log(`OK 9002 principal: desactivados no-5713=${Number(deactivateMain.recordset[0]?.affected ?? 0)}`)
    for (const action of actions) {
      console.log(`${action.type}: ${action.program.code} -> ${action.employee.employee_id} ${action.employee.employee_name} (${action.action})`)
    }
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
