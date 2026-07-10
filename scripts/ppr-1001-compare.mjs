import { readFileSync } from 'node:fs'
import ExcelJS from 'exceljs'
import { getSqlPool, closeSqlPool } from '../server/db/sql-server.js'

const oldQueryPath = 'C:/Users/diego.correa/.codex/attachments/505ed990-f0c5-425a-8d7d-4c61641d1785/pasted-text.txt'
const oldQuery = readFileSync(oldQueryPath, 'utf8')

const correctedQuery = `
USE SIGH_DEPURA;
DECLARE @FECHAINICIO DATE = '2026-06-01';
DECLARE @FECHAFIN DATE = '2026-06-30';

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
    CASE
      WHEN DATEDIFF(YEAR, p.FechaNacimiento, a.FechaIngreso) > 0 THEN DATEDIFF(YEAR, p.FechaNacimiento, a.FechaIngreso) * 12
      WHEN DATEDIFF(MONTH, p.FechaNacimiento, a.FechaIngreso) > 0 THEN DATEDIFF(MONTH, p.FechaNacimiento, a.FechaIngreso)
      ELSE 0
    END AS EdadMeses
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
    a.EdadMeses,
    d.CodigoCIE10,
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
    a.EdadMeses,
    d.CodigoCIE10,
    d.IdCategoria,
    ad.Codigo,
    CAST(NULL AS INT) AS IdClasificacionDx,
    '' AS Valor
  FROM Atencion a
  INNER JOIN SIGH_DEPURA..S_DiagnosticoEVo ad ON ad.IdAtencion = a.IdAtencion
  INNER JOIN SIGH_DEPURA..T_Diagnostico d ON d.IdDiagnostico = ad.IdDiagnostico
  WHERE ad.EstadoDX = 1
    AND ad.EstadoVD = 1
),
DxAll AS (
  SELECT * FROM DxAtc
  UNION ALL
  SELECT * FROM DxEvo
),
ConsultaExterna AS (
  SELECT cod_Consultorio FROM SIGH_DEPURA..T_Upss_Consultorio WHERE cod_Upss IN (1)
),
Hospitalizacion AS (
  SELECT cod_Consultorio FROM SIGH_DEPURA..T_Upss_Consultorio WHERE cod_Upss IN (2,3)
),
Cpms AS (
  SELECT
    a.IdAtencion,
    a.IdCuentaAtencion,
    a.IdPaciente,
    a.EdadMeses,
    CAST(a.FechaIngreso AS DATE) AS Fecha,
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
    AND CAST(a.FechaIngreso AS DATE) BETWEEN @FECHAINICIO AND @FECHAFIN

  UNION ALL

  SELECT
    a.IdAtencion,
    a.IdCuentaAtencion,
    a.IdPaciente,
    a.EdadMeses,
    CAST(ppr.fecharegistro AS DATE) AS Fecha,
    a.IdServicioIngreso AS IdServicio,
    CAST(cs.Codigo AS VARCHAR(20)) AS Codigo,
    ISNULL(ppr.valor_LAB, '') AS Valor
  FROM SIGH_DEPURA..S_Activadad_PPR_HIS ppr
  INNER JOIN Atencion a ON a.IdCuentaAtencion = ppr.IdCuentaAtencion
  INNER JOIN SIGH_DEPURA..T_Catalogo_Servicio cs ON cs.IdProducto = ppr.IdProducto
  WHERE CAST(ppr.fecharegistro AS DATE) BETWEEN @FECHAINICIO AND @FECHAFIN
),
AnemiaTratada AS (
  SELECT IdPaciente
  FROM (
    SELECT DISTINCT IdPaciente, 'DX_PR' AS Marca
    FROM DxAtc
    WHERE FechaIngreso BETWEEN @FECHAINICIO AND @FECHAFIN
      AND EdadMeses <= 42
      AND Codigo = 'D'
      AND Valor = 'PR'
      AND CodigoCIE10 IN ('D50.9','D64.9')
      AND IdServicioIngreso IN (SELECT cod_Consultorio FROM ConsultaExterna)

    UNION ALL

    SELECT DISTINCT IdPaciente, 'CP_TA' AS Marca
    FROM Cpms
    WHERE Fecha BETWEEN @FECHAINICIO AND @FECHAFIN
      AND EdadMeses <= 42
      AND Codigo = '99199.17'
      AND Valor = 'TA'
      AND IdServicio IN (SELECT cod_Consultorio FROM ConsultaExterna)

    UNION ALL

    SELECT DISTINCT IdPaciente, 'HB' AS Marca
    FROM Cpms
    WHERE Fecha BETWEEN @FECHAINICIO AND @FECHAFIN
      AND EdadMeses <= 42
      AND Codigo = '85018'
      AND ISNULL(Valor, '') = ''
      AND IdServicio IN (SELECT cod_Consultorio FROM ConsultaExterna)
  ) x
  GROUP BY IdPaciente
  HAVING COUNT(DISTINCT Marca) = 3
),
Corrected AS (
  SELECT '3331101 - INFECCION RESPIRATORIA AGUDA (IRA) NO COMPLICADA' AS ACTIVIDAD, COUNT(DISTINCT IdPaciente) AS TOTAL
  FROM DxAtc
  WHERE FechaIngreso BETWEEN @FECHAINICIO AND @FECHAFIN
    AND EdadMeses < 60
    AND Codigo = 'D'
    AND IdClasificacionDx = 1
    AND IdServicioIngreso IN (SELECT cod_Consultorio FROM ConsultaExterna)
    AND CodigoCIE10 IN ('J00.X','J04.0','J04.1','J04.2','J06.0','J06.8','J06.9','J20.9')

  UNION ALL
  SELECT '3331102 - FARINGOAMIGDALITIS AGUDA', COUNT(DISTINCT IdPaciente)
  FROM DxAtc
  WHERE FechaIngreso BETWEEN @FECHAINICIO AND @FECHAFIN
    AND EdadMeses < 60
    AND Codigo = 'D'
    AND IdClasificacionDx = 1
    AND IdServicioIngreso IN (SELECT cod_Consultorio FROM ConsultaExterna)
    AND CodigoCIE10 IN ('J02.0','J02.9','J03.0','J03.8','J03.9')

  UNION ALL
  SELECT '3331103 - OTITIS MEDIA AGUDA (OMA)', COUNT(DISTINCT IdPaciente)
  FROM DxAtc
  WHERE FechaIngreso BETWEEN @FECHAINICIO AND @FECHAFIN
    AND EdadMeses < 60
    AND Codigo = 'D'
    AND IdClasificacionDx = 1
    AND IdServicioIngreso IN (SELECT cod_Consultorio FROM ConsultaExterna)
    AND CodigoCIE10 IN ('H65.0','H65.1','H66.0','H66.9')

  UNION ALL
  SELECT '3331104 - SINUSITIS AGUDA', COUNT(DISTINCT IdPaciente)
  FROM DxAtc
  WHERE FechaIngreso BETWEEN @FECHAINICIO AND @FECHAFIN
    AND EdadMeses < 60
    AND Codigo = 'D'
    AND IdClasificacionDx = 1
    AND IdServicioIngreso IN (SELECT cod_Consultorio FROM ConsultaExterna)
    AND CodigoCIE10 IN ('J01.0','J01.1','J01.2','J01.3','J01.4','J01.9')

  UNION ALL
  SELECT '3331105 - NEUMONIA SIN COMPLICACIONES Y OTROS', COUNT(DISTINCT IdPaciente)
  FROM DxAtc
  WHERE FechaIngreso BETWEEN @FECHAINICIO AND @FECHAFIN
    AND EdadMeses < 60
    AND Codigo = 'D'
    AND IdClasificacionDx = 1
    AND IdServicioIngreso IN (SELECT cod_Consultorio FROM ConsultaExterna)
    AND CodigoCIE10 IN ('J12.9','J15.9','J18.9')

  UNION ALL
  SELECT '3331201 - EDA ACUOSA NO COMPLICADA', COUNT(DISTINCT IdPaciente)
  FROM DxAtc
  WHERE FechaIngreso BETWEEN @FECHAINICIO AND @FECHAFIN
    AND EdadMeses < 60
    AND Codigo = 'D'
    AND IdClasificacionDx = 1
    AND IdServicioIngreso IN (SELECT cod_Consultorio FROM ConsultaExterna)
    AND (
      CodigoCIE10 IN ('A00.9','A01.0','A01.1','A01.2','A01.3','A01.4','A02.0','A04.0','A04.1','A04.9','A05.9','A06.2','A07.2','A08.0','A08.2','A08.3','A08.4','A09.0','A09.9')
      OR IdCategoria = 'A07'
    )

  UNION ALL
  SELECT '3331203 - EDA DISENTERICA', COUNT(DISTINCT IdPaciente)
  FROM DxAtc
  WHERE FechaIngreso BETWEEN @FECHAINICIO AND @FECHAFIN
    AND EdadMeses < 60
    AND Codigo = 'D'
    AND IdClasificacionDx = 1
    AND IdServicioIngreso IN (SELECT cod_Consultorio FROM ConsultaExterna)
    AND CodigoCIE10 IN ('A03.0','A03.9','A04.2','A04.3','A04.5','A06.0')

  UNION ALL
  SELECT '3331204 - EDA PERSISTENTE', COUNT(DISTINCT IdPaciente)
  FROM DxAtc
  WHERE FechaIngreso BETWEEN @FECHAINICIO AND @FECHAFIN
    AND EdadMeses < 60
    AND Codigo = 'D'
    AND IdClasificacionDx = 1
    AND IdServicioIngreso IN (SELECT cod_Consultorio FROM ConsultaExterna)
    AND CodigoCIE10 = 'A09.X'

  UNION ALL
  SELECT '3331301 - INFECCIONES RESPIRATORIAS AGUDAS CON COMPLICACIONES', COUNT(DISTINCT IdPaciente)
  FROM DxAll
  WHERE FechaEgreso BETWEEN @FECHAINICIO AND @FECHAFIN
    AND EdadMeses < 60
    AND Codigo = 'D'
    AND (
      IdServicioIngreso IN (SELECT cod_Consultorio FROM ConsultaExterna)
      OR IdServicioEgreso IN (SELECT cod_Consultorio FROM Hospitalizacion)
    )
    AND CodigoCIE10 IN ('A36.9','A37.0','A37.1','A37.8','A37.9','J12.0','J12.1','J12.2','J12.3','J12.8','J13.X','J14.X','J15.0','J15.1','J15.2','J15.3','J15.4','J15.7','J15.8','J16.0','J16.8')

  UNION ALL
  SELECT '3331302 - NEUMONIA GRAVE O ENFERMEDAD MUY GRAVE EN NIÑOS MENORES DE 2 MESES', COUNT(DISTINCT IdPaciente)
  FROM DxAll
  WHERE FechaEgreso BETWEEN @FECHAINICIO AND @FECHAFIN
    AND EdadMeses < 2
    AND Codigo = 'D'
    AND (
      IdServicioIngreso IN (SELECT cod_Consultorio FROM ConsultaExterna)
      OR IdServicioEgreso IN (SELECT cod_Consultorio FROM Hospitalizacion)
    )
    AND CodigoCIE10 IN ('J05.0','J05.1','J85.1','J86.0','J86.9','J90.X','J93.9','J10.0','J11.0','J15.5','J15.6','J18.0','J18.1','J18.2','J18.8')

  UNION ALL
  SELECT '3331305 - NEUMONIA Y ENFERMEDAD MUY GRAVE EN NIÑOS DE 2 MESES A 4 AÑOS', COUNT(DISTINCT IdPaciente)
  FROM DxAll
  WHERE FechaEgreso BETWEEN @FECHAINICIO AND @FECHAFIN
    AND EdadMeses BETWEEN 2 AND 59
    AND Codigo = 'D'
    AND (
      IdServicioIngreso IN (SELECT cod_Consultorio FROM ConsultaExterna)
      OR IdServicioEgreso IN (SELECT cod_Consultorio FROM Hospitalizacion)
    )
    AND CodigoCIE10 IN ('J05.0','J05.1','J85.1','J86.0','J86.9','J90.X','J93.9','J10.0','J11.0','J15.5','J15.6','J18.0','J18.1','J18.2','J18.8')

  UNION ALL
  SELECT '3331401 - ATENCION EDA CON ALGUN GRADO DE DESHIDRATACION', COUNT(DISTINCT a.IdPaciente)
  FROM Atencion a
  WHERE a.FechaEgreso BETWEEN @FECHAINICIO AND @FECHAFIN
    AND a.EdadMeses < 60
    AND (
      a.IdServicioIngreso IN (SELECT cod_Consultorio FROM ConsultaExterna)
      OR a.IdServicioEgreso IN (SELECT cod_Consultorio FROM Hospitalizacion)
    )
    AND EXISTS (
      SELECT 1 FROM DxAll dx
      WHERE dx.IdAtencion = a.IdAtencion
        AND dx.Codigo = 'D'
        AND dx.CodigoCIE10 IN ('A00.9','A01.0','A01.1','A01.2','A01.3','A01.4','A02.0','A03.0','A03.9','A04.0','A04.1','A04.2','A04.3','A04.5','A04.9','A05.9','A06.0','A06.2','A07.1','A07.2','A08.0','A08.2','A08.3','A08.4','A09.0','A09.9','A09.X')
    )
    AND EXISTS (
      SELECT 1 FROM DxAll dx
      WHERE dx.IdAtencion = a.IdAtencion
        AND dx.Codigo = 'D'
        AND dx.CodigoCIE10 = 'E86.X'
    )

  UNION ALL
  SELECT '3331402 - ATENCION EDA CON DESHIDRATACION GRAVE SIN Y CON SHOCK', COUNT(DISTINCT a.IdPaciente)
  FROM Atencion a
  WHERE a.FechaEgreso BETWEEN @FECHAINICIO AND @FECHAFIN
    AND a.EdadMeses < 60
    AND (
      a.IdServicioIngreso IN (SELECT cod_Consultorio FROM ConsultaExterna)
      OR a.IdServicioEgreso IN (SELECT cod_Consultorio FROM Hospitalizacion)
    )
    AND EXISTS (
      SELECT 1 FROM DxAll dx
      WHERE dx.IdAtencion = a.IdAtencion
        AND dx.Codigo = 'D'
        AND dx.CodigoCIE10 IN ('A00.9','A01.0','A01.1','A01.2','A01.3','A01.4','A02.0','A03.0','A03.9','A04.0','A04.1','A04.2','A04.3','A04.5','A04.9','A05.9','A06.0','A06.2','A07.1','A07.2','A08.0','A08.2','A08.3','A08.4','A09.0','A09.9','A09.X')
    )
    AND EXISTS (
      SELECT 1 FROM DxAll dx
      WHERE dx.IdAtencion = a.IdAtencion
        AND dx.Codigo = 'D'
        AND dx.CodigoCIE10 IN ('E86.X','R57.1','K56.0','E87.2')
    )

  UNION ALL
  SELECT '3331501 - ANEMIA', COUNT(DISTINCT IdPaciente)
  FROM AnemiaTratada

  UNION ALL
  SELECT '3331502 - SOB/ASMA', COUNT(DISTINCT IdPaciente)
  FROM DxAll
  WHERE FechaEgreso BETWEEN @FECHAINICIO AND @FECHAFIN
    AND EdadMeses < 60
    AND Codigo = 'D'
    AND (
      IdServicioIngreso IN (SELECT cod_Consultorio FROM ConsultaExterna)
      OR IdServicioEgreso IN (SELECT cod_Consultorio FROM Hospitalizacion)
    )
    AND CodigoCIE10 IN ('J21.0','J21.1','J21.8','J21.9','J44.0','J44.1','J44.8','J44.9','J45.0','J45.1','J45.9','J46.X')

  UNION ALL
  SELECT '3341401 - PARASITOSIS INTESTINAL', COUNT(DISTINCT IdPaciente)
  FROM DxAtc
  WHERE FechaIngreso BETWEEN @FECHAINICIO AND @FECHAFIN
    AND EdadMeses BETWEEN 12 AND 59
    AND Codigo = 'D'
    AND IdClasificacionDx = 1
    AND IdServicioIngreso IN (SELECT cod_Consultorio FROM ConsultaExterna)
    AND (
      CodigoCIE10 IN ('A07.1','A07.0','B66.3','B66.4','B68.0','B68.1','B68.9','B70','B71.0','B71','B76.0','B76.1','B76.9','B77.9','B78.0','B79','B80','B82.0','B82.9')
      OR IdCategoria = 'A06'
    )
)
SELECT ACTIVIDAD, TOTAL
FROM Corrected
ORDER BY ACTIVIDAD;
`

