import {
  LEGACY_RESOURCE_CRITICAL_IDS,
  findLegacyCategoryForRow,
} from './susalud-mapping.js'

function toNumber(value) {
  const num = Number(value ?? 0)
  return Number.isFinite(num) ? num : 0
}

export function normalizeSusaludDataset(rows, {
  sourceTag = 'SP_CAMA_RESUMEN',
  corteTimestamp,
} = {}) {
  return (Array.isArray(rows) ? rows : []).map((row, index) => {
    const idservicio = toNumber(row.idservicio)
    const categoria = findLegacyCategoryForRow({
      idservicio,
      tipo: row.tipo,
    })

    const total = toNumber(row.total)
    const camas = toNumber(row.camas)
    const tocupa = toNumber(row.tocupa)
    const chabi = toNumber(row.chabi)
    const cocup = toNumber(row.cocup)
    const clibr = toNumber(row.clibr)
    const ctran = toNumber(row.ctran)
    const cinah = toNumber(row.cinah)
    const c_vm = toNumber(row.c_vm)
    const c_oxi = toNumber(row.c_oxi)

    const vmopera = toNumber(row.vmopera)
    const vminopera = toNumber(row.vminopera)
    const fvopera = toNumber(row.fvopera ?? row.monitor_operativos)
    const fvinopera = toNumber(row.fvinopera ?? row.monitor_inoperativos)

    const con_oxi = toNumber(row.con_oxi ?? row.e_hosp_ox)
    const sin_oxi = toNumber(row.sin_oxi ?? row.e_hosp)

    return {
      row_id: `${sourceTag}:${index + 1}`,
      source_tag: sourceTag,
      fuente_origen: sourceTag,
      corte_timestamp: corteTimestamp,

      idservicio,
      piso: String(row.piso ?? '').trim(),
      consultorio: String(row.servicio ?? '').trim(),
      area_fuente: String(row.servicio ?? '').trim(),
      tipo: String(row.tipo ?? '').trim(),

      bloque_susalud: categoria?.bloque_legacy ?? 'NO_MAPEADO',
      categoria_susalud: categoria?.categoria_legacy ?? 'NO_MAPEADO',
      area_equivalente_legacy: categoria?.areas_que_componen ?? String(row.servicio ?? '').trim(),

      incluir_en_reporte: Boolean(categoria),
      incluir_en_recurso_critico: LEGACY_RESOURCE_CRITICAL_IDS.has(idservicio),
      incluir_en_emergencia_ampliada: true,
      es_no_susalud: Boolean(categoria?.es_no_susalud),

      total,
      chabi,
      cocup,
      clibr,
      ctran,
      cinah,
      c_vm,
      c_fl: toNumber(row.c_fl),
      c_oxi,
      camas,
      tocupa,

      vmopera,
      vminopera,
      totalvm: toNumber(row.totalvm),

      fvopera,
      fvinopera,
      totalfv: toNumber(row.totalfv ?? row.monitor_total),

      totalaf: toNumber(row.totalaf),
      afopera: toNumber(row.afopera),
      afinopera: toNumber(row.afinopera),

      con_oxi,
      sin_oxi,

      pcr: toNumber(row.pcr),
      espera: toNumber(row.espera),
      espera_ant: toNumber(row.espera_ant),
      espera_mol: toNumber(row.espera_mol),
    }
  })
}
