import { getSqlPool, closeSqlPool, sql } from '../server/db/sql-server.js'
import { serverConfig } from '../server/config.js'

const sources = [
  {
    id: 'ppr_0002_salud_materno_neonatal',
    label: '0002 - Salud materno neonatal',
    procedureName: 'dbo.usp_PPR_0002',
    programCodes: ['2', '0002'],
  },
  {
    id: 'ppr_0018_enfermedades_no_transmisibles',
    label: '0018 - Enfermedades no transmisibles',
    procedureName: 'dbo.usp_PPR_0018',
    programCodes: ['18', '0018'],
  },
  {
    id: 'ppr_0024_prevencion_control_cancer',
    label: '0024 - Prevencion y control del cancer',
    procedureName: 'dbo.usp_PPR_0024',
    programCodes: ['24', '0024'],
  },
  {
    id: 'ppr_0104_reduccion_mortalidad_emergencias',
    label: '0104 - Reduccion de mortalidad por emergencias y urgencias medicas',
    procedureName: 'dbo.usp_PPR_0104',
    programCodes: ['104', '0104'],
  },
  {
    id: 'ppr_1001_desarrollo_infantil_temprano',
    label: '1001 - Desarrollo infantil temprano',
    procedureName: 'dbo.usp_PPR_1001',
    programCodes: ['1001'],
  },
  {
    id: 'ppr_0129_condiciones_secundarias',
    label: '0129 - Condiciones secundarias de salud',
    procedureName: 'dbo.usp_PPR_0129',
    programCodes: ['129', '0129'],
  },
  {
    id: 'ppr_0131_control_prevencion_salud_mental',
    label: '0131 - Control y prevencion en salud mental',
    procedureName: 'dbo.usp_PPR_0131',
    programCodes: ['131', '0131'],
  },
  {
    id: 'ppr_9002_apnop',
    label: '9002 - APNOP / otros centros de costo',
    procedureName: 'dbo.usp_PPR_9002',
    programCodes: ['9002'],
  },
]

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

