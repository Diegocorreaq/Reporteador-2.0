import ExcelJS from 'exceljs'
import { getSqlPool, closeSqlPool, sql } from '../server/db/sql-server.js'
import {
  signPprPeriodWithMockDocument,
} from '../server/services/ppr-signature-document.service.js'

const TARGET_PROGRAMS = new Set(['2', '18', '24', '104', '129', '131', '1001', '9002'])
const MATRIX_TO_DB_CODE = new Map([
  ['0002', '2'],
  ['0018', '18'],
  ['0024', '24'],
  ['0104', '104'],
  ['0129', '129'],
  ['0131', '131'],
  ['1001', '1001'],
  ['9002', '9002'],
])
const YEAR = 2026
const MONTH = 6
const DEFAULT_FILE = '.tmp_MATRIZ_PPR_JUNIO_2026.xlsx'

const monthlyGoalColumns = [
  ['meta01', ['meta_fisica_programada_enero_26']],
  ['meta02', ['meta_fisica_programada_febrero_26']],
  ['meta03', ['meta_fisica_programada_marzo_26']],
  ['meta04', ['meta_fisica_programada_abril_26']],
  ['meta05', ['meta_fisica_programada_mayo_26']],
  ['meta06', ['meta_fisica_programada_junio_26']],
  ['meta07', ['meta_fisica_programada_julio_26']],
  ['meta08', ['meta_fisica_programada_agosto_26']],
  ['meta09', ['meta_fisica_programada_setiembre_26', 'meta_fisica_programada_septiembre_26']],
  ['meta10', ['meta_fisica_programada_octubre_26']],
  ['meta11', ['meta_fisica_programada_noviembre_26']],
  ['meta12', ['meta_fisica_programada_diciembre_26']],
]

function argValue(name, fallback = null) {
  const arg = process.argv.find((item) => item.startsWith(`--${name}=`))
  return arg ? arg.slice(name.length + 3) : fallback
}

function cellValue(cell) {
  const value = cell?.value
  if (value == null) return ''
  if (typeof value === 'object') {
    if ('result' in value) return value.result ?? ''
    if ('text' in value) return value.text ?? ''
    if ('richText' in value) return value.richText.map((part) => part.text).join('')
  }
  return value
}

function clean(value) {
  return String(value ?? '').replace(/\s+/g, ' ').trim()
}

function clip(value, maxLength) {
  const text = clean(value)
  return text.length > maxLength ? text.slice(0, maxLength) : text
}

function normalizeText(value) {
  return clean(value)
    .toUpperCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^A-Z0-9]+/g, ' ')
    .trim()
}

function normalizeHeader(value) {
  return clean(value)
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, '_')
    .replace(/^_+|_+$/g, '')
}

function normalizeProgramCode(value) {
  const code = clean(value).replace(/^0+/, '')
  return code || '0'
}

function numberValue(value) {
  if (value == null || value === '') return null
  if (typeof value === 'number') return value
  const parsed = Number(String(value).replace(',', '.'))
  return Number.isFinite(parsed) ? parsed : null
}

function findHeaderRow(worksheet) {
  for (let rowNumber = 1; rowNumber <= Math.min(worksheet.rowCount, 20); rowNumber += 1) {
    const row = worksheet.getRow(rowNumber)
    const headers = row.values.slice(1).map((value) => normalizeHeader(value?.text ?? value))
    if (headers.includes('idcategoria') || headers.includes('categoria_id')) return rowNumber
  }
  return 1
}

function columnMap(worksheet, headerRowNumber) {
  const map = new Map()
  worksheet.getRow(headerRowNumber).eachCell({ includeEmpty: true }, (cell, colNumber) => {
    const key = normalizeHeader(cellValue(cell))
    if (key && !map.has(key)) map.set(key, colNumber)
  })
  return map
}

function pickColumn(headers, candidates) {
  for (const candidate of candidates) {
    if (headers.has(candidate)) return headers.get(candidate)
  }
  return null
}

