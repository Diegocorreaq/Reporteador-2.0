import fs from 'node:fs/promises'
import path from 'node:path'
import { getSqlPool, closeSqlPool } from '../server/db/sql-server.js'
import {
  extractPprActivitySourceKey,
  resolvePprActivityGroup,
} from '../server/services/ppr-activity-scope.service.js'

const outputPath = path.join('informes', 'ppr-0016-grupos-actividades.md')

const tbcCodes = [
  '4395701',
  '4396201',
  '4396202',
  '4396401',
  '4396402',
  '4396505',
  '4396506',
  '4397301',
  '4397302',
  '4397303',
  '4397304',
  '4397305',
  '4396305',
  '4397201',
]

function normalize(value) {
  return String(value ?? '').trim()
}

function escapeMd(value) {
  return String(value ?? '').replace(/\|/g, '\\|')
}

async function main() {
  const pool = await getSqlPool('general')
  try {
    const result = await pool.request().query(`
      SELECT
        a.id,
        a.code AS aoi_code,
        a.name,
        a.unit,
        a.annual_goal,
        a.sort_order,
        a.is_active
      FROM dbo.ppr_activities a
      INNER JOIN dbo.ppr_programs p ON p.id = a.program_id
      WHERE p.code = '16'
      ORDER BY a.sort_order, a.id;
    `)

    const activities = result.recordset.map((row) => {
      const activityCode = extractPprActivitySourceKey(row.name)
      const group = resolvePprActivityGroup('16', row.name)
      return {
        ...row,
        activity_code: activityCode,
        group_code: group?.code ?? '',
        group_name: group?.name ?? 'Sin grupo',
      }
    })

    const allCodes = new Set(activities.map((row) => row.activity_code).filter(Boolean))
    const missing = tbcCodes.filter((code) => !allCodes.has(code))
    const duplicates = tbcCodes.filter((code, index) => tbcCodes.indexOf(code) !== index)

    const lines = [
      '# PPR 0016 - Division de actividades',
      '',
      `Generado: ${new Date().toLocaleString('es-PE', { timeZone: 'America/Lima' })}`,
      '',
      '## Criterio',
      '',
      '- TBC: actividades indicadas explicitamente como tuberculosis.',
      '- VIH/SIDA: todas las demas actividades del programa 0016.',
      '',
      '## Responsables operativos de vista',
      '',
      '| Grupo | Coordinador |',
      '| --- | --- |',
      '| TBC | 2582 - CERPA CHACALIAZA BELEN ULIANOVA BRISEYDA |',
      '| VIH/SIDA | 4226 - MIRANDA CARDENAS ALBERTO LEONARDO |',
      '',
      '## Resumen',
      '',
      '| Grupo | Actividades |',
      '| --- | ---: |',
    ]

    for (const groupName of ['TBC', 'VIH/SIDA']) {
      const count = activities.filter((row) => row.group_name === groupName).length
      lines.push(`| ${groupName} | ${count} |`)
    }

    lines.push('', '## Validacion', '')
    lines.push(`- Total actividades 0016: ${activities.length}`)
    lines.push(`- Codigos TBC indicados no encontrados: ${missing.length ? missing.join(', ') : 'ninguno'}`)
    lines.push(`- Codigos TBC duplicados en la indicacion: ${duplicates.length ? duplicates.join(', ') : 'ninguno'}`)
    lines.push('', '## Actividades por grupo', '')

    for (const groupName of ['TBC', 'VIH/SIDA']) {
      const groupActivities = activities.filter((row) => row.group_name === groupName)
      lines.push(`### ${groupName}`)
      lines.push('')
      lines.push('| Codigo | Actividad | AOI | Meta anual |')
      lines.push('| --- | --- | --- | ---: |')
      for (const row of groupActivities) {
        const name = normalize(row.name).replace(/^\d{7}\s*-\s*/, '')
        lines.push(`| ${row.activity_code ?? ''} | ${escapeMd(name)} | ${row.aoi_code} | ${row.annual_goal ?? ''} |`)
      }
      lines.push('')
    }

    await fs.mkdir(path.dirname(outputPath), { recursive: true })
    await fs.writeFile(outputPath, lines.join('\n'), 'utf8')

    console.log(`OK ${outputPath}`)
    console.log(`Total=${activities.length}`)
    for (const groupName of ['TBC', 'VIH/SIDA']) {
      console.log(`${groupName}=${activities.filter((row) => row.group_name === groupName).length}`)
    }
    if (missing.length) console.log(`Faltantes=${missing.join(',')}`)
    if (duplicates.length) console.log(`Duplicados=${duplicates.join(',')}`)
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
