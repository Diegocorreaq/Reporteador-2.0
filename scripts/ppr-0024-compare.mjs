import { readFileSync } from 'node:fs'
import ExcelJS from 'exceljs'
import { getSqlPool, closeSqlPool } from '../server/db/sql-server.js'

const oldQueryPath = 'C:/Users/diego.correa/Desktop/DIEGO CORREA/PPR/QUERYS/2026/ppr24.sql'
const oldQuery = readFileSync(oldQueryPath, 'utf8')

const treatmentCodes = [
  '96402','96407','96549','90780','90782','90784',
  '77305','77500','77501','77501.01','77501.02','77501.03','77781','77781.01','77781.02','77781.03',
  '77295','77301','77315','77315.01','77401','77784','77784.01','77290','76499','77263',
  '77418','77418.01','77285','77427','77504','77782','77783','77785','77786','77787',
]

const treatmentCodeList = treatmentCodes.map((code) => `'${code}'`).join(',')

function stripHeader(query) {
  return query
    .replace(/^\s*USE\s+SIGH_DEPURA;\s*/i, '')
    .replace(/DECLARE\s+@FECHAINICIO\s+DATE\s*=\s*'[^']+';\s*/i, '')
    .replace(/DECLARE\s+@FECHAFIN\s+DATE\s*=\s*'[^']+';\s*/i, '')
}

const oldBody = stripHeader(oldQuery)
const reportStartIndex = oldBody.search(/--0215085/i)
if (reportStartIndex < 0) {
  throw new Error('No se encontro el inicio del reporte PP0024 (--0215085).')
}
const tempSetup = oldBody.slice(0, reportStartIndex)
const oldReportBody = oldBody.slice(reportStartIndex)

const acceptedOverrideCodes = [
  '0215086', '0215088', '0215090', '0215092', '0215094', '0215096', '0215098',
  '0215100', '0215101', '0215102', '0215104',
  '0215103',
]

