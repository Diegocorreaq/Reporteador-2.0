import fs from 'node:fs/promises'
import path from 'node:path'
import { getSqlPool, closeSqlPool, sql } from '../server/db/sql-server.js'

const backupDir = path.join(
  'informes',
  'ppr-sp-backups',
  `optimize-usp-ppr-0018-${new Date().toISOString().replace(/[:.]/g, '-')}`,
)

const optimizedFinalBlock = `
IF OBJECT_ID('tempdb..#AtencionPeriodo') IS NOT NULL DROP TABLE #AtencionPeriodo;
IF OBJECT_ID('tempdb..#Cpms') IS NOT NULL DROP TABLE #Cpms;
IF OBJECT_ID('tempdb..#Dx') IS NOT NULL DROP TABLE #Dx;

SELECT
  a.IdAtencion,
  a.IdCuentaAtencion,
  a.IdPaciente,
  a.IdServicioIngreso,
  CAST(a.FechaIngreso AS DATE) AS FechaIngreso,
  CAST(a.FechaEgreso AS DATE) AS FechaEgreso,
  a.Edad,
  a.IdTipoEdad,
  a.FyHInicioI,
  a.idEstadoAtencion
INTO #AtencionPeriodo
FROM SIGH_DEPURA..S_Atenciones a
WHERE a.idEstadoAtencion IN (1,2)
  AND a.FechaIngreso BETWEEN @FechaInicio AND @FechaFin;

CREATE INDEX IX_ppr0018_atencion_periodo_cuenta ON #AtencionPeriodo (IdCuentaAtencion);
CREATE INDEX IX_ppr0018_atencion_periodo_atencion ON #AtencionPeriodo (IdAtencion);
CREATE INDEX IX_ppr0018_atencion_periodo_fecha ON #AtencionPeriodo (FechaIngreso);

SELECT
  C.IdAtencion,
  C.IdCuentaAtencion,
  C.IdPaciente,
  C.Fecha,
  C.IdServicio,
  C.Codigo,
  C.CodigoNorm,
  C.Valor
INTO #Cpms
FROM (
  SELECT
    a.IdAtencion,
    a.IdCuentaAtencion,
    a.IdPaciente,
    a.FechaIngreso AS Fecha,
    fsd.IDSERVICIO_ORDEN AS IdServicio,
    CAST(cs.Codigo AS VARCHAR(20)) AS Codigo,
    REPLACE(REPLACE(UPPER(LTRIM(RTRIM(CAST(cs.Codigo AS VARCHAR(20))))),'.',''),' ','') AS CodigoNorm,
    ISNULL(lc.HisSituacio, '') AS Valor
  FROM SIGH_DEPURA..Rpt_DATA_Procedimientos_CPTs fsd
  INNER JOIN #AtencionPeriodo a ON a.IdCuentaAtencion = fsd.IDCUENTA
  INNER JOIN SIGH_DEPURA..T_Catalogo_Servicio cs ON cs.IdProducto = fsd.IDPROD_CPT
  LEFT JOIN SIGH_DEPURA..S_DetalleHisLabCPT lc
    ON lc.IdProducto = fsd.IDPROD_CPT
    AND lc.IdCuentaAtencion = fsd.IDCUENTA
    AND lc.IdOrden = fsd.IDORDEN
    AND lc.IdEstado = 1
  WHERE fsd.IDEST_FACT NOT IN (9)
    AND fsd.IDPUNTO_CARGA IN (1,99)
    AND REPLACE(REPLACE(UPPER(LTRIM(RTRIM(CAST(cs.Codigo AS VARCHAR(20))))),'.',''),' ','') IN (
      '92226','67028','76510','92134','92499','67043'
    )

  UNION ALL

  SELECT
    a.IdAtencion,
    a.IdCuentaAtencion,
    a.IdPaciente,
    CAST(ppr.fecharegistro AS DATE) AS Fecha,
    a.IdServicioIngreso AS IdServicio,
    CAST(cs.Codigo AS VARCHAR(20)) AS Codigo,
    REPLACE(REPLACE(UPPER(LTRIM(RTRIM(CAST(cs.Codigo AS VARCHAR(20))))),'.',''),' ','') AS CodigoNorm,
    ISNULL(ppr.valor_LAB, '') AS Valor
  FROM SIGH_DEPURA..S_Activadad_PPR_HIS ppr
  INNER JOIN SIGH_DEPURA..S_Atenciones a ON a.IdCuentaAtencion = ppr.IdCuentaAtencion
  INNER JOIN SIGH_DEPURA..T_Catalogo_Servicio cs ON cs.IdProducto = ppr.IdProducto
  WHERE a.idEstadoAtencion IN (1,2)
    AND ppr.fecharegistro >= @FechaInicio
    AND ppr.fecharegistro < DATEADD(DAY, 1, @FechaFin)
    AND REPLACE(REPLACE(UPPER(LTRIM(RTRIM(CAST(cs.Codigo AS VARCHAR(20))))),'.',''),' ','') IN (
      '92226','67028','76510','92134','92499','67043'
    )
) C;

CREATE INDEX IX_ppr0018_cpms_codigo ON #Cpms (CodigoNorm);
CREATE INDEX IX_ppr0018_cpms_atencion ON #Cpms (IdAtencion);
CREATE INDEX IX_ppr0018_cpms_cuenta ON #Cpms (IdCuentaAtencion);

SELECT
  s.IdAtencion,
  a.IdCuentaAtencion,
  a.IdPaciente,
  a.IdServicioIngreso,
  CAST(a.FechaIngreso AS DATE) AS FechaIngreso,
  CAST(a.FechaEgreso AS DATE) AS FechaEgreso,
  d.CodigoCIE10,
  d.codigoCIEsinPto,
  d.IdCategoria,
  REPLACE(REPLACE(UPPER(LTRIM(RTRIM(d.CodigoCIE10))),'.',''),' ','') AS CodigoNorm,
  ad.Codigo,
  ad.IdClasificacionDx,
  CASE WHEN ISNULL(ad.LabConfHIS, '') = '0' THEN '' ELSE ISNULL(ad.LabConfHIS, '') END AS Valor
INTO #Dx
FROM (
  SELECT IdAtencion FROM #AtencionPeriodo
  UNION
  SELECT IdAtencion FROM #Cpms
) s
INNER JOIN SIGH_DEPURA..S_Atenciones a ON a.IdAtencion = s.IdAtencion
INNER JOIN SIGH_DEPURA..S_DiagnosticoAtc ad ON ad.IdAtencion = s.IdAtencion
INNER JOIN SIGH_DEPURA..T_Diagnostico d ON d.IdDiagnostico = ad.IdDiagnostico
WHERE REPLACE(REPLACE(UPPER(LTRIM(RTRIM(d.CodigoCIE10))),'.',''),' ','') IN (
  'H351','H360',
  'H401','H402','H403','H404','H405','H406','H407','H408','H409',
  'H100','H010','H001','H000'
);

CREATE INDEX IX_ppr0018_dx_codigo_norm ON #Dx (CodigoNorm, Codigo);
CREATE INDEX IX_ppr0018_dx_atencion ON #Dx (IdAtencion);
CREATE INDEX IX_ppr0018_dx_fecha ON #Dx (FechaIngreso);

;WITH CorrectionRows AS (
  SELECT '0081103 - DIAGNOSTICO DE RECIEN NACIDO CON RETINOPATIA DE LA PREMATURIDAD EN SEGUNDO Y TERCER NIVEL DE ATENCION' AS ACTIVIDAD,
    COUNT(DISTINCT c.IdCuentaAtencion) AS TOTAL
  FROM #Cpms c
  WHERE c.CodigoNorm = '92226'
    AND EXISTS (
      SELECT 1 FROM #Dx dx
      WHERE dx.IdAtencion = c.IdAtencion
        AND dx.CodigoNorm = 'H351'
        AND dx.Codigo IN ('D','R')
    )

  UNION ALL
  SELECT '0081205 - TRATAMIENTO ESPECIALIZADO DE RECIEN NACIDO CON RETINOPATIA DE LA PREMATURIDAD CON ANTI-ANGIOGENICOS',
    COUNT(DISTINCT c.IdCuentaAtencion)
  FROM #Cpms c
  WHERE c.CodigoNorm = '67028'
    AND EXISTS (
      SELECT 1 FROM #Dx dx
      WHERE dx.IdAtencion = c.IdAtencion
        AND dx.CodigoNorm = 'H351'
    )

  UNION ALL
  SELECT '0081304 - DIAGNOSTICO DE GLAUCOMA',
    COUNT(DISTINCT IdCuentaAtencion)
  FROM #Dx
  WHERE FechaIngreso BETWEEN @FechaInicio AND @FechaFin
    AND Codigo = 'D'
    AND CodigoNorm IN ('H401','H402','H403','H404','H405','H406','H407','H408','H409')

  UNION ALL
  SELECT '0086506 - EXAMENES DE APOYO AL DIAGNOSTICO EN RETINA',
    COUNT(DISTINCT IdCuentaAtencion)
  FROM #Cpms
  WHERE CodigoNorm IN ('76510','92134')

  UNION ALL
  SELECT '0086507 - EXAMENES DE APOYO AL DIAGNOSTICO EN IMAGENES DE RETINA',
    COUNT(DISTINCT IdCuentaAtencion)
  FROM #Cpms
  WHERE CodigoNorm IN ('92250','92235')

  UNION ALL
  SELECT '0086509 - TRATAMIENTO ESPECIALIZADO DE RETINOPATIA DIABETICA (RD) CON ANTIANGIOGENICOS',
    COUNT(DISTINCT c.IdCuentaAtencion)
  FROM #Cpms c
  WHERE c.CodigoNorm IN ('67028','92499')
    AND EXISTS (SELECT 1 FROM #Dx dx WHERE dx.IdAtencion = c.IdAtencion AND dx.CodigoNorm = 'H360')

  UNION ALL
  SELECT '0086510 - TRATAMIENTO ESPECIALIZADO DE RETINOPATIA DIABETICA (RD) CON VITRECTOMIA',
    COUNT(DISTINCT c.IdCuentaAtencion)
  FROM #Cpms c
  WHERE c.CodigoNorm IN ('67043','92499')
    AND EXISTS (SELECT 1 FROM #Dx dx WHERE dx.IdAtencion = c.IdAtencion AND dx.CodigoNorm = 'H360')

  UNION ALL
  SELECT '0086605 - DIAGNOSTICO ESPECIALIZADO DE ENFERMEDADES EXTERNAS DEL OJO',
    COUNT(DISTINCT IdCuentaAtencion)
  FROM #Dx
  WHERE FechaIngreso BETWEEN @FechaInicio AND @FechaFin
    AND Codigo = 'D'
    AND CodigoNorm IN ('H100','H010','H001','H000')

  UNION ALL
  SELECT '5001608 - TRATAMIENTO Y CONTROL DE PERSONAS SEGUN CLASIFICACION DE RIESGO CARDIOVASCULAR',
    CAST(ROUND(ISNULL(SUM(CASE WHEN LEFT(LTRIM(ACTIVIDAD), 7) = '5001606' THEN TOTAL ELSE 0 END), 0) * 0.80, 0) AS INT)
  FROM #CurrentRows
)
SELECT ACTIVIDAD, SUM(TOTAL) AS TOTAL
FROM (
  SELECT ACTIVIDAD, TOTAL
  FROM #CurrentRows
  WHERE LEFT(LTRIM(ACTIVIDAD), 7) NOT IN ('0081103','0081205','0081304','0086506','0086509','0086510','0086605','5001608')
  UNION ALL
  SELECT ACTIVIDAD, TOTAL
  FROM CorrectionRows
  WHERE LEFT(LTRIM(ACTIVIDAD), 7) IN ('0081103','0081205','0081304','0086506','0086509','0086510','0086605','5001608')
) FinalRows
GROUP BY ACTIVIDAD
ORDER BY ACTIVIDAD;
`

