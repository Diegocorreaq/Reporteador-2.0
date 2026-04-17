import { executeProcedure, sql } from './legacy-sql.service.js'
import { buildSimpleWorkbook, buildStructuredWorkbook, buildTabulatedWorkbook, MIME_XLSX } from './excel-export.service.js'

function resolveCatalogConnection(catalog) {
  // SIGH catalogs use sigh1
  if (['range', 'current-sigh'].includes(catalog)) {
    return 'sigh1'
  }

  // Everything else uses general
  return 'general'
}

const CURRENT_EXPORTS = {
  exportaxls_1:     { procedure: 'SP_REPORTE_EXCEL1',    fileName: 'reporte-informe-familia.xlsx' },
  exportaxls_2:     { procedure: 'SP_REPORTE_EXCEL2',    fileName: 'reporte-oxigenoterapia-hospitalizacion.xlsx' },
  exportaxls_3:     { procedure: 'SP_REPORTE_EXCEL3',    fileName: 'reporte-oxigenoterapia-emergencia-y-uci.xlsx' },
  exportaxls_10:    { procedure: 'SP_REPORTE_EXCEL10',   fileName: 'reporte-pacientes-hospitalizados-corte.xlsx' },
  exportaxls_int_a: { procedure: 'SP_REPORTE_EXCEL8A',   fileName: 'reporte-interconsultas-uci.xlsx' },
  exportaxls_int_b: { procedure: 'SP_REPORTE_EXCEL8B',   fileName: 'reporte-interconsultas-hospitalizacion.xlsx' },
  exportaxls_int_c: { procedure: 'SP_REPORTE_EXCEL8C',   fileName: 'reporte-interconsultas-otros.xlsx' },
  exportaxls_4:     { procedure: 'SP_REPORTE_EXCEL4',    fileName: 'reporte-diario-pacientes-hospitalizados.xlsx' },
  exportaxls_5:     { procedure: 'SP_REPORTE_EXCEL5',    fileName: 'reporte-diario-pacientes-alta.xlsx' },
  exportaxls_6:     { procedure: 'SP_REPORTE_EXCEL6',    fileName: 'reporte-diario-pacientes-fallecidos.xlsx' },
  exportaxls_7:     { procedure: 'SP_REPORTE_EXCEL7',    fileName: 'reporte-diario-camas.xlsx' },
  exportaxls_8:     { procedure: 'SP_REPORTE_EXCEL1_FAM', fileName: 'reporte-familia-programado.xlsx' },
  exportaxls_13:    { procedure: 'SP_REPORTE_EXCEL13',   fileName: 'reporte-pacientes-con-vacunas.xlsx' },
}

const CURRENT_EXPORTS_SIGH = {
  ...CURRENT_EXPORTS,
  exportaxls_10: { procedure: 'SP_REPORTE_EXCEL10_2026', fileName: 'reporte-pacientes-hospitalizados-corte.xlsx' },
}

// ---------------------------------------------------------------------------
// Tabulated templates — explicit column selection, labels, colors, and widths
// for range exports whose visual layout differs from a raw SP dump.
// ---------------------------------------------------------------------------

