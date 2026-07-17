SET ANSI_NULLS ON;
GO
SET QUOTED_IDENTIFIER ON;
GO

CREATE OR ALTER PROCEDURE dbo.SP_APP_CENTRO_OBSTETRICO_LAST_UPDATED
AS
BEGIN
  SET NOCOUNT ON;

  SELECT MAX(CAST(A.Fecha AS date)) AS [lastUpdated]
  FROM SIGH_DEPURA..Rpt_MovimientoHospitalario A
  INNER JOIN T_Upss_Consultorio C
    ON C.cod_Consultorio = A.idservicio
  WHERE YEAR(A.fecha) >= 2019
    AND C.des_Consultorio LIKE '%obstetrico%';
END;
GO

CREATE OR ALTER PROCEDURE dbo.SP_APP_CENTRO_OBSTETRICO_ROWS
  @fechaInicio date,
  @fechaFin date
AS
BEGIN
  SET NOCOUNT ON;

  SELECT
    D1.FECHA AS [fecha],
    D1.ANIO AS [anio],
    D1.MES AS [mesNumero],
    D1.INGRESOS AS [totalIngresos],
    D1.TRAN_HOSP AS [nroTransferidosHospObstetricia],
    D1.TRAN_UCI AS [nroTransferidosUci],
    D1.TRANSOTROS AS [nroTransferidosOtrosServicios],
    (D1.EGRESOS - D1.NROREFERIDO - D1.FALLMAY - D1.FALLMEN - D1.FALL12M) AS [altaMedica],
    D1.NROREFERIDO AS [totalReferidos],
    D1.TRAN_VILLA AS [destinoVillaPanamericana],
    (D1.NROREFERIDO - D1.TRAN_VILLA) AS [destinoOtros],
    ISNULL(D1.FALLMEN + D1.FALLMAY + D1.FALL12M, 0) AS [fallecidos],
    ISNULL(D1.FALL12M, 0) AS [fallecidoMenor12Horas],
    ISNULL(D1.FALLMEN, 0) AS [fallecidos12a48Horas],
    ISNULL(D1.FALLMAY, 0) AS [fallecidosMayorIgual48Horas],
    ISNULL(D1.EGRESOS + D1.TRANSF, 0) AS [egresos],
    D1.ESTANCIA AS [estancia],
    D1.PACIENTEDIA AS [pacienteDia],
    D1.CAMADIA AS [camaDia],
    (D1.CAMADIA - D1.PACIENTEDIA) AS [diferenciaCamasPacientes],
    D1.CAMASDIS2 AS [camasDisponiblesPromedio]
  FROM (
    SELECT
      YEAR(A.FECHA) AS ANIO,
      MONTH(A.FECHA) AS MES,
      CAST(A.FECHA AS date) AS FECHA,
      SUM(A.TotIng) AS INGRESOS,
      SUM(ISNULL(A.Altas, 0)) AS EGRESOS,
      SUM(A.Estancia) AS ESTANCIA,
      SUM(A.PacienteDia) AS PACIENTEDIA,
      SUM(A.CamasDis) AS CAMADIA,
      AVG(CASE WHEN A.camafija <> 0 THEN A.camafija ELSE NULL END) AS CAMASDIS2,
      ISNULL(SUM(A.fall_men12), 0) AS FALL12M,
      ISNULL(SUM(A.fall_men48), 0) AS FALLMEN,
      ISNULL(SUM(A.fall_may48), 0) AS FALLMAY,
      SUM(A.transf_uci) AS TRAN_UCI,
      SUM(A.Transf) AS TRANSF,
      SUM(A.transf_villa) AS TRAN_VILLA,
      ISNULL(SUM(A.REFERIDOS), 0) AS NROREFERIDO,
      SUM(A.transf_obs) AS TRAN_HOSP,
      SUM(ISNULL(A.Transf, 0) - ISNULL(A.transf_obs, 0)) AS TRANSOTROS
    FROM sigh_depura..Rpt_MovimientoHospitalario A
    INNER JOIN T_Upss_Consultorio C
      ON C.cod_Consultorio = A.idservicio
    WHERE YEAR(A.fecha) >= 2019
      AND CAST(A.fecha AS date) BETWEEN @fechaInicio AND @fechaFin
      AND C.des_Consultorio LIKE '%obstetrico%'
    GROUP BY CAST(A.FECHA AS date), YEAR(A.FECHA), MONTH(A.FECHA)
  ) D1
  ORDER BY D1.FECHA;
