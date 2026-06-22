import {
  LEGACY_DENGUE_SECTION_ROWS,
  LEGACY_FORMULAS_BY_BLOCK,
  LEGACY_RESOURCE_CRITICAL_IDS,
  getLegacyCategorySpecsByBlock,
  matchLegacyCategory,
} from './susalud-mapping.js'

function toNumber(value) {
  const num = Number(value ?? 0)
  return Number.isFinite(num) ? num : 0
}

function sumFields(rows, fields) {
  const sums = Object.fromEntries(fields.map((field) => [field, 0]))
  for (const row of rows) {
    for (const field of fields) {
      sums[field] += toNumber(row[field])
    }
  }
  return sums
}

function normalizeText(value) {
  return String(value ?? '')
    .trim()
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
}

function isExpandedEmergencyResourceRow(row, serviceCapacity = 0) {
  return normalizeText(row.tipo) !== 'cama' || serviceCapacity <= 0 || toNumber(row.camas) <= 0
}

function oxygenationMarkerCount(row) {
  if (row.c_oxigenoterapia !== null && row.c_oxigenoterapia !== undefined) {
    return toNumber(row.c_oxigenoterapia)
  }

  return toNumber(row.c_oxi) + toNumber(row.c_vm) + toNumber(row.c_fl)
}

function selectEmergenciaAmpliadaRows(sourceRows = []) {
  const emergenciaPrimerPisoRows = sourceRows.filter((row) => normalizeText(row.piso) === 'emergencia 1er piso')
  if (emergenciaPrimerPisoRows.length > 0) {
    return emergenciaPrimerPisoRows
  }

  const emergenciaRows = sourceRows.filter((row) => (
    normalizeText(row.piso).includes('emergencia') ||
    normalizeText(row.bloque_susalud) === 'emergencia'
  ))

  return emergenciaRows.length > 0 ? emergenciaRows : sourceRows
}

function calculateDemandaAmpliada(rows = []) {
  const groups = new Map()

  for (const row of rows) {
    const key = `${row.source_tag}|${row.piso}|${row.idservicio}|${row.consultorio}`
    const current = groups.get(key) ?? {
      rows: [],
      camas: 0,
      tocupaSp: 0,
      cocup: 0,
      hasDemandBase: false,
    }

    const camas = toNumber(row.camas)
    const tocupa = toNumber(row.tocupa)

    current.rows.push(row)
    current.camas = Math.max(current.camas, camas)
    current.tocupaSp = Math.max(current.tocupaSp, tocupa)
    current.cocup += toNumber(row.cocup)
    current.hasDemandBase = current.hasDemandBase || camas > 0 || tocupa > 0 || toNumber(row.cocup) > 0

    groups.set(key, current)
  }

  let total = 0
  let conOxigeno = 0
  const sourceRows = []
  for (const group of groups.values()) {
    if (!group.hasDemandBase) {
      continue
    }

    const demand = Math.max(Math.max(group.cocup, group.tocupaSp) - group.camas, 0)
    const oxygenDemand = group.rows
      .filter((row) => isExpandedEmergencyResourceRow(row, group.camas))
      .reduce((sum, row) => sum + oxygenationMarkerCount(row), 0)

    total += demand
    conOxigeno += Math.min(demand, oxygenDemand)
    sourceRows.push(...group.rows)
  }

  return { total, conOxigeno, sinOxigeno: Math.max(total - conOxigeno, 0), sourceRows }
}

function selectRowsBySource(normalizedRows, sourceTag, fallbackSourceTag) {
  const sourceRows = normalizedRows.filter((row) => row.source_tag === sourceTag)
  if (sourceRows.length > 0 || !fallbackSourceTag) {
    return sourceRows
  }

  return normalizedRows.filter((row) => row.source_tag === fallbackSourceTag)
}

function buildAuditRow({ block, category, formula, rows, payload, sourceTag }) {
  return {
    etapa: 'CALCULO_BLOQUE',
    bloque: block,
    categoria: category,
    fuente_origen_bloque: sourceTag,
    formula,
    filas_fuente: rows.map((row) => row.row_id).join(', '),
    idservicio_fuente: [...new Set(rows.map((row) => row.idservicio))].sort((a, b) => a - b).join(', '),
    ...payload,
  }
}

function rowsForCategory(sourceRows, categorySpec) {
  return sourceRows.filter((row) => matchLegacyCategory(row, categorySpec))
}