const MORBILIDAD_MATERNA_TEMPLATE = {
  sheetName: 'Morbilidad Materna',
  freezeRows: 1,
  columns: [
    { key: 'ANIO',            label: 'Año',                              width: 6,  headerColor: '79C9FD' },
    { key: 'MES',             label: 'Mes',                              width: 6,  headerColor: '79C9FD' },
    { key: 'FH_ING',          label: 'Fecha y Hora de Ingreso',          width: 22, headerColor: '79C9FD', format: 'datetime-legacy' },
    { key: 'CUENTA',          label: 'Nro Cuenta',                       width: 12, headerColor: '79C9FD' },
    { key: 'SERV_INGRESO',    label: 'Servicio Ingreso',                 width: 28, headerColor: '79C9FD' },
    { key: 'NOMBRE_PACIENTE', label: 'Nombre del Paciente',              width: 36, headerColor: '79C9FD' },
    { key: 'EDAD',            label: 'Edad',                             width: 7,  headerColor: '79C9FD' },
    { key: 'TIP_EDAD',        label: 'Tipo Edad',                        width: 10, headerColor: '79C9FD' },
    { key: 'DIST_PROC',       label: 'Distrito Procedencia',             width: 22, headerColor: '79C9FD' },
    { key: 'CM_ING',          label: 'Condicion Materno de Ingreso',     width: 20, headerColor: '79C9FD' },
    { key: 'TIP_PARTO',       label: 'Tipo Parto',                       width: 14, headerColor: '79C9FD' },
    { key: 'G',               label: 'Nro de Gestacion',                 width: 8,  headerColor: '79C9FD' },
    { key: 'EG',              label: 'Edad Gestacional',                 width: 8,  headerColor: '79C9FD' },
    { key: 'COVID',           label: 'COVID',                            width: 8,  headerColor: '79C9FD' },
    { key: 'EST_TOTAL',       label: 'Estacia (Minutos)',                width: 10, headerColor: '79C9FD' },
    { key: 'COND_EGRESO',     label: 'Condicion de Egreso',              width: 18, headerColor: '79C9FD' },
    { key: 'D1',  label: 'Shock',                                                                                                                      width: 14, headerColor: '84E8CE' },
    { key: 'D2',  label: 'Paro Cardiaco',                                                                                                              width: 14, headerColor: '84E8CE' },
    { key: 'D3',  label: 'pH < 7.1 (Acidosis severa)',                                                                                                 width: 14, headerColor: '84E8CE' },
    { key: 'D4',  label: 'Lactato > 5 mmol/l o 45 mg/dl (Hipoperfusión severa)',                                                                      width: 14, headerColor: '84E8CE' },
    { key: 'D5',  label: 'Administración continua de agentes vasoactivos',                                                                             width: 14, headerColor: '84E8CE' },
    { key: 'D6',  label: 'Reanimación cardiopulmonar',                                                                                                 width: 14, headerColor: '84E8CE' },
    { key: 'D7',  label: 'Cianosis aguda',                                                                                                             width: 14, headerColor: '84E8CE' },
    { key: 'D8',  label: 'Respiración jadeante',                                                                                                       width: 14, headerColor: '84E8CE' },
    { key: 'D9',  label: 'FR > 40 rpm (Taquipnea severa)',                                                                                             width: 14, headerColor: '84E8CE' },
    { key: 'D10', label: 'FR < 6 rpm (Bradicardia severa)',                                                                                            width: 14, headerColor: '84E8CE' },
    { key: 'D11', label: 'Saturación de oxigeno < 90% durante ? 1 hora o PaO2/FiO2 < 200 mmHg (Hipoxia severa)',                                      width: 14, headerColor: '84E8CE' },
    { key: 'D12', label: 'Intubación y ventilación, no relacionadas con la anestesia',                                                                  width: 14, headerColor: '84E8CE' },
    { key: 'D13', label: 'Oliguría resistente a los líquidos o diuréticos',                                                                            width: 14, headerColor: '84E8CE' },
    { key: 'D14', label: 'Creatinina >= 300 µmol/l o mg/dl (azotemia aguda severa)',                                                                   width: 14, headerColor: '84E8CE' },
    { key: 'D15', label: 'Diálisis en caso de insuficiencia renal aguda',                                                                              width: 14, headerColor: '84E8CE' },
    { key: 'D16', label: 'Alteraciones de la coagulación (No formación de coágulo)',                                                                   width: 14, headerColor: '84E8CE' },
    { key: 'D17', label: 'Plaquetas < 50.000 plaquetas/ml (Trombocitopenia aguda severa)',                                                             width: 14, headerColor: '84E8CE' },
    { key: 'D18', label: 'Transfusión de >= 3 vol (Transfusión masiva de unidades de sangre, globulos rojos, hemoderivados, paquete globular)',        width: 14, headerColor: '84E8CE' },
    { key: 'D19', label: 'Ictericia en presencia de preeclampsia',                                                                                     width: 14, headerColor: '84E8CE' },
    { key: 'D20', label: 'Bilirrubina > 100 µmol/l o 6 mg/dl (Hiperbilirrubinemia aguda severa)',                                                     width: 14, headerColor: '84E8CE' },
    { key: 'D21', label: 'Coma/Pérdida de conocimiento > 12 horas',                                                                                    width: 14, headerColor: '84E8CE' },
    { key: 'D22', label: 'Crisis epilépticas incontroladas/estado epliléptico',                                                                        width: 14, headerColor: '84E8CE' },
    { key: 'D23', label: 'Accidente cerebrovascular',                                                                                                  width: 14, headerColor: '84E8CE' },
    { key: 'D24', label: 'Parálisis generalizada',                                                                                                     width: 14, headerColor: '84E8CE' },
    { key: 'D25', label: 'Histerectomía (Después de infección o hemorragía uterina)',                                                                  width: 14, headerColor: '84E8CE' },
    { key: 'D26', label: 'Ingreso a UCI > 72 horas',                                                                                                   width: 14, headerColor: '84E8CE' },
  ],
}

