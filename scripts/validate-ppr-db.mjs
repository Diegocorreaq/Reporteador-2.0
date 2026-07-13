import { getSqlPool, closeSqlPool, sql } from '../server/db/sql-server.js'
import { serverConfig } from '../server/config.js'

const expectedTables = [
  'ppr_programs',
  'ppr_periods',
  'ppr_activities',
  'ppr_user_programs',
  'ppr_monthly_values',
  'ppr_signatures',
  'ppr_signed_documents',
  'ppr_import_runs',
]

const expectedProcedures = [
  'SP_USUARIO_VALIDA_ppr',
  'SP_PPR_PERIODO_ACTIVO',
  'SP_PPR_PROGRAMAS_USUARIO',
  'SP_PPR_ACTIVIDADES_PROGRAMA',
  'SP_PPR_PERIODOS_USUARIO',
  'SP_PPR_RESUMEN_ANUAL',
  'SP_PPR_PROGRAMA_DETALLE',
  'SP_PPR_FIRMAR_PERIODO',
  'SP_PPR_ADMIN_VERIFICAR',
  'SP_PPR_ADMIN_COORDINADORES',
  'SP_PPR_ADMIN_GUARDAR_COORDINADOR',
  'SP_PPR_ADMIN_PROGRAMAS',
  'SP_PPR_ADMIN_GUARDAR_ASIGNACION',
  'SP_PPR_BUSCAR_EMPLEADO',
  'SP_PPR_ADMIN_ACTIVIDADES',
  'SP_PPR_ADMIN_GUARDAR_ACTIVIDAD',
  'SP_PPR_ADMIN_TOGGLE_ACTIVIDAD',
  'SP_PPR_ADMIN_EXPORT_MATRIZ',
  'usp_PPR_0002',
  'usp_PPR_0018',
  'usp_PPR_0024',
  'usp_PPR_0104',
  'usp_PPR_1001',
  'usp_PPR_0129',
  'usp_PPR_0131',
  'usp_PPR_9002',
]

const expectedColumns = {
  ppr_programs: ['id', 'code', 'name'],
  ppr_periods: ['id', 'year', 'month', 'is_open', 'deadline'],
  ppr_activities: ['id', 'program_id', 'code', 'name', 'unit', 'annual_goal', 'sort_order', 'is_active'],
  ppr_user_programs: ['employee_id', 'program_id', 'is_active'],
  ppr_monthly_values: [
    'activity_id',
    'period_id',
    'employee_id',
    'value',
    'notes',
    'value_source',
    'source_key',
    'source_value',
    'loaded_by',
    'loaded_at',
    'validated_by',
    'validated_at',
    'validation_status',
    'import_run_id',
  ],
  ppr_signatures: ['employee_id', 'period_id', 'program_id', 'signed_at', 'is_valid'],
  ppr_signed_documents: [
    'employee_id',
    'period_id',
    'program_id',
    'document_code',
    'file_name',
    'mime_type',
    'pdf_data',
    'document_hash',
    'content_hash',
    'signature_type',
    'signature_label',
    'signer_dni',
    'signer_name',
    'signed_at',
  ],
  ppr_import_runs: [
    'id',
    'period_id',
    'program_id',
    'source_id',
    'source_label',
    'source_procedure',
    'admin_id',
    'started_at',
    'completed_at',
    'status',
    'rows_read',
    'rows_matched',
    'rows_updated',
    'rows_unmatched',
    'error_message',
  ],
}

function printSection(title) {
  console.log(`\n=== ${title} ===`)
}

function mark(ok) {
  return ok ? 'OK' : 'FALTA'
}

async function query(pool, text) {
  const result = await pool.request().query(text)
  return result.recordset
}

async function scalarCount(pool, tableName) {
  const request = pool.request()
  request.input('table_name', sql.NVarChar(128), tableName)
  const exists = await request.query(`
    SELECT COUNT(1) AS count
    FROM INFORMATION_SCHEMA.TABLES
    WHERE TABLE_SCHEMA = 'dbo'
      AND TABLE_NAME = @table_name;
  `)
  if (!Number(exists.recordset[0]?.count ?? 0)) return null

  const safeTable = `[dbo].[${tableName.replaceAll(']', ']]')}]`
  const rows = await pool.request().query(`SELECT COUNT(1) AS count FROM ${safeTable};`)
  return Number(rows.recordset[0]?.count ?? 0)
}