function normalizeProgramCode(value) {
  const normalized = String(value ?? '').trim().replace(/^0+/, '')
  return normalized || '0'
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

function monthDateRange(year, month) {
  const start = new Date(Date.UTC(Number(year), Number(month) - 1, 1))
  const end = new Date(Date.UTC(Number(year), Number(month), 0))
  return {
    startDate: start.toISOString().slice(0, 10),
    endDate: end.toISOString().slice(0, 10),
  }
}

function previewList(items, format, limit = 5) {
  if (items.length === 0) return 'ninguno'
  const shown = items.slice(0, limit).map(format)
  const suffix = items.length > limit ? `; +${items.length - limit} mas` : ''
  return `${shown.join('; ')}${suffix}`
}

async function query(pool, text, inputs = []) {
  const request = pool.request()
  for (const input of inputs) {
    request.input(input.name, input.type, input.value)
  }
  const result = await request.query(text)
  return result.recordset
}

async function executeSourcePreview(pool, source, startDate, endDate) {
  const transaction = new sql.Transaction(pool)
  await transaction.begin(sql.ISOLATION_LEVEL.READ_COMMITTED)
  try {
    const request = new sql.Request(transaction)
    request.input('FechaInicio', sql.Date, startDate)
    request.input('FechaFin', sql.Date, endDate)
    const result = await request.execute(source.procedureName)
    await transaction.rollback()
    return result.recordset ?? []
  } catch (error) {
    try {
      await transaction.rollback()
    } catch {
      // Ignore rollback errors after failed procedure execution.
    }
    throw error
  }
}

async function getProgramsForSource(pool, source) {
  const normalizedCodes = source.programCodes.map(normalizeProgramCode)
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
  const rows = await query(pool, `
    SELECT id, ISNULL(code, '') AS code, name
    FROM dbo.ppr_activities
    WHERE program_id = @program_id
      AND ISNULL(is_active, 1) = 1
    ORDER BY sort_order, id;
  `, [
    { name: 'program_id', type: sql.Int, value: Number(programId) },
  ])

  return rows.map((row) => ({
    id: Number(row.id),
    code: String(row.code ?? ''),
    name: String(row.name ?? ''),
    sourceKey: extractActivitySourceKey(row.name) ?? String(row.code ?? '').trim() ?? null,
    sourceNameKey: normalizeActivityName(row.name),
  }))
}

function buildSourceTotals(rawRows) {
  const sourceTotalsByKey = new Map()
  const sourceTotalsByName = new Map()
  const sourceNameLabels = new Map()

  for (const row of rawRows) {
    const activityLabel = readRowValue(row, ['ACTIVIDAD', 'actividad'])
    const total = Number(readRowValue(row, ['TOTAL', 'total']) ?? 0)
    const explicitSourceKey = readRowValue(row, ['SOURCE_KEY', 'source_key', 'CODIGO', 'codigo', 'CODE', 'code'])
    const sourceKey = String(explicitSourceKey ?? extractActivitySourceKey(activityLabel) ?? '').trim()

    if (sourceKey) {
      sourceTotalsByKey.set(sourceKey, (sourceTotalsByKey.get(sourceKey) ?? 0) + total)
      continue
    }

    const sourceNameKey = normalizeActivityName(activityLabel)
    if (!sourceNameKey) continue
    sourceTotalsByName.set(sourceNameKey, (sourceTotalsByName.get(sourceNameKey) ?? 0) + total)
    sourceNameLabels.set(sourceNameKey, String(activityLabel ?? sourceNameKey))
  }

  return { sourceTotalsByKey, sourceTotalsByName, sourceNameLabels }
}

function matchRows(activities, totals) {
  const matchedRows = []
  const matchedKeys = new Set()
  const matchedNames = new Set()

  for (const activity of activities) {
    let sourceKey = activity.sourceKey
    let sourceValue = null

    if (activity.sourceKey && totals.sourceTotalsByKey.has(activity.sourceKey)) {
      sourceValue = totals.sourceTotalsByKey.get(activity.sourceKey)
      matchedKeys.add(activity.sourceKey)
    } else if (activity.sourceNameKey && totals.sourceTotalsByName.has(activity.sourceNameKey)) {
      sourceValue = totals.sourceTotalsByName.get(activity.sourceNameKey)
      sourceKey = activity.sourceKey || `NAME:${activity.id}`
      matchedNames.add(activity.sourceNameKey)
    }

    if (sourceValue == null) continue
    matchedRows.push({
      activityId: activity.id,
      activityName: activity.name,
      sourceKey,
      sourceValue: Number(sourceValue ?? 0),
    })
  }

  const unmatchedSourceRows = Array.from(totals.sourceTotalsByKey.entries())
    .filter(([sourceKey]) => !matchedKeys.has(sourceKey))
    .map(([sourceKey, sourceValue]) => ({ sourceKey, sourceValue: Number(sourceValue) }))
    .concat(Array.from(totals.sourceTotalsByName.entries())
      .filter(([sourceNameKey]) => !matchedNames.has(sourceNameKey))
      .map(([sourceNameKey, sourceValue]) => ({
        sourceKey: totals.sourceNameLabels.get(sourceNameKey)?.slice(0, 50) ?? sourceNameKey.slice(0, 50),
        sourceValue: Number(sourceValue),
      })))

  const manualActivities = activities
    .filter((activity) => {
      const hasKeyMatch = activity.sourceKey && totals.sourceTotalsByKey.has(activity.sourceKey)
      const hasNameMatch = activity.sourceNameKey && totals.sourceTotalsByName.has(activity.sourceNameKey)
      return !hasKeyMatch && !hasNameMatch
    })
    .map((activity) => ({
      activityId: activity.id,
      activityName: activity.name,
      sourceKey: activity.sourceKey,
    }))

  return { matchedRows, unmatchedSourceRows, manualActivities }
}

async function main() {
  console.log('Preview cargas automaticas PPR (sin escritura)')
  console.log(`Servidor: ${serverConfig.db.general.server}:${serverConfig.db.general.port}`)
  console.log(`Base: ${serverConfig.db.general.database}`)

  const pool = await getSqlPool('general')
  try {
    const activePeriod = await pool.request().execute('dbo.SP_PPR_PERIODO_ACTIVO')
    const period = activePeriod.recordset[0]
    if (!period || !period.is_open) {
      console.log('FALTA no hay periodo activo abierto.')
      return
    }

    const { startDate, endDate } = monthDateRange(period.year, period.month)
    console.log(`Periodo: id=${period.id}, ${period.year}-${String(period.month).padStart(2, '0')} (${startDate} a ${endDate})`)

    for (const source of sources) {
      console.log(`\n=== ${source.label} ===`)
      console.log(`Fuente: ${source.procedureName}`)

      const programs = await getProgramsForSource(pool, source)
      if (programs.length === 0) {
        console.log(`FALTA no existe programa con codigos: ${source.programCodes.join(', ')}`)
        continue
      }

      let rawRows
      try {
        rawRows = await executeSourcePreview(pool, source, startDate, endDate)
      } catch (error) {
        console.log(`FALTA no ejecuto: ${error.message}`)
        continue
      }

      const columns = rawRows[0] ? Object.keys(rawRows[0]) : []
      const totals = buildSourceTotals(rawRows)
      console.log(`SP: OK ${rawRows.length} filas; columnas: ${columns.join(', ') || 'sin columnas'}`)

      for (const program of programs) {
        const activities = await getProgramActivities(pool, program.id)
        const match = matchRows(activities, totals)
        const matchedPct = activities.length > 0
          ? Math.round((match.matchedRows.length / activities.length) * 100)
          : 0
        const sourceTotal = match.matchedRows.reduce((sum, row) => sum + row.sourceValue, 0)

        console.log(`Programa ${program.code} - ${program.name}`)
        console.log(`  Actividades activas: ${activities.length}`)
        console.log(`  Cruzadas: ${match.matchedRows.length}/${activities.length} (${matchedPct}%)`)
        console.log(`  Total fuente cruzado: ${sourceTotal}`)
        console.log(`  Filas fuente no cruzadas: ${match.unmatchedSourceRows.length}`)
        console.log(`  Actividades manuales: ${match.manualActivities.length}`)
        console.log(`  Ejemplos no cruzadas: ${previewList(match.unmatchedSourceRows, (row) => `${row.sourceKey}=${row.sourceValue}`)}`)
        console.log(`  Ejemplos manuales: ${previewList(match.manualActivities, (row) => `${row.sourceKey ?? 'sin_clave'} ${row.activityName}`)}`)
      }
    }
  } finally {
    await Promise.race([
      closeSqlPool('general'),
      new Promise((resolve) => setTimeout(resolve, 5000)),
    ])
  }
}

main()
  .then(() => {
    process.exit(0)
  })
  .catch((error) => {
    console.error(`ERROR ${error.message}`)
    process.exit(1)
  })
