import ExcelJS from 'exceljs'
import { getSqlPool, closeSqlPool, sql } from '../server/db/sql-server.js'

function getWorkbookPath() {
  const fileArg = process.argv.find((arg) => arg.startsWith('--file='))
  return fileArg ? fileArg.slice('--file='.length) : '.tmp_MATRIZ_PPR_JUNIO_2026.xlsx'
}

const workbookPath = getWorkbookPath()
const PROGRAM_CODE = '9002'
const YEAR = 2026
const MONTH = 6
const VALUE_SOURCE = 'source'

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

function numberValue(value) {
  if (value == null || value === '') return null
  if (typeof value === 'number') return value
  const parsed = Number(String(value).replace(',', '.'))
  return Number.isFinite(parsed) ? parsed : null
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
}

function normalizeHeader(value) {
  return clean(value)
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, '_')
    .replace(/^_+|_+$/g, '')
}

function findHeaderRow(worksheet) {
  for (let rowNumber = 1; rowNumber <= Math.min(worksheet.rowCount, 20); rowNumber += 1) {
    const row = worksheet.getRow(rowNumber)
    const headers = row.values.slice(1).map((value) => normalizeHeader(value?.text ?? value))
    if (headers.includes('idcategoria') || headers.includes('categoria_id')) {
      return rowNumber
    }
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
  const monthlyGoalValues = Object.values(monthlyGoals).filter((value) => value != null)
  const computedAnnualGoal = monthlyGoalValues.length
    ? monthlyGoalValues.reduce((sum, value) => sum + value, 0)
    : null

  return {
    rowNumber,
    poi: numberValue(get(['poi'])) ?? 0,
    centroCostoId: clean(get(['centro_costo_id'])),
    idcategoria: clean(get(['idcategoria', 'categoria_id', 'cod_pp'])),
    categoria: clean(get(['categoria', 'nombre_categoria', 'programa', 'programa_presupuestal'])),
    responsable: clean(get(['centro_de_costo', 'responsable', 'centro_costo'])),
    aoId: clean(get(['ao_id', 'aoid', 'id_ao', 'actividad_operativa_id'])),
    actividad: clean(get(['actividad_operativa', 'actividadoperativa', 'actividad'])),
    umId: numberValue(get(['um_id', 'umid', 'id_um'])) ?? null,
    unidad: clean(get(['unidad', 'unidad_medida', 'unidad_de_medida'])),
    metaAnual: numberValue(get(['total', 'total_meta', 'meta_total', 'meta_anual'])) ?? computedAnnualGoal,
    f06: numberValue(get(['f_se_06', 'f06', 'junio', 'jun', 'ejec_junio', 'ejecucion_junio'])),
    meta06: monthlyGoals.meta06 ?? numberValue(get(['meta06', 'meta_junio', 'meta_jun'])),
    monthlyGoals,
    observacion: clean(get(['observacion', 'observaciones'])),
  }
}

async function readRows() {
  const workbook = new ExcelJS.Workbook()
  await workbook.xlsx.readFile(workbookPath)
  const worksheet = workbook.worksheets[0]
  const headerRow = findHeaderRow(worksheet)
  const headers = columnMap(worksheet, headerRow)
  const rows = []
  for (let rowNumber = headerRow + 1; rowNumber <= worksheet.rowCount; rowNumber += 1) {
    const row = rowObject(worksheet, rowNumber, headers)
    if (row.idcategoria === PROGRAM_CODE) rows.push(row)
  }
  return { worksheet, headerRow, headers, rows }
}

function summarizeRows(rows) {
  return rows.map((row) => ({
    row: row.rowNumber,
    idcategoria: row.idcategoria,
    responsable: row.responsable,
    aoId: row.aoId,
    actividad: row.actividad,
    unidad: row.unidad,
    f06: row.f06,
    meta06: row.meta06,
    metaAnual: row.metaAnual,
  }))
}

async function inspect() {
  const workbook = new ExcelJS.Workbook()
  await workbook.xlsx.readFile(workbookPath)
  console.log('Hojas:')
  for (const worksheet of workbook.worksheets) {
    console.log(`- ${worksheet.name}: ${worksheet.rowCount}x${worksheet.columnCount}`)
  }

  const { worksheet, headerRow, headers, rows } = await readRows()
  console.log('Hoja usada:', worksheet.name)
  console.log('Fila cabecera:', headerRow)
  console.log('Columnas:', Array.from(headers.entries()).map(([key, col]) => `${key}:${col}`).join(', '))
  console.log('Filas 9002:', rows.length)
  console.table(summarizeRows(rows))
}

async function inspectDb() {
  const pool = await getSqlPool('general')
  try {
    const result = await pool.request().query(`
      SELECT TABLE_NAME, COLUMN_NAME, DATA_TYPE, IS_NULLABLE
      FROM INFORMATION_SCHEMA.COLUMNS
      WHERE TABLE_SCHEMA = 'dbo'
        AND TABLE_NAME IN ('ppr_programs','ppr_activities','ppr_periods','ppr_monthly_values','ppr_user_programs')
      ORDER BY TABLE_NAME, ORDINAL_POSITION;

      SELECT TOP 20 id, code, name FROM dbo.ppr_programs ORDER BY code;
      SELECT TOP 20 id, year, month, is_open FROM dbo.ppr_periods ORDER BY year DESC, month DESC;
      SELECT COUNT(*) AS activities_9002
      FROM dbo.ppr_activities
      WHERE program_id = (SELECT id FROM dbo.ppr_programs WHERE code = '9002');
      SELECT COUNT(*) AS values_9002_junio
      FROM dbo.ppr_monthly_values mv
      JOIN dbo.ppr_activities a ON a.id = mv.activity_id
      JOIN dbo.ppr_programs p ON p.id = a.program_id
      JOIN dbo.ppr_periods per ON per.id = mv.period_id
      WHERE p.code = '9002' AND per.year = 2026 AND per.month = 6;
    `)
    console.log(JSON.stringify(result.recordsets, null, 2))
  } finally {
    await closeSqlPool('general')
  }
}

function sourceKey(row, activityCode) {
  return clip(`PP9002:${row.rowNumber}:${row.aoId || activityCode}`, 50)
}

function sourceNotes(row) {
  const parts = [
    'Matriz PPR Junio 2026',
    `Fila ${row.rowNumber}`,
    row.responsable ? `Centro costo: ${row.responsable}` : '',
    row.meta06 != null ? `Meta junio: ${row.meta06}` : '',
    row.observacion ? `Obs: ${row.observacion}` : '',
  ].filter(Boolean)
  return clip(parts.join(' | '), 500)
}

function codeForNewActivity(row, codeCounts, usedCodes) {
  const rawCode = row.aoId || `R${row.rowNumber}`
  const cleaned = rawCode.replace(/[^A-Za-z0-9._-]/g, '')
  let candidate = cleaned
  if (!candidate || codeCounts.get(row.aoId) > 1 || usedCodes.has(candidate)) {
    candidate = `${cleaned || 'R'}-${row.rowNumber}`
  }
  if (candidate.length > 20) candidate = `${candidate.slice(0, 15)}-${row.rowNumber}`.slice(0, 20)
  usedCodes.add(candidate)
  return candidate
}

function activityLookupKey(code, name) {
  return `${clean(code)}||${normalizeText(name)}`
}

function activityNameLookupKey(name, unit) {
  return `${normalizeText(name)}||${normalizeText(unit)}`
}

async function applyLoad() {
  const { rows } = await readRows()
  if (!rows.length) {
    throw new Error('No se encontraron filas con categoria 9002 en la matriz.')
  }

  const pool = await getSqlPool('general')
  const transaction = new sql.Transaction(pool)
  const summary = {
    matrixRows: rows.length,
    activitiesInserted: 0,
    activitiesUpdated: 0,
    valuesInserted: 0,
    valuesUpdated: 0,
    rowsWithoutExecution: 0,
  }

  try {
    await transaction.begin()

    const baseRequest = new sql.Request(transaction)
    const base = await baseRequest.query(`
      SELECT id, code, name
      FROM dbo.ppr_programs
      WHERE code = '9002';

      SELECT id, year, month
      FROM dbo.ppr_periods
      WHERE year = 2026 AND month = 6;

      SELECT TOP 1 employee_id
      FROM dbo.ppr_user_programs
      WHERE program_id = (SELECT id FROM dbo.ppr_programs WHERE code = '9002')
        AND ISNULL(is_active, 1) = 1
      ORDER BY id;
    `)

    const program = base.recordsets[0][0]
    const period = base.recordsets[1][0]
    const loader = base.recordsets[2][0]
    if (!program) throw new Error('El programa 9002 no existe en dbo.ppr_programs.')
    if (!period) throw new Error('No existe el periodo junio 2026 en dbo.ppr_periods.')
    if (!loader) throw new Error('El programa 9002 no tiene usuario asignado para registrar la carga.')

    const existingResult = await new sql.Request(transaction)
      .input('programId', sql.Int, program.id)
      .query(`
        SELECT id, code, name, unit, annual_goal, sort_order
        FROM dbo.ppr_activities
        WHERE program_id = @programId;
      `)

    const byCodeAndName = new Map()
    const byNameAndUnit = new Map()
    const existingCodes = new Set()
    for (const activity of existingResult.recordset) {
      byCodeAndName.set(activityLookupKey(activity.code, activity.name), activity)
      byNameAndUnit.set(activityNameLookupKey(activity.name, activity.unit), activity)
      if (activity.code) existingCodes.add(activity.code)
    }

    const codeCounts = new Map()
    for (const row of rows) {
      if (!row.aoId) continue
      codeCounts.set(row.aoId, (codeCounts.get(row.aoId) ?? 0) + 1)
    }

    let sortOrder = 1
    for (const row of rows) {
      const activityName = clip(row.actividad, 300)
      const unit = clip(row.unidad, 50)
      let activity = row.aoId ? byCodeAndName.get(activityLookupKey(row.aoId, activityName)) : null
      if (!activity) activity = byNameAndUnit.get(activityNameLookupKey(activityName, unit))

      if (activity) {
        await new sql.Request(transaction)
          .input('activityId', sql.Int, activity.id)
          .input('name', sql.NVarChar(300), activityName)
          .input('unit', sql.NVarChar(50), unit || null)
          .input('annualGoal', sql.Decimal(18, 2), row.metaAnual)
          .input('sortOrder', sql.Int, sortOrder)
          .query(`
            UPDATE dbo.ppr_activities
            SET name = @name,
                unit = @unit,
                annual_goal = @annualGoal,
                sort_order = @sortOrder,
                is_active = 1
            WHERE id = @activityId;
          `)
        summary.activitiesUpdated += 1
      } else {
        const activityCode = codeForNewActivity(row, codeCounts, existingCodes)
        const insertResult = await new sql.Request(transaction)
          .input('programId', sql.Int, program.id)
          .input('code', sql.VarChar(20), activityCode)
          .input('name', sql.NVarChar(300), activityName)
          .input('unit', sql.NVarChar(50), unit || null)
          .input('annualGoal', sql.Decimal(18, 2), row.metaAnual)
          .input('sortOrder', sql.Int, sortOrder)
          .query(`
            INSERT INTO dbo.ppr_activities (program_id, code, name, unit, annual_goal, sort_order, is_active)
            OUTPUT INSERTED.id, INSERTED.code, INSERTED.name, INSERTED.unit
            VALUES (@programId, @code, @name, @unit, @annualGoal, @sortOrder, 1);
          `)
        activity = insertResult.recordset[0]
        summary.activitiesInserted += 1
      }

      if (row.f06 == null) {
        summary.rowsWithoutExecution += 1
        sortOrder += 1
        continue
      }

      const updateValue = await new sql.Request(transaction)
        .input('activityId', sql.Int, activity.id)
        .input('periodId', sql.Int, period.id)
        .input('employeeId', sql.Int, loader.employee_id)
        .input('value', sql.Decimal(18, 2), row.f06)
        .input('notes', sql.NVarChar(500), sourceNotes(row))
        .input('sourceKey', sql.NVarChar(50), sourceKey(row, activity.code))
        .input('sourceValue', sql.Decimal(18, 2), row.f06)
        .input('loadedBy', sql.Int, loader.employee_id)
        .query(`
          UPDATE dbo.ppr_monthly_values
          SET employee_id = @employeeId,
              value = @value,
              notes = @notes,
              updated_at = GETDATE(),
              value_source = '${VALUE_SOURCE}',
              source_key = @sourceKey,
              source_value = @sourceValue,
              loaded_by = @loadedBy,
              loaded_at = SYSDATETIME(),
              validation_status = 'pending',
              import_run_id = NULL
          WHERE activity_id = @activityId
            AND period_id = @periodId;

          SELECT @@ROWCOUNT AS affected;
        `)

      if (updateValue.recordset[0]?.affected) {
        summary.valuesUpdated += 1
      } else {
        await new sql.Request(transaction)
          .input('activityId', sql.Int, activity.id)
          .input('periodId', sql.Int, period.id)
          .input('employeeId', sql.Int, loader.employee_id)
          .input('value', sql.Decimal(18, 2), row.f06)
          .input('notes', sql.NVarChar(500), sourceNotes(row))
          .input('sourceKey', sql.NVarChar(50), sourceKey(row, activity.code))
          .input('sourceValue', sql.Decimal(18, 2), row.f06)
          .input('loadedBy', sql.Int, loader.employee_id)
          .query(`
            INSERT INTO dbo.ppr_monthly_values (
              activity_id, period_id, employee_id, value, notes, created_at, updated_at,
              value_source, source_key, source_value, loaded_by, loaded_at, validation_status
            )
            VALUES (
              @activityId, @periodId, @employeeId, @value, @notes, GETDATE(), GETDATE(),
              '${VALUE_SOURCE}', @sourceKey, @sourceValue, @loadedBy, SYSDATETIME(), 'pending'
            );
          `)
        summary.valuesInserted += 1
      }

      sortOrder += 1
    }

    await transaction.commit()
    console.log(JSON.stringify(summary, null, 2))
  } catch (error) {
    await transaction.rollback()
    throw error
  } finally {
    await closeSqlPool('general')
  }
}

if (process.argv.includes('--apply')) {
  await applyLoad()
} else if (process.argv.includes('--db')) {
  await inspectDb()
} else {
  await inspect()
}
