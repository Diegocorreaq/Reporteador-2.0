import fs from 'node:fs/promises'
import path from 'node:path'
import { getSqlPool, closeSqlPool, sql } from '../server/db/sql-server.js'

const now = new Date()
const stamp = now.toISOString().replace(/[:.]/g, '-')
const backupDir = path.join('informes', 'ppr-sp-backups', `coordinator-assignments-${stamp}`)
const reportPath = path.join('informes', 'ppr-coordinadores-web-2026-07.md')

const assignments = [
  { programCode: '16', employeeId: 4226 },
  { programCode: '18', employeeId: 1780 },
  { programCode: '18', employeeId: 2791 },
  { programCode: '2', employeeId: 2586 },
  { programCode: '2', employeeId: 2865 },
  { programCode: '2', employeeId: 4758 },
]

function employeeNameExpression(alias = 'e') {
  return `UPPER(CONCAT(${alias}.ApellidoPaterno, ' ', ${alias}.ApellidoMaterno, ' ', ${alias}.Nombres))`
}

function csvNumbers(values) {
  return values.map((value) => Number(value)).join(',')
}

function markdownEscape(value) {
  return String(value ?? '').replace(/\|/g, '\\|').replace(/\r?\n/g, ' ')
}

function groupBy(rows, keyFn) {
  const grouped = new Map()
  for (const row of rows) {
    const key = keyFn(row)
    const current = grouped.get(key) ?? []
    current.push(row)
    grouped.set(key, current)
  }
  return grouped
}

async function query(pool, text) {
  const result = await pool.request().query(text)
  return result.recordset
}

async function scalar(pool, text) {
  const rows = await query(pool, text)
  return rows[0]
}

