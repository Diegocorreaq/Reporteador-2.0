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

function calculateCapacityRows(normalizedRows, blockName, projectFn, {
  sourceTag,
  fallbackSourceTag,
} = {}) {
  const selectedSourceTag = sourceTag ?? 'corte'
  const sourceRows = selectRowsBySource(normalizedRows, selectedSourceTag, fallbackSourceTag)
  const categorySpecs = getLegacyCategorySpecsByBlock(blockName)
  const rows = []
  const audit = []

  for (const categorySpec of categorySpecs) {
    const categoryRows = rowsForCategory(sourceRows, categorySpec)
    const sums = sumFields(categoryRows, ['total', 'cinah', 'chabi', 'clibr', 'cocup', 'c_vm', 'c_oxi', 'ctran'])
    const projected = projectFn(sums)

    rows.push({
      category: categorySpec.categoria_legacy,
      areas: categorySpec.areas_que_componen,
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
          total: projected.total,
          inoperativos: projected.inoperativos,
          operativos: projected.operativos,
          libres: projected.libres,
          ocupados: projected.ocupados,
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
    inoperativos: sums.cinah,
    operativos: sums.chabi,
    libres: sums.clibr,
    ocupados: sums.cocup,
    sinVm: sums.cocup - sums.c_vm,
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
    inoperativos: sums.cinah,
    operativos: sums.chabi,
    libres: sums.clibr,
    ocupados: sums.cocup,
    sinOxigeno: sums.cocup - (sums.c_vm + sums.c_oxi),
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
    inoperativos: sums.cinah,
    operativos: sums.chabi,
    libres: sums.clibr,
    ocupados: sums.cocup,
    sinOxigeno: sums.cocup - sums.c_oxi,
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
    inoperativos: sums.cinah,
    operativos: sums.chabi,
    libres: sums.clibr,
    ocupados: sums.cocup,
    // Legacy parity del controlador: resta cocup - c_vm (usa $sim7 en vez de $sum7).
    sinOxigeno: sums.cocup - sums.c_vm,
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
  const sums = sumFields(sourceRows, ['con_oxi', 'sin_oxi'])

  const row = {
    area: 'Nro de PAcientes en Sillas, Sillas de Ruedas, cAmillas, gradas, etc en espera de cama de Hospitalizacion',
    total: sums.con_oxi + sums.sin_oxi,
    conOxigeno: sums.con_oxi,
    sinOxigeno: sums.sin_oxi,
  }

  return {
    rows: [row],
    audit: [
      buildAuditRow({
        block: 'EMERGENCIA_AMPLIADA',
        category: 'RESUMEN_UNICO',
        sourceTag: sourceRows[0]?.source_tag ?? (options.sourceTag ?? 'resumen'),
        formula: JSON.stringify(LEGACY_FORMULAS_BY_BLOCK.EMERGENCIA_AMPLIADA),
        rows: sourceRows,
        payload: {
          total: row.total,
          c_oxigeno: row.conOxigeno,
          s_oxigeno: row.sinOxigeno,
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
