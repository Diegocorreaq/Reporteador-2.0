import { executeProcedure_General as executeProcedure, sql } from './sigh-sql-helpers.js'

const REPORT_TIMEOUT_MS = 180000

const UCCA_DATASETS = [
  { key: 'ucca1', title: 'Numero de interconsultas respondidas', procedure: 'SP_REPORTE_UCCA_1' },
  { key: 'ucca1A', title: 'Porcentaje de interconsultas solicitadas a la UCCA', procedure: 'SP_REPORTE_UCCA_1A' },
  { key: 'ucca2', title: 'Numero de interconsultas respondidas por prioridad', procedure: 'SP_REPORTE_UCCA_2' },
  { key: 'ucca2A', title: 'Porcentaje de interconsultas respondidas por prioridad', procedure: 'SP_REPORTE_UCCA_2A' },
  { key: 'ucca3', title: 'Interconsultas solicitadas a USNA', procedure: 'SP_REPORTE_UCCA_3' },
  { key: 'ucca3A', title: 'Interconsultas solicitadas a USNA por tipo', procedure: 'SP_REPORTE_UCCA_3A' },
  { key: 'ucca4', title: 'Tasa de admision de UCCA', procedure: 'SP_REPORTE_UCCA_4' },
  { key: 'ucca4A', title: 'Tasa de admision de UCCA por mes', procedure: 'SP_REPORTE_UCCA_4A' },
  { key: 'ucca5', title: 'Transferencias a otros servicios', procedure: 'SP_REPORTE_UCCA_5' },
  { key: 'ucca5A', title: 'Transferencias a otros servicios - detalle', procedure: 'SP_REPORTE_UCCA_5A' },
  { key: 'ucca6', title: 'Referencias a otros EESS', procedure: 'SP_REPORTE_UCCA_6' },
  { key: 'ucca6A', title: 'Referencias a otros EESS - detalle mensual', procedure: 'SP_REPORTE_UCCA_6A' },
  { key: 'ucca7', title: 'Tasa de interconsultas respondidas', procedure: 'SP_REPORTE_UCCA_7' },
  { key: 'ucca7A', title: 'Interconsultas respondidas por prioridad', procedure: 'SP_REPORTE_UCCA_7A' },
  { key: 'ucca7B', title: 'Promedio de interconsultas respondidas por dia', procedure: 'SP_REPORTE_UCCA_7B' },
  { key: 'ucca7C', title: 'Interconsultas por prioridad - operativo', procedure: 'SP_REPORTE_UCCA_7C' },
  { key: 'ucca8', title: 'Tasa de utilizacion UCCA', procedure: 'SP_REPORTE_UCCA_8' },
  { key: 'ucca9', title: 'Promedio de interconsultas respondidas por dia', procedure: 'SP_REPORTE_UCCA_9' },
  { key: 'ucca10', title: 'Procedimientos trazadores', procedure: 'SP_REPORTE_UCCA_10' },
  { key: 'ucca10A', title: 'Procedimientos trazadores por tipo', procedure: 'SP_REPORTE_UCCA_10A' },
  { key: 'ucca10B', title: 'Procedimientos trazadores por medico', procedure: 'SP_REPORTE_UCCA_10B' },
  { key: 'ucca11', title: 'Pacientes obstetricas/ginecologicas con ingreso a UCCA', procedure: 'SP_REPORTE_UCCA_11' },
  { key: 'ucca12', title: 'Referidos de un EESS a la UCCA', procedure: 'SP_REPORTE_UCCA_12' },
  { key: 'ucca13A', title: 'Mortalidad calculada Apache', procedure: 'SP_REPORTE_UCCA_13A' },
  { key: 'ucca13B', title: 'Mortalidad calculada Sofa', procedure: 'SP_REPORTE_UCCA_13B' },
  { key: 'ucca14', title: 'Reingreso precoz', procedure: 'SP_REPORTE_UCCA_14' },
  { key: 'ucca15A', title: 'Utilizacion de ventiladores mecanicos - UCI', procedure: 'SP_REPORTE_UCCA_15A' },
  { key: 'ucca15B', title: 'Utilizacion de ventiladores mecanicos - UCIN', procedure: 'SP_REPORTE_UCCA_15B' },
  { key: 'ucca15C', title: 'Utilizacion de ventiladores mecanicos - CPAP', procedure: 'SP_REPORTE_UCCA_15C' },
  { key: 'ucca15D', title: 'Utilizacion de ventiladores mecanicos - BIPAP', procedure: 'SP_REPORTE_UCCA_15D' },
  { key: 'ucca15E', title: 'Utilizacion de ventiladores mecanicos - COT', procedure: 'SP_REPORTE_UCCA_15E' },
  { key: 'ucca15F', title: 'Utilizacion de ventiladores mecanicos - Oxigenoterapia', procedure: 'SP_REPORTE_UCCA_15F' },
  { key: 'ucca16A', title: 'Necropcias', procedure: 'SP_REPORTE_UCCA_16A' },
  { key: 'ucca16B', title: 'Defunciones con estancia mayor a 48 horas', procedure: 'SP_REPORTE_UCCA_16B' },
  { key: 'ucca16C', title: 'Tasa de mortalidad', procedure: 'SP_REPORTE_UCCA_16C' },
  { key: 'ucca17A', title: 'Mortalidad por danos mas frecuentes', procedure: 'SP_REPORTE_UCCA_17A' },
  { key: 'ucca17B', title: 'Mortalidad por CIE frecuentes', procedure: 'SP_REPORTE_UCCA_17B' },
  { key: 'ucca18', title: 'Interconsultas solicitadas a USNA', procedure: 'SP_REPORTE_UCCA_18' },
  { key: 'ucca19', title: 'Reingreso precoz', procedure: 'SP_REPORTE_UCCA_19' },
  { key: 'ucca20', title: 'Tasa de mortalidad', procedure: 'SP_REPORTE_UCCA_20' },
  { key: 'ucca20A', title: 'Mortalidad por servicio', procedure: 'SP_REPORTE_UCCA_20A' },
  { key: 'ucca20B', title: 'Mortalidad por prioridad', procedure: 'SP_REPORTE_UCCA_20B' },
]

