export const LEGACY_DENGUE_ROWS = ['ADULTOS', 'PEDIATRIA', 'NEONATAL', 'GESTANTE']
export const LEGACY_DENGUE_SECTION_ROWS = {
  'UPSS UCI': ['UCI ADULTOS', 'UCI PEDIATRIA', 'UCI NEONATAL', 'UCI GESTANTE'],
  'UPSS UCIN': ['UCIN ADULTOS', 'UCIN PEDIATRIA', 'UCIN NEONATAL', 'UCIN GESTANTE'],
  'UPSS HOSPITALIZACION': [
    'HOSPITALIZACION ADULTOS',
    'HOSPITALIZACION PEDIATRIA',
    'HOSPITALIZACION NEONATAL',
    'HOSPITALIZACION GESTANTE',
  ],
}

export const LEGACY_BLOCK_ORDER = [
  'UCI',
  'UCIN',
  'HOSPITALIZACION',
  'EMERGENCIA',
  'EMERGENCIA_AMPLIADA',
  'RECURSOS_CRITICOS',
  'DENGUE',
]

export const LEGACY_BLOCK_SOURCE_CONFIG = {
  UCI: { usa_fuente_corte: false, usa_fuente_resumen: true },
  UCIN: { usa_fuente_corte: false, usa_fuente_resumen: true },
  HOSPITALIZACION: { usa_fuente_corte: false, usa_fuente_resumen: true },
  EMERGENCIA: { usa_fuente_corte: false, usa_fuente_resumen: true },
  EMERGENCIA_AMPLIADA: { usa_fuente_corte: false, usa_fuente_resumen: true },
  RECURSOS_CRITICOS: { usa_fuente_corte: false, usa_fuente_resumen: true },
  DENGUE: { usa_fuente_corte: false, usa_fuente_resumen: false },
}

export const LEGACY_RESOURCE_CRITICAL_IDS = new Set([398, 669, 672, 430, 670, 690])

export const LEGACY_FORMULAS_BY_BLOCK = {
  UCI: {
    TOTAL: 'SUM(total)',
    INOPERATIVOS: 'SUM(cinah)',
    OPERATIVOS: 'SUM(chabi)',
    LIBRES: 'SUM(clibr)',
    OCUPADOS: 'SUM(cocup)',
    SIN_VM: 'SUM(cocup) - SUM(c_vm)',
    CON_VM: 'SUM(c_vm)',
    RESERVA: '0 (legacy: no suma ctran en camas_susalud)',
  },
  UCIN: {
    TOTAL: 'SUM(total)',
    INOPERATIVOS: 'SUM(cinah)',
    OPERATIVOS: 'SUM(chabi)',
    LIBRES: 'SUM(clibr)',
    OCUPADOS: 'SUM(cocup)',
    S_OXIGENO: 'SUM(cocup) - (SUM(c_vm) + SUM(c_oxi))',
    C_OXIGENO: 'SUM(c_oxi)',
    CON_VM: 'SUM(c_vm)',
    RESERVA: '0 (legacy: no suma ctran en camas_susalud)',
  },
  HOSPITALIZACION: {
    TOTAL: 'SUM(total)',
    INOPERATIVOS: 'SUM(cinah)',
    OPERATIVOS: 'SUM(chabi)',
    LIBRES: 'SUM(clibr)',
    OCUPADOS: 'SUM(cocup)',
    S_OXIGENO: 'SUM(cocup) - SUM(c_oxi)',
    C_OXIGENO: 'SUM(c_oxi)',
    RESERVA: '0 (legacy: no suma ctran en camas_susalud)',
  },
  EMERGENCIA: {
    TOTAL: 'SUM(total)',
    INOPERATIVOS: 'SUM(cinah)',
    OPERATIVOS: 'SUM(chabi)',
    LIBRES: 'SUM(clibr)',
    OCUPADOS: 'SUM(cocup)',
    S_OXIGENO: 'SUM(cocup) - SUM(c_vm) (legacy usa $sim7, no $sum7)',
    C_OXIGENO: 'SUM(c_oxi)',
    CON_VM: 'SUM(c_vm)',
    RESERVA: '0 (legacy: no suma ctran en camas_susalud)',
  },
  EMERGENCIA_AMPLIADA: {
    TOTAL: 'SUM(con_oxi + sin_oxi) en TODO el dataset base',
    C_OXIGENO: 'SUM(con_oxi) en TODO el dataset base',
    S_OXIGENO: 'SUM(sin_oxi) en TODO el dataset base',
  },
  RECURSOS_CRITICOS: {
    VENTILADORES: 'total=SUM(vmopera+vminopera), inop=SUM(vminopera), op=SUM(vmopera), disponibles=SUM(vmopera)-SUM(c_vm), en_uso=SUM(c_vm) en ids [398,669,672,430,670,690]',
    MONITORES: 'total=SUM(fvopera+fvinopera), inop=SUM(fvinopera), op=SUM(fvopera), disponibles=SUM(fvopera)-SUM(cocup), en_uso=SUM(cocup) en ids [398,669,672,430,670,690]',
  },
  DENGUE: {
    ESTRUCTURA: 'Valores fijos en 0 con subbloques UPSS UCI/UCIN/HOSPITALIZACION y filas ADULTOS/PEDIATRIA/NEONATAL/GESTANTE',
  },
}

