SET ANSI_NULLS ON;
GO
SET QUOTED_IDENTIFIER ON;
GO

CREATE OR ALTER PROCEDURE dbo.SP_APP_LEGACY_DIAGNOSTICOS_BY_ATENCION_CSV
  @atencion_ids nvarchar(max)
AS
BEGIN
  SET NOCOUNT ON;

  WITH ids AS (
    SELECT DISTINCT TRY_CONVERT(int, value) AS IdAtencion
    FROM STRING_SPLIT(@atencion_ids, ',')
    WHERE TRY_CONVERT(int, value) IS NOT NULL
  )
  SELECT
    AD.IdAtencion,
    DIAG.CodigoCIE10 AS CodigoCie10,
    SC.Descripcion AS TipoDx,
    DIAG.Descripcion AS DescripcionDx
  FROM SIGH..AtencionesDiagnosticos AD WITH (NOLOCK)
  INNER JOIN ids
    ON ids.IdAtencion = AD.IdAtencion
  LEFT JOIN SIGH..Diagnosticos DIAG WITH (NOLOCK)
    ON DIAG.IdDiagnostico = AD.IdDiagnostico
  LEFT JOIN SIGH..SubClasificacionDiagnosticos SC WITH (NOLOCK)
    ON SC.IdSubclasificacionDx = AD.IdSubclasificacionDx
  WHERE AD.IdClasificacionDx IN (1, 2)
    AND DIAG.Descripcion IS NOT NULL
  ORDER BY AD.IdAtencion, AD.IdAtencionDiagnostico;
END;
GO

CREATE OR ALTER PROCEDURE dbo.SP_APP_LEGACY_DX_EVOLUTION_RANK_CSV
  @atencion_ids nvarchar(max)
AS
BEGIN
  SET NOCOUNT ON;

  WITH ids AS (
    SELECT DISTINCT TRY_CONVERT(int, value) AS IdAtencion
    FROM STRING_SPLIT(@atencion_ids, ',')
    WHERE TRY_CONVERT(int, value) IS NOT NULL
  )
  SELECT
    ED1.IdAtencion,
    CONVERT(VARCHAR(500), DIAG.Descripcion) AS Descripcion,
    MAX(ED1.IdAtencionDiagnostico) AS MaxDiagnosticoId
  FROM EvoHeves..evoDiagnostico ED1 WITH (NOLOCK)
  INNER JOIN ids
    ON ids.IdAtencion = ED1.IdAtencion
  LEFT JOIN SIGH..Diagnosticos DIAG WITH (NOLOCK)
    ON DIAG.IdDiagnostico = ED1.IdDiagnostico
  WHERE ED1.estado = 1
    AND DIAG.Descripcion IS NOT NULL
  GROUP BY ED1.IdAtencion, DIAG.Descripcion;
END;
GO

CREATE OR ALTER PROCEDURE dbo.SP_APP_LEGACY_RECOVERED_ATENDIDOS_CSV
  @fecha_inicio nvarchar(20),
  @fecha_fin nvarchar(20),
  @account_ids nvarchar(max)
