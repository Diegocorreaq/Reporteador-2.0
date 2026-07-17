SET ANSI_NULLS ON;
GO
SET QUOTED_IDENTIFIER ON;
GO

CREATE OR ALTER PROCEDURE dbo.SP_APP_PPR_ENSURE_ACTIVITY_GROUP_INFRASTRUCTURE
AS
BEGIN
  SET NOCOUNT ON;

  IF COL_LENGTH('dbo.ppr_activities', 'activity_group_code') IS NULL
    ALTER TABLE dbo.ppr_activities ADD activity_group_code NVARCHAR(30) NULL;
END;
GO

CREATE OR ALTER PROCEDURE dbo.SP_APP_PPR_ENSURE_IMPORT_INFRASTRUCTURE
AS
BEGIN
  SET NOCOUNT ON;

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
END;
GO

CREATE OR ALTER PROCEDURE dbo.SP_APP_PPR_ENSURE_PRELIMINARY_INFRASTRUCTURE
AS
BEGIN
  SET NOCOUNT ON;

  IF NOT EXISTS (
    SELECT 1
    FROM INFORMATION_SCHEMA.TABLES
    WHERE TABLE_SCHEMA = 'dbo'
      AND TABLE_NAME = 'ppr_preliminary_runs'
  )
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

  IF NOT EXISTS (
    SELECT 1
    FROM INFORMATION_SCHEMA.TABLES
    WHERE TABLE_SCHEMA = 'dbo'
      AND TABLE_NAME = 'ppr_preliminary_values'
  )
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
END;
GO

CREATE OR ALTER PROCEDURE dbo.SP_APP_PPR_SCOPED_PROGRAM_METRICS
  @program_id int
AS
BEGIN
  SET NOCOUNT ON;

  DECLARE @active_year INT = YEAR(GETDATE());
  DECLARE @active_month INT = MONTH(GETDATE());

  SELECT TOP 1
    @active_year = [year],
    @active_month = [month]
  FROM dbo.ppr_periods
  WHERE is_open = 1
  ORDER BY [year] DESC, [month] DESC;

  SELECT
    @active_year AS active_year,
    @active_month AS active_month,
    p.code AS program_code,
    a.id AS activity_id,
    a.name AS activity_name,
    a.activity_group_code,
    ISNULL(a.annual_goal, 0) AS annual_goal,
    SUM(CASE
        WHEN per.year = @active_year
          AND per.month < @active_month
        THEN ISNULL(mv.value, 0)
        ELSE 0
    END) AS logrado,
    MAX(CASE
        WHEN per.year = @active_year
          AND per.month < @active_month
          AND mv.value IS NOT NULL
        THEN 1
        ELSE 0
    END) AS tiene_dato
  FROM dbo.ppr_programs p
  INNER JOIN dbo.ppr_activities a
    ON a.program_id = p.id
    AND ISNULL(a.is_active, 1) = 1
  LEFT JOIN dbo.ppr_monthly_values mv
    ON mv.activity_id = a.id
  LEFT JOIN dbo.ppr_periods per
    ON per.id = mv.period_id
  WHERE p.id = @program_id
  GROUP BY p.code, a.id, a.name, a.activity_group_code, a.annual_goal;
END;
GO

CREATE OR ALTER PROCEDURE dbo.SP_APP_PPR_PROGRAM_CODE
  @program_id int
AS
BEGIN
  SET NOCOUNT ON;

  SELECT code
  FROM dbo.ppr_programs
  WHERE id = @program_id;
END;
GO

CREATE OR ALTER PROCEDURE dbo.SP_APP_PPR_ACTIVITY_GROUPS_BY_PROGRAM
  @program_id int
AS
BEGIN
  SET NOCOUNT ON;

  SELECT id, activity_group_code
  FROM dbo.ppr_activities
  WHERE program_id = @program_id;
END;
GO

CREATE OR ALTER PROCEDURE dbo.SP_APP_PPR_SIGNATURE_FOR_PROGRAM_PERIOD
  @employee_id int,
  @period_id int,
  @program_id int
