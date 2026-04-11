import { httpClient } from '@/services/http/client'
import { centroObstetricoMockLastUpdated, centroObstetricoMockRows } from '@/modules/centro-obstetrico/data/centro-obstetrico.mock'
import type {
  CentroObstetricoFilters,
  CentroObstetricoPagePayload,
  CentroObstetricoRawResponse,
  CentroObstetricoRawRow,
  CentroObstetricoSummaryRow,
  MetricChartData,
  OcupacionRow,
  PermanenciaRow,
  RendimientoRow,
  SustitucionRow,
} from '@/modules/centro-obstetrico/types'

type MonthlyAggregate = CentroObstetricoSummaryRow & {
  fecha: string
  estancia: number
  pacienteDia: number
  camaDia: number
  diferenciaCamasPacientes: number
  camasDisponiblesPromedio: number
}

const monthFormatter = new Intl.DateTimeFormat('es-CO', {
  month: 'long',
  timeZone: 'UTC',
})

const monthShortFormatter = new Intl.DateTimeFormat('es-CO', {
  month: 'short',
  timeZone: 'UTC',
})

function round(value: number, decimals = 2) {
  if (!Number.isFinite(value)) {
    return 0
  }

  const factor = 10 ** decimals
  return Math.round(value * factor) / factor
}

function divide(numerator: number, denominator: number) {
  if (!denominator) {
    return 0
  }

  return numerator / denominator
}

function buildMonthLabel(anio: number, mesNumero: number) {
  const date = new Date(Date.UTC(anio, mesNumero - 1, 1))
  const month = monthFormatter.format(date)

  return month.charAt(0).toUpperCase() + month.slice(1)
}

function buildCategoryLabel(anio: number, mesNumero: number) {
  const date = new Date(Date.UTC(anio, mesNumero - 1, 1))
  const month = monthShortFormatter.format(date).replace('.', '')
  const prettyMonth = month.charAt(0).toUpperCase() + month.slice(1)

  return `${anio} ${prettyMonth}`
}

function normalizeDate(value: string) {
  return value.slice(0, 10)
}

function parseIsoDateParts(fecha: string) {
  const [anio, mesNumero, dia] = normalizeDate(fecha).split('-').map(Number)

  return {
    anio,
    mesNumero,
    dia,
  }
}

function normalizeFilters(filters: CentroObstetricoFilters): CentroObstetricoFilters {
  return {
    fechaInicio: normalizeDate(filters.fechaInicio),
    fechaFin: normalizeDate(filters.fechaFin),
  }
}

function sortRows(rows: CentroObstetricoRawRow[]) {
  return [...rows].sort((left, right) => left.fecha.localeCompare(right.fecha))
}