async function backupCurrentState(pool) {
  const employeeIds = [...new Set(assignments.map((item) => item.employeeId))]
  const programCodes = [...new Set(assignments.map((item) => item.programCode))]
  const quotedProgramCodes = programCodes.map((code) => `'${code.replace(/'/g, "''")}'`).join(',')

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
    WHERE up.employee_id IN (${csvNumbers(employeeIds)})
       OR p.code IN (${quotedProgramCodes})
    ORDER BY p.code, employee_name;
  `)

  await fs.writeFile(
    path.join(backupDir, 'ppr_user_programs-before.json'),
    JSON.stringify(rows, null, 2),
    'utf8',
  )
}

async function applyAssignments(pool) {
  const applied = []

  for (const assignment of assignments) {
    const program = await scalar(pool, `
      SELECT id, code, name
      FROM dbo.ppr_programs
      WHERE code = '${assignment.programCode.replace(/'/g, "''")}';
    `)
    if (!program) throw new Error(`No existe ppr_programs.code=${assignment.programCode}`)

    const employee = await scalar(pool, `
      SELECT
        IDEMPLEADO AS employee_id,
        DNI AS dni,
        ${employeeNameExpression('e')} AS employee_name
      FROM SIGH_DEPURA..T_Empleado e
      WHERE IDEMPLEADO = ${Number(assignment.employeeId)};
    `)
    if (!employee) throw new Error(`No existe T_Empleado.IDEMPLEADO=${assignment.employeeId}`)

    const existing = await scalar(pool, `
      SELECT id, is_active
      FROM dbo.ppr_user_programs
      WHERE employee_id = ${Number(assignment.employeeId)}
        AND program_id = ${Number(program.id)};
    `)

    if (existing) {
      await pool.request()
        .input('id', sql.Int, existing.id)
        .query('UPDATE dbo.ppr_user_programs SET is_active = 1 WHERE id = @id;')
      applied.push({ ...assignment, program, employee, action: existing.is_active ? 'ya activo' : 'reactivado' })
    } else {
      await pool.request()
        .input('employee_id', sql.Int, assignment.employeeId)
        .input('program_id', sql.Int, program.id)
        .query(`
          INSERT INTO dbo.ppr_user_programs (employee_id, program_id, is_active)
          VALUES (@employee_id, @program_id, 1);
        `)
      applied.push({ ...assignment, program, employee, action: 'insertado' })
    }
  }

  return applied
}

async function fetchHierarchy(pool) {
  const programs = await query(pool, `
    SELECT
      p.id,
      p.code,
      p.name,
      COUNT(a.id) AS active_activity_count
    FROM dbo.ppr_programs p
    LEFT JOIN dbo.ppr_activities a
      ON a.program_id = p.id
     AND ISNULL(a.is_active, 1) = 1
    GROUP BY p.id, p.code, p.name
    ORDER BY
      CASE WHEN ISNUMERIC(p.code) = 1 THEN CONVERT(INT, p.code) ELSE 999999 END,
      p.code;
  `)

  const coordinators = await query(pool, `
    SELECT
      p.id AS program_id,
      p.code AS program_code,
      p.name AS program_name,
      up.employee_id,
      ${employeeNameExpression('e')} AS employee_name,
      e.DNI AS dni,
      up.is_active
    FROM dbo.ppr_user_programs up
    INNER JOIN dbo.ppr_programs p ON p.id = up.program_id
    INNER JOIN SIGH_DEPURA..T_Empleado e ON e.IDEMPLEADO = up.employee_id
    WHERE ISNULL(up.is_active, 1) = 1
    ORDER BY
      CASE WHEN ISNUMERIC(p.code) = 1 THEN CONVERT(INT, p.code) ELSE 999999 END,
      p.code,
      employee_name;
  `)

  const mappedResponsables = await query(pool, `
    SELECT
      rem.legacy_responsable,
      rem.employee_id,
      ${employeeNameExpression('e')} AS employee_name,
      e.DNI AS dni
    FROM dbo.ppr_responsable_employee_map rem
    LEFT JOIN SIGH_DEPURA..T_Empleado e ON e.IDEMPLEADO = rem.employee_id
    ORDER BY rem.legacy_responsable;
  `)

  const exportRows = await query(pool, `
    EXEC dbo.SP_PPR_ADMIN_EXPORT_MATRIZ @year = 2026;
  `)

  return { programs, coordinators, mappedResponsables, exportRows }
}

function coordinatorLine(row) {
  return `${markdownEscape(row.employee_name)} | DNI ${markdownEscape(row.dni)} | employee_id ${row.employee_id}`
}

function buildReport(hierarchy, applied) {
  const { programs, coordinators, mappedResponsables, exportRows } = hierarchy
  const coordinatorsByProgram = groupBy(coordinators, (row) => row.program_id)
  const mappedByEmployee = groupBy(mappedResponsables, (row) => row.employee_id)
  const exportByProgram = new Map()

  for (const row of exportRows) {
    const key = String(row.codigo_programa ?? row.program_code ?? row.code ?? '')
    if (!key || exportByProgram.has(key)) continue
    exportByProgram.set(key, row.responsable ?? row.Responsable ?? row.RESPONSABLE ?? null)
  }

  const lines = [
    '# PPR - Coordinadores web por programa',
    '',
    `Generado: ${now.toLocaleString('es-PE', { timeZone: 'America/Lima' })}`,
    '',
    '## Criterio usado',
    '',
    '- **Coordinador:** usuario asignado en `dbo.ppr_user_programs` para acceder al programa PPR y registrar la informacion.',
    '- **Responsable:** no se modela como rol separado en la web durante la marcha blanca. La responsabilidad se formaliza con documentos externos donde el responsable designa a sus coordinadores.',
    '- **Firma:** la validez de la firma se sostiene con la designacion formal del responsable hacia sus coordinadores.',
    '- **Estado actual:** `dbo.ppr_user_programs` asigna usuarios a programas completos y se tomara como la lista oficial de coordinadores operativos en la web.',
    '',
    '## Cambios aplicados en coordinadores',
    '',
    '| Programa | Coordinador | Accion |',
    '| --- | --- | --- |',
  ]

  for (const item of applied) {
    lines.push(`| ${markdownEscape(item.program.code)} - ${markdownEscape(item.program.name)} | ${coordinatorLine(item.employee)} | ${markdownEscape(item.action)} |`)
  }

  lines.push('', '## Coordinadores por programa', '')

  for (const program of programs) {
    const programCoordinators = coordinatorsByProgram.get(program.id) ?? []
    const exportResponsible = exportByProgram.get(String(program.code))
    const mappedMatches = programCoordinators.flatMap((coordinator) => mappedByEmployee.get(coordinator.employee_id) ?? [])

    lines.push(`### ${program.code} - ${program.name}`)
    lines.push('')
    lines.push(`- Actividades activas: ${program.active_activity_count}`)
    lines.push('- Responsable formal: respaldado por documento externo de designacion.')
    lines.push(`- Responsable que muestra el export actual: ${exportResponsible ? markdownEscape(exportResponsible) : 'sin dato en export'}; revisar solo como referencia historica, no como jerarquia de la web.`)
    lines.push('- Coordinadores activos:')

    if (programCoordinators.length === 0) {
      lines.push('  - Sin coordinadores activos en `ppr_user_programs`.')
    } else {
      for (const coordinator of programCoordinators) {
        lines.push(`  - ${coordinatorLine(coordinator)}`)
      }
    }

    if (mappedMatches.length > 0) {
      lines.push('- Coincidencias en `ppr_responsable_employee_map`:')
      for (const mapped of mappedMatches) {
        lines.push(`  - ${coordinatorLine(mapped)} | legacy: ${markdownEscape(mapped.legacy_responsable)}`)
      }
    } else {
      lines.push('- Coincidencias en `ppr_responsable_employee_map`: ninguna por employee_id de coordinador.')
    }

    lines.push('')
  }

  lines.push('## Lectura rapida')
  lines.push('')
  lines.push('Para marcha blanca se mantiene un solo tipo de usuario PPR dentro de la web: coordinador. Los responsables quedan fuera del modelo operativo y se respaldan con documentos formales de designacion.')
  lines.push('')

  return lines.join('\n')
}

async function main() {
  await fs.mkdir(backupDir, { recursive: true })

  const pool = await getSqlPool('general')
  try {
    await backupCurrentState(pool)
    const applied = await applyAssignments(pool)
    const hierarchy = await fetchHierarchy(pool)
    const report = buildReport(hierarchy, applied)

    await fs.writeFile(reportPath, report, 'utf8')

    console.log('OK coordinadores actualizados')
    for (const item of applied) {
      console.log(`${item.program.code} ${item.employee.employee_id} ${item.employee.employee_name}: ${item.action}`)
    }
    console.log(`Respaldos: ${backupDir}`)
    console.log(`Reporte: ${reportPath}`)
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
