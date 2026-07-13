import { getSqlPool, closeSqlPool, sql } from '../server/db/sql-server.js'

const targets = [
  {
    label: '0024 - Prevencion y control del cancer',
    procedureName: 'dbo.usp_PPR_0024',
    programCodes: ['24', '0024'],
    sourceKeys: ['0215098'],
    activityKeys: [],
  },
  {
    label: '0129 - Condiciones secundarias de salud',
    procedureName: 'dbo.usp_PPR_0129',
    programCodes: ['129', '0129'],
    sourceKeys: ['0515008'],
    activityKeys: ['0515105'],
  },
  {
    label: '9002 - APNOP / otros centros de costo',
    procedureName: 'dbo.usp_PPR_9002',
    programCodes: ['9002'],
    sourceKeys: [
      'AOI00167000349',
      'AOI00167000363',
      'AOI00167000365',
      'AOI00167000366',
      'AOI00167000367',
    ],
    activityKeys: [],
  },
]

function normalizeProgramCode(value) {
  const normalized = String(value ?? '').trim().replace(/^0+/, '')
  return normalized || '0'
}

function extractActivitySourceKey(value) {
  const match = String(value ?? '').match(/\b(\d{7})\b/)
  return match?.[1] ?? null
}

function normalizeActivityName(value) {
  return String(value ?? '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toUpperCase()
    .replace(/[^A-Z0-9]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
}

function readRowValue(row, keys) {
  for (const key of keys) {
    if (row?.[key] != null) return row[key]
  }
  const entries = Object.entries(row ?? {})
  for (const key of keys) {
    const found = entries.find(([rowKey]) => rowKey.toLowerCase() === key.toLowerCase())
    if (found) return found[1]
  }
  return null
}

function rowSourceKey(row) {
  const activityLabel = readRowValue(row, ['ACTIVIDAD', 'actividad'])
  const explicitSourceKey = readRowValue(row, ['SOURCE_KEY', 'source_key', 'CODIGO', 'codigo', 'CODE', 'code'])
  return String(explicitSourceKey ?? extractActivitySourceKey(activityLabel) ?? '').trim()
}

function monthDateRange(year, month) {
  const start = new Date(Date.UTC(Number(year), Number(month) - 1, 1))
  const end = new Date(Date.UTC(Number(year), Number(month), 0))
  return {
    startDate: start.toISOString().slice(0, 10),
    endDate: end.toISOString().slice(0, 10),
  }
}

function formatRow(row) {
  return Object.entries(row)
    .map(([key, value]) => `${key}=${value}`)
    .join(' | ')
}

async function query(pool, text, inputs = []) {
  const request = pool.request()
  for (const input of inputs) {
    request.input(input.name, input.type, input.value)
  }
  const result = await request.query(text)
  return result.recordset
}

async function executeSource(pool, procedureName, startDate, endDate) {
  const transaction = new sql.Transaction(pool)
  await transaction.begin(sql.ISOLATION_LEVEL.READ_COMMITTED)
  try {
    const request = new sql.Request(transaction)
    request.input('FechaInicio', sql.Date, startDate)
    request.input('FechaFin', sql.Date, endDate)
    const result = await request.execute(procedureName)
    await transaction.rollback()
    return result.recordset ?? []
  } catch (error) {
    try {
      await transaction.rollback()
    } catch {
      // The original error is more useful.
    }
    throw error
  }
}

async function getPrograms(pool, programCodes) {
  const normalizedCodes = programCodes.map(normalizeProgramCode)
  const rows = await query(pool, `
    SELECT id, code, name
    FROM dbo.ppr_programs
    ORDER BY code;
  `)
  return rows
    .filter((row) => normalizedCodes.includes(normalizeProgramCode(row.code)))
    .map((row) => ({
      id: Number(row.id),
      code: String(row.code ?? ''),
      name: String(row.name ?? ''),
    }))
}

async function getProgramActivities(pool, programId) {
  return query(pool, `
    SELECT
      id,
      program_id,
      code,
      name,
      unit,
      annual_goal,
      sort_order,
      is_active
    FROM dbo.ppr_activities
    WHERE program_id = @program_id
    ORDER BY sort_order, id;
  `, [
    { name: 'program_id', type: sql.Int, value: Number(programId) },
  ])
}

function printActivities(title, rows) {
  console.log(title)
  if (!rows.length) {
    console.log('  ninguno')
    return
  }
  for (const row of rows) {
    console.log(`  id=${row.id} code=${row.code ?? ''} active=${row.is_active} sort=${row.sort_order} name=${row.name}`)
  }
}

function findActivityCandidates(activities, sourceRow) {
  const sourceKey = rowSourceKey(sourceRow)
  const activityLabel = String(readRowValue(sourceRow, ['ACTIVIDAD', 'actividad']) ?? '')
  const nameKey = normalizeActivityName(activityLabel)
  return activities.filter((activity) => {
    const code = String(activity.code ?? '').trim()
    const name = String(activity.name ?? '')
    return code === sourceKey
      || extractActivitySourceKey(name) === sourceKey
      || normalizeActivityName(name) === nameKey
      || (sourceKey && name.includes(sourceKey))
  })
}

async function findGlobalCandidates(pool, sourceRow) {
  const sourceKey = rowSourceKey(sourceRow)
  const activityLabel = String(readRowValue(sourceRow, ['ACTIVIDAD', 'actividad']) ?? '')
  const normalizedLabel = normalizeActivityName(activityLabel)
  const compactTerms = normalizedLabel
    .split(' ')
    .filter((term) => term.length >= 5 && !/^\d+$/.test(term))
    .slice(0, 4)

  const rows = await query(pool, `
    SELECT TOP 20
      p.code AS program_code,
      p.name AS program_name,
      a.id,
      a.program_id,
      a.code,
      a.name,
      a.is_active,
      a.sort_order
    FROM dbo.ppr_activities a
    INNER JOIN dbo.ppr_programs p
      ON p.id = a.program_id
    WHERE
      a.code = @source_key
      OR a.name LIKE '%' + @source_key + '%'
      OR (
        @term1 <> ''
        AND a.name LIKE '%' + @term1 + '%'
        AND (@term2 = '' OR a.name LIKE '%' + @term2 + '%')
        AND (@term3 = '' OR a.name LIKE '%' + @term3 + '%')
      )
    ORDER BY p.code, a.sort_order, a.id;
  `, [
    { name: 'source_key', type: sql.NVarChar(80), value: sourceKey },
    { name: 'term1', type: sql.NVarChar(80), value: compactTerms[0] ?? '' },
    { name: 'term2', type: sql.NVarChar(80), value: compactTerms[1] ?? '' },
    { name: 'term3', type: sql.NVarChar(80), value: compactTerms[2] ?? '' },
  ])

  return rows
}

function printGlobalCandidates(rows) {
  console.log('Candidatas globales en ppr_activities:')
  if (!rows.length) {
    console.log('  ninguno')
    return
  }
  for (const row of rows) {
    console.log(`  pp=${row.program_code} id=${row.id} code=${row.code ?? ''} active=${row.is_active} name=${row.name}`)
  }
}

async function main() {
  const pool = await getSqlPool('general')
  try {
    const activePeriod = await pool.request().execute('dbo.SP_PPR_PERIODO_ACTIVO')
    const period = activePeriod.recordset[0]
    const { startDate, endDate } = monthDateRange(period.year, period.month)
    console.log(`Periodo activo: ${period.year}-${String(period.month).padStart(2, '0')} (${startDate} a ${endDate})`)

    for (const target of targets) {
      console.log(`\n=== ${target.label} ===`)
      const programs = await getPrograms(pool, target.programCodes)
      const sourceRows = await executeSource(pool, target.procedureName, startDate, endDate)
      const wantedRows = sourceRows.filter((row) => target.sourceKeys.includes(rowSourceKey(row)))

      console.log(`SP: ${target.procedureName}`)
      console.log(`Filas SP total: ${sourceRows.length}`)
      console.log('Filas fuente revisadas:')
      for (const row of wantedRows) {
        console.log(`  key=${rowSourceKey(row)} | ${formatRow(row)}`)
        printGlobalCandidates(await findGlobalCandidates(pool, row))
      }
      if (!wantedRows.length) console.log('  ninguna')

      for (const program of programs) {
        console.log(`\nPrograma ${program.code} - ${program.name} (id=${program.id})`)
        const activities = await getProgramActivities(pool, program.id)
        console.log(`Actividades catalogo: ${activities.length}`)

        for (const sourceRow of wantedRows) {
          printActivities(
            `Candidatas en catalogo para fuente ${rowSourceKey(sourceRow)}:`,
            findActivityCandidates(activities, sourceRow),
          )
        }

        if (target.activityKeys.length) {
          const activityMatches = activities.filter((activity) => {
            const code = String(activity.code ?? '').trim()
            const nameKey = extractActivitySourceKey(activity.name)
            return target.activityKeys.includes(code) || target.activityKeys.includes(nameKey)
          })
          printActivities(`Actividades faltantes/manuales revisadas (${target.activityKeys.join(', ')}):`, activityMatches)
        }
      }
    }
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