const UCCP_DATASETS = [
  { key: 'uccp1', title: 'Numero de interconsultas respondidas', procedure: 'SP_REPORTE_UCCP_1' },
  { key: 'uccp1A', title: 'Porcentaje de interconsultas solicitadas a la UCCP', procedure: 'SP_REPORTE_UCCA_1A' },
  { key: 'uccp2', title: 'Numero de interconsultas respondidas por prioridad', procedure: 'SP_REPORTE_UCCP_2' },
  { key: 'uccp2A', title: 'Porcentaje de interconsultas respondidas por prioridad', procedure: 'SP_REPORTE_UCCP_2A' },
  { key: 'uccp3', title: 'Interconsultas solicitadas a USNA', procedure: 'SP_REPORTE_UCCP_3' },
  { key: 'uccp3A', title: 'Interconsultas solicitadas a USNA por tipo', procedure: 'SP_REPORTE_UCCP_3A' },
  { key: 'uccp4', title: 'Tasa de admision de UCCP', procedure: 'SP_REPORTE_UCCP_4' },
  { key: 'uccp4A', title: 'Tasa de admision de UCCP por mes', procedure: 'SP_REPORTE_UCCP_4A' },
  { key: 'uccp5', title: 'Transferencias', procedure: 'SP_REPORTE_UCCP_5' },
  { key: 'uccp5A', title: 'Transferencias por servicio', procedure: 'SP_REPORTE_UCCP_5A' },
  { key: 'uccp6', title: 'Referencias', procedure: 'SP_REPORTE_UCCP_6' },
  { key: 'uccp6A', title: 'Referencias - detalle mensual', procedure: 'SP_REPORTE_UCCP_6A' },
  { key: 'uccp7', title: 'Severidad de enfermedad', procedure: 'SP_REPORTE_UCCP_7' },
  { key: 'uccp7A', title: 'Interconsultas por prioridad', procedure: 'SP_REPORTE_UCCP_7A' },
  { key: 'uccp7B', title: 'Promedio por dia', procedure: 'SP_REPORTE_UCCP_7B' },
  { key: 'uccp7C', title: 'Motivos de consulta por prioridad', procedure: 'SP_REPORTE_UCCP_7C' },
  { key: 'uccp8', title: 'Tasa de utilizacion UCCP', procedure: 'SP_REPORTE_UCCP_8' },
  { key: 'uccp9', title: 'Promedio de interconsultas respondidas por dia', procedure: 'SP_REPORTE_UCCP_9' },
  { key: 'uccp12', title: 'Referidos de un EESS', procedure: 'SP_REPORTE_UCCP_12' },
  { key: 'uccp13A', title: 'Mortalidad calculada Apache', procedure: 'SP_REPORTE_UCCP_13A' },
  { key: 'uccp13B', title: 'Mortalidad calculada Sofa', procedure: 'SP_REPORTE_UCCP_13B' },
  { key: 'uccp14', title: 'Reingreso precoz', procedure: 'SP_REPORTE_UCCP_14' },
  { key: 'uccp16A', title: 'Necropcias', procedure: 'SP_REPORTE_UCCP_16A' },
  { key: 'uccp16B', title: 'Defunciones con estancia mayor a 48 horas', procedure: 'SP_REPORTE_UCCP_16B' },
  { key: 'uccp20', title: 'Tasa de mortalidad', procedure: 'SP_REPORTE_UCCP_20' },
  { key: 'uccp20A', title: 'Mortalidad por servicio', procedure: 'SP_REPORTE_UCCP_20A' },
  { key: 'uccp20B', title: 'Mortalidad por prioridad', procedure: 'SP_REPORTE_UCCP_20B' },
]