END;
GO

CREATE OR ALTER PROCEDURE dbo.SP_APP_FAMILIA_PENDIENTE_UPSS
AS
BEGIN
  SET NOCOUNT ON;

  SELECT cod_upss AS codUpSs, des_upss AS desUpSs
  FROM T_Upss
  WHERE cod_upss IN (2, 3, 4, 6)
  ORDER BY des_upss;
END;
GO

CREATE OR ALTER PROCEDURE dbo.SP_APP_PROD_MEDICOS_EMPLEADO
  @empleadoId int
AS
BEGIN
  SET NOCOUNT ON;

  SELECT TOP 1
    E.IDEMPLEADO AS idEmpleado,
    E.DNI AS dni,
    UPPER(E.ApellidoPaterno + ' ' + E.ApellidoMaterno + ' ' + E.Nombres) AS empleado,
    UPPER(TE.Descripcion) AS tipoEmpleado
  FROM SIGH..Empleados E
  INNER JOIN SIGH..TiposEmpleado TE
    ON TE.IdTipoEmpleado = E.IdTipoEmpleado
  WHERE E.IDEMPLEADO = @empleadoId;
END;
GO

CREATE OR ALTER PROCEDURE dbo.SP_APP_PROD_MEDICOS_BUSCAR
  @term nvarchar(200)
AS
BEGIN
  SET NOCOUNT ON;

  SELECT D1.*
  FROM (
    SELECT
      E.IDEMPLEADO AS idEmpleado,
      E.DNI AS dni,
      UPPER(E.ApellidoPaterno + ' ' + E.ApellidoMaterno + ' ' + E.Nombres) AS empleado,
      UPPER(TE.Descripcion) AS tipoEmpleado
    FROM SIGH..Empleados E
    INNER JOIN SIGH..TiposEmpleado TE
      ON TE.IdTipoEmpleado = E.IdTipoEmpleado
    WHERE (TE.Abreviatura = 'M. C.' OR E.IdTipoEmpleado IN (247, 55, 234, 239))
  ) D1
  WHERE D1.empleado LIKE @term + '%';
END;
GO

CREATE OR ALTER PROCEDURE dbo.SP_APP_PROD_OBSTETRAS_EMPLEADO
  @empleadoId int
AS
BEGIN
  SET NOCOUNT ON;

  SELECT TOP 1
    E.IdEmpleado AS idEmpleado,
    E.DNI AS dni,
    UPPER(E.ApellidoPaterno + ' ' + E.ApellidoMaterno + ' ' + E.Nombres) AS nombre,
    UPPER(TE.Descripcion) AS tipoEmpleado
  FROM SIGH..Empleados E
  INNER JOIN SIGH..TiposEmpleado TE
    ON TE.IdTipoEmpleado = E.IdTipoEmpleado
  WHERE E.IdEmpleado = @empleadoId
    AND E.IdTipoEmpleado = 28;
END;
GO

CREATE OR ALTER PROCEDURE dbo.SP_APP_PROD_OBSTETRAS_BUSCAR
  @term nvarchar(200)
AS
BEGIN
  SET NOCOUNT ON;

  SELECT TOP 30
    E.IdEmpleado AS idEmpleado,
    E.DNI AS dni,
    UPPER(E.ApellidoPaterno + ' ' + E.ApellidoMaterno + ' ' + E.Nombres) AS nombre,
    UPPER(TE.Descripcion) AS tipoEmpleado
  FROM SIGH..Empleados E
  INNER JOIN SIGH..TiposEmpleado TE
    ON TE.IdTipoEmpleado = E.IdTipoEmpleado
  WHERE E.IdTipoEmpleado = 28
    AND UPPER(E.ApellidoPaterno + ' ' + E.ApellidoMaterno + ' ' + E.Nombres) LIKE UPPER(@term) + '%'
  ORDER BY E.ApellidoPaterno, E.ApellidoMaterno, E.Nombres;
END;
GO

CREATE OR ALTER PROCEDURE dbo.SP_APP_LAVADO_DETALLE
  @idregistro int,
  @tipo int
AS
BEGIN
  SET NOCOUNT ON;

  IF @tipo = 3
  BEGIN
    SELECT *
    FROM v_registro_detalle_c
    WHERE idregistro = @idregistro
    ORDER BY idactividad;
    RETURN;
  END;

  SELECT *
  FROM v_registro_detalle
  WHERE idregistro = @idregistro
  ORDER BY idactividad;
END;
GO

CREATE OR ALTER PROCEDURE dbo.SP_APP_LAVADO_ACTIVIDADES
  @tipo int
AS
BEGIN
  SET NOCOUNT ON;

  SELECT idactividad, actividad, tipo
  FROM t_Actividad
  WHERE tipo = @tipo
  ORDER BY idactividad;
END;
GO

CREATE OR ALTER PROCEDURE dbo.SP_APP_LAVADO_REGISTRO
  @idregistro int
AS
BEGIN
  SET NOCOUNT ON;

  SELECT *
  FROM v_registro
  WHERE idregistro = @idregistro;
END;
GO

CREATE OR ALTER PROCEDURE dbo.SP_APP_LAVADO_DELETE_DETALLE
  @idregistro int,
  @tipo int
AS
BEGIN
  SET NOCOUNT ON;

  IF @tipo = 3
  BEGIN
    DELETE FROM SIGH_DEPURA..E_MomentoDetalle
    WHERE idregistro = @idregistro;
    RETURN;
  END;

  DELETE FROM E_LavadoDetalle
  WHERE idregistro = @idregistro;
END;
GO

CREATE OR ALTER PROCEDURE dbo.SP_APP_CAMAS_SIN_ALTA_EFECTIVA_COUNTS
  @idEstadoCama int
AS
BEGIN
  SET NOCOUNT ON;

  SELECT
    SR.cod_Consultorio AS IDSERVICIO,
    TCM.Descripcion AS TIPO,
    COUNT(*) AS TOTAL
  FROM SIGH..Camas CM
  LEFT JOIN SIGH..TiposCama TCM
    ON TCM.IdTipoCama = CM.IdTiposCama
  LEFT JOIN SIGH_EST..T_Upss_Consultorio SR
    ON SR.cod_Consultorio = CM.IdServicioPropietario
  WHERE CM.IdEstadoCama = @idEstadoCama
    AND SR.COD_ESTADO = 1
    AND SR.cod_Consultorio NOT IN (11, 28, 196, 8, 461, 600)
  GROUP BY SR.cod_Consultorio, TCM.Descripcion;
END;
GO

CREATE OR ALTER PROCEDURE dbo.SP_APP_CAMAS_NON_RESERVABLE_SOP_COUNTS
AS
BEGIN
  SET NOCOUNT ON;

  WITH MOV_CQ AS (
    SELECT
      A.IdAtencion,
      H.IdEstanciaHospitalaria,
      H.Secuencia,
      H.FechaOcupacion,
      H.IdServicio,
      H.IdCama,
      H.LlegoAlServicio,
      S.cod_Upss,
      ROW_NUMBER() OVER (
        PARTITION BY A.IdAtencion
        ORDER BY H.Secuencia DESC, H.FechaOcupacion DESC, H.IdEstanciaHospitalaria DESC
      ) fila_actual
    FROM SIGH..Atenciones A
    INNER JOIN SIGH..AtencionesEstanciaHospitalaria H
      ON H.IdAtencion = A.IdAtencion
    LEFT JOIN SIGH_EST..T_Upss_Consultorio S
      ON S.cod_Consultorio = H.IdServicio
    WHERE A.FechaEgreso IS NULL
      AND H.LlegoAlServicio = 1
  ),
  ACTUAL_CQ AS (
    SELECT *
    FROM MOV_CQ
    WHERE fila_actual = 1
      AND cod_Upss = 4
      AND FechaOcupacion >= DATEADD(day, -1, CONVERT(date, GETDATE()))
  ),
  ORIGEN_CQ AS (
    SELECT
      M.*,
      ROW_NUMBER() OVER (
        PARTITION BY M.IdAtencion
        ORDER BY M.Secuencia DESC, M.FechaOcupacion DESC, M.IdEstanciaHospitalaria DESC
      ) fila_origen
    FROM MOV_CQ M
    INNER JOIN ACTUAL_CQ CQ
      ON CQ.IdAtencion = M.IdAtencion
    WHERE ISNULL(M.cod_Upss, 0) <> 4
      AND M.IdCama IS NOT NULL
  )
  SELECT
    O.IdServicio AS IDSERVICIO,
    TCM.Descripcion AS TIPO,
    COUNT(DISTINCT O.IdCama) AS TOTAL
  FROM ACTUAL_CQ CQ
  INNER JOIN ORIGEN_CQ O
    ON O.IdAtencion = CQ.IdAtencion
    AND O.fila_origen = 1
  INNER JOIN SIGH..Camas CM
    ON CM.IdCama = O.IdCama
    AND CM.IdServicioPropietario = O.IdServicio
  LEFT JOIN SIGH..TiposCama TCM
    ON TCM.IdTipoCama = CM.IdTiposCama
  WHERE CM.IdEstadoCama IN (1, 4)
    AND ISNULL(O.cod_Upss, 0) NOT IN (3, 6)
  GROUP BY O.IdServicio, TCM.Descripcion;
END;
GO

CREATE OR ALTER PROCEDURE dbo.SP_APP_CAMAS_SERVICIOS_AGRUPADOS
AS
BEGIN
  SET NOCOUNT ON;

  SELECT DISTINCT
    TipoAgrupa AS tipo,
    NomAgrupa AS nombre
  FROM T_Upss_Consultorio
  WHERE NomAgrupa IS NOT NULL
  ORDER BY nombre;
END;
GO

CREATE OR ALTER PROCEDURE dbo.SP_APP_CAMAS_SERVICIO_AGRUPADO_INFO
  @nombre nvarchar(200)
AS
BEGIN
  SET NOCOUNT ON;

  SELECT DISTINCT
    TipoAgrupa AS tipo,
    NomAgrupa AS nombre,
    IdAgrupa AS idTipo
  FROM T_Upss_Consultorio
  WHERE NomAgrupa = @nombre;
END;
GO

CREATE OR ALTER PROCEDURE dbo.SP_APP_CAMAS_SERVICIO_CRITERIA
  @servicio nvarchar(200)
AS
BEGIN
  SET NOCOUNT ON;

  SELECT DISTINCT
    cod_upss AS upss,
    cod_consultorio AS serv
  FROM T_Upss_Consultorio
  WHERE NomAgrupa = @servicio;
END;
GO

CREATE OR ALTER PROCEDURE dbo.SP_APP_CAMAS_TIPOS
AS
BEGIN
  SET NOCOUNT ON;

  SELECT IdTipoCama AS idTipo, Descripcion AS tipo
  FROM sigh..TiposCama
  WHERE idestado = 1
  ORDER BY IdTipoCama;
END;
GO

CREATE OR ALTER PROCEDURE dbo.SP_APP_CAMAS_RESERVADAS_SOP_DETALLE
  @idservicio int,
  @tipo nvarchar(200)
AS
BEGIN
  SET NOCOUNT ON;

  WITH MOV_CQ AS (
    SELECT
      A.IdAtencion,
      A.IdCuentaAtencion,
      A.IdPaciente,
      H.IdEstanciaHospitalaria,
      H.Secuencia,
      H.FechaOcupacion,
      H.IdServicio,
      H.IdCama,
      H.LlegoAlServicio,
      S.cod_Upss,
      ROW_NUMBER() OVER (
        PARTITION BY A.IdAtencion
        ORDER BY H.Secuencia DESC, H.FechaOcupacion DESC, H.IdEstanciaHospitalaria DESC
      ) fila_actual
    FROM SIGH..Atenciones A
    INNER JOIN SIGH..AtencionesEstanciaHospitalaria H
      ON H.IdAtencion = A.IdAtencion
    LEFT JOIN SIGH_EST..T_Upss_Consultorio S
      ON S.cod_Consultorio = H.IdServicio
    WHERE A.FechaEgreso IS NULL
      AND H.LlegoAlServicio = 1
  ),
  ACTUAL_CQ AS (
    SELECT *
    FROM MOV_CQ
    WHERE fila_actual = 1
      AND cod_Upss = 4
      AND FechaOcupacion >= DATEADD(day, -1, CONVERT(date, GETDATE()))
  ),
  ORIGEN_CQ AS (
    SELECT
      M.*,
      ROW_NUMBER() OVER (
        PARTITION BY M.IdAtencion
        ORDER BY M.Secuencia DESC, M.FechaOcupacion DESC, M.IdEstanciaHospitalaria DESC
      ) fila_origen
    FROM MOV_CQ M
    INNER JOIN ACTUAL_CQ CQ
      ON CQ.IdAtencion = M.IdAtencion
    WHERE ISNULL(M.cod_Upss, 0) <> 4
      AND M.IdCama IS NOT NULL
  )
  SELECT
    CM.Codigo NROCAMA,
    SR.PISO,
    TCM.Descripcion TIPOCAMA,
    CONCAT('Reservada (', ECM.Descripcion, ')') ESTADOCAMA,
    ISNULL((LEFT(P.PrimerNombre, 1) + ',' + P.ApellidoPaterno + ',' + LEFT(P.ApellidoMaterno, 1)), '') PACIENTE,
    O.IdCuentaAtencion,
    SR2.des_Consultorio SERVICIOACTUAL,
    CM.IdServicioPropietario
  FROM ACTUAL_CQ CQ
  INNER JOIN ORIGEN_CQ O
    ON O.IdAtencion = CQ.IdAtencion
    AND O.fila_origen = 1
  INNER JOIN SIGH..Camas CM
    ON CM.IdCama = O.IdCama
    AND CM.IdServicioPropietario = O.IdServicio
  LEFT JOIN SIGH..TiposCama TCM
    ON TCM.IdTipoCama = CM.IdTiposCama
  LEFT JOIN SIGH..EstadosCama ECM
    ON ECM.IdEstadoCama = CM.IdEstadoCama
  LEFT JOIN SIGH..Pacientes P
    ON P.IdPaciente = O.IdPaciente
  LEFT JOIN SIGH_EST..T_Upss_Consultorio SR
    ON SR.cod_Consultorio = O.IdServicio
  LEFT JOIN SIGH_EST..T_Upss_Consultorio SR2
    ON SR2.cod_Consultorio = CQ.IdServicio
  WHERE CM.IdEstadoCama IN (1, 4)
    AND O.IdServicio = @idservicio
    AND O.cod_Upss IN (3, 6)
    AND TCM.Descripcion = @tipo
  ORDER BY CM.Codigo;
END;
GO

CREATE OR ALTER PROCEDURE dbo.SP_APP_CAMAS_OXIGENOTERAPIA_DETALLE
  @idservicio int,
  @valorOxigenoterapia int
AS
BEGIN
  SET NOCOUNT ON;

  SELECT
    S1.IdCuentaAtencion IDCUENTA,
    S1.NROCAMA CAMA,
    S1.ESTADOCAMA,
    ISNULL((LEFT(P.PrimerNombre, 1) + ',' + P.ApellidoPaterno + ',' + LEFT(P.ApellidoMaterno, 1)), '') PACIENTE
  FROM (
    SELECT X1.*, X2.IdAtencion, X2.IdCuentaAtencion
    FROM (
      SELECT
        CM.Codigo NROCAMA,
        CM.IdCama,
        SR.cod_Consultorio IDSERVICIO,
        ECM.Descripcion ESTADOCAMA,
        CM.IdPaciente
      FROM SIGH..Camas CM
      LEFT JOIN SIGH..EstadosCama ECM
        ON ECM.IdEstadoCama = CM.IdEstadoCama
      LEFT JOIN SIGH_EST..T_Upss_Consultorio SR
        ON SR.cod_Consultorio = CM.IdServicioPropietario
      WHERE CM.IdEstadoCama <> 10
        AND SR.COD_ESTADO = 1
        AND SR.cod_Consultorio NOT IN (11, 28, 196, 8, 461, 600)
        AND SR.cod_Consultorio = @idservicio
    ) X1
    LEFT JOIN (
      SELECT IDCAMA, IDSERVICIO, IDPACIENTE, IDATENCION, IdCuentaAtencion
      FROM (
        SELECT
          H.IdCama,
          H.IdServicio,
          A1.IdPaciente,
          A1.IdAtencion,
          A1.IdCuentaAtencion,
          ROW_NUMBER() OVER (
            PARTITION BY H.IdCama, H.IdServicio, A1.IdPaciente
            ORDER BY H.Secuencia DESC, A1.FechaIngreso DESC, A1.IdAtencion DESC
          ) fila
        FROM SIGH..Atenciones A1
        INNER JOIN SIGH..AtencionesEstanciaHospitalaria H
          ON H.IdAtencion = A1.IdAtencion
        WHERE A1.FechaEgreso IS NULL
          AND H.LlegoAlServicio = 1
      ) X2R
      WHERE fila = 1
    ) X2
      ON X1.IdCama = X2.IdCama
      AND X1.IDSERVICIO = X2.IdServicio
      AND X1.IdPaciente = X2.IdPaciente
  ) S1
  INNER JOIN SIGH..Pacientes P
    ON P.IdPaciente = S1.IdPaciente
  INNER JOIN (
    SELECT EV.IdCuentaAtencion, MAX(EV.IdVisita) IDULTVIS
    FROM efimedic..EvoVisitaX EV
    WHERE EV.estado = 1
      AND EV.idTipoEvolucion = 1
    GROUP BY EV.IdCuentaAtencion
  ) R2
    ON S1.IdCuentaAtencion = R2.IdCuentaAtencion
  INNER JOIN (
    SELECT EV.IdCuentaAtencion, EVD.IdVisita, EVD.valor2
    FROM efimedic..EvoVisitaDetalleX EVD
    INNER JOIN efimedic..EvoVisitaX EV
      ON EV.IdVisita = EVD.IdVisita
    WHERE EVD.estado = 1
      AND EV.estado = 1
      AND YEAR(EV.fecha) = YEAR(GETDATE())
      AND EVD.valor2 = @valorOxigenoterapia
  ) R3
    ON R2.IdCuentaAtencion = R3.IdCuentaAtencion
    AND R2.IDULTVIS = R3.IdVisita
  ORDER BY S1.NROCAMA;
END;
GO
