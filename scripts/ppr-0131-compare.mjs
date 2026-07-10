import { readFileSync, writeFileSync } from 'node:fs'
import ExcelJS from 'exceljs'
import { getSqlPool, closeSqlPool } from '../server/db/sql-server.js'

const excelPath = 'C:/Users/diego.correa/Desktop/DIEGO CORREA/PPR/CADENA PROGRAMATICA/2026/do-y-cp_2026_pp-0131_3.xlsx'
const tamizajesPath = 'scripts/ppr-0131-tamizajes.sql'
const tratamientosPath = 'scripts/ppr-0131-tratamientos.sql'
const reportPath = 'informes/PPR_0131_comparacion_query_junio_2026.xlsx'

const fechaInicio = '2026-06-01'
const fechaFin = '2026-06-30'

const codeFixMap = new Map([
  ['006013', '0060613'],
  ['006014', '0060614'],
  ['007612', '0070612'],
  ['007615', '0070615'],
  ['007016', '0070616'],
  ['007610', '0070610'],
  ['007011', '0070611'],
  ['007629', '0070629'],
  ['007617', '0070617'],
])

function stripDateDeclarations(sqlText) {
  return sqlText
    .replace(/^\uFEFF/, '')
    .split(/\r?\n/)
    .filter((line) => !/^\s*DECLARE\s+@FechaInicio\b/i.test(line))
    .filter((line) => !/^\s*DECLARE\s+@FechaFin\b/i.test(line))
    .join('\n')
    .trim()
}

function standaloneSql(sqlText) {
  return `
DECLARE @FechaInicio DATE = '${fechaInicio}';
DECLARE @FechaFin DATE = '${fechaFin}';

${stripDateDeclarations(sqlText)}
`
}

function cleanText(value) {
  return String(value ?? '').replace(/\s+/g, ' ').trim()
}

function sourceKeyFromText(value) {
  const text = String(value ?? '')
  const seven = text.match(/\b(\d{7})\b/)
  if (seven) return seven[1]
  const six = text.match(/\b(\d{6})\b/)
  if (six && codeFixMap.has(six[1])) return codeFixMap.get(six[1])
  return null
}

function normalizeRows(rows) {
  return rows.map((row) => {
    const rawActivity = row.ACTIVIDAD
      ?? row.Actividad
      ?? row.actividad
      ?? row['Actividad Operativa']
      ?? row['Actividad operativa']
      ?? ''
    const rawCode = row['Codigo Actividad'] ?? row.CodigoActividad ?? ''
    const activity = cleanText(rawActivity || rawCode)
    const code = sourceKeyFromText(`${rawCode} ${activity}`)
    return {
      code,
      activity,
      total: Number(row.TOTAL ?? row.Total ?? row.total ?? row.Total ?? 0),
    }
  }).filter((row) => row.code)
}

function rowsToMap(rows) {
  const map = new Map()
  for (const row of rows) {
    map.set(row.code, {
      activity: row.activity,
      total: (map.get(row.code)?.total ?? 0) + Number(row.total ?? 0),
    })
  }
  return map
}

function replaceBetween(source, startPattern, endPattern, replacement) {
  const startMatch = source.match(startPattern)
  if (!startMatch?.index && startMatch?.index !== 0) {
    throw new Error(`No se encontro inicio para reemplazo: ${startPattern}`)
  }
  const endStart = startMatch.index + startMatch[0].length
  const tail = source.slice(endStart)
  const endMatch = tail.match(endPattern)
  if (!endMatch?.index && endMatch?.index !== 0) {
    throw new Error(`No se encontro fin para reemplazo: ${endPattern}`)
  }
  const endIndex = endStart + endMatch.index
  return source.slice(0, startMatch.index) + replacement + source.slice(endIndex)
}