function rowObject(worksheet, rowNumber, headers) {
  const row = worksheet.getRow(rowNumber)
  const get = (candidates) => {
    const col = pickColumn(headers, candidates)
    return col ? cellValue(row.getCell(col)) : ''
  }
  const monthlyGoals = Object.fromEntries(
    monthlyGoalColumns.map(([key, candidates]) => [key, numberValue(get(candidates))]),
  )
  const goals = Object.values(monthlyGoals).filter((value) => value != null)
  const idcategoria = clean(get(['idcategoria', 'categoria_id', 'cod_pp']))
  const dbProgramCode = MATRIX_TO_DB_CODE.get(idcategoria.padStart(4, '0'))
    ?? MATRIX_TO_DB_CODE.get(idcategoria)
    ?? normalizeProgramCode(idcategoria)

  return {
    rowNumber,
    idcategoria,
    dbProgramCode,
    categoria: clean(get(['categoria', 'nombre_categoria', 'programa', 'programa_presupuestal'])),
    productoId: clean(get(['producto_id'])),
    producto: clean(get(['producto'])),
    actividadPresupuestalId: clean(get(['actividad_presupuestal_id'])),
    actividadPresupuestal: clean(get(['actividad_presupuestal'])),
    centroCostoId: clean(get(['centro_costo_id'])),
    centroCosto: clean(get(['centro_de_costo', 'responsable', 'centro_costo'])),
    aoId: clean(get(['ao_id', 'aoid', 'id_ao', 'actividad_operativa_id'])),
    actividad: clean(get(['actividad_operativa', 'actividadoperativa', 'actividad'])),
    unidad: clean(get(['unidad', 'unidad_medida', 'unidad_de_medida'])),
    value: numberValue(get(['f_se_06', 'f06', 'junio', 'jun', 'ejec_junio', 'ejecucion_junio'])),
    meta06: monthlyGoals.meta06,
    annualGoal: numberValue(get(['total', 'total_meta', 'meta_total', 'meta_anual']))
      ?? (goals.length ? goals.reduce((sum, value) => sum + value, 0) : null),
    observacion: clean(get(['observacion', 'observaciones'])),
  }
}

async function readMatrixRows(filePath) {
  const workbook = new ExcelJS.Workbook()
  await workbook.xlsx.readFile(filePath)
  const worksheet = workbook.worksheets[0]
  const headerRow = findHeaderRow(worksheet)
  const headers = columnMap(worksheet, headerRow)
  const rows = []
  for (let rowNumber = headerRow + 1; rowNumber <= worksheet.rowCount; rowNumber += 1) {
    const row = rowObject(worksheet, rowNumber, headers)
    if (TARGET_PROGRAMS.has(row.dbProgramCode)) rows.push(row)
  }
  return rows
}

function activityCodeCandidates(row) {
  return [
    row.actividadPresupuestalId,
    row.productoId,
    row.aoId,
  ].filter(Boolean)
}

function activityNames(row) {
  return [
    row.actividad,
    row.actividadPresupuestal,
    row.producto,
  ].filter(Boolean)
}

function activityLookupKey(name, unit) {
  return `${normalizeText(name)}||${normalizeText(unit)}`
}

function sourceNotes(row) {
  const parts = [
    'Matriz PPR Junio 2026',
    `Fila ${row.rowNumber}`,
    row.centroCosto ? `Centro costo: ${row.centroCosto}` : '',
    row.meta06 != null ? `Meta junio: ${row.meta06}` : '',
    row.observacion ? `Obs: ${row.observacion}` : '',
  ].filter(Boolean)
  return clip(parts.join(' | '), 500)
}

function sourceKey(row, activityId) {
  return clip(`MATRIZ:${row.idcategoria}:${row.rowNumber}:${row.aoId || row.actividadPresupuestalId || activityId}`, 50)
}

