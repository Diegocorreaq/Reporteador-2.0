import { getSqlPool, closeSqlPool } from '../server/db/sql-server.js'

const procedureSql = `
CREATE_OR_ALTER PROCEDURE dbo.usp_PPR_0104
  @FechaInicio DATE,
  @FechaFin DATE
WITH RECOMPILE
AS
BEGIN
  SET NOCOUNT ON;

  SELECT '5002824 - ATENCION AMBULATORIA DE URGENCIAS (PRIORIDAD III O IV) EN MODULOS HOSPITLARIOS DIFERENCIADOS AUTORIZADOS' AS [ACTIVIDAD],
         COUNT(A.idatencion) AS [TOTAL]
  FROM SIGH_DEPURA..Rpt_Indicador_Emergencia A
  WHERE A.FechaIngreso BETWEEN @FechaInicio AND @FechaFin
    AND A.Gravedad IN ('Prioridad III','Prioridad IV')

  UNION ALL

  SELECT '5005901 - ATENCION DE TRIAJE' AS [ACTIVIDAD],
         COUNT(IdTriaje) AS [TOTAL]
  FROM SIGH_DEPURA..Rpt_Indicador_Triaje
  WHERE CAST(Fecha AS DATE) BETWEEN @FechaInicio AND @FechaFin

  UNION ALL

  SELECT '5005903 - ATENCION DE LA EMERGENCIA Y URGENCIA ESPECIALIZADA' AS [ACTIVIDAD],
         COUNT(A.idcuenta) AS [TOTAL]
  FROM SIGH_DEPURA..Rpt_Indicador_Emergencia A
  WHERE CAST(A.FechaIngreso AS DATE) BETWEEN @FechaInicio AND @FechaFin
    AND A.Gravedad IN ('Prioridad I','Prioridad II')

  UNION ALL

  SELECT '5005904 - ATENCION DE LA EMERGENCIA DE CUIDADOS INTENSIVOS' AS [ACTIVIDAD],
         SUM(X.Transf) + SUM(X.TotEgr) AS [TOTAL]
  FROM SIGH_DEPURA..Rpt_MovimientoHospitalario X
  LEFT JOIN SIGH_DEPURA..T_Upss_Consultorio S ON S.cod_Consultorio = X.idservicio
  WHERE CAST(X.fecha AS DATE) BETWEEN @FechaInicio AND @FechaFin
    AND X.idservicio IN (9000,9001,9008,9010,9011)
  GROUP BY DATENAME(MONTH, X.fecha)

  UNION ALL

  SELECT '5005905 - ATENCION DE LA EMERGENCIA QUIRURGICA' AS [ACTIVIDAD],
         COUNT(IdCuenta) AS [TOTAL]
  FROM SIGH_DEPURA..Rpt_Indicador_CentroCQX rp
  INNER JOIN SIGH_DEPURA..T_Upss_Consultorio C ON rp.IdServicioProcedencia = C.cod_Consultorio
  INNER JOIN SIGH_DEPURA..T_Upss TUPS ON TUPS.cod_upss = C.cod_Upss
  WHERE rp.Estado = 1
    AND [Cirugia?] = 'SI'
    AND TipoCirugia = 'EMERGENCIA'
    AND CAST(FechaRegistro AS DATE) BETWEEN @FechaInicio AND @FechaFin;
END
`

function normalizeRows(rows) {
  return rows.map((row) => ({
    actividad: String(row.ACTIVIDAD ?? row.Actividad ?? row.actividad ?? ''),
    total: Number(row.TOTAL ?? row.Total ?? row.total ?? 0),
  }))
}

const pool = await getSqlPool('general')

try {
  const existsRequest = pool.request()
  const existsResult = await existsRequest.query("SELECT OBJECT_ID('dbo.usp_PPR_0104', 'P') AS id")
  const verb = existsResult.recordset[0]?.id ? 'ALTER' : 'CREATE'

  const installRequest = pool.request()
  installRequest.timeout = 300000
  await installRequest.query(procedureSql.replace('CREATE_OR_ALTER', verb))
  console.log('dbo.usp_PPR_0104 creado/actualizado.')

  const verifyRequest = pool.request()
  verifyRequest.timeout = 300000
  const verifyResult = await verifyRequest.query(`
    EXEC dbo.usp_PPR_0104
      @FechaInicio = '2026-06-01',
      @FechaFin = '2026-06-30';
  `)
  console.table(normalizeRows(verifyResult.recordset))
} finally {
  await closeSqlPool('general')
}