function buildAreasQueComponen(rows = []) {
  const seen = new Set()
  const areas = []

  for (const row of rows) {
    const area = String(row.consultorio ?? row.area_fuente ?? row.area_equivalente_legacy ?? '').trim()
    const key = normalizeText(area)
    if (!area || seen.has(key)) {
      continue
    }

    seen.add(key)
    areas.push(area)
  }

  return areas
    .sort((left, right) => normalizeText(left).localeCompare(normalizeText(right)))
    .join(', ')
}

function summarizeOfficialCapacityRows(rows = []) {
  const groups = new Map()

  for (const row of rows) {
    const key = `${row.source_tag}|${row.piso}|${row.idservicio}|${row.consultorio}`
    const current = groups.get(key) ?? {
      camas: 0,
      chabi: 0,
      cocup: 0,
      clibr: 0,
      tocupaSp: 0,
      c_vm: 0,
      c_oxi: 0,
    }

    current.camas = Math.max(current.camas, toNumber(row.camas))
    current.chabi += toNumber(row.chabi)
    current.cocup += toNumber(row.cocup)
    current.clibr += toNumber(row.clibr)
    current.tocupaSp = Math.max(current.tocupaSp, toNumber(row.tocupa))
    current.c_vm += toNumber(row.c_vm)
    current.c_oxi += toNumber(row.c_oxi)

    groups.set(key, current)
  }

  const totals = {
    total: 0,
    inoperativos: 0,
    operativos: 0,
    libres: 0,
    ocupados: 0,
    c_vm: 0,
    c_oxi: 0,
    demanda_adicional: 0,
  }

  for (const group of groups.values()) {
    const capacidad = group.camas
    const operativos = Math.min(group.chabi, capacidad)
    const ocupacionReal = Math.max(group.cocup, group.tocupaSp)
    const ocupados = Math.min(ocupacionReal, operativos)
    const libres = Math.min(group.clibr, Math.max(operativos - ocupados, 0))
    const inoperativos = Math.max(capacidad - operativos, 0)
    const cVm = Math.min(group.c_vm, ocupados)
    const cOxi = Math.min(group.c_oxi, Math.max(ocupados - cVm, 0))

    totals.total += capacidad
    totals.inoperativos += inoperativos
    totals.operativos += operativos
    totals.libres += libres
    totals.ocupados += ocupados
    totals.c_vm += cVm
    totals.c_oxi += cOxi
    totals.demanda_adicional += Math.max(ocupacionReal - capacidad, 0)
  }

  return totals
}

function calculateCapacityRows(normalizedRows, blockName, projectFn, {
  sourceTag,
  fallbackSourceTag,
  areaSourceRows,
} = {}) {
  const selectedSourceTag = sourceTag ?? 'corte'
  const sourceRows = selectRowsBySource(normalizedRows, selectedSourceTag, fallbackSourceTag)
  const areaRows = Array.isArray(areaSourceRows) && areaSourceRows.length > 0 ? areaSourceRows : sourceRows
  const categorySpecs = getLegacyCategorySpecsByBlock(blockName)
  const rows = []
  const audit = []

  for (const categorySpec of categorySpecs) {
    const categoryRows = rowsForCategory(sourceRows, categorySpec)
    const categoryAreaRows = rowsForCategory(areaRows, categorySpec)
    const areas = buildAreasQueComponen(categoryAreaRows)
    const sums = summarizeOfficialCapacityRows(categoryRows)
    const projected = projectFn(sums)

    rows.push({
      category: categorySpec.categoria_legacy,
      areas,
      ...projected,
      _esNoSusalud: Boolean(categorySpec.es_no_susalud),
    })

    audit.push(
      buildAuditRow({
        block: blockName,
        category: categorySpec.categoria_legacy,
        sourceTag: sourceRows[0]?.source_tag ?? selectedSourceTag,
        formula: JSON.stringify(LEGACY_FORMULAS_BY_BLOCK[blockName] ?? {}),
        rows: categoryRows,
        payload: {
          areas_que_componen: areas,
          total: projected.total,
          inoperativos: projected.inoperativos,
          operativos: projected.operativos,
          libres: projected.libres,
          ocupados: projected.ocupados,
          demanda_adicional: sums.demanda_adicional,
          s_oxigeno: projected.sinOxigeno ?? null,
          c_oxigeno: projected.conOxigeno ?? null,
          sin_vm: projected.sinVm ?? null,
          con_vm: projected.conVm ?? null,
          reserva: projected.reserva ?? null,
        },
      }),
    )
  }

  return { rows, audit }
}