function buildTamizajeBody(rawSql) {
  let body = stripDateDeclarations(rawSql)

  body = body.replace(
    /\/\* =================================================\s+RESULTADO FINAL[\s\S]*?ORDER BY\s+AO\.OrdenExcel;[\s\S]*?\/\* =================================================\s+LIMPIEZA OPCIONAL[\s\S]*$/i,
    `
INSERT INTO #Ppr0131Resultado (Orden, ACTIVIDAD, TOTAL)
SELECT
    AO.OrdenExcel,
    AO.ActividadOperativa AS [ACTIVIDAD],
    ISNULL(COUNT(DISTINCT AD.NroDocumento), 0) AS [TOTAL]
FROM #ActividadOperativa AO
LEFT JOIN #ActividadDetectada AD
    ON AD.OrdenExcel = AO.OrdenExcel
GROUP BY
    AO.OrdenExcel,
    AO.ActividadOperativa;
`,
  )

  return body
}

function buildTratamientoBody(rawSql) {
  let body = stripDateDeclarations(rawSql)

  body = body.replace(
    'A.IdPaciente,\n    CAST(A.FechaIngreso AS DATE) AS Fecha,',
    "A.IdPaciente,\n    LTRIM(RTRIM(P.NroDocumento)) AS NroDocumento,\n    CAST(A.FechaIngreso AS DATE) AS Fecha,",
  )
  body = body.replace(
    'WHERE A.FechaIngreso >= @FechaInicio\n  AND A.FechaIngreso < DATEADD(DAY, 1, @FechaFin)',
    "WHERE A.FechaIngreso >= @FechaInicio\n  AND A.FechaIngreso < DATEADD(DAY, 1, @FechaFin)\n  AND P.NroDocumento IS NOT NULL\n  AND LTRIM(RTRIM(P.NroDocumento)) <> ''",
  )

  body = replaceBetween(
    body,
    /INSERT INTO #ActividadPPR \([\s\S]*?\)\s*\n/i,
    /\/\* =================================================\s+REGLAS CPMS \+ LAB/i,
    `INSERT INTO #ActividadPPR (
    OrdenExcel,
    CodigoActividad,
    NroActividad,
    ActividadOperativa
)
SELECT 1,  '0060613', 3,  N'0060613 - TRATAMIENTO ESPECIALIZADO DE PERSONAS AFECTADAS POR VIOLENCIA SEXUAL' UNION ALL
SELECT 2,  '0060614', 2,  N'0060614 - TRATAMIENTO DE NINOS, NINAS Y ADOLESCENTES AFECTADOS POR MALTRATO INFANTIL' UNION ALL
SELECT 3,  '0070612', 1,  N'0070612 - TRATAMIENTO ESPECIALIZADO EN VIOLENCIA FAMILIAR' UNION ALL
SELECT 4,  '0070615', 4,  N'0070615 - TRATAMIENTO ESPECIALIZADO NINOS, NINAS Y ADOLESCENTES AFECTADOS POR VIOLENCIA SEXUAL' UNION ALL
SELECT 5,  '0070616', 6,  N'0070616 - TRATAMIENTO AMBULATORIO DE NINOS, NINAS Y ADOLESCENTES DE 0 A 17 ANOS CON TRASTORNOS DEL ESPECTRO AUTISTA' UNION ALL
SELECT 6,  '5005927', 8,  N'5005927 - TRATAMIENTO AMBULATORIO DE NINOS, NINAS Y ADOLESCENTES DE 0 A 17 ANOS POR TRASTORNOS MENTALES Y DEL COMPORTAMIENTO' UNION ALL
SELECT 7,  '0070610', 5,  N'0070610 - TRATAMIENTO AMBULATORIO DE PERSONAS CON CONDUCTA SUICIDA' UNION ALL
SELECT 8,  '0070611', 9,  N'0070611 - TRATAMIENTO AMBULATORIO DE PERSONAS CON ANSIEDAD' UNION ALL
SELECT 9,  '5005190', 7,  N'5005190 - TRATAMIENTO AMBULATORIO DE PERSONAS CON DEPRESION' UNION ALL
SELECT 10, '0070619', 11, N'0070619 - TRATAMIENTO AMBULATORIO DE PERSONAS CON PRIMER EPISODIO PSICOTICO' UNION ALL
SELECT 11, '0070629', 13, N'0070629 - TRATAMIENTO AMBULATORIO PARA LAS PERSONAS CON DETERIORO COGNITIVO' UNION ALL
SELECT 12, '5005195', 15, N'5005195 - TRATAMIENTO AMBULATORIO A PERSONAS CON SINDROME PSICOTICO O TRASTORNO DEL ESPECTRO DE LA ESQUIZOFRENIA' UNION ALL
SELECT 13, '0070627', 14, N'0070627 - PRIMEROS AUXILIOS PSICOLOGICOS EN SITUACIONES DE CRISIS Y EMERGENCIAS HUMANITARIAS' UNION ALL
SELECT 14, '0070617', 12, N'0070617 - INTERVENCION PARA PERSONAS CON DEPENDENCIA DEL ALCOHOL Y TABACO' UNION ALL
SELECT 15, '5005192', 10, N'5005192 - INTERVENCIONES BREVES MOTIVACIONALES PARA PERSONAS CON CONSUMO PERJUDICIAL DEL ALCOHOL Y TABACO';
`,
  )

  const replacements = [
    [/SELECT 5,'99207','3'/g, "SELECT 5,'99207','2'"],
    [/SELECT 5,'99215','3'/g, "SELECT 5,'99215','2'"],
    [/SELECT 5,'99214\.06','3'/g, "SELECT 5,'99214.06','2'"],
    [/SELECT 5,'C2111\.01','2'/g, "SELECT 5,'C2111.01','3'"],
    [/SELECT 5,'96100\.01','2'/g, "SELECT 5,'96100.01','3'"],
    [/SELECT 5,'90847','2'/g, "SELECT 5,'90847','3'"],
    [/SELECT 7,'99207','3'/g, "SELECT 7,'99207','2'"],
    [/SELECT 7,'99215','3'/g, "SELECT 7,'99215','2'"],
    [/SELECT 7,'99214\.06','3'/g, "SELECT 7,'99214.06','2'"],
    [/SELECT 7,'C2111\.01','2'/g, "SELECT 7,'C2111.01','3'"],
    [/SELECT 7,'96100\.01','2'/g, "SELECT 7,'96100.01','3'"],
    [/SELECT 7,'90847','2'/g, "SELECT 7,'90847','3'"],
    [/SELECT 9,'99207','3'/g, "SELECT 9,'99207','2'"],
    [/SELECT 9,'99215','3'/g, "SELECT 9,'99215','2'"],
    [/SELECT 9,'99214\.06','3'/g, "SELECT 9,'99214.06','2'"],
    [/SELECT 9,'C2111\.01','2'/g, "SELECT 9,'C2111.01','3'"],
    [/SELECT 9,'96100\.01','2'/g, "SELECT 9,'96100.01','3'"],
    [/SELECT 9,'90847','2'/g, "SELECT 9,'90847','3'"],
  ]
  for (const [pattern, value] of replacements) {
    body = body.replace(pattern, value)
  }

  body = body.replace(
    /CREATE TABLE #CumplePPR \(\s*NroActividad INT,\s*IdCuentaAtencion INT\s*\);/i,
    `CREATE TABLE #CumplePPR (
    NroActividad INT,
    NroDocumento VARCHAR(30),
    IdCuentaAtencion INT
);`,
  )
  body = body.replace(
    /INSERT INTO #CumplePPR \(\s*NroActividad,\s*IdCuentaAtencion\s*\)/i,
    `INSERT INTO #CumplePPR (
    NroActividad,
    NroDocumento,
    IdCuentaAtencion
)`,
  )
  body = body.replace(/SELECT DISTINCT (\d+), A\.IdCuentaAtencion/g, 'SELECT DISTINCT $1, A.NroDocumento, A.IdCuentaAtencion')
  body = body.replace('COUNT(DISTINCT IdCuentaAtencion) AS Cantidad', 'COUNT(DISTINCT NroDocumento) AS Cantidad')

  body = body.replace(
    /\/\* =================================================\s+RESULTADO FINAL ORDENADO SEGUN EXCEL[\s\S]*?ORDER BY\s+A\.OrdenExcel;/i,
    `
INSERT INTO #Ppr0131Resultado (Orden, ACTIVIDAD, TOTAL)
SELECT
    100 + A.OrdenExcel,
    A.ActividadOperativa AS [ACTIVIDAD],
    ISNULL(C.Cantidad, 0) AS [TOTAL]
FROM #ActividadPPR A
    LEFT JOIN (
        SELECT
            NroActividad,
            COUNT(DISTINCT NroDocumento) AS Cantidad
        FROM #CumplePPR
        GROUP BY NroActividad
    ) C
        ON C.NroActividad = A.NroActividad;
`,
  )

  return body
}

