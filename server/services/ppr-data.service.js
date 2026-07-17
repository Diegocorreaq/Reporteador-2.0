import {
  executeProcedure_General as executeProcedure,
  sql,
} from './sigh-sql-helpers.js'
import { getSqlPool } from '../db/sql-server.js'
import { ensurePprSignedDocumentInfrastructure } from './ppr-signature-document.service.js'
import {
  canPprEmployeeEditActivity,
  filterPprActivitiesForEmployee,
  getPprActivityGroupDefinition,
  getPprEmployeeActivityScopeGroups,
  getPprProgramActivityGroups,
  resolvePprActivityGroup,
} from './ppr-activity-scope.service.js'
import { logger } from '../utils/logger.js'

const MONTHS_ES = [
  'Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio',
  'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre',
]

const WEEKDAYS_ES = ['domingo', 'lunes', 'martes', 'miercoles', 'jueves', 'viernes', 'sabado']
const PPR_PRELIMINARY_TIME_ZONE = 'America/Bogota'
const PPR_PRELIMINARY_CUTOFF_HOUR = 8
const PPR_PRELIMINARY_MANUAL_ONLY_PROGRAM_CODES = new Set(['16', '17'])

let pprActivityGroupInfrastructurePromise = null
let pprPreliminaryInfrastructurePromise = null

