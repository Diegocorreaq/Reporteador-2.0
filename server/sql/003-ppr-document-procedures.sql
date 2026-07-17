SET ANSI_NULLS ON;
GO
SET QUOTED_IDENTIFIER ON;
GO

CREATE OR ALTER PROCEDURE dbo.SP_APP_PPR_ENSURE_SIGNED_DOCUMENT_INFRASTRUCTURE
AS
BEGIN
  SET NOCOUNT ON;

  IF COL_LENGTH('dbo.ppr_activities', 'activity_group_code') IS NULL
    ALTER TABLE dbo.ppr_activities ADD activity_group_code NVARCHAR(30) NULL;

  IF COL_LENGTH('dbo.ppr_signatures', 'program_id') IS NULL
    ALTER TABLE dbo.ppr_signatures ADD program_id INT NULL;

  DECLARE @constraintName SYSNAME;

  DECLARE signatureConstraints CURSOR LOCAL FAST_FORWARD FOR
    SELECT kc.name
    FROM sys.key_constraints kc
    WHERE kc.parent_object_id = OBJECT_ID('dbo.ppr_signatures')
      AND kc.type = 'UQ'
      AND (
        SELECT COUNT(*)
        FROM sys.index_columns ic
        INNER JOIN sys.columns c
          ON c.object_id = ic.object_id
          AND c.column_id = ic.column_id
        WHERE ic.object_id = kc.parent_object_id
          AND ic.index_id = kc.unique_index_id
          AND c.name IN ('employee_id', 'period_id')
      ) = 2
      AND (
        SELECT COUNT(*)
        FROM sys.index_columns ic
        WHERE ic.object_id = kc.parent_object_id
          AND ic.index_id = kc.unique_index_id
      ) = 2;

  OPEN signatureConstraints;
  FETCH NEXT FROM signatureConstraints INTO @constraintName;
  WHILE @@FETCH_STATUS = 0
  BEGIN
    DECLARE @dropSignatureConstraintSql NVARCHAR(MAX);
    SET @dropSignatureConstraintSql = N'ALTER TABLE dbo.ppr_signatures DROP CONSTRAINT ' + QUOTENAME(@constraintName);
    EXEC sp_executesql @dropSignatureConstraintSql;
    FETCH NEXT FROM signatureConstraints INTO @constraintName;
  END
  CLOSE signatureConstraints;
  DEALLOCATE signatureConstraints;

  IF NOT EXISTS (
    SELECT 1
    FROM sys.indexes
    WHERE object_id = OBJECT_ID('dbo.ppr_signatures')
      AND name = 'UX_ppr_signatures_employee_period_program'
  )
    CREATE UNIQUE INDEX UX_ppr_signatures_employee_period_program
    ON dbo.ppr_signatures(employee_id, period_id, program_id);

  IF OBJECT_ID('dbo.ppr_signed_documents', 'U') IS NULL
  BEGIN
    CREATE TABLE dbo.ppr_signed_documents (
      id               INT IDENTITY(1,1) NOT NULL PRIMARY KEY,
      employee_id      INT NOT NULL,
      period_id        INT NOT NULL,
      program_id       INT NULL,
      document_code    NVARCHAR(80) NOT NULL,
      file_name        NVARCHAR(255) NOT NULL,
      mime_type        NVARCHAR(100) NOT NULL,
      pdf_data         VARBINARY(MAX) NOT NULL,
      document_hash    CHAR(64) NOT NULL,
      content_hash     CHAR(64) NOT NULL,
      signature_type   NVARCHAR(30) NOT NULL,
      signature_label  NVARCHAR(200) NOT NULL,
      signer_dni       NVARCHAR(30) NOT NULL,
      signer_name      NVARCHAR(200) NOT NULL,
      signed_at        DATETIME2 NOT NULL,
      created_at       DATETIME2 NOT NULL DEFAULT SYSDATETIME(),
      CONSTRAINT UQ_ppr_signed_documents_employee_period_program UNIQUE (employee_id, period_id, program_id)
    );
  END;

  IF COL_LENGTH('dbo.ppr_signed_documents', 'program_id') IS NULL
    ALTER TABLE dbo.ppr_signed_documents ADD program_id INT NULL;

  IF OBJECT_ID('dbo.UQ_ppr_signed_documents_employee_period', 'UQ') IS NOT NULL
    ALTER TABLE dbo.ppr_signed_documents DROP CONSTRAINT UQ_ppr_signed_documents_employee_period;

  IF NOT EXISTS (
    SELECT 1
    FROM sys.indexes
    WHERE object_id = OBJECT_ID('dbo.ppr_signed_documents')
      AND name = 'UX_ppr_signed_documents_employee_period_program'
  )
    CREATE UNIQUE INDEX UX_ppr_signed_documents_employee_period_program
    ON dbo.ppr_signed_documents(employee_id, period_id, program_id);

  EXEC(N'
    CREATE OR ALTER PROCEDURE dbo.SP_PPR_ACTIVIDADES_PROGRAMA
      @program_id INT,
      @period_id INT,
      @employee_id INT
    AS
    BEGIN
      SET NOCOUNT ON;

      SELECT
        a.id,
        a.code,
        a.name,
        a.unit,
        a.annual_goal,
        a.activity_group_code,
        a.sort_order,
        mv.value,
        mv.notes,
        mv.value_source,
        mv.source_key,
        mv.source_value,
        mv.loaded_at,
        mv.validated_at,
        mv.validation_status,
        s.signed_at
      FROM dbo.ppr_activities a
      LEFT JOIN dbo.ppr_monthly_values mv
        ON mv.activity_id = a.id
        AND mv.period_id = @period_id
      LEFT JOIN dbo.ppr_signatures s
        ON s.employee_id = @employee_id
        AND s.period_id = @period_id
        AND s.is_valid = 1
        AND (s.program_id = @program_id OR s.program_id IS NULL)
      WHERE a.program_id = @program_id
        AND ISNULL(a.is_active, 1) = 1
      ORDER BY a.sort_order, a.id;
    END
  ');
END;
GO

CREATE OR ALTER PROCEDURE dbo.SP_APP_PPR_SIGNING_PERIOD
  @employee_id int,
  @period_id int,
  @program_id int = NULL
AS
BEGIN
  SET NOCOUNT ON;

  SELECT per.id, per.year, per.month, per.is_open, sig.signed_at
  FROM dbo.ppr_periods per
  LEFT JOIN dbo.ppr_signatures sig
    ON sig.employee_id = @employee_id
    AND sig.period_id = per.id
    AND sig.is_valid = 1
    AND (sig.program_id = @program_id OR sig.program_id IS NULL)
  WHERE per.id = @period_id;
END;
GO

CREATE OR ALTER PROCEDURE dbo.SP_APP_PPR_SIGNING_SUMMARY
  @employee_id int,
  @period_id int,
  @program_id int = NULL
AS
BEGIN
  SET NOCOUNT ON;

  SELECT
    COUNT(DISTINCT a.id) AS total_activities,
    COUNT(DISTINCT CASE WHEN mv.value IS NOT NULL THEN a.id END) AS with_value,
    COUNT(DISTINCT CASE WHEN mv.validation_status = 'validated' THEN a.id END) AS validated
  FROM dbo.ppr_user_programs up
  INNER JOIN dbo.ppr_activities a
    ON a.program_id = up.program_id
    AND ISNULL(a.is_active, 1) = 1
  LEFT JOIN dbo.ppr_monthly_values mv
    ON mv.activity_id = a.id
    AND mv.period_id = @period_id
  WHERE up.employee_id = @employee_id
    AND up.is_active = 1
    AND (@program_id IS NULL OR up.program_id = @program_id);
END;
GO

CREATE OR ALTER PROCEDURE dbo.SP_APP_PPR_SIGNING_ROWS
  @employee_id int,
  @period_id int,
  @program_id int = NULL,
  @year int,
  @month int
AS
BEGIN
  SET NOCOUNT ON;

  SELECT
    p.id AS program_id,
    p.code AS program_code,
    p.name AS program_name,
    a.id AS activity_id,
    a.code AS activity_code,
    a.name AS activity_name,
    a.activity_group_code,
    a.unit,
    a.annual_goal,
    mv.value AS month_value,
    mv.validation_status,
    totals.accumulated_value
  FROM dbo.ppr_user_programs up
  INNER JOIN dbo.ppr_programs p
    ON p.id = up.program_id
  INNER JOIN dbo.ppr_activities a
    ON a.program_id = p.id
    AND ISNULL(a.is_active, 1) = 1
  LEFT JOIN dbo.ppr_monthly_values mv
    ON mv.activity_id = a.id
    AND mv.period_id = @period_id
  OUTER APPLY (
    SELECT SUM(previous_mv.value) AS accumulated_value
    FROM dbo.ppr_monthly_values previous_mv
    INNER JOIN dbo.ppr_periods previous_period
      ON previous_period.id = previous_mv.period_id
    WHERE previous_mv.activity_id = a.id
      AND previous_period.year = @year
      AND previous_period.month <= @month
  ) totals
  WHERE up.employee_id = @employee_id
    AND up.is_active = 1
    AND (@program_id IS NULL OR up.program_id = @program_id)
  ORDER BY p.code, a.sort_order, a.id;
END;
GO

CREATE OR ALTER PROCEDURE dbo.SP_APP_PPR_SIGN_SAVE_DOCUMENT
  @employee_id int,
  @period_id int,
  @program_id int,
  @signed_at datetime2,
  @document_code nvarchar(80),
  @file_name nvarchar(255),
  @mime_type nvarchar(100),
  @pdf_data varbinary(max),
  @document_hash char(64),
  @content_hash char(64),
  @signature_type nvarchar(30),
  @signature_label nvarchar(200),
  @signer_dni nvarchar(30),
  @signer_name nvarchar(200)
AS
BEGIN
  SET NOCOUNT ON;

  MERGE dbo.ppr_signatures AS target
  USING (SELECT @employee_id AS employee_id, @period_id AS period_id, @program_id AS program_id) AS source
    ON target.employee_id = source.employee_id
    AND target.period_id = source.period_id
    AND target.program_id = source.program_id
  WHEN MATCHED THEN
    UPDATE SET signed_at = @signed_at, is_valid = 1
  WHEN NOT MATCHED THEN
    INSERT (employee_id, period_id, program_id, signed_at, is_valid)
    VALUES (@employee_id, @period_id, @program_id, @signed_at, 1);

  MERGE dbo.ppr_signed_documents AS target
  USING (SELECT @employee_id AS employee_id, @period_id AS period_id, @program_id AS program_id) AS source
    ON target.employee_id = source.employee_id
    AND target.period_id = source.period_id
    AND target.program_id = source.program_id
  WHEN MATCHED THEN
    UPDATE SET
      document_code = @document_code,
      file_name = @file_name,
      mime_type = @mime_type,
      pdf_data = @pdf_data,
      document_hash = @document_hash,
      content_hash = @content_hash,
      signature_type = @signature_type,
      signature_label = @signature_label,
      signer_dni = @signer_dni,
      signer_name = @signer_name,
      signed_at = @signed_at,
      created_at = SYSDATETIME()
  WHEN NOT MATCHED THEN
    INSERT (
      employee_id, period_id, program_id, document_code, file_name, mime_type, pdf_data,
      document_hash, content_hash, signature_type, signature_label,
      signer_dni, signer_name, signed_at
    )
    VALUES (
      @employee_id, @period_id, @program_id, @document_code, @file_name, @mime_type, @pdf_data,
      @document_hash, @content_hash, @signature_type, @signature_label,
      @signer_dni, @signer_name, @signed_at
    );

  SELECT id, document_code, file_name, document_hash, content_hash, signature_type, signed_at
  FROM dbo.ppr_signed_documents
  WHERE employee_id = @employee_id
    AND period_id = @period_id
    AND program_id = @program_id;
END;
GO

CREATE OR ALTER PROCEDURE dbo.SP_APP_PPR_SIGNED_DOCUMENT_INFO
  @employee_id int,
  @period_id int,
  @program_id int
AS
BEGIN
  SET NOCOUNT ON;

  SELECT id, document_code, file_name, document_hash, content_hash,
    signature_type, signature_label, signer_dni, signer_name, signed_at
  FROM dbo.ppr_signed_documents
  WHERE employee_id = @employee_id
    AND period_id = @period_id
    AND (program_id = @program_id OR program_id IS NULL)
  ORDER BY CASE WHEN program_id = @program_id THEN 0 ELSE 1 END;
END;
GO

CREATE OR ALTER PROCEDURE dbo.SP_APP_PPR_SIGNED_DOCUMENT_FILE
  @employee_id int,
  @period_id int,
  @program_id int
AS
BEGIN
  SET NOCOUNT ON;

  SELECT file_name, mime_type, pdf_data
  FROM dbo.ppr_signed_documents
  WHERE employee_id = @employee_id
    AND period_id = @period_id
    AND (program_id = @program_id OR program_id IS NULL)
  ORDER BY CASE WHEN program_id = @program_id THEN 0 ELSE 1 END;
END;
GO

CREATE OR ALTER PROCEDURE dbo.SP_APP_PPR_ENSURE_PROGRAM_DOCUMENT_INFRASTRUCTURE
AS
BEGIN
  SET NOCOUNT ON;

  IF OBJECT_ID('dbo.ppr_program_documents', 'U') IS NULL
  BEGIN
    CREATE TABLE dbo.ppr_program_documents (
      id              INT IDENTITY(1,1) NOT NULL PRIMARY KEY,
      program_id      INT NOT NULL,
      document_type   NVARCHAR(60) NOT NULL,
      document_key    NVARCHAR(120) NULL,
      document_year   INT NOT NULL,
      version_label   NVARCHAR(80) NOT NULL,
      display_name    NVARCHAR(250) NOT NULL,
      file_name       NVARCHAR(255) NOT NULL,
      mime_type       NVARCHAR(120) NOT NULL,
      file_data       VARBINARY(MAX) NULL,
      file_size_bytes INT NOT NULL,
      content_hash    CHAR(64) NULL,
      source_url      NVARCHAR(1000) NULL,
      sort_order      INT NOT NULL CONSTRAINT DF_ppr_program_documents_sort_order DEFAULT 0,
      is_current      BIT NOT NULL CONSTRAINT DF_ppr_program_documents_is_current DEFAULT 1,
      uploaded_by     INT NULL,
      uploaded_at     DATETIME2 NOT NULL CONSTRAINT DF_ppr_program_documents_uploaded_at DEFAULT SYSDATETIME(),
      notes           NVARCHAR(MAX) NULL,
      CONSTRAINT FK_ppr_program_documents_program
        FOREIGN KEY (program_id) REFERENCES dbo.ppr_programs(id)
    );
  END;

  IF COL_LENGTH('dbo.ppr_program_documents', 'document_year') IS NULL
    ALTER TABLE dbo.ppr_program_documents ADD document_year INT NOT NULL CONSTRAINT DF_ppr_program_documents_document_year DEFAULT YEAR(GETDATE());

  IF COL_LENGTH('dbo.ppr_program_documents', 'document_key') IS NULL
    ALTER TABLE dbo.ppr_program_documents ADD document_key NVARCHAR(120) NULL;

  IF COL_LENGTH('dbo.ppr_program_documents', 'version_label') IS NULL
    ALTER TABLE dbo.ppr_program_documents ADD version_label NVARCHAR(80) NOT NULL CONSTRAINT DF_ppr_program_documents_version_label DEFAULT N'vigente';

  IF COL_LENGTH('dbo.ppr_program_documents', 'file_size_bytes') IS NULL
    ALTER TABLE dbo.ppr_program_documents ADD file_size_bytes INT NOT NULL CONSTRAINT DF_ppr_program_documents_file_size DEFAULT 0;

  IF COL_LENGTH('dbo.ppr_program_documents', 'content_hash') IS NULL
    ALTER TABLE dbo.ppr_program_documents ADD content_hash CHAR(64) NULL;

  IF EXISTS (
    SELECT 1
    FROM sys.columns
    WHERE object_id = OBJECT_ID('dbo.ppr_program_documents')
      AND name = 'file_data'
      AND is_nullable = 0
  )
    ALTER TABLE dbo.ppr_program_documents ALTER COLUMN file_data VARBINARY(MAX) NULL;

  IF EXISTS (
    SELECT 1
    FROM sys.columns
    WHERE object_id = OBJECT_ID('dbo.ppr_program_documents')
      AND name = 'content_hash'
      AND is_nullable = 0
  )
    ALTER TABLE dbo.ppr_program_documents ALTER COLUMN content_hash CHAR(64) NULL;

  IF COL_LENGTH('dbo.ppr_program_documents', 'source_url') IS NULL
    ALTER TABLE dbo.ppr_program_documents ADD source_url NVARCHAR(1000) NULL;

  IF COL_LENGTH('dbo.ppr_program_documents', 'sort_order') IS NULL
    ALTER TABLE dbo.ppr_program_documents ADD sort_order INT NOT NULL CONSTRAINT DF_ppr_program_documents_sort_order_late DEFAULT 0;

  IF COL_LENGTH('dbo.ppr_program_documents', 'is_current') IS NULL
    ALTER TABLE dbo.ppr_program_documents ADD is_current BIT NOT NULL CONSTRAINT DF_ppr_program_documents_is_current_late DEFAULT 1;

  IF COL_LENGTH('dbo.ppr_program_documents', 'uploaded_by') IS NULL
    ALTER TABLE dbo.ppr_program_documents ADD uploaded_by INT NULL;

  IF COL_LENGTH('dbo.ppr_program_documents', 'uploaded_at') IS NULL
    ALTER TABLE dbo.ppr_program_documents ADD uploaded_at DATETIME2 NOT NULL CONSTRAINT DF_ppr_program_documents_uploaded_at_late DEFAULT SYSDATETIME();

  IF COL_LENGTH('dbo.ppr_program_documents', 'notes') IS NULL
    ALTER TABLE dbo.ppr_program_documents ADD notes NVARCHAR(MAX) NULL;

  IF NOT EXISTS (
    SELECT 1
    FROM sys.indexes
    WHERE object_id = OBJECT_ID('dbo.ppr_program_documents')
      AND name = 'IX_ppr_program_documents_program_type_year'
  )
    EXEC(N'CREATE INDEX IX_ppr_program_documents_program_type_year
    ON dbo.ppr_program_documents(program_id, document_type, document_year DESC, uploaded_at DESC);');

  IF EXISTS (
    SELECT 1
    FROM sys.indexes
    WHERE object_id = OBJECT_ID('dbo.ppr_program_documents')
      AND name = 'UX_ppr_program_documents_current'
  )
    DROP INDEX UX_ppr_program_documents_current ON dbo.ppr_program_documents;

  IF NOT EXISTS (
    SELECT 1
    FROM sys.indexes
    WHERE object_id = OBJECT_ID('dbo.ppr_program_documents')
      AND name = 'IX_ppr_program_documents_current_list'
  )
    EXEC(N'CREATE INDEX IX_ppr_program_documents_current_list
    ON dbo.ppr_program_documents(program_id, document_type, is_current, sort_order, display_name);');

  IF NOT EXISTS (
    SELECT 1
    FROM sys.indexes
    WHERE object_id = OBJECT_ID('dbo.ppr_program_documents')
      AND name = 'UX_ppr_program_documents_document_key'
  )
    EXEC(N'CREATE UNIQUE INDEX UX_ppr_program_documents_document_key
    ON dbo.ppr_program_documents(program_id, document_type, document_key)
    WHERE document_key IS NOT NULL;');
END;
GO

CREATE OR ALTER PROCEDURE dbo.SP_APP_PPR_FIND_PROGRAM_BY_CODE
  @program_code nvarchar(30),
  @normalized_program_code nvarchar(30),
  @padded_program_code nvarchar(30)
AS
BEGIN
  SET NOCOUNT ON;

  SELECT TOP 1 id, code, name
  FROM dbo.ppr_programs
  WHERE code IN (@program_code, @normalized_program_code, @padded_program_code)
  ORDER BY id;
END;
GO

CREATE OR ALTER PROCEDURE dbo.SP_APP_PPR_CAN_ACCESS_PROGRAM_DOCUMENT
  @employee_id int,
  @program_code nvarchar(30),
  @normalized_program_code nvarchar(30),
  @padded_program_code nvarchar(30)
AS
BEGIN
  SET NOCOUNT ON;

  SELECT CASE
    WHEN EXISTS (
      SELECT 1
      FROM dbo.ppr_programs p
      INNER JOIN dbo.ppr_user_programs up
        ON up.program_id = p.id
        AND up.employee_id = @employee_id
        AND up.is_active = 1
      WHERE p.code IN (@program_code, @normalized_program_code, @padded_program_code)
    )
    OR EXISTS (
      SELECT 1
      FROM dbo.ppr_coordinadores c
      WHERE c.idempleado = @employee_id
        AND ISNULL(c.activo, 1) = 1
    )
    THEN 1 ELSE 0
  END AS allowed;
END;
GO

CREATE OR ALTER PROCEDURE dbo.SP_APP_PPR_PROGRAM_DOCUMENT_FILE
  @program_code nvarchar(30),
  @normalized_program_code nvarchar(30),
  @padded_program_code nvarchar(30),
  @document_type nvarchar(60)
AS
BEGIN
  SET NOCOUNT ON;

  SELECT TOP 1
    d.id,
    d.document_type,
    d.document_key,
    d.document_year,
    d.version_label,
    d.display_name,
    d.file_name,
    d.mime_type,
    d.file_data,
    d.file_size_bytes,
    d.content_hash,
    d.source_url,
    d.sort_order,
    d.uploaded_at,
    d.notes,
    p.code AS program_code,
    p.name AS program_name
  FROM dbo.ppr_program_documents d
  INNER JOIN dbo.ppr_programs p
    ON p.id = d.program_id
  WHERE d.document_type = @document_type
    AND d.is_current = 1
    AND p.code IN (@program_code, @normalized_program_code, @padded_program_code)
  ORDER BY d.document_year DESC, d.uploaded_at DESC, d.id DESC;
END;
GO

CREATE OR ALTER PROCEDURE dbo.SP_APP_PPR_PROGRAM_DOCUMENT_LIST
  @program_code nvarchar(30),
  @normalized_program_code nvarchar(30),
  @padded_program_code nvarchar(30),
  @document_type nvarchar(60)
AS
BEGIN
  SET NOCOUNT ON;

  SELECT
    d.id,
    d.document_type,
    d.document_key,
    d.document_year,
    d.version_label,
    d.display_name,
    d.file_name,
    d.mime_type,
    d.file_size_bytes,
    d.content_hash,
    d.source_url,
    d.sort_order,
    d.uploaded_at,
    d.notes,
    p.code AS program_code,
    p.name AS program_name
  FROM dbo.ppr_program_documents d
  INNER JOIN dbo.ppr_programs p
    ON p.id = d.program_id
  WHERE d.document_type = @document_type
    AND d.is_current = 1
    AND p.code IN (@program_code, @normalized_program_code, @padded_program_code)
  ORDER BY d.sort_order, d.display_name, d.document_year DESC, d.uploaded_at DESC, d.id DESC;
END;
GO

CREATE OR ALTER PROCEDURE dbo.SP_APP_PPR_PROGRAM_DOCUMENT_CLEAR_CURRENT
  @program_id int,
  @document_type nvarchar(60)
AS
BEGIN
  SET NOCOUNT ON;

  UPDATE dbo.ppr_program_documents
  SET is_current = 0
  WHERE program_id = @program_id
    AND document_type = @document_type
    AND is_current = 1;
END;
GO

CREATE OR ALTER PROCEDURE dbo.SP_APP_PPR_PROGRAM_DOCUMENT_INSERT
  @program_id int,
  @document_type nvarchar(60),
  @document_key nvarchar(120) = NULL,
  @document_year int,
  @version_label nvarchar(80),
  @display_name nvarchar(250),
  @file_name nvarchar(255),
  @mime_type nvarchar(120),
  @file_data varbinary(max),
  @file_size_bytes int,
  @content_hash char(64) = NULL,
  @source_url nvarchar(1000) = NULL,
  @sort_order int = 0,
  @is_current bit,
  @uploaded_by int = NULL,
  @notes nvarchar(max) = NULL
AS
BEGIN
  SET NOCOUNT ON;

  INSERT INTO dbo.ppr_program_documents (
    program_id,
    document_type,
    document_key,
    document_year,
    version_label,
    display_name,
    file_name,
    mime_type,
    file_data,
    file_size_bytes,
    content_hash,
    source_url,
    sort_order,
    is_current,
    uploaded_by,
    notes
  )
  OUTPUT INSERTED.id
  VALUES (
    @program_id,
    @document_type,
    @document_key,
    @document_year,
    @version_label,
    @display_name,
    @file_name,
    @mime_type,
    @file_data,
    @file_size_bytes,
    @content_hash,
    @source_url,
    @sort_order,
    @is_current,
    @uploaded_by,
    @notes
  );
END;
GO