function mapRowsToActivities(rows, activitiesByProgram) {
  const mapped = []
  const unmatched = []

  for (const row of rows) {
    const activities = activitiesByProgram.get(row.dbProgramCode) ?? []
    const byCode = new Map()
    const byName = new Map()
    for (const activity of activities) {
      if (activity.code) byCode.set(clean(activity.code), activity)
      byName.set(activityLookupKey(activity.name, activity.unit), activity)
    }

    let activity = null
    for (const code of activityCodeCandidates(row)) {
      activity = byCode.get(clean(code))
      if (activity) break
    }
    if (!activity) {
      for (const name of activityNames(row)) {
        activity = byName.get(activityLookupKey(name, row.unidad))
        if (activity) break
      }
    }
    if (!activity && row.dbProgramCode === '9002') {
      activity = activities.find((item) => normalizeText(item.name) === normalizeText(row.actividad))
    }

    if (activity) {
      mapped.push({ row, activity })
    } else {
      unmatched.push(row)
    }
  }

  return { mapped, unmatched }
}

function groupRowsByProgram(rows) {
  const grouped = new Map()
  for (const row of rows) {
    const list = grouped.get(row.dbProgramCode) ?? []
    list.push(row)
    grouped.set(row.dbProgramCode, list)
  }
  return grouped
}

