function serializeForAudit(value) {
  if (Array.isArray(value)) {
    return value.map((item) => serializeForAudit(item)).join(', ')
  }

  if (value && typeof value === 'object') {
    return JSON.stringify(value)
  }

  return value ?? ''
}

export function buildSusaludAuditRows({
  mappingRows = [],
  normalizedRows = [],
  calculationAuditRows = [],
}) {
  const mapRows = (Array.isArray(mappingRows) ? mappingRows : []).map((row) => ({
    audit_tipo: 'MAPEO_LEGACY',
    bloque_legacy: row.bloque_legacy,
    categoria_legacy: row.categoria_legacy,
    areas_que_componen: row.areas_que_componen,
    idservicio_incluidos: serializeForAudit(row.idservicio_incluidos),
    idservicio_excluidos: serializeForAudit(row.idservicio_excluidos),
    tipos_excluidos: serializeForAudit(row.tipos_excluidos),
    columnas_que_calcula: serializeForAudit(row.columnas_que_calcula),
    formula_por_columna: serializeForAudit(row.formula_por_columna),
    usa_fuente_corte: row.usa_fuente_corte,
    usa_fuente_resumen: row.usa_fuente_resumen,
    incluir_en_reporte: row.incluir_en_reporte,
    es_no_susalud: row.es_no_susalud,
    orden_bloque: row.orden_bloque,
    orden_categoria: row.orden_categoria,
  }))

  const datasetRows = (Array.isArray(normalizedRows) ? normalizedRows : []).map((row) => ({
    audit_tipo: 'DATASET_NORMALIZADO',
    corte_timestamp: row.corte_timestamp,
    source_tag: row.source_tag,
    row_id: row.row_id,
    idservicio: row.idservicio,
    consultorio: row.consultorio,
    tipo: row.tipo,
    bloque_susalud: row.bloque_susalud,
    categoria_susalud: row.categoria_susalud,
    area_equivalente_legacy: row.area_equivalente_legacy,
    incluir_en_reporte: row.incluir_en_reporte,
    incluir_en_recurso_critico: row.incluir_en_recurso_critico,
    incluir_en_emergencia_ampliada: row.incluir_en_emergencia_ampliada,
    es_no_susalud: row.es_no_susalud,

    total: row.total,
    camas: row.camas,
    tocupa: row.tocupa,
    chabi: row.chabi,
    cocup: row.cocup,
    clibr: row.clibr,
    ctran: row.ctran,
    cinah: row.cinah,
    c_vm: row.c_vm,
    c_oxi: row.c_oxi,

    vmopera: row.vmopera,
    vminopera: row.vminopera,
    fvopera: row.fvopera,
    fvinopera: row.fvinopera,

    con_oxi: row.con_oxi,
    sin_oxi: row.sin_oxi,
  }))

  const calcRows = (Array.isArray(calculationAuditRows) ? calculationAuditRows : []).map((row) => ({
    audit_tipo: 'RESULTADO_BLOQUE',
    ...row,
  }))

  return [...mapRows, ...datasetRows, ...calcRows]
}