const PPR_IMPORT_SOURCES = [
  {
    id: 'ppr_0002_salud_materno_neonatal',
    label: '0002 - Salud materno neonatal',
    procedureName: 'dbo.usp_PPR_0002',
    description: 'Avance de metas fisicas del PP 0002 segun criterios de programacion 2026.',
    programCodes: ['2', '0002'],
  },
  {
    id: 'ppr_0018_enfermedades_no_transmisibles',
    label: '0018 - Enfermedades no transmisibles',
    procedureName: 'dbo.usp_PPR_0018',
    description: 'Avance de metas fisicas del PP 0018 segun criterios de programacion 2026.',
    programCodes: ['18', '0018'],
  },
  {
    id: 'ppr_0024_prevencion_control_cancer',
    label: '0024 - Prevencion y control del cancer',
    procedureName: 'dbo.usp_PPR_0024',
    description: 'Avance de metas fisicas del PP 0024 segun criterios de programacion 2026.',
    programCodes: ['24', '0024'],
  },
  {
    id: 'ppr_0104_reduccion_mortalidad_emergencias',
    label: '0104 - Reduccion de mortalidad por emergencias y urgencias medicas',
    procedureName: 'dbo.usp_PPR_0104',
    description: 'Avance de metas fisicas del PP 0104 de emergencias y urgencias medicas.',
    programCodes: ['104', '0104'],
  },
  {
    id: 'ppr_1001_desarrollo_infantil_temprano',
    label: '1001 - Desarrollo infantil temprano',
    procedureName: 'dbo.usp_PPR_1001',
    description: 'Avance de metas fisicas del PPOR 1001 segun criterios de programacion 2026.',
    programCodes: ['1001'],
  },
  {
    id: 'ppr_0129_condiciones_secundarias',
    label: '0129 - Condiciones secundarias de salud',
    procedureName: 'dbo.usp_PPR_0129',
    description: 'Prevencion y manejo de condiciones secundarias de salud en personas con discapacidad.',
    programCodes: ['129', '0129'],
  },
  {
    id: 'ppr_0131_control_prevencion_salud_mental',
    label: '0131 - Control y prevencion en salud mental',
    procedureName: 'dbo.usp_PPR_0131',
    description: 'Avance de metas fisicas del PP 0131 de control y prevencion en salud mental.',
    programCodes: ['131', '0131'],
  },
  {
    id: 'ppr_9002_apnop',
    label: '9002 - APNOP / otros centros de costo',
    procedureName: 'dbo.usp_PPR_9002',
    description: 'Avance de metas fisicas del PP 9002/APNOP para actividades con soporte automatico; los centros manuales firman en submodulos separados.',
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

function periodLabel(year, month) {
  return `${MONTHS_ES[(month ?? 1) - 1] ?? '?'} ${year}`
}

function monthDateRange(year, month) {
  const start = new Date(Date.UTC(Number(year), Number(month) - 1, 1))
  const end = new Date(Date.UTC(Number(year), Number(month), 0))
  return {
    startDate: start.toISOString().slice(0, 10),
    endDate: end.toISOString().slice(0, 10),
  }
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

function normalizeProgramCode(value) {
  const normalized = String(value ?? '').trim().replace(/^0+/, '')
  return normalized || '0'
}

function pad2(value) {
  return String(value).padStart(2, '0')
}

function toIsoDate({ year, month, day }) {
  return `${year}-${pad2(month)}-${pad2(day)}`
}

function getBogotaDateTimeParts(referenceDate = new Date()) {
  const parts = new Intl.DateTimeFormat('en-US', {
    timeZone: PPR_PRELIMINARY_TIME_ZONE,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hourCycle: 'h23',
  }).formatToParts(referenceDate)

  const get = (type) => Number(parts.find((part) => part.type === type)?.value ?? 0)
  return {
    year: get('year'),
    month: get('month'),
    day: get('day'),
    hour: get('hour'),
    minute: get('minute'),
    second: get('second'),
  }
}

function addDays(dateParts, days) {
  const date = new Date(Date.UTC(dateParts.year, dateParts.month - 1, dateParts.day + days))
  return {
    year: date.getUTCFullYear(),
    month: date.getUTCMonth() + 1,
    day: date.getUTCDate(),
  }
}

function getWeekday(dateParts) {
  return new Date(Date.UTC(dateParts.year, dateParts.month - 1, dateParts.day)).getUTCDay()
}

function isBusinessDate(dateParts) {
  const day = getWeekday(dateParts)
  return day >= 1 && day <= 5
}

function getPreviousBusinessDate(dateParts) {
  let candidate = addDays(dateParts, -1)
  while (!isBusinessDate(candidate)) {
    candidate = addDays(candidate, -1)
  }
  return candidate
}

function getPprPreliminaryCutoff(referenceDate = new Date()) {
  const now = getBogotaDateTimeParts(referenceDate)
  const today = { year: now.year, month: now.month, day: now.day }
  const hasCurrentBusinessCutoff = isBusinessDate(today)
    && (now.hour > PPR_PRELIMINARY_CUTOFF_HOUR
      || (now.hour === PPR_PRELIMINARY_CUTOFF_HOUR && now.minute >= 0))
  const monthStart = { year: today.year, month: today.month, day: 1 }
  let cutoffDate = hasCurrentBusinessCutoff ? today : getPreviousBusinessDate(today)
  if (compareDateParts(cutoffDate, monthStart) < 0) {
    cutoffDate = monthStart
  }
  const cutoffDateSql = toIsoDate(cutoffDate)
  const daysInMonth = getDaysInMonth(cutoffDate.year, cutoffDate.month)

  return {
    cutoffAt: `${cutoffDateSql}T${pad2(PPR_PRELIMINARY_CUTOFF_HOUR)}:00:00-05:00`,
    cutoffDate: cutoffDateSql,
    cutoffLabel: `${WEEKDAYS_ES[getWeekday(cutoffDate)]} ${pad2(cutoffDate.day)}/${pad2(cutoffDate.month)} ${pad2(PPR_PRELIMINARY_CUTOFF_HOUR)}:00`,
    rangeStart: `${cutoffDate.year}-${pad2(cutoffDate.month)}-01`,
    rangeEnd: cutoffDateSql,
    year: cutoffDate.year,
    month: cutoffDate.month,
    cutoffDay: cutoffDate.day,
    daysInMonth,
    timeZone: PPR_PRELIMINARY_TIME_ZONE,
  }
}

function compareDateParts(a, b) {
  const aValue = (Number(a.year) * 10000) + (Number(a.month) * 100) + Number(a.day)
  const bValue = (Number(b.year) * 10000) + (Number(b.month) * 100) + Number(b.day)
  return aValue - bValue
}

function getDaysInMonth(year, month) {
  return new Date(Date.UTC(Number(year), Number(month), 0)).getUTCDate()
}

function getCutoffGoalFactor(cutoffInfo, year, month) {
  if (!cutoffInfo) return 1
  const cutoffYear = Number(cutoffInfo.year ?? String(cutoffInfo.rangeEnd ?? '').slice(0, 4))
  const cutoffMonth = Number(cutoffInfo.month ?? String(cutoffInfo.rangeEnd ?? '').slice(5, 7))
  if (cutoffYear !== Number(year) || cutoffMonth !== Number(month)) return 1
  const daysInMonth = Number(cutoffInfo.daysInMonth ?? getDaysInMonth(year, month))
  const cutoffDay = Math.min(
    Math.max(Number(cutoffInfo.cutoffDay ?? String(cutoffInfo.rangeEnd ?? '').slice(8, 10)) || 1, 1),
    daysInMonth,
  )
  return daysInMonth > 0 ? cutoffDay / daysInMonth : 1
}

function findPreliminarySourceForProgramCode(programCode) {
  const normalizedProgramCode = normalizeProgramCode(programCode)
  if (PPR_PRELIMINARY_MANUAL_ONLY_PROGRAM_CODES.has(normalizedProgramCode)) return null
  return PPR_IMPORT_SOURCES.find((source) => {
    return source.programCodes?.map(normalizeProgramCode).includes(normalizedProgramCode)
  }) ?? null
}

function matchSourceRowsToActivities(rawRows, activities) {
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

  const matchedRows = []
  const matchedKeys = new Set()
  const matchedNames = new Set()

  for (const activity of activities) {
    let sourceKey = activity.sourceKey
    let sourceValue = null

    if (activity.sourceKey && sourceTotalsByKey.has(activity.sourceKey)) {
      sourceValue = sourceTotalsByKey.get(activity.sourceKey)
      matchedKeys.add(activity.sourceKey)
    } else if (activity.sourceNameKey && sourceTotalsByName.has(activity.sourceNameKey)) {
      sourceValue = sourceTotalsByName.get(activity.sourceNameKey)
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

  const unmatchedSourceRows = Array.from(sourceTotalsByKey.entries())
    .filter(([sourceKey]) => !matchedKeys.has(sourceKey))
    .map(([sourceKey, sourceValue]) => ({ sourceKey, sourceValue: Number(sourceValue) }))
    .concat(Array.from(sourceTotalsByName.entries())
      .filter(([sourceNameKey]) => !matchedNames.has(sourceNameKey))
      .map(([sourceNameKey, sourceValue]) => ({
        sourceKey: sourceNameLabels.get(sourceNameKey)?.slice(0, 50) ?? sourceNameKey.slice(0, 50),
        sourceValue: Number(sourceValue),
      })))

  const manualActivities = activities
    .filter((activity) => {
      const hasKeyMatch = activity.sourceKey && sourceTotalsByKey.has(activity.sourceKey)
      const hasNameMatch = activity.sourceNameKey && sourceTotalsByName.has(activity.sourceNameKey)
      return !hasKeyMatch && !hasNameMatch
    })
    .map((activity) => ({
      activityId: activity.id,
      activityName: activity.name,
      sourceKey: activity.sourceKey,
    }))

  return {
    matchedRows,
    unmatchedSourceRows,
    manualActivities,
  }
}

async function ensurePprImportInfrastructure() {
  await executeProcedure('SP_APP_PPR_ENSURE_IMPORT_INFRASTRUCTURE', [], { timeoutMs: 120000 })
}

async function ensurePprPreliminaryInfrastructure() {
  if (!pprPreliminaryInfrastructurePromise) {
    pprPreliminaryInfrastructurePromise = ensurePprPreliminaryInfrastructureDirect().catch((error) => {
      pprPreliminaryInfrastructurePromise = null
      throw error
    })
  }
  await pprPreliminaryInfrastructurePromise
}

export async function getPeriodoActivo() {
  const rows = await executeProcedure('SP_PPR_PERIODO_ACTIVO', [])
  const r = rows[0]
  if (!r) return null
  return {
    id: Number(r.id),
    year: Number(r.year),
    month: Number(r.month),
    label: periodLabel(r.year, r.month),
    isOpen: Boolean(r.is_open),
    deadline: r.deadline ?? null,
  }
}

export async function getProgramasUsuario(employeeId) {
  await ensurePprActivityGroupInfrastructure()
  const rows = await executeProcedure('SP_PPR_PROGRAMAS_USUARIO', [
    { name: 'employee_id', type: sql.Int, value: Number(employeeId) },
  ])
  const programas = rows.map((r) => ({
    id: Number(r.id),
    code: String(r.code ?? ''),
    name: String(r.name ?? ''),
    totalActividades: Number(r.total_actividades ?? 0),
    conDatos: Number(r.con_datos ?? 0),
    sumLogrado: Number(r.sum_logrado ?? 0),
    sumMetaEsperada: Number(r.sum_meta_esperada ?? 0),
    sumMetaAnual: Number(r.sum_meta_anual ?? 0),
    mesesCompletos: Number(r.meses_completos ?? 0),
    activityGroups: getPprProgramActivityGroups(r.code),
    activityScope: getPprEmployeeActivityScopeGroups(r.code, employeeId),
  }))

  return programas
}

async function ensurePprActivityGroupInfrastructure() {
  if (!pprActivityGroupInfrastructurePromise) {
    pprActivityGroupInfrastructurePromise = ensurePprActivityGroupInfrastructureDirect().catch((error) => {
      pprActivityGroupInfrastructurePromise = null
      throw error
    })
  }
  await pprActivityGroupInfrastructurePromise
}

async function ensurePprActivityGroupInfrastructureDirect() {
  const pool = await getSqlPool('general')
  await pool.request().batch(`
    IF COL_LENGTH('dbo.ppr_activities', 'activity_group_code') IS NULL
      ALTER TABLE dbo.ppr_activities ADD activity_group_code NVARCHAR(30) NULL;
  `)
}

async function ensurePprPreliminaryInfrastructureDirect() {
  const pool = await getSqlPool('general')
  await pool.request().batch(`
    IF OBJECT_ID('dbo.ppr_preliminary_runs', 'U') IS NULL
    BEGIN
      CREATE TABLE dbo.ppr_preliminary_runs (
        id               INT IDENTITY(1,1) PRIMARY KEY,
        program_id       INT NOT NULL,
        source_id        NVARCHAR(80) NOT NULL,
        source_label     NVARCHAR(200) NOT NULL,
        source_procedure NVARCHAR(200) NOT NULL,
        range_start      DATE NOT NULL,
        range_end        DATE NOT NULL,
        cutoff_at        DATETIMEOFFSET NOT NULL,
        cutoff_label     NVARCHAR(80) NOT NULL,
        started_at       DATETIME2 NOT NULL DEFAULT SYSDATETIME(),
        completed_at     DATETIME2 NULL,
        status           NVARCHAR(30) NOT NULL DEFAULT 'running',
        rows_read        INT NOT NULL DEFAULT 0,
        rows_matched     INT NOT NULL DEFAULT 0,
        rows_unmatched   INT NOT NULL DEFAULT 0,
        unmatched_json   NVARCHAR(MAX) NULL,
        manual_json      NVARCHAR(MAX) NULL,
        error_message    NVARCHAR(MAX) NULL
      );
    END;

    IF OBJECT_ID('dbo.ppr_preliminary_values', 'U') IS NULL
    BEGIN
      CREATE TABLE dbo.ppr_preliminary_values (
        id           INT IDENTITY(1,1) PRIMARY KEY,
        run_id       INT NOT NULL,
        program_id   INT NOT NULL,
        activity_id  INT NOT NULL,
        source_key   NVARCHAR(80) NULL,
        source_value DECIMAL(18,2) NOT NULL,
        loaded_at    DATETIME2 NOT NULL DEFAULT SYSDATETIME()
      );
    END;

    IF COL_LENGTH('dbo.ppr_preliminary_runs', 'unmatched_json') IS NULL
      ALTER TABLE dbo.ppr_preliminary_runs ADD unmatched_json NVARCHAR(MAX) NULL;

    IF COL_LENGTH('dbo.ppr_preliminary_runs', 'manual_json') IS NULL
      ALTER TABLE dbo.ppr_preliminary_runs ADD manual_json NVARCHAR(MAX) NULL;

    IF NOT EXISTS (
      SELECT 1
      FROM sys.indexes
      WHERE name = 'IX_ppr_preliminary_runs_program_cutoff'
        AND object_id = OBJECT_ID('dbo.ppr_preliminary_runs')
    )
      CREATE INDEX IX_ppr_preliminary_runs_program_cutoff
        ON dbo.ppr_preliminary_runs(program_id, source_id, cutoff_at DESC, status);

    IF NOT EXISTS (
      SELECT 1
      FROM sys.indexes
      WHERE name = 'IX_ppr_preliminary_values_run_activity'
        AND object_id = OBJECT_ID('dbo.ppr_preliminary_values')
    )
      CREATE INDEX IX_ppr_preliminary_values_run_activity
        ON dbo.ppr_preliminary_values(run_id, activity_id);
  `)
}

async function getActivityGroupByActivityId(programId) {
  try {
    const groupRows = await executeProcedure('SP_APP_PPR_ACTIVITY_GROUPS_BY_PROGRAM', [
      { name: 'program_id', type: sql.Int, value: Number(programId) },
    ])
    return new Map(groupRows.map((row) => [
      Number(row.id),
      row.activity_group_code == null ? null : String(row.activity_group_code),
    ]))
  } catch (error) {
    logger.warn({
      event: 'ppr:activity-groups:fallback',
      programId: Number(programId),
      message: error instanceof Error ? error.message : String(error),
    })
    return new Map()
  }
}

async function getScopedProgramMetrics({ employeeId, programId, programCode, mesesCompletos }) {
  await ensurePprActivityGroupInfrastructure()
  const metricRows = await executeProcedure('SP_APP_PPR_SCOPED_PROGRAM_METRICS', [
    { name: 'program_id', type: sql.Int, value: Number(programId) },
  ])

  const scopedRows = filterPprActivitiesForEmployee(metricRows, {
    programCodeKey: 'program_code',
    activityNameKey: 'activity_name',
    employeeId,
  })

  if (scopedRows.length === metricRows.length) return null

  const meses = Number(metricRows[0]?.active_month ?? 1) > 1
    ? Number(metricRows[0].active_month) - 1
    : Number(mesesCompletos ?? 0)

  return {
    totalActividades: scopedRows.length,
    conDatos: scopedRows.reduce((sum, row) => sum + Number(row.tiene_dato ?? 0), 0),
    sumLogrado: scopedRows.reduce((sum, row) => sum + Number(row.logrado ?? 0), 0),
    sumMetaEsperada: scopedRows.reduce(
      (sum, row) => sum + (Number(row.annual_goal ?? 0) * meses / 12),
      0,
    ),
    sumMetaAnual: scopedRows.reduce((sum, row) => sum + Number(row.annual_goal ?? 0), 0),
    mesesCompletos: meses,
  }
}

export async function getActividadesPrograma({ programaId, periodoId, employeeId }) {
  await ensurePprActivityGroupInfrastructure()
  const pool = await getSqlPool('general')
  const result = await pool.request()
    .input('program_id', sql.Int, Number(programaId))
    .input('period_id', sql.Int, Number(periodoId))
    .query(`
      SELECT
        a.id,
        a.code,
        a.name,
        a.unit,
        a.annual_goal,
        a.sort_order,
        a.activity_group_code,
        p.code AS program_code,
        mv.value,
        mv.notes,
        mv.value_source,
        mv.source_key,
        mv.source_value,
        mv.loaded_at,
        mv.validated_at,
        mv.validation_status
      FROM dbo.ppr_activities a
      INNER JOIN dbo.ppr_programs p
        ON p.id = a.program_id
      LEFT JOIN dbo.ppr_monthly_values mv
        ON mv.activity_id = a.id
        AND mv.period_id = @period_id
      WHERE a.program_id = @program_id
        AND ISNULL(a.is_active, 1) = 1
      ORDER BY a.sort_order, a.id;
    `)
  const rows = result.recordset
  const programCode = String(rows[0]?.program_code ?? '')
  const groupByActivityId = await getActivityGroupByActivityId(programaId)
  const signatureResult = await pool.request()
    .input('employee_id', sql.Int, Number(employeeId))
    .input('period_id', sql.Int, Number(periodoId))
    .input('program_id', sql.Int, Number(programaId))
    .query(`
      SELECT TOP 1 signed_at
      FROM dbo.ppr_signatures
      WHERE employee_id = @employee_id
        AND period_id = @period_id
        AND is_valid = 1
        AND (program_id = @program_id OR program_id IS NULL)
      ORDER BY CASE WHEN program_id = @program_id THEN 0 ELSE 1 END, signed_at DESC;
    `)
  const signedAt = signatureResult.recordset[0]?.signed_at ?? null
  const activityRows = rows.map((row) => ({
    ...row,
    program_code: programCode,
    activity_group_code: row.activity_group_code ?? groupByActivityId.get(Number(row.id)) ?? null,
  }))
  return activityRows.map((r) => {
    const canEdit = canPprEmployeeEditActivity({
      programCode,
      activityName: r.name,
      activityGroupCode: r.activity_group_code,
      employeeId,
    })
    return {
      id: Number(r.id),
      code: String(r.code ?? ''),
      name: String(r.name ?? ''),
      activityGroup: resolvePprActivityGroup(programCode, r.name, r.activity_group_code),
      canEdit,
      unit: String(r.unit ?? ''),
      annualGoal: r.annual_goal != null ? Number(r.annual_goal) : null,
      sortOrder: Number(r.sort_order ?? 0),
      value: r.value != null ? Number(r.value) : null,
      notes: String(r.notes ?? ''),
      signed: Boolean(signedAt),
      valueSource: String(r.value_source ?? (r.value != null ? 'manual' : 'manual')),
      sourceKey: r.source_key != null ? String(r.source_key) : null,
      sourceValue: r.source_value != null ? Number(r.source_value) : null,
      loadedAt: r.loaded_at ?? null,
      validatedAt: r.validated_at ?? null,
      validationStatus: String(r.validation_status ?? 'pending'),
    }
  }).filter((activity) => activity.canEdit)
}

async function ensureCanEditPprActivity({ activityId, employeeId }) {
  await ensurePprActivityGroupInfrastructure()
  const pool = await getSqlPool('general')
  const result = await pool.request()
    .input('activity_id', sql.Int, Number(activityId))
    .query(`
      SELECT
        p.code AS program_code,
        a.name AS activity_name,
        a.activity_group_code
      FROM dbo.ppr_activities a
      INNER JOIN dbo.ppr_programs p
        ON p.id = a.program_id
      WHERE a.id = @activity_id
        AND ISNULL(a.is_active, 1) = 1;
    `)
  const row = result.recordset[0]
  if (!row) {
    const error = new Error('La actividad PPR no existe o no esta activa.')
    error.code = 'PPR_ACTIVITY_NOT_FOUND'
    throw error
  }
  if (!canPprEmployeeEditActivity({
    programCode: row.program_code,
    activityName: row.activity_name,
    activityGroupCode: row.activity_group_code,
    employeeId,
  })) {
    const error = new Error('No tiene permiso para registrar o validar esta actividad PPR.')
    error.code = 'PPR_ACTIVITY_FORBIDDEN'
    throw error
  }
}

export async function guardarValor({ activityId, periodId, employeeId, value, notes }) {
  await ensureCanEditPprActivity({ activityId, employeeId })
  await executeProcedure('SP_APP_PPR_GUARDAR_VALOR', [
    { name: 'activity_id', type: sql.Int, value: Number(activityId) },
    { name: 'period_id', type: sql.Int, value: Number(periodId) },
    { name: 'employee_id', type: sql.Int, value: Number(employeeId) },
    { name: 'value', type: sql.Decimal(18, 2), value: Number(value) },
    { name: 'notes', type: sql.NVarChar(500), value: notes ?? null },
  ])
}

export async function validarValor({ activityId, periodId, employeeId }) {
  await ensureCanEditPprActivity({ activityId, employeeId })
  const rows = await executeProcedure('SP_APP_PPR_VALIDAR_VALOR', [
    { name: 'activity_id', type: sql.Int, value: Number(activityId) },
    { name: 'period_id', type: sql.Int, value: Number(periodId) },
    { name: 'employee_id', type: sql.Int, value: Number(employeeId) },
  ])
  const row = rows[0]
  if (!row || Number(row.affected ?? 0) === 0) {
    const error = new Error('No se pudo validar la actividad porque no tiene valor registrado.')
    error.code = 'PPR_VALIDATE_EMPTY'
    throw error
  }
  return row.validated_at ?? new Date().toISOString()
}

export async function getResumenValidacion(employeeId, periodId, programId = null) {
  await ensurePprActivityGroupInfrastructure()
  const rows = await executeProcedure('SP_APP_PPR_RESUMEN_VALIDACION', [
    { name: 'employee_id', type: sql.Int, value: Number(employeeId) },
    { name: 'period_id', type: sql.Int, value: Number(periodId) },
    { name: 'program_id', type: sql.Int, value: programId == null ? null : Number(programId) },
  ])

  const scopedRows = filterPprActivitiesForEmployee(rows, {
    programCodeKey: 'program_code',
    activityNameKey: 'activity_name',
    employeeId,
  })
  const uniqueRows = Array.from(new Map(scopedRows.map((row) => [Number(row.activity_id), row])).values())
  const total = uniqueRows.length
  const validated = uniqueRows.filter((row) => row.validation_status === 'validated').length

  return {
    total,
    withValue: uniqueRows.filter((row) => row.value != null).length,
    validated,
    pending: Math.max(total - validated, 0),
    imported: uniqueRows.filter((row) => row.value_source === 'source').length,
    edited: uniqueRows.filter((row) => row.value_source === 'manual_override').length,
    manual: uniqueRows.filter((row) => row.value_source == null || row.value_source === 'manual').length,
    canSign: total > 0 && total === validated,
  }
}

async function firmarPeriodoForTesting({ employeeId, periodId }) {
  await ensurePprImportInfrastructure()
  const rows = await executeProcedure('SP_APP_PPR_FIRMAR_PERIODO_TEST', [
    { name: 'employee_id', type: sql.Int, value: Number(employeeId) },
    { name: 'period_id', type: sql.Int, value: Number(periodId) },
  ])
  return rows[0]?.signed_at ?? new Date().toISOString()
}

export async function firmarPeriodo({ employeeId, periodId, programId = null, forceForTesting = false }) {
  const resumen = await getResumenValidacion(employeeId, periodId, programId)
  if (!resumen.canSign) {
    if (forceForTesting) {
      return firmarPeriodoForTesting({ employeeId, periodId })
    }
    const error = new Error('Aún hay actividades pendientes de validar.')
    error.code = 'PPR_VALIDATION_PENDING'
    error.summary = resumen
    throw error
  }
  const rows = await executeProcedure('SP_PPR_FIRMAR_PERIODO', [
    { name: 'employee_id', type: sql.Int, value: Number(employeeId) },
    { name: 'period_id', type: sql.Int, value: Number(periodId) },
  ])
  return rows[0]?.signed_at ?? new Date().toISOString()
}

export function getPprImportSources() {
  return PPR_IMPORT_SOURCES
}

async function getProgramActivitiesForImport(programId) {
  await ensurePprActivityGroupInfrastructure()
  const pool = await getSqlPool('general')
  const result = await pool.request()
    .input('program_id', sql.Int, Number(programId))
    .query(`
      SELECT
        a.id,
        a.code,
        a.name,
        a.unit,
        a.annual_goal,
        a.sort_order,
        a.activity_group_code,
        p.code AS program_code
      FROM dbo.ppr_activities a
      INNER JOIN dbo.ppr_programs p
        ON p.id = a.program_id
      WHERE a.program_id = @program_id
        AND ISNULL(a.is_active, 1) = 1
      ORDER BY a.sort_order, a.id;
    `)
  const rows = result.recordset
  return rows.map((r) => ({
    id: Number(r.id),
    code: String(r.code ?? ''),
    name: String(r.name ?? ''),
    unit: String(r.unit ?? ''),
    annualGoal: r.annual_goal != null ? Number(r.annual_goal) : null,
    sortOrder: Number(r.sort_order ?? 0),
    activityGroupCode: r.activity_group_code == null ? null : String(r.activity_group_code),
    programCode: String(r.program_code ?? ''),
    sourceKey: extractActivitySourceKey(r.name) ?? String(r.code ?? '').trim() ?? null,
    sourceNameKey: normalizeActivityName(r.name),
  }))
}

async function ensureProgramPeriodNotSigned(programId, periodId) {
  const rows = await executeProcedure('SP_APP_PPR_PROGRAM_EMPLOYEES', [
    { name: 'program_id', type: sql.Int, value: Number(programId) },
  ])

  for (const row of rows) {
    const periodos = await getPeriodosUsuario(Number(row.employee_id))
    const periodo = periodos.find((p) => p.id === Number(periodId))
    if (periodo?.isSigned) {
      const error = new Error('No se puede recargar un período que ya fue firmado por un coordinador.')
      error.code = 'PPR_PERIOD_SIGNED'
      throw error
    }
  }
}

async function ensureSourceMatchesProgram(source, programId) {
  if (!Array.isArray(source.programCodes) || source.programCodes.length === 0) return

  const rows = await executeProcedure('SP_APP_PPR_PROGRAM_CODE', [
    { name: 'program_id', type: sql.Int, value: Number(programId) },
  ])

  const programCode = normalizeProgramCode(rows[0]?.code)
  const allowedCodes = source.programCodes.map(normalizeProgramCode)
  if (!allowedCodes.includes(programCode)) {
    const error = new Error('La fuente seleccionada no corresponde al programa PPR elegido.')
    error.code = 'PPR_SOURCE_PROGRAM_MISMATCH'
    throw error
  }
}

async function applyImportRows({ periodId, programId, source, adminId, rowsRead, matchedRows, unmatchedSourceRows }) {
  const unmatchedJson = JSON.stringify(unmatchedSourceRows)
  const runRows = await executeProcedure('SP_APP_PPR_IMPORT_RUN_START', [
    { name: 'period_id', type: sql.Int, value: Number(periodId) },
    { name: 'program_id', type: sql.Int, value: Number(programId) },
    { name: 'source_id', type: sql.NVarChar(80), value: source.id },
    { name: 'source_label', type: sql.NVarChar(200), value: source.label },
    { name: 'source_procedure', type: sql.NVarChar(200), value: source.procedureName },
    { name: 'admin_id', type: sql.Int, value: Number(adminId) },
    { name: 'rows_read', type: sql.Int, value: Number(rowsRead) },
    { name: 'rows_matched', type: sql.Int, value: matchedRows.length },
    { name: 'rows_unmatched', type: sql.Int, value: unmatchedSourceRows.length },
    { name: 'unmatched_json', type: sql.NVarChar(sql.MAX), value: unmatchedJson },
  ], { timeoutMs: 120000 })

  const runId = Number(runRows[0]?.id ?? 0)
  let rowsUpdated = 0

  for (const row of matchedRows) {
    const result = await executeProcedure('SP_APP_PPR_IMPORT_VALUE_UPSERT', [
      { name: 'activity_id', type: sql.Int, value: Number(row.activityId) },
      { name: 'period_id', type: sql.Int, value: Number(periodId) },
      { name: 'admin_id', type: sql.Int, value: Number(adminId) },
      { name: 'source_key', type: sql.NVarChar(50), value: String(row.sourceKey) },
      { name: 'source_value', type: sql.Decimal(18, 2), value: Number(row.sourceValue) },
      { name: 'run_id', type: sql.Int, value: runId },
    ], { timeoutMs: 120000 })
    rowsUpdated += Number(result[0]?.affected ?? 0)
  }

  const completedRows = await executeProcedure('SP_APP_PPR_IMPORT_RUN_COMPLETE', [
    { name: 'run_id', type: sql.Int, value: runId },
    { name: 'rows_updated', type: sql.Int, value: rowsUpdated },
  ], { timeoutMs: 120000 })

  return completedRows[0]
}

export async function runPprImport({ programId, sourceId, adminId }) {
  const source = PPR_IMPORT_SOURCES.find((item) => item.id === sourceId)
  if (!source) {
    const error = new Error('Fuente de carga no registrada.')
    error.code = 'PPR_SOURCE_NOT_FOUND'
    throw error
  }

  await ensurePprImportInfrastructure()

  const periodo = await getPeriodoActivo()
  if (!periodo?.isOpen) {
    const error = new Error('No hay un período activo abierto para cargar.')
    error.code = 'PPR_NO_OPEN_PERIOD'
    throw error
  }

  await ensureSourceMatchesProgram(source, programId)
  await ensureProgramPeriodNotSigned(programId, periodo.id)

  const { startDate, endDate } = monthDateRange(periodo.year, periodo.month)
  const rawRows = await executeProcedure(source.procedureName, [
    { name: 'FechaInicio', type: sql.Date, value: startDate },
    { name: 'FechaFin', type: sql.Date, value: endDate },
  ], { timeoutMs: 120000 })

  const activities = await getProgramActivitiesForImport(programId)
  const { matchedRows, unmatchedSourceRows, manualActivities } = matchSourceRowsToActivities(rawRows, activities)

  const run = await applyImportRows({
    periodId: periodo.id,
    programId,
    source,
    adminId,
    rowsRead: rawRows.length,
    matchedRows,
    unmatchedSourceRows,
  })

  return {
    runId: Number(run.id),
    periodId: Number(run.period_id),
    periodLabel: periodo.label,
    programId: Number(run.program_id),
    sourceId: String(run.source_id),
    sourceLabel: String(run.source_label),
    startedAt: run.started_at,
    completedAt: run.completed_at,
    rowsRead: Number(run.rows_read ?? rawRows.length),
    rowsMatched: Number(run.rows_matched ?? matchedRows.length),
    rowsUpdated: Number(run.rows_updated ?? matchedRows.length),
    rowsUnmatched: Number(run.rows_unmatched ?? unmatchedSourceRows.length),
    unmatchedSourceRows,
    manualActivities,
  }
}

async function getAccessiblePprProgram(programId, employeeId) {
  await ensurePprActivityGroupInfrastructure()
  let isAdmin = Number(employeeId) === 5713
  try {
    isAdmin = isAdmin || await verificarAdmin(employeeId)
  } catch (error) {
    logger.warn({
      event: 'ppr:accessible-program:admin-check-fallback',
      employeeId: Number(employeeId),
      message: error instanceof Error ? error.message : String(error),
    })
  }

  const pool = await getSqlPool('general')
  const result = await pool.request()
    .input('program_id', sql.Int, Number(programId))
    .input('employee_id', sql.Int, Number(employeeId))
    .input('is_admin', sql.Bit, isAdmin ? 1 : 0)
    .query(`
      SELECT TOP 1
        p.id,
        p.code,
        p.name
      FROM dbo.ppr_programs p
      WHERE p.id = @program_id
        AND (
          @is_admin = 1
          OR EXISTS (
            SELECT 1
            FROM dbo.ppr_user_programs up
            WHERE up.program_id = p.id
              AND up.employee_id = @employee_id
              AND up.is_active = 1
          )
        );
    `)

  const program = result.recordset[0]
  if (!program) {
    const error = new Error('No tiene acceso al programa PPR solicitado.')
    error.code = 'PPR_PROGRAM_FORBIDDEN'
    throw error
  }

  return {
    id: Number(program.id),
    code: String(program.code ?? ''),
    name: String(program.name ?? ''),
  }
}

function scopedImportActivitiesForEmployee(activities, program, employeeId) {
  return filterPprActivitiesForEmployee(activities.map((activity) => ({
    ...activity,
    program_code: activity.programCode || program.code,
    activity_name: activity.name,
    activity_group_code: activity.activityGroupCode,
  })), {
    programCodeKey: 'program_code',
    activityNameKey: 'activity_name',
    employeeId,
  })
}

function buildPreliminarPayload({ program, source, cutoff, activities, valueRows, run }) {
  const valueByActivityId = new Map(valueRows.map((row) => [Number(row.activity_id ?? row.activityId), row]))
  const matchedRows = valueRows.map((row) => ({
    activityId: Number(row.activity_id ?? row.activityId),
    sourceValue: Number(row.source_value ?? row.sourceValue ?? 0),
  }))
  const totalValue = matchedRows.reduce((sum, row) => sum + Number(row.sourceValue ?? 0), 0)
  const monthlyGoalFull = activities.reduce((sum, activity) => (
    sum + (activity.annualGoal != null ? Number(activity.annualGoal) / 12 : 0)
  ), 0)
  const cutoffGoalFactor = getCutoffGoalFactor(cutoff, cutoff.year, cutoff.month)
  const monthlyGoal = monthlyGoalFull * cutoffGoalFactor

  const parseJson = (value, fallback) => {
    try {
      return value ? JSON.parse(String(value)) : fallback
    } catch {
      return fallback
    }
  }

  const items = activities
    .map((activity) => {
      const matched = valueByActivityId.get(activity.id)
      const activityMonthlyGoalFull = activity.annualGoal != null ? Number(activity.annualGoal) / 12 : null
      const activityMonthlyGoal = activityMonthlyGoalFull != null
        ? activityMonthlyGoalFull * cutoffGoalFactor
        : null
      const value = matched ? Number(matched.source_value ?? matched.sourceValue ?? 0) : null
      return {
        activityId: activity.id,
        code: activity.code,
        name: activity.name,
        unit: activity.unit,
        annualGoal: activity.annualGoal,
        monthlyGoal: activityMonthlyGoal,
        monthlyGoalFull: activityMonthlyGoalFull,
        monthlyGoalPct: activityMonthlyGoal && activityMonthlyGoal > 0 && value != null
          ? Math.round((value / activityMonthlyGoal) * 100)
          : null,
        sourceKey: matched?.source_key ?? matched?.sourceKey ?? activity.sourceKey ?? null,
        value,
      }
    })
    .filter((activity) => activity.value != null)
    .sort((a, b) => Number(b.value ?? 0) - Number(a.value ?? 0))

  return {
    programId: Number(program.id),
    programCode: String(program.code ?? ''),
    programName: String(program.name ?? ''),
    sourceId: source.id,
    sourceLabel: source.label,
    isPreliminary: true,
    generatedAt: run?.completed_at ?? run?.completedAt ?? new Date().toISOString(),
    cutoffAt: cutoff.cutoffAt,
    cutoffLabel: cutoff.cutoffLabel,
    timeZone: cutoff.timeZone,
    rangeStart: cutoff.rangeStart,
    rangeEnd: cutoff.rangeEnd,
    totalActivities: activities.length,
    rowsRead: Number(run?.rows_read ?? run?.rowsRead ?? 0),
    rowsMatched: Number(run?.rows_matched ?? run?.rowsMatched ?? valueRows.length),
    rowsUnmatched: Number(run?.rows_unmatched ?? run?.rowsUnmatched ?? 0),
    totalValue,
    monthlyGoal,
    monthlyGoalFull,
    cutoffGoalFactor,
    cutoffDay: cutoff.cutoffDay,
    daysInMonth: cutoff.daysInMonth,
    monthlyGoalPct: monthlyGoal > 0 ? Math.round((totalValue / monthlyGoal) * 100) : null,
    items,
    unmatchedSourceRows: parseJson(run?.unmatched_json ?? run?.unmatchedJson, []).slice(0, 30),
    manualActivities: parseJson(run?.manual_json ?? run?.manualJson, []),
  }
}

async function readPprPreliminaryCache({ program, source, cutoff, employeeId, activities = null }) {
  await ensurePprPreliminaryInfrastructure()
  const pool = await getSqlPool('general')
  const runResult = await pool.request()
    .input('program_id', sql.Int, Number(program.id))
    .input('source_id', sql.NVarChar(80), source.id)
    .input('cutoff_at', sql.NVarChar(40), cutoff.cutoffAt)
    .query(`
      SELECT TOP 1
        id,
        program_id,
        source_id,
        source_label,
        source_procedure,
        range_start,
        range_end,
        cutoff_at,
        cutoff_label,
        started_at,
        completed_at,
        status,
        rows_read,
        rows_matched,
        rows_unmatched,
        unmatched_json,
        manual_json
      FROM dbo.ppr_preliminary_runs
      WHERE program_id = @program_id
        AND source_id = @source_id
        AND cutoff_at = CONVERT(DATETIMEOFFSET, @cutoff_at)
        AND status = 'completed'
      ORDER BY completed_at DESC, id DESC;
    `)

  const run = runResult.recordset[0]
  if (!run) return null

  const scopedActivities = activities ?? scopedImportActivitiesForEmployee(
    await getProgramActivitiesForImport(program.id),
    program,
    employeeId,
  )
  const valuesResult = await pool.request()
    .input('run_id', sql.Int, Number(run.id))
    .query(`
      SELECT
        activity_id,
        source_key,
        source_value
      FROM dbo.ppr_preliminary_values
      WHERE run_id = @run_id;
    `)

  return buildPreliminarPayload({
    program,
    source,
    cutoff,
    activities: scopedActivities,
    valueRows: valuesResult.recordset,
    run,
  })
}

async function refreshPprPreliminaryCache({ program, source, cutoff, employeeId }) {
  await ensurePprPreliminaryInfrastructure()
  await ensureSourceMatchesProgram(source, program.id)

  const rawRows = await executeProcedure(source.procedureName, [
    { name: 'FechaInicio', type: sql.Date, value: cutoff.rangeStart },
    { name: 'FechaFin', type: sql.Date, value: cutoff.rangeEnd },
  ], { timeoutMs: 120000 })

  const activities = scopedImportActivitiesForEmployee(
    await getProgramActivitiesForImport(program.id),
    program,
    employeeId,
  )
  const { matchedRows, unmatchedSourceRows, manualActivities } = matchSourceRowsToActivities(rawRows, activities)
  const runRows = await executeProcedure('SP_APP_PPR_PRELIMINARY_RUN_CREATE', [
    { name: 'program_id', type: sql.Int, value: Number(program.id) },
    { name: 'source_id', type: sql.NVarChar(80), value: source.id },
    { name: 'source_label', type: sql.NVarChar(200), value: source.label },
    { name: 'source_procedure', type: sql.NVarChar(200), value: source.procedureName },
    { name: 'range_start', type: sql.Date, value: cutoff.rangeStart },
    { name: 'range_end', type: sql.Date, value: cutoff.rangeEnd },
    { name: 'cutoff_at', type: sql.NVarChar(40), value: cutoff.cutoffAt },
    { name: 'cutoff_label', type: sql.NVarChar(80), value: cutoff.cutoffLabel },
    { name: 'rows_read', type: sql.Int, value: rawRows.length },
    { name: 'rows_matched', type: sql.Int, value: matchedRows.length },
    { name: 'rows_unmatched', type: sql.Int, value: unmatchedSourceRows.length },
    { name: 'unmatched_json', type: sql.NVarChar(sql.MAX), value: JSON.stringify(unmatchedSourceRows) },
    { name: 'manual_json', type: sql.NVarChar(sql.MAX), value: JSON.stringify(manualActivities) },
  ], { timeoutMs: 120000 })

  const runId = Number(runRows[0]?.id ?? 0)
  for (const row of matchedRows) {
    await executeProcedure('SP_APP_PPR_PRELIMINARY_VALUE_INSERT', [
      { name: 'run_id', type: sql.Int, value: runId },
      { name: 'program_id', type: sql.Int, value: Number(program.id) },
      { name: 'activity_id', type: sql.Int, value: Number(row.activityId) },
      { name: 'source_key', type: sql.NVarChar(80), value: row.sourceKey == null ? null : String(row.sourceKey) },
      { name: 'source_value', type: sql.Decimal(18, 2), value: Number(row.sourceValue ?? 0) },
    ], { timeoutMs: 120000 })
  }

  return readPprPreliminaryCache({ program, source, cutoff, employeeId })
}

export async function refreshProgramaPreliminar(programId, employeeId) {
  const program = await getAccessiblePprProgram(programId, employeeId)
  const source = findPreliminarySourceForProgramCode(program.code)
  if (!source) {
    const error = new Error('Este programa aun no tiene consulta preliminar diaria configurada.')
    error.code = 'PPR_PRELIMINARY_SOURCE_NOT_FOUND'
    throw error
  }
  const cutoff = getPprPreliminaryCutoff()
  return refreshPprPreliminaryCache({ program, source, cutoff, employeeId })
}

export async function getProgramaPreliminar(programId, employeeId, { refreshIfMissing = true } = {}) {
  const program = await getAccessiblePprProgram(programId, employeeId)
  const source = findPreliminarySourceForProgramCode(program.code)
  if (!source) {
    const error = new Error('Este programa aun no tiene consulta preliminar diaria configurada.')
    error.code = 'PPR_PRELIMINARY_SOURCE_NOT_FOUND'
    throw error
  }

  const cutoff = getPprPreliminaryCutoff()
  const cached = await readPprPreliminaryCache({ program, source, cutoff, employeeId })
  if (cached || !refreshIfMissing) return cached
  return refreshPprPreliminaryCache({ program, source, cutoff, employeeId })
}

function monthlyActivityStatus(value, monthlyGoal) {
  if (value == null) return 'sin_dato'
  if (!monthlyGoal || monthlyGoal <= 0) return value > 0 ? 'con_avance' : 'sin_meta'
  const pct = Math.round((Number(value) / Number(monthlyGoal)) * 100)
  if (pct >= 100) return 'en_meta'
  if (pct >= 80) return 'seguimiento'
  return 'critico'
}

async function getPprPeriodByYearMonth(year, month) {
  const pool = await getSqlPool('general')
  const result = await pool.request()
    .input('year', sql.Int, Number(year))
    .input('month', sql.Int, Number(month))
    .query(`
      SELECT TOP 1
        id,
        is_open
      FROM dbo.ppr_periods
      WHERE [year] = @year
        AND [month] = @month;
    `)
  return result.recordset[0] ?? null
}

async function getPprMonthlyValuesByPeriod({ periodId, programId }) {
  if (!periodId) return []
  const pool = await getSqlPool('general')
  const result = await pool.request()
    .input('period_id', sql.Int, Number(periodId))
    .input('program_id', sql.Int, Number(programId))
    .query(`
      SELECT
        mv.activity_id,
        mv.value
      FROM dbo.ppr_monthly_values mv
      INNER JOIN dbo.ppr_activities a
        ON a.id = mv.activity_id
        AND a.program_id = @program_id
      WHERE mv.period_id = @period_id;
    `)
  return result.recordset
}

function buildMonthlyEvaluationPayload({
  program,
  year,
  month,
  sourceMode,
  periodId,
  periodIsOpen,
  cutoffInfo = null,
  activities,
  values,
}) {
  const valueByActivityId = new Map(values.map((row) => [Number(row.activityId ?? row.activity_id), row]))
  const pendingAutomationActivityIds = sourceMode === 'preliminary'
    ? new Set((cutoffInfo?.manualActivities ?? []).map((activity) => Number(activity.activityId)))
    : new Set()
  const cutoffGoalFactor = sourceMode === 'preliminary'
    ? getCutoffGoalFactor(cutoffInfo, year, month)
    : 1
  const items = activities.map((activity) => {
    const row = valueByActivityId.get(activity.id)
    const value = row ? Number(row.value ?? row.source_value ?? row.sourceValue ?? 0) : null
    const monthlyGoalFull = activity.annualGoal != null ? Number(activity.annualGoal) / 12 : null
    const monthlyGoal = monthlyGoalFull != null ? monthlyGoalFull * cutoffGoalFactor : null
    const monthlyGoalPct = monthlyGoal && monthlyGoal > 0 && value != null
      ? Math.round((value / monthlyGoal) * 100)
      : null
    const isPendingAutomation = sourceMode === 'preliminary'
      && value == null
      && pendingAutomationActivityIds.has(Number(activity.id))
    return {
      activityId: activity.id,
      code: activity.code,
      name: activity.name,
      unit: activity.unit,
      annualGoal: activity.annualGoal,
      monthlyGoal,
      monthlyGoalFull,
      value,
      monthlyGoalPct,
      status: isPendingAutomation ? 'pendiente_automatizacion' : monthlyActivityStatus(value, monthlyGoal),
      isPendingAutomation,
      sourceKey: row?.sourceKey ?? row?.source_key ?? activity.sourceKey ?? null,
    }
  }).sort((a, b) => {
    const order = {
      critico: 0,
      seguimiento: 1,
      pendiente_automatizacion: 2,
      sin_dato: 3,
      con_avance: 4,
      sin_meta: 5,
      en_meta: 6,
    }
    return (order[a.status] ?? 9) - (order[b.status] ?? 9)
      || Number(a.monthlyGoalPct ?? -1) - Number(b.monthlyGoalPct ?? -1)
  })

  const totalValue = items.reduce((sum, item) => sum + Number(item.value ?? 0), 0)
  const monthlyGoal = items.reduce((sum, item) => sum + Number(item.monthlyGoal ?? 0), 0)
  const monthlyGoalFull = items.reduce((sum, item) => sum + Number(item.monthlyGoalFull ?? 0), 0)
  const withValue = items.filter((item) => item.value != null).length
  const statusCounts = items.reduce((acc, item) => {
    acc[item.status] = (acc[item.status] ?? 0) + 1
    return acc
  }, {})

  return {
    programId: Number(program.id),
    programCode: String(program.code ?? ''),
    programName: String(program.name ?? ''),
    year: Number(year),
    month: Number(month),
    monthLabel: periodLabel(year, month),
    sourceMode,
    periodId,
    periodIsOpen,
    isPreliminary: sourceMode === 'preliminary',
    cutoffAt: cutoffInfo?.cutoffAt ?? null,
    cutoffLabel: cutoffInfo?.cutoffLabel ?? null,
    rangeStart: cutoffInfo?.rangeStart ?? null,
    rangeEnd: cutoffInfo?.rangeEnd ?? null,
    totalActivities: items.length,
    withValue,
    totalValue,
    monthlyGoal,
    monthlyGoalFull,
    cutoffGoalFactor,
    cutoffDay: sourceMode === 'preliminary' ? cutoffInfo?.cutoffDay ?? null : null,
    daysInMonth: sourceMode === 'preliminary' ? cutoffInfo?.daysInMonth ?? null : null,
    monthlyGoalPct: monthlyGoal > 0 ? Math.round((totalValue / monthlyGoal) * 100) : null,
    statusCounts,
    activities: items,
  }
}

export async function getEvaluacionMensual({ programId, year, month, employeeId }) {
  const program = await getAccessiblePprProgram(programId, employeeId)
  const source = findPreliminarySourceForProgramCode(program.code)
  const currentPreliminaryCutoff = getPprPreliminaryCutoff()
  const isPreliminaryMonth = currentPreliminaryCutoff.year === Number(year)
    && currentPreliminaryCutoff.month === Number(month)
  const activities = scopedImportActivitiesForEmployee(
    await getProgramActivitiesForImport(program.id),
    program,
    employeeId,
  )
  const period = await getPprPeriodByYearMonth(year, month)

  if (isPreliminaryMonth && source) {
    const preliminar = await readPprPreliminaryCache({
      program,
      source,
      cutoff: currentPreliminaryCutoff,
      employeeId,
      activities,
    })
    const values = (preliminar?.items ?? []).map((item) => ({
      activityId: item.activityId,
      sourceValue: item.value,
      sourceKey: item.sourceKey,
    }))
    return buildMonthlyEvaluationPayload({
      program,
      year,
      month,
      sourceMode: 'preliminary',
      periodId: period ? Number(period.id) : null,
      periodIsOpen: Boolean(period?.is_open),
      cutoffInfo: preliminar ?? currentPreliminaryCutoff,
      activities,
      values,
    })
  }

  const valueRows = period
    ? await getPprMonthlyValuesByPeriod({ periodId: period.id, programId: program.id })
    : []

  return buildMonthlyEvaluationPayload({
    program,
    year,
    month,
    sourceMode: 'consolidated',
    periodId: period ? Number(period.id) : null,
    periodIsOpen: Boolean(period?.is_open),
    activities,
    values: valueRows.map((row) => ({ activityId: row.activity_id, value: row.value })),
  })
}

// SP_PPR_PERIODOS_USUARIO(@employee_id INT)
// Returns: id, year, month, is_open, deadline, signed_at, completadas, total_actividades
export async function getPeriodosUsuario(employeeId) {
  await ensurePprSignedDocumentInfrastructure()
  await ensurePprActivityGroupInfrastructure()
  const rows = await executeProcedure('SP_APP_PPR_PERIODOS_USUARIO', [
    { name: 'employee_id', type: sql.Int, value: Number(employeeId) },
  ])

  const periodMap = new Map()
  for (const r of rows) {
    if (!canPprEmployeeEditActivity({
      programCode: r.program_code,
      activityName: r.activity_name,
      activityGroupCode: r.activity_group_code,
      employeeId,
    })) {
      continue
    }

    const id = Number(r.id)
    let current = periodMap.get(id)
    if (!current) {
      current = {
        id,
        year: Number(r.year),
        month: Number(r.month),
        label: periodLabel(r.year, r.month),
        isOpen: Boolean(r.is_open),
        deadline: r.deadline ?? null,
        isSigned: false,
        signedAt: null,
        completadas: 0,
        totalActividades: 0,
        _activities: new Set(),
        _programSignatures: new Map(),
      }
      periodMap.set(id, current)
    }

    const programId = Number(r.program_id)
    current._programSignatures.set(
      programId,
      current._programSignatures.get(programId) || r.signed_at != null,
    )
    if (r.signed_at != null && current.signedAt == null) {
      current.signedAt = r.signed_at
    }

    const activityId = Number(r.activity_id)
    if (!current._activities.has(activityId)) {
      current._activities.add(activityId)
      current.totalActividades += 1
      if (r.value != null) current.completadas += 1
    }
  }

  return Array.from(periodMap.values())
    .map(({ _activities, _programSignatures, ...period }) => ({
      ...period,
      isSigned: _programSignatures.size > 0
        && Array.from(_programSignatures.values()).every(Boolean),
      signedAt: _programSignatures.size > 0
        && Array.from(_programSignatures.values()).every(Boolean)
        ? period.signedAt
        : null,
    }))
    .sort((a, b) => (a.year - b.year) || (a.month - b.month))
}

// ─── Admin functions ──────────────────────────────────────────────────────────

// SP_PPR_ADMIN_VERIFICAR(@employee_id INT) → Returns: is_admin (1 or 0)
export async function verificarAdmin(employeeId) {
  const rows = await executeProcedure('SP_PPR_ADMIN_VERIFICAR', [
    { name: 'employee_id', type: sql.Int, value: Number(employeeId) },
  ])
  return Boolean(rows?.[0]?.is_admin)
}

// SP_PPR_ADMIN_COORDINADORES → Returns (one row per program assignment):
//   idempleado, nombre, dni, activo, fecha_alta, program_id, program_code, program_name
export async function getCoordinadores() {
  const rows = await executeProcedure('SP_PPR_ADMIN_COORDINADORES', [])
  const map = new Map()
  for (const r of rows) {
    const id = Number(r.idempleado)
    if (!map.has(id)) {
      map.set(id, {
        employeeId: id,
        employeeName: String(r.nombre ?? ''),
        dni: String(r.dni ?? ''),
        activo: Boolean(r.activo),
        fechaAlta: r.fecha_alta ?? null,
        programas: [],
        _seen: new Set(),
      })
    }
    const entry = map.get(id)
    const programId = r.program_id != null ? Number(r.program_id) : null
    if (programId != null && !entry._seen.has(programId)) {
      entry._seen.add(programId)
      entry.programas.push({
        id: programId,
        code: String(r.program_code ?? ''),
        name: String(r.program_name ?? ''),
      })
    }
  }
  return Array.from(map.values()).map(({ _seen, ...coord }) => coord)
}

// SP_PPR_ADMIN_GUARDAR_COORDINADOR(@idempleado INT, @activo BIT, @admin_id INT)
//   Add (activo=1) or deactivate (activo=0) a coordinator.
//   SP should look up nombre/DNI from SIGH employee tables.
export async function guardarCoordinador({ employeeId, activo, adminId }) {
  const rows = await executeProcedure('SP_PPR_ADMIN_GUARDAR_COORDINADOR', [
    { name: 'idempleado', type: sql.Int, value: Number(employeeId) },
    { name: 'activo', type: sql.Bit, value: activo ? 1 : 0 },
    { name: 'admin_id', type: sql.Int, value: Number(adminId) },
  ])
  return rows[0] ?? { ok: 1, message: 'OK' }
}

// SP_PPR_ADMIN_PROGRAMAS → Returns: id, code, name (all programs in the system)
export async function getTodosLosProgramas() {
  const rows = await executeProcedure('SP_PPR_ADMIN_PROGRAMAS', [])
  return rows.map((r) => ({
    id: Number(r.id),
    code: String(r.code ?? ''),
    name: String(r.name ?? ''),
    activityGroups: getPprProgramActivityGroups(r.code),
  }))
}

// SP_PPR_ADMIN_GUARDAR_ASIGNACION(@idempleado INT, @program_id INT, @activo BIT, @admin_id INT)
export async function guardarAsignacion({ employeeId, programId, activo, adminId }) {
  await executeProcedure('SP_PPR_ADMIN_GUARDAR_ASIGNACION', [
    { name: 'idempleado', type: sql.Int, value: Number(employeeId) },
    { name: 'program_id', type: sql.Int, value: Number(programId) },
    { name: 'activo', type: sql.Bit, value: activo ? 1 : 0 },
    { name: 'admin_id', type: sql.Int, value: Number(adminId) },
  ])
}

// SP_PPR_BUSCAR_EMPLEADO(@q NVARCHAR(200)) → employee_id, name, dni, cargo
export async function buscarEmpleados(query) {
  const rows = await executeProcedure('SP_PPR_BUSCAR_EMPLEADO', [
    { name: 'q', type: sql.NVarChar(200), value: String(query ?? '').trim() },
  ])
  return rows.map((r) => ({
    employeeId: Number(r.employee_id),
    name: String(r.name ?? ''),
    dni: String(r.dni ?? ''),
    cargo: String(r.cargo ?? ''),
  }))
}

// SP_PPR_PROGRAMA_DETALLE(@program_id INT, @year INT, @employee_id INT)
// Returns: program_id, program_code, program_name,
//          activity_id, activity_code, activity_name, unit, annual_goal, sort_order,
//          period_id, month, value, notes
export async function getProgramaDetalle(programId, year, employeeId) {
  await ensurePprActivityGroupInfrastructure()
  const rows = await executeProcedure('SP_PPR_PROGRAMA_DETALLE', [
    { name: 'program_id', type: sql.Int, value: Number(programId) },
    { name: 'year', type: sql.Int, value: Number(year) },
    { name: 'employee_id', type: sql.Int, value: Number(employeeId) },
  ])
  if (!rows.length) return null
  const first = rows[0]
  const groupByActivityId = await getActivityGroupByActivityId(programId)
  const detailRows = rows.map((row) => ({
    ...row,
    activity_group_code: row.activity_group_code ?? groupByActivityId.get(Number(row.activity_id)) ?? null,
  }))
  const activityMap = new Map()
  for (const r of detailRows) {
    const aid = Number(r.activity_id)
    const activityGroup = resolvePprActivityGroup(r.program_code, r.activity_name, r.activity_group_code)
    if (!activityMap.has(aid)) {
      activityMap.set(aid, {
        id: aid,
        code: String(r.activity_code ?? ''),
        sourceKey: extractActivitySourceKey(r.activity_name) ?? null,
        name: String(r.activity_name ?? ''),
        activityGroup,
        unit: String(r.unit ?? ''),
        annualGoal: r.annual_goal != null ? Number(r.annual_goal) : null,
        sortOrder: Number(r.sort_order ?? 0),
        months: [],
      })
    }
    activityMap.get(aid).months.push({
      month: Number(r.month),
      periodId: r.period_id != null ? Number(r.period_id) : null,
      value: r.value != null ? Number(r.value) : null,
      notes: r.notes ?? null,
    })
  }
  return {
    programId: Number(first.program_id),
    programCode: String(first.program_code ?? ''),
    programName: String(first.program_name ?? ''),
    activityGroups: getPprProgramActivityGroups(first.program_code),
    activityScope: getPprEmployeeActivityScopeGroups(first.program_code, employeeId),
    activities: Array.from(activityMap.values()),
  }
}

// SP_PPR_ADMIN_ACTIVIDADES(@program_id INT)
// Returns: id, program_id, code, name, unit, annual_goal, sort_order, is_active
export async function getActividadesAdmin(programId) {
  await ensurePprActivityGroupInfrastructure()
  const rows = await executeProcedure('SP_APP_PPR_ADMIN_ACTIVIDADES_LIST', [
    { name: 'program_id', type: sql.Int, value: Number(programId) },
  ])
  return rows.map((r) => ({
    id: Number(r.id),
    programId: Number(r.program_id),
    code: String(r.code ?? ''),
    name: String(r.name ?? ''),
    unit: String(r.unit ?? ''),
    annualGoal: r.annual_goal != null ? Number(r.annual_goal) : null,
    sortOrder: Number(r.sort_order ?? 0),
    isActive: r.is_active == null ? true : Boolean(r.is_active),
    activityGroupCode: r.activity_group_code == null ? null : String(r.activity_group_code),
    activityGroup: resolvePprActivityGroup(r.program_code, r.name, r.activity_group_code),
  }))
}

// SP_PPR_ADMIN_GUARDAR_ACTIVIDAD
// @id INT NULL (NULL = create), @program_id INT, @code NVARCHAR(20), @name NVARCHAR(300),
// @unit NVARCHAR(50), @annual_goal DECIMAL NULL, @sort_order INT, @is_active BIT, @admin_id INT
// Returns: id
export async function guardarActividad({
  id,
  programId,
  code,
  name,
  unit,
  annualGoal,
  sortOrder,
  isActive,
  adminId,
  activityGroupCode = null,
}) {
  await ensurePprActivityGroupInfrastructure()
  const rows = await executeProcedure('SP_PPR_ADMIN_GUARDAR_ACTIVIDAD', [
    { name: 'id',           type: sql.Int,            value: id ?? null },
    { name: 'program_id',   type: sql.Int,            value: Number(programId) },
    { name: 'code',         type: sql.NVarChar(20),   value: code || null },
    { name: 'name',         type: sql.NVarChar(300),  value: String(name) },
    { name: 'unit',         type: sql.NVarChar(50),   value: String(unit) },
    { name: 'annual_goal',  type: sql.Decimal(18, 2), value: annualGoal ?? null },
    { name: 'sort_order',   type: sql.Int,            value: Number(sortOrder) || 1 },
    { name: 'is_active',    type: sql.Bit,            value: isActive ? 1 : 0 },
    { name: 'admin_id',     type: sql.Int,            value: Number(adminId) },
  ])
  const activityId = Number(rows[0]?.id ?? 0)
  const programRows = await executeProcedure('SP_APP_PPR_PROGRAM_CODE', [
    { name: 'program_id', type: sql.Int, value: Number(programId) },
  ])
  const programCode = String(programRows[0]?.code ?? '')
  const normalizedGroupCode = String(activityGroupCode ?? '').trim().toUpperCase()
  const validGroup = getPprActivityGroupDefinition(programCode, normalizedGroupCode)
  await executeProcedure('SP_APP_PPR_UPDATE_ACTIVITY_GROUP', [
    { name: 'activity_group_code', type: sql.NVarChar(30), value: validGroup ? normalizedGroupCode : null },
    { name: 'activity_id', type: sql.Int, value: activityId },
  ])
  return { id: activityId }
}

// SP_PPR_ADMIN_TOGGLE_ACTIVIDAD(@activity_id INT, @is_active BIT, @admin_id INT)
export async function toggleActividad({ activityId, isActive, adminId }) {
  await executeProcedure('SP_PPR_ADMIN_TOGGLE_ACTIVIDAD', [
    { name: 'activity_id', type: sql.Int, value: Number(activityId) },
    { name: 'is_active',   type: sql.Bit, value: isActive ? 1 : 0 },
    { name: 'admin_id',    type: sql.Int, value: Number(adminId) },
  ])
}

// SP_PPR_ADMIN_EXPORT_MATRIZ(@year INT)
// Returns one flat row per activity with all 12 exec months + 12 meta months pivoted
export async function getMatrizExportData(year) {
  const rows = await executeProcedure('SP_PPR_ADMIN_EXPORT_MATRIZ', [
    { name: 'year', type: sql.Int, value: Number(year) },
  ])
  return rows.map((r) => ({
    poi:                 Number(r.poi),
    categoriaId:         Number(r.categoria_id),
    categoria:           String(r.categoria ?? ''),
    responsable:         String(r.responsable ?? ''),
    aoId:                String(r.ao_id ?? ''),
    actividadOperativa:  String(r.actividad_operativa ?? ''),
    umId:                r.um_id != null ? Number(r.um_id) : '',
    unidad:              String(r.unidad ?? ''),
    // execution values f01..f12
    f01: Number(r.f01 ?? 0), f02: Number(r.f02 ?? 0), f03: Number(r.f03 ?? 0),
    f04: Number(r.f04 ?? 0), f05: Number(r.f05 ?? 0), f06: Number(r.f06 ?? 0),
    f07: Number(r.f07 ?? 0), f08: Number(r.f08 ?? 0), f09: Number(r.f09 ?? 0),
    f10: Number(r.f10 ?? 0), f11: Number(r.f11 ?? 0), f12: Number(r.f12 ?? 0),
    // meta values meta01..meta12
    meta01: Number(r.meta01 ?? 0), meta02: Number(r.meta02 ?? 0), meta03: Number(r.meta03 ?? 0),
    meta04: Number(r.meta04 ?? 0), meta05: Number(r.meta05 ?? 0), meta06: Number(r.meta06 ?? 0),
    meta07: Number(r.meta07 ?? 0), meta08: Number(r.meta08 ?? 0), meta09: Number(r.meta09 ?? 0),
    meta10: Number(r.meta10 ?? 0), meta11: Number(r.meta11 ?? 0), meta12: Number(r.meta12 ?? 0),
    totalMeta:    Number(r.total_meta ?? 0),
    observacion:  String(r.observacion ?? ''),
  }))
}

// SP_PPR_RESUMEN_ANUAL(@employee_id INT, @year INT)
// Returns: program_id, program_code, program_name, period_id, month,
//          completadas, total_actividades, signed_at
export async function getResumenAnual(employeeId, year) {
  await ensurePprSignedDocumentInfrastructure()
  await ensurePprActivityGroupInfrastructure()
  const rows = await executeProcedure('SP_APP_PPR_RESUMEN_ANUAL', [
    { name: 'employee_id', type: sql.Int, value: Number(employeeId) },
    { name: 'year', type: sql.Int, value: Number(year) },
  ])

  const programaMap = new Map()
  for (const r of rows) {
    const pid = Number(r.program_id)
    const activityGroup = resolvePprActivityGroup(r.program_code, r.activity_name, r.activity_group_code)
    const groupKey = activityGroup?.code ?? 'ALL'
    const key = `${pid}:${groupKey}`
    if (!programaMap.has(key)) {
      programaMap.set(key, {
        rowKey: key,
        programaId: pid,
        code: String(r.program_code ?? ''),
        name: String(r.program_name ?? ''),
        activityGroup,
        meses: new Map(),
      })
    }
    const entry = programaMap.get(key)
    const month = Number(r.month)
    if (!entry.meses.has(month)) {
      entry.meses.set(month, {
        periodoId: r.period_id != null ? Number(r.period_id) : null,
        month,
        label: periodLabel(year, month),
        completadas: 0,
        totalActividades: 0,
        isSigned: r.period_id != null && r.signed_at != null,
        _activities: new Set(),
      })
    }
    const monthEntry = entry.meses.get(month)
    const activityId = Number(r.activity_id)
    if (!monthEntry._activities.has(activityId)) {
      monthEntry._activities.add(activityId)
      monthEntry.totalActividades += 1
      if (r.value != null) monthEntry.completadas += 1
    }
    monthEntry.isSigned = monthEntry.isSigned || (r.period_id != null && r.signed_at != null)
  }
  return Array.from(programaMap.values())
    .map((programa) => ({
      ...programa,
      meses: Array.from(programa.meses.values())
        .map(({ _activities, ...mes }) => mes)
        .sort((a, b) => a.month - b.month),
    }))
    .sort((a, b) => {
      const codeCompare = a.code.localeCompare(b.code, 'es-PE', { numeric: true })
      if (codeCompare !== 0) return codeCompare
      return (a.activityGroup?.sortOrder ?? 0) - (b.activityGroup?.sortOrder ?? 0)
    })
}