async function inspectOrApply({ apply, sign }) {
  const filePath = argValue('file', DEFAULT_FILE)
  const rows = await readMatrixRows(filePath)
  const pool = await getSqlPool('general')
  const summaryByProgram = new Map()

  try {
    const base = await pool.request().query(`
      SELECT id, code, name
      FROM dbo.ppr_programs
      WHERE code IN ('2','18','24','104','129','131','1001','9002');

      SELECT id, year, month
      FROM dbo.ppr_periods
      WHERE year = 2026 AND month = 6;

      SELECT a.id, a.program_id, p.code AS program_code, a.code, a.name, a.unit, a.sort_order
      FROM dbo.ppr_activities a
      JOIN dbo.ppr_programs p ON p.id = a.program_id
      WHERE p.code IN ('2','18','24','104','129','131','1001','9002')
        AND ISNULL(a.is_active, 1) = 1
      ORDER BY p.code, a.sort_order, a.id;
    `)
    const programs = new Map(base.recordsets[0].map((program) => [String(program.code), program]))
    const period = base.recordsets[1][0]
    if (!period) throw new Error('No existe el periodo junio 2026.')

    const activitiesByProgram = new Map()
    for (const activity of base.recordsets[2]) {
      const list = activitiesByProgram.get(String(activity.program_code)) ?? []
      list.push(activity)
      activitiesByProgram.set(String(activity.program_code), list)
    }

    const groupedRows = groupRowsByProgram(rows)
    const allMapped = []
    const allUnmatched = []

    for (const [programCode, programRows] of groupedRows) {
      if (!programs.has(programCode)) continue
      const { mapped, unmatched } = mapRowsToActivities(programRows, activitiesByProgram)
      summaryByProgram.set(programCode, {
        matrixRows: programRows.length,
        withExecution: programRows.filter((row) => row.value != null).length,
        mapped: mapped.length,
        mappedWithExecution: mapped.filter(({ row }) => row.value != null).length,
        unmatched: unmatched.length,
        inserted: 0,
        updated: 0,
        signed: 0,
        signSkipped: 0,
      })
      allMapped.push(...mapped)
      allUnmatched.push(...unmatched)
    }

    if (apply) {
      const transaction = new sql.Transaction(pool)
      await transaction.begin()
      try {
        for (const { row, activity } of allMapped) {
          if (row.value == null) continue
          const programSummary = summaryByProgram.get(row.dbProgramCode)
          const loader = await new sql.Request(transaction)
            .input('programId', sql.Int, activity.program_id)
            .query(`
              SELECT TOP 1 employee_id
              FROM dbo.ppr_user_programs
              WHERE program_id = @programId
                AND ISNULL(is_active, 1) = 1
              ORDER BY id;
            `)
          const employeeId = loader.recordset[0]?.employee_id
          if (!employeeId) continue

          const update = await new sql.Request(transaction)
            .input('activityId', sql.Int, activity.id)
            .input('periodId', sql.Int, period.id)
            .input('employeeId', sql.Int, employeeId)
            .input('value', sql.Decimal(18, 2), row.value)
            .input('notes', sql.NVarChar(500), sourceNotes(row))
            .input('sourceKey', sql.NVarChar(50), sourceKey(row, activity.id))
            .input('sourceValue', sql.Decimal(18, 2), row.value)
            .input('loadedBy', sql.Int, employeeId)
            .query(`
              UPDATE dbo.ppr_monthly_values
              SET employee_id = @employeeId,
                  value = @value,
                  notes = @notes,
                  updated_at = GETDATE(),
                  value_source = 'source',
                  source_key = @sourceKey,
                  source_value = @sourceValue,
                  loaded_by = @loadedBy,
                  loaded_at = SYSDATETIME(),
                  validation_status = 'validated',
                  validated_by = @loadedBy,
                  validated_at = SYSDATETIME(),
                  import_run_id = NULL
              WHERE activity_id = @activityId
                AND period_id = @periodId;

              SELECT @@ROWCOUNT AS affected;
            `)
          if (update.recordset[0]?.affected) {
            programSummary.updated += 1
          } else {
            await new sql.Request(transaction)
              .input('activityId', sql.Int, activity.id)
              .input('periodId', sql.Int, period.id)
              .input('employeeId', sql.Int, employeeId)
              .input('value', sql.Decimal(18, 2), row.value)
              .input('notes', sql.NVarChar(500), sourceNotes(row))
              .input('sourceKey', sql.NVarChar(50), sourceKey(row, activity.id))
              .input('sourceValue', sql.Decimal(18, 2), row.value)
              .input('loadedBy', sql.Int, employeeId)
              .query(`
                INSERT INTO dbo.ppr_monthly_values (
                  activity_id, period_id, employee_id, value, notes, created_at, updated_at,
                  value_source, source_key, source_value, loaded_by, loaded_at,
                  validated_by, validated_at, validation_status
                )
                VALUES (
                  @activityId, @periodId, @employeeId, @value, @notes, GETDATE(), GETDATE(),
                  'source', @sourceKey, @sourceValue, @loadedBy, SYSDATETIME(),
                  @loadedBy, SYSDATETIME(), 'validated'
                );
              `)
            programSummary.inserted += 1
          }
        }
        await transaction.commit()
      } catch (error) {
        await transaction.rollback()
        throw error
      }
    }

    if (apply && sign) {
      for (const program of programs.values()) {
        const assignments = await pool.request()
          .input('programId', sql.Int, program.id)
          .query(`
            SELECT DISTINCT up.employee_id
            FROM dbo.ppr_user_programs up
            WHERE up.program_id = @programId
              AND ISNULL(up.is_active, 1) = 1;
          `)
        const programSummary = summaryByProgram.get(String(program.code))
        for (const assignment of assignments.recordset) {
          try {
            await signPprPeriodWithMockDocument({
              employeeId: Number(assignment.employee_id),
              periodId: Number(period.id),
              programId: Number(program.id),
              signerDni: String(assignment.employee_id),
              signerName: `Empleado ${assignment.employee_id}`,
              forceForTesting: true,
            })
            if (programSummary) programSummary.signed += 1
          } catch (error) {
            if (error.code === 'PPR_PERIOD_ALREADY_SIGNED') {
              if (programSummary) programSummary.signSkipped += 1
            } else {
              throw error
            }
          }
        }
      }
    }

    const summary = Array.from(summaryByProgram.entries())
      .sort(([a], [b]) => Number(a) - Number(b))
      .map(([programCode, values]) => ({ programCode, ...values }))
    console.log(JSON.stringify({ summary, unmatched: allUnmatched.map((row) => ({
      programCode: row.dbProgramCode,
      row: row.rowNumber,
      actividadPresupuestalId: row.actividadPresupuestalId,
      aoId: row.aoId,
      actividad: row.actividad,
      value: row.value,
    })) }, null, 2))
  } finally {
    await closeSqlPool('general')
  }
}

await inspectOrApply({
  apply: process.argv.includes('--apply'),
  sign: process.argv.includes('--sign'),
})