AS
BEGIN
  SET NOCOUNT ON;

  WITH account_ids AS (
    SELECT DISTINCT TRY_CONVERT(int, value) AS IdCuentaAtencion
    FROM STRING_SPLIT(@account_ids, ',')
    WHERE TRY_CONVERT(int, value) IS NOT NULL
  )
  SELECT
    FC.IdCuentaAtencion AS IdCuentaAtencion,
    A.IdAtencion,
    EC.Descripcion AS EstadoCuenta,
    FC.FechaRegistro AS FechaRegistroCuenta,
    FOS.FechaCreacion AS FechaCreaOrden,
    U.DES_UPSS AS UpssAtencion,
    S.DES_CONSULTORIO AS ConsultorioAtencion,
    ACT.FechaActividad AS FechaActividad,
    A.HoraIngreso,
    A.FyHInicioI,
    A.FyHFinal,
    UPPER(P.ApellidoPaterno + ' ' + P.ApellidoMaterno + ' ' + ISNULL(P.PrimerNombre, '') + ' ' + ISNULL(P.SegundoNombre, '')) AS NombrePaciente,
    OA.Descripcion AS OrigenAtencion,
    FF.Descripcion AS FuenteFinanciamiento,
    ISNULL(REPLACE(REPLACE(REPLACE(CONVERT(nvarchar(max), ASS.Descripcion), CHAR(10), ' '), CHAR(13), ' '), CHAR(9), ' '), '') AS Aseguradora,
    ISNULL(REPLACE(REPLACE(REPLACE(CONVERT(nvarchar(max), TG.Descripcion), CHAR(10), ' '), CHAR(13), ' '), CHAR(9), ' '), '') AS Prioridad,
    UPPER(EM.ApellidoPaterno + ' ' + EM.ApellidoMaterno + ' ' + EM.Nombres) AS ProfesionalAtendio,
    TE.Descripcion AS EspecialidadProfesional,
    EA.Descripcion AS EstadoAtencion,
    FC.IdUsuarioCrea AS CodigoEmpleado,
    UPPER(EM1.ApellidoPaterno + ' ' + EM1.ApellidoMaterno + ' ' + EM1.Nombres) AS EmpleadoCrea,
    TE1.Descripcion AS TipoEmpleado,
    ISNULL(EESSX.EESS, '') AS EessAdscripcion
  FROM SIGH..FacturacionCuentasAtencion FC WITH (NOLOCK)
  INNER JOIN account_ids account_filter
    ON account_filter.IdCuentaAtencion = FC.IdCuentaAtencion
  LEFT JOIN SIGH..Atenciones A WITH (NOLOCK)
    ON A.IdCuentaAtencion = FC.IdCuentaAtencion
  LEFT JOIN SIGH..Pacientes P WITH (NOLOCK)
    ON P.IdPaciente = A.IdPaciente
  LEFT JOIN SIGH_EST..T_Upss_Consultorio S WITH (NOLOCK)
    ON S.cod_Consultorio = A.IdServicioIngreso
  LEFT JOIN SIGH_EST..T_Upss U WITH (NOLOCK)
    ON U.cod_upss = S.cod_Upss
  LEFT JOIN SIGH..Medicos M WITH (NOLOCK)
    ON M.IdMedico = A.IdMedicoIngreso
  LEFT JOIN SIGH..Empleados EM WITH (NOLOCK)
    ON EM.IdEmpleado = M.IdEmpleado
  LEFT JOIN SIGH..TiposEmpleado TE WITH (NOLOCK)
    ON TE.IdTipoEmpleado = EM.IdTipoEmpleado
  LEFT JOIN SIGH..EstadosAtencion EA WITH (NOLOCK)
    ON EA.IdEstadoAtencion = A.idEstadoAtencion
  LEFT JOIN SIGH..Empleados EM1 WITH (NOLOCK)
    ON EM1.IdEmpleado = FC.IdUsuarioCrea
  LEFT JOIN SIGH..TiposEmpleado TE1 WITH (NOLOCK)
    ON TE1.IdTipoEmpleado = EM1.IdTipoEmpleado
  LEFT JOIN SIGH..TiposOrigenAtencion OA WITH (NOLOCK)
    ON OA.IdOrigenAtencion = A.IdOrigenAtencion
  LEFT JOIN SIGH..FuentesFinanciamiento FF WITH (NOLOCK)
    ON FF.IdFuenteFinanciamiento = A.idFuenteFinanciamiento
  LEFT JOIN SIGH..TiposGravedadAtencion TG WITH (NOLOCK)
    ON TG.IdTipoGravedad = A.IdTipoGravedad
  LEFT JOIN SIGH..AseguradorasxAtencion AA WITH (NOLOCK)
    ON AA.idCuentaAtencion = A.IdCuentaAtencion
  LEFT JOIN SIGH..Aseguradoras ASS WITH (NOLOCK)
    ON ASS.idAseguradora = AA.idAseguradora
  LEFT JOIN SIGH..EstadosCuenta EC WITH (NOLOCK)
    ON EC.IdEstado = FC.IdEstado
  LEFT JOIN (
    SELECT IdCuentaAtencion, MIN(FechaCreacion) AS FechaCreacion
    FROM SIGH..FactOrdenServicio WITH (NOLOCK)
    GROUP BY IdCuentaAtencion
  ) FOS
    ON FOS.IdCuentaAtencion = FC.IdCuentaAtencion
  LEFT JOIN (
    SELECT idCuentaAtencion, MIN(CAST(FechaReceta AS date)) AS FechaActividad
    FROM SIGH..RecetaCabecera WITH (NOLOCK)
    WHERE idEstado IN (1, 2, 3)
      AND CAST(FechaReceta AS date) BETWEEN @fecha_inicio AND @fecha_fin
    GROUP BY idCuentaAtencion
  ) ACT
    ON ACT.idCuentaAtencion = FC.IdCuentaAtencion
  LEFT JOIN (
    SELECT D1.IdCuentaAtencion, D2.EESS
    FROM (
      SELECT SA.IdCuentaAtencion, RIGHT(MAX(SF.CodigoEstablAdscripcion), 5) AS IdEESS
      FROM SIGH_EXTERNA..SisFuaAtencion SA
      LEFT JOIN SIGH_EXTERNA..SisFiliaciones SF
        ON SF.idSiasis = SA.idSiasis
      GROUP BY SA.IdCuentaAtencion
    ) D1
    LEFT JOIN (
      SELECT Codigo, Nombre AS EESS
      FROM SIGH..Establecimientos
    ) D2
      ON D1.IdEESS COLLATE SQL_Latin1_General_CP1_CI_AS = D2.Codigo
  ) EESSX
    ON EESSX.IdCuentaAtencion = FC.IdCuentaAtencion
  WHERE ACT.FechaActividad IS NOT NULL
    AND CAST(A.FechaIngreso AS date) NOT BETWEEN @fecha_inicio AND @fecha_fin;