const RANGE_EXPORTS = {
  exporta_d_xls_1: {
    procedure: 'SP_REPORTE_D_EXCEL1',
    fileName: 'historias-clinicas.xlsx',
    maxDays: 31,
  },
  exporta_d_xls_2: {
    procedure: 'SP_REPORTE_D_EXCEL2',
    fileName: 'atenciones-telemonitoreo.xlsx',
    maxDays: 31,
  },
  exporta_d_xls_3: {
    procedure: 'SP_REPORTE_D_EXCEL3',
    fileName: 'solicitud-teleorientacion.xlsx',
    maxDays: 31,
  },
  exporta_d_xls_4: {
    procedure: 'SP_REPORTE_D_EXCEL4',
    fileName: 'transferencias.xlsx',
    maxDays: 31,
  },
  exporta_d_xls_5: {
    procedure: 'SP_REPORTE_D_EXCEL5',
    fileName: 'pacientes-altas.xlsx',
    maxDays: 31,
  },
  exporta_d_xls_6: {
    procedure: 'SP_REPORTE_D_EXCEL6',
    fileName: 'pacientes-fallecidos.xlsx',
    maxDays: 31,
  },
  exporta_d_xls_6_h: {
    procedure: 'SP_REPORTE_D_EXCEL6_H',
    fileName: 'pacientes-fallecidos-hospitalizados.xlsx',
    maxDays: 31,
  },
  exporta_d_xls_7: {
    procedure: 'SP_REPORTE_D_EXCEL7',
    fileName: 'pacientes-referidos.xlsx',
    maxDays: 33,
  },
  exporta_d_xls_8: {
    procedure: 'SP_REPORTE_D_EXCEL8',
    fileName: 'pacientes-atendidos.xlsx',
    maxDays: 31,
  },
  exporta_d_xls_9: {
    procedure: 'SP_REPORTE_D_EXCEL9',
    fileName: 'interconsulta-uci-adultos.xlsx',
    maxDays: 31,
  },
  exporta_d_xls_10: {
    procedure: 'SP_REPORTE_D_EXCEL10',
    fileName: 'interconsulta-otros.xlsx',
    maxDays: 31,
  },
  exporta_d_xls_11: {
    procedure: 'SP_REPORTE_D_EXCEL11_A_2026',
    fileName: 'bai-morbilidad-materna-extrema.xlsx',
    maxDays: 92,
    connection: 'general',
    template: MORBILIDAD_MATERNA_TEMPLATE,
  },
  exporta_d_xls_12: {
    procedure: 'SP_REPORTE_D_EXCEL12',
    fileName: 'pacientes-hospitalizados.xlsx',
    maxDays: 31,
  },
  exporta_d_xls_13: {
    procedure: 'SP_REPORTE_D_EXCEL13',
    fileName: 'pacientes-nuevos-emergencia.xlsx',
    maxDays: 31,
  },
  exporta_d_xls_14: {
    procedure: 'SP_REPORTE_D_EXCEL14',
    fileName: 'pacientes-nuevos-uca.xlsx',
    maxDays: 31,
  },
  exporta_d_xls_15: {
    procedure: 'SP_REPORTE_D_EXCEL15',
    fileName: 'pacientes-ficha-covid.xlsx',
    maxDays: 31,
  },
  exporta_d_xls_16: {
    procedure: 'SP_REPORTE_D_EXCEL16',
    fileName: 'produccion-admision.xlsx',
    maxDays: 31,
  },
  exporta_d_xls_17: {
    procedure: 'SP_REPORTE_D_EXCEL17',
    fileName: 'pacientes-triaje-temperatura.xlsx',
    maxDays: 31,
  },
  exporta_d_xls_18: {
    procedure: 'SP_REPORTE_D_EXCEL18',
    fileName: 'usuarios-apertura-cuentas.xlsx',
    maxDays: 31,
  },
  exporta_d_xls_19: {
    procedure: 'SP_REPORTE_D_EXCEL19',
    fileName: 'ticket-ventanilla.xlsx',
    maxDays: 31,
  },
  exporta_d_xls_20: {
    procedure: 'SP_REPORTE_D_EXCEL20',
    fileName: 'historias-recetas-sin-firma.xlsx',
    maxDays: 31,
  },
}

// File names corrected to match legacy exactly
const SALUD_MENTAL_EXPORTS = {
  exporta_xls_1:  { procedure: 'SP_REPORTE_SM_EXCEL_1',  fileName: 'P_0070610.xlsx' },
  exporta_xls_2:  { procedure: 'SP_REPORTE_SM_EXCEL_2',  fileName: 'P_0060614.xlsx' },
  exporta_xls_3:  { procedure: 'SP_REPORTE_SM_EXCEL_3',  fileName: 'P_0070611.xlsx' },
  exporta_xls_4:  { procedure: 'SP_REPORTE_SM_EXCEL_4',  fileName: 'P_0070612.xlsx' },
  exporta_xls_5:  { procedure: 'SP_REPORTE_SM_EXCEL_5',  fileName: 'P_5005190.xlsx' },
  exporta_xls_6:  { procedure: 'SP_REPORTE_SM_EXCEL6',   fileName: 'P_5005190B.xlsx' },
  exporta_xls_7:  { procedure: 'SP_REPORTE_SM_EXCEL_7',  fileName: 'P_5005927.xlsx' },
  exporta_xls_8:  { procedure: 'SP_REPORTE_SM_EXCEL_8',  fileName: 'P_0070615.xlsx' },
  exporta_xls_9:  { procedure: 'SP_REPORTE_SM_EXCEL_9',  fileName: 'P_0070616.xlsx' },
  exporta_xls_10: { procedure: 'SP_REPORTE_SM_EXCEL_10', fileName: 'P_5005195.xlsx' },
  exporta_xls_11: { procedure: 'SP_REPORTE_SM_EXCEL_11', fileName: 'P_5005192.xlsx' },
  exporta_xls_12: { procedure: 'SP_REPORTE_SM_EXCEL_12', fileName: 'P_TAMBCONG.xlsx' },
  exporta_xls_13: { procedure: 'SP_REPORTE_SM_EXCEL_13', fileName: 'P_TESPVSEX.xlsx' },
  exporta_xls_14: { procedure: 'SP_REPORTE_SM_EXCEL_14', fileName: 'P_INTALTAB.xlsx' },
}