function aggregateMonthlyRows(rows: CentroObstetricoRawRow[]) {
  const monthly = new Map<string, MonthlyAggregate & { camasSamples: number; sampleCount: number }>()

  for (const row of sortRows(rows)) {
    const { anio, mesNumero } = parseIsoDateParts(row.fecha)
    const key = `${anio}-${String(mesNumero).padStart(2, '0')}`
    const current = monthly.get(key)

    if (current) {
      current.totalIngresos += row.totalIngresos
      current.nroTransferidosHospObstetricia += row.nroTransferidosHospObstetricia
      current.nroTransferidosUci += row.nroTransferidosUci
      current.nroTransferidosOtrosServicios += row.nroTransferidosOtrosServicios
      current.altaMedica += row.altaMedica
      current.totalReferidos += row.totalReferidos
      current.destinoVillaPanamericana += row.destinoVillaPanamericana
      current.destinoOtros += row.destinoOtros
      current.fallecidos += row.fallecidos
      current.fallecidoMenor12Horas += row.fallecidoMenor12Horas
      current.fallecidos12a48Horas += row.fallecidos12a48Horas
      current.fallecidosMayorIgual48Horas += row.fallecidosMayorIgual48Horas
      current.egresos += row.egresos
      current.estancia += row.estancia
      current.pacienteDia += row.pacienteDia
      current.camaDia += row.camaDia
      current.diferenciaCamasPacientes += row.diferenciaCamasPacientes
      current.camasSamples += row.camasDisponiblesPromedio
      current.sampleCount += 1
      current.fecha = row.fecha > current.fecha ? row.fecha : current.fecha
      continue
    }

    monthly.set(key, {
      fecha: row.fecha,
      anio,
      mesNumero,
      mesLabel: buildMonthLabel(anio, mesNumero),
      totalIngresos: row.totalIngresos,
      nroTransferidosHospObstetricia: row.nroTransferidosHospObstetricia,
      nroTransferidosUci: row.nroTransferidosUci,
      nroTransferidosOtrosServicios: row.nroTransferidosOtrosServicios,
      altaMedica: row.altaMedica,
      totalReferidos: row.totalReferidos,
      destinoVillaPanamericana: row.destinoVillaPanamericana,
      destinoOtros: row.destinoOtros,
      fallecidos: row.fallecidos,
      fallecidoMenor12Horas: row.fallecidoMenor12Horas,
      fallecidos12a48Horas: row.fallecidos12a48Horas,
      fallecidosMayorIgual48Horas: row.fallecidosMayorIgual48Horas,
      egresos: row.egresos,
      estancia: row.estancia,
      pacienteDia: row.pacienteDia,
      camaDia: row.camaDia,
      diferenciaCamasPacientes: row.diferenciaCamasPacientes,
      camasDisponiblesPromedio: row.camasDisponiblesPromedio,
      camasSamples: row.camasDisponiblesPromedio,
      sampleCount: 1,
    })
  }

  return [...monthly.values()]
    .map(({ camasSamples, sampleCount, ...row }) => ({
      ...row,
      camasDisponiblesPromedio: round(divide(camasSamples, sampleCount), 2),
    }))
    .sort((left, right) => left.fecha.localeCompare(right.fecha))
}

function buildChart(categories: string[], indicator: number[], minReference: number, maxReference: number): MetricChartData {
  return {
    categories,
    series: [
      { name: 'Indicador', data: indicator },
      { name: 'Minimo', data: categories.map(() => minReference) },
      { name: 'Maximo', data: categories.map(() => maxReference) },
    ],
  }
}

