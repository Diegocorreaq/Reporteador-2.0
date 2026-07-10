import { readFileSync } from 'node:fs'
import ExcelJS from 'exceljs'
import { getSqlPool, closeSqlPool } from '../server/db/sql-server.js'

const oldQueryPath = 'C:/Users/diego.correa/.codex/attachments/fe5e9e31-a54c-4f87-bffd-673a9a0a4dda/pasted-text.txt'
const oldQuery = readFileSync(oldQueryPath, 'utf8')

function stripHeader(query) {
  return query
    .replace(/^\s*use\s+SIGH_DEPURA\s*/i, '')
    .replace(/DECLARE\s+@FECHAINICIO\s+DATE\s*=\s*'[^']+'\s*/i, '')
    .replace(/DECLARE\s+@FECHAFIN\s+DATE\s*=\s*'[^']+'\s*/i, '')
    .replace(
      /CAST\(\s*([A-Za-z0-9_.\[\]]+)\s+AS\s+DATE\s*\)\s+BETWEEN\s+@FECHAINICIO\s+AND\s+@FECHAFIN/gi,
      '$1 >= @FechaInicio AND $1 < DATEADD(DAY, 1, @FechaFin)',
    )
}

function removeCommentsAndStringsForScan(sqlText) {
  return sqlText
    .replace(/'([^']|'')*'/g, (match) => ' '.repeat(match.length))
    .replace(/--.*$/gm, (match) => ' '.repeat(match.length))
    .replace(/\/\*[\s\S]*?\*\//g, (match) => ' '.repeat(match.length))
}

function splitTopLevelUnion(sqlText) {
  const scan = removeCommentsAndStringsForScan(sqlText)
  const parts = []
  let depth = 0
  let start = 0
  for (let index = 0; index < scan.length; index += 1) {
    const char = scan[index]
    if (char === '(') depth += 1
    if (char === ')') depth = Math.max(depth - 1, 0)
    if (depth === 0 && /^UNION\s+ALL\b/i.test(scan.slice(index))) {
      parts.push(sqlText.slice(start, index).trim())
      const match = scan.slice(index).match(/^UNION\s+ALL\b/i)
      index += match[0].length - 1
      start = index + 1
    }
  }
  parts.push(sqlText.slice(start).trim())
  return parts.filter(Boolean)
}

const currentBody = stripHeader(oldQuery)
const currentInsertStatements = splitTopLevelUnion(currentBody)
  .map((part) => `INSERT INTO #CurrentRows (ACTIVIDAD, TOTAL)\n${part};`)
  .join('\n\n')

const acceptedOverrideCodes = [
  '0081103',
  '0081205',
  '0081304',
  '0086506',
  '0086509',
  '0086510',
  '0086605',
  '5001608',
]