const LAVADO_EXPORTS = {
  listado_registro: {
    procedure: 'SP_EPI_REPORTE_LAVADO',
    fileName: 'registro-lavado-de-manos.xlsx',
  },
}

// ---------------------------------------------------------------------------
// Shared HTML helpers
// ---------------------------------------------------------------------------

function escapeHtml(value) {
  return String(value ?? '')
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#039;')
}

/** Replicates PHP date("d/m/y H:i a") — e.g. 17/04/26 14:30 pm */
function formatLegacyDateTime(date = new Date()) {
  const dd = String(date.getDate()).padStart(2, '0')
  const mm = String(date.getMonth() + 1).padStart(2, '0')
  const yy = String(date.getFullYear()).slice(2)
  const HH = String(date.getHours()).padStart(2, '0')
  const ii = String(date.getMinutes()).padStart(2, '0')
  const ampm = date.getHours() < 12 ? 'am' : 'pm'
  return `${dd}/${mm}/${yy} ${HH}:${ii} ${ampm}`
}

/**
 * Reads the first existing key from a row object.
 * Tries exact match, then uppercase, then lowercase — handles SP result sets
 * regardless of whether the driver returns upper or lower case column names.
 */
function col(row, ...keys) {
  for (const k of keys) {
    if (Object.prototype.hasOwnProperty.call(row, k)) return row[k]
    const ku = k.toUpperCase()
    if (Object.prototype.hasOwnProperty.call(row, ku)) return row[ku]
    const kl = k.toLowerCase()
    if (Object.prototype.hasOwnProperty.call(row, kl)) return row[kl]
  }
  return ''
}

// ---------------------------------------------------------------------------
// Generic fallback builder — used for non-salud-mental catalogs
// ---------------------------------------------------------------------------

function buildSpreadsheetHtml(title, rows) {
  const safeRows =
    rows.length > 0
      ? rows
      : [{ mensaje: 'No se encontraron registros para los filtros solicitados.' }]

  const headers = Object.keys(safeRows[0] ?? {})
  const thead = headers.map((h) => `<th>${escapeHtml(h)}</th>`).join('')
  const tbody = safeRows
    .map(
      (row) =>
        `<tr>${headers.map((h) => `<td>${escapeHtml(row[h])}</td>`).join('')}</tr>`,
    )
    .join('')

  return `<!DOCTYPE html>
<html>
  <head>
    <meta charset="utf-8" />
    <title>${escapeHtml(title)}</title>
  </head>
  <body>
    <table border="1">
      <thead><tr>${thead}</tr></thead>
      <tbody>${tbody}</tbody>
    </table>
  </body>
</html>`
}

// ---------------------------------------------------------------------------
// Mental-health template configuration
// ---------------------------------------------------------------------------
//
// Each entry describes one exportable completely:
//   tipoReporte  — label shown in the metadata block
//   metaColspan  — colspan of the value cell in the metadata table (usually 12)
//   groups       — ordered list of column groups:
//       title    — group header text (exact legacy wording)
//       color    — bgColor for the group header AND its numbered sub-cells
//       keys     — ordered SP column keys (lowercase as in PHP source)
//
// The generic builder below renders everything from this config.
// To add a new special report: add one entry here — no other change needed.
// ---------------------------------------------------------------------------