function buildPagePayload(rows: CentroObstetricoRawRow[], filters: CentroObstetricoFilters, lastUpdated: string, source: 'api' | 'fallback') {
  const monthlyRows = aggregateMonthlyRows(rows)
  const categories = monthlyRows.map((row) => buildCategoryLabel(row.anio, row.mesNumero))

  const permanenciaRows: PermanenciaRow[] = monthlyRows.map((row) => ({
    anio: row.anio,
    mesNumero: row.mesNumero,
    mesLabel: row.mesLabel,
    totalDiasEstancia: row.estancia,
    nroEgresosHospitalarios: row.egresos,
    indicador: round(divide(row.estancia, row.egresos), 2),
  }))

  const sustitucionRows: SustitucionRow[] = monthlyRows.map((row) => {
    const indicador = round(divide(row.diferenciaCamasPacientes, row.egresos), 2)

    return {
      anio: row.anio,
      mesNumero: row.mesNumero,
      mesLabel: row.mesLabel,
      camasDiaMenosPacienteDia: row.diferenciaCamasPacientes,
      nroEgresosHospitalarios: row.egresos,
      indicador,
      nroHoras: round(indicador * 24, 2),
    }
  })

  const ocupacionRows: OcupacionRow[] = monthlyRows.map((row) => ({
    anio: row.anio,
    mesNumero: row.mesNumero,
    mesLabel: row.mesLabel,
    pacienteDia: row.pacienteDia,
    diasCamaDisponible: row.camaDia,
    indicador: round(divide(row.pacienteDia, row.camaDia) * 100, 2),
  }))

  const rendimientoRows: RendimientoRow[] = monthlyRows.map((row) => ({
    anio: row.anio,
    mesNumero: row.mesNumero,
    mesLabel: row.mesLabel,
    nroEgresosHospitalarios: row.egresos,
    nroCamasDisponibles: row.camasDisponiblesPromedio,
    indicador: round(divide(row.egresos, row.camasDisponiblesPromedio), 2),
  }))

  const summaryTotals = monthlyRows.reduce(
    (totals, row) => ({
      totalIngresos: totals.totalIngresos + row.totalIngresos,
      nroTransferidosHospObstetricia: totals.nroTransferidosHospObstetricia + row.nroTransferidosHospObstetricia,
      nroTransferidosUci: totals.nroTransferidosUci + row.nroTransferidosUci,
      nroTransferidosOtrosServicios: totals.nroTransferidosOtrosServicios + row.nroTransferidosOtrosServicios,
      altaMedica: totals.altaMedica + row.altaMedica,
      totalReferidos: totals.totalReferidos + row.totalReferidos,
      destinoVillaPanamericana: totals.destinoVillaPanamericana + row.destinoVillaPanamericana,
      destinoOtros: totals.destinoOtros + row.destinoOtros,
      fallecidos: totals.fallecidos + row.fallecidos,
      fallecidoMenor12Horas: totals.fallecidoMenor12Horas + row.fallecidoMenor12Horas,
      fallecidos12a48Horas: totals.fallecidos12a48Horas + row.fallecidos12a48Horas,
      fallecidosMayorIgual48Horas: totals.fallecidosMayorIgual48Horas + row.fallecidosMayorIgual48Horas,
      egresos: totals.egresos + row.egresos,
    }),
    {
      totalIngresos: 0,
      nroTransferidosHospObstetricia: 0,
      nroTransferidosUci: 0,
      nroTransferidosOtrosServicios: 0,
      altaMedica: 0,
      totalReferidos: 0,
      destinoVillaPanamericana: 0,
      destinoOtros: 0,
      fallecidos: 0,
      fallecidoMenor12Horas: 0,
      fallecidos12a48Horas: 0,
      fallecidosMayorIgual48Horas: 0,
      egresos: 0,
    },
  )

  const permanenciaTotals = permanenciaRows.reduce(
    (totals, row) => ({
      totalDiasEstancia: totals.totalDiasEstancia + row.totalDiasEstancia,
      nroEgresosHospitalarios: totals.nroEgresosHospitalarios + row.nroEgresosHospitalarios,
      indicador: 0,
    }),
    {
      totalDiasEstancia: 0,
      nroEgresosHospitalarios: 0,
      indicador: 0,
    },
  )
  permanenciaTotals.indicador = round(
    divide(permanenciaTotals.totalDiasEstancia, permanenciaTotals.nroEgresosHospitalarios),
    2,
  )

  const sustitucionTotals = sustitucionRows.reduce(
    (totals, row) => ({
      camasDiaMenosPacienteDia: totals.camasDiaMenosPacienteDia + row.camasDiaMenosPacienteDia,
      nroEgresosHospitalarios: totals.nroEgresosHospitalarios + row.nroEgresosHospitalarios,
      indicador: 0,
      nroHoras: 0,
    }),
    {
      camasDiaMenosPacienteDia: 0,
      nroEgresosHospitalarios: 0,
      indicador: 0,
      nroHoras: 0,
    },
  )
  sustitucionTotals.indicador = round(
    divide(sustitucionTotals.camasDiaMenosPacienteDia, sustitucionTotals.nroEgresosHospitalarios),
    2,
  )
  sustitucionTotals.nroHoras = round(sustitucionTotals.indicador * 24, 2)

  const ocupacionTotals = ocupacionRows.reduce(
    (totals, row) => ({
      pacienteDia: totals.pacienteDia + row.pacienteDia,
      diasCamaDisponible: totals.diasCamaDisponible + row.diasCamaDisponible,
      indicador: 0,
    }),
    {
      pacienteDia: 0,
      diasCamaDisponible: 0,
      indicador: 0,
    },
  )
  ocupacionTotals.indicador = round(divide(ocupacionTotals.pacienteDia, ocupacionTotals.diasCamaDisponible) * 100, 2)

  const rendimientoTotals = rendimientoRows.reduce(
    (totals, row) => ({
      nroEgresosHospitalarios: totals.nroEgresosHospitalarios + row.nroEgresosHospitalarios,
      nroCamasDisponibles: totals.nroCamasDisponibles + row.nroCamasDisponibles,
      indicador: 0,
    }),
    {
      nroEgresosHospitalarios: 0,
      nroCamasDisponibles: 0,
      indicador: 0,
    },
  )
  rendimientoTotals.indicador = round(
    divide(rendimientoTotals.nroEgresosHospitalarios, rendimientoTotals.nroCamasDisponibles),
    2,
  )

  return {
    filters,
    lastUpdated,
    summary: {
      title: 'Indicador Hospitalario. HEVES',
      rows: monthlyRows,
      totals: summaryTotals,
    },
    panels: {
      permanencia: {
        title: 'Promedio de Permanencia Cama. HEVES',
        tableRows: permanenciaRows,
        totals: permanenciaTotals,
        chart: buildChart(categories, permanenciaRows.map((row) => row.indicador), 5, 6),
        minReference: 5,
        maxReference: 6,
      },
      sustitucion: {
        title: 'Intervalo de Sustitucion Cama. HEVES',
        tableRows: sustitucionRows,
        totals: sustitucionTotals,
        chart: buildChart(categories, sustitucionRows.map((row) => row.indicador), 0.6, 1),
        minReference: 0.6,
        maxReference: 1,
        note: 'Nota: Nro Horas es el Indicador expresado en horas (x 24 horas).',
      },
      ocupacion: {
        title: 'Porcentaje ocupacion Cama. HEVES',
        tableRows: ocupacionRows,
        totals: ocupacionTotals,
        chart: buildChart(categories, ocupacionRows.map((row) => row.indicador), 80, 90),
        minReference: 80,
        maxReference: 90,
      },
      rendimiento: {
        title: 'Rendimiento Cama. HEVES',
        tableRows: rendimientoRows,
        totals: rendimientoTotals,
        chart: buildChart(categories, rendimientoRows.map((row) => row.indicador), 6, 9),
        minReference: 6,
        maxReference: 9,
      },
    },
    source,
  } satisfies CentroObstetricoPagePayload
}