const correctedBody = correctedQuery.replace(
  "USE SIGH_DEPURA;\nDECLARE @FECHAINICIO DATE = '2026-06-01';\nDECLARE @FECHAFIN DATE = '2026-06-30';\n\n",
  '',
)

const procedureSql = `CREATE_OR_ALTER PROCEDURE dbo.usp_PPR_1001
  @FechaInicio DATE,
  @FechaFin DATE
AS
BEGIN
  SET NOCOUNT ON;

${correctedBody}
END;
`

const reasons = {
  '3331101': 'Se alinea a consulta externa, menor de 5 anos, diagnostico definitivo y CIE del criterio. Baja por filtro estricto de fecha/ambito.',
  '3331102': 'Se agrega diagnostico definitivo y consulta externa pediatrica segun criterio. Baja por registros que no cumplen Dx definitivo/ambito.',
  '3331103': 'Ya estaba alineada en CIE, edad, Dx definitivo y consulta externa. No cambia.',
  '3331104': 'Ya estaba alineada, sin produccion en el periodo comparado.',
  '3331105': 'Se corrige a CIE J12.9/J15.9/J18.9, menor de 5 anos, Dx definitivo y consulta externa. El query anterior mezclaba otra fuente y no respetaba CE/edad de forma estricta.',
  '3331201': 'Se mantiene EDA acuosa no complicada con consulta externa, menor de 5 anos, Dx definitivo y codigos del criterio. Sin produccion en el periodo.',
  '3331203': 'Se mantiene EDA disenterica con consulta externa, menor de 5 anos y Dx definitivo. Sin produccion en el periodo.',
  '3331204': 'Se mantiene EDA persistente con A09.X, consulta externa, menor de 5 anos y Dx definitivo. Sin produccion en el periodo.',
  '3331301': 'Se agrega ambito completo del criterio: consulta externa u hospitalizacion/internamiento. Sube por incluir fuente hospitalaria/evoluciones validas.',
  '3331302': 'Se restringe a menor de 2 meses, Dx definitivo, CIE listados y CE/hospitalizacion. Baja porque los registros previos no cumplen el criterio completo.',
  '3331305': 'Se corrige edad a 2-59 meses y CIE listados, con CE/hospitalizacion. Baja por excluir registros fuera de criterio.',
  '3331401': 'Se exige asociacion EDA + E86.X en la misma atencion y se agrega CE/hospitalizacion. Sube levemente por incluir ambito hospitalario.',
  '3331402': 'Se corrige la logica: EDA asociada a E86.X/R57.1/K56.0/E87.2 en la misma atencion. El query anterior exigia codigos incompatibles en un solo diagnostico y daba cero.',
  '3331501': 'Regla operativa simplificada: DX D50.9/D64.9 con LAB PR, CPMS 99199.17 con LAB TA y CPMS 85018 con LAB vacio, edad <= 42 meses. Sin casos completos en junio.',
  '3331502': 'Se codifica SOB/ASMA como 3331502 y se ordena CE + hospitalizacion/internamiento. Baja por deduplicar y aplicar ambito/fecha de forma uniforme.',
  '3341401': 'Se restringe a consulta externa, diagnostico definitivo y edad 12-59 meses como criterio. Baja por excluir menores de 1 ano u otros ambitos.',
}