const MENTAL_HEALTH_TEMPLATE_CONFIG = {
  exporta_xls_1: {
    tipoReporte: '0070610 TRATAMIENTO AMBULATORIO DE PERSONAS CON CONDUCTA SUICIDA',
    metaColspan: 12,
    groups: [
      { title: 'CONSULTA PSIQUIATRICA',  color: '#FA7985', keys: ['p1','p2','p3'] },
      { title: 'PSICO-EDUCACION',         color: '#70D3FE', keys: ['s1','s2','s3','s4','s5','s6'] },
      { title: 'PSICOTERAPIA INDIVIDUAL', color: '#FEF170', keys: ['x1','x2','x3','x4','x5','x6'] },
      { title: 'PSICOTERAPIA FAMILIAR',   color: '#A8FE91', keys: ['y1'] },
      { title: 'GRUPO DE AYUDA MUTUA',    color: '#96FCF3', keys: ['z1','z2','z3','z4','z5','z6'] },
    ],
  },

  exporta_xls_2: {
    tipoReporte: '0060614 - TRATAMIENTO DE NI\u00D1OS, NI\u00D1AS Y ADOLESCENTES AFECTADOS POR MALTRATO INFANTIL',
    metaColspan: 12,
    groups: [
      { title: 'CONSULTA PSIQUIATRICA',          color: '#FA7985', keys: ['p1','p2','p3'] },
      { title: 'PSICO-EDUCACION',                color: '#70D3FE', keys: ['s1','s2'] },
      { title: 'PSICOTERAPIA INDIVIDUAL',        color: '#FEF170', keys: ['x1','x2','x3','x4'] },
      { title: 'PSCIOTERAPIA FAMILIAR',          color: '#A8FE91', keys: ['y1','y2'] },
      { title: 'MOVILIZACION DE REDES DE APOYO', color: '#96FCF3', keys: ['z1'] },
    ],
  },

  exporta_xls_3: {
    tipoReporte: '0070611 TRATAMIENTO AMBULATORIO DE PERSONAS CON ANSIEDAD',
    metaColspan: 12,
    groups: [
      { title: 'CONSULTA PSIQUIATRICA',  color: '#FA7985', keys: ['p1','p2','p3','p4'] },
      { title: 'PSICO-EDUCACION',         color: '#70D3FE', keys: ['s1','s2'] },
      { title: 'PSICOTERAPIA INDIVIDUAL', color: '#FEF170', keys: ['x1','x2','x3','x4','x5','x6','x7','x8'] },
      { title: 'PSICOTERAPIA GRUPAL',     color: '#96FCF3', keys: ['y1','y2','y3','y4','y5','y6'] },
      { title: 'GRUPO DE AYUDA MUTUA',    color: '#A8FE91', keys: ['z1','z2'] },
    ],
  },

  exporta_xls_4: {
    tipoReporte: '0070612 - TRATAMIENTO ESPECIALIZADO EN VIOLENCIA FAMILIAR',
    metaColspan: 12,
    groups: [
      { title: 'CONSULTA PSIQUIATRICA',          color: '#FA7985', keys: ['p1','p2','p3'] },
      { title: 'PSICO-EDUCACION',                color: '#70D3FE', keys: ['s1','s2','s3'] },
      { title: 'PSICOTERAPIA INDIVIDUAL',        color: '#FEF170', keys: ['x1','x2','x3','x4','x5','x6'] },
      { title: 'PSCIOTERAPIA FAMILIAR',          color: '#A8FE91', keys: ['y1','y2'] },
      { title: 'MOVILIZACION DE REDES DE APOYO', color: '#96FCF3', keys: ['z1'] },
    ],
  },

  exporta_xls_5: {
    tipoReporte: '5005190 TRATAMIENTO AMBULATORIO DE PERSONAS CON DEPRESI\u00D3N MODERADA',
    metaColspan: 12,
    groups: [
      { title: 'CONSULTA PSIQUIATRICA',  color: '#FA7985', keys: ['p1','p2','p3'] },
      { title: 'PSICO-EDUCACION',         color: '#70D3FE', keys: ['s1','s2','s3','s4'] },
      { title: 'PSICOTERAPIA INDIVIDUAL', color: '#FEF170', keys: ['x1','x2','x3','x4','x5','x6'] },
      { title: 'GRUPO DE AYUDA MUTUA',    color: '#A8FE91', keys: ['y1','y2','y3','y4'] },
    ],
  },

  exporta_xls_6: {
    tipoReporte: '5005190B TRATAMIENTO AMBULATORIO DE PERSONAS CON DEPRESI\u00D3N SEVERA',
    metaColspan: 12,
    groups: [
      { title: 'ATENCION PSIQUIATRIA',         color: '#FA7985', keys: ['p1','p2','p3','p4','p5','p6','p7','p8','p9','p10','p11','p12'] },
      { title: 'PSICOTERAPIA - PSICOLOGIA',    color: '#70D3FE', keys: ['s1','s2','s3','s4','s5','s6','s7','s8','s9','s10','s11','s12'] },
      { title: 'INTERVENCION SOCIAL FAMILIAR', color: '#FEF170', keys: ['x1','x2','x3','x4','x5','x6'] },
    ],
  },

  // Note: legacy uses colspan="11" (not 12) for the meta value cells
  exporta_xls_7: {
    tipoReporte: '5005927 TRATAMIENTO AMBULATORIO DE NI\u00D1OS Y NI\u00D1AS Y ADOLESCENTES DE 0 A 17 A\u00D1OS POR TRASTORNOS MENTALES Y DEL COMPORTAMIENTO',
    metaColspan: 11,
    groups: [
      { title: 'CONSULTA PSIQUIATRICA',          color: '#FA7985', keys: ['p1','p2','p3'] },
      { title: 'PSICOTERAPIA INDIVIDUAL',        color: '#70D3FE', keys: ['s1','s2','s3','s4','s5'] },
      { title: 'PSICOTERAPIA GRUPAL',            color: '#FEF170', keys: ['x1','x2'] },
      { title: 'MOVILIZACION DE REDES DE APOYO', color: '#96FCF3', keys: ['y1'] },
    ],
  },

  exporta_xls_8: {
    tipoReporte: '0070615 TRATAMIENTO ESPECIALIZADO NI\u00D1OS, NI\u00D1AS Y ADOLESCENTES AFECTADOS POR VIOLENCIA SEXUAL',
    metaColspan: 12,
    groups: [
      { title: 'CONSULTA PSIQUIATRICA',          color: '#FA7985', keys: ['p1','p2','p3'] },
      { title: 'PSICO-EDUCACION',                color: '#70D3FE', keys: ['s1','s2'] },
      { title: 'PSICOTERAPIA INDIVIDUAL',        color: '#FEF170', keys: ['x1','x2','x3','x4'] },
      { title: 'PSCIOTERAPIA FAMILIAR',          color: '#A8FE91', keys: ['y1','y2'] },
      { title: 'MOVILIZACION DE REDES DE APOYO', color: '#96FCF3', keys: ['z1'] },
    ],
  },

  exporta_xls_9: {
    tipoReporte: '0070616 - TRATAMIENTO AMBULATORIO DE NI\u00D1OS Y NI\u00D1AS DE 0 A 17 A\u00D1OS CON TRASTORNOS DEL ESPECTRO AUTISTA',
    metaColspan: 12,
    groups: [
      { title: 'CONSULTA PSIQUIATRICA',          color: '#FA7985', keys: ['p1','p2','p3'] },
      { title: 'PSICOTERAPIA INDIVIDUAL',        color: '#70D3FE', keys: ['s1','s2','s3','s4','s5','s6'] },
      { title: 'PSICOTERAPIA GRUPAL',            color: '#FEF170', keys: ['x1','x2','x3','x4'] },
      { title: 'MOVILIZACION DE REDES DE APOYO', color: '#96FCF3', keys: ['y1'] },
    ],
  },

  exporta_xls_10: {
    tipoReporte: '5005195 TRATAMIENTO AMBULATORIO A PERSONAS CON S\u00EDNDROME PSIC\u00D3TICO O TRASTORNO DEL ESPECTRO DE LA ESQUIZOFRENIA',
    metaColspan: 12,
    groups: [
      { title: 'CONSULTA PSIQUIATRICA',          color: '#FA7985', keys: ['p1','p2','p3','p4'] },
      { title: 'PSICO-EDUCACION',                color: '#70D3FE', keys: ['s1','s2'] },
      { title: 'PSICOTERAPIA INDIVIDUAL',        color: '#FEF170', keys: ['x1','x2','x3','x4','x5'] },
      { title: 'PSCIOTERAPIA FAMILIAR',          color: '#A8FE91', keys: ['y1'] },
      { title: 'INTERVENCION SOCIAL',            color: '#96FCF3', keys: ['z1'] },
      { title: 'INTERVENCION SOCIO COMUNITARIO', color: '#FC96D7', keys: ['a1','a2'] },
    ],
  },

  exporta_xls_11: {
    tipoReporte: '5005192 INTERVENCIONES BREVES MOTIVACIONALES PARA PERSONAS CON CONSUMO PERJUDICIAL DEL ALCOHOL Y TABACO.',
    metaColspan: 12,
    groups: [
      { title: 'CONSULTA PSIQUIATRIA', color: '#FA7985', keys: ['p1'] },
      { title: 'INTERVENCION BREVE',   color: '#70D3FE', keys: ['s1','s2','s3','s4'] },
    ],
  },

  exporta_xls_12: {
    tipoReporte: 'TRATAMIENTO AMBULATORIO PARA PERSONAS CON DETERIORO COGNITIVO',
    metaColspan: 12,
    groups: [
      { title: 'CONSULTA PSIQUIATRICA',  color: '#FA7985', keys: ['p1','p2','p3','p4'] },
      { title: 'PSICO-EDUCACION',         color: '#70D3FE', keys: ['s1'] },
      { title: 'PSICOTERAPIA INDIVIDUAL', color: '#FEF170', keys: ['x1','x2','x3','x4','x5','x6'] },
    ],
  },

  exporta_xls_13: {
    tipoReporte: '0060613 - TRATAMIENTO ESPECIALIZADO DE PERSONAS POR VIOLENCIA SEXUAL',
    metaColspan: 12,
    groups: [
      { title: 'CONSULTA PSIQUIATRICA',          color: '#FA7985', keys: ['p1','p2','p3'] },
      { title: 'PSICO-EDUCACION',                color: '#70D3FE', keys: ['s1','s2','s3'] },
      { title: 'PSICOTERAPIA INDIVIDUAL',        color: '#FEF170', keys: ['x1','x2','x3','x4','x5','x6'] },
      { title: 'PSCIOTERAPIA FAMILIAR',          color: '#A8FE91', keys: ['y1','y2'] },
      { title: 'MOVILIZACION DE REDES DE APOYO', color: '#96FCF3', keys: ['z1'] },
    ],
  },

  exporta_xls_14: {
    tipoReporte: 'INTERVENCI\u00D3N PARA PERSONA CON DEPENDENCIA DE ALCOHOL Y TABACO',
    metaColspan: 12,
    groups: [
      { title: 'CONSULTA PSIQUIATRICA',   color: '#FA7985', keys: ['p1','p2','p3','p4'] },
      { title: 'PSICOTERAPIA INDIVIDUAL', color: '#70D3FE', keys: ['s1','s2','s3','s4'] },
      { title: 'ENTREVISTA MOTIVACIONAL', color: '#FEF170', keys: ['x1','x2'] },
      { title: 'PSCIOTERAPIA GRUPAL',     color: '#A8FE91', keys: ['y1','y2'] },
      { title: 'PSCIOTERAPIA FAMILIAR',   color: '#96FCF3', keys: ['z1','z2'] },
    ],
  },
}