const correctionRows = `
-- Correcciones auditadas para PP0024. Se aplican solo si no reducen produccion.
SELECT '0215086 - TRATAMIENTO DEL CANCER DE CUELLO UTERINO' AS [ACTIVIDAD],
       COUNT(DISTINCT A.IdCuentaAtencion) AS [TOTAL]
FROM DATA_ONCO DO
INNER JOIN S_Atenciones A ON A.IdCuentaAtencion = DO.IDCUENTA
INNER JOIN T_Paciente P ON P.IdPaciente = A.IdPaciente
WHERE A.idEstadoAtencion IN (1,2)
  AND P.TipoSexo = 'F'
  AND A.Edad >= 18 AND A.IdTipoEdad = 1
  AND DO.CIE10 LIKE 'C53%'
  AND DO.NROCONTROL = '1'
  AND CAST(A.FechaIngreso AS DATE) BETWEEN @FECHAINICIO AND @FECHAFIN
  AND (
    DO.CODIGOHISMINSA IN (${treatmentCodeList})
    OR DO.CODIGOHISMINSA BETWEEN '96409' AND '96417'
    OR DO.CODIGOHISMINSA BETWEEN '96420' AND '96423'
  )

UNION ALL
SELECT '0215088 - TRATAMIENTO DEL CANCER DE MAMA',
       COUNT(DISTINCT A.IdCuentaAtencion)
FROM DATA_ONCO DO
INNER JOIN S_Atenciones A ON A.IdCuentaAtencion = DO.IDCUENTA
INNER JOIN T_Paciente P ON P.IdPaciente = A.IdPaciente
WHERE A.idEstadoAtencion IN (1,2)
  AND P.TipoSexo = 'F'
  AND A.Edad >= 18 AND A.IdTipoEdad = 1
  AND DO.CIE10 LIKE 'C50%'
  AND DO.NROCONTROL = '1'
  AND CAST(A.FechaIngreso AS DATE) BETWEEN @FECHAINICIO AND @FECHAFIN
  AND (
    DO.CODIGOHISMINSA IN (${treatmentCodeList})
    OR DO.CODIGOHISMINSA BETWEEN '96409' AND '96417'
    OR DO.CODIGOHISMINSA BETWEEN '96420' AND '96423'
  )

UNION ALL
SELECT '0215090 - TRATAMIENTO DEL CANCER DE ESTOMAGO',
       COUNT(DISTINCT A.IdCuentaAtencion)
FROM DATA_ONCO DO
INNER JOIN S_Atenciones A ON A.IdCuentaAtencion = DO.IDCUENTA
WHERE A.idEstadoAtencion IN (1,2)
  AND A.Edad >= 18 AND A.IdTipoEdad = 1
  AND DO.CIE10 LIKE 'C16%'
  AND DO.NROCONTROL = '1'
  AND CAST(A.FechaIngreso AS DATE) BETWEEN @FECHAINICIO AND @FECHAFIN
  AND (
    DO.CODIGOHISMINSA IN (${treatmentCodeList})
    OR DO.CODIGOHISMINSA BETWEEN '96409' AND '96417'
    OR DO.CODIGOHISMINSA BETWEEN '96420' AND '96423'
  )

UNION ALL
SELECT '0215092 - TRATAMIENTO DEL CANCER DE PROSTATA',
       COUNT(DISTINCT A.IdCuentaAtencion)
FROM DATA_ONCO DO
INNER JOIN S_Atenciones A ON A.IdCuentaAtencion = DO.IDCUENTA
INNER JOIN T_Paciente P ON P.IdPaciente = A.IdPaciente
WHERE A.idEstadoAtencion IN (1,2)
  AND P.TipoSexo = 'M'
  AND A.Edad >= 18 AND A.IdTipoEdad = 1
  AND DO.CIE10 LIKE 'C61%'
  AND DO.NROCONTROL = '1'
  AND CAST(A.FechaIngreso AS DATE) BETWEEN @FECHAINICIO AND @FECHAFIN
  AND (
    DO.CODIGOHISMINSA IN (${treatmentCodeList})
    OR DO.CODIGOHISMINSA BETWEEN '96409' AND '96417'
    OR DO.CODIGOHISMINSA BETWEEN '96420' AND '96423'
  )

UNION ALL
SELECT '0215094 - TRATAMIENTO DEL CANCER DE PULMON',
       COUNT(DISTINCT A.IdCuentaAtencion)
FROM DATA_ONCO DO
INNER JOIN S_Atenciones A ON A.IdCuentaAtencion = DO.IDCUENTA
WHERE A.idEstadoAtencion IN (1,2)
  AND A.Edad >= 18 AND A.IdTipoEdad = 1
  AND DO.CIE10 LIKE 'C34%'
  AND DO.NROCONTROL = '1'
  AND CAST(A.FechaIngreso AS DATE) BETWEEN @FECHAINICIO AND @FECHAFIN
  AND (
    DO.CODIGOHISMINSA IN (${treatmentCodeList})
    OR DO.CODIGOHISMINSA BETWEEN '96409' AND '96417'
    OR DO.CODIGOHISMINSA BETWEEN '96420' AND '96423'
  )

UNION ALL
SELECT '0215096 - TRATAMIENTO DEL CANCER DE COLON Y RECTO',
       COUNT(DISTINCT A.IdCuentaAtencion)
FROM DATA_ONCO DO
INNER JOIN S_Atenciones A ON A.IdCuentaAtencion = DO.IDCUENTA
WHERE A.idEstadoAtencion IN (1,2)
  AND A.Edad >= 18 AND A.IdTipoEdad = 1
  AND (DO.CIE10 LIKE 'C18%' OR DO.CIE10 LIKE 'C19%' OR DO.CIE10 LIKE 'C20%')
  AND DO.NROCONTROL = '1'
  AND CAST(A.FechaIngreso AS DATE) BETWEEN @FECHAINICIO AND @FECHAFIN
  AND (
    DO.CODIGOHISMINSA IN (${treatmentCodeList})
    OR DO.CODIGOHISMINSA BETWEEN '96409' AND '96417'
    OR DO.CODIGOHISMINSA BETWEEN '96420' AND '96423'
  )

UNION ALL
SELECT '0215098 - TRATAMIENTO DEL CANCER DE HIGADO',
       COUNT(DISTINCT A.IdCuentaAtencion)
FROM DATA_ONCO DO
INNER JOIN S_Atenciones A ON A.IdCuentaAtencion = DO.IDCUENTA
WHERE A.idEstadoAtencion IN (1,2)
  AND A.Edad >= 18 AND A.IdTipoEdad = 1
  AND DO.CIE10 LIKE 'C22%'
  AND DO.NROCONTROL = '1'
  AND CAST(A.FechaIngreso AS DATE) BETWEEN @FECHAINICIO AND @FECHAFIN
  AND (
    DO.CODIGOHISMINSA IN (${treatmentCodeList})
    OR DO.CODIGOHISMINSA BETWEEN '96409' AND '96417'
    OR DO.CODIGOHISMINSA BETWEEN '96420' AND '96423'
  )

UNION ALL
SELECT '0215100 - TRATAMIENTO DE LEUCEMIA',
       COUNT(DISTINCT A.IdCuentaAtencion)
FROM DATA_ONCO DO
INNER JOIN S_Atenciones A ON A.IdCuentaAtencion = DO.IDCUENTA
WHERE A.idEstadoAtencion IN (1,2)
  AND (DO.CIE10 LIKE 'C91%' OR DO.CIE10 LIKE 'C92%' OR DO.CIE10 LIKE 'C93%' OR DO.CIE10 LIKE 'C94%' OR DO.CIE10 LIKE 'C95%' OR DO.CIE10 = 'C90.1')
  AND DO.NROCONTROL = '1'
  AND CAST(A.FechaIngreso AS DATE) BETWEEN @FECHAINICIO AND @FECHAFIN
  AND (
    DO.CODIGOHISMINSA IN (${treatmentCodeList})
    OR DO.CODIGOHISMINSA BETWEEN '96409' AND '96417'
    OR DO.CODIGOHISMINSA BETWEEN '96420' AND '96423'
  )

UNION ALL
SELECT '0215101 - DIAGNOSTICO DE LINFOMA',
       COUNT(DISTINCT A.IdPaciente)
FROM S_DiagnosticoAtc AD
INNER JOIN S_Atenciones A ON A.IdAtencion = AD.IdAtencion
INNER JOIN T_Diagnostico D ON D.IdDiagnostico = AD.IdDiagnostico
WHERE A.idEstadoAtencion IN (1,2)
  AND (D.CodigoCIE10 LIKE 'C81%' OR D.CodigoCIE10 LIKE 'C82%' OR D.CodigoCIE10 LIKE 'C83%' OR D.CodigoCIE10 LIKE 'C84%' OR D.CodigoCIE10 LIKE 'C85%' OR D.CodigoCIE10 = 'C96.3')
  AND AD.Codigo = 'D'
  AND CAST(A.FechaIngreso AS DATE) BETWEEN @FECHAINICIO AND @FECHAFIN
  AND EXISTS (
    SELECT 1
    FROM #CP_Proc CP
    WHERE CP.IdCuentaAtencion = A.IdCuentaAtencion
      AND CP.CodigoProc IN ('38500','88206')
      AND CP.EstadoLab = 'A'
  )

UNION ALL
SELECT '0215102 - TRATAMIENTO DE LINFOMA',
       COUNT(DISTINCT A.IdCuentaAtencion)
FROM DATA_ONCO DO
INNER JOIN S_Atenciones A ON A.IdCuentaAtencion = DO.IDCUENTA
WHERE A.idEstadoAtencion IN (1,2)
  AND (DO.CIE10 LIKE 'C81%' OR DO.CIE10 LIKE 'C82%' OR DO.CIE10 LIKE 'C83%' OR DO.CIE10 LIKE 'C84%' OR DO.CIE10 LIKE 'C85%' OR DO.CIE10 = 'C96.3')
  AND DO.NROCONTROL = '1'
  AND CAST(A.FechaIngreso AS DATE) BETWEEN @FECHAINICIO AND @FECHAFIN
  AND (
    DO.CODIGOHISMINSA IN (${treatmentCodeList})
    OR DO.CODIGOHISMINSA BETWEEN '96409' AND '96417'
    OR DO.CODIGOHISMINSA BETWEEN '96420' AND '96423'
  )

UNION ALL
SELECT '0215103 - DIAGNOSTICO DEL CANCER PIEL NO MELANOMA',
       COUNT(DISTINCT A.IdPaciente)
FROM S_DiagnosticoAtc AD
INNER JOIN S_Atenciones A ON A.IdAtencion = AD.IdAtencion
INNER JOIN T_Diagnostico D ON D.IdDiagnostico = AD.IdDiagnostico
WHERE A.idEstadoAtencion IN (1,2)
  AND D.IdCategoria IN ('C43','C44')
  AND AD.Codigo = 'D'
  AND A.Edad >= 18 AND A.IdTipoEdad = 1
  AND CAST(A.FechaIngreso AS DATE) BETWEEN @FECHAINICIO AND @FECHAFIN
  AND EXISTS (
    SELECT 1
    FROM #CP_Proc CP
    WHERE CP.IdCuentaAtencion = A.IdCuentaAtencion
      AND CP.CodigoProc IN ('11100','11101')
      AND CP.EstadoLab = 'A'
  )

UNION ALL
SELECT '0215104 - TRATAMIENTO DEL CANCER DE PIEL NO MELANOMA',
       COUNT(DISTINCT A.IdCuentaAtencion)
FROM DATA_ONCO DO
INNER JOIN S_Atenciones A ON A.IdCuentaAtencion = DO.IDCUENTA
WHERE A.idEstadoAtencion IN (1,2)
  AND A.Edad >= 18 AND A.IdTipoEdad = 1
  AND (DO.CIE10 LIKE 'C43%' OR DO.CIE10 LIKE 'C44%')
  AND DO.NROCONTROL = '1'
  AND CAST(A.FechaIngreso AS DATE) BETWEEN @FECHAINICIO AND @FECHAFIN
  AND (
    DO.CODIGOHISMINSA IN (${treatmentCodeList})
    OR DO.CODIGOHISMINSA BETWEEN '96409' AND '96417'
    OR DO.CODIGOHISMINSA BETWEEN '96420' AND '96423'
  )

UNION ALL
SELECT '0215084 - ATENCION DE LA PACIENTE CON LESIONES PREMALIGNAS DE CUELLO UTERINO CON ESCISION',
       COUNT(DISTINCT A.IdCuentaAtencion)
FROM S_DiagnosticoAtc AD
INNER JOIN S_Atenciones A ON A.IdAtencion = AD.IdAtencion
INNER JOIN T_Diagnostico D ON D.IdDiagnostico = AD.IdDiagnostico
INNER JOIN T_Paciente P ON P.IdPaciente = A.IdPaciente
WHERE A.idEstadoAtencion IN (1,2)
  AND P.TipoSexo = 'F'
  AND A.Edad BETWEEN 25 AND 64 AND A.IdTipoEdad = 1
  AND D.codigoCIEsinPto IN ('N870','N871','N872','D069','C539','B977')
  AND AD.Codigo = 'P'
  AND CAST(A.FechaIngreso AS DATE) BETWEEN @FECHAINICIO AND @FECHAFIN
  AND EXISTS (
    SELECT 1
    FROM #CP_Proc CP
    WHERE CP.IdCuentaAtencion = A.IdCuentaAtencion
      AND CP.CodigoProc IN ('57522','57520')
  )

UNION ALL
SELECT '0215105 - ATENCION CON CUIDADOS PALIATIVOS EN EL ESTABLECIMIENTO DE SALUD',
       COUNT(DISTINCT A.IdCuentaAtencion)
FROM S_DiagnosticoAtc AD
INNER JOIN S_Atenciones A ON A.IdAtencion = AD.IdAtencion
INNER JOIN T_Diagnostico D ON D.IdDiagnostico = AD.IdDiagnostico
WHERE A.idEstadoAtencion IN (1,2)
  AND D.IdCategoria BETWEEN 'C00' AND 'C97'
  AND AD.Codigo = 'R'
  AND CAST(A.FechaIngreso AS DATE) BETWEEN @FECHAINICIO AND @FECHAFIN
  AND EXISTS (
    SELECT 1
    FROM #CP_Proc CP
    WHERE CP.IdCuentaAtencion = A.IdCuentaAtencion
      AND CP.CodigoProc IN ('99489')
      AND CP.EstadoLab = '1'
  )

UNION ALL
SELECT '0215074 - CONSEJERIA PARA PACIENTES DIAGNOSTICADOS CON CANCER',
       COUNT(DISTINCT A.IdPaciente)
FROM S_Atenciones A
WHERE A.idEstadoAtencion IN (1,2)
  AND CAST(A.FechaIngreso AS DATE) BETWEEN @FECHAINICIO AND @FECHAFIN
  AND EXISTS (
    SELECT 1
    FROM #CP_Proc CP
    WHERE CP.IdCuentaAtencion = A.IdCuentaAtencion
      AND CP.CodigoProc IN ('99401.26')
      AND CP.EstadoLab = '2'
  )
  AND EXISTS (
    SELECT 1
    FROM #CP_Proc CP
    WHERE CP.IdCuentaAtencion = A.IdCuentaAtencion
      AND CP.CodigoProc IN ('99207.05')
  )
  AND EXISTS (
    SELECT 1
    FROM S_DiagnosticoAtc AD
    INNER JOIN T_Diagnostico D ON D.IdDiagnostico = AD.IdDiagnostico
    WHERE AD.IdAtencion = A.IdAtencion
      AND D.IdCategoria BETWEEN 'C00' AND 'C97'
  )
`