const queryBody = `
IF OBJECT_ID('tempdb..#CurrentRows') IS NOT NULL DROP TABLE #CurrentRows;

CREATE TABLE #CurrentRows (
  ACTIVIDAD NVARCHAR(700) NOT NULL,
  TOTAL INT NOT NULL
);

${currentInsertStatements}

WITH AtencionPeriodo AS (
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
  FROM SIGH_DEPURA..S_Atenciones a
  WHERE a.idEstadoAtencion IN (1,2)
    AND a.FechaIngreso BETWEEN @FechaInicio AND @FechaFin
),
Cpms AS (
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
  INNER JOIN AtencionPeriodo a ON a.IdCuentaAtencion = fsd.IDCUENTA
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
    AND CAST(ppr.fecharegistro AS DATE) BETWEEN @FechaInicio AND @FechaFin
    AND REPLACE(REPLACE(UPPER(LTRIM(RTRIM(CAST(cs.Codigo AS VARCHAR(20))))),'.',''),' ','') IN (
      '92226','67028','76510','92134','92499','67043'
    )
),
DxScope AS (
  SELECT IdAtencion FROM AtencionPeriodo
  UNION
  SELECT IdAtencion FROM Cpms
),
Dx AS (
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
  FROM DxScope s
  INNER JOIN SIGH_DEPURA..S_Atenciones a ON a.IdAtencion = s.IdAtencion
  INNER JOIN SIGH_DEPURA..S_DiagnosticoAtc ad ON ad.IdAtencion = s.IdAtencion
  INNER JOIN SIGH_DEPURA..T_Diagnostico d ON d.IdDiagnostico = ad.IdDiagnostico
  WHERE REPLACE(REPLACE(UPPER(LTRIM(RTRIM(d.CodigoCIE10))),'.',''),' ','') IN (
    'H351','H360',
    'H401','H402','H403','H404','H405','H406','H407','H408','H409',
    'H100','H010','H001','H000'
  )
),
CorrectionRows AS (
  SELECT '0081103 - DIAGNOSTICO DE RECIEN NACIDO CON RETINOPATIA DE LA PREMATURIDAD EN SEGUNDO Y TERCER NIVEL DE ATENCION' AS ACTIVIDAD,
    COUNT(DISTINCT c.IdCuentaAtencion) AS TOTAL
  FROM Cpms c
  WHERE c.CodigoNorm = '92226'
    AND EXISTS (
      SELECT 1 FROM Dx dx
      WHERE dx.IdAtencion = c.IdAtencion
        AND dx.CodigoNorm = 'H351'
        AND dx.Codigo IN ('D','R')
    )

  UNION ALL
  SELECT '0081205 - TRATAMIENTO ESPECIALIZADO DE RECIEN NACIDO CON RETINOPATIA DE LA PREMATURIDAD CON ANTI-ANGIOGENICOS',
    COUNT(DISTINCT c.IdCuentaAtencion)
  FROM Cpms c
  WHERE c.CodigoNorm = '67028'
    AND EXISTS (
      SELECT 1 FROM Dx dx
      WHERE dx.IdAtencion = c.IdAtencion
        AND dx.CodigoNorm = 'H351'
    )

  UNION ALL
  SELECT '0081304 - DIAGNOSTICO DE GLAUCOMA',
    COUNT(DISTINCT IdCuentaAtencion)
  FROM Dx
  WHERE FechaIngreso BETWEEN @FechaInicio AND @FechaFin
    AND Codigo = 'D'
    AND CodigoNorm IN ('H401','H402','H403','H404','H405','H406','H407','H408','H409')

  UNION ALL
  SELECT '0086506 - EXAMENES DE APOYO AL DIAGNOSTICO EN RETINA',
    COUNT(DISTINCT IdCuentaAtencion)
  FROM Cpms
  WHERE CodigoNorm IN ('76510','92134')

  UNION ALL
  SELECT '0086507 - EXAMENES DE APOYO AL DIAGNOSTICO EN IMAGENES DE RETINA',
    COUNT(DISTINCT IdCuentaAtencion)
  FROM Cpms
  WHERE CodigoNorm IN ('92250','92235')

  UNION ALL
  SELECT '0086509 - TRATAMIENTO ESPECIALIZADO DE RETINOPATIA DIABETICA (RD) CON ANTIANGIOGENICOS',
    COUNT(DISTINCT c.IdCuentaAtencion)
  FROM Cpms c
  WHERE c.CodigoNorm IN ('67028','92499')
    AND EXISTS (SELECT 1 FROM Dx dx WHERE dx.IdAtencion = c.IdAtencion AND dx.CodigoNorm = 'H360')

  UNION ALL
  SELECT '0086510 - TRATAMIENTO ESPECIALIZADO DE RETINOPATIA DIABETICA (RD) CON VITRECTOMIA',
    COUNT(DISTINCT c.IdCuentaAtencion)
  FROM Cpms c
  WHERE c.CodigoNorm IN ('67043','92499')
    AND EXISTS (SELECT 1 FROM Dx dx WHERE dx.IdAtencion = c.IdAtencion AND dx.CodigoNorm = 'H360')

  UNION ALL
  SELECT '0086605 - DIAGNOSTICO ESPECIALIZADO DE ENFERMEDADES EXTERNAS DEL OJO',
    COUNT(DISTINCT IdCuentaAtencion)
  FROM Dx
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
  WHERE LEFT(LTRIM(ACTIVIDAD), 7) NOT IN (${acceptedOverrideCodes.map((code) => `'${code}'`).join(',')})
  UNION ALL
  SELECT ACTIVIDAD, TOTAL
  FROM CorrectionRows
  WHERE LEFT(LTRIM(ACTIVIDAD), 7) IN (${acceptedOverrideCodes.map((code) => `'${code}'`).join(',')})
) FinalRows
GROUP BY ACTIVIDAD
ORDER BY ACTIVIDAD;
`