function getMentalHealthConfig(key) {
  return MENTAL_HEALTH_TEMPLATE_CONFIG[key] ?? null
}

// ---------------------------------------------------------------------------
// Mental-health generic HTML/XLS builder
// ---------------------------------------------------------------------------
//
// Builds a two-table legacy-style spreadsheet from a declarative config:
//   Table 1 — metadata block: Desde / Hasta / Fecha y Hora / Tipo de reporte
//   Table 2 — two-level grouped header + sorted data rows
//
// H.C. is always rendered as text (mso-number-format:'@') to preserve leading
// zeros that would otherwise be stripped by Excel's auto-numeric detection.
// ---------------------------------------------------------------------------

function buildMentalHealthSpreadsheetHtml({ config, rows, startDate, endDate, title }) {
  const now = new Date()

  // Sort by PACIENTE ascending — matches legacy visual output
  const sorted = [...rows].sort((a, b) => {
    const pa = String(col(a, 'paciente')).toUpperCase()
    const pb = String(col(b, 'paciente')).toUpperCase()
    return pa < pb ? -1 : pa > pb ? 1 : 0
  })

  // --- Table 1: metadata ---
  const mc = config.metaColspan
  const metaTable = `<table border="1">
  <tr>
    <td bgColor=#E7F5FE colspan="2">Desde</td>
    <td colspan="${mc}" align="left"><b>${escapeHtml(startDate)}</b></td>
  </tr>
  <tr>
    <td bgColor=#E7F5FE colspan="2">Hasta</td>
    <td colspan="${mc}" align="left"><b>${escapeHtml(endDate)}</b></td>
  </tr>
  <tr>
    <td bgColor=#E7F5FE colspan="2">Fecha y Hora de Reporte</td>
    <td colspan="${mc}" align="left"><b>${escapeHtml(formatLegacyDateTime(now))}</b></td>
  </tr>
  <tr>
    <td bgColor=#E7F5FE colspan="2">Tipo de reporte</td>
    <td colspan="${mc}"><b>${escapeHtml(config.tipoReporte)}</b></td>
  </tr>
</table>`

  // --- Table 2 header row 1: group titles with colspan ---
  const groupCells = config.groups
    .map((g) =>
      g.keys.length === 1
        ? `<td bgColor=${g.color}>${escapeHtml(g.title)}</td>`
        : `<td colspan="${g.keys.length}" bgColor=${g.color}>${escapeHtml(g.title)}</td>`,
    )
    .join('\n    ')

  const headerRow1 = `<tr>
    <td rowspan="2" bgColor=#FA7985>H.C.</td>
    <td rowspan="2" bgColor=#FA7985>PACIENTE</td>
    ${groupCells}
  </tr>`

  // --- Table 2 header row 2: numbered sub-columns ---
  const subCells = config.groups
    .flatMap((g) => g.keys.map((_, i) => `<td bgColor=${g.color}>${i + 1}</td>`))
    .join('\n    ')

  const headerRow2 = `<tr>
    ${subCells}
  </tr>`

  // --- Data rows ---
  const totalCols = config.groups.reduce((s, g) => s + g.keys.length, 0) + 2
  const dataRows =
    sorted.length > 0
      ? sorted
          .map((row) => {
            const hc = String(col(row, 'hc'))
            const paciente = escapeHtml(col(row, 'paciente'))
            const dataCells = config.groups
              .flatMap((g) => g.keys.map((k) => `<td>${escapeHtml(col(row, k))}</td>`))
              .join('\n    ')
            return `<tr>
    <td style="mso-number-format:'@';">${escapeHtml(hc)}</td>
    <td>${paciente}</td>
    ${dataCells}
  </tr>`
          })
          .join('\n')
      : `<tr><td colspan="${totalCols}">No se encontraron registros para los filtros solicitados.</td></tr>`

  const dataTable = `<table border="1">
  ${headerRow1}
  ${headerRow2}
  ${dataRows}
</table>`

  return `<!DOCTYPE html>
<html>
  <head>
    <meta charset="utf-8" />
    <title>${escapeHtml(title)}</title>
  </head>
  <body>
${metaTable}
${dataTable}
  </body>
</html>`
}

