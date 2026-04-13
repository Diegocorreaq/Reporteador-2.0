import { getSqlPool, sql } from '../db/sql-server.js'

const lastUpdatedQuery = `
SELECT MAX(CAST(A.Fecha AS date)) AS [lastUpdated]
FROM SIGH_DEPURA..Rpt_MovimientoHospitalario A
INNER JOIN T_Upss_Consultorio C
  ON C.cod_Consultorio = A.idservicio
WHERE YEAR(A.fecha) >= 2019
  AND C.des_Consultorio LIKE '%obstetrico%';
`.trim()

const rowsQuery = `
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
`.trim()

function buildDefaultDateRange() {
  const currentYear = new Date().getFullYear()

  return {
    fechaInicio: `${currentYear}-01-01`,
    fechaFin: `${currentYear}-12-31`,
  }
}

function normalizeDate(value) {
  if (!value) {
    return ''
  }

  if (value instanceof Date) {
    const year = value.getUTCFullYear()
    const month = String(value.getUTCMonth() + 1).padStart(2, '0')
    const day = String(value.getUTCDate()).padStart(2, '0')

    return `${year}-${month}-${day}`
  }

  return String(value).slice(0, 10)
}

function parseDateRange({ fechaInicio, fechaFin }) {
  const defaults = buildDefaultDateRange()
  const start = normalizeDate(fechaInicio || defaults.fechaInicio)
  const end = normalizeDate(fechaFin || defaults.fechaFin)

  if (!/^\d{4}-\d{2}-\d{2}$/.test(start) || !/^\d{4}-\d{2}-\d{2}$/.test(end)) {
    throw new Error('Las fechas deben enviarse en formato YYYY-MM-DD.')
  }

  if (start > end) {
    throw new Error('fechaInicio no puede ser mayor que fechaFin.')
  }

  return {
    fechaInicio: start,
    fechaFin: end,
  }
}

function mapRow(record) {
  return {
    fecha: normalizeDate(record.fecha),
    anio: Number(record.anio),
    mesNumero: Number(record.mesNumero),
    totalIngresos: Number(record.totalIngresos ?? 0),
    nroTransferidosHospObstetricia: Number(record.nroTransferidosHospObstetricia ?? 0),
    nroTransferidosUci: Number(record.nroTransferidosUci ?? 0),
    nroTransferidosOtrosServicios: Number(record.nroTransferidosOtrosServicios ?? 0),
    altaMedica: Number(record.altaMedica ?? 0),
    totalReferidos: Number(record.totalReferidos ?? 0),
    destinoVillaPanamericana: Number(record.destinoVillaPanamericana ?? 0),
    destinoOtros: Number(record.destinoOtros ?? 0),
    fallecidos: Number(record.fallecidos ?? 0),
    fallecidoMenor12Horas: Number(record.fallecidoMenor12Horas ?? 0),
    fallecidos12a48Horas: Number(record.fallecidos12a48Horas ?? 0),
    fallecidosMayorIgual48Horas: Number(record.fallecidosMayorIgual48Horas ?? 0),
    egresos: Number(record.egresos ?? 0),
    estancia: Number(record.estancia ?? 0),
    pacienteDia: Number(record.pacienteDia ?? 0),
    camaDia: Number(record.camaDia ?? 0),
    diferenciaCamasPacientes: Number(record.diferenciaCamasPacientes ?? 0),
    camasDisponiblesPromedio: Number(record.camasDisponiblesPromedio ?? 0),
  }
}

export async function getCentroObstetricoReport(rawFilters) {
  const filters = parseDateRange(rawFilters)
  const pool = await getSqlPool('general')

  const lastUpdatedResult = await pool.request().query(lastUpdatedQuery)
  const rowsResult = await pool
    .request()
    .input('fechaInicio', sql.Date, filters.fechaInicio)
    .input('fechaFin', sql.Date, filters.fechaFin)
    .query(rowsQuery)

  return {
    filters,
    lastUpdated: normalizeDate(lastUpdatedResult.recordset[0]?.lastUpdated ?? filters.fechaFin),
    rows: rowsResult.recordset.map(mapRow),
  }
}
