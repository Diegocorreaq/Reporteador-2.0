import { executeProcedure_General as executeProcedure, sql } from './sigh-sql-helpers.js'

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
  const [lastUpdatedRows, rows] = await Promise.all([
    executeProcedure('SP_APP_CENTRO_OBSTETRICO_LAST_UPDATED'),
    executeProcedure('SP_APP_CENTRO_OBSTETRICO_ROWS', [
      { name: 'fechaInicio', type: sql.Date, value: filters.fechaInicio },
      { name: 'fechaFin', type: sql.Date, value: filters.fechaFin },
    ]),
  ])

  return {
    filters,
    lastUpdated: normalizeDate(lastUpdatedRows[0]?.lastUpdated ?? filters.fechaFin),
    rows: rows.map(mapRow),
  }
}
