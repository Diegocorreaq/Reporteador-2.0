import {
  executeProcedure_General as executeProcedure,
  executeQuery_General as executeQuery,
  sql,
} from './sigh-sql-helpers.js'
import { ensurePprSignedDocumentInfrastructure } from './ppr-signature-document.service.js'

const MONTHS_ES = [
  'Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio',
  'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre',
]

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

async function ensurePprImportInfrastructure() {
  await executeQuery(`
    IF COL_LENGTH('dbo.ppr_monthly_values', 'value_source') IS NULL
      ALTER TABLE dbo.ppr_monthly_values ADD value_source NVARCHAR(30) NULL;

    IF COL_LENGTH('dbo.ppr_monthly_values', 'source_key') IS NULL
      ALTER TABLE dbo.ppr_monthly_values ADD source_key NVARCHAR(50) NULL;

    IF COL_LENGTH('dbo.ppr_monthly_values', 'source_value') IS NULL
      ALTER TABLE dbo.ppr_monthly_values ADD source_value DECIMAL(18,2) NULL;

    IF COL_LENGTH('dbo.ppr_monthly_values', 'loaded_by') IS NULL
      ALTER TABLE dbo.ppr_monthly_values ADD loaded_by INT NULL;

    IF COL_LENGTH('dbo.ppr_monthly_values', 'loaded_at') IS NULL
      ALTER TABLE dbo.ppr_monthly_values ADD loaded_at DATETIME2 NULL;

    IF COL_LENGTH('dbo.ppr_monthly_values', 'validated_by') IS NULL
      ALTER TABLE dbo.ppr_monthly_values ADD validated_by INT NULL;

    IF COL_LENGTH('dbo.ppr_monthly_values', 'validated_at') IS NULL
      ALTER TABLE dbo.ppr_monthly_values ADD validated_at DATETIME2 NULL;

    IF COL_LENGTH('dbo.ppr_monthly_values', 'validation_status') IS NULL
      ALTER TABLE dbo.ppr_monthly_values ADD validation_status NVARCHAR(30) NULL;

    IF COL_LENGTH('dbo.ppr_monthly_values', 'import_run_id') IS NULL
      ALTER TABLE dbo.ppr_monthly_values ADD import_run_id INT NULL;

    IF NOT EXISTS (
      SELECT 1
      FROM INFORMATION_SCHEMA.TABLES
      WHERE TABLE_SCHEMA = 'dbo'
        AND TABLE_NAME = 'ppr_import_runs'
    )
    BEGIN
      CREATE TABLE dbo.ppr_import_runs (
        id               INT IDENTITY(1,1) PRIMARY KEY,
        period_id        INT NOT NULL,
        program_id       INT NOT NULL,
        source_id        NVARCHAR(80) NOT NULL,
        source_label     NVARCHAR(200) NOT NULL,
        source_procedure NVARCHAR(200) NOT NULL,
        admin_id         INT NOT NULL,
        started_at       DATETIME2 NOT NULL DEFAULT SYSDATETIME(),
        completed_at     DATETIME2 NULL,
        status           NVARCHAR(30) NOT NULL DEFAULT 'running',
        rows_read        INT NOT NULL DEFAULT 0,
        rows_matched     INT NOT NULL DEFAULT 0,
        rows_updated     INT NOT NULL DEFAULT 0,
        rows_unmatched   INT NOT NULL DEFAULT 0,
        error_message    NVARCHAR(MAX) NULL
      );
    END;

    IF COL_LENGTH('dbo.ppr_import_runs', 'period_id') IS NULL
      ALTER TABLE dbo.ppr_import_runs ADD period_id INT NULL;

    IF COL_LENGTH('dbo.ppr_import_runs', 'program_id') IS NULL
      ALTER TABLE dbo.ppr_import_runs ADD program_id INT NULL;

    IF COL_LENGTH('dbo.ppr_import_runs', 'source_id') IS NULL
      ALTER TABLE dbo.ppr_import_runs ADD source_id NVARCHAR(80) NULL;

    IF COL_LENGTH('dbo.ppr_import_runs', 'source_label') IS NULL
      ALTER TABLE dbo.ppr_import_runs ADD source_label NVARCHAR(200) NULL;

    IF COL_LENGTH('dbo.ppr_import_runs', 'source_procedure') IS NULL
      ALTER TABLE dbo.ppr_import_runs ADD source_procedure NVARCHAR(200) NULL;

    IF COL_LENGTH('dbo.ppr_import_runs', 'admin_id') IS NULL
      ALTER TABLE dbo.ppr_import_runs ADD admin_id INT NULL;

    IF COL_LENGTH('dbo.ppr_import_runs', 'started_at') IS NULL
      ALTER TABLE dbo.ppr_import_runs ADD started_at DATETIME2 NULL;

    IF COL_LENGTH('dbo.ppr_import_runs', 'completed_at') IS NULL
      ALTER TABLE dbo.ppr_import_runs ADD completed_at DATETIME2 NULL;

    IF COL_LENGTH('dbo.ppr_import_runs', 'status') IS NULL
      ALTER TABLE dbo.ppr_import_runs ADD status NVARCHAR(30) NULL;

    IF COL_LENGTH('dbo.ppr_import_runs', 'rows_read') IS NULL
      ALTER TABLE dbo.ppr_import_runs ADD rows_read INT NULL;

    IF COL_LENGTH('dbo.ppr_import_runs', 'rows_matched') IS NULL
      ALTER TABLE dbo.ppr_import_runs ADD rows_matched INT NULL;

    IF COL_LENGTH('dbo.ppr_import_runs', 'rows_updated') IS NULL
      ALTER TABLE dbo.ppr_import_runs ADD rows_updated INT NULL;

    IF COL_LENGTH('dbo.ppr_import_runs', 'rows_unmatched') IS NULL
      ALTER TABLE dbo.ppr_import_runs ADD rows_unmatched INT NULL;

    IF COL_LENGTH('dbo.ppr_import_runs', 'error_message') IS NULL
      ALTER TABLE dbo.ppr_import_runs ADD error_message NVARCHAR(MAX) NULL;

    IF NOT EXISTS (
      SELECT 1
      FROM INFORMATION_SCHEMA.TABLES
      WHERE TABLE_SCHEMA = 'dbo'
        AND TABLE_NAME = 'ppr_periodo_firma'
    )
    BEGIN
      CREATE TABLE dbo.ppr_periodo_firma (
        employee_id INT NOT NULL,
        period_id   INT NOT NULL,
        signed_at   DATETIME2 NOT NULL DEFAULT SYSDATETIME(),
        CONSTRAINT PK_ppr_periodo_firma PRIMARY KEY (employee_id, period_id)
      );
    END;
  `, [], { timeoutMs: 120000 })
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
  const rows = await executeProcedure('SP_PPR_PROGRAMAS_USUARIO', [
    { name: 'employee_id', type: sql.Int, value: Number(employeeId) },
  ])
  return rows.map((r) => ({
    id: Number(r.id),
    code: String(r.code ?? ''),
    name: String(r.name ?? ''),
    totalActividades: Number(r.total_actividades ?? 0),
    conDatos: Number(r.con_datos ?? 0),
    sumLogrado: Number(r.sum_logrado ?? 0),
    sumMetaEsperada: Number(r.sum_meta_esperada ?? 0),
    sumMetaAnual: Number(r.sum_meta_anual ?? 0),
    mesesCompletos: Number(r.meses_completos ?? 0),
  }))
}