const LEGACY_CATEGORY_SPECS = [
  {
    bloque_legacy: 'UCI',
    categoria_legacy: 'UCI ADULTOS',
    areas_que_componen: 'UCI ADULTOS A',
    include_rules: [{ idservicios: [672] }],
    es_no_susalud: false,
    orden_bloque: 1,
    orden_categoria: 1,
  },
  {
    bloque_legacy: 'UCI',
    categoria_legacy: 'UCI PEDIATRICA',
    areas_que_componen: 'UCI PEDIATRICA',
    include_rules: [{ idservicios: [670] }],
    es_no_susalud: false,
    orden_bloque: 1,
    orden_categoria: 2,
  },
  {
    bloque_legacy: 'UCI',
    categoria_legacy: 'UCI NEONATOLOGIA',
    areas_que_componen: 'UCI NEONATOLOGIA 2',
    include_rules: [{ idservicios: [430] }],
    es_no_susalud: false,
    orden_bloque: 1,
    orden_categoria: 3,
  },

  {
    bloque_legacy: 'UCIN',
    categoria_legacy: 'UCIN ADULTO',
    areas_que_componen: 'UCIN ADULTOS C',
    include_rules: [{ idservicios: [669] }],
    es_no_susalud: false,
    orden_bloque: 2,
    orden_categoria: 1,
  },
  {
    bloque_legacy: 'UCIN',
    categoria_legacy: 'UCIN PEDIATRICO',
    areas_que_componen: 'UCIN PEDIATRICO',
    include_rules: [{ idservicios: [690] }],
    es_no_susalud: false,
    orden_bloque: 2,
    orden_categoria: 2,
  },
  {
    bloque_legacy: 'UCIN',
    categoria_legacy: 'UCIN NEONATOLOGIA',
    areas_que_componen: 'UCI NEONATOLOGIA 1,3 (NO SUSALUD)',
    include_rules: [{ idservicios: [440, 441] }],
    es_no_susalud: true,
    orden_bloque: 2,
    orden_categoria: 3,
  },

  {
    bloque_legacy: 'HOSPITALIZACION',
    categoria_legacy: 'HOSPITALIZACION ADULTOS',
    areas_que_componen:
      'HOSPITALIZACION SALUD MENTAL, HOSPITALIZACION OBSTETRICIA ARO,HOSPITALIZACION GINECOLOGIA, HOSPITALIZACION MEDICINA, HOSPITALIZACION 2 GINECO-OBSTETRICIA, HOSPITALIZACION CIRUGIA ,HOSPITALIZACION GINECOLOGIA ONCOLOGICA, HOSPITALIZACION CIRUGIA ONCOLOGICA',
    include_rules: [{ idservicios: [655, 657, 656, 424, 651, 691, 358, 214, 798] }],
    es_no_susalud: false,
    orden_bloque: 3,
    orden_categoria: 1,
  },
  {
    bloque_legacy: 'HOSPITALIZACION',
    categoria_legacy: 'HOSPITALIZACION PEDIATRICA',
    areas_que_componen: 'HOSPITALIZACION PEDIATRIA',
    include_rules: [{ idservicios: [650] }],
    es_no_susalud: false,
    orden_bloque: 3,
    orden_categoria: 2,
  },

  {
    bloque_legacy: 'EMERGENCIA',
    categoria_legacy: 'UNIDAD DE TRAUMA SCHOCK',
    areas_que_componen: 'SHOCK TRAUMA ADULTOS, SHOCK TRAUMA PEDIATRIA',
    include_rules: [{ idservicios: [398, 772] }],
    es_no_susalud: false,
    orden_bloque: 4,
    orden_categoria: 1,
  },
  {
    bloque_legacy: 'EMERGENCIA',
    categoria_legacy: 'EMERGENCIA ADULTOS',
    areas_que_componen:
      'OBSERVACION GINECO-OBSTETRICIA, OBSERVACION MEDICINA 1, OBSERVACION MEDICINA 2, OBSERVACION MEDICINA 3, OBSERVACION MEDICINA 4, OBSERVACION MUJERES, OBSERVACION QUIRURGICA, OBSERVACION VARONES',
    include_rules: [
      { idservicios: [786, 418, 443, 668, 671, 775, 776] },
      { idservicios: [664], tipos_excluidos: ['SILLA'] },
      { idservicios: [437], tipos_excluidos: ['SILLA'] },
    ],
    es_no_susalud: false,
    orden_bloque: 4,
    orden_categoria: 2,
  },
  {
    bloque_legacy: 'EMERGENCIA',
    categoria_legacy: 'EMERGENCIA PEDIATRICA',
    areas_que_componen:
      'OBSERVACION AISLADO 1 PEDIATRICA, OBSERVACION AISLADO 2 PEDIATRICA, OBSERVACION PEDIATRIA 1, OBSERVACION PEDIATRIA 2',
    include_rules: [{ idservicios: [686, 693, 665, 105] }],
    es_no_susalud: false,
    orden_bloque: 4,
    orden_categoria: 3,
  },
]