AS
BEGIN
  SET NOCOUNT ON;

  SELECT TOP 1 signed_at
  FROM dbo.ppr_signatures
  WHERE employee_id = @employee_id
    AND period_id = @period_id
    AND is_valid = 1
    AND (program_id = @program_id OR program_id IS NULL)
  ORDER BY CASE WHEN program_id = @program_id THEN 0 ELSE 1 END, signed_at DESC;
END;
GO

CREATE OR ALTER PROCEDURE dbo.SP_APP_PPR_ACTIVITY_SCOPE_INFO
  @activity_id int
AS
BEGIN
  SET NOCOUNT ON;

  SELECT
    p.code AS program_code,
    a.name AS activity_name,
    a.activity_group_code
  FROM dbo.ppr_activities a
  INNER JOIN dbo.ppr_programs p
    ON p.id = a.program_id
  WHERE a.id = @activity_id
    AND ISNULL(a.is_active, 1) = 1;
END;
GO

CREATE OR ALTER PROCEDURE dbo.SP_APP_PPR_GUARDAR_VALOR
  @activity_id int,
  @period_id int,
  @employee_id int,
  @value decimal(18,2),
  @notes nvarchar(500) = NULL
AS
BEGIN
  SET NOCOUNT ON;

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
  END;
END;
GO

CREATE OR ALTER PROCEDURE dbo.SP_APP_PPR_VALIDAR_VALOR
  @activity_id int,
  @period_id int,
  @employee_id int
AS
BEGIN
  SET NOCOUNT ON;

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
END;
GO

CREATE OR ALTER PROCEDURE dbo.SP_APP_PPR_RESUMEN_VALIDACION
  @employee_id int,
  @period_id int,
  @program_id int = NULL
AS
BEGIN
  SET NOCOUNT ON;

  SELECT
    p.code AS program_code,
    a.id AS activity_id,
    a.name AS activity_name,
    a.activity_group_code,
    mv.value,
    mv.validation_status,
    mv.value_source
  FROM dbo.ppr_user_programs up
  INNER JOIN dbo.ppr_programs p
    ON p.id = up.program_id
  INNER JOIN dbo.ppr_activities a
    ON a.program_id = up.program_id
    AND ISNULL(a.is_active, 1) = 1
  LEFT JOIN dbo.ppr_monthly_values mv
    ON mv.activity_id = a.id
    AND mv.period_id = @period_id
  WHERE up.employee_id = @employee_id
    AND up.is_active = 1
    AND (@program_id IS NULL OR a.program_id = @program_id);
END;
GO

CREATE OR ALTER PROCEDURE dbo.SP_APP_PPR_FIRMAR_PERIODO_TEST
  @employee_id int,
  @period_id int
AS
BEGIN
  SET NOCOUNT ON;

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
END;
GO

CREATE OR ALTER PROCEDURE dbo.SP_APP_PPR_IMPORT_ACTIVITIES
  @program_id int
AS
BEGIN
  SET NOCOUNT ON;

  SELECT
    a.id,
    ISNULL(a.code, '') AS code,
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
END;
GO

CREATE OR ALTER PROCEDURE dbo.SP_APP_PPR_PROGRAM_EMPLOYEES
  @program_id int
AS
BEGIN
  SET NOCOUNT ON;

  SELECT DISTINCT up.employee_id
  FROM dbo.ppr_user_programs up
  WHERE up.program_id = @program_id
    AND up.is_active = 1;
END;
GO

CREATE OR ALTER PROCEDURE dbo.SP_APP_PPR_IMPORT_RUN_START
  @period_id int,
  @program_id int,
  @source_id nvarchar(80),
  @source_label nvarchar(200),
  @source_procedure nvarchar(200),
  @admin_id int,
  @rows_read int,
  @rows_matched int,
  @rows_unmatched int,
  @unmatched_json nvarchar(max)
AS
BEGIN
  SET NOCOUNT ON;

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

  SELECT TOP 1 id
  FROM @run;
END;
GO

CREATE OR ALTER PROCEDURE dbo.SP_APP_PPR_IMPORT_VALUE_UPSERT
  @activity_id int,
  @period_id int,
  @admin_id int,
  @source_key nvarchar(50),
  @source_value decimal(18,2),
  @run_id int
AS
BEGIN
  SET NOCOUNT ON;

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
  END;

  SELECT @affected AS affected;