export async function getActividadesPrograma({ programaId, periodoId, employeeId }) {
  await ensurePprSignedDocumentInfrastructure()
  const rows = await executeProcedure('SP_PPR_ACTIVIDADES_PROGRAMA', [
    { name: 'program_id', type: sql.Int, value: Number(programaId) },
    { name: 'period_id', type: sql.Int, value: Number(periodoId) },
    { name: 'employee_id', type: sql.Int, value: Number(employeeId) },
  ])
  const signatureRows = await executeQuery(`
    SELECT TOP 1 signed_at
    FROM dbo.ppr_signatures
    WHERE employee_id = @employee_id
      AND period_id = @period_id
      AND is_valid = 1
      AND (program_id = @program_id OR program_id IS NULL)
    ORDER BY CASE WHEN program_id = @program_id THEN 0 ELSE 1 END, signed_at DESC;
  `, [
    { name: 'employee_id', type: sql.Int, value: Number(employeeId) },
    { name: 'period_id', type: sql.Int, value: Number(periodoId) },
    { name: 'program_id', type: sql.Int, value: Number(programaId) },
  ])
  const signedAt = signatureRows[0]?.signed_at ?? null
  return rows.map((r) => ({
    id: Number(r.id),
    code: String(r.code ?? ''),
    name: String(r.name ?? ''),
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
  }))
}