async function readDefinition(pool, procedureName) {
  const result = await pool.request()
    .input('procedure_name', sql.NVarChar(128), procedureName)
    .query(`
      SELECT OBJECT_DEFINITION(OBJECT_ID('dbo.' + @procedure_name)) AS definition;
    `)
  const definition = result.recordset[0]?.definition
  if (!definition) throw new Error(`No se encontro dbo.${procedureName}`)
  return definition
}

function toAlter(definition) {
  return definition.replace(/^\s*CREATE\s+PROCEDURE/i, 'ALTER PROCEDURE')
}

function patchDefinition(definition) {
  let patched = definition.replace(/\nWITH\s+RECOMPILE\s*\nAS/i, '\nAS')
  const start = patched.indexOf('WITH AtencionPeriodo AS')
  const end = patched.lastIndexOf('\nEND')
  const alreadyOptimized = patched.includes('IX_ppr0018_cpms_codigo')

  if (alreadyOptimized) {
    return patched
  }

  if (start < 0 || end < 0 || end <= start) {
    throw new Error('No se encontro el bloque final de usp_PPR_0018.')
  }

  return `${patched.slice(0, start)}${optimizedFinalBlock}${patched.slice(end)}`
}

async function main() {
  await fs.mkdir(backupDir, { recursive: true })

  const pool = await getSqlPool('general')
  try {
    const original = await readDefinition(pool, 'usp_PPR_0018')
    await fs.writeFile(path.join(backupDir, 'usp_PPR_0018.before.sql'), original, 'utf8')

    const patched = toAlter(patchDefinition(original))
    if (patched === toAlter(original)) {
      console.log('SIN CAMBIOS dbo.usp_PPR_0018')
      console.log(`Respaldos: ${backupDir}`)
      return
    }

    await pool.request()
      .input('definition', sql.NVarChar(sql.MAX), patched)
      .query('EXEC sys.sp_executesql @definition;')

    console.log('OK dbo.usp_PPR_0018 optimizado')
    console.log(`Respaldos: ${backupDir}`)
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