END;
GO

CREATE OR ALTER PROCEDURE dbo.SP_APP_PPR_IMPORT_RUN_COMPLETE
  @run_id int,
  @rows_updated int
AS
BEGIN
  SET NOCOUNT ON;

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
END;
GO

CREATE OR ALTER PROCEDURE dbo.SP_APP_PPR_ACCESSIBLE_PROGRAM
  @program_id int,
  @employee_id int,
  @is_admin bit
AS
BEGIN
  SET NOCOUNT ON;

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
END;
GO

CREATE OR ALTER PROCEDURE dbo.SP_APP_PPR_PRELIMINARY_RUN_READ
  @program_id int,
  @source_id nvarchar(80),
  @cutoff_at nvarchar(40)
AS
BEGIN
  SET NOCOUNT ON;

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
END;
GO

CREATE OR ALTER PROCEDURE dbo.SP_APP_PPR_PRELIMINARY_VALUES
  @run_id int
AS
BEGIN
  SET NOCOUNT ON;

  SELECT
    activity_id,
    source_key,
    source_value
  FROM dbo.ppr_preliminary_values
  WHERE run_id = @run_id;
END;
GO

CREATE OR ALTER PROCEDURE dbo.SP_APP_PPR_PRELIMINARY_RUN_CREATE
  @program_id int,
  @source_id nvarchar(80),
  @source_label nvarchar(200),
  @source_procedure nvarchar(200),
  @range_start date,
  @range_end date,
  @cutoff_at nvarchar(40),
  @cutoff_label nvarchar(80),
  @rows_read int,
  @rows_matched int,
  @rows_unmatched int,
  @unmatched_json nvarchar(max),
  @manual_json nvarchar(max)
AS
BEGIN
  SET NOCOUNT ON;

  DECLARE @run TABLE (id INT);

  UPDATE dbo.ppr_preliminary_runs
  SET status = 'replaced'
  WHERE program_id = @program_id
    AND source_id = @source_id
    AND cutoff_at = CONVERT(DATETIMEOFFSET, @cutoff_at)
    AND status = 'completed';

  INSERT INTO dbo.ppr_preliminary_runs (
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
  )
  OUTPUT INSERTED.id INTO @run
  VALUES (
    @program_id,
    @source_id,
    @source_label,
    @source_procedure,
    @range_start,
    @range_end,
    CONVERT(DATETIMEOFFSET, @cutoff_at),
    @cutoff_label,
    SYSDATETIME(),
    SYSDATETIME(),
    'completed',
    @rows_read,
    @rows_matched,
    @rows_unmatched,
    @unmatched_json,
    @manual_json
  );

  SELECT TOP 1 id
  FROM @run;
END;
GO

CREATE OR ALTER PROCEDURE dbo.SP_APP_PPR_PRELIMINARY_VALUE_INSERT
  @run_id int,
  @program_id int,
  @activity_id int,
  @source_key nvarchar(80),
  @source_value decimal(18,2)
AS
BEGIN
  SET NOCOUNT ON;

  INSERT INTO dbo.ppr_preliminary_values (
    run_id,
    program_id,
    activity_id,
    source_key,
    source_value,
    loaded_at
  )
  VALUES (
    @run_id,
    @program_id,
    @activity_id,
    @source_key,
    @source_value,
    SYSDATETIME()
  );
END;
GO

CREATE OR ALTER PROCEDURE dbo.SP_APP_PPR_PERIOD_BY_YEAR_MONTH
  @year int,
  @month int
AS
BEGIN
  SET NOCOUNT ON;

  SELECT TOP 1
    id,
    is_open
  FROM dbo.ppr_periods
  WHERE [year] = @year
    AND [month] = @month;
END;
GO

CREATE OR ALTER PROCEDURE dbo.SP_APP_PPR_MONTHLY_VALUES_BY_PERIOD
  @period_id int
AS
BEGIN
  SET NOCOUNT ON;

  SELECT
    activity_id,
    value
  FROM dbo.ppr_monthly_values
  WHERE period_id = @period_id;
END;
GO

CREATE OR ALTER PROCEDURE dbo.SP_APP_PPR_PERIODOS_USUARIO
  @employee_id int