function buildProcedureSql(tamizajeBody, tratamientoBody) {
  return `
CREATE_OR_ALTER PROCEDURE dbo.usp_PPR_0131
  @FechaInicio DATE,
  @FechaFin DATE
WITH RECOMPILE
AS
BEGIN
  SET NOCOUNT ON;

  IF OBJECT_ID('tempdb..#Ppr0131Resultado') IS NOT NULL DROP TABLE #Ppr0131Resultado;

  CREATE TABLE #Ppr0131Resultado (
    Orden INT NOT NULL,
    ACTIVIDAD NVARCHAR(700) NOT NULL,
    TOTAL INT NOT NULL
  );

${tamizajeBody}

${tratamientoBody}

  SELECT ACTIVIDAD, TOTAL
  FROM #Ppr0131Resultado
  ORDER BY Orden;
END
`
}

async function loadCriteria() {
  const workbook = new ExcelJS.Workbook()
  await workbook.xlsx.readFile(excelPath)
  const worksheet = workbook.getWorksheet('2026') ?? workbook.worksheets[0]
  const criteria = new Map()
  for (let rowNumber = 4; rowNumber <= worksheet.rowCount; rowNumber += 1) {
    const row = worksheet.getRow(rowNumber)
    const code = sourceKeyFromText(row.getCell(13).text || row.getCell(14).text)
    if (!code) continue
    criteria.set(code, {
      activity: cleanText(row.getCell(14).text),
      criterion: cleanText(row.getCell(19).text),
    })
  }
  return criteria
}