function toNumber(value) {
  const n = Number(value ?? 0)
  return Number.isFinite(n) ? n : 0
}

export function normalizeLegacyTipo(value) {
  // Legacy compara el tipo tal cual viene (solo con trim), sin normalizar
  // mayusculas/minusculas ni acentos.
  return String(value ?? '').trim()
}

function extractRuleTypeSet(rule, key) {
  return new Set((rule[key] ?? []).map((item) => normalizeLegacyTipo(item)))
}

export function matchLegacyRule(row, rule) {
  const idservicio = toNumber(row.idservicio)
  if (!Array.isArray(rule.idservicios) || !rule.idservicios.includes(idservicio)) {
    return false
  }

  const tipo = normalizeLegacyTipo(row.tipo)
  const tiposIncluidos = extractRuleTypeSet(rule, 'tipos_incluidos')
  if (tiposIncluidos.size > 0 && !tiposIncluidos.has(tipo)) {
    return false
  }

  const tiposExcluidos = extractRuleTypeSet(rule, 'tipos_excluidos')
  if (tiposExcluidos.has(tipo)) {
    return false
  }

  return true
}

export function matchLegacyCategory(row, categorySpec) {
  return (categorySpec.include_rules ?? []).some((rule) => matchLegacyRule(row, rule))
}

export function findLegacyCategoryForRow(row) {
  for (const categorySpec of LEGACY_CATEGORY_SPECS) {
    if (matchLegacyCategory(row, categorySpec)) {
      return categorySpec
    }
  }
  return null
}

function uniqueSortedNumbers(values = []) {
  return [...new Set(values.map((value) => toNumber(value)).filter((value) => value > 0))].sort((a, b) => a - b)
}

function uniqueSortedStrings(values = []) {
  return [...new Set(values.map((value) => String(value ?? '').trim()).filter(Boolean))].sort((a, b) => a.localeCompare(b))
}

function blockColumns(blockName) {
  switch (blockName) {
    case 'UCI':
      return ['TOTAL', 'INOPERATIVOS', 'OPERATIVOS', 'LIBRES', 'OCUPADOS', 'SIN VM', 'CON VM', 'RESERVA']
    case 'UCIN':
      return ['TOTAL', 'INOPERATIVOS', 'OPERATIVOS', 'LIBRES', 'OCUPADOS', 'S/OXIGENO', 'C/OXIGENO', 'CON VM', 'RESERVA']
    case 'HOSPITALIZACION':
      return ['TOTAL', 'INOPERATIVOS', 'OPERATIVOS', 'LIBRES', 'OCUPADOS', 'S/OXIGENO', 'C/OXIGENO', 'RESERVA']
    case 'EMERGENCIA':
      return ['TOTAL', 'INOPERATIVOS', 'OPERATIVOS', 'LIBRES', 'OCUPADOS', 'S/OXIGENO', 'C/OXIGENO', 'CON VM', 'RESERVA']
    default:
      return []
  }
}

export function getLegacyCategorySpecs() {
  return LEGACY_CATEGORY_SPECS
}

export function getLegacyCategorySpecsByBlock(blockName) {
  return LEGACY_CATEGORY_SPECS.filter((item) => item.bloque_legacy === blockName)
}

export function buildLegacyCategoryMappingRows() {
  return LEGACY_CATEGORY_SPECS.map((categorySpec) => {
    const rules = categorySpec.include_rules ?? []
    const idsIncluidos = uniqueSortedNumbers(rules.flatMap((rule) => rule.idservicios ?? []))
    const idsExcluidos = uniqueSortedNumbers(rules.flatMap((rule) => rule.idservicios_excluidos ?? []))
    const tiposExcluidos = uniqueSortedStrings(rules.flatMap((rule) => rule.tipos_excluidos ?? []))

    const sourceConfig = LEGACY_BLOCK_SOURCE_CONFIG[categorySpec.bloque_legacy] ?? {
      usa_fuente_corte: false,
      usa_fuente_resumen: false,
    }

    return {
      bloque_legacy: categorySpec.bloque_legacy,
      categoria_legacy: categorySpec.categoria_legacy,
      areas_que_componen: categorySpec.areas_que_componen,
      idservicio_incluidos: idsIncluidos,
      idservicio_excluidos: idsExcluidos,
      tipos_excluidos: tiposExcluidos,
      columnas_que_calcula: blockColumns(categorySpec.bloque_legacy),
      formula_por_columna: LEGACY_FORMULAS_BY_BLOCK[categorySpec.bloque_legacy] ?? {},
      usa_fuente_corte: sourceConfig.usa_fuente_corte,
      usa_fuente_resumen: sourceConfig.usa_fuente_resumen,
      incluir_en_reporte: true,
      es_no_susalud: Boolean(categorySpec.es_no_susalud),
      orden_bloque: categorySpec.orden_bloque,
      orden_categoria: categorySpec.orden_categoria,
      include_rules: categorySpec.include_rules,
    }
  })
}