export async function guardarValor({ activityId, periodId, employeeId, value, notes }) {
  await executeQuery(`
    DECLARE @now DATETIME2 = SYSDATETIME();

    UPDATE dbo.ppr_monthly_values
    SET
      employee_id = @employee_id,
      value = @value,
      notes = @notes,
      value_source = CASE
        WHEN value_source = 'source' THEN 'manual_override'
        ELSE ISNULL(value_source, 'manual')
      END,
      validation_status = 'pending',
      validated_by = NULL,
      validated_at = NULL
    WHERE activity_id = @activity_id
      AND period_id = @period_id;

    IF @@ROWCOUNT = 0
    BEGIN
      INSERT INTO dbo.ppr_monthly_values (
        activity_id,
        period_id,
        employee_id,
        value,
        notes,
        value_source,
        validation_status
      )
      VALUES (
        @activity_id,
        @period_id,
        @employee_id,
        @value,
        @notes,
        'manual',
        'pending'
      );
    END
  `, [
    { name: 'activity_id', type: sql.Int, value: Number(activityId) },
    { name: 'period_id', type: sql.Int, value: Number(periodId) },
    { name: 'employee_id', type: sql.Int, value: Number(employeeId) },
    { name: 'value', type: sql.Decimal(18, 2), value: Number(value) },
    { name: 'notes', type: sql.NVarChar(500), value: notes ?? null },
  ])
}