async function writeReport({ originalMap, correctedRows, criteria }) {
  const workbook = new ExcelJS.Workbook()
  workbook.creator = 'Codex'
  workbook.created = new Date()

  const summary = workbook.addWorksheet('Resumen')
  summary.columns = [
    { header: 'Aspecto', key: 'aspecto', width: 34 },
    { header: 'Detalle', key: 'detalle', width: 120 },
  ]
  summary.addRows([
    {
      aspecto: 'Periodo de validacion',
      detalle: 'Junio 2026',
    },
    {
      aspecto: 'Cambio aplicado',
      detalle: 'Se creo dbo.usp_PPR_0131 como salida unica ACTIVIDAD/TOTAL combinando tamizajes y tratamientos.',
    },
    {
      aspecto: 'Correccion de codigos',
      detalle: 'Se normalizaron codigos de tratamiento que estaban sin cero intermedio: 0060613, 0060614, 0070612, 0070615, 0070616, 0070610, 0070611, 0070629 y 0070617.',
    },
    {
      aspecto: 'Unidad de conteo',
      detalle: 'En tratamientos se cambio el conteo de IdCuentaAtencion a DNI unico porque el criterio de avance indica persona/DNI.',
    },
    {
      aspecto: 'Actividades recuperadas',
      detalle: 'Se agregaron a la salida 0070619 y 0070627, que tenian regla de cumplimiento en el SQL pero no estaban en la tabla final de actividades.',
    },
    {
      aspecto: 'Pendiente tecnico',
      detalle: '0070608 mantiene edad 0 a 3 anos como el nombre del subproducto, aunque la columna de avance del Excel dice ninos de 02 anos; se deja senalado para decision del coordinador.',
    },
  ])
  summary.getRow(1).font = { bold: true }

  const detail = workbook.addWorksheet('Comparacion')
  detail.columns = [
    { header: 'Codigo', key: 'code', width: 12 },
    { header: 'Actividad', key: 'activity', width: 80 },
    { header: 'Total query recibido', key: 'original', width: 20 },
    { header: 'Total corregido', key: 'corrected', width: 16 },
    { header: 'Diferencia', key: 'difference', width: 14 },
    { header: 'Decision / motivo', key: 'decision', width: 80 },
    { header: 'Criterio Excel', key: 'criterion', width: 120 },
  ]

  for (const row of correctedRows) {
    const code = row.code
    const original = originalMap.get(code)?.total
    const corrected = Number(row.total ?? 0)
    const criterion = criteria.get(code)?.criterion ?? ''
    const difference = original == null ? null : corrected - Number(original)
    const notes = []
    if (codeFixMap.has(sourceKeyFromText(originalMap.get(code)?.activity ?? '') ?? '')) {
      notes.push('Codigo normalizado para que empareje con la cadena programatica.')
    }
    if (['0070619', '0070627'].includes(code) && original == null) {
      notes.push('Regla existia en el SQL recibido, pero no salia en el resultado final.')
    }
    if (!originalMap.has(code)) {
      notes.push('No figuraba como fila final en el query recibido.')
    }
    if (difference !== 0 && original != null) {
      notes.push('Diferencia por conteo DNI y/o ajuste de labs segun criterio de avance.')
    }
    if (code === '0070608') {
      notes.push('Pendiente: Excel criterio dice 02 anos; query conserva 0 a 3 anos por nombre del subproducto.')
    }
    detail.addRow({
      code,
      activity: row.activity,
      original: original ?? '',
      corrected,
      difference: difference ?? '',
      decision: notes.join(' '),
      criterion,
    })
  }
  detail.getRow(1).font = { bold: true }
  detail.views = [{ state: 'frozen', ySplit: 1 }]
  detail.autoFilter = 'A1:G1'

  await workbook.xlsx.writeFile(reportPath)
}