function normalizeDate(value) {
  if (typeof value !== 'string') {
    return ''
  }

  return value.trim().slice(0, 10)
}

function parseDateRange(rawFilters) {
  const currentYear = new Date().getFullYear()
  const fallbackStart = `${currentYear}-01-01`
  const fallbackEnd = `${currentYear}-12-31`
  const fechaInicio = normalizeDate(rawFilters.fechaInicio || fallbackStart)
  const fechaFin = normalizeDate(rawFilters.fechaFin || fallbackEnd)

  if (!/^\d{4}-\d{2}-\d{2}$/.test(fechaInicio) || !/^\d{4}-\d{2}-\d{2}$/.test(fechaFin)) {
    throw new Error('Las fechas deben enviarse en formato YYYY-MM-DD.')
  }

  if (fechaInicio > fechaFin) {
    throw new Error('fechaInicio no puede ser mayor que fechaFin.')
  }

  return {
    fechaInicio,
    fechaFin,
  }
}

async function executeMonthlyProcedure(procedure, filters) {
  const rows = await executeProcedure(
    procedure,
    [
      { name: 'fecini', type: sql.NVarChar, value: filters.fechaInicio },
      { name: 'fecfin', type: sql.NVarChar, value: filters.fechaFin },
    ],
    { timeoutMs: REPORT_TIMEOUT_MS },
  )

  return rows
}

async function executePriorityDetailProcedure(procedure, filters, priority) {
  return executeProcedure(
    procedure,
    [
      { name: 'fecini', type: sql.NVarChar, value: filters.fechaInicio },
      { name: 'fecfin', type: sql.NVarChar, value: filters.fechaFin },
      { name: 'prioridad', type: sql.NVarChar, value: priority },
    ],
    { timeoutMs: REPORT_TIMEOUT_MS },
  )
}

function extractPriorities(rows) {
  const keys = ['PRIORIDAD_RPTA', 'PRIORIDAD', 'prioridad', 'prioridad_rpta']

  const priorities = rows
    .map((row) => {
      for (const key of keys) {
        if (row[key]) {
          return String(row[key]).trim()
        }
      }

      return ''
    })
    .filter(Boolean)

  return [...new Set(priorities)]
}

function buildDatasetMap(definitions, results) {
  return definitions.reduce((accumulator, definition, index) => {
    accumulator[definition.key] = {
      key: definition.key,
      title: definition.title,
      procedure: definition.procedure,
      rows: results[index],
    }

    return accumulator
  }, {})
}

async function getCriticalCareReport({ type, rawFilters, datasets, detailProcedure, detailOpsProcedure }) {
  const filters = parseDateRange(rawFilters)
  const results = await Promise.all(datasets.map((dataset) => executeMonthlyProcedure(dataset.procedure, filters)))
  const datasetMap = buildDatasetMap(datasets, results)
  const prioritySourceRows = datasets.find((dataset) => dataset.procedure.endsWith('_2'))?.key
  const priorities = extractPriorities(prioritySourceRows ? datasetMap[prioritySourceRows].rows : [])

  const priorityDetails = await Promise.all(
    priorities.map(async (priority) => {
      const [detalle, detalleOperativo] = await Promise.all([
        executePriorityDetailProcedure(detailProcedure, filters, priority),
        executePriorityDetailProcedure(detailOpsProcedure, filters, priority),
      ])

      return {
        prioridad: priority,
        detalle,
        detalleOperativo,
      }
    }),
  )

  return {
    module: type,
    filters,
    generatedAt: new Date().toISOString(),
    datasets: datasetMap,
    // Backward compatibility for old frontend callers.
    sections: datasetMap,
    detailPrioridad: priorityDetails,
  }
}

export async function getUccaReport(rawFilters) {
  return getCriticalCareReport({
    type: 'ucca',
    rawFilters,
    datasets: UCCA_DATASETS,
    detailProcedure: 'SP_REPORTE_UCCA_2_DET',
    detailOpsProcedure: 'SP_REPORTE_UCCA_2_DET_O',
  })
}

export async function getUccpReport(rawFilters) {
  return getCriticalCareReport({
    type: 'uccp',
    rawFilters,
    datasets: UCCP_DATASETS,
    detailProcedure: 'SP_REPORTE_UCCP_2_DET',
    detailOpsProcedure: 'SP_REPORTE_UCCP_2_DET_O',
  })
}
