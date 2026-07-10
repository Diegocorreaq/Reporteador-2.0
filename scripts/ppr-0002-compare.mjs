import { readFileSync } from 'node:fs'
import ExcelJS from 'exceljs'
import { getSqlPool, closeSqlPool } from '../server/db/sql-server.js'

const oldMainQueryPath = 'C:/Users/diego.correa/Desktop/DIEGO CORREA/PPR/QUERYS/Consultas/0002._SALUD MATERNO NEONATAL_2025.sql'
const oldUciQueryPath = 'C:/Users/diego.correa/Desktop/DIEGO CORREA/PPR/QUERYS/Consultas/0002._SALUD MATERNO NEONATAL_2025_UCI.sql'
const oldMainQuery = readFileSync(oldMainQueryPath, 'utf8')
const oldUciQuery = readFileSync(oldUciQueryPath, 'utf8')

const queryBody = `
WITH Atencion AS (
  SELECT
    a.IdAtencion,
    a.IdCuentaAtencion,
    a.IdPaciente,
    a.IdServicioIngreso,
    a.IdServicioEgreso,
    a.idEstadoAtencion,
    a.FyHInicioI,
    CAST(a.FechaIngreso AS DATE) AS FechaIngreso,
    CAST(a.FechaEgreso AS DATE) AS FechaEgreso,
    p.FechaNacimiento,
    DATEDIFF(DAY, p.FechaNacimiento, a.FechaIngreso) AS EdadDias
  FROM SIGH_DEPURA..S_Atenciones a
  INNER JOIN SIGH_DEPURA..T_Paciente p ON p.IdPaciente = a.IdPaciente
  WHERE a.idEstadoAtencion IN (1,2)
),
DxAtc AS (
  SELECT
    a.IdAtencion,
    a.IdCuentaAtencion,
    a.IdPaciente,
    a.IdServicioIngreso,
    a.IdServicioEgreso,
    a.FechaIngreso,
    a.FechaEgreso,
    a.FechaNacimiento,
    a.EdadDias,
    d.CodigoCIE10,
    d.codigoCIEsinPto,
    d.IdCategoria,
    ad.Codigo,
    ad.IdClasificacionDx,
    CASE WHEN ISNULL(ad.LabConfHIS, '') = '0' THEN '' ELSE ISNULL(ad.LabConfHIS, '') END AS Valor
  FROM Atencion a
  INNER JOIN SIGH_DEPURA..S_DiagnosticoAtc ad ON ad.IdAtencion = a.IdAtencion
  INNER JOIN SIGH_DEPURA..T_Diagnostico d ON d.IdDiagnostico = ad.IdDiagnostico
),
DxEvo AS (
  SELECT
    a.IdAtencion,
    a.IdCuentaAtencion,
    a.IdPaciente,
    a.IdServicioIngreso,
    a.IdServicioEgreso,
    a.FechaIngreso,
    a.FechaEgreso,
    a.FechaNacimiento,
    a.EdadDias,
    d.CodigoCIE10,
    d.codigoCIEsinPto,
    d.IdCategoria,
    ad.Codigo,
    CAST(NULL AS INT) AS IdClasificacionDx,
    '' AS Valor
  FROM Atencion a
  INNER JOIN SIGH_DEPURA..S_DiagnosticoEVo ad ON ad.IdAtencion = a.IdAtencion
  INNER JOIN SIGH_DEPURA..T_Diagnostico d ON d.IdDiagnostico = ad.IdDiagnostico
  WHERE ISNULL(ad.EstadoDX, 1) = 1
),
DxAll AS (
  SELECT * FROM DxAtc
  UNION ALL
  SELECT * FROM DxEvo
),
Cpms AS (
  SELECT
    a.IdAtencion,
    a.IdCuentaAtencion,
    a.IdPaciente,
    a.FechaIngreso AS Fecha,
    a.FechaNacimiento,
    a.EdadDias,
    fsd.IDSERVICIO_ORDEN AS IdServicio,
    CAST(cs.Codigo AS VARCHAR(20)) AS Codigo,
    ISNULL(lc.HisSituacio, '') AS Valor
  FROM SIGH_DEPURA..Rpt_DATA_Procedimientos_CPTs fsd
  INNER JOIN Atencion a ON a.IdCuentaAtencion = fsd.IDCUENTA
  INNER JOIN SIGH_DEPURA..T_Catalogo_Servicio cs ON cs.IdProducto = fsd.IDPROD_CPT
  LEFT JOIN SIGH_DEPURA..S_DetalleHisLabCPT lc
    ON lc.IdProducto = fsd.IDPROD_CPT
    AND lc.IdCuentaAtencion = fsd.IDCUENTA
    AND lc.IdOrden = fsd.IDORDEN
    AND lc.IdEstado = 1
  WHERE fsd.IDEST_FACT NOT IN (9)
    AND fsd.IDPUNTO_CARGA IN (1,99)
    AND a.FechaIngreso BETWEEN @FechaInicio AND @FechaFin

  UNION ALL

  SELECT
    a.IdAtencion,
    a.IdCuentaAtencion,
    a.IdPaciente,
    CAST(ppr.fecharegistro AS DATE) AS Fecha,
    a.FechaNacimiento,
    a.EdadDias,
    a.IdServicioIngreso AS IdServicio,
    CAST(cs.Codigo AS VARCHAR(20)) AS Codigo,
    ISNULL(ppr.valor_LAB, '') AS Valor
  FROM SIGH_DEPURA..S_Activadad_PPR_HIS ppr
  INNER JOIN Atencion a ON a.IdCuentaAtencion = ppr.IdCuentaAtencion
  INNER JOIN SIGH_DEPURA..T_Catalogo_Servicio cs ON cs.IdProducto = ppr.IdProducto
  WHERE CAST(ppr.fecharegistro AS DATE) BETWEEN @FechaInicio AND @FechaFin
),
Planificacion AS (
  SELECT
    f.IdCuentaAtencion,
    f.IdPaciente,
    CAST(f.FechaReg AS DATE) AS Fecha,
    p.TipoSexo,
    b.Codigo AS CodigoBien,
    f.IdOrientacion,
    f.IndRemocionImplante
  FROM SIGH_DEPURA..S_PlaniFamiliar f
  LEFT JOIN SIGH_DEPURA..T_Paciente p ON p.IdPaciente = f.IdPaciente
  LEFT JOIN SIGH_DEPURA..T_Catalogo_Bienes b ON b.IdProducto = f.IdProducto
  WHERE CAST(f.FechaReg AS DATE) BETWEEN @FechaInicio AND @FechaFin
),
Nacimiento AS (
  SELECT
    a.IdAtencion,
    a.IdCuentaAtencion,
    a.IdPaciente,
    CAST(n.FechaNacimiento AS DATE) AS FechaNacimientoRn,
    tp.Descripcion AS TipoParto
  FROM SIGH_DEPURA..S_Atenciones a
  INNER JOIN SIGH_DEPURA..S_AtencionesNacimiento n ON n.IdAtencion = a.IdAtencion
  INNER JOIN SIGH_DEPURA..S_DetallePreNatal dp ON dp.IdAtencion = n.IdAtencion
  INNER JOIN SIGH_DEPURA..T_TipoParto tp ON tp.IdTipoParto = dp.IdTipoParto
  WHERE CAST(n.FechaNacimiento AS DATE) BETWEEN @FechaInicio AND @FechaFin
),
DxHospital AS (
  SELECT DISTINCT
    dx.IdAtencion,
    dx.IdCuentaAtencion,
    dx.IdPaciente,
    dx.FechaIngreso,
    dx.FechaEgreso,
    eh.IdServicio,
    CAST(eh.FechaOcupacion AS DATE) AS FechaOcupacion,
    dx.CodigoCIE10,
    dx.codigoCIEsinPto,
    dx.IdCategoria,
    dx.Codigo,
    dx.IdClasificacionDx
  FROM DxAll dx
  INNER JOIN SIGH_DEPURA..S_EstanciaHospitalaria eh ON eh.IdAtencion = dx.IdAtencion
  WHERE ISNULL(eh.LlegoAlServicio, 1) = 1
),
Corrected AS (
  SELECT '3329101 - AQV MASCULINO' AS ACTIVIDAD, COUNT(DISTINCT IdCuentaAtencion) AS TOTAL
  FROM Cpms
  WHERE Fecha BETWEEN @FechaInicio AND @FechaFin
    AND Codigo = '55250'

  UNION ALL
  SELECT '3329103 - AQV FEMENINO', COUNT(DISTINCT IdCuentaAtencion)
  FROM Cpms
  WHERE Fecha BETWEEN @FechaInicio AND @FechaFin
    AND Codigo IN ('58600','58605','58611')

  UNION ALL
  SELECT '3329105 - DISPOSITIVOS INTRAUTERINOS (METODO DIU)', COUNT(DISTINCT IdCuentaAtencion)
  FROM Planificacion
  WHERE CodigoBien IN ('08068')

  UNION ALL
  SELECT '3329106 - ANTICONCEPTIVO HORMONAL INYECTABLE', COUNT(DISTINCT IdCuentaAtencion)
  FROM Planificacion
  WHERE LTRIM(RTRIM(CodigoBien)) IN ('04594')

  UNION ALL
  SELECT '3329107 - METODOS DE BARRERA', COUNT(DISTINCT IdCuentaAtencion)
  FROM Planificacion
  WHERE CodigoBien IN ('08054')

  UNION ALL
  SELECT '3329108 - ANTICONCEPTIVO HORMONAL ORAL', COUNT(DISTINCT IdCuentaAtencion)
  FROM Planificacion
  WHERE CodigoBien IN ('18102')

  UNION ALL
  SELECT '3329113 - ANTICONCEPTIVO HORMONAL MENSUAL INYECTABLE', COUNT(DISTINCT IdCuentaAtencion)
  FROM Planificacion
  WHERE CodigoBien IN ('03234')

  UNION ALL
  SELECT '3329115 - IMPLANTE', COUNT(DISTINCT IdCuentaAtencion)
  FROM Planificacion
  WHERE CodigoBien IN ('03351')

  UNION ALL
  SELECT '3329117 - EXTRACCION O REMOCION DEL IMPLANTE', COUNT(DISTINCT IdCuentaAtencion)
  FROM Cpms
  WHERE Fecha BETWEEN @FechaInicio AND @FechaFin
    AND Codigo = '11976'

  UNION ALL
  SELECT '3329501 - ATENCION DEL PARTO NORMAL', COUNT(DISTINCT IdAtencion)
  FROM Nacimiento
  WHERE TipoParto = 'Parto Vaginal'

  UNION ALL
  SELECT '3329601 - TRABAJO DE PARTO DISFUNCIONAL', COUNT(DISTINCT IdCuentaAtencion)
  FROM DxAll
  WHERE FechaEgreso BETWEEN @FechaInicio AND @FechaFin
    AND (CodigoCIE10 IN ('O63.0','O63.1') OR IdCategoria = 'O75')

  UNION ALL
  SELECT '3329602 - HEMORRAGIAS INTRAPARTO Y POSTPARTO', COUNT(DISTINCT IdCuentaAtencion)
  FROM DxAll
  WHERE FechaEgreso BETWEEN @FechaInicio AND @FechaFin
    AND (IdCategoria IN ('O70','O71','O72','O73') OR CodigoCIE10 IN ('O71.2','O71.3','O71.4','O72.0','O72.1','O72.2','O72.3'))

  UNION ALL
  SELECT '3329701 - CESAREA', COUNT(DISTINCT IdPaciente)
  FROM Nacimiento
  WHERE TipoParto = 'Parto por Cesarea'

  UNION ALL
  SELECT '3329801 - ATENCION DEL PUERPERIO', COUNT(*)
  FROM SIGH_DEPURA..S_Atenciones
  INNER JOIN SIGH_DEPURA..S_AtencionesNacimiento WITH (NOLOCK) ON S_AtencionesNacimiento.IdAtencion = S_Atenciones.IdAtencion
  INNER JOIN SIGH_DEPURA..S_DetallePreNatal WITH (NOLOCK) ON S_DetallePreNatal.IdAtencion = S_AtencionesNacimiento.IdAtencion
  INNER JOIN SIGH_DEPURA..T_TipoParto WITH (NOLOCK) ON T_TipoParto.IdTipoParto = S_DetallePreNatal.IdTipoParto
  WHERE CAST(S_AtencionesNacimiento.FechaNacimiento AS DATE) BETWEEN @FechaInicio AND @FechaFin

  UNION ALL
  SELECT '3330003 - SINDROME HELLP', COUNT(DISTINCT IdCuentaAtencion)
  FROM DxHospital
  WHERE FechaEgreso BETWEEN @FechaInicio AND @FechaFin
    AND IdServicio IN (SELECT cod_Consultorio FROM SIGH_DEPURA..V_Consultorios WHERE cod_Upss = 6)
    AND CodigoCIE10 = 'O14.1'

  UNION ALL
  SELECT '3330004 - ATENCION DE GESTANTES COMPLICADAS EN UCI (CARDIOPATIA/DIABETES/RENAL SEVERA, ETC)', COUNT(DISTINCT IdCuentaAtencion)
  FROM DxHospital
  WHERE FechaEgreso BETWEEN @FechaInicio AND @FechaFin
    AND IdServicio IN (SELECT cod_Consultorio FROM SIGH_DEPURA..V_Consultorios WHERE cod_Upss = 6)
    AND CodigoCIE10 IN ('N99.0','K72.0','I50.0')

  UNION ALL
  SELECT '3330005 - ECLAMPSIA', COUNT(DISTINCT IdCuentaAtencion)
  FROM DxHospital
  WHERE FechaEgreso BETWEEN @FechaInicio AND @FechaFin
    AND IdServicio IN (SELECT cod_Consultorio FROM SIGH_DEPURA..V_Consultorios WHERE cod_Upss = 6)
    AND (CodigoCIE10 = 'O15.0' OR codigoCIEsinPto = 'O150')

  UNION ALL
  SELECT '3330501 - ATENCION INMEDIATA DEL RECIEN NACIDO', COUNT(*)
  FROM SIGH_DEPURA..Rpt_Indicador_Cnv
  WHERE FechaNacimiento BETWEEN @FechaInicio AND @FechaFin

  UNION ALL
  SELECT '3330505 - ATENCION DEL RECIEN NACIDO EN ALOJAMIENTO CONJUNTO', COUNT(AE.IdAtencion)
  FROM SIGH_DEPURA..S_Atenciones A
  INNER JOIN SIGH_DEPURA..S_EstanciaHospitalaria AE ON AE.IdAtencion = A.IdAtencion
  WHERE EXISTS (SELECT IDATENCION FROM SIGH_DEPURA..S_DiagnosticoAtc AD WHERE AD.IdAtencion = A.IdAtencion)
    AND A.idEstadoAtencion IN (1,2)
    AND AE.LlegoAlServicio = 1
    AND AE.IdServicio IN (249,255,462)
    AND CAST(AE.FechaOcupacion AS DATE) BETWEEN @FechaInicio AND @FechaFin

  UNION ALL
  SELECT '3330601 - ATENCION DE RECIEN NACIDO CON COMPLICACIONES', COUNT(DISTINCT IdAtencion)
  FROM DxHospital
  WHERE FechaOcupacion BETWEEN @FechaInicio AND @FechaFin
    AND IdServicio IN (440,441)
    AND (
      CodigoCIE10 LIKE '%U07.2%'
      OR IdCategoria BETWEEN 'P00' AND 'P96'
      OR IdCategoria IN ('A50','A54','A74','Q35','Q36','Q37','E00','Q65')
    )

  UNION ALL
  SELECT '3330619 - SEGUIMIENTO DEL RECIEN NACIDO DE ALTO RIESGO', COUNT(DISTINCT c.IdPaciente)
  FROM Cpms c
  WHERE c.Fecha BETWEEN @FechaInicio AND @FechaFin
    AND c.EdadDias BETWEEN 0 AND 28
    AND c.Codigo IN ('99212.01','99213.01')
    AND c.Valor = '03'
    AND EXISTS (
      SELECT 1
      FROM DxAtc dx
      WHERE dx.IdAtencion = c.IdAtencion
        AND dx.Codigo = 'D'
        AND (
          dx.IdCategoria BETWEEN 'P00' AND 'P96'
          OR dx.IdCategoria BETWEEN 'Q00' AND 'Q90'
          OR dx.IdCategoria BETWEEN 'E00' AND 'E90'
          OR dx.IdCategoria IN ('A50','A54','A74')
        )
    )

  UNION ALL
  SELECT '3330621 - ATENCION DEL RECIEN NACIDO CON TRASTORNOS ENDOCRINO-METABOLICOS Y NEUROLOGICOS', COUNT(DISTINCT IdCuentaAtencion)
  FROM DxHospital
  WHERE FechaEgreso BETWEEN @FechaInicio AND @FechaFin
    AND IdServicio IN (440,441)
    AND (codigoCIEsinPto IN ('E162','E86X','E807','E889','E039','E46X','E805','E031','E739','E161','E709','E804','E43X','E702','E806','E870','E871','E878','P210','P211','P219') OR IdCategoria BETWEEN 'P90' AND 'P96')

  UNION ALL
  SELECT '3330622 - ATENCION DEL RECIEN NACIDO CON AFECCIONES TRAUMATOLOGICAS', COUNT(DISTINCT IdCuentaAtencion)
  FROM DxHospital
  WHERE FechaEgreso BETWEEN @FechaInicio AND @FechaFin
    AND IdServicio IN (440,441)
    AND IdCategoria BETWEEN 'P10' AND 'P15'

  UNION ALL
  SELECT '3330623 - ATENCION DEL RECIEN NACIDO AFECTADO POR CONDICIONES MATERNAS', COUNT(DISTINCT IdCuentaAtencion)
  FROM DxHospital
  WHERE FechaEgreso BETWEEN @FechaInicio AND @FechaFin
    AND IdServicio IN (440,441)
    AND IdCategoria BETWEEN 'P01' AND 'P04'

  UNION ALL
  SELECT '3330624 - ATENCION DEL RECIEN NACIDO CON BAJO PESO', COUNT(DISTINCT IdCuentaAtencion)
  FROM DxHospital
  WHERE FechaEgreso BETWEEN @FechaInicio AND @FechaFin
    AND IdServicio IN (440,441)
    AND (codigoCIEsinPto IN ('P050','P051','P052','P059','P070','P071') OR IdCategoria = 'P80')

  UNION ALL
  SELECT '3330625 - ATENCION DEL RECIEN NACIDO PREMATURO', COUNT(DISTINCT IdCuentaAtencion)
  FROM DxHospital
  WHERE FechaEgreso BETWEEN @FechaInicio AND @FechaFin
    AND IdServicio IN (440,441)
    AND (IdCategoria = 'P07' OR codigoCIEsinPto IN ('P071','P072','P073'))

  UNION ALL
  SELECT '3330626 - ATENCION DEL RECIEN NACIDO CON ENFERMEDADES INFECCIOSAS', COUNT(DISTINCT IdCuentaAtencion)
  FROM DxHospital
  WHERE FechaEgreso BETWEEN @FechaInicio AND @FechaFin
    AND IdServicio IN (440,441)
    AND (codigoCIEsinPto IN ('A509','A501','A502','A090','A500','A419','A09X','A90X','A099','A270','B24X','B349','B161','B209','B271','B309','B162','B169') OR IdCategoria BETWEEN 'P35' AND 'P39')

  UNION ALL
  SELECT '3330627 - ATENCION DEL RECIEN NACIDO CON ENFERMEDADES HEMATOLOGICAS Y HEMORRAGICAS', COUNT(DISTINCT IdCuentaAtencion)
  FROM DxHospital
  WHERE FechaEgreso BETWEEN @FechaInicio AND @FechaFin
    AND IdServicio IN (440,441)
    AND IdCategoria BETWEEN 'P50' AND 'P61'

  UNION ALL
  SELECT '3330628 - ATENCION DEL RECIEN NACIDO CON ENFERMEDADES RESPIRATORIAS', COUNT(DISTINCT IdCuentaAtencion)
  FROM DxHospital
  WHERE FechaEgreso BETWEEN @FechaInicio AND @FechaFin
    AND IdServicio IN (440,441)
    AND (CodigoCIE10 IN ('P22.0','P22.1','P22.8','P22.9','P23.0','P23.1','P23.2','P23.3','P23.4','P23.5','P23.6','P23.8','P23.9','P24.0','P24.1','P24.2','P24.3','P24.8','P24.9') OR IdCategoria IN ('P25','P26','P27','P28'))

  UNION ALL
  SELECT '3330629 - ATENCION DEL RECIEN NACIDO CON ENFERMEDADES CARDIOVASCULARES', COUNT(DISTINCT IdCuentaAtencion)
  FROM DxHospital
  WHERE FechaEgreso BETWEEN @FechaInicio AND @FechaFin
    AND IdServicio IN (440,441)
    AND codigoCIEsinPto IN ('P290','P291','P292','P293','P294','P298','P299')

  UNION ALL
  SELECT '3330701 - ATENCION DEL RECIEN NACIDO CON COMPLICACIONES QUE REQUIERE UCIN', COUNT(DISTINCT IdCuentaAtencion)
  FROM DxHospital
  WHERE FechaEgreso BETWEEN @FechaInicio AND @FechaFin
    AND IdServicio IN (430)
    AND (codigoCIEsinPto IN ('E709','E804','E806','E807','E86X','E870','E871','E878','E880','E889') OR IdCategoria BETWEEN 'Q00' AND 'Q90')

  UNION ALL
  SELECT '3330711 - ATENCION DEL RECIEN NACIDO CON BAJO PESO', COUNT(DISTINCT IdCuentaAtencion)
  FROM DxHospital
  WHERE FechaEgreso BETWEEN @FechaInicio AND @FechaFin
    AND IdServicio IN (430)
    AND (codigoCIEsinPto IN ('P050','P051','P052','P059','P070','P071') OR IdCategoria = 'P80')

  UNION ALL
  SELECT '3330713 - ATENCION DEL RECIEN NACIDO CON AFECCIONES TRAUMATOLOGICAS', COUNT(DISTINCT IdCuentaAtencion)
  FROM DxHospital
  WHERE FechaEgreso BETWEEN @FechaInicio AND @FechaFin
    AND IdServicio IN (430)
    AND IdCategoria BETWEEN 'P10' AND 'P15'

  UNION ALL
  SELECT '3330714 - ATENCION DEL RECIEN NACIDO CON ENFERMEDADES INFECCIOSAS', COUNT(DISTINCT IdCuentaAtencion)
  FROM DxHospital
  WHERE FechaEgreso BETWEEN @FechaInicio AND @FechaFin
    AND IdServicio IN (430)
    AND (codigoCIEsinPto IN ('A509','A501','A502','A090','A500','A419','A09X','A90X','A099','A270','B24X','B349','B161','B209','B271','B309','B162','B169') OR IdCategoria BETWEEN 'P35' AND 'P39')

  UNION ALL
  SELECT '3330715 - ATENCION DEL RECIEN NACIDO CON ENFERMEDADES ENDOCRINO-METABOLICAS Y NEUROLOGICAS', COUNT(DISTINCT IdCuentaAtencion)
  FROM DxHospital
  WHERE FechaEgreso BETWEEN @FechaInicio AND @FechaFin
    AND IdServicio IN (430)
    AND (codigoCIEsinPto IN ('E162','E86X','E807','E889','E039','E46X','E805','E031','E739','E161','E709','P210','P211','P219') OR IdCategoria BETWEEN 'P90' AND 'P96')

  UNION ALL
  SELECT '3330716 - ATENCION DEL RECIEN NACIDO AFECTADO POR CONDICIONES MATERNAS', COUNT(DISTINCT IdCuentaAtencion)
  FROM DxHospital
  WHERE FechaEgreso BETWEEN @FechaInicio AND @FechaFin
    AND IdServicio IN (430)
    AND IdCategoria BETWEEN 'P00' AND 'P04'

  UNION ALL
  SELECT '3330717 - ATENCION DEL RECIEN NACIDO CON ENFERMEDADES HEMATOLOGICAS Y HEMORRAGICAS', COUNT(DISTINCT IdCuentaAtencion)
  FROM DxHospital
  WHERE FechaEgreso BETWEEN @FechaInicio AND @FechaFin
    AND IdServicio IN (430)
    AND IdCategoria BETWEEN 'P50' AND 'P61'

  UNION ALL
  SELECT '3330718 - ATENCION DEL RECIEN NACIDO CON ENFERMEDADES RESPIRATORIAS', COUNT(DISTINCT IdCuentaAtencion)
  FROM DxHospital
  WHERE FechaEgreso BETWEEN @FechaInicio AND @FechaFin
    AND IdServicio IN (430)
    AND (CodigoCIE10 IN ('P22.0','P22.1','P22.8','P22.9','P23.0','P23.1','P23.2','P23.3','P23.4','P23.5','P23.6','P23.8','P23.9','P24.0','P24.1','P24.2','P24.3','P24.8','P24.9') OR IdCategoria IN ('P25','P26','P27','P28'))

  UNION ALL
  SELECT '3330719 - ATENCION DEL RECIEN NACIDO CON ANOMALIAS CONGENITAS QUE REQUIEREN UCIN', COUNT(DISTINCT IdCuentaAtencion)
  FROM DxHospital
  WHERE FechaEgreso BETWEEN @FechaInicio AND @FechaFin
    AND IdServicio IN (430)
    AND (codigoCIEsinPto IN ('E709','E804','E806','E807','E86X','E870','E871','E878','E880','E889') OR IdCategoria BETWEEN 'Q00' AND 'Q90')

  UNION ALL
  SELECT '3330720 - ATENCION DEL RECIEN NACIDO CON ENFERMEDADES CARDIOVASCULARES', COUNT(DISTINCT IdCuentaAtencion)
  FROM DxHospital
  WHERE FechaEgreso BETWEEN @FechaInicio AND @FechaFin
    AND IdServicio IN (430)
    AND codigoCIEsinPto IN ('P290','P291','P292','P293','P294','P298','P299')
)
SELECT ACTIVIDAD, SUM(TOTAL) AS TOTAL
FROM Corrected
GROUP BY ACTIVIDAD
ORDER BY ACTIVIDAD;
`