export async function validarValor({ activityId, periodId, employeeId }) {
  const rows = await executeQuery(`
    UPDATE dbo.ppr_monthly_values
    SET
      validation_status = 'validated',
      validated_by = @employee_id,
      validated_at = SYSDATETIME(),
      value_source = ISNULL(value_source, 'manual')
    WHERE activity_id = @activity_id
      AND period_id = @period_id
      AND value IS NOT NULL;

    SELECT
      @@ROWCOUNT AS affected,
      validated_at
    FROM dbo.ppr_monthly_values
    WHERE activity_id = @activity_id
      AND period_id = @period_id;
  `, [
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
  const rows = await executeQuery(`
    SELECT
      COUNT(DISTINCT a.id) AS total_actividades,
      COUNT(DISTINCT CASE WHEN mv.value IS NOT NULL THEN a.id END) AS con_valor,
      COUNT(DISTINCT CASE WHEN mv.validation_status = 'validated' THEN a.id END) AS validadas,
      COUNT(DISTINCT CASE WHEN mv.value_source = 'source' THEN a.id END) AS precargadas,
      COUNT(DISTINCT CASE WHEN mv.value_source = 'manual_override' THEN a.id END) AS editadas,
      COUNT(DISTINCT CASE WHEN mv.value_source IS NULL OR mv.value_source = 'manual' THEN a.id END) AS manuales
    FROM dbo.ppr_user_programs up
    INNER JOIN dbo.ppr_activities a
      ON a.program_id = up.program_id
      AND ISNULL(a.is_active, 1) = 1
    LEFT JOIN dbo.ppr_monthly_values mv
      ON mv.activity_id = a.id
      AND mv.period_id = @period_id
    WHERE up.employee_id = @employee_id
      AND up.is_active = 1
      AND (@program_id IS NULL OR a.program_id = @program_id);
  `, [
    { name: 'employee_id', type: sql.Int, value: Number(employeeId) },
    { name: 'period_id', type: sql.Int, value: Number(periodId) },
    { name: 'program_id', type: sql.Int, value: programId == null ? null : Number(programId) },
  ])
  const r = rows[0] ?? {}
  const total = Number(r.total_actividades ?? 0)
  const validated = Number(r.validadas ?? 0)
  return {
    total,
    withValue: Number(r.con_valor ?? 0),
    validated,
    pending: Math.max(total - validated, 0),
    imported: Number(r.precargadas ?? 0),
    edited: Number(r.editadas ?? 0),
    manual: Number(r.manuales ?? 0),
    canSign: total > 0 && total === validated,
  }
}

async function firmarPeriodoForTesting({ employeeId, periodId }) {
  await ensurePprImportInfrastructure()
  const rows = await executeQuery(`
    MERGE dbo.ppr_periodo_firma AS target
    USING (SELECT @employee_id AS employee_id, @period_id AS period_id) AS source
      ON target.employee_id = source.employee_id
      AND target.period_id = source.period_id
    WHEN MATCHED THEN
      UPDATE SET signed_at = SYSDATETIME()
    WHEN NOT MATCHED THEN
      INSERT (employee_id, period_id, signed_at)
      VALUES (source.employee_id, source.period_id, SYSDATETIME());

    SELECT signed_at
    FROM dbo.ppr_periodo_firma
    WHERE employee_id = @employee_id
      AND period_id = @period_id;
  `, [
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
  const rows = await executeQuery(`
    SELECT
      id,
      ISNULL(code, '') AS code,
      name
    FROM dbo.ppr_activities
    WHERE program_id = @program_id
      AND ISNULL(is_active, 1) = 1
    ORDER BY sort_order, id;
  `, [
    { name: 'program_id', type: sql.Int, value: Number(programId) },
  ])
  return rows.map((r) => ({
    id: Number(r.id),
    code: String(r.code ?? ''),
    name: String(r.name ?? ''),
    sourceKey: extractActivitySourceKey(r.name) ?? String(r.code ?? '').trim() ?? null,
    sourceNameKey: normalizeActivityName(r.name),
  }))
}

async function ensureProgramPeriodNotSigned(programId, periodId) {
  const rows = await executeQuery(`
    SELECT DISTINCT up.employee_id
    FROM dbo.ppr_user_programs up
    WHERE up.program_id = @program_id
      AND up.is_active = 1;
  `, [
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

  const rows = await executeQuery(`
    SELECT TOP 1 code
    FROM dbo.ppr_programs
    WHERE id = @program_id;
  `, [
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
  const runRows = await executeQuery(`
    DECLARE @now DATETIME2 = SYSDATETIME();
    DECLARE @run TABLE (id INT);

    INSERT INTO dbo.ppr_import_runs (
      period_id,
      program_id,
      source_id,
      source_label,
      source_procedure,
      admin_id,
      started_at,
      completed_at,
      status,
      rows_read,
      rows_matched,
      rows_updated,
      rows_unmatched,
      error_message
    )
    OUTPUT INSERTED.id INTO @run
    VALUES (
      @period_id,
      @program_id,
      @source_id,
      @source_label,
      @source_procedure,
      @admin_id,
      @now,
      NULL,
      'running',
      @rows_read,
      @rows_matched,
      0,
      @rows_unmatched,
      @unmatched_json
    );

    DECLARE @run_id INT = (SELECT TOP 1 id FROM @run);

    SELECT @run_id AS id;
  `, [
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
    const result = await executeQuery(`
      DECLARE @now DATETIME2 = SYSDATETIME();
      DECLARE @affected INT = 0;

      UPDATE dbo.ppr_monthly_values
      SET
        employee_id = @admin_id,
        value = @source_value,
        value_source = 'source',
        source_key = @source_key,
        source_value = @source_value,
        loaded_by = @admin_id,
        loaded_at = @now,
        validation_status = 'pending',
        validated_by = NULL,
        validated_at = NULL,
        import_run_id = @run_id
      WHERE activity_id = @activity_id
        AND period_id = @period_id;

      SET @affected = @@ROWCOUNT;

      IF @affected = 0
      BEGIN
        INSERT INTO dbo.ppr_monthly_values (
          activity_id,
          period_id,
          employee_id,
          value,
          notes,
          value_source,
          source_key,
          source_value,
          loaded_by,
          loaded_at,
          validation_status,
          import_run_id
        )
        VALUES (
          @activity_id,
          @period_id,
          @admin_id,
          @source_value,
          NULL,
          'source',
          @source_key,
          @source_value,
          @admin_id,
          @now,
          'pending',
          @run_id
        );

        SET @affected = @@ROWCOUNT;
      END

      SELECT @affected AS affected;
    `, [
      { name: 'activity_id', type: sql.Int, value: Number(row.activityId) },
      { name: 'period_id', type: sql.Int, value: Number(periodId) },
      { name: 'admin_id', type: sql.Int, value: Number(adminId) },
      { name: 'source_key', type: sql.NVarChar(50), value: String(row.sourceKey) },
      { name: 'source_value', type: sql.Decimal(18, 2), value: Number(row.sourceValue) },
      { name: 'run_id', type: sql.Int, value: runId },
    ], { timeoutMs: 120000 })
    rowsUpdated += Number(result[0]?.affected ?? 0)
  }

  const completedRows = await executeQuery(`
    UPDATE dbo.ppr_import_runs
    SET
      completed_at = SYSDATETIME(),
      status = 'completed',
      rows_updated = @rows_updated
    WHERE id = @run_id;

    SELECT
      id,
      period_id,
      program_id,
      source_id,
      source_label,
      source_procedure,
      admin_id,
      started_at,
      completed_at,
      status,
      rows_read,
      rows_matched,
      rows_updated,
      rows_unmatched,
      error_message
    FROM dbo.ppr_import_runs
    WHERE id = @run_id;
  `, [
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

  const activities = await getProgramActivitiesForImport(programId)
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

// SP_PPR_PERIODOS_USUARIO(@employee_id INT)
// Returns: id, year, month, is_open, deadline, signed_at, completadas, total_actividades
export async function getPeriodosUsuario(employeeId) {
  await ensurePprSignedDocumentInfrastructure()
  const rows = await executeProcedure('SP_PPR_PERIODOS_USUARIO', [
    { name: 'employee_id', type: sql.Int, value: Number(employeeId) },
  ])
  const signatureRows = await executeQuery(`
    SELECT
      per.id AS period_id,
      COUNT(DISTINCT up.program_id) AS total_programs,
      COUNT(DISTINCT CASE WHEN sig.id IS NOT NULL THEN up.program_id END) AS signed_programs,
      MAX(sig.signed_at) AS signed_at
    FROM dbo.ppr_periods per
    INNER JOIN dbo.ppr_user_programs up
      ON up.employee_id = @employee_id
      AND up.is_active = 1
    LEFT JOIN dbo.ppr_signatures sig
      ON sig.employee_id = up.employee_id
      AND sig.period_id = per.id
      AND sig.is_valid = 1
      AND (sig.program_id = up.program_id OR sig.program_id IS NULL)
    GROUP BY per.id;
  `, [
    { name: 'employee_id', type: sql.Int, value: Number(employeeId) },
  ])
  const signatureMap = new Map(signatureRows.map((row) => {
    const totalPrograms = Number(row.total_programs ?? 0)
    const signedPrograms = Number(row.signed_programs ?? 0)
    const isSigned = totalPrograms > 0 && totalPrograms === signedPrograms
    return [Number(row.period_id), {
      isSigned,
      signedAt: isSigned ? (row.signed_at ?? null) : null,
    }]
  }))
  const periodMap = new Map()
  for (const r of rows) {
    const id = Number(r.id)
    const current = periodMap.get(id)
    const completadas = Number(r.completadas ?? 0)
    const totalActividades = Number(r.total_actividades ?? 0)
    if (!current) {
      const signature = signatureMap.get(id)
      periodMap.set(id, {
        id,
        year: Number(r.year),
        month: Number(r.month),
        label: periodLabel(r.year, r.month),
        isOpen: Boolean(r.is_open),
        deadline: r.deadline ?? null,
        isSigned: signature?.isSigned ?? false,
        signedAt: signature?.signedAt ?? null,
        completadas,
        totalActividades,
      })
      continue
    }
    current.completadas = Math.max(current.completadas, completadas)
    current.totalActividades = Math.max(current.totalActividades, totalActividades)
  }
  return Array.from(periodMap.values()).sort((a, b) => (a.year - b.year) || (a.month - b.month))
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
  const rows = await executeProcedure('SP_PPR_PROGRAMA_DETALLE', [
    { name: 'program_id', type: sql.Int, value: Number(programId) },
    { name: 'year', type: sql.Int, value: Number(year) },
    { name: 'employee_id', type: sql.Int, value: Number(employeeId) },
  ])
  if (!rows.length) return null
  const first = rows[0]
  const activityMap = new Map()
  for (const r of rows) {
    const aid = Number(r.activity_id)
    if (!activityMap.has(aid)) {
      activityMap.set(aid, {
        id: aid,
        code: String(r.activity_code ?? ''),
        name: String(r.activity_name ?? ''),
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
    activities: Array.from(activityMap.values()),
  }
}

// SP_PPR_ADMIN_ACTIVIDADES(@program_id INT)
// Returns: id, program_id, code, name, unit, annual_goal, sort_order, is_active
export async function getActividadesAdmin(programId) {
  const rows = await executeProcedure('SP_PPR_ADMIN_ACTIVIDADES', [
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
  }))
}

// SP_PPR_ADMIN_GUARDAR_ACTIVIDAD
// @id INT NULL (NULL = create), @program_id INT, @code NVARCHAR(20), @name NVARCHAR(300),
// @unit NVARCHAR(50), @annual_goal DECIMAL NULL, @sort_order INT, @is_active BIT, @admin_id INT
// Returns: id
export async function guardarActividad({ id, programId, code, name, unit, annualGoal, sortOrder, isActive, adminId }) {
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
  return { id: Number(rows[0]?.id ?? 0) }
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
  const rows = await executeProcedure('SP_PPR_RESUMEN_ANUAL', [
    { name: 'employee_id', type: sql.Int, value: Number(employeeId) },
    { name: 'year', type: sql.Int, value: Number(year) },
  ])
  const signatureRows = await executeQuery(`
    SELECT
      up.program_id,
      per.id AS period_id,
      MAX(sig.signed_at) AS signed_at
    FROM dbo.ppr_user_programs up
    INNER JOIN dbo.ppr_periods per
      ON per.year = @year
    LEFT JOIN dbo.ppr_signatures sig
      ON sig.employee_id = up.employee_id
      AND sig.period_id = per.id
      AND sig.is_valid = 1
      AND (sig.program_id = up.program_id OR sig.program_id IS NULL)
    WHERE up.employee_id = @employee_id
      AND up.is_active = 1
    GROUP BY up.program_id, per.id;
  `, [
    { name: 'employee_id', type: sql.Int, value: Number(employeeId) },
    { name: 'year', type: sql.Int, value: Number(year) },
  ])
  const signatureMap = new Map(signatureRows.map((row) => [
    `${Number(row.program_id)}:${Number(row.period_id)}`,
    row.signed_at ?? null,
  ]))
  const programaMap = new Map()
  for (const r of rows) {
    const pid = Number(r.program_id)
    if (!programaMap.has(pid)) {
      programaMap.set(pid, {
        programaId: pid,
        code: String(r.program_code ?? ''),
        name: String(r.program_name ?? ''),
        meses: [],
      })
    }
    const signatureKey = `${pid}:${r.period_id != null ? Number(r.period_id) : 0}`
    programaMap.get(pid).meses.push({
      periodoId: r.period_id != null ? Number(r.period_id) : null,
      month: Number(r.month),
      label: periodLabel(year, r.month),
      completadas: Number(r.completadas ?? 0),
      totalActividades: Number(r.total_actividades ?? 0),
      isSigned: r.period_id != null && signatureMap.get(signatureKey) != null,
    })
  }
  return Array.from(programaMap.values())
}