AS
BEGIN
  SET NOCOUNT ON;

  SELECT
    per.id,
    per.year,
    per.month,
    per.is_open,
    per.deadline,
    p.id AS program_id,
    p.code AS program_code,
    a.id AS activity_id,
    a.name AS activity_name,
    a.activity_group_code,
    mv.value,
    sig.signed_at
  FROM dbo.ppr_periods per
  INNER JOIN dbo.ppr_user_programs up
    ON up.employee_id = @employee_id
    AND up.is_active = 1
  INNER JOIN dbo.ppr_programs p
    ON p.id = up.program_id
  INNER JOIN dbo.ppr_activities a
    ON a.program_id = p.id
    AND ISNULL(a.is_active, 1) = 1
  LEFT JOIN dbo.ppr_monthly_values mv
    ON mv.activity_id = a.id
    AND mv.period_id = per.id
  LEFT JOIN dbo.ppr_signatures sig
    ON sig.employee_id = up.employee_id
    AND sig.period_id = per.id
    AND sig.is_valid = 1
    AND (sig.program_id = up.program_id OR sig.program_id IS NULL)
  ORDER BY per.year, per.month, p.code, a.sort_order, a.id;
END;
GO

CREATE OR ALTER PROCEDURE dbo.SP_APP_PPR_ADMIN_ACTIVIDADES_LIST
  @program_id int
AS
BEGIN
  SET NOCOUNT ON;

  SELECT
    a.id,
    a.program_id,
    p.code AS program_code,
    a.code,
    a.name,
    a.unit,
    a.annual_goal,
    a.sort_order,
    a.is_active,
    a.activity_group_code
  FROM dbo.ppr_activities a
  INNER JOIN dbo.ppr_programs p
    ON p.id = a.program_id
  WHERE a.program_id = @program_id
  ORDER BY ISNULL(a.is_active, 1) DESC, a.sort_order, a.id;
END;
GO

CREATE OR ALTER PROCEDURE dbo.SP_APP_PPR_UPDATE_ACTIVITY_GROUP
  @activity_id int,
  @activity_group_code nvarchar(30) = NULL
AS
BEGIN
  SET NOCOUNT ON;

  UPDATE dbo.ppr_activities
  SET activity_group_code = @activity_group_code
  WHERE id = @activity_id;
END;
GO

CREATE OR ALTER PROCEDURE dbo.SP_APP_PPR_RESUMEN_ANUAL
  @employee_id int,
  @year int
AS
BEGIN
  SET NOCOUNT ON;

  WITH months AS (
    SELECT 1 AS month UNION ALL SELECT 2 UNION ALL SELECT 3 UNION ALL SELECT 4
    UNION ALL SELECT 5 UNION ALL SELECT 6 UNION ALL SELECT 7 UNION ALL SELECT 8
    UNION ALL SELECT 9 UNION ALL SELECT 10 UNION ALL SELECT 11 UNION ALL SELECT 12
  )
  SELECT
    p.id AS program_id,
    p.code AS program_code,
    p.name AS program_name,
    a.id AS activity_id,
    a.name AS activity_name,
    a.activity_group_code,
    months.month,
    per.id AS period_id,
    mv.value,
    sig.signed_at
  FROM dbo.ppr_user_programs up
  INNER JOIN dbo.ppr_programs p
    ON p.id = up.program_id
  INNER JOIN dbo.ppr_activities a
    ON a.program_id = p.id
    AND ISNULL(a.is_active, 1) = 1
  CROSS JOIN months
  LEFT JOIN dbo.ppr_periods per
    ON per.year = @year
    AND per.month = months.month
  LEFT JOIN dbo.ppr_monthly_values mv
    ON mv.activity_id = a.id
    AND mv.period_id = per.id
  LEFT JOIN dbo.ppr_signatures sig
    ON sig.employee_id = up.employee_id
    AND sig.period_id = per.id
    AND sig.is_valid = 1
    AND (sig.program_id = up.program_id OR sig.program_id IS NULL)
  WHERE up.employee_id = @employee_id
    AND up.is_active = 1
  ORDER BY p.code, a.sort_order, a.id, months.month;
END;
GO
