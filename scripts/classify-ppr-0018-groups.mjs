import fs from 'node:fs/promises'
import path from 'node:path'
import { getSqlPool, closeSqlPool } from '../server/db/sql-server.js'
import {
  extractPprActivitySourceKey,
  resolvePprActivityGroup,
} from '../server/services/ppr-activity-scope.service.js'

const outputPath = path.join('informes', 'ppr-0018-grupos-actividades.md')

const odontoCodes = [
  '0068001',
  '0068002',
  '0068003',
  '0068101',
  '5000601',
  '5000602',
  '5000606',
  '5000701',
  '5000702',
  '5000703',
  '5000704',
  '5000705',
  '5000804',
  '5000814',
  '5000815',
  '5000816',
  '5000817',
  '5000818',
]

const cronicosCodes = ['5001606', '5001608', '5001704', '5001705']

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
      WHERE p.code = '18'
      ORDER BY a.sort_order, a.id;
    `)

    const activities = result.recordset.map((row) => {
      const activityCode = extractPprActivitySourceKey(row.name)
      const group = resolvePprActivityGroup('18', row.name)
      return {
        ...row,
        activity_code: activityCode,
        group_code: group?.code ?? '',
        group_name: group?.name ?? 'Sin grupo',
      }
    })

    const allCodes = new Set(activities.map((row) => row.activity_code).filter(Boolean))
    const missingOdonto = odontoCodes.filter((code) => !allCodes.has(code))
    const missingCronicos = cronicosCodes.filter((code) => !allCodes.has(code))
    const duplicatedIndicationCodes = [...odontoCodes, ...cronicosCodes]
      .filter((code, index, all) => all.indexOf(code) !== index)

    const lines = [
      '# PPR 0018 - Division de actividades',
      '',
      `Generado: ${new Date().toLocaleString('es-PE', { timeZone: 'America/Lima' })}`,
      '',
      '## Criterio',
      '',
      '- Oftalmologia: todas las actividades no incluidas en odontologia ni cronicos.',
      '- Odontologia: actividades indicadas explicitamente como odontologia.',
      '- Cronicos: hipertension, riesgo cardiovascular y diabetes.',
      '',
      '## Responsables operativos de vista',
      '',
      '| Grupo | Coordinador |',
      '| --- | --- |',
      '| Oftalmologia | 1780 - LINARES ROJAS LEANDRO WILSON |',
      '| Odontologia | 2791 - MOLINA DELGADO HERNAN CHRISTOFER |',
      '| Cronicos | 1929 - CONSTANTINO ESPINO ANA CECILIA |',
      '',
      '## Resumen',
      '',
      '| Grupo | Actividades |',
      '| --- | ---: |',
    ]

    for (const groupName of ['Oftalmologia', 'Odontologia', 'Cronicos']) {
      const count = activities.filter((row) => row.group_name === groupName).length
      lines.push(`| ${groupName} | ${count} |`)
    }

    lines.push('', '## Validacion', '')
    lines.push(`- Total actividades 0018: ${activities.length}`)
    lines.push(`- Codigos odontologia indicados no encontrados: ${missingOdonto.length ? missingOdonto.join(', ') : 'ninguno'}`)
    lines.push(`- Codigos cronicos indicados no encontrados: ${missingCronicos.length ? missingCronicos.join(', ') : 'ninguno'}`)
    lines.push(`- Codigos duplicados en la indicacion: ${duplicatedIndicationCodes.length ? duplicatedIndicationCodes.join(', ') : 'ninguno'}`)
    lines.push('', '## Actividades por grupo', '')

    for (const groupName of ['Oftalmologia', 'Odontologia', 'Cronicos']) {
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
    for (const groupName of ['Oftalmologia', 'Odontologia', 'Cronicos']) {
      console.log(`${groupName}=${activities.filter((row) => row.group_name === groupName).length}`)
    }
    if (missingOdonto.length) console.log(`FaltantesOdonto=${missingOdonto.join(',')}`)
    if (missingCronicos.length) console.log(`FaltantesCronicos=${missingCronicos.join(',')}`)
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