function isPagePayload(data: unknown): data is CentroObstetricoPagePayload {
  return typeof data === 'object' && data !== null && 'summary' in data && 'panels' in data
}

function isRawResponse(data: unknown): data is CentroObstetricoRawResponse {
  return typeof data === 'object' && data !== null && 'rows' in data && Array.isArray((data as CentroObstetricoRawResponse).rows)
}

export async function fetchCentroObstetricoPage(filters: CentroObstetricoFilters): Promise<CentroObstetricoPagePayload> {
  const normalizedFilters = normalizeFilters(filters)

  try {
    const response = await httpClient.get<CentroObstetricoPagePayload | CentroObstetricoRawResponse>('/reports/centro-obstetrico', {
      params: normalizedFilters,
    })

    if (isPagePayload(response.data)) {
      return {
        ...response.data,
        filters: normalizeFilters(response.data.filters),
        source: 'api',
      }
    }

    if (isRawResponse(response.data)) {
      return buildPagePayload(response.data.rows, normalizedFilters, response.data.lastUpdated, 'api')
    }
  } catch (error) {
    console.warn('Centro Obstetrico: no se pudo cargar el endpoint SQL y se usara el fallback local.', error)
  }

  const filteredRows = centroObstetricoMockRows.filter((row) => {
    const fecha = normalizeDate(row.fecha)

    return fecha >= normalizedFilters.fechaInicio && fecha <= normalizedFilters.fechaFin
  })

  return buildPagePayload(filteredRows, normalizedFilters, centroObstetricoMockLastUpdated, 'fallback')
}