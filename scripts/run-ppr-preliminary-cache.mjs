import { closeSqlPool, getSqlPool } from '../server/db/sql-server.js'
import {
  getPprImportSources,
  getProgramaPreliminar,
  refreshProgramaPreliminar,
} from '../server/services/ppr-data.service.js'

const DEFAULT_ADMIN_ID = Number(process.env.PPR_PRELIMINARY_ADMIN_ID ?? 5713)

function normalizeProgramCode(value) {
  const normalized = String(value ?? '').trim().replace(/^0+/, '')
  return normalized || '0'
}

function getAllConfiguredProgramCodes() {
  return [...new Set(getPprImportSources()
    .flatMap((source) => source.programCodes ?? [])
    .map(normalizeProgramCode))]
}

function parseArgs(argv) {
  const options = {
    adminId: DEFAULT_ADMIN_ID,
    force: false,
    programCodes: getAllConfiguredProgramCodes(),
    stopOnError: false,
  }

  for (let index = 0; index < argv.length; index += 1) {
    const arg = argv[index]
    if (arg === '--help' || arg === '-h') {
      options.help = true
    } else if (arg === '--force') {
      options.force = true
    } else if (arg === '--stop-on-error') {
      options.stopOnError = true
    } else if (arg === '--all') {
      options.programCodes = getAllConfiguredProgramCodes()
    } else if (arg === '--program' || arg === '--programs') {
      options.programCodes = splitProgramCodes(argv[index + 1])
      index += 1
    } else if (arg.startsWith('--program=')) {
      options.programCodes = splitProgramCodes(arg.slice('--program='.length))
    } else if (arg.startsWith('--programs=')) {
      options.programCodes = splitProgramCodes(arg.slice('--programs='.length))
    } else if (arg === '--admin-id') {
      options.adminId = Number(argv[index + 1])
      index += 1
    } else if (arg.startsWith('--admin-id=')) {
      options.adminId = Number(arg.slice('--admin-id='.length))
    } else {
      throw new Error(`Argumento no reconocido: ${arg}`)
    }
  }

  if (!Number.isFinite(options.adminId) || options.adminId <= 0) {
    throw new Error('Debe indicar un admin valido con --admin-id o PPR_PRELIMINARY_ADMIN_ID.')
  }
  if (!options.programCodes.length) {
    throw new Error('Debe indicar al menos un programa PPR.')
  }

  return options
}

function splitProgramCodes(value) {
  return String(value ?? '')
    .split(',')
    .map((item) => item.trim())
    .filter(Boolean)
}

function printHelp() {
  console.log([
    'Precarga preliminar PPR en tablas SQL.',
    '',
    'Uso:',
    '  node scripts/run-ppr-preliminary-cache.mjs --all',
    '  node scripts/run-ppr-preliminary-cache.mjs --program=18',
    '  node scripts/run-ppr-preliminary-cache.mjs --programs=18,129 --force',
    '  node scripts/run-ppr-preliminary-cache.mjs --all --stop-on-error',
    '',
    'Sin argumentos precarga todos los programas PPR con fuente automatica.',
    '',
    'Variables:',
    '  PPR_PRELIMINARY_ADMIN_ID=5713',
    '  PPR_PRELIMINARY_QUERY_TIMEOUT_MS=900000',
  ].join('\n'))
}

async function getProgramsByCode(programCodes) {
  const wanted = new Set(programCodes.map(normalizeProgramCode))
  const pool = await getSqlPool('general')
  const result = await pool.request().query(`
    SELECT id, code, name
    FROM dbo.ppr_programs
    ORDER BY code;
  `)

  const programs = result.recordset
    .filter((row) => wanted.has(normalizeProgramCode(row.code)))
    .map((row) => ({
      id: Number(row.id),
      code: String(row.code ?? ''),
      name: String(row.name ?? ''),
    }))

  const found = new Set(programs.map((program) => normalizeProgramCode(program.code)))
  const missing = [...wanted].filter((code) => !found.has(code))
  if (missing.length) {
    throw new Error(`No se encontraron programas PPR: ${missing.join(', ')}`)
  }

  return programs
}

function assertSourceConfigured(program) {
  const normalizedCode = normalizeProgramCode(program.code)
  const source = getPprImportSources().find((item) => (
    item.programCodes?.map(normalizeProgramCode).includes(normalizedCode)
  ))

  if (!source) {
    throw new Error(`El programa ${program.code} no tiene fuente preliminar configurada.`)
  }

  return source
}

async function runProgram(program, options) {
  const source = assertSourceConfigured(program)
  const startedAt = Date.now()
  console.log(`[PPR ${program.code}] Fuente: ${source.procedureName}`)

  if (!options.force) {
    const cached = await getProgramaPreliminar(program.id, options.adminId, { refreshIfMissing: false })
    if (cached) {
      console.log(`[PPR ${program.code}] SKIP corte ya generado: ${cached.cutoffLabel}; filas=${cached.rowsMatched}/${cached.totalActivities}`)
      return { status: 'skipped', program, result: cached, durationMs: Date.now() - startedAt }
    }
  }

  const result = await refreshProgramaPreliminar(program.id, options.adminId)
  console.log(`[PPR ${program.code}] OK corte=${result.cutoffLabel}; filas=${result.rowsMatched}/${result.totalActivities}; leidas=${result.rowsRead}; ms=${Date.now() - startedAt}`)
  return { status: 'completed', program, result, durationMs: Date.now() - startedAt }
}

async function main() {
  const options = parseArgs(process.argv.slice(2))
  if (options.help) {
    printHelp()
    return
  }

  try {
    console.log(`Precarga preliminar PPR inicio=${new Date().toISOString()} programas=${options.programCodes.join(',')} admin=${options.adminId} force=${options.force}`)
    const programs = await getProgramsByCode(options.programCodes)
    const results = []

    for (const program of programs) {
      try {
        results.push(await runProgram(program, options))
      } catch (error) {
        console.error(`[PPR ${program.code}] ERROR ${error.message}`)
        results.push({ status: 'failed', program, error, durationMs: 0 })
        if (options.stopOnError) throw error
      }
    }

    const completed = results.filter((item) => item.status === 'completed').length
    const skipped = results.filter((item) => item.status === 'skipped').length
    const failed = results.filter((item) => item.status === 'failed').length
    console.log(`Precarga preliminar PPR fin=${new Date().toISOString()} completados=${completed} omitidos=${skipped} fallidos=${failed}`)
    if (failed > 0) {
      process.exitCode = 1
    }
  } finally {
    await closeSqlPool('general')
  }
}

main().catch(async (error) => {
  await closeSqlPool('general').catch(() => {})
  console.error(`ERROR ${error.message}`)
  process.exit(1)
})
