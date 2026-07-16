import fs from 'node:fs/promises'
import path from 'node:path'
import { getSqlPool, closeSqlPool } from '../server/db/sql-server.js'

const outputPath = path.join('informes', 'ppr-0002-grupos-actividades.md')

const groups = [
  {
    code: 'NEO',
    name: 'Neonatologia',
    activityCodes: ['3330505', '3330501', '3330506', '3330619'],
  },
  {
    code: 'COMP',
    name: 'Con complicaciones',
    activityCodes: [
      '3330601',
      '3330621',
      '3330622',
      '3330623',
      '3330624',
      '3330625',
      '3330626',
      '3330627',
      '3330628',
      '3330629',
      '3330701',
      '3330711',
      '3330713',
      '3330714',
      '3330715',
      '3330716',
      '3330717',
      '3330718',
      '3330719',
      '3330720',
    ],
  },
]

function extractActivityCode(name) {
  return String(name ?? '').match(/\b(\d{7})\b/)?.[1] ?? null
}

function normalize(value) {
  return String(value ?? '').trim()
}

function escapeMd(value) {
  return String(value ?? '').replace(/\|/g, '\\|')
}

function findGroup(activityCode) {
  for (const group of groups) {
    if (group.activityCodes.includes(activityCode)) return group
  }
  return { code: 'OBS', name: 'Obstetricia', activityCodes: [] }
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
      WHERE p.code = '2'
      ORDER BY a.sort_order, a.id;
    `)

    const activities = result.recordset.map((row) => {
      const activityCode = extractActivityCode(row.name)
      const group = findGroup(activityCode)
      return {
        ...row,
        activity_code: activityCode,
        group_code: group.code,
        group_name: group.name,
      }
    })

    const allCodes = new Set(activities.map((row) => row.activity_code).filter(Boolean))
    const expectedCodes = groups.flatMap((group) => group.activityCodes)
    const missing = expectedCodes.filter((code) => !allCodes.has(code))
    const duplicates = expectedCodes.filter((code, index) => expectedCodes.indexOf(code) !== index)

    const lines = [
      '# PPR 0002 - Division de actividades',
      '',
      `Generado: ${new Date().toLocaleString('es-PE', { timeZone: 'America/Lima' })}`,
      '',
      '## Criterio',
      '',
      '- Neonatologia: actividades indicadas explicitamente como neonatologia.',
      '- Con complicaciones: actividades indicadas explicitamente como con complicaciones.',
      '- Obstetricia: todas las demas actividades del programa 0002.',
      '',
      '## Responsables operativos de vista',
      '',
      '| Grupo | Coordinador |',
      '| --- | --- |',
      '| Neonatologia | 2586 - CERVERA DOMINGUEZ CLAUDIA FIORELLA |',
      '| Con complicaciones | 4758 - ZUMAETA RODRIGUEZ ANA ALESSANDRA |',
      '| Obstetricia | 2865 - LLANCACHAHUA TARQUI PAOLA |',
      '',
      '## Resumen',
      '',
      '| Grupo | Actividades |',
      '| --- | ---: |',
    ]

    for (const groupName of ['Neonatologia', 'Con complicaciones', 'Obstetricia']) {
      const count = activities.filter((row) => row.group_name === groupName).length
      lines.push(`| ${groupName} | ${count} |`)
    }

    lines.push('', '## Validacion', '')
    lines.push(`- Total actividades 0002: ${activities.length}`)
    lines.push(`- Codigos indicados no encontrados: ${missing.length ? missing.join(', ') : 'ninguno'}`)
    lines.push(`- Codigos duplicados en la indicacion: ${duplicates.length ? duplicates.join(', ') : 'ninguno'}`)
    lines.push('', '## Actividades por grupo', '')

    for (const groupName of ['Neonatologia', 'Con complicaciones', 'Obstetricia']) {
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
    for (const groupName of ['Neonatologia', 'Con complicaciones', 'Obstetricia']) {
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