// ---------------------------------------------------------------------------
// Auth helper
// ---------------------------------------------------------------------------

export async function validateLegacyUser({ dni, password, ip, scope = 'general' }) {
  const procedure = scope === 'lavado' ? 'SP_USUARIO_VALIDA_LM' : 'SP_USUARIO_VALIDA'
  const rows = await executeProcedure(procedure, [
    { name: 'dni', type: sql.NVarChar, value: dni },
    { name: 'password', type: sql.NVarChar, value: password },
    { name: 'ip', type: sql.NVarChar, value: ip },
  ])

  const row = rows[0]
  if (!row) {
    return {
      ok: false,
      employeeId: null,
      employeeName: '',
      message: 'El usuario no tiene autorizacion para este reporte.',
    }
  }

  return {
    ok: true,
    employeeId: row.IDEMPLEADO ?? row.idempleado ?? null,
    employeeName: row.EMPLEADO ?? row.empleado ?? '',
    message: 'Usuario aceptado.',
  }
}

// ---------------------------------------------------------------------------
// Internal helpers
// ---------------------------------------------------------------------------

function getExportDefinition(key, catalog) {
  const catalogs = {
    current: CURRENT_EXPORTS,
    'current-sigh': CURRENT_EXPORTS_SIGH,
    range: RANGE_EXPORTS,
    'salud-mental': SALUD_MENTAL_EXPORTS,
    lavado: LAVADO_EXPORTS,
  }

  const selected = catalogs[catalog]
  if (!selected) return null
  return selected[key] ?? null
}