async function executeProcedure(pool, procedureName, inputs = []) {
  const request = pool.request()
  for (const input of inputs) {
    request.input(input.name, input.type, input.value)
  }
  return request.execute(`dbo.${procedureName}`)
}

function summarizeRecordset(result) {
  const rows = result.recordset ?? []
  const columns = rows[0] ? Object.keys(rows[0]) : []
  return `${rows.length} filas${columns.length ? `; columnas: ${columns.join(', ')}` : ''}`
}

async function main() {
  console.log('Validacion BD PPR')
  console.log(`Servidor: ${serverConfig.db.general.server}:${serverConfig.db.general.port}`)
  console.log(`Base: ${serverConfig.db.general.database}`)

  const pool = await getSqlPool('general')

  try {
    printSection('Tablas')
    const tableRows = await query(pool, `
      SELECT TABLE_NAME AS name
      FROM INFORMATION_SCHEMA.TABLES
      WHERE TABLE_SCHEMA = 'dbo'
        AND TABLE_NAME IN (${expectedTables.map((name) => `'${name}'`).join(', ')})
      ORDER BY TABLE_NAME;
    `)
    const foundTables = new Set(tableRows.map((row) => String(row.name)))
    for (const table of expectedTables) {
      const count = await scalarCount(pool, table)
      const suffix = count == null ? '' : ` (${count} filas)`
      console.log(`${mark(foundTables.has(table))} ${table}${suffix}`)
    }

    printSection('Columnas')
    const columnRows = await query(pool, `
      SELECT TABLE_NAME AS tableName, COLUMN_NAME AS columnName
      FROM INFORMATION_SCHEMA.COLUMNS
      WHERE TABLE_SCHEMA = 'dbo'
        AND TABLE_NAME IN (${Object.keys(expectedColumns).map((name) => `'${name}'`).join(', ')});
    `)
    const columnsByTable = new Map()
    for (const row of columnRows) {
      const table = String(row.tableName)
      const column = String(row.columnName).toLowerCase()
      if (!columnsByTable.has(table)) columnsByTable.set(table, new Set())
      columnsByTable.get(table).add(column)
    }
    for (const [table, columns] of Object.entries(expectedColumns)) {
      const actual = columnsByTable.get(table) ?? new Set()
      const missing = columns.filter((column) => !actual.has(column.toLowerCase()))
      console.log(`${missing.length === 0 ? 'OK' : 'FALTA'} ${table}${missing.length ? ` -> ${missing.join(', ')}` : ''}`)
    }

    printSection('Procedimientos')
    const procedureRows = await query(pool, `
      SELECT name
      FROM sys.objects
      WHERE schema_id = SCHEMA_ID('dbo')
        AND type IN ('P', 'PC')
        AND name IN (${expectedProcedures.map((name) => `'${name}'`).join(', ')})
      ORDER BY name;
    `)
    const foundProcedures = new Set(procedureRows.map((row) => String(row.name).toLowerCase()))
    for (const procedure of expectedProcedures) {
      console.log(`${mark(foundProcedures.has(procedure.toLowerCase()))} dbo.${procedure}`)
    }

    printSection('Periodo activo')
    let activePeriod = null
    try {
      const activePeriodResult = await pool.request().execute('dbo.SP_PPR_PERIODO_ACTIVO')
      if (activePeriodResult.recordset.length === 0) {
        console.log('FALTA SP_PPR_PERIODO_ACTIVO no devolvio periodo activo')
      } else {
        const row = activePeriodResult.recordset[0]
        activePeriod = row
        console.log(`OK id=${row.id} year=${row.year} month=${row.month} is_open=${row.is_open} deadline=${row.deadline ?? ''}`)
      }
    } catch (error) {
      console.log(`FALTA no se pudo ejecutar SP_PPR_PERIODO_ACTIVO: ${error.message}`)
    }

    printSection('Datos 2026')
    const periodRows = await query(pool, `
      SELECT year, month, is_open, deadline
      FROM dbo.ppr_periods
      WHERE year = 2026
      ORDER BY month;
    `)
    console.log(`${periodRows.length === 12 ? 'OK' : 'FALTA'} periodos 2026: ${periodRows.length}`)
    const openPeriods = periodRows.filter((row) => Boolean(row.is_open))
    console.log(`${openPeriods.length === 1 ? 'OK' : 'REVISAR'} periodos abiertos 2026: ${openPeriods.map((row) => row.month).join(', ') || 'ninguno'}`)

    const inactiveCatalogRows = await query(pool, `
      SELECT p.id, p.code, p.name
      FROM dbo.ppr_programs p
      LEFT JOIN dbo.ppr_activities a
        ON a.program_id = p.id
        AND ISNULL(a.is_active, 1) = 1
      GROUP BY p.id, p.code, p.name
      HAVING COUNT(a.id) = 0
      ORDER BY p.code;
    `)
    console.log(`${inactiveCatalogRows.length === 0 ? 'OK' : 'REVISAR'} programas sin actividades activas: ${inactiveCatalogRows.length}`)

    const activeAssignments = await query(pool, `
      SELECT COUNT(1) AS total
      FROM dbo.ppr_user_programs
      WHERE is_active = 1;
    `)
    console.log(`${Number(activeAssignments[0]?.total ?? 0) > 0 ? 'OK' : 'FALTA'} asignaciones activas: ${Number(activeAssignments[0]?.total ?? 0)}`)

    printSection('SP de lectura con muestra')
    const sampleRows = await query(pool, `
      SELECT TOP 1
        up.employee_id,
        up.program_id
      FROM dbo.ppr_user_programs up
      INNER JOIN dbo.ppr_activities a
        ON a.program_id = up.program_id
        AND ISNULL(a.is_active, 1) = 1
      WHERE up.is_active = 1
      ORDER BY up.employee_id, up.program_id;
    `)

    const sample = sampleRows[0]
    if (!sample || !activePeriod) {
      console.log('FALTA no hay muestra suficiente para ejecutar SP de lectura.')
    } else {
      const employeeId = Number(sample.employee_id)
      const programId = Number(sample.program_id)
      const periodId = Number(activePeriod.id)
      const year = Number(activePeriod.year)
      console.log(`Muestra: employee_id=${employeeId}, program_id=${programId}, period_id=${periodId}, year=${year}`)

      const readChecks = [
        {
          name: 'SP_PPR_PROGRAMAS_USUARIO',
          inputs: [{ name: 'employee_id', type: sql.Int, value: employeeId }],
        },
        {
          name: 'SP_PPR_ACTIVIDADES_PROGRAMA',
          inputs: [
            { name: 'program_id', type: sql.Int, value: programId },
            { name: 'period_id', type: sql.Int, value: periodId },
            { name: 'employee_id', type: sql.Int, value: employeeId },
          ],
        },
        {
          name: 'SP_PPR_PERIODOS_USUARIO',
          inputs: [{ name: 'employee_id', type: sql.Int, value: employeeId }],
        },
        {
          name: 'SP_PPR_RESUMEN_ANUAL',
          inputs: [
            { name: 'employee_id', type: sql.Int, value: employeeId },
            { name: 'year', type: sql.Int, value: year },
          ],
        },
        {
          name: 'SP_PPR_PROGRAMA_DETALLE',
          inputs: [
            { name: 'program_id', type: sql.Int, value: programId },
            { name: 'year', type: sql.Int, value: year },
            { name: 'employee_id', type: sql.Int, value: employeeId },
          ],
        },
        {
          name: 'SP_PPR_ADMIN_PROGRAMAS',
          inputs: [],
        },
        {
          name: 'SP_PPR_ADMIN_COORDINADORES',
          inputs: [],
        },
        {
          name: 'SP_PPR_ADMIN_ACTIVIDADES',
          inputs: [{ name: 'program_id', type: sql.Int, value: programId }],
        },
        {
          name: 'SP_PPR_ADMIN_EXPORT_MATRIZ',
          inputs: [{ name: 'year', type: sql.Int, value: year }],
        },
      ]

      for (const check of readChecks) {
        try {
          const result = await executeProcedure(pool, check.name, check.inputs)
          console.log(`OK dbo.${check.name}: ${summarizeRecordset(result)}`)
        } catch (error) {
          console.log(`FALTA dbo.${check.name}: ${error.message}`)
        }
      }
    }
  } finally {
    await closeSqlPool('general')
  }
}

main().catch((error) => {
  console.error(`ERROR ${error.message}`)
  process.exitCode = 1
})