const tamizajesRaw = readFileSync(tamizajesPath, 'utf8')
const tratamientosRaw = readFileSync(tratamientosPath, 'utf8')
const tamizajeBody = buildTamizajeBody(tamizajesRaw)
const tratamientoBody = buildTratamientoBody(tratamientosRaw)
const procedureSql = buildProcedureSql(tamizajeBody, tratamientoBody)
writeFileSync('scripts/ppr-0131-generated.sql', procedureSql, 'utf8')

const pool = await getSqlPool('general')

try {
  const originalTamizajeRequest = pool.request()
  originalTamizajeRequest.timeout = 300000
  const originalTamizaje = await originalTamizajeRequest.query(standaloneSql(tamizajesRaw))

  const originalTratamientoRequest = pool.request()
  originalTratamientoRequest.timeout = 300000
  const originalTratamiento = await originalTratamientoRequest.query(standaloneSql(tratamientosRaw))

  const existsResult = await pool.request().query("SELECT OBJECT_ID('dbo.usp_PPR_0131', 'P') AS id")
  const verb = existsResult.recordset[0]?.id ? 'ALTER' : 'CREATE'

  const installRequest = pool.request()
  installRequest.timeout = 300000
  await installRequest.query(procedureSql.replace('CREATE_OR_ALTER', verb))
  console.log('dbo.usp_PPR_0131 creado/actualizado.')

  const verifyRequest = pool.request()
  verifyRequest.timeout = 300000
  const verifyResult = await verifyRequest.query(`
    EXEC dbo.usp_PPR_0131
      @FechaInicio = '${fechaInicio}',
      @FechaFin = '${fechaFin}';
  `)

  const originalRows = normalizeRows([
    ...originalTamizaje.recordset,
    ...originalTratamiento.recordset,
  ])
  const correctedRows = normalizeRows(verifyResult.recordset)
  const criteria = await loadCriteria()
  await writeReport({
    originalMap: rowsToMap(originalRows),
    correctedRows,
    criteria,
  })

  console.table(correctedRows)
  console.log(`Informe generado: ${reportPath}`)
} finally {
  await closeSqlPool('general')
}