function daysBetween(startDate, endDate) {
  const start = new Date(startDate)
  const end = new Date(endDate)
  return Math.floor(Math.abs(end.getTime() - start.getTime()) / 86400000) + 1
}

// ---------------------------------------------------------------------------
// Main export executor
// ---------------------------------------------------------------------------

export async function executeConfiguredExport({
  catalog,
  key,
  employeeId,
  ip,
  startDate,
  endDate,
}) {
  const exportDefinition = getExportDefinition(key, catalog)

  if (!exportDefinition) {
    throw new Error('No se encontro la configuracion del exporte solicitado.')
  }

  if (exportDefinition.maxDays && startDate && endDate) {
    const diff = daysBetween(startDate, endDate)
    if (diff > exportDefinition.maxDays) {
      throw new Error(`El rango de fechas no debe exceder ${exportDefinition.maxDays} dias.`)
    }
  }

  const params =
    catalog === 'range'
      ? [
          { name: 'fini', type: sql.NVarChar, value: startDate },
          { name: 'ffin', type: sql.NVarChar, value: endDate },
          { name: 'idemp', type: sql.Int, value: Number(employeeId) || 0 },
          { name: 'ip', type: sql.NVarChar, value: ip },
        ]
      : catalog === 'salud-mental'
        ? [
            { name: 'fini', type: sql.NVarChar, value: startDate },
            { name: 'ffin', type: sql.NVarChar, value: endDate },
            { name: 'idemp', type: sql.Int, value: Number(employeeId) || 0 },
            { name: 'ip', type: sql.NVarChar, value: ip },
          ]
        : catalog === 'lavado'
          ? [
              { name: 'fini', type: sql.NVarChar, value: startDate },
              { name: 'ffin', type: sql.NVarChar, value: endDate },
            ]
          : [
              { name: 'idemp', type: sql.Int, value: Number(employeeId) || 0 },
              { name: 'ip', type: sql.NVarChar, value: ip },
            ]

  const rows = await executeProcedure(exportDefinition.procedure, params, {
    timeoutMs: 120000,
    connection: exportDefinition.connection ?? resolveCatalogConnection(catalog),
  })

  // Build real XLSX — pick builder by priority:
  //   1. salud-mental   → structured two-level header workbook
  //   2. template       → tabulated workbook with explicit column mapping
  //   3. default        → simple flat-dump workbook
  const mhConfig = catalog === 'salud-mental' ? getMentalHealthConfig(key) : null

  const content = await (mhConfig
    ? buildStructuredWorkbook({
        config: mhConfig,
        rows,
        startDate,
        endDate,
        title: exportDefinition.fileName,
      })
    : exportDefinition.template
      ? buildTabulatedWorkbook({
          template: exportDefinition.template,
          rows,
        })
      : buildSimpleWorkbook({
          title: exportDefinition.fileName,
          rows,
        }))

  return {
    fileName: exportDefinition.fileName,
    mimeType: MIME_XLSX,
    content,
    rowCount: rows.length,
  }
}

export function listCatalogExports(catalog) {
  const catalogs = {
    current: CURRENT_EXPORTS,
    'current-sigh': CURRENT_EXPORTS_SIGH,
    range: RANGE_EXPORTS,
    'salud-mental': SALUD_MENTAL_EXPORTS,
    lavado: LAVADO_EXPORTS,
  }

  const selected = catalogs[catalog]
  if (!selected) return []

  return Object.entries(selected).map(([key, definition]) => ({
    key,
    fileName: definition.fileName,
    maxDays: definition.maxDays ?? null,
  }))
}