const correctionCodes = [
  ...acceptedOverrideCodes,
  '0215084',
  '0215105',
  '0215074',
]

function procedureSql(queryBody) {
  const body = queryBody
    .replace(/^\s*USE\s+SIGH_DEPURA;\s*/i, '')
    .replace(/DECLARE\s+@FECHAINICIO\s+DATE\s*=\s*'[^']+';\s*/i, '')
    .replace(/DECLARE\s+@FECHAFIN\s+DATE\s*=\s*'[^']+';\s*/i, '')
    .replace(/@FECHAINICIO/g, '@FechaInicio')
    .replace(/@FECHAFIN/g, '@FechaFin')
  return `CREATE_OR_ALTER PROCEDURE dbo.usp_PPR_0024
  @FechaInicio DATE,
  @FechaFin DATE
WITH RECOMPILE
AS
BEGIN
  SET NOCOUNT ON;
${body}
END`
}

const reasons = {
  '0215086': 'Se amplia lista de procedimientos de tratamiento segun criterio 2026; se aplica solo si no reduce.',
  '0215088': 'Se amplia lista de procedimientos de tratamiento segun criterio 2026; se aplica solo si no reduce.',
  '0215090': 'Se amplia lista de procedimientos de tratamiento segun criterio 2026; se aplica solo si no reduce.',
  '0215092': 'Se amplia lista de procedimientos de tratamiento segun criterio 2026; se aplica solo si no reduce.',
  '0215094': 'Se amplia lista de procedimientos de tratamiento segun criterio 2026; se aplica solo si no reduce.',
  '0215096': 'Se amplia lista de procedimientos de tratamiento segun criterio 2026; se aplica solo si no reduce.',
  '0215098': 'Actividad faltante en query actual: tratamiento de cancer de higado, calculado con DATA_ONCO y C22.',
  '0215100': 'Se amplia lista de procedimientos de tratamiento segun criterio 2026; se aplica solo si no reduce.',
  '0215101': 'Se corrige fecha fija de abril y procedimientos de linfoma (38500/88206) segun criterio.',
  '0215102': 'Se amplia lista de procedimientos de tratamiento segun criterio 2026; se aplica solo si no reduce.',
  '0215103': 'Se agrega procedimiento 11101 y edad >=18 segun criterio; se aplica solo si no reduce.',
  '0215104': 'Se amplia lista de procedimientos de tratamiento segun criterio 2026; se aplica solo si no reduce.',
  '0215084': 'Se aplica criterio: dx presuntivo P con 57522/57520; aumenta sin reducir produccion.',
  '0215105': 'Pendiente: criterio exige 99489 con LAB 1 y cancer R sin limitar edad; si reduce, se mantiene query actual.',
  '0215074': 'Pendiente: criterio exige 99401.26 LAB 2 + 99207.05; si reduce, se mantiene query actual.',
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
  const oldRequest = pool.request()
  oldRequest.timeout = 900000
  const oldResult = await oldRequest.query(oldQuery)
  const oldRows = normalizeRows(oldResult.recordset)

  const correctionRequest = pool.request()
  correctionRequest.timeout = 900000
  const correctionResult = await correctionRequest.query(`
    USE SIGH_DEPURA;
    DECLARE @FECHAINICIO DATE = '2026-05-01';
    DECLARE @FECHAFIN DATE = '2026-05-31';
    ${tempSetup}
    ${correctionRows}
  `)
  const allRows = normalizeRows(correctionResult.recordset)
  const oldMap = byCode(oldRows)
  const correctionMap = byCode(allRows)

  const acceptedRows = []
  const comparisonCodes = [...new Set([...oldMap.keys(), ...correctionMap.keys()])].sort()
  const comparison = comparisonCodes.map((code) => {
    const oldRow = oldMap.get(code)
    const strictRow = correctionMap.get(code)
    const actual = oldRow?.total ?? 0
    const strictTotal = strictRow?.total ?? 0
    const apply = correctionCodes.includes(code) && strictTotal >= actual
    const finalTotal = apply ? strictTotal : actual
    if (apply && strictRow) acceptedRows.push(strictRow)
    return {
      code,
      actividad: (apply ? strictRow?.actividad : oldRow?.actividad) ?? strictRow?.actividad ?? code,
      actual,
      corregido: finalTotal,
      diferencia: finalTotal - actual,
      motivo: apply
        ? (reasons[code] ?? 'Se aplica porque no reduce la produccion.')
        : strictRow && correctionCodes.includes(code) && strictTotal < actual
          ? `${reasons[code] ?? 'Pendiente de validacion.'} Aplicado estrictamente seria ${actual} -> ${strictTotal} (${strictTotal - actual}).`
          : 'Se mantiene la logica actual; sin cambio aplicado en esta primera consolidacion.',
    }
  })

  const acceptedCodes = acceptedRows.map((row) => row.actividad.match(/\b\d{7}\b/)?.[0]).filter(Boolean)
  const acceptedList = acceptedCodes.length > 0
    ? acceptedCodes.map((code) => `'${code}'`).join(',')
    : "'__NO_APLICAR__'"
  const finalProcedureQuery = `
    USE SIGH_DEPURA;
    DECLARE @FECHAINICIO DATE = '2026-05-01';
    DECLARE @FECHAFIN DATE = '2026-05-31';
    ${tempSetup}
    WITH OldRows AS (
      SELECT ACTIVIDAD, TOTAL
      FROM (
${oldReportBody}
      ) O
    ),
    CorrectionRows AS (
${correctionRows}
    )
    SELECT ACTIVIDAD, SUM(TOTAL) AS TOTAL
    FROM (
      SELECT ACTIVIDAD, TOTAL
      FROM OldRows
      WHERE LEFT(LTRIM(ACTIVIDAD), 7) NOT IN (${acceptedList})
      UNION ALL
      SELECT ACTIVIDAD, TOTAL
      FROM CorrectionRows
      WHERE LEFT(LTRIM(ACTIVIDAD), 7) IN (${acceptedList})
    ) FinalRows
    GROUP BY ACTIVIDAD
    ORDER BY ACTIVIDAD;
  `

  const existsRequest = pool.request()
  const existsResult = await existsRequest.query("SELECT OBJECT_ID('dbo.usp_PPR_0024', 'P') AS id")
  const verb = existsResult.recordset[0]?.id ? 'ALTER' : 'CREATE'
  const installRequest = pool.request()
  installRequest.timeout = 900000
  await installRequest.query(procedureSql(finalProcedureQuery).replace('CREATE_OR_ALTER', verb))
  console.log('dbo.usp_PPR_0024 creado/actualizado.')

  console.table(comparison)

  const workbook = new ExcelJS.Workbook()
  workbook.creator = 'Reporteador 2.0'
  workbook.created = new Date()

  const summary = workbook.addWorksheet('Comparacion mayo 2026')
  summary.columns = [
    { header: 'Codigo', key: 'code', width: 12 },
    { header: 'Actividad', key: 'actividad', width: 78 },
    { header: 'Query actual', key: 'actual', width: 14 },
    { header: 'Query corregido', key: 'corregido', width: 16 },
    { header: 'Impacto', key: 'diferencia', width: 12 },
    { header: 'Cambio principal y motivo', key: 'motivo', width: 105 },
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
    { topic: 'Periodo comparado', detail: '2026-05-01 al 2026-05-31, segun el query recibido.' },
    { topic: 'Estrategia', detail: 'Solo se aplican correcciones que no reducen produccion. Si el criterio estricto baja, se mantiene query actual y se documenta impacto pendiente.' },
    { topic: 'Error corregido', detail: '0215101 tenia fecha fija de abril dentro del query de mayo y procedimientos de leucemia; se audita contra el criterio de linfoma.' },
    { topic: 'Actividad faltante', detail: '0215098 tratamiento de cancer de higado no estaba en el query actual; se calcula desde DATA_ONCO con C22.' },
    { topic: 'Procedimiento creado', detail: 'dbo.usp_PPR_0024(@FechaInicio DATE, @FechaFin DATE).' },
  ])
  styleSheet(notes)

  const reportPath = 'C:/xampp/htdocs/Reporteador-2.0/informes/PPR_0024_comparacion_query_mayo_2026.xlsx'
  await workbook.xlsx.writeFile(reportPath)
  console.log(`Excel generado: ${reportPath}`)
} finally {
  await closeSqlPool('general')
}