export function buildUciBlock(normalizedRows, options = {}) {
  const { rows, audit } = calculateCapacityRows(normalizedRows, 'UCI', (sums) => ({
    total: sums.total,
    inoperativos: sums.inoperativos,
    operativos: sums.operativos,
    libres: sums.libres,
    ocupados: sums.ocupados,
    sinVm: sums.ocupados - sums.c_vm,
    conVm: sums.c_vm,
    reserva: 0,
  }), { sourceTag: 'resumen', fallbackSourceTag: 'corte', ...options })

  return {
    rows: rows.map((row) => ({
      upssUci: row.category,
      areas: row.areas,
      total: row.total,
      inoperativos: row.inoperativos,
      operativos: row.operativos,
      libres: row.libres,
      ocupados: row.ocupados,
      sinVm: row.sinVm,
      conVm: row.conVm,
      reserva: row.reserva,
      _esNoSusalud: row._esNoSusalud,
    })),
    audit,
  }
}

export function buildUcinBlock(normalizedRows, options = {}) {
  const { rows, audit } = calculateCapacityRows(normalizedRows, 'UCIN', (sums) => ({
    total: sums.total,
    inoperativos: sums.inoperativos,
    operativos: sums.operativos,
    libres: sums.libres,
    ocupados: sums.ocupados,
    sinOxigeno: sums.ocupados - (sums.c_vm + sums.c_oxi),
    conOxigeno: sums.c_oxi,
    conVm: sums.c_vm,
    reserva: 0,
  }), { sourceTag: 'resumen', fallbackSourceTag: 'corte', ...options })

  return {
    rows: rows.map((row) => ({
      upssUcin: row.category,
      areas: row.areas,
      total: row.total,
      inoperativos: row.inoperativos,
      operativos: row.operativos,
      libres: row.libres,
      ocupados: row.ocupados,
      sinOxigeno: row.sinOxigeno,
      conOxigeno: row.conOxigeno,
      conVm: row.conVm,
      reserva: row.reserva,
      _esNoSusalud: row._esNoSusalud,
    })),
    audit,
  }
}

export function buildHospitalizacionBlock(normalizedRows, options = {}) {
  const { rows, audit } = calculateCapacityRows(normalizedRows, 'HOSPITALIZACION', (sums) => ({
    total: sums.total,
    inoperativos: sums.inoperativos,
    operativos: sums.operativos,
    libres: sums.libres,
    ocupados: sums.ocupados,
    sinOxigeno: sums.ocupados - sums.c_oxi,
    conOxigeno: sums.c_oxi,
    reserva: 0,
  }), { sourceTag: 'resumen', fallbackSourceTag: 'corte', ...options })

  return {
    rows: rows.map((row) => ({
      upssHospitalizacion: row.category,
      areas: row.areas,
      total: row.total,
      inoperativos: row.inoperativos,
      operativos: row.operativos,
      libres: row.libres,
      ocupados: row.ocupados,
      sinOxigeno: row.sinOxigeno,
      conOxigeno: row.conOxigeno,
      reserva: row.reserva,
      _esNoSusalud: row._esNoSusalud,
    })),
    audit,
  }
}

export function buildEmergenciaBlock(normalizedRows, options = {}) {
  const { rows, audit } = calculateCapacityRows(normalizedRows, 'EMERGENCIA', (sums) => ({
    total: sums.total,
    inoperativos: sums.inoperativos,
    operativos: sums.operativos,
    libres: sums.libres,
    ocupados: sums.ocupados,
    sinOxigeno: sums.ocupados - sums.c_vm,
    conOxigeno: sums.c_oxi,
    conVm: sums.c_vm,
    reserva: 0,
  }), { sourceTag: 'resumen', fallbackSourceTag: 'corte', ...options })

  return {
    rows: rows.map((row) => ({
      upssEmergencia: row.category,
      areas: row.areas,
      total: row.total,
      inoperativos: row.inoperativos,
      operativos: row.operativos,
      libres: row.libres,
      ocupados: row.ocupados,
      sinOxigeno: row.sinOxigeno,
      conOxigeno: row.conOxigeno,
      conVm: row.conVm,
      reserva: row.reserva,
      _esNoSusalud: row._esNoSusalud,
    })),
    audit,
  }
}