function normalizeRows(rows) {
  return rows.map((row) => ({
    actividad: String(row.ACTIVIDAD ?? row.Actividad ?? row.actividad ?? ''),
    total: Number(row.TOTAL ?? row.Total ?? row.total ?? 0),
  }))
}

function byCode(rows) {
  const map = new Map()
  for (const row of rows) {
    const code = row.actividad.toUpperCase().trim() === 'SOB/ASMA'
      ? '3331502'
      : (row.actividad.match(/\b\d{7}\b/)?.[0] ?? row.actividad.toUpperCase().replace(/\s+/g, '_'))
    map.set(code, row)
  }
  return map
}

const pool = await getSqlPool('general')

try {
  const existsRequest = pool.request()
  const existsResult = await existsRequest.query("SELECT OBJECT_ID('dbo.usp_PPR_1001', 'P') AS id")
  const verb = existsResult.recordset[0]?.id ? 'ALTER' : 'CREATE'
  const installRequest = pool.request()
  installRequest.timeout = 900000
  await installRequest.query(procedureSql.replace('CREATE_OR_ALTER', verb))
  console.log('dbo.usp_PPR_1001 creado/actualizado.')

  const oldRequest = pool.request()
  oldRequest.timeout = 900000
  const oldResult = await oldRequest.query(oldQuery)
  const oldRows = normalizeRows(oldResult.recordset)

  const correctedRequest = pool.request()
  correctedRequest.timeout = 900000
  const correctedResult = await correctedRequest.query(correctedQuery)
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
    EXEC dbo.usp_PPR_1001
      @FechaInicio = '2026-06-01',
      @FechaFin = '2026-06-30';
  `)
  console.log('Verificacion procedimiento dbo.usp_PPR_1001')
  console.table(normalizeRows(verifyResult.recordset))

  const workbook = new ExcelJS.Workbook()
  workbook.creator = 'Reporteador 2.0'
  workbook.created = new Date()

  const summary = workbook.addWorksheet('Comparacion junio 2026')
  summary.columns = [
    { header: 'Codigo', key: 'code', width: 12 },
    { header: 'Actividad', key: 'actividad', width: 70 },
    { header: 'Query actual', key: 'actual', width: 14 },
    { header: 'Query corregido', key: 'corregido', width: 16 },
    { header: 'Impacto', key: 'diferencia', width: 12 },
    { header: 'Cambio principal y motivo', key: 'motivo', width: 90 },
  ]
  summary.addRows(comparison)
  summary.getRow(1).font = { bold: true, color: { argb: 'FFFFFFFF' } }
  summary.getRow(1).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF0C2340' } }
  summary.getRow(1).alignment = { vertical: 'middle', horizontal: 'center', wrapText: true }
  summary.eachRow((row, rowNumber) => {
    row.alignment = { vertical: 'top', wrapText: true }
    if (rowNumber > 1) {
      const impact = Number(row.getCell('E').value ?? 0)
      row.getCell('E').font = {
        bold: true,
        color: { argb: impact > 0 ? 'FF047857' : impact < 0 ? 'FFB91C1C' : 'FF334155' },
      }
    }
  })
  summary.autoFilter = 'A1:F1'
  summary.views = [{ state: 'frozen', ySplit: 1 }]

  const notes = workbook.addWorksheet('Criterios aplicados')
  notes.columns = [
    { header: 'Tema', key: 'topic', width: 32 },
    { header: 'Detalle', key: 'detail', width: 110 },
  ]
  notes.addRows([
    { topic: 'Periodo comparado', detail: '2026-06-01 al 2026-06-30.' },
    { topic: 'Unidad de conteo', detail: 'Se mantiene COUNT(DISTINCT IdPaciente), igual que el query operativo actual.' },
    { topic: 'Consulta externa', detail: 'Se usa T_Upss_Consultorio.cod_Upss IN (1).' },
    { topic: 'Hospitalizacion/internamiento', detail: 'Se usa T_Upss_Consultorio.cod_Upss IN (2,3).' },
    { topic: 'Anemia', detail: 'Paciente tratado: DX D50.9 o D64.9 con LAB PR, CPMS 99199.17 con LAB TA y CPMS 85018 con LAB vacio; edad <= 42 meses.' },
    { topic: 'Procedimiento creado', detail: 'dbo.usp_PPR_1001(@FechaInicio DATE, @FechaFin DATE).' },
  ])
  notes.getRow(1).font = { bold: true, color: { argb: 'FFFFFFFF' } }
  notes.getRow(1).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF0C2340' } }
  notes.eachRow((row) => {
    row.alignment = { vertical: 'top', wrapText: true }
  })

  const reportPath = 'C:/xampp/htdocs/Reporteador-2.0/informes/PPR_1001_comparacion_query_junio_2026.xlsx'
  await workbook.xlsx.writeFile(reportPath)
  console.log(`Excel generado: ${reportPath}`)

  const probeRequest = pool.request()
  probeRequest.timeout = 900000
  const probe = await probeRequest.query(`
    USE SIGH_DEPURA;
    DECLARE @FECHAINICIO DATE = '2026-06-01';
    DECLARE @FECHAFIN DATE = '2026-06-30';

    SELECT '3331105_old_diag_ids' AS probe, IdDiagnostico, CodigoCIE10, DesCiex10
    FROM SIGH_DEPURA..T_Diagnostico
    WHERE IdDiagnostico IN (3563,3575,3587)
    ORDER BY IdDiagnostico;

    WITH Base AS (
      SELECT
        A.IdPaciente,
        D.IdDiagnostico,
        D.CodigoCIE10,
        CASE WHEN CE.cod_Consultorio IS NOT NULL AND AD.IdClasificacionDx = 1 THEN 1 ELSE 0 END AS EsCE
      FROM SIGH_DEPURA..S_Atenciones A
      INNER JOIN SIGH_DEPURA..S_DiagnosticoAtc AD ON AD.IdAtencion = A.IdAtencion
      INNER JOIN SIGH_DEPURA..T_Diagnostico D ON D.IdDiagnostico = AD.IdDiagnostico
      INNER JOIN SIGH_DEPURA..T_Paciente P ON P.IdPaciente = A.IdPaciente
      LEFT JOIN SIGH_DEPURA..T_Upss_Consultorio CE
        ON CE.cod_Consultorio = A.IdServicioIngreso
       AND CE.cod_Upss IN (1)
      WHERE CAST(A.FechaIngreso AS DATE) BETWEEN @FECHAINICIO AND @FECHAFIN
        AND A.idEstadoAtencion IN (1,2)
        AND AD.Codigo = 'D'
        AND (
          CASE
            WHEN DATEDIFF(YEAR, P.FechaNacimiento, A.FechaIngreso) > 0 THEN DATEDIFF(YEAR, P.FechaNacimiento, A.FechaIngreso) * 12
            WHEN DATEDIFF(MONTH, P.FechaNacimiento, A.FechaIngreso) > 0 THEN DATEDIFF(MONTH, P.FechaNacimiento, A.FechaIngreso)
            ELSE 0
          END
        ) < 60
    )
    SELECT
      '3331105_criterion_steps' AS probe,
      COUNT(DISTINCT CASE WHEN CodigoCIE10 IN ('J12.9','J15.9','J18.9') THEN IdPaciente END) AS criterio_cie_sin_upss,
      COUNT(DISTINCT CASE WHEN CodigoCIE10 IN ('J12.9','J15.9','J18.9') AND EsCE = 1 THEN IdPaciente END) AS criterio_cie_ce,
      COUNT(DISTINCT CASE WHEN IdDiagnostico IN (3563,3575,3587) THEN IdPaciente END) AS ids_antiguos_sin_upss,
      COUNT(DISTINCT CASE WHEN IdDiagnostico IN (3563,3575,3587) AND EsCE = 1 THEN IdPaciente END) AS ids_antiguos_ce
    FROM Base;
  `)
  for (const [index, recordset] of probe.recordsets.entries()) {
    console.log(`probe_${index + 1}`)
    console.table(recordset)
  }
} finally {
  await closeSqlPool('general')
}