END;
GO

CREATE OR ALTER PROCEDURE dbo.SP_APP_LEGACY_RECOVERED_TELEMONITOREO_CSV
  @fecha_inicio nvarchar(20),
  @fecha_fin nvarchar(20),
  @account_ids nvarchar(max)
AS
BEGIN
  SET NOCOUNT ON;

  WITH account_ids AS (
    SELECT DISTINCT TRY_CONVERT(int, value) AS IdCuentaAtencion
    FROM STRING_SPLIT(@account_ids, ',')
    WHERE TRY_CONVERT(int, value) IS NOT NULL
  )
  SELECT
    SR.des_Servicio AS Servicio,
    S.des_Consultorio AS Consultorio,
    ACT.FechaActividad AS FechaActividad,
    ISNULL(TE.Turno, '') AS Turno,
    A.HoraIngreso,
    ES.Nombre AS EstablecimientoSalud,
    DR.NroReferencia AS NroReferencia,
    DR.FechaReferencia AS FechaReferencia,
    ADA.NroExpediente AS NroExpediente,
    P.NroHistoriaClinica AS NroHistoriaClinica,
    A.IdCuentaAtencion AS Cuenta,
    UPPER(LTRIM(RTRIM(P.ApellidoPaterno)) + ' ' + LTRIM(RTRIM(P.ApellidoMaterno)) + ' ' + RTRIM(LTRIM(ISNULL(P.PrimerNombre, ''))) +
      CASE WHEN P.SegundoNombre IS NULL THEN '' ELSE ' ' END + RTRIM(LTRIM(ISNULL(P.SegundoNombre, ''))) +
      CASE WHEN P.TercerNombre IS NULL THEN '' ELSE ' ' END + RTRIM(LTRIM(ISNULL(P.TercerNombre, '')))) AS NombrePaciente,
    TD.Descripcion AS TipoDocumento,
    P.NroDocumento AS NroDocumento,
    UPPER(TS.Descripcion) AS Sexo,
    A.Edad AS Edad,
    UPPER(TED.Descripcion) AS TipoEdad,
    P.Telefono AS Telefono1,
    P.Telefono2 AS Telefono2,
    P.Telefono3 AS Telefono3,
    EM.DNI AS NroDocumentoProfesional,
    UPPER(EM.ApellidoPaterno + ' ' + EM.ApellidoMaterno + ' ' + EM.Nombres) AS NombreProfesional,
    TEM.Descripcion AS EspecialidadProfesional,
    ISNULL(DA.Descripcion, 'NO ATENDIDO') AS DestinoAtencion,
    CASE WHEN ADA.AltaDefinitiva = 1 THEN 'Alta Definitiva' ELSE '' END AS TipoAlta,
    CAST(CAST(ADA.ProximaCita AS date) AS varchar(10)) AS ProximaCita,
    ADA.MotivoProximaCita AS MotivoCita,
    ISNULL(CASE WHEN RX.idCuentaAtencion IS NULL THEN 'NO' ELSE 'SI' END, '') AS EmitioReceta,
    ISNULL(CASE
      WHEN RX.Ctda_Pedida >= RX.Ctda_Despcahada AND RX.Ctda_Despcahada > 0 THEN 'SI'
      WHEN RX.Ctda_Despcahada = 0 AND RX.Ctda_Pedida > 0 THEN 'NO'
    END, '') AS AtendioReceta,
    EC.Descripcion AS EstadoCuenta,
    UPPER(EM1.ApellidoPaterno + ' ' + EM1.ApellidoMaterno + ' ' + EM1.Nombres) AS CreaCuenta,
    CASE WHEN (
      SELECT COUNT(A1.IdAtencion)
      FROM SIGH..Atenciones A1
      LEFT JOIN SIGH..FacturacionCuentasAtencion FC1
        ON FC1.IdCuentaAtencion = A1.IdCuentaAtencion
      WHERE A1.IdPaciente = A.IdPaciente
        AND A1.FechaIngreso <= A.FechaIngreso
        AND A1.IdEstadoAtencion IN (1, 2)
        AND FC1.IdEstado <> 9
    ) <= 1 THEN 'Nuevo' ELSE 'Continuador' END AS CondicionPaciente,
    CASE WHEN A.FyHInicioI IS NULL THEN 'NO' ELSE 'SI' END AS SeAtendio,
    CASE WHEN D5.idCuentaAtencion IS NULL THEN 'NO' ELSE 'SI' END AS FichaHcFirmada,
    CASE WHEN D4.idCuentaAtencion IS NULL THEN 'NO' ELSE 'SI' END AS FuaFirmada,
    FF.Descripcion AS FuenteFinanciamiento
  FROM SIGH..Atenciones A WITH (NOLOCK)
  INNER JOIN account_ids account_filter
    ON account_filter.IdCuentaAtencion = A.IdCuentaAtencion
  LEFT JOIN SIGH..Citas C WITH (NOLOCK)
    ON C.IdAtencion = A.IdAtencion
  LEFT JOIN SIGH..ProgramacionMedica PM WITH (NOLOCK)
    ON PM.IdProgramacion = C.IdProgramacion
  LEFT JOIN SIGH..Turnos T WITH (NOLOCK)
    ON T.IdTurno = PM.IdTurno
  LEFT JOIN SIGH..TurnoE TE WITH (NOLOCK)
    ON TE.IdTurno = T.IdTurno
  LEFT JOIN SIGH_EST..T_Upss_Consultorio S WITH (NOLOCK)
    ON S.cod_Consultorio = A.IdServicioIngreso
  LEFT JOIN SIGH_EST..T_Upss_Servicio SR WITH (NOLOCK)
    ON SR.cod_Servicio = S.cod_Servicio
  LEFT JOIN SIGH..Pacientes P WITH (NOLOCK)
    ON P.IdPaciente = A.IdPaciente
  LEFT JOIN SIGH..TiposDocIdentidad TD WITH (NOLOCK)
    ON TD.IdDocIdentidad = P.IdDocIdentidad
  LEFT JOIN SIGH..Medicos ME WITH (NOLOCK)
    ON ME.IdMedico = A.IdMedicoIngreso
  LEFT JOIN SIGH..Empleados EM WITH (NOLOCK)
    ON EM.IdEmpleado = ME.IdEmpleado
  LEFT JOIN SIGH..TiposEmpleado TEM WITH (NOLOCK)
    ON TEM.IdTipoEmpleado = EM.IdTipoEmpleado
  LEFT JOIN SIGH..TiposEdad TED WITH (NOLOCK)
    ON TED.IdTipoEdad = A.IdTipoEdad
  LEFT JOIN SIGH..TiposSexo TS WITH (NOLOCK)
    ON TS.IdTipoSexo = P.IdTipoSexo
  LEFT JOIN SIGH..TiposDestinoAtencion DA WITH (NOLOCK)
    ON DA.IdDestinoAtencion = A.IdDestinoAtencion
  LEFT JOIN SIGH..AtencionesDatosAdicionales ADA WITH (NOLOCK)
    ON ADA.IdAtencion = A.IdAtencion
  LEFT JOIN SIGH..Establecimientos ES WITH (NOLOCK)
    ON ES.IdEstablecimiento = ADA.IdEstablecimientoOrigen
  LEFT JOIN SIGH..DetalleReferencia DR WITH (NOLOCK)
    ON DR.IdAtencion = A.IdAtencion
  LEFT JOIN SIGH..FacturacionCuentasAtencion FC WITH (NOLOCK)
    ON FC.IdCuentaAtencion = A.IdCuentaAtencion
  LEFT JOIN SIGH..EstadosCuenta EC WITH (NOLOCK)
    ON EC.IdEstado = FC.IdEstado
  LEFT JOIN SIGH..Empleados EM1 WITH (NOLOCK)
    ON EM1.IdEmpleado = FC.IdUsuarioCrea
  LEFT JOIN SIGH..FuentesFinanciamiento FF WITH (NOLOCK)
    ON FF.IdFuenteFinanciamiento = A.idFuenteFinanciamiento
  LEFT JOIN (
    SELECT idCuentaAtencion, MIN(CAST(FechaReceta AS date)) AS FechaActividad
    FROM SIGH..RecetaCabecera WITH (NOLOCK)
    WHERE idEstado IN (1, 2, 3)
      AND CAST(FechaReceta AS date) BETWEEN @fecha_inicio AND @fecha_fin
    GROUP BY idCuentaAtencion
  ) ACT
    ON ACT.idCuentaAtencion = A.IdCuentaAtencion
  LEFT JOIN (
    SELECT RC.idCuentaAtencion, SUM(RD.CantidadPedida) AS Ctda_Pedida, SUM(RDI.CantidadDespachada) AS Ctda_Despcahada
    FROM SIGH..RecetaCabecera RC WITH (NOLOCK)
    LEFT JOIN SIGH..RecetaDetalle RD WITH (NOLOCK)
      ON RD.idReceta = RC.idReceta
    LEFT JOIN SIGH..RecetaDetalleItem RDI WITH (NOLOCK)
      ON RDI.idReceta = RD.idReceta
      AND RDI.idItem = RD.idItem
    WHERE RC.idEstado IN (1, 2, 3)
      AND RC.idPuntoCarga = 5
    GROUP BY RC.idCuentaAtencion
  ) RX
    ON RX.idCuentaAtencion = A.IdCuentaAtencion
  LEFT JOIN (
    SELECT idCuentaAtencion, tipoDocumento
    FROM SIGH..documentos_firmados
    WHERE tipoDocumento IN ('FUA')
      AND estado = 1
  ) D4
    ON D4.idCuentaAtencion = A.IdCuentaAtencion
  LEFT JOIN (
    SELECT idCuentaAtencion, tipoDocumento
    FROM SIGH..documentos_firmados
    WHERE tipoDocumento IN ('HistoriaClinica')
      AND estado = 1
  ) D5
    ON D5.idCuentaAtencion = A.IdCuentaAtencion
  WHERE ACT.FechaActividad IS NOT NULL
    AND CAST(A.FechaIngreso AS date) NOT BETWEEN @fecha_inicio AND @fecha_fin
    AND A.idEstadoAtencion IN (1, 2)
    AND S.cod_EsServicioCE IN (0, 1, 2, 3, 4)
    AND S.cod_upss IN (1, 5);
END;
GO

CREATE OR ALTER PROCEDURE dbo.SP_APP_EPI_DENGUE_PATIENT_DNI_CSV
  @patient_ids nvarchar(max)
AS
BEGIN
  SET NOCOUNT ON;

  WITH ids AS (
    SELECT DISTINCT TRY_CONVERT(int, value) AS IdPaciente
    FROM STRING_SPLIT(@patient_ids, ',')
    WHERE TRY_CONVERT(int, value) IS NOT NULL
  )
  SELECT
    P.IdPaciente,
    ISNULL(CONVERT(VARCHAR(20), P.NroDocumento), '') AS DNI
  FROM SIGH..Pacientes P
  INNER JOIN ids
    ON ids.IdPaciente = P.IdPaciente;
END;
GO