const correctedQuery = `
USE SIGH_DEPURA;
DECLARE @FechaInicio DATE = '2026-04-01';
DECLARE @FechaFin DATE = '2026-04-30';

${queryBody}
`

const procedureSql = `CREATE_OR_ALTER PROCEDURE dbo.usp_PPR_0018
  @FechaInicio DATE,
  @FechaFin DATE
WITH RECOMPILE
AS
BEGIN
  SET NOCOUNT ON;

${queryBody}
END
`

const reasons = {
  '0081101': 'Se mantiene la logica actual. Pendiente aplicar criterio P07.1/P07.2/P07.3 sin H35.1; aplicado hoy bajaria de 32 a 30 (-2).',
  '0081102': 'Se mantiene la logica actual. Pendiente aplicar CPMS 92226 + H53.1 presuntivo; aplicado hoy bajaria de 8 a 0 (-8).',
  '0081103': 'Se exige CPMS 92226 asociado a H35.1 con D/R; antes bastaba interconsulta con H35.1 definitivo.',
  '0081104': 'Se mantiene la logica actual. Pendiente aplicar consejeria ocular CPMS 99401.16; aplicado hoy bajaria de 8 a 0 (-8).',
  '0081205': 'Se restringe a antiangiogenico 67028 con H35.1; antes incluia laser/vitrectomia.',
  '0081304': 'Se cambia a conteo directo de diagnosticos definitivos H40.1-H40.9.',
  '0081401': 'Se mantiene la logica actual. Pendiente aplicar dx glaucoma repetitivo + CPMS 99199.11 o laser; aplicado hoy bajaria de 45 a 20 (-25).',
  '0081402': 'Se mantiene la logica actual. Pendiente aplicar CPMS 99199.11 con LAB 2; aplicado hoy bajaria de 23 a 0 (-23).',
  '0086505': 'Se mantiene la logica operativa actual. Pendiente revisar el texto E10-E14 del criterio: aplicado literalmente subiria de 23 a 3185 y arrastraria diabetes general.',
  '0086506': 'Se corrigen CPMS a 76510 y 92134; antes incluia 76512 y exigia H36.0.',
  '0086507': 'Se mantiene la logica actual. Pendiente aplicar CPMS 92250/92235; aplicado hoy bajaria de 43 a 0 (-43).',
  '0086509': 'Se corrige codigo de actividad: antiangiogenicos RD es 0086509, no 0086510.',
  '0086510': 'Se deja vitrectomia RD como 0086510 con 67043/92499 asociado a H36.0.',
  '0086511': 'Se mantiene la logica actual. Pendiente aplicar H36.0 asociado a Z48.9; aplicado hoy bajaria de 18 a 0 (-18).',
  '0086605': 'Se restringe a H10.0/H01.0/H00.1/H00.0 definitivos segun criterio.',
  '0086606': 'Se mantiene la logica actual. Pendiente aplicar enfermedad externa ocular repetitiva + CPMS 99199.11; aplicado hoy bajaria de 101 a 1 (-100).',
  '0086610': 'Se mantiene la logica actual. Pendiente aplicar diagnostico listado asociado a 99199.11 o Z48.9; aplicado hoy bajaria de 27 a 5 (-22).',
  '5001606': 'Se mantiene la logica actual. Pendiente aplicar LAB PC en hipertension; aplicado hoy bajaria de 1686 a 8 (-1678).',
  '5001608': 'Se agrega actividad faltante. Por decision operativa temporal se calcula como el 80% de 5001606 - PERSONAS HIPERTENSAS CON TRATAMIENTO ESPECIALIZADO.',
  '5001704': 'Se mantiene la logica actual. Pendiente aplicar LAB PC en diabetes; aplicado hoy bajaria de 1815 a 401 (-1414).',
  '5001705': 'Se mantiene la logica actual. Pendiente aplicar LAB VAL asociado a diabetes; aplicado hoy bajaria de 489 a 0 (-489).',
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
    const code = row.actividad.match(/\b\d{7}\b/)?.[0] ?? row.actividad.toUpperCase().replace(/\s+/g, '_')
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
  const existsResult = await existsRequest.query("SELECT OBJECT_ID('dbo.usp_PPR_0018', 'P') AS id")
  const verb = existsResult.recordset[0]?.id ? 'ALTER' : 'CREATE'
  const installRequest = pool.request()
  installRequest.timeout = 900000
  await installRequest.query(procedureSql.replace('CREATE_OR_ALTER', verb))
  console.log('dbo.usp_PPR_0018 creado/actualizado.')

  if (process.argv.includes('--install-only')) {
    console.log('Modo install-only: se omitio la comparacion completa y la generacion del Excel.')
    await closeSqlPool('general')
    process.exit(0)
  }

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
    const actual = oldRow?.total ?? 0
    const corregido = correctedRow?.total ?? 0
    return {
      code,
      actividad: correctedRow?.actividad ?? oldRow?.actividad ?? code,
      actual,
      corregido,
      diferencia: corregido - actual,
      motivo: reasons[code] ?? 'Se mantiene la logica actual; sin cambio aplicado en esta primera consolidacion.',
    }
  })

  console.table(comparison)

  const workbook = new ExcelJS.Workbook()
  workbook.creator = 'Reporteador 2.0'
  workbook.created = new Date()

  const summary = workbook.addWorksheet('Comparacion abril 2026')
  summary.columns = [
    { header: 'Codigo', key: 'code', width: 12 },
    { header: 'Actividad', key: 'actividad', width: 78 },
    { header: 'Query actual', key: 'actual', width: 14 },
    { header: 'Query corregido', key: 'corregido', width: 16 },
    { header: 'Impacto', key: 'diferencia', width: 12 },
    { header: 'Cambio principal y motivo', key: 'motivo', width: 100 },
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
    { topic: 'Periodo comparado', detail: '2026-04-01 al 2026-04-30, segun el query recibido.' },
    { topic: 'Estrategia', detail: 'Se conserva el query actual para actividades no revisadas y para cambios que reducen produccion. Solo se reemplazan correcciones que no reducen el avance.' },
    { topic: 'Cambios negativos', detail: 'Cuando el criterio de programacion baja la produccion, se mantiene la query anterior y se deja el impacto como pendiente en la columna de motivo.' },
    { topic: 'Duplicidad corregida', detail: 'La actividad de antiangiogenicos RD estaba etiquetada como 0086510; se corrige a 0086509 y se deja 0086510 para vitrectomia.' },
    { topic: 'Pendiente 0086505', detail: 'No se aplica literalmente E10-E14 para diagnostico de retinopatia diabetica porque en abril inflaria 23 -> 3185. Se mantiene la logica operativa y queda para validacion.' },
    { topic: 'Advertencia', detail: 'Hipertension, diabetes y controles con LAB pueden bajar mucho si el registro HIS no esta migrado o no usa PC/VAL/2 de forma uniforme.' },
    { topic: 'Procedimiento creado', detail: 'dbo.usp_PPR_0018(@FechaInicio DATE, @FechaFin DATE).' },
  ])
  styleSheet(notes)

  const reportPath = 'C:/xampp/htdocs/Reporteador-2.0/informes/PPR_0018_comparacion_query_abril_2026.xlsx'
  await workbook.xlsx.writeFile(reportPath)
  console.log(`Excel generado: ${reportPath}`)
} finally {
  await closeSqlPool('general')
}