export function buildEmergenciaAmpliadaBlock(normalizedRows, options = {}) {
  const sourceRows = selectRowsBySource(normalizedRows, options.sourceTag ?? 'resumen', options.fallbackSourceTag ?? 'corte')
  const emergenciaAmpliadaSourceRows = selectEmergenciaAmpliadaRows(sourceRows)
  const demandaAmpliada = calculateDemandaAmpliada(emergenciaAmpliadaSourceRows)

  const total = demandaAmpliada.total
  const conOxigeno = demandaAmpliada.conOxigeno
  const sinOxigeno = demandaAmpliada.sinOxigeno

  const row = {
    area: 'Nro de PAcientes en Sillas, Sillas de Ruedas, cAmillas, gradas, etc en espera de cama de Hospitalizacion',
    total,
    conOxigeno,
    sinOxigeno,
  }

  return {
    rows: [row],
    audit: [
      buildAuditRow({
        block: 'EMERGENCIA_AMPLIADA',
        category: 'RESUMEN_UNICO',
        sourceTag: emergenciaAmpliadaSourceRows[0]?.source_tag ?? sourceRows[0]?.source_tag ?? (options.sourceTag ?? 'resumen'),
        formula: JSON.stringify(LEGACY_FORMULAS_BY_BLOCK.EMERGENCIA_AMPLIADA),
        rows: demandaAmpliada.sourceRows,
        payload: {
          total: row.total,
          c_oxigeno: row.conOxigeno,
          s_oxigeno: row.sinOxigeno,
          fuente_demanda_ampliada: 'demanda_monitoreo_primer_piso',
        },
      }),
    ],
  }
}

export function buildVentiladoresMonitoresBlock(normalizedRows, options = {}) {
  const sourceRows = selectRowsBySource(normalizedRows, options.sourceTag ?? 'resumen', options.fallbackSourceTag ?? 'corte')
  const rows = sourceRows.filter((row) => LEGACY_RESOURCE_CRITICAL_IDS.has(toNumber(row.idservicio)))

  const sums = sumFields(rows, ['vmopera', 'vminopera', 'c_vm', 'fvopera', 'fvinopera', 'cocup'])

  const ventiladores = {
    recurso: 'VENTILADORES',
    total: sums.vmopera + sums.vminopera,
    inoperativos: sums.vminopera,
    operativos: sums.vmopera,
    disponibles: sums.vmopera - sums.c_vm,
    enUso: sums.c_vm,
  }

  const monitores = {
    recurso: 'MONITOREO DE FUNCIONES VITALES',
    total: sums.fvopera + sums.fvinopera,
    inoperativos: sums.fvinopera,
    operativos: sums.fvopera,
    disponibles: sums.fvopera - sums.cocup,
    enUso: sums.cocup,
  }

  return {
    rows: [ventiladores, monitores],
    audit: [
      buildAuditRow({
        block: 'RECURSOS_CRITICOS',
        category: 'VENTILADORES',
        sourceTag: sourceRows[0]?.source_tag ?? (options.sourceTag ?? 'resumen'),
        formula: LEGACY_FORMULAS_BY_BLOCK.RECURSOS_CRITICOS.VENTILADORES,
        rows,
        payload: {
          total: ventiladores.total,
          inoperativos: ventiladores.inoperativos,
          operativos: ventiladores.operativos,
          disponibles: ventiladores.disponibles,
          en_uso: ventiladores.enUso,
        },
      }),
      buildAuditRow({
        block: 'RECURSOS_CRITICOS',
        category: 'MONITOREO DE FUNCIONES VITALES',
        sourceTag: sourceRows[0]?.source_tag ?? (options.sourceTag ?? 'resumen'),
        formula: LEGACY_FORMULAS_BY_BLOCK.RECURSOS_CRITICOS.MONITORES,
        rows,
        payload: {
          total: monitores.total,
          inoperativos: monitores.inoperativos,
          operativos: monitores.operativos,
          disponibles: monitores.disponibles,
          en_uso: monitores.enUso,
        },
      }),
    ],
  }
}

export function buildDengueBlock() {
  const sectionOrder = ['UPSS UCI', 'UPSS UCIN', 'UPSS HOSPITALIZACION']

  const sections = sectionOrder.map((title) => ({
    title,
    rows: (LEGACY_DENGUE_SECTION_ROWS[title] ?? []).map((categoria) => ({ categoria, casos: 0 })),
  }))

  const audit = sections.flatMap((section) =>
    section.rows.map((row) => ({
      etapa: 'CALCULO_BLOQUE',
      bloque: 'DENGUE',
      categoria: `${section.title} / ${row.categoria}`,
      fuente_origen_bloque: 'estructura_legacy',
      formula: LEGACY_FORMULAS_BY_BLOCK.DENGUE.ESTRUCTURA,
      total: row.casos,
    })),
  )

  return { sections, audit }
}

// backward-compatible exports
export const calculateUciBlock = buildUciBlock
export const calculateUcinBlock = buildUcinBlock
export const calculateHospitalizacionBlock = buildHospitalizacionBlock
export const calculateEmergenciaBlock = buildEmergenciaBlock
export const calculateEmergenciaAmpliadaBlock = buildEmergenciaAmpliadaBlock
export const calculateVentiladoresMonitoresBlock = buildVentiladoresMonitoresBlock
export const calculateDengueBlock = buildDengueBlock