const correctedQuery = `
USE SIGH_DEPURA;
DECLARE @FechaInicio DATE = '2026-06-01';
DECLARE @FechaFin DATE = '2026-06-30';

${queryBody}
`

const procedureSql = `CREATE_OR_ALTER PROCEDURE dbo.usp_PPR_0002
  @FechaInicio DATE,
  @FechaFin DATE
AS
BEGIN
  SET NOCOUNT ON;

${queryBody}
END
`

const reasons = {
  '3329101': 'Se alinea a HIS/CPMS para vasectomia (55250) segun fuente HISMINSA/WAWARED; deja de depender solo de S_PlaniFamiliar.',
  '3329103': 'Se alinea a HIS/CPMS para AQV femenino (58600/58605/58611) segun fuente HISMINSA/WAWARED.',
  '3329105': 'Se mantiene consumo MAC del registro de planificacion con codigo de bien 08068; el Excel habla de consumo/factor, no de diagnostico.',
  '3329106': 'Se mantiene consumo MAC del registro de planificacion con codigo de bien 04594.',
  '3329107': 'Se elimina el EXCEPT contra recetas; para consumo MAC se cuenta el registro del metodo de barrera 08054.',
  '3329108': 'Se mantiene consumo MAC del registro de planificacion con codigo de bien 18102.',
  '3329113': 'Se mantiene consumo MAC del registro de planificacion con codigo de bien 03234.',
  '3329115': 'Se mantiene consumo MAC del registro de planificacion con codigo de bien 03351.',
  '3329117': 'Se corrige a CPMS 11976, tal como indica el criterio de remocion de implante.',
  '3329501': 'Se mantiene CNV/tipo de parto vaginal, fuente compatible con CNV/egreso para O80.',
  '3329601': 'Se cambia de tipo de distocia en parto a egresos con O63.0, O63.1 u O75.',
  '3329602': 'Se cambia de tipo de distocia en parto a egresos con O70-O73 y codigos especificos de hemorragia/trauma obstetrico.',
  '3329701': 'Se mantiene CNV/tipo de parto cesarea, fuente compatible con CNV/egreso para O82.',
  '3329801': 'Se mantiene la logica operativa actual basada en nacimientos. Pendiente validar criterio oficial CPMS 59430 con 2 atenciones; aplicado hoy bajaria de 275 a 1 (-274).',
  '3330003': 'Se corrige a egresos UCI con CIE O14.1; antes buscaba descripcion prenatal de HELLP.',
  '3330004': 'Se corrige a egresos UCI con N99.0, K72.0 o I50.0; antes usaba solo un IdDiagnostico interno.',
  '3330005': 'Se corrige a egresos UCI con O15.0; se conserva el ambito UCI.',
  '3330501': 'Se mantiene la logica operativa actual por CNV. Pendiente validar CPMS 99436; aplicado hoy bajaria de 331 a 236 (-95).',
  '3330505': 'Se mantiene la logica operativa actual por estancias de alojamiento conjunto. Pendiente validar CPMS 99460; aplicado hoy bajaria de 328 a 152 (-176).',
  '3330601': 'Se mantiene RN complicado por estancia neonatal 440/441 y CIE perinatal/congenito; se ordena el criterio en una sola base.',
  '3330619': 'Se elimina duplicidad entre los dos queries y se exige CPMS 99212.01/99213.01 con LAB 03 mas diagnostico definitivo neonatal.',
  '3330621': 'Se cambia a fecha de egreso para RN hospitalizado, como indica el criterio de egresos.',
  '3330622': 'Se cambia a fecha de egreso para RN hospitalizado, como indica el criterio de egresos.',
  '3330623': 'Se cambia a fecha de egreso para RN hospitalizado, como indica el criterio de egresos.',
  '3330624': 'Se mantiene CIE de bajo peso y se usa fecha de egreso.',
  '3330625': 'Se mantiene CIE de prematuridad y se usa fecha de egreso.',
  '3330626': 'Se mantiene CIE infeccioso y se usa fecha de egreso.',
  '3330627': 'Se mantiene CIE hematologico/hemorragico y se usa fecha de egreso.',
  '3330628': 'Se agrega P22.0/P23.9/P25 y se usa fecha de egreso, segun el listado del Excel.',
  '3330629': 'Se mantiene CIE cardiovascular y se usa fecha de egreso.',
  '3330701': 'Se mantiene UCIN 430 y se usa egreso UCIN.',
  '3330711': 'Se mantiene bajo peso en UCIN y se usa egreso.',
  '3330713': 'Se mantiene traumatologia en UCIN y se usa egreso.',
  '3330714': 'Se mantiene infecciosas en UCIN y se usa egreso.',
  '3330715': 'Se mantiene endocrino-metabolicas/neurologicas en UCIN y se usa egreso.',
  '3330716': 'Se corrige el codigo mal escrito 330716 a 3330716 y se usa egreso UCIN.',
  '3330717': 'Se mantiene hematologicas/hemorragicas en UCIN y se usa egreso.',
  '3330718': 'Se corrige la etiqueta a respiratorias, se agrega listado completo y se usa egreso UCIN.',
  '3330719': 'Se cambia FechaOcupacion a FechaEgreso para alinearlo con egresos UCIN.',
  '3330720': 'Se mantiene CIE cardiovascular en UCIN y se usa egreso.',
}

function normalizeRows(rows) {
  return rows.map((row) => ({
    actividad: String(row.ACTIVIDAD ?? row.Actividad ?? row.actividad ?? ''),
    total: Number(row.TOTAL ?? row.Total ?? row.total ?? 0),
  }))
}

function sourceCode(row) {
  const match = row.actividad.match(/\b\d{6,7}\b/)
  const rawCode = match?.[0] ?? row.actividad.toUpperCase().replace(/\s+/g, '_')
  return rawCode === '330716' ? '3330716' : rawCode
}

function byCode(rows) {
  const map = new Map()
  for (const row of rows) {
    const code = sourceCode(row)
    const previous = map.get(code)
    map.set(code, {
      actividad: previous?.actividad ?? row.actividad,
      total: (previous?.total ?? 0) + row.total,
    })
  }
  return map
}

function styleSheet(sheet) {
  sheet.getRow(1).font = { bold: true, color: { argb: 'FFFFFFFF' } }
  sheet.getRow(1).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF0C2340' } }
  sheet.getRow(1).alignment = { vertical: 'middle', horizontal: 'center', wrapText: true }
  sheet.eachRow((row) => {
    row.alignment = { vertical: 'top', wrapText: true }
  })
  sheet.views = [{ state: 'frozen', ySplit: 1 }]
}

const pool = await getSqlPool('general')

try {
  const existsRequest = pool.request()
  const existsResult = await existsRequest.query("SELECT OBJECT_ID('dbo.usp_PPR_0002', 'P') AS id")
  const verb = existsResult.recordset[0]?.id ? 'ALTER' : 'CREATE'
  const installRequest = pool.request()
  installRequest.timeout = 900000
  await installRequest.query(procedureSql.replace('CREATE_OR_ALTER', verb))
  console.log('dbo.usp_PPR_0002 creado/actualizado.')

  const oldMainRequest = pool.request()
  oldMainRequest.timeout = 900000
  const oldMainResult = await oldMainRequest.query(oldMainQuery)

  const oldUciRequest = pool.request()
  oldUciRequest.timeout = 900000
  const oldUciResult = await oldUciRequest.query(oldUciQuery)

  const correctedRequest = pool.request()
  correctedRequest.timeout = 900000
  const correctedResult = await correctedRequest.query(correctedQuery)

  const oldRows = [
    ...normalizeRows(oldMainResult.recordset),
    ...normalizeRows(oldUciResult.recordset),
  ]
  const correctedRows = normalizeRows(correctedResult.recordset)
  const oldMap = byCode(oldRows)
  const correctedMap = byCode(correctedRows)
  const codes = [...new Set([...oldMap.keys(), ...correctedMap.keys()])].sort()
  const comparison = codes.map((code) => {
    const oldRow = oldMap.get(code)
    const correctedRow = correctedMap.get(code)
    const oldTotal = oldRow?.total ?? 0
    const correctedTotal = correctedRow?.total ?? 0
    return {
      code,
      actividad: correctedRow?.actividad ?? oldRow?.actividad ?? code,
      actual: oldTotal,
      corregido: correctedTotal,
      diferencia: correctedTotal - oldTotal,
      motivo: reasons[code] ?? '',
    }
  })

  console.table(comparison)

  const verifyRequest = pool.request()
  verifyRequest.timeout = 900000
  const verifyResult = await verifyRequest.query(`
    EXEC dbo.usp_PPR_0002
      @FechaInicio = '2026-06-01',
      @FechaFin = '2026-06-30';
  `)
  console.log('Verificacion procedimiento dbo.usp_PPR_0002')
  console.table(normalizeRows(verifyResult.recordset))

  const workbook = new ExcelJS.Workbook()
  workbook.creator = 'Reporteador 2.0'
  workbook.created = new Date()

  const summary = workbook.addWorksheet('Comparacion junio 2026')
  summary.columns = [
    { header: 'Codigo', key: 'code', width: 12 },
    { header: 'Actividad', key: 'actividad', width: 72 },
    { header: 'Query actual', key: 'actual', width: 14 },
    { header: 'Query corregido', key: 'corregido', width: 16 },
    { header: 'Impacto', key: 'diferencia', width: 12 },
    { header: 'Cambio principal y motivo', key: 'motivo', width: 92 },
  ]
  summary.addRows(comparison)
  styleSheet(summary)
  summary.autoFilter = 'A1:F1'
  summary.eachRow((row, rowNumber) => {
    if (rowNumber > 1) {
      const impact = Number(row.getCell('E').value ?? 0)
      row.getCell('E').font = {
        bold: true,
        color: { argb: impact > 0 ? 'FF047857' : impact < 0 ? 'FFB91C1C' : 'FF334155' },
      }
    }
  })

  const notes = workbook.addWorksheet('Criterios aplicados')
  notes.columns = [
    { header: 'Tema', key: 'topic', width: 34 },
    { header: 'Detalle', key: 'detail', width: 120 },
  ]
  notes.addRows([
    { topic: 'Periodo comparado', detail: '2026-06-01 al 2026-06-30.' },
    { topic: 'Fuentes actuales', detail: 'Se comparan juntos los dos SQL actuales: 0002 principal y 0002 UCI.' },
    { topic: 'Salida final', detail: 'dbo.usp_PPR_0002(@FechaInicio DATE, @FechaFin DATE) entrega una sola tabla ACTIVIDAD/TOTAL para el modulo PPR.' },
    { topic: 'Duplicidad 3330619', detail: 'El query actual trae 3330619 en ambos archivos. La salida corregida lo entrega una sola vez.' },
    { topic: 'Error de codigo', detail: 'El query UCI tenia 330716; se normaliza como 3330716.' },
    { topic: 'Error de etiqueta', detail: '3330718 se etiqueta como respiratorias, conforme a la matriz 2026.' },
    { topic: 'Egresos RN/UCI', detail: 'Cuando el criterio dice egresos, se prioriza FechaEgreso. 3330601 conserva ocupacion/atencion por criterio mixto de atenciones o egresos.' },
    { topic: 'Puerperio', detail: 'Se mantiene la query operativa actual. Queda pendiente migrar/validar CPMS 59430 con 2 atenciones; si se aplicara hoy afectaria 275 -> 1.' },
    { topic: 'RN inmediato/alojamiento', detail: 'Se mantienen las queries operativas actuales. Queda pendiente validar CPMS 99436 y 99460; si se aplicaran hoy afectarian 331 -> 236 y 328 -> 152.' },
  ])
  styleSheet(notes)

  const reportPath = 'C:/xampp/htdocs/Reporteador-2.0/informes/PPR_0002_comparacion_query_junio_2026.xlsx'
  await workbook.xlsx.writeFile(reportPath)
  console.log(`Excel generado: ${reportPath}`)
} finally {
  await closeSqlPool('general')
}
