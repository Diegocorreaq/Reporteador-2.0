import { executeProcedure, executeQuery, sql } from './legacy-sql.service.js'
import {
  buildSimpleWorkbook,
  buildStructuredWorkbook,
  buildTabulatedWorkbook,
  buildCamasResumenWorkbook,
  MIME_XLSX,
} from './excel-export.service.js'

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

const HOSPITALIZADOS_CORTE_TEMPLATE = {
  sheetName: 'diario_hosp_libre',
  freezeRows: 1,
  headerRows: 1,
  headerRowHeight: 24,
  dataRowHeight: 18,
  headerBorderStyle: 'medium',
  dataBorderStyle: 'thin',
  columns: [
    { key: 'AREA',                 label: 'AREA',                      width: 10, headerColor: '75ABFD', align: 'left' },
    { key: 'UPSS',                 label: 'UPSS',                      width: 24, headerColor: '75ABFD', align: 'left' },
    { key: 'SERVICIO',             label: 'SERVICIO',                  width: 28, headerColor: '75ABFD', align: 'left' },
    { key: 'NROHISTORIA',          label: 'NRO HISTORIA',              width: 14, headerColor: '75ABFD', asText: true, align: 'left' },
    { key: 'IDCUENTAATENCION',     label: 'NRO CUENTA',                width: 14, headerColor: '75ABFD', align: 'center' },
    { key: 'PACIENTE',             label: 'APELLIDOS Y NOMBRES',       width: 40, headerColor: '75ABFD', align: 'left' },
    { key: 'EDAD',                 label: 'EDAD',                      width: 8,  headerColor: '75ABFD', align: 'center' },
    { key: 'TIPOEDAD',             label: 'TIPO EDAD',                 width: 10, headerColor: '75ABFD', align: 'center' },
    { key: 'FECNAC',               label: 'FEC. NACIMIENTO',           width: 14, headerColor: '75ABFD', format: 'excel-date', align: 'center' },
    { key: 'FTEFTO',               label: 'FTE. FTO',                  width: 10, headerColor: '75ABFD', align: 'center' },
    { key: 'DIAHOSP',              label: 'DIAS HOSP',                 width: 10, headerColor: 'F7F798', align: 'center' },
    { key: 'DIASERV',              label: 'DIAS SERV',                 width: 10, headerColor: 'F7F798', align: 'center' },
    { key: 'FECINGHOSP',           label: 'FECHA DE ING. A HOSP.',     width: 18, headerColor: '75ABFD', format: 'excel-date', align: 'center' },
    { key: 'FECINGSER',            label: 'FECHA DE ING. A SERV.',     width: 18, headerColor: '75ABFD', format: 'excel-date', align: 'center' },
    { key: 'DESDX',                label: 'DIAGNOSTICO INGRESO',       width: 38, headerColor: '75ABFD', align: 'left' },
    { key: 'DXEVO1',               label: 'DIAGNOSTICO EVOLUCION 1',   width: 38, headerColor: '75ABFD', align: 'left' },
    { key: 'DXEVO2',               label: 'DIAGNOSTICO EVOLUCION 2',   width: 38, headerColor: '75ABFD', align: 'left' },
    { key: 'DXEVO3',               label: 'DIAGNOSTICO EVOLUCION 3',   width: 38, headerColor: '75ABFD', align: 'left' },
    { key: 'FECULTEVO',            label: 'FECHA ULTIMA EVOLUCION',    width: 20, headerColor: '75ABFD', format: 'excel-datetime', align: 'center' },
    { key: 'GRADODEPENDENCIA',     label: 'GRADO DEPENDENCIA',         width: 20, headerColor: '75ABFD', align: 'center' },
    { key: 'FECHA_REG_ENFERMERIA', label: 'FECHA REG ENFERM',          width: 20, headerColor: '75ABFD', format: 'excel-datetime', align: 'center' },
    { key: 'FECHACORTE',           label: 'FECHA DE CORTE',            width: 18, headerColor: '75ABFD', asText: true, align: 'center', dataColor: 'BAEAFF' },
  ],
}

const DIARIO_HOSP_TEMPLATE = {
  sheetName: 'diario_hosp',
  freezeRows: 1,
  headerRows: 1,
  headerRowHeight: 24,
  dataRowHeight: 18,
  headerBorderStyle: 'medium',
  dataBorderStyle: 'thin',
  columns: [
    { key: 'ORD',                        label: 'ORD',                          width: 8,  headerColor: '75ABFD', align: 'center' },
    { key: 'UPSS',                       label: 'UPSS',                         width: 24, headerColor: '75ABFD', align: 'left' },
    { key: 'SERVICIO',                   label: 'SERVICIO',                     width: 28, headerColor: '75ABFD', align: 'left' },
    { key: 'NRO_DE_CAMA',                label: 'NRO DE CAMA',                  width: 12, headerColor: '75ABFD', align: 'center' },
    { key: 'NRO_CUENTA',                 label: 'NRO CUENTA',                   width: 14, headerColor: '75ABFD', align: 'center' },
    { key: 'APELLIDOS_Y_NOMBRES',        label: 'APELLIDOS Y NOMBRES',          width: 38, headerColor: '75ABFD', align: 'left' },
    { key: 'FECHA_NACIMIENTO',           label: 'FECHA NACIMIENTO',             width: 14, headerColor: '75ABFD', format: 'excel-date', align: 'center' },
    { key: 'NRO_DOCUMENTO',              label: 'NRO DOCUMENTO',                width: 14, headerColor: '75ABFD', asText: true, align: 'left' },
    { key: 'NRO_HISTORIA',               label: 'NRO HISTORIA',                 width: 14, headerColor: '75ABFD', asText: true, align: 'left' },
    { key: 'TELEFONOS_REFERENCIA',       label: 'TELEFONOS REFERENCIA',         width: 20, headerColor: '75ABFD', asText: true, align: 'left' },
    { key: 'EDAD',                       label: 'EDAD',                         width: 8,  headerColor: '75ABFD', align: 'center' },
    { key: 'TIPO_EDAD',                  label: 'TIPO EDAD',                    width: 10, headerColor: '75ABFD', align: 'center' },
    { key: 'SEXO',                       label: 'SEXO',                         width: 8,  headerColor: '75ABFD', align: 'center' },
    { key: 'IAFAS_SEGURO',               label: 'IAFAS/SEGURO',                 width: 14, headerColor: '75ABFD', align: 'center' },
    { key: 'TIPO_PRUEBA',                label: 'TIPO PRUEBA',                  width: 14, headerColor: '75ABFD', align: 'center' },
    { key: 'RESULTADO',                  label: 'RESULTADO',                    width: 14, headerColor: '75ABFD', align: 'center' },
    { key: 'FECHA_DE_ING_1RA_VEZ',       label: 'FECHA DE ING. 1RA VEZ',        width: 18, headerColor: '75ABFD', format: 'excel-date', align: 'center' },
    { key: 'DIAS_HOSP',                  label: 'DIAS HOSP',                    width: 10, headerColor: '75ABFD', align: 'center' },
    { key: 'SERVICIO_ANTERIOR',          label: 'SERVICIO ANTERIOR',            width: 24, headerColor: '75ABFD', align: 'left' },
    { key: 'FECHA_DE_INGREGO_A_HOSPIT',  label: 'FECHA DE INGREGO A HOSPIT',    width: 20, headerColor: '75ABFD', format: 'excel-date', align: 'center' },
    { key: 'DIAS_ULT_SERVICIO',          label: 'DIAS ULT SERVICIO',            width: 14, headerColor: '75ABFD', align: 'center' },
    { key: 'CIEX_DX',                    label: 'CIEX DX',                      width: 12, headerColor: '75ABFD', align: 'center' },
    { key: 'TIPO_DX',                    label: 'TIPO DX',                      width: 12, headerColor: '75ABFD', align: 'center' },
    { key: 'NOMBRE_DX',                  label: 'NOMBRE DX',                    width: 34, headerColor: '75ABFD', align: 'left' },
    { key: 'CO_MORBILIDAD',              label: 'CO MORBILIDAD',                width: 28, headerColor: '75ABFD', align: 'left' },
    { key: 'CONDICION',                  label: 'CONDICION',                    width: 12, headerColor: '75ABFD', align: 'center' },
    { key: 'OXIGENO_TERAPIA_INICIAL',    label: 'OXIGENO TERAPIA INICIAL',      width: 20, headerColor: '75ABFD', align: 'center' },
    { key: 'OXIGENO_TERAPIA_FINAL',      label: 'OXIGENO TERAPIA FINAL',        width: 20, headerColor: '75ABFD', align: 'center' },
    { key: 'TRATAMIENTO',                label: 'TRATAMIENTO',                  width: 20, headerColor: '75ABFD', align: 'left' },
    { key: 'EVOLUCION',                  label: 'EVOLUCION',                    width: 18, headerColor: '75ABFD', align: 'center' },
    { key: 'DEPARTAMENTO',               label: 'DEPARTAMENTO',                 width: 14, headerColor: '75ABFD', align: 'left' },
    { key: 'PROVINCIA',                  label: 'PROVINCIA',                    width: 14, headerColor: '75ABFD', align: 'left' },
    { key: 'DISTRITO',                   label: 'DISTRITO',                     width: 18, headerColor: '75ABFD', align: 'left' },
    { key: 'DIRECCION_DE_PACIENTE',      label: 'DIRECCION DE PACIENTE',        width: 44, headerColor: '75ABFD', align: 'left' },
    { key: 'SERVICIO_ULTIMA_EVOLUCION',  label: 'SERVICIO ULTIMA EVOLUCION',    width: 24, headerColor: '75ABFD', align: 'left' },
    { key: 'FECHA_ULTIMA_EVOLUCION',     label: 'FECHA ULTIMA EVOLUCION',       width: 20, headerColor: '75ABFD', format: 'excel-datetime', align: 'center' },
    { key: 'SE_INFORMO_FAMILIA',         label: 'SE INFORMO FAMILIA',           width: 16, headerColor: '75ABFD', align: 'center' },
    { key: 'ULTIMA_LLAMADA',             label: 'ULTIMA LLAMADA',               width: 20, headerColor: '75ABFD', format: 'excel-datetime', align: 'center' },
    { key: 'FECHA_REG_ENFERM',           label: 'FECHA REG ENFERM',             width: 20, headerColor: '75ABFD', format: 'excel-datetime', align: 'center' },
    { key: 'GRADO_DEPENDENCIA',          label: 'GRADO DEPENDENCIA',            width: 16, headerColor: '75ABFD', align: 'center' },
    { key: 'CIE_EVOLUCION1',             label: 'CIE EVOLUCION1',               width: 14, headerColor: '75ABFD', align: 'center' },
    { key: 'TIPO_DX1',                   label: 'TIPO DX1',                     width: 12, headerColor: '75ABFD', align: 'center' },
    { key: 'NOMBRE_DX1',                 label: 'NOMBRE DX1',                   width: 34, headerColor: '75ABFD', align: 'left' },
    { key: 'CIE_EVOLUCION2',             label: 'CIE EVOLUCION2',               width: 14, headerColor: '75ABFD', align: 'center' },
    { key: 'TIPO_DX2',                   label: 'TIPO DX2',                     width: 12, headerColor: '75ABFD', align: 'center' },
    { key: 'NOMBRE_DX2',                 label: 'NOMBRE DX2',                   width: 34, headerColor: '75ABFD', align: 'left' },
    { key: 'CIE_EVOLUCION3',             label: 'CIE EVOLUCION3',               width: 14, headerColor: '75ABFD', align: 'center' },
    { key: 'TIPO_DX3',                   label: 'TIPO DX3',                     width: 12, headerColor: '75ABFD', align: 'center' },
    { key: 'NOMBRE_DX3',                 label: 'NOMBRE DX3',                   width: 34, headerColor: '75ABFD', align: 'left' },
    { key: 'FECHA_DE_CORTE',             label: 'FECHA DE CORTE',               width: 20, headerColor: '75ABFD', format: 'excel-datetime', align: 'center', dataColor: 'BAEAFF' },
  ],
}

const DIARIO_ALTAS_TEMPLATE = {
  sheetName: 'Sheet1',
  freezeRows: 0,
  headerRows: 1,
  headerRowHeight: 24,
  dataRowHeight: 18,
  headerBorderStyle: 'medium',
  dataBorderStyle: 'thin',
  emitEmptyTemplate: true,
  columns: [
    { key: 'ORD',                        label: 'ORD',                        width: 8,  headerColor: '74DA5B', align: 'center' },
    { key: 'UPSS',                       label: 'UPSS',                       width: 24, headerColor: '74DA5B', align: 'left' },
    { key: 'SERVICIO',                   label: 'SERVICIO',                   width: 28, headerColor: '74DA5B', align: 'left' },
    { key: 'FECHA_EGRESO',               label: 'FECHA EGRESO',              width: 14, headerColor: '74DA5B', format: 'excel-date', align: 'center' },
    { key: 'HORA_EGRESO',                label: 'HORA EGRESO',               width: 12, headerColor: '74DA5B', align: 'center' },
    { key: 'NRO_CUENTA',                 label: 'NRO CUENTA',                width: 14, headerColor: '74DA5B', align: 'center' },
    { key: 'APELLIDOS_Y_NOMBRES',        label: 'APELLIDOS Y NOMBRES',       width: 38, headerColor: '74DA5B', align: 'left' },
    { key: 'TIPO_DOCUMENTO',             label: 'TIPO DOCUMENTO',            width: 14, headerColor: '74DA5B', align: 'center' },
    { key: 'NRO_DOCUMENTO',              label: 'NRO DOCUMENTO',             width: 14, headerColor: '74DA5B', asText: true, align: 'left' },
    { key: 'NRO_HISTORIA',               label: 'NRO HISTORIA',              width: 14, headerColor: '74DA5B', asText: true, align: 'left' },
    { key: 'TELEFONOS_REFERENCIA',       label: 'TELEFONOS REFERENCIA',      width: 20, headerColor: '74DA5B', align: 'left' },
    { key: 'EDAD',                       label: 'EDAD',                      width: 8,  headerColor: '74DA5B', align: 'center' },
    { key: 'TIPO_EDAD',                  label: 'TIPO EDAD',                 width: 10, headerColor: '74DA5B', align: 'center' },
    { key: 'SEXO',                       label: 'SEXO',                      width: 8,  headerColor: '74DA5B', align: 'center' },
    { key: 'IAFAS_SEGURO',               label: 'IAFAS/SEGURO',              width: 14, headerColor: '74DA5B', align: 'center' },
    { key: 'TIPO_PRUEBA',                label: 'TIPO PRUEBA',               width: 14, headerColor: '74DA5B', align: 'center' },
    { key: 'RESULTADO',                  label: 'RESULTADO',                 width: 14, headerColor: '74DA5B', align: 'center' },
    { key: 'FECHA_DE_ING_1RA_VEZ',       label: 'FECHA DE ING. 1RA VEZ',     width: 18, headerColor: '74DA5B', format: 'excel-date', align: 'center' },
    { key: 'DIAS_HOSP',                  label: 'DIAS HOSP',                 width: 10, headerColor: '74DA5B', align: 'center' },
    { key: 'CIEX_DX',                    label: 'CIEX DX',                   width: 12, headerColor: '74DA5B', align: 'center' },
    { key: 'TIPO_DX',                    label: 'TIPO DX',                   width: 12, headerColor: '74DA5B', align: 'center' },
    { key: 'NOMBRE_DX',                  label: 'NOMBRE DX',                 width: 34, headerColor: '74DA5B', align: 'left' },
    { key: 'CO_MORBILIDAD',              label: 'CO MORBILIDAD',             width: 28, headerColor: '74DA5B', align: 'left' },
    { key: 'CONDICION',                  label: 'CONDICION',                 width: 12, headerColor: '74DA5B', align: 'center' },
    { key: 'OXIGENO_TERAPIA',            label: 'OXIGENO TERAPIA',           width: 18, headerColor: '74DA5B', align: 'center' },
    { key: 'TRATAMIENTO',                label: 'TRATAMIENTO',               width: 20, headerColor: '74DA5B', align: 'left' },
    { key: 'EVOLUCION',                  label: 'EVOLUCION',                 width: 18, headerColor: '74DA5B', align: 'center' },
    { key: 'DEPARTAMENTO',               label: 'DEPARTAMENTO',              width: 14, headerColor: '74DA5B', align: 'left' },
    { key: 'PROVINCIA',                  label: 'PROVINCIA',                 width: 14, headerColor: '74DA5B', align: 'left' },
    { key: 'DISTRITO',                   label: 'DISTRITO',                  width: 18, headerColor: '74DA5B', align: 'left' },
    { key: 'DIRECCION_DE_PACIENTE',      label: 'DIRECCION DE PACIENTE',     width: 44, headerColor: '74DA5B', align: 'left' },
    { key: 'SERVICIO_ULTIMA_EVOLUCION',  label: 'SERVICIO ULTIMA EVOLUCION', width: 24, headerColor: '74DA5B', align: 'left' },
    { key: 'FECHA_ULTIMA_EVOLUCION',     label: 'FECHA ULTIMA EVOLUCION',    width: 20, headerColor: '74DA5B', format: 'excel-datetime', align: 'center' },
    { key: 'SE_INFORMO_FAMILIA',         label: 'SE INFORMO FAMILIA',        width: 16, headerColor: '74DA5B', align: 'center' },
    { key: 'ULTIMA_LLAMADA',             label: 'ULTIMA LLAMADA',            width: 20, headerColor: '74DA5B', format: 'excel-datetime', align: 'center' },
    { key: 'TRATAMIENTO_ALTA',           label: 'TRATAMIENTO ALTA',          width: 22, headerColor: '74DA5B', align: 'left' },
    { key: 'RECOMENDACION',              label: 'RECOMENDACION',             width: 26, headerColor: '74DA5B', align: 'left' },
    { key: 'DESTINO_PACIENTE',           label: 'DESTINO PACIENTE',          width: 22, headerColor: '74DA5B', align: 'left' },
    { key: 'ESTABLECIMIENTO',            label: 'ESTABLECIMIENTO',           width: 22, headerColor: '74DA5B', align: 'left' },
    { key: 'FECHA_DE_TRASLADO',          label: 'FECHA DE TRASLADO',         width: 20, headerColor: '74DA5B', format: 'excel-datetime', align: 'center' },
    { key: 'CONDICION_FINAL',            label: 'CONDICION',                 width: 12, headerColor: '74DA5B', align: 'center' },
    { key: 'FECHA_DE_CORTE',             label: 'FECHA DE CORTE',            width: 20, headerColor: '74DA5B', format: 'excel-datetime', align: 'center', dataColor: 'BAEAFF' },
  ],
}

const DIARIO_FALL_TEMPLATE = {
  sheetName: 'Sheet1',
  freezeRows: 0,
  headerRows: 1,
  headerRowHeight: 24,
  dataRowHeight: 18,
  headerBorderStyle: 'medium',
  dataBorderStyle: 'thin',
  emitEmptyTemplate: true,
  columns: [
    { key: 'ORD',                        label: 'ORD',                        width: 8,  headerColor: 'FA7985', align: 'center' },
    { key: 'UPSS',                       label: 'UPSS',                       width: 24, headerColor: 'FA7985', align: 'left' },
    { key: 'SERVICIO',                   label: 'SERVICIO',                   width: 28, headerColor: 'FA7985', align: 'left' },
    { key: 'FECHA_FALLECIMIENTO',        label: 'FECHA FALLECIMIENTO',        width: 18, headerColor: 'FA7985', format: 'excel-date', align: 'center' },
    { key: 'HORA_FALLECIMIENTO',         label: 'HORA FALLECIMIENTO',         width: 14, headerColor: 'FA7985', align: 'center' },
    { key: 'NRO_CUENTA',                 label: 'NRO CUENTA',                 width: 14, headerColor: 'FA7985', align: 'center' },
    { key: 'APELLIDOS_Y_NOMBRES',        label: 'APELLIDOS Y NOMBRES',        width: 38, headerColor: 'FA7985', align: 'left' },
    { key: 'NRO_DOCUMENTO',              label: 'NRO DOCUMENTO',              width: 14, headerColor: 'FA7985', asText: true, align: 'left' },
    { key: 'NRO_HISTORIA',               label: 'NRO HISTORIA',               width: 14, headerColor: 'FA7985', asText: true, align: 'left' },
    { key: 'TELEFONOS_REFERENCIA',       label: 'TELEFONOS REFERENCIA',       width: 20, headerColor: 'FA7985', align: 'left' },
    { key: 'EDAD',                       label: 'EDAD',                       width: 8,  headerColor: 'FA7985', align: 'center' },
    { key: 'TIPO_EDAD',                  label: 'TIPO EDAD',                  width: 10, headerColor: 'FA7985', align: 'center' },
    { key: 'SEXO',                       label: 'SEXO',                       width: 8,  headerColor: 'FA7985', align: 'center' },
    { key: 'IAFAS_SEGURO',               label: 'IAFAS/SEGURO',               width: 14, headerColor: 'FA7985', align: 'center' },
    { key: 'TIPO_PRUEBA',                label: 'TIPO PRUEBA',                width: 14, headerColor: 'FA7985', align: 'center' },
    { key: 'RESULTADO',                  label: 'RESULTADO',                  width: 14, headerColor: 'FA7985', align: 'center' },
    { key: 'FECHA_DE_ING_1RA_VEZ',       label: 'FECHA DE ING. 1RA VEZ',      width: 18, headerColor: 'FA7985', format: 'excel-date', align: 'center' },
    { key: 'DIAS_HOSP',                  label: 'DIAS HOSP',                  width: 10, headerColor: 'FA7985', align: 'center' },
    { key: 'CIEX_DX',                    label: 'CIEX DX',                    width: 12, headerColor: 'FA7985', align: 'center' },
    { key: 'TIPO_DX',                    label: 'TIPO DX',                    width: 12, headerColor: 'FA7985', align: 'center' },
    { key: 'NOMBRE_DX',                  label: 'NOMBRE DX',                  width: 34, headerColor: 'FA7985', align: 'left' },
    { key: 'CO_MORBILIDAD',              label: 'CO MORBILIDAD',              width: 28, headerColor: 'FA7985', align: 'left' },
    { key: 'CONDICION',                  label: 'CONDICION',                  width: 12, headerColor: 'FA7985', align: 'center' },
    { key: 'OXIGENO_TERAPIA',            label: 'OXIGENO TERAPIA',            width: 18, headerColor: 'FA7985', align: 'center' },
    { key: 'TRATAMIENTO',                label: 'TRATAMIENTO',                width: 20, headerColor: 'FA7985', align: 'left' },
    { key: 'EVOLUCION',                  label: 'EVOLUCION',                  width: 18, headerColor: 'FA7985', align: 'center' },
    { key: 'DEPARTAMENTO',               label: 'DEPARTAMENTO',               width: 14, headerColor: 'FA7985', align: 'left' },
    { key: 'PROVINCIA',                  label: 'PROVINCIA',                  width: 14, headerColor: 'FA7985', align: 'left' },
    { key: 'DISTRITO',                   label: 'DISTRITO',                   width: 18, headerColor: 'FA7985', align: 'left' },
    { key: 'DIRECCION_DE_PACIENTE',      label: 'DIRECCION DE PACIENTE',      width: 44, headerColor: 'FA7985', align: 'left' },
    { key: 'SERVICIO_ULTIMA_EVOLUCION',  label: 'SERVICIO ULTIMA EVOLUCION',  width: 24, headerColor: 'FA7985', align: 'left' },
    { key: 'FECHA_ULTIMA_EVOLUCION',     label: 'FECHA ULTIMA EVOLUCION',     width: 20, headerColor: 'FA7985', format: 'excel-datetime', align: 'center' },
    { key: 'SE_INFORMO_FAMILIA',         label: 'SE INFORMO FAMILIA',         width: 16, headerColor: 'FA7985', align: 'center' },
    { key: 'ULTIMA_LLAMADA',             label: 'ULTIMA LLAMADA',             width: 20, headerColor: 'FA7985', format: 'excel-datetime', align: 'center' },
    { key: 'CONDICION_FINAL',            label: 'CONDICION',                  width: 12, headerColor: 'FA7985', align: 'center' },
    { key: 'FECHA_DE_CORTE',             label: 'FECHA DE CORTE',             width: 20, headerColor: 'FA7985', format: 'excel-datetime', align: 'center' },
  ],
}

function normalizeExportCell(value) {
  if (Array.isArray(value)) {
    const items = value
      .map((item) => normalizeExportCell(item))
      .filter((item) => item !== '')
    const unique = [...new Set(items)]
    return unique.length <= 1 ? (unique[0] ?? '') : unique.join(' / ')
  }

  if (typeof value === 'string') {
    return value.replace(/\s+/g, ' ').trim()
  }

  if (value instanceof Date) {
    return value.toISOString()
  }

  if (value && typeof value === 'object' && 'text' in value) {
    return normalizeExportCell(value.text)
  }

  return value ?? ''
}

function buildRangeMetadata(tipoReporte, { labelColor = 'E7F5FE', valueEndCol = 6 } = {}) {
  return {
    spacerRows: 1,
    metadata: [
      { label: 'Desde', value: '{{startDate}}' },
      { label: 'Hasta', value: '{{endDate}}' },
      { label: 'Fecha y Hora de Reporte', value: '{{reportDateTime}}' },
      { label: 'Tipo de reporte', value: tipoReporte },
    ],
    metadataLayout: {
      labelStartCol: 1,
      labelEndCol: 2,
      valueStartCol: 3,
      valueEndCol,
      labelColor,
    },
  }
}

function createRangeTemplate({ tipoReporte, labelColor, valueEndCol = 6, columns, ...rest }) {
  return {
    ...buildRangeMetadata(tipoReporte, { labelColor, valueEndCol }),
    headerRows: 1,
    headerRowHeight: 24,
    dataRowHeight: 18,
    columns,
    ...rest,
  }
}

const LEGACY_RANGE_ACCOUNT_RECOVERY = Object.freeze({
  exporta_d_xls_2: [3910191],
  exporta_d_xls_8: [3910191],
})

function normalizeHistoryNumber(value) {
  const text = normalizeExportCell(value)
  if (!/^\d+$/.test(text)) return text
  return text.replace(/^0+(?=\d)/, '')
}

function normalizeComparableText(value) {
  return normalizeExportCell(value)
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toUpperCase()
}

function compareNormalizedText(left, right) {
  return normalizeComparableText(left).localeCompare(normalizeComparableText(right), 'es', {
    numeric: true,
    sensitivity: 'base',
  })
}

function compareNormalizedAccount(left, right) {
  const leftText = normalizeExportCell(left)
  const rightText = normalizeExportCell(right)
  const leftNumber = Number(leftText)
  const rightNumber = Number(rightText)

  if (Number.isFinite(leftNumber) && Number.isFinite(rightNumber)) {
    return leftNumber - rightNumber
  }

  return compareNormalizedText(leftText, rightText)
}

function compareNormalizedDate(left, right) {
  const leftDate = new Date(left)
  const rightDate = new Date(right)
  const leftValid = !Number.isNaN(leftDate.getTime())
  const rightValid = !Number.isNaN(rightDate.getTime())

  if (leftValid && rightValid && leftDate.getTime() !== rightDate.getTime()) {
    return leftDate.getTime() - rightDate.getTime()
  }

  return compareNormalizedText(left, right)
}

function compareNormalizedTime(left, right) {
  const leftText = normalizeExportCell(left)
  const rightText = normalizeExportCell(right)
  const leftMatch = leftText.match(/^(\d{1,2}):(\d{2})(?::(\d{2}))?$/)
  const rightMatch = rightText.match(/^(\d{1,2}):(\d{2})(?::(\d{2}))?$/)

  if (leftMatch && rightMatch) {
    const leftSeconds =
      Number(leftMatch[1]) * 3600 +
      Number(leftMatch[2]) * 60 +
      Number(leftMatch[3] ?? 0)
    const rightSeconds =
      Number(rightMatch[1]) * 3600 +
      Number(rightMatch[2]) * 60 +
      Number(rightMatch[3] ?? 0)

    if (leftSeconds !== rightSeconds) {
      return leftSeconds - rightSeconds
    }
  }

  return compareNormalizedText(leftText, rightText)
}

function mergeMappedRowsByKey(baseRows, extraRows, key) {
  const merged = [...baseRows]
  const seen = new Set(baseRows.map((row) => normalizeExportCell(row?.[key])).filter(Boolean))

  for (const row of extraRows) {
    const keyValue = normalizeExportCell(row?.[key])
    if (!keyValue || seen.has(keyValue)) continue
    seen.add(keyValue)
    merged.push(row)
  }

  return merged
}

function sortMappedAtendidosRows(rows) {
  return [...rows].sort((left, right) => {
    return (
      compareNormalizedText(left.ESTADO_CUENTA, right.ESTADO_CUENTA) ||
      compareNormalizedText(left.UPSS_ATENCION, right.UPSS_ATENCION) ||
      compareNormalizedAccount(left.NRO_DE_CUENTA, right.NRO_DE_CUENTA) ||
      compareNormalizedText(left.CONSULTORIO_ATENCION, right.CONSULTORIO_ATENCION)
    )
  })
}

function sortMappedTelemonitoreoRows(rows) {
  return [...rows].sort((left, right) => {
    return (
      compareNormalizedText(left.CONSULTORIO, right.CONSULTORIO) ||
      compareNormalizedText(left.TURNO, right.TURNO) ||
      compareNormalizedDate(left.FECHA_ATENCION, right.FECHA_ATENCION) ||
      compareNormalizedTime(left.HORA_ATENCION, right.HORA_ATENCION) ||
      compareNormalizedText(left.SERVICIO, right.SERVICIO) ||
      compareNormalizedAccount(left.CUENTA, right.CUENTA)
    )
  })
}

function reindexMappedTelemonitoreoRows(rows) {
  const sortedRows = sortMappedTelemonitoreoRows(rows)
  let currentPartition = ''
  let currentOrdinal = 0

  return sortedRows.map((row) => {
    const partition = `${normalizeComparableText(row.CONSULTORIO)}|${normalizeComparableText(row.TURNO)}`
    if (partition !== currentPartition) {
      currentPartition = partition
      currentOrdinal = 0
    }

    currentOrdinal += 1

    return {
      ...row,
      ORD: currentOrdinal,
    }
  })
}

function getPendingRecoveryAccountIds(key, existingKeys = []) {
  const configuredIds = LEGACY_RANGE_ACCOUNT_RECOVERY[key] ?? []
  if (configuredIds.length === 0) return []

  const existing = new Set(existingKeys.map((value) => normalizeExportCell(value)))
  return configuredIds.filter((accountId) => !existing.has(String(accountId)))
}

function extractLegacyDatePart(value) {
  const text = normalizeExportCell(value)
  const match = text.match(/^(\d{4})-(\d{2})-(\d{2})/)
  if (match) {
    return `${match[1]}-${match[2]}-${match[3]}`
  }
  return text
}

function combineLegacyDateAndTime(dateValue, timeValue) {
  const datePart = extractLegacyDatePart(dateValue)
  if (!datePart) return ''

  const timeText = normalizeExportCell(timeValue)
  const match = timeText.match(/^(\d{1,2}):(\d{2})(?::(\d{2}))?$/)

  if (!match) {
    return `${datePart} 00:00:00`
  }

  const hours = String(match[1]).padStart(2, '0')
  const minutes = String(match[2]).padStart(2, '0')
  const seconds = String(match[3] ?? '00').padStart(2, '0')
  return `${datePart} ${hours}:${minutes}:${seconds}`
}

async function loadDiagnosticosByAtencion(connectionName, atencionIds) {
  const idList = (atencionIds ?? [])
    .map((value) => Number(value))
    .filter((value) => Number.isFinite(value))

  if (idList.length === 0) {
    return new Map()
  }

  const rows = await executeQuery(
    `
    SELECT
      AD.IdAtencion,
      DIAG.CodigoCIE10 AS CodigoCie10,
      SC.Descripcion AS TipoDx,
      DIAG.Descripcion AS DescripcionDx
    FROM SIGH..AtencionesDiagnosticos AD WITH (NOLOCK)
    LEFT JOIN SIGH..Diagnosticos DIAG WITH (NOLOCK) ON DIAG.IdDiagnostico = AD.IdDiagnostico
    LEFT JOIN SIGH..SubClasificacionDiagnosticos SC WITH (NOLOCK) ON SC.IdSubclasificacionDx = AD.IdSubclasificacionDx
    WHERE AD.IdAtencion IN (${idList.join(', ')})
      AND AD.IdClasificacionDx IN (1, 2)
      AND DIAG.Descripcion IS NOT NULL
    ORDER BY AD.IdAtencion, AD.IdAtencionDiagnostico
    `,
    [],
    { connection: connectionName, timeoutMs: 120000 },
  )

  const grouped = new Map()

  for (const row of rows) {
    const idAtencion = Number(row.IdAtencion)
    if (!Number.isFinite(idAtencion)) continue

    if (!grouped.has(idAtencion)) {
      grouped.set(idAtencion, [])
    }

    grouped.get(idAtencion).push({
      codigo: normalizeExportCell(row.CodigoCie10),
      tipo: normalizeExportCell(row.TipoDx),
      descripcion: normalizeExportCell(row.DescripcionDx),
    })
  }

  return grouped
}

function normalizeDxEvolutionValues(row, dxRankByAtencion = null) {
  const idAtencion = Number(normalizeExportCell(col(row, 'IdAtencion')))
  const atencionRank = Number.isFinite(idAtencion) ? dxRankByAtencion?.get(idAtencion) : null
  const fallbackValues = [
    normalizeExportCell(col(row, 'DXEVO1')),
    normalizeExportCell(col(row, 'DXEVO2')),
    normalizeExportCell(col(row, 'DXEVO3')),
  ].filter((item) => item !== '')

  const values = []

  if (atencionRank?.orderedDescriptions?.length) {
    const preferred =
      atencionRank.orderedDescriptions.length >= 4
        ? atencionRank.orderedDescriptions.slice(1, 4)
        : atencionRank.orderedDescriptions.slice(0, 3)

    for (const item of preferred) {
      const text = normalizeExportCell(item)
      if (text !== '') {
        values.push(text)
      }
    }

    const seen = new Set(values.map((item) => normalizeComparableText(item)))
    const sortedFallback = [...fallbackValues].sort((left, right) => {
      const rankLeft = atencionRank.byDescription.get(normalizeComparableText(left)) ?? Number.NEGATIVE_INFINITY
      const rankRight = atencionRank.byDescription.get(normalizeComparableText(right)) ?? Number.NEGATIVE_INFINITY
      return rankRight - rankLeft
    })

    for (const item of sortedFallback) {
      if (values.length >= 3) break
      const key = normalizeComparableText(item)
      if (!seen.has(key)) {
        values.push(item)
        seen.add(key)
      }
    }
  } else {
    values.push(...fallbackValues)
  }

  while (values.length < 3) {
    values.push('')
  }

  return values.slice(0, 3)
}

async function buildDxEvolutionRankByAtencion(rows, connectionName) {
  const atenciones = Array.from(
    new Set(
      rows
        .map((row) => Number(normalizeExportCell(col(row, 'IdAtencion'))))
        .filter((value) => Number.isFinite(value)),
    ),
  )

  if (atenciones.length === 0) {
    return new Map()
  }

  const idList = atenciones.join(',')
  const rankingRows = await executeQuery(
    `
      SELECT
        ED1.IdAtencion,
        CONVERT(VARCHAR(500), DIAG.Descripcion) AS Descripcion,
        MAX(ED1.IdAtencionDiagnostico) AS MaxDiagnosticoId
      FROM EvoHeves..evoDiagnostico ED1 WITH (NOLOCK)
      LEFT JOIN SIGH..Diagnosticos DIAG WITH (NOLOCK)
        ON DIAG.IdDiagnostico = ED1.IdDiagnostico
      WHERE ED1.estado = 1
        AND ED1.IdAtencion IN (${idList})
        AND DIAG.Descripcion IS NOT NULL
      GROUP BY ED1.IdAtencion, DIAG.Descripcion
    `,
    [],
    { connection: connectionName, timeoutMs: 120000 },
  )

  const rankByAtencion = new Map()

  for (const row of rankingRows) {
    const idAtencion = Number(row.IdAtencion)
    const descriptionKey = normalizeComparableText(row.Descripcion)
    const maxId = Number(row.MaxDiagnosticoId)

    if (!Number.isFinite(idAtencion) || !descriptionKey || !Number.isFinite(maxId)) {
      continue
    }

    if (!rankByAtencion.has(idAtencion)) {
      rankByAtencion.set(idAtencion, {
        byDescription: new Map(),
        orderedDescriptions: [],
      })
    }

    rankByAtencion.get(idAtencion).byDescription.set(descriptionKey, maxId)
  }

  for (const [idAtencion, ranking] of rankByAtencion.entries()) {
    const ordered = [...ranking.byDescription.entries()]
      .sort((left, right) => {
        const byRank = right[1] - left[1]
        if (byRank !== 0) return byRank
        return left[0].localeCompare(right[0])
      })
      .map(([descriptionKey]) => descriptionKey)

    const descriptionByKey = new Map(
      rankingRows
        .filter((row) => Number(row.IdAtencion) === idAtencion)
        .map((row) => [normalizeComparableText(row.Descripcion), normalizeExportCell(row.Descripcion)]),
    )

    ranking.orderedDescriptions = ordered
      .map((key) => descriptionByKey.get(key) ?? '')
      .filter((description) => description !== '')
  }

  return rankByAtencion
}

function getLimaCutoffDateTime(date = new Date()) {
  const parts = Object.fromEntries(
    new Intl.DateTimeFormat('en-CA', {
      timeZone: 'America/Lima',
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
      hour12: false,
    })
      .formatToParts(date)
      .filter((part) => part.type !== 'literal')
      .map((part) => [part.type, part.value]),
  )

  return `${parts.day}/${parts.month}/${parts.year} ${parts.hour}:${parts.minute}`
}

function mapHospitalizadosCorteRow(row, dxRankByAtencion = null, cutoffDateTime = '') {
  const [dxevo1, dxevo2, dxevo3] = normalizeDxEvolutionValues(row, dxRankByAtencion)

  return {
    AREA: normalizeExportCell(col(row, 'AREA')),
    UPSS: normalizeExportCell(col(row, 'UPSS')),
    SERVICIO: normalizeExportCell(col(row, 'SERVICIO')),
    NROHISTORIA: normalizeHistoryNumber(col(row, 'NROHISTORIA')),
    IDCUENTAATENCION: normalizeExportCell(col(row, 'IDCUENTAATENCION')),
    PACIENTE: normalizeExportCell(col(row, 'PACIENTE')),
    EDAD: normalizeExportCell(col(row, 'EDAD')),
    TIPOEDAD: normalizeExportCell(col(row, 'TIPOEDAD')),
    FECNAC: normalizeExportCell(col(row, 'FECNAC')),
    FTEFTO: normalizeExportCell(col(row, 'FTEFTO')),
    DIAHOSP: normalizeExportCell(col(row, 'DIAHOSP')),
    DIASERV: normalizeExportCell(col(row, 'DIASERV')),
    FECINGHOSP: normalizeExportCell(col(row, 'FECINGHOSP')),
    FECINGSER: normalizeExportCell(col(row, 'FECINGSER')),
    DESDX: normalizeExportCell(col(row, 'DESDX')),
    DXEVO1: dxevo1,
    DXEVO2: dxevo2,
    DXEVO3: dxevo3,
    FECULTEVO: normalizeExportCell(col(row, 'FECULTEVO')),
    GRADODEPENDENCIA: normalizeExportCell(col(row, 'GRADODEPENDENCIA')),
    FECHA_REG_ENFERMERIA: normalizeExportCell(col(row, 'FECHA_REG_ENFERMERIA')),
    FECHACORTE: cutoffDateTime || normalizeExportCell(col(row, 'FECHACORTE')),
  }
}

async function mapHospitalizadosCorteRows(rows, { connectionName }) {
  const dxRankByAtencion = await buildDxEvolutionRankByAtencion(rows, connectionName)
  const cutoffDateTime = getLimaCutoffDateTime()

  return rows.map((row) => mapHospitalizadosCorteRow(row, dxRankByAtencion, cutoffDateTime))
}

function mapDiarioHospRow(row) {
  const dxEvo3Name = normalizeExportCell(col(row, 'DES_EVO3'))

  return {
    ORD: normalizeExportCell(col(row, 'NRO_ORD')),
    UPSS: normalizeExportCell(col(row, 'DES_UPSS')),
    SERVICIO: normalizeExportCell(col(row, 'SERVICIO')),
    NRO_DE_CAMA: normalizeExportCell(col(row, 'CAMA_ACT')),
    NRO_CUENTA: normalizeExportCell(col(row, 'IDCUENTA')),
    APELLIDOS_Y_NOMBRES: normalizeExportCell(col(row, 'PACIENTE')),
    FECHA_NACIMIENTO: normalizeExportCell(col(row, 'FECHANACIMIENTO')),
    NRO_DOCUMENTO: normalizeExportCell(col(row, 'NRO_DOC')),
    NRO_HISTORIA: normalizeExportCell(col(row, 'NRO_HISTORIA')),
    TELEFONOS_REFERENCIA: normalizeExportCell(col(row, 'TELEFONO')),
    EDAD: normalizeExportCell(col(row, 'EDAD')),
    TIPO_EDAD: normalizeExportCell(col(row, 'TIPO_EDAD')),
    SEXO: normalizeExportCell(col(row, 'TIPO_SEXO')),
    IAFAS_SEGURO: normalizeExportCell(col(row, 'SEGURO')),
    TIPO_PRUEBA: normalizeExportCell(col(row, 'TIPO_MUESTRA')),
    RESULTADO: normalizeExportCell(col(row, 'RESULTADO')),
    FECHA_DE_ING_1RA_VEZ: normalizeExportCell(col(row, 'FECHA_INGRESO')),
    DIAS_HOSP: normalizeExportCell(col(row, 'DIAS_HOSP')),
    // Legacy exported this column blank due to a key mismatch (servicioaant vs servicioant).
    SERVICIO_ANTERIOR: '',
    FECHA_DE_INGREGO_A_HOSPIT: normalizeExportCell(col(row, 'FECHAINGRESO_SER')),
    DIAS_ULT_SERVICIO: normalizeExportCell(col(row, 'DIAS_SERV')),
    CIEX_DX: normalizeExportCell(col(row, 'DX_INGRESO')),
    TIPO_DX: normalizeExportCell(col(row, 'TIPO_DX')),
    NOMBRE_DX: normalizeExportCell(col(row, 'DES_DX')),
    CO_MORBILIDAD: normalizeExportCell(col(row, 'COMORBI')),
    CONDICION: normalizeExportCell(col(row, 'CONDICION')),
    OXIGENO_TERAPIA_INICIAL: normalizeExportCell(col(row, 'VENTILACION')),
    OXIGENO_TERAPIA_FINAL: normalizeExportCell(col(row, 'VENTILACION_F')),
    TRATAMIENTO: normalizeExportCell(col(row, 'TRATAMIENTO')),
    EVOLUCION: normalizeExportCell(col(row, 'EVOLUCION')),
    DEPARTAMENTO: normalizeExportCell(col(row, 'DEPARTAMENTO')),
    PROVINCIA: normalizeExportCell(col(row, 'PROVINCIA')),
    DISTRITO: normalizeExportCell(col(row, 'DISTRITO')),
    DIRECCION_DE_PACIENTE: normalizeExportCell(col(row, 'DOMICILIO')),
    SERVICIO_ULTIMA_EVOLUCION: normalizeExportCell(col(row, 'ULTIMOSERVICIO')),
    FECHA_ULTIMA_EVOLUCION: normalizeExportCell(col(row, 'FECHAULTIMA')),
    SE_INFORMO_FAMILIA: normalizeExportCell(col(row, 'SEINFORMO')),
    ULTIMA_LLAMADA: normalizeExportCell(col(row, 'FECHALLAMADA')),
    FECHA_REG_ENFERM: normalizeExportCell(col(row, 'FECHA_REG_ENFERMERIA')),
    GRADO_DEPENDENCIA: normalizeExportCell(col(row, 'GRADO')),
    CIE_EVOLUCION1: normalizeExportCell(col(row, 'DX_EVO1')),
    TIPO_DX1: normalizeExportCell(col(row, 'TIPO_EVO1')),
    NOMBRE_DX1: normalizeExportCell(col(row, 'DES_EVO1')),
    CIE_EVOLUCION2: normalizeExportCell(col(row, 'DX_EVO2')),
    TIPO_DX2: normalizeExportCell(col(row, 'TIPO_EVO2')),
    // Legacy rendered NOMBRE DX2 with DES_EVO3 (historical behavior preserved for parity).
    NOMBRE_DX2: dxEvo3Name,
    CIE_EVOLUCION3: normalizeExportCell(col(row, 'DX_EVO3')),
    TIPO_DX3: normalizeExportCell(col(row, 'TIPO_EVO3')),
    NOMBRE_DX3: dxEvo3Name,
    FECHA_DE_CORTE: normalizeExportCell(col(row, 'FECHA')),
  }
}

function mapDiarioHospRows(rows) {
  return rows.map((row) => mapDiarioHospRow(row))
}

function mapDiarioAltasRow(row) {
  const condicion = normalizeExportCell(col(row, 'CONDICION'))

  return {
    ORD: normalizeExportCell(col(row, 'NRO_ORD')),
    UPSS: normalizeExportCell(col(row, 'DES_UPSS')),
    SERVICIO: normalizeExportCell(col(row, 'SERVICIO')),
    FECHA_EGRESO: normalizeExportCell(col(row, 'FECHAEGRESOS')),
    HORA_EGRESO: normalizeExportCell(col(row, 'HORAEGRESO')),
    NRO_CUENTA: normalizeExportCell(col(row, 'IDCUENTA')),
    APELLIDOS_Y_NOMBRES: normalizeExportCell(col(row, 'PACIENTE')),
    TIPO_DOCUMENTO: normalizeExportCell(col(row, 'TIPODOC')),
    NRO_DOCUMENTO: normalizeExportCell(col(row, 'NRO_DOC')),
    NRO_HISTORIA: normalizeExportCell(col(row, 'NRO_HISTORIA')),
    TELEFONOS_REFERENCIA: normalizeExportCell(col(row, 'TELEFONO')),
    EDAD: normalizeExportCell(col(row, 'EDAD')),
    TIPO_EDAD: normalizeExportCell(col(row, 'TIPO_EDAD')),
    SEXO: normalizeExportCell(col(row, 'TIPO_SEXO')),
    IAFAS_SEGURO: normalizeExportCell(col(row, 'SEGURO')),
    TIPO_PRUEBA: normalizeExportCell(col(row, 'TIPO_MUESTRA')),
    RESULTADO: normalizeExportCell(col(row, 'RESULTADO')),
    FECHA_DE_ING_1RA_VEZ: normalizeExportCell(col(row, 'FECHA_INGRESO')),
    DIAS_HOSP: normalizeExportCell(col(row, 'DIAS_HOSP')),
    CIEX_DX: normalizeExportCell(col(row, 'DX_INGRESO')),
    TIPO_DX: normalizeExportCell(col(row, 'TIPO_DX')),
    NOMBRE_DX: normalizeExportCell(col(row, 'DES_DX')),
    CO_MORBILIDAD: normalizeExportCell(col(row, 'COMORBI')),
    CONDICION: condicion,
    OXIGENO_TERAPIA: normalizeExportCell(col(row, 'VENTILACION')),
    TRATAMIENTO: normalizeExportCell(col(row, 'TRATAMIENTO')),
    EVOLUCION: normalizeExportCell(col(row, 'EVOLUCION')),
    DEPARTAMENTO: normalizeExportCell(col(row, 'DEPARTAMENTO')),
    PROVINCIA: normalizeExportCell(col(row, 'PROVINCIA')),
    DISTRITO: normalizeExportCell(col(row, 'DISTRITO')),
    DIRECCION_DE_PACIENTE: normalizeExportCell(col(row, 'DOMICILIO')),
    SERVICIO_ULTIMA_EVOLUCION: normalizeExportCell(col(row, 'ULTIMOSERVICIO')),
    FECHA_ULTIMA_EVOLUCION: normalizeExportCell(col(row, 'FECHAULTIMA')),
    SE_INFORMO_FAMILIA: normalizeExportCell(col(row, 'SEINFORMO')),
    ULTIMA_LLAMADA: normalizeExportCell(col(row, 'FECHALLAMADA')),
    TRATAMIENTO_ALTA: normalizeExportCell(col(row, 'TRATAMIENTOALTA')),
    RECOMENDACION: normalizeExportCell(col(row, 'RECOMENDACION')),
    DESTINO_PACIENTE: normalizeExportCell(col(row, 'DESTINOPACIENTE')),
    ESTABLECIMIENTO: normalizeExportCell(col(row, 'ESTABLECIMIENTO')),
    FECHA_DE_TRASLADO: normalizeExportCell(col(row, 'FECHATRASLADO')),
    CONDICION_FINAL: condicion,
    FECHA_DE_CORTE: normalizeExportCell(col(row, 'FECHA')),
  }
}

function mapDiarioAltasRows(rows) {
  return rows.map((row) => mapDiarioAltasRow(row))
}

function mapDiarioFallRow(row) {
  const condicion = normalizeExportCell(col(row, 'CONDICION'))

  return {
    ORD: normalizeExportCell(col(row, 'NRO_ORD')),
    UPSS: normalizeExportCell(col(row, 'DES_UPSS')),
    SERVICIO: normalizeExportCell(col(row, 'SERVICIO')),
    FECHA_FALLECIMIENTO: normalizeExportCell(col(row, 'FECHAFALLEC')),
    HORA_FALLECIMIENTO: normalizeExportCell(col(row, 'HORAFALLEC')),
    NRO_CUENTA: normalizeExportCell(col(row, 'IDCUENTA')),
    APELLIDOS_Y_NOMBRES: normalizeExportCell(col(row, 'PACIENTE')),
    NRO_DOCUMENTO: normalizeExportCell(col(row, 'NRO_DOC')),
    NRO_HISTORIA: normalizeExportCell(col(row, 'NRO_HISTORIA')),
    TELEFONOS_REFERENCIA: normalizeExportCell(col(row, 'TELEFONO')),
    EDAD: normalizeExportCell(col(row, 'EDAD')),
    TIPO_EDAD: normalizeExportCell(col(row, 'TIPO_EDAD')),
    SEXO: normalizeExportCell(col(row, 'TIPO_SEXO')),
    IAFAS_SEGURO: normalizeExportCell(col(row, 'SEGURO')),
    TIPO_PRUEBA: normalizeExportCell(col(row, 'TIPO_MUESTRA')),
    RESULTADO: normalizeExportCell(col(row, 'RESULTADO')),
    FECHA_DE_ING_1RA_VEZ: normalizeExportCell(col(row, 'FECHA_INGRESO')),
    DIAS_HOSP: normalizeExportCell(col(row, 'DIAS_HOSP')),
    CIEX_DX: normalizeExportCell(col(row, 'DX_INGRESO')),
    TIPO_DX: normalizeExportCell(col(row, 'TIPO_DX')),
    NOMBRE_DX: normalizeExportCell(col(row, 'DES_DX')),
    CO_MORBILIDAD: normalizeExportCell(col(row, 'COMORBI')),
    CONDICION: condicion,
    OXIGENO_TERAPIA: normalizeExportCell(col(row, 'VENTILACION')),
    TRATAMIENTO: normalizeExportCell(col(row, 'TRATAMIENTO')),
    EVOLUCION: normalizeExportCell(col(row, 'EVOLUCION')),
    DEPARTAMENTO: normalizeExportCell(col(row, 'DEPARTAMENTO')),
    PROVINCIA: normalizeExportCell(col(row, 'PROVINCIA')),
    DISTRITO: normalizeExportCell(col(row, 'DISTRITO')),
    DIRECCION_DE_PACIENTE: normalizeExportCell(col(row, 'DOMICILIO')),
    SERVICIO_ULTIMA_EVOLUCION: normalizeExportCell(col(row, 'ULTIMOSERVICIO')),
    FECHA_ULTIMA_EVOLUCION: normalizeExportCell(col(row, 'FECHAULTIMA')),
    SE_INFORMO_FAMILIA: normalizeExportCell(col(row, 'SEINFORMO')),
    ULTIMA_LLAMADA: normalizeExportCell(col(row, 'FECHALLAMADA')),
    CONDICION_FINAL: condicion,
    FECHA_DE_CORTE: normalizeExportCell(col(row, 'FECHA')),
  }
}

function mapDiarioFallRows(rows) {
  return rows.map((row) => mapDiarioFallRow(row))
}

function normalizeExportNumber(value) {
  const normalized = normalizeExportCell(value)
  if (normalized === '') return 0
  const numeric = Number(normalized)
  return Number.isFinite(numeric) ? numeric : 0
}

function mapCamasResumenRow(row) {
  return {
    piso: normalizeExportCell(col(row, 'PISO')),
    servicio: normalizeExportCell(col(row, 'CONSULTORIO')),
    tipo: normalizeExportCell(col(row, 'TIPO')),
    c_vm: normalizeExportNumber(col(row, 'C_VM')),
    c_fl: normalizeExportNumber(col(row, 'C_FL')),
    total: normalizeExportNumber(col(row, 'TOTAL')),
    chabi: normalizeExportNumber(col(row, 'C_HABI')),
    cocup: normalizeExportNumber(col(row, 'C_OCUP')),
    clibr: normalizeExportNumber(col(row, 'C_LIBR')),
    ctran: normalizeExportNumber(col(row, 'C_TRAN')),
    cinah: normalizeExportNumber(col(row, 'C_INAH')),
    fecha: normalizeExportCell(col(row, 'FECHA')),
  }
}

function mapCamasResumenSummary(rows) {
  const firstRow = rows[0] ?? {}
  return {
    triajes: normalizeExportNumber(col(firstRow, 'TRIAJE', 'triaje')),
    atendidos: normalizeExportNumber(col(firstRow, 'ATENDIDOS', 'atendidos')),
  }
}

async function buildCamasResumenExport({ connectionName, fileName }) {
  const [summaryRows, detailRows] = await Promise.all([
    executeProcedure('SP_REPORTE_EXCEL7A', [], {
      timeoutMs: 120000,
      connection: connectionName,
    }),
    executeProcedure('SP_CAMA_RESUMEN_CORTE', [], {
      timeoutMs: 120000,
      connection: connectionName,
    }),
  ])

  const mappedRows = detailRows.map((row) => mapCamasResumenRow(row))
  const summary = mapCamasResumenSummary(summaryRows)

  const content = await buildCamasResumenWorkbook({
    title: fileName,
    sheetName: 'Sheet1',
    summary,
    rows: mappedRows,
  })

  return {
    content,
    rowCount: mappedRows.length,
  }
}

const CURRENT_EXPORTS_SIGH = {
  ...CURRENT_EXPORTS,
  exportaxls_4: {
    procedure: 'SP_REPORTE_EXCEL4',
    fileName: 'reporte-diario-pacientes-hospitalizados.xlsx',
    template: DIARIO_HOSP_TEMPLATE,
    rowsMapper: mapDiarioHospRows,
  },
  exportaxls_5: {
    procedure: 'SP_REPORTE_EXCEL5',
    fileName: 'reporte-diario-pacientes-alta.xlsx',
    template: DIARIO_ALTAS_TEMPLATE,
    rowsMapper: mapDiarioAltasRows,
  },
  exportaxls_6: {
    procedure: 'SP_REPORTE_EXCEL6',
    fileName: 'reporte-diario-pacientes-fallecidos.xlsx',
    template: DIARIO_FALL_TEMPLATE,
    rowsMapper: mapDiarioFallRows,
  },
  exportaxls_7: {
    procedure: 'SP_REPORTE_EXCEL7',
    fileName: 'reporte-diario-camas.xlsx',
    customBuilder: buildCamasResumenExport,
  },
  exportaxls_10: {
    procedure: 'SP_REPORTE_EXCEL10_2026',
    fileName: 'reporte-pacientes-hospitalizados-corte.xlsx',
    template: HOSPITALIZADOS_CORTE_TEMPLATE,
    rowsMapper: mapHospitalizadosCorteRows,
  },
}

// ---------------------------------------------------------------------------
// Tabulated templates — explicit column selection, labels, colors, and widths
// for range exports whose visual layout differs from a raw SP dump.
// ---------------------------------------------------------------------------

const HISTORIAS_CLINICAS_RANGE_TEMPLATE = createRangeTemplate({
  tipoReporte: 'Reporte de Historias Clinicas Aperturadas',
  labelColor: '75ABFD',
  valueEndCol: 6,
  columns: [
    { key: 'ORD', label: 'ORD', width: 8, headerColor: 'A9F5D0', align: 'center' },
    { key: 'NOMBRE_DEL_PACIENTE', label: 'NOMBRE DEL PACIENTE', width: 36, headerColor: 'A9F5D0' },
    { key: 'HISTORIA_CLINICA', label: 'HISTORIA CLINICA', width: 16, headerColor: 'A9F5D0', asText: true, align: 'left' },
    { key: 'TIPO_DOCUMENTO', label: 'TIPO DOCUMENTO', width: 16, headerColor: 'A9F5D0', align: 'center' },
    { key: 'NRO_DE_DOCUMENTO', label: 'NRO DE DOCUMENTO', width: 18, headerColor: 'A9F5D0', asText: true, align: 'left' },
    { key: 'FECHA_DE_APERTURA', label: 'FECHA DE APERTURA', width: 22, headerColor: 'A9F5D0', format: 'excel-datetime', numFmt: 'yyyy-mm-dd hh:mm', align: 'center' },
    { key: 'ANIO_DE_APERTURA', label: 'ANIO DE APERTURA', width: 14, headerColor: 'A9F5D0', align: 'center' },
    { key: 'ESTADO_HISTORIA_CLINICA', label: 'ESTADO HISTORIA CLINICA', width: 24, headerColor: 'A9F5D0' },
    { key: 'NRO_DE_ATENCIONES', label: 'NRO DE ATENCIONES', width: 16, headerColor: 'A9F5D0', align: 'center' },
  ],
})

const FALLECIDOS_RANGE_TEMPLATE = createRangeTemplate({
  tipoReporte: 'Reporte de Nominal de Pacientes Fallecidos',
  labelColor: 'E7F5FE',
  valueEndCol: 6,
  columns: [
    { key: 'ORD', label: 'ORD', width: 8, headerColor: 'FB8383', align: 'center' },
    { key: 'UPSS_EGRESO', label: 'UPSS EGRESO', width: 22, headerColor: 'FB8383' },
    { key: 'SERVICIO_EGRESO', label: 'SERVICIO EGRESO', width: 28, headerColor: 'FB8383' },
    { key: 'FECHA_Y_HORA_EGRESO', label: 'FECHA Y HORA EGRESO', width: 20, headerColor: 'FB8383', format: 'excel-date', numFmt: 'dd/mm/yyyy', align: 'center' },
    { key: 'FECHA_FALLECIDO', label: 'FECHA FALLECIDO', width: 18, headerColor: 'FB8383', format: 'excel-date', numFmt: 'yyyy-mm-dd', align: 'center' },
    { key: 'HORA_FALLECIDO', label: 'HORA FALLECIDO', width: 14, headerColor: 'FB8383', format: 'excel-time', numFmt: 'hh:mm', align: 'center' },
    { key: 'NRO_CUENTA', label: 'NRO CUENTA', width: 14, headerColor: 'FB8383', align: 'center' },
    { key: 'APELLIDOS_Y_NOMBRES', label: 'APELLIDOS Y NOMBRES', width: 36, headerColor: 'FB8383' },
    { key: 'TIPO_DOCUMENTO', label: 'TIPO DOCUMENTO', width: 18, headerColor: 'FB8383' },
    { key: 'NRO_DOCUMENTO', label: 'NRO DOCUMENTO', width: 16, headerColor: 'FB8383', asText: true, align: 'left' },
    { key: 'NRO_HISTORIA', label: 'NRO HISTORIA', width: 16, headerColor: 'FB8383', asText: true, align: 'left' },
    { key: 'TELEFONOS_REFERENCIA', label: 'TELEFONOS REFERENCIA', width: 20, headerColor: 'FB8383' },
    { key: 'EDAD', label: 'EDAD', width: 8, headerColor: 'FB8383', align: 'center' },
    { key: 'TIPO_EDAD', label: 'TIPO EDAD', width: 10, headerColor: 'FB8383', align: 'center' },
    { key: 'SEXO', label: 'SEXO', width: 10, headerColor: 'FB8383', align: 'center' },
    { key: 'IAFAS_SEGURO', label: 'IAFAS/SEGURO', width: 16, headerColor: 'FB8383', align: 'center' },
    { key: 'FECHA_DE_INGRESO', label: 'FECHA DE INGRESO', width: 18, headerColor: 'FB8383', format: 'excel-date', numFmt: 'dd/mm/yyyy', align: 'center' },
    { key: 'HORA_DE_INGRESO', label: 'HORA DE INGRESO', width: 14, headerColor: 'FB8383', format: 'excel-time', numFmt: 'hh:mm', align: 'center' },
    { key: 'DIAS_HOSP', label: 'DIAS HOSP', width: 10, headerColor: 'FB8383', align: 'center' },
    { key: 'CIEX_DX1', label: 'CIEX DX1', width: 12, headerColor: 'FB8383', align: 'center' },
    { key: 'TIPO_DX1', label: 'TIPO DX1', width: 12, headerColor: 'FB8383', align: 'center' },
    { key: 'NOMBRE_DX1', label: 'NOMBRE DX1', width: 34, headerColor: 'FB8383' },
    { key: 'CIEX_DX2', label: 'CIEX DX2', width: 12, headerColor: 'FB8383', align: 'center' },
    { key: 'TIPO_DX2', label: 'TIPO DX2', width: 12, headerColor: 'FB8383', align: 'center' },
    { key: 'NOMBRE_DX2', label: 'NOMBRE DX2', width: 34, headerColor: 'FB8383' },
    { key: 'CIEX_DX3', label: 'CIEX DX3', width: 12, headerColor: 'FB8383', align: 'center' },
    { key: 'TIPO_DX3', label: 'TIPO DX3', width: 12, headerColor: 'FB8383', align: 'center' },
    { key: 'NOMBRE_DX3', label: 'NOMBRE DX3', width: 34, headerColor: 'FB8383' },
    { key: 'CONDICION', label: 'CONDICION', width: 14, headerColor: 'FB8383', align: 'center' },
  ],
})

const REFERIDOS_RANGE_TEMPLATE = createRangeTemplate({
  tipoReporte: 'Reporte de Nominal de Pacientes Referidos',
  labelColor: 'E7F5FE',
  valueEndCol: 5,
  columns: [
    { key: 'TIPO_REFERENCIA', label: 'TIPO REFERENCIA', width: 16, headerColor: '81BEF7' },
    { key: 'CONSULTORIO_ORIGEN', label: 'CONSULTORIO ORIGEN', width: 26, headerColor: '81BEF7' },
    { key: 'SERVICIO_SOLICITADO', label: 'SERVICIO SOLICITADO', width: 28, headerColor: '81BEF7' },
    { key: 'ESPECIALIDAD_SOLICITADA', label: 'ESPECIALIDAD SOLICITADA', width: 28, headerColor: '81BEF7' },
    { key: 'PACIENTE', label: 'PACIENTE', width: 34, headerColor: '81BEF7' },
    { key: 'TIPO_DOCUMENTO', label: 'TIPO DOCUMENTO', width: 16, headerColor: '81BEF7' },
    { key: 'NRO_DOCUMENTO', label: 'NRO DOCUMENTO', width: 16, headerColor: '81BEF7', asText: true, align: 'left' },
    { key: 'NRO_HISTORIA', label: 'NRO_HISTORIA', width: 16, headerColor: '81BEF7', asText: true, align: 'left' },
    { key: 'SEXO', label: 'SEXO', width: 10, headerColor: '81BEF7', align: 'center' },
    { key: 'EDAD', label: 'EDAD', width: 8, headerColor: '81BEF7', align: 'center' },
    { key: 'TIPO_EDAD', label: 'TIPO EDAD', width: 10, headerColor: '81BEF7', align: 'center' },
    { key: 'IAFAS_SEGURO', label: 'IAFAS/SEGURO', width: 16, headerColor: '81BEF7', align: 'center' },
    { key: 'FECHA_REGISTRO', label: 'FECHA_REGISTRO', width: 18, headerColor: '81BEF7', format: 'excel-datetime', numFmt: 'yyyy-mm-dd hh:mm', align: 'center' },
    { key: 'SERVICIO_REFERENCIA', label: 'SERVICIO REFERENCIA', width: 26, headerColor: '81BEF7' },
    { key: 'DETALLE_REFERENCIA', label: 'DETALLE REFERENCIA', width: 34, headerColor: '81BEF7' },
    { key: 'RESPONSABLE', label: 'RESPONSABLE', width: 28, headerColor: '81BEF7' },
    { key: 'TIPO_DE_EESS', label: 'TIPO DE EESS', width: 18, headerColor: '81BEF7' },
    { key: 'NOMBRE_DEL_EESS', label: 'NOMBRE DEL EESS', width: 30, headerColor: '81BEF7' },
    { key: 'MEDICO_QUE_ACEPTA', label: 'MEDICO QUE ACEPTA', width: 28, headerColor: '81BEF7' },
    { key: 'ESTADO_TRASLADO', label: 'ESTADO TRASLADO', width: 18, headerColor: '81BEF7' },
    { key: 'FECHA_TRASLADO', label: 'FECHA TRASLADO', width: 18, headerColor: '81BEF7', format: 'excel-datetime', numFmt: 'yyyy-mm-dd hh:mm', align: 'center' },
    { key: 'OBSERVACION_DEL_TRASLADO', label: 'OBSERVACION DEL TRASLADO', width: 34, headerColor: '81BEF7' },
    { key: 'ESTADO_SEGUIMIENTO', label: 'ESTADO SEGUIMIENTO', width: 18, headerColor: '81BEF7' },
    { key: 'FECHA_ACEPTADO', label: 'FECHA ACEPTADO', width: 18, headerColor: '81BEF7', format: 'excel-datetime', numFmt: 'yyyy-mm-dd hh:mm', align: 'center' },
    { key: 'SERVICIO_RECIBE', label: 'SERVICIO RECIBE', width: 24, headerColor: '81BEF7' },
    { key: 'ACOMPANANTE', label: 'ACOMPAÑANTE', width: 24, headerColor: '81BEF7' },
    { key: 'COD_CIE_1', label: 'COD CIE 1', width: 12, headerColor: '81BEF7', align: 'center' },
    { key: 'DESCRIPCION_CIE_1', label: 'DESCRIPCION CIE 1', width: 30, headerColor: '81BEF7' },
    { key: 'TIPO_CIE_1', label: 'TIPO CIE 1', width: 12, headerColor: '81BEF7', align: 'center' },
    { key: 'COD_CIE_2', label: 'COD CIE 2', width: 12, headerColor: '81BEF7', align: 'center' },
    { key: 'DESCRIPCION_CIE_2', label: 'DESCRIPCION CIE 2', width: 30, headerColor: '81BEF7' },
    { key: 'TIPO_CIE_2', label: 'TIPO CIE 2', width: 12, headerColor: '81BEF7', align: 'center' },
    { key: 'COD_CIE_3', label: 'COD CIE 3', width: 12, headerColor: '81BEF7', align: 'center' },
    { key: 'DESCRIPCION_CIE_3', label: 'DESCRIPCION CIE 3', width: 30, headerColor: '81BEF7' },
    { key: 'TIPO_CIE_3', label: 'TIPO CIE 3', width: 12, headerColor: '81BEF7', align: 'center' },
    { key: 'COD_CIE_4', label: 'COD CIE 4', width: 12, headerColor: '81BEF7', align: 'center' },
    { key: 'DESCRIPCION_CIE_4', label: 'DESCRIPCION CIE 4', width: 30, headerColor: '81BEF7' },
    { key: 'TIPO_CIE_4', label: 'TIPO CIE 4', width: 12, headerColor: '81BEF7', align: 'center' },
    { key: 'NRO_DE_REFERENCIA', label: 'NRO DE REFERENCIA', width: 16, headerColor: '81BEF7' },
  ],
})

const MONITOREO_DENGUE_RANGE_TEMPLATE = createRangeTemplate({
  tipoReporte: 'Listado de Pacientes que ingresaron por Triaje y temperatura >= 37.5',
  labelColor: 'E7F5FE',
  valueEndCol: 6,
  columns: [
    { key: 'FECHA_DE_INGRESO', label: 'Fecha de Ingreso', width: 16, headerColor: '9FDEEF', format: 'excel-date', numFmt: 'dd/mm/yyyy', align: 'center' },
    { key: 'HORA_DE_INGRESO', label: 'Hora de Ingreso', width: 14, headerColor: '9FDEEF', format: 'excel-time', numFmt: 'hh:mm', align: 'center' },
    { key: 'SERVICIO_INGRESO', label: 'Servicio Ingreso', width: 24, headerColor: '9FDEEF' },
    { key: 'NRO_HISTORIA_CLINICA', label: 'Nro Historia Clinica', width: 18, headerColor: '9FDEEF', asText: true, align: 'left' },
    { key: 'NRO_DOCUMENTO', label: 'Nro Documento', width: 16, headerColor: '9FDEEF', asText: true, align: 'left' },
    { key: 'DIRECCION_DOMICILIO', label: 'Direccion / Domicilio', width: 32, headerColor: '9FDEEF' },
    { key: 'NRO_DE_CUENTA', label: 'Nro de Cuenta', width: 14, headerColor: '9FDEEF', align: 'center' },
    { key: 'PACIENTE', label: 'Paciente', width: 32, headerColor: '9FDEEF' },
    { key: 'SEXO', label: 'Sexo', width: 10, headerColor: '9FDEEF', align: 'center' },
    { key: 'EDAD', label: 'Edad', width: 8, headerColor: '9FDEEF', align: 'center' },
    { key: 'TIPO_EDAD', label: 'Tipo_Edad', width: 12, headerColor: '9FDEEF', align: 'center' },
    { key: 'TEMPERATURA', label: 'Temperatura', width: 12, headerColor: '9FDEEF', align: 'center' },
    { key: 'DEPARTAMENTO_PROCEDENCIA', label: 'Departamento Procedencia', width: 22, headerColor: '9FDEEF' },
    { key: 'PROVINCIA_PROCEDENCIA', label: 'Provincia Procedencia', width: 22, headerColor: '9FDEEF' },
    { key: 'DISTRITO_PROCEDENCIA', label: 'Distrito Procedencia', width: 22, headerColor: '9FDEEF' },
    { key: 'DEPARTAMENTO_DOMICILIO', label: 'Departamento Domicilio', width: 22, headerColor: '9FDEEF' },
    { key: 'PROVINCIA_DOMICILIO', label: 'Provincia Domicilio', width: 22, headerColor: '9FDEEF' },
    { key: 'DISTRITO_DOMICILIO', label: 'Distrito Domicilio', width: 22, headerColor: '9FDEEF' },
    { key: 'SERVICIO_ULTIMO', label: 'Servicio Ultimo', width: 24, headerColor: '9FDEEF' },
    { key: 'FECHA_EGRESO', label: 'Fecha Egreso', width: 16, headerColor: '9FDEEF', format: 'excel-date', numFmt: 'dd/mm/yyyy', align: 'center' },
    { key: 'HORA_EGRESO', label: 'Hora Egreso', width: 14, headerColor: '9FDEEF', format: 'excel-time', numFmt: 'hh:mm', align: 'center' },
    { key: 'CONDICION_ALTA', label: 'Condicion Alta', width: 18, headerColor: '9FDEEF' },
    { key: 'CIE_10_1', label: 'Cie 10 1', width: 12, headerColor: '9FDEEF', align: 'center' },
    { key: 'TIPO_DX_1', label: 'Tipo Dx 1', width: 12, headerColor: '9FDEEF', align: 'center' },
    { key: 'DIAGNOSTICO_1', label: 'Diagnostico 1', width: 34, headerColor: '9FDEEF' },
    { key: 'CIE_10_2', label: 'Cie 10 2', width: 12, headerColor: '9FDEEF', align: 'center' },
    { key: 'TIPO_DX_2', label: 'Tipo Dx 2', width: 12, headerColor: '9FDEEF', align: 'center' },
    { key: 'DIAGNOSTICO_2', label: 'Diagnostico 2', width: 34, headerColor: '9FDEEF' },
  ],
})

const PRODUCCION_TICKET_RANGE_TEMPLATE = createRangeTemplate({
  tipoReporte: 'Listado de Ticket en Espera y Atendidos',
  labelColor: 'E7F5FE',
  valueEndCol: 6,
  columns: [
    { key: 'FECHA', label: 'Fecha', width: 16, headerColor: '9FDEEF', format: 'excel-date', numFmt: 'dd/mm/yyyy', align: 'center' },
    { key: 'AREA', label: 'Area', width: 18, headerColor: '9FDEEF' },
    { key: 'LUGAR_VENTANILLA', label: 'Lugar / Ventanilla', width: 24, headerColor: '9FDEEF' },
    { key: 'NRO_DE_TICKET', label: 'Nro de Ticket', width: 14, headerColor: '9FDEEF', align: 'center' },
    { key: 'HORA_ENTRADA', label: 'Hora Entrada', width: 14, headerColor: '9FDEEF', format: 'excel-time', numFmt: 'hh:mm:ss', align: 'center' },
    { key: 'HORA_LLAMADO', label: 'Hora Llamado', width: 14, headerColor: '9FDEEF', format: 'excel-time', numFmt: 'hh:mm:ss', align: 'center' },
    { key: 'TIEMPO_ESPERA_MIN', label: 'Tiempo (min)', width: 12, headerColor: '9FDEEF', align: 'center' },
    { key: 'INICIO_ATENCION', label: 'Inicio Atencion', width: 14, headerColor: '9FDEEF', format: 'excel-time', numFmt: 'hh:mm:ss', align: 'center' },
    { key: 'FIN_ATENCION', label: 'Fin Atencion', width: 14, headerColor: '9FDEEF', format: 'excel-time', numFmt: 'hh:mm:ss', align: 'center' },
    { key: 'TIEMPO_ATENCION_MIN', label: 'Tiempo (min)', width: 12, headerColor: '9FDEEF', align: 'center' },
    { key: 'TIPO_DE_ATENCION', label: 'Tipo de Atencion', width: 18, headerColor: '9FDEEF' },
  ],
})

const TELEMONITOREO_RANGE_TEMPLATE = createRangeTemplate({
  tipoReporte: 'Listado Nominal de pacientes Programados y atendidos en los servicios ambulatorios',
  labelColor: '75ABFD',
  valueEndCol: 6,
  columns: [
    { key: 'ORD', label: 'ORD', width: 8, headerColor: 'A9F5D0', align: 'center' },
    { key: 'SERVICIO', label: 'SERVICIO', width: 24, headerColor: 'A9F5D0' },
    { key: 'CONSULTORIO', label: 'CONSULTORIO', width: 28, headerColor: 'A9F5D0' },
    { key: 'FECHA_ATENCION', label: 'FECHA ATENCION', width: 16, headerColor: 'A9F5D0', format: 'excel-date', numFmt: 'dd/mm/yyyy', align: 'center' },
    { key: 'TURNO', label: 'TURNO', width: 10, headerColor: 'A9F5D0', align: 'center' },
    { key: 'HORA_ATENCION', label: 'HORA ATENCION', width: 14, headerColor: 'A9F5D0', format: 'excel-time', numFmt: 'hh:mm', align: 'center' },
    { key: 'ESTABLECIMIENTO_DE_SALUD', label: 'ESTABLECIMIENTO DE SALUD', width: 28, headerColor: 'A9F5D0' },
    { key: 'NRO_DE_REFERENCIA', label: 'Nro DE REFERENCIA', width: 16, headerColor: 'A9F5D0', align: 'center' },
    { key: 'FECHA_DE_REFERENCIA', label: 'FECHA DE REFERENCIA', width: 16, headerColor: 'A9F5D0', format: 'excel-date', numFmt: 'dd/mm/yyyy', align: 'center' },
    { key: 'NRO_DE_EXPEDIENTE', label: 'Nro DE EXPEDIENTE', width: 16, headerColor: 'A9F5D0', asText: true, align: 'left' },
    { key: 'NRO_DE_HISTORIA_CLINICA', label: 'Nro DE HISTORIA CLINICA', width: 18, headerColor: 'A9F5D0', asText: true, align: 'left' },
    { key: 'CUENTA', label: 'CUENTA', width: 14, headerColor: 'A9F5D0', align: 'center' },
    { key: 'NOMBRES_DE_PACIENTE', label: 'NOMBRES DE PACIENTE', width: 34, headerColor: 'A9F5D0' },
    { key: 'TIPO_DOCUMENTO', label: 'TIPO DOCUMENTO', width: 16, headerColor: 'A9F5D0' },
    { key: 'NRO_DE_DOCUMENTO', label: 'NRO DE DOCUMENTO', width: 16, headerColor: 'A9F5D0', asText: true, align: 'left' },
    { key: 'SEXO', label: 'SEXO', width: 10, headerColor: 'A9F5D0', align: 'center' },
    { key: 'EDAD', label: 'EDAD', width: 8, headerColor: 'A9F5D0', align: 'center' },
    { key: 'TIPOEDAD', label: 'TIPOEDAD', width: 12, headerColor: 'A9F5D0', align: 'center' },
    { key: 'TELEFONO_1', label: 'TELEFONO 1', width: 14, headerColor: 'A9F5D0', asText: true, align: 'left' },
    { key: 'TELEFONO_2', label: 'TELEFONO 2', width: 14, headerColor: 'A9F5D0', asText: true, align: 'left' },
    { key: 'TELEFONO_3', label: 'TELEFONO 3', width: 14, headerColor: 'A9F5D0', asText: true, align: 'left' },
    { key: 'NRO_DOCUMENTO_PROFESIONAL', label: 'NRO DOCUMENTO', width: 16, headerColor: 'A9F5D0', asText: true, align: 'left' },
    { key: 'NOMBRE_PROFESIONAL', label: 'NOMBRE PROFESIONAL', width: 34, headerColor: 'A9F5D0' },
    { key: 'ESPECIALIDAD_DE_PROFESIONAL', label: 'ESPECIALIDAD DE PROFESIONAL', width: 24, headerColor: 'A9F5D0' },
    { key: 'DESTINO_ATENCION', label: 'DESTINO ATENCION', width: 22, headerColor: 'A9F5D0' },
    { key: 'TIPO_ALTA', label: 'TIPO ALTA', width: 16, headerColor: 'A9F5D0' },
    { key: 'PROXIMA_CITA', label: 'PROXIMA CITA', width: 16, headerColor: 'A9F5D0', format: 'excel-date', numFmt: 'dd/mm/yyyy', align: 'center' },
    { key: 'MOTIVO_CITA', label: 'MOTIVO CITA', width: 22, headerColor: 'A9F5D0' },
    { key: 'EMITIO_RECETA', label: 'EMITIO RECETA', width: 16, headerColor: 'A9F5D0', align: 'center' },
    { key: 'ATENDIO_RECETA', label: 'ATENDIO RECETA', width: 16, headerColor: 'A9F5D0', align: 'center' },
    { key: 'ESTADO_CUENTA', label: 'ESTADO CUENTA', width: 20, headerColor: 'A9F5D0' },
    { key: 'CREA_CUENTA', label: 'CREA CUENTA', width: 28, headerColor: 'A9F5D0' },
    { key: 'CONDICION_PACIENTE', label: 'CONDICION PACIENTE', width: 18, headerColor: 'A9F5D0' },
    { key: 'SE_ATENDIO', label: 'SE ATENDIO', width: 12, headerColor: 'A9F5D0', align: 'center' },
    { key: 'FICHA_HC_FIRMADA', label: 'Ficha de Atencion de H.C. firmada Electronicamente', width: 30, headerColor: 'A9F5D0', align: 'center' },
    { key: 'FUA_FIRMADA', label: 'FUA firmada Electronicamente', width: 24, headerColor: 'A9F5D0', align: 'center' },
    { key: 'FUENTE_FINANCIAMIENTO', label: 'Fuente Financiamiento', width: 18, headerColor: 'A9F5D0' },
  ],
})

const PROD_ADM_RANGE_TEMPLATE = createRangeTemplate({
  tipoReporte: 'Producci\u00f3n de Usuarios de Admision',
  labelColor: 'E7F5FE',
  valueEndCol: 6,
  columns: [
    { key: 'ANIO', label: 'ANIO', width: 10, headerColor: 'FA7985', align: 'center' },
    { key: 'MES', label: 'MES', width: 10, headerColor: 'FA7985', align: 'center' },
    { key: 'USUARIO', label: 'USUARIO', width: 34, headerColor: 'FA7985' },
    { key: 'CARGO', label: 'CARGO', width: 28, headerColor: 'FA7985' },
    { key: 'TIPO_DE_ACTIVIDAD', label: 'TIPO DE ACTIVIDAD', width: 22, headerColor: 'FA7985' },
    { key: 'NRO_DE_REGISTRO', label: 'NRO DE REGISTRO', width: 16, headerColor: 'FA7985', align: 'center' },
  ],
})

function mapRangeHistoriasClinicasRow(row) {
  return {
    ORD: normalizeExportCell(col(row, 'ORD')),
    NOMBRE_DEL_PACIENTE: normalizeExportCell(col(row, 'PACIENTE')),
    HISTORIA_CLINICA: normalizeExportCell(col(row, 'HISTORIA')),
    TIPO_DOCUMENTO: normalizeExportCell(col(row, 'TIPODOC')),
    NRO_DE_DOCUMENTO: normalizeExportCell(col(row, 'NRODOC')),
    FECHA_DE_APERTURA: normalizeExportCell(col(row, 'FECHACREA')),
    ANIO_DE_APERTURA: normalizeExportCell(col(row, 'ANIOCREA')),
    ESTADO_HISTORIA_CLINICA: normalizeExportCell(col(row, 'ESTADO')),
    NRO_DE_ATENCIONES: normalizeExportCell(col(row, 'NROATC')),
  }
}

function mapRangePacientesFallecidosRow(row) {
  return {
    ORD: normalizeExportCell(col(row, 'NRO_ORD')),
    UPSS_EGRESO: normalizeExportCell(col(row, 'UPSS')),
    SERVICIO_EGRESO: normalizeExportCell(col(row, 'SERVICIO')),
    FECHA_Y_HORA_EGRESO: normalizeExportCell(col(row, 'FECHA_EGRESO')),
    FECHA_FALLECIDO: normalizeExportCell(col(row, 'FECHA_FALL')),
    HORA_FALLECIDO: normalizeExportCell(col(row, 'HORA_FALL')),
    NRO_CUENTA: normalizeExportCell(col(row, 'IDCUENTA')),
    APELLIDOS_Y_NOMBRES: normalizeExportCell(col(row, 'PACIENTE')),
    TIPO_DOCUMENTO: normalizeExportCell(col(row, 'TIPO_DOC')),
    NRO_DOCUMENTO: normalizeExportCell(col(row, 'NRO_DOC')),
    NRO_HISTORIA: normalizeExportCell(col(row, 'NRO_HISTORIA')),
    TELEFONOS_REFERENCIA: normalizeExportCell(col(row, 'TELEFONO')),
    EDAD: normalizeExportCell(col(row, 'EDAD')),
    TIPO_EDAD: normalizeExportCell(col(row, 'TIPO_EDAD')),
    SEXO: normalizeExportCell(col(row, 'TIPO_SEXO')),
    IAFAS_SEGURO: normalizeExportCell(col(row, 'SEGURO')),
    FECHA_DE_INGRESO: normalizeExportCell(col(row, 'FECHA_INGRESO')),
    HORA_DE_INGRESO: normalizeExportCell(col(row, 'HORAINGRESO')),
    DIAS_HOSP: normalizeExportCell(col(row, 'DIAS_HOSP')),
    CIEX_DX1: normalizeExportCell(col(row, 'DX_FALL1')),
    TIPO_DX1: normalizeExportCell(col(row, 'TIPO_DX1')),
    NOMBRE_DX1: normalizeExportCell(col(row, 'DES_DX1')),
    CIEX_DX2: normalizeExportCell(col(row, 'DX_FALL2')),
    TIPO_DX2: normalizeExportCell(col(row, 'TIPO_DX2')),
    NOMBRE_DX2: normalizeExportCell(col(row, 'DES_DX2')),
    CIEX_DX3: normalizeExportCell(col(row, 'DX_FALL3')),
    TIPO_DX3: normalizeExportCell(col(row, 'TIPO_DX3')),
    NOMBRE_DX3: normalizeExportCell(col(row, 'DES_DX3')),
    CONDICION: normalizeExportCell(col(row, 'CONDICIONPACIENTE')),
  }
}

function mapRangeReferidosRow(row) {
  return {
    TIPO_REFERENCIA: normalizeExportCell(col(row, 'TIPO_REFERENCIA')),
    CONSULTORIO_ORIGEN: normalizeExportCell(col(row, 'CONSULTORIO_ORIGEN')),
    SERVICIO_SOLICITADO: normalizeExportCell(col(row, 'SERVICIO_SOLICITADO')),
    ESPECIALIDAD_SOLICITADA: normalizeExportCell(col(row, 'ESPECIALIDAD_SOLICITADA')),
    PACIENTE: normalizeExportCell(col(row, 'PACIENTE')),
    TIPO_DOCUMENTO: normalizeExportCell(col(row, 'TIPO_DOC')),
    NRO_DOCUMENTO: normalizeExportCell(col(row, 'NRO_DOC')),
    NRO_HISTORIA: normalizeExportCell(col(row, 'NRO_HISTORIA')),
    SEXO: normalizeExportCell(col(row, 'TIPO_SEXO')),
    EDAD: normalizeExportCell(col(row, 'EDAD')),
    TIPO_EDAD: normalizeExportCell(col(row, 'TIPO_EDAD')),
    IAFAS_SEGURO: normalizeExportCell(col(row, 'SEGURO')),
    FECHA_REGISTRO: normalizeExportCell(col(row, 'FECHA_REGISTRO')),
    SERVICIO_REFERENCIA: normalizeExportCell(col(row, 'SERVICIO_REFERENCIA')),
    DETALLE_REFERENCIA: normalizeExportCell(col(row, 'DETALLE_REFERENCIA')),
    RESPONSABLE: normalizeExportCell(col(row, 'PERSONA_RESPONSABLE')),
    TIPO_DE_EESS: normalizeExportCell(col(row, 'TIPO_EESS')),
    NOMBRE_DEL_EESS: normalizeExportCell(col(row, 'DES_EESS')),
    MEDICO_QUE_ACEPTA: normalizeExportCell(col(row, 'MEDICO_ACEPTA')),
    ESTADO_TRASLADO: normalizeExportCell(col(row, 'ESTADO_TRASLADO')),
    FECHA_TRASLADO: normalizeExportCell(col(row, 'FECHA_TRASLADO')),
    OBSERVACION_DEL_TRASLADO: normalizeExportCell(col(row, 'OBS_TRASLADO')),
    ESTADO_SEGUIMIENTO: normalizeExportCell(col(row, 'ESTADO_SEGUIMIENTO')),
    FECHA_ACEPTADO: normalizeExportCell(col(row, 'FECHA_ACEPTADO')),
    SERVICIO_RECIBE: normalizeExportCell(col(row, 'SERVICIO_RECIBE')),
    ACOMPANANTE: normalizeExportCell(col(row, 'ACOMPANA')),
    COD_CIE_1: normalizeExportCell(col(row, 'COD_DIAG1')),
    DESCRIPCION_CIE_1: normalizeExportCell(col(row, 'DES_DIAG1')),
    TIPO_CIE_1: normalizeExportCell(col(row, 'TIPO_DIAG1')),
    COD_CIE_2: normalizeExportCell(col(row, 'COD_DIAG2')),
    DESCRIPCION_CIE_2: normalizeExportCell(col(row, 'DES_DIAG2')),
    TIPO_CIE_2: normalizeExportCell(col(row, 'TIPO_DIAG2')),
    COD_CIE_3: normalizeExportCell(col(row, 'COD_DIAG3')),
    DESCRIPCION_CIE_3: normalizeExportCell(col(row, 'DES_DIAG3')),
    TIPO_CIE_3: normalizeExportCell(col(row, 'TIPO_DIAG3')),
    COD_CIE_4: normalizeExportCell(col(row, 'COD_DIAG4')),
    DESCRIPCION_CIE_4: normalizeExportCell(col(row, 'DES_DIAG4')),
    TIPO_CIE_4: normalizeExportCell(col(row, 'TIPO_DIAG4')),
    NRO_DE_REFERENCIA: normalizeExportCell(col(row, 'NRO_REFERENCIA')),
  }
}

function mapRangeMonitoreoDengueRow(row) {
  return {
    FECHA_DE_INGRESO: normalizeExportCell(col(row, 'FechaIngreso')),
    HORA_DE_INGRESO: normalizeExportCell(col(row, 'Horaingreso')),
    SERVICIO_INGRESO: normalizeExportCell(col(row, 'Servicio_Ingreso')),
    NRO_HISTORIA_CLINICA: normalizeExportCell(col(row, 'NroHistoriaClinica')),
    NRO_DOCUMENTO: normalizeExportCell(col(row, 'NroDocumento')),
    DIRECCION_DOMICILIO: normalizeExportCell(col(row, 'DireccionDomicilio')),
    NRO_DE_CUENTA: normalizeExportCell(col(row, 'IdCuentaAtencion')),
    PACIENTE: normalizeExportCell(col(row, 'Paciente')),
    SEXO: normalizeExportCell(col(row, 'Genero')),
    EDAD: normalizeExportCell(col(row, 'Edad')),
    TIPO_EDAD: normalizeExportCell(col(row, 'Tipoedad')),
    TEMPERATURA: normalizeExportCell(col(row, 'TriajeTemperatura')),
    DEPARTAMENTO_PROCEDENCIA: normalizeExportCell(col(row, 'DepartamentoProc')),
    PROVINCIA_PROCEDENCIA: normalizeExportCell(col(row, 'ProvinciaProc')),
    DISTRITO_PROCEDENCIA: normalizeExportCell(col(row, 'DistritoProc')),
    DEPARTAMENTO_DOMICILIO: normalizeExportCell(col(row, 'DepartamentoDom')),
    PROVINCIA_DOMICILIO: normalizeExportCell(col(row, 'ProvinciaDom')),
    DISTRITO_DOMICILIO: normalizeExportCell(col(row, 'DistritoDom')),
    SERVICIO_ULTIMO: normalizeExportCell(col(row, 'ServicioUltimo')),
    FECHA_EGRESO: normalizeExportCell(col(row, 'FechaEgreso')),
    HORA_EGRESO: normalizeExportCell(col(row, 'Horaegreso')),
    CONDICION_ALTA: normalizeExportCell(col(row, 'CondicionAlta')),
    CIE_10_1: normalizeExportCell(col(row, 'DXING')),
    TIPO_DX_1: normalizeExportCell(col(row, 'TIPODX')),
    DIAGNOSTICO_1: normalizeExportCell(col(row, 'DESDX')),
    CIE_10_2: normalizeExportCell(col(row, 'DXING2')),
    TIPO_DX_2: normalizeExportCell(col(row, 'TIPODX2')),
    DIAGNOSTICO_2: normalizeExportCell(col(row, 'DESDX2')),
  }
}

function mapRangeProduccionTicketRow(row) {
  return {
    FECHA: normalizeExportCell(col(row, 'FECHA')),
    AREA: normalizeExportCell(col(row, 'AREA')),
    LUGAR_VENTANILLA: normalizeExportCell(col(row, 'LUGAR')),
    NRO_DE_TICKET: normalizeExportCell(col(row, 'NROTICKET')),
    HORA_ENTRADA: normalizeExportCell(col(row, 'HORA_ENTRADA')),
    HORA_LLAMADO: normalizeExportCell(col(row, 'HORA_LLAMADO')),
    TIEMPO_ESPERA_MIN: normalizeExportCell(col(row, 'TIEMPO1')),
    INICIO_ATENCION: normalizeExportCell(col(row, 'HORA_INICIO')),
    FIN_ATENCION: normalizeExportCell(col(row, 'HORA_FIN')),
    TIEMPO_ATENCION_MIN: normalizeExportCell(col(row, 'TIEMPO2')),
    TIPO_DE_ATENCION: normalizeExportCell(col(row, 'TIPOATENCION')),
  }
}

function mapRangeTelemonitoreoRow(row) {
  return {
    ORD: normalizeExportCell(col(row, 'IDORD')),
    SERVICIO: normalizeExportCell(col(row, 'SERVICIO')),
    CONSULTORIO: normalizeExportCell(col(row, 'CONSULTORIO')),
    FECHA_ATENCION: normalizeExportCell(col(row, 'FECHAATENCION')),
    TURNO: normalizeExportCell(col(row, 'TURNO')),
    HORA_ATENCION: normalizeExportCell(col(row, 'HORAATENCION')),
    ESTABLECIMIENTO_DE_SALUD: normalizeExportCell(col(row, 'EESS')),
    NRO_DE_REFERENCIA: normalizeExportCell(col(row, 'NRO_REF')),
    FECHA_DE_REFERENCIA: normalizeExportCell(col(row, 'FECHA_REF')),
    NRO_DE_EXPEDIENTE: normalizeExportCell(col(row, 'NRO_EXP')),
    NRO_DE_HISTORIA_CLINICA: normalizeExportCell(col(row, 'NROHISTORIA')),
    CUENTA: normalizeExportCell(col(row, 'CUENTA')),
    NOMBRES_DE_PACIENTE: normalizeExportCell(col(row, 'NOMBRE_PACIENTE')),
    TIPO_DOCUMENTO: normalizeExportCell(col(row, 'TIPODOC')),
    NRO_DE_DOCUMENTO: normalizeExportCell(col(row, 'NRODOC')),
    SEXO: normalizeExportCell(col(row, 'SEXO')),
    EDAD: normalizeExportCell(col(row, 'EDAD')),
    TIPOEDAD: normalizeExportCell(col(row, 'TIPOEDAD')),
    TELEFONO_1: normalizeExportCell(col(row, 'TELEF1')),
    TELEFONO_2: normalizeExportCell(col(row, 'TELEF2')),
    TELEFONO_3: normalizeExportCell(col(row, 'TELEF3')),
    NRO_DOCUMENTO_PROFESIONAL: normalizeExportCell(col(row, 'DNI')),
    NOMBRE_PROFESIONAL: normalizeExportCell(col(row, 'NOMBRE_PROFESIONAL')),
    ESPECIALIDAD_DE_PROFESIONAL: normalizeExportCell(col(row, 'ESPECIALIDAD_MEDICO')),
    DESTINO_ATENCION: normalizeExportCell(col(row, 'DESTINOATENCION')),
    TIPO_ALTA: normalizeExportCell(col(row, 'ALTA')),
    PROXIMA_CITA: normalizeExportCell(col(row, 'PROXIMA_CITA')),
    MOTIVO_CITA: normalizeExportCell(col(row, 'MOTIVO_CITA')),
    EMITIO_RECETA: normalizeExportCell(col(row, 'EMITIORECETA')),
    ATENDIO_RECETA: normalizeExportCell(col(row, 'ATENDIORECETA')),
    ESTADO_CUENTA: normalizeExportCell(col(row, 'ESTADOCUENTA')),
    CREA_CUENTA: normalizeExportCell(col(row, 'EMPLEADOCREA')),
    CONDICION_PACIENTE: normalizeExportCell(col(row, 'CONDICIONPACIENTE')),
    SE_ATENDIO: normalizeExportCell(col(row, 'SEATENDIO')),
    FICHA_HC_FIRMADA: normalizeExportCell(col(row, 'FHC')),
    FUA_FIRMADA: normalizeExportCell(col(row, 'FUA')),
    FUENTE_FINANCIAMIENTO: normalizeExportCell(col(row, 'FTEFTO')),
  }
}

function mapRangeProdAdmRow(row) {
  return {
    ANIO: normalizeExportCell(col(row, 'ANIO')),
    MES: normalizeExportCell(col(row, 'MES')),
    USUARIO: normalizeExportCell(col(row, 'USUARIO')),
    CARGO: normalizeExportCell(col(row, 'CARGO')),
    TIPO_DE_ACTIVIDAD: normalizeExportCell(col(row, 'TIPOACTIVIDAD')),
    NRO_DE_REGISTRO: normalizeExportCell(col(row, 'CANTIDAD')),
  }
}

async function loadRecoveredAtendidosRows({ startDate, endDate, connectionName, accountIds }) {
  if (!startDate || !endDate || !Array.isArray(accountIds) || accountIds.length === 0) {
    return []
  }

  const accountList = accountIds
    .map((value) => Number(value))
    .filter((value) => Number.isFinite(value))

  if (accountList.length === 0) {
    return []
  }

  const rows = await executeQuery(
    `
    SELECT
      FC.IdCuentaAtencion AS IdCuentaAtencion,
      A.IdAtencion,
      EC.Descripcion AS EstadoCuenta,
      FC.FechaRegistro AS FechaRegistroCuenta,
      FOS.FechaCreacion AS FechaCreaOrden,
      U.DES_UPSS AS UpssAtencion,
      S.DES_CONSULTORIO AS ConsultorioAtencion,
      ACT.FechaActividad AS FechaActividad,
      A.HoraIngreso,
      A.FyHInicioI,
      A.FyHFinal,
      UPPER(P.ApellidoPaterno + ' ' + P.ApellidoMaterno + ' ' + ISNULL(P.PrimerNombre, '') + ' ' + ISNULL(P.SegundoNombre, '')) AS NombrePaciente,
      OA.Descripcion AS OrigenAtencion,
      FF.Descripcion AS FuenteFinanciamiento,
      ISNULL(REPLACE(REPLACE(REPLACE(CONVERT(nvarchar(max), ASS.Descripcion), CHAR(10), ' '), CHAR(13), ' '), CHAR(9), ' '), '') AS Aseguradora,
      ISNULL(REPLACE(REPLACE(REPLACE(CONVERT(nvarchar(max), TG.Descripcion), CHAR(10), ' '), CHAR(13), ' '), CHAR(9), ' '), '') AS Prioridad,
      UPPER(EM.ApellidoPaterno + ' ' + EM.ApellidoMaterno + ' ' + EM.Nombres) AS ProfesionalAtendio,
      TE.Descripcion AS EspecialidadProfesional,
      EA.Descripcion AS EstadoAtencion,
      FC.IdUsuarioCrea AS CodigoEmpleado,
      UPPER(EM1.ApellidoPaterno + ' ' + EM1.ApellidoMaterno + ' ' + EM1.Nombres) AS EmpleadoCrea,
      TE1.Descripcion AS TipoEmpleado,
      ISNULL(EESSX.EESS, '') AS EessAdscripcion
    FROM SIGH..FacturacionCuentasAtencion FC WITH (NOLOCK)
    LEFT JOIN SIGH..Atenciones A WITH (NOLOCK) ON A.IdCuentaAtencion = FC.IdCuentaAtencion
    LEFT JOIN SIGH..Pacientes P WITH (NOLOCK) ON P.IdPaciente = A.IdPaciente
    LEFT JOIN SIGH_EST..T_Upss_Consultorio S WITH (NOLOCK) ON S.cod_Consultorio = A.IdServicioIngreso
    LEFT JOIN SIGH_EST..T_Upss U WITH (NOLOCK) ON U.cod_upss = S.cod_Upss
    LEFT JOIN SIGH..Medicos M WITH (NOLOCK) ON M.IdMedico = A.IdMedicoIngreso
    LEFT JOIN SIGH..Empleados EM WITH (NOLOCK) ON EM.IdEmpleado = M.IdEmpleado
    LEFT JOIN SIGH..TiposEmpleado TE WITH (NOLOCK) ON TE.IdTipoEmpleado = EM.IdTipoEmpleado
    LEFT JOIN SIGH..EstadosAtencion EA WITH (NOLOCK) ON EA.IdEstadoAtencion = A.idEstadoAtencion
    LEFT JOIN SIGH..Empleados EM1 WITH (NOLOCK) ON EM1.IdEmpleado = FC.IdUsuarioCrea
    LEFT JOIN SIGH..TiposEmpleado TE1 WITH (NOLOCK) ON TE1.IdTipoEmpleado = EM1.IdTipoEmpleado
    LEFT JOIN SIGH..TiposOrigenAtencion OA WITH (NOLOCK) ON OA.IdOrigenAtencion = A.IdOrigenAtencion
    LEFT JOIN SIGH..FuentesFinanciamiento FF WITH (NOLOCK) ON FF.IdFuenteFinanciamiento = A.idFuenteFinanciamiento
    LEFT JOIN SIGH..TiposGravedadAtencion TG WITH (NOLOCK) ON TG.IdTipoGravedad = A.IdTipoGravedad
    LEFT JOIN SIGH..AseguradorasxAtencion AA WITH (NOLOCK) ON AA.idCuentaAtencion = A.IdCuentaAtencion
    LEFT JOIN SIGH..Aseguradoras ASS WITH (NOLOCK) ON ASS.idAseguradora = AA.idAseguradora
    LEFT JOIN SIGH..EstadosCuenta EC WITH (NOLOCK) ON EC.IdEstado = FC.IdEstado
    LEFT JOIN (
      SELECT IdCuentaAtencion, MIN(FechaCreacion) AS FechaCreacion
      FROM SIGH..FactOrdenServicio WITH (NOLOCK)
      GROUP BY IdCuentaAtencion
    ) FOS ON FOS.IdCuentaAtencion = FC.IdCuentaAtencion
    LEFT JOIN (
      SELECT idCuentaAtencion, MIN(CAST(FechaReceta AS date)) AS FechaActividad
      FROM SIGH..RecetaCabecera WITH (NOLOCK)
      WHERE idEstado IN (1, 2, 3)
        AND CAST(FechaReceta AS date) BETWEEN @fecha_inicio AND @fecha_fin
      GROUP BY idCuentaAtencion
    ) ACT ON ACT.idCuentaAtencion = FC.IdCuentaAtencion
    LEFT JOIN (
      SELECT D1.IdCuentaAtencion, D2.EESS
      FROM (
        SELECT SA.IdCuentaAtencion, RIGHT(MAX(SF.CodigoEstablAdscripcion), 5) AS IdEESS
        FROM SIGH_EXTERNA..SisFuaAtencion SA
        LEFT JOIN SIGH_EXTERNA..SisFiliaciones SF ON SF.idSiasis = SA.idSiasis
        GROUP BY SA.IdCuentaAtencion
      ) D1
      LEFT JOIN (
        SELECT Codigo, Nombre AS EESS
        FROM SIGH..Establecimientos
      ) D2 ON D1.IdEESS COLLATE SQL_Latin1_General_CP1_CI_AS = D2.Codigo
    ) EESSX ON EESSX.IdCuentaAtencion = FC.IdCuentaAtencion
    WHERE FC.IdCuentaAtencion IN (${accountList.join(', ')})
      AND ACT.FechaActividad IS NOT NULL
      AND CAST(A.FechaIngreso AS date) NOT BETWEEN @fecha_inicio AND @fecha_fin
    `,
    [
      { name: 'fecha_inicio', type: sql.NVarChar, value: startDate },
      { name: 'fecha_fin', type: sql.NVarChar, value: endDate },
    ],
    { connection: connectionName, timeoutMs: 120000 },
  )

  const diagnosticos = await loadDiagnosticosByAtencion(
    connectionName,
    rows.map((row) => row.IdAtencion),
  )

  return rows.map((row) => {
    const dx = diagnosticos.get(Number(row.IdAtencion)) ?? []
    return {
      NRO_DE_CUENTA: normalizeExportCell(row.IdCuentaAtencion),
      ESTADO_CUENTA: normalizeExportCell(row.EstadoCuenta),
      FECHA_CREA_CUENTA: normalizeExportCell(row.FechaCreaOrden || row.FechaRegistroCuenta),
      UPSS_ATENCION: normalizeExportCell(row.UpssAtencion),
      CONSULTORIO_ATENCION: normalizeExportCell(row.ConsultorioAtencion),
      FECHA_PROBABLE: combineLegacyDateAndTime(row.FechaActividad, row.HoraIngreso),
      INICIO_ATENCION: normalizeExportCell(row.FyHInicioI),
      FIN_DE_ATENCION: normalizeExportCell(row.FyHFinal),
      NOMBRE_DEL_PACIENTE: normalizeExportCell(row.NombrePaciente),
      ORIGEN_DE_ATENCION: normalizeExportCell(row.OrigenAtencion),
      FUENTE_DE_FINANCIAMIENTO: normalizeExportCell(row.FuenteFinanciamiento),
      ASEGURADORA: normalizeExportCell(row.Aseguradora),
      PRIORIDAD: normalizeExportCell(row.Prioridad),
      PROFESIONAL_ATENDIO: normalizeExportCell(row.ProfesionalAtendio),
      ESPECILIDAD_DE_PROFESIONAL: normalizeExportCell(row.EspecialidadProfesional),
      ESTADO_DE_LA_ATENCION: normalizeExportCell(row.EstadoAtencion),
      CODIGO_DE_EMPLEADO: normalizeExportCell(row.CodigoEmpleado),
      EMPLEADO_CREA: normalizeExportCell(row.EmpleadoCrea),
      TIPO_DE_EMPLEADO: normalizeExportCell(row.TipoEmpleado),
      COD_CIE_1: dx[0]?.codigo ?? '',
      TIPO_CIE_1: dx[0]?.tipo ?? '',
      DESCRIPCION_CIE_1: dx[0]?.descripcion ?? '',
      COD_CIE_2: dx[1]?.codigo ?? '',
      TIPO_CIE_2: dx[1]?.tipo ?? '',
      DESCRIPCION_CIE_2: dx[1]?.descripcion ?? '',
      COD_CIE_3: dx[2]?.codigo ?? '',
      TIPO_CIE_3: dx[2]?.tipo ?? '',
      DESCRIPCION_CIE_3: dx[2]?.descripcion ?? '',
      ESTABLECIMIENTO_DE_SALUD_ADSCRIPCION: normalizeExportCell(row.EessAdscripcion),
    }
  })
}

async function loadRecoveredTelemonitoreoRows({ startDate, endDate, connectionName, accountIds }) {
  if (!startDate || !endDate || !Array.isArray(accountIds) || accountIds.length === 0) {
    return []
  }

  const accountList = accountIds
    .map((value) => Number(value))
    .filter((value) => Number.isFinite(value))

  if (accountList.length === 0) {
    return []
  }

  const rows = await executeQuery(
    `
    SELECT
      SR.des_Servicio AS Servicio,
      S.des_Consultorio AS Consultorio,
      ACT.FechaActividad AS FechaActividad,
      ISNULL(TE.Turno, '') AS Turno,
      A.HoraIngreso,
      ES.Nombre AS EstablecimientoSalud,
      DR.NroReferencia AS NroReferencia,
      DR.FechaReferencia AS FechaReferencia,
      ADA.NroExpediente AS NroExpediente,
      P.NroHistoriaClinica AS NroHistoriaClinica,
      A.IdCuentaAtencion AS Cuenta,
      UPPER(LTRIM(RTRIM(P.ApellidoPaterno)) + ' ' + LTRIM(RTRIM(P.ApellidoMaterno)) + ' ' + RTRIM(LTRIM(ISNULL(P.PrimerNombre, ''))) +
        CASE WHEN P.SegundoNombre IS NULL THEN '' ELSE ' ' END + RTRIM(LTRIM(ISNULL(P.SegundoNombre, ''))) +
        CASE WHEN P.TercerNombre IS NULL THEN '' ELSE ' ' END + RTRIM(LTRIM(ISNULL(P.TercerNombre, '')))) AS NombrePaciente,
      TD.Descripcion AS TipoDocumento,
      P.NroDocumento AS NroDocumento,
      UPPER(TS.Descripcion) AS Sexo,
      A.Edad AS Edad,
      UPPER(TED.Descripcion) AS TipoEdad,
      P.Telefono AS Telefono1,
      P.Telefono2 AS Telefono2,
      P.Telefono3 AS Telefono3,
      EM.DNI AS NroDocumentoProfesional,
      UPPER(EM.ApellidoPaterno + ' ' + EM.ApellidoMaterno + ' ' + EM.Nombres) AS NombreProfesional,
      TEM.Descripcion AS EspecialidadProfesional,
      ISNULL(DA.Descripcion, 'NO ATENDIDO') AS DestinoAtencion,
      CASE WHEN ADA.AltaDefinitiva = 1 THEN 'Alta Definitiva' ELSE '' END AS TipoAlta,
      CAST(CAST(ADA.ProximaCita AS date) AS varchar(10)) AS ProximaCita,
      ADA.MotivoProximaCita AS MotivoCita,
      ISNULL(CASE WHEN RX.idCuentaAtencion IS NULL THEN 'NO' ELSE 'SI' END, '') AS EmitioReceta,
      ISNULL(CASE
        WHEN RX.Ctda_Pedida >= RX.Ctda_Despcahada AND RX.Ctda_Despcahada > 0 THEN 'SI'
        WHEN RX.Ctda_Despcahada = 0 AND RX.Ctda_Pedida > 0 THEN 'NO'
      END, '') AS AtendioReceta,
      EC.Descripcion AS EstadoCuenta,
      UPPER(EM1.ApellidoPaterno + ' ' + EM1.ApellidoMaterno + ' ' + EM1.Nombres) AS CreaCuenta,
      CASE WHEN (
        SELECT COUNT(A1.IdAtencion)
        FROM SIGH..Atenciones A1
        LEFT JOIN SIGH..FacturacionCuentasAtencion FC1 ON FC1.IdCuentaAtencion = A1.IdCuentaAtencion
        WHERE A1.IdPaciente = A.IdPaciente
          AND A1.FechaIngreso <= A.FechaIngreso
          AND A1.IdEstadoAtencion IN (1, 2)
          AND FC1.IdEstado <> 9
      ) <= 1 THEN 'Nuevo' ELSE 'Continuador' END AS CondicionPaciente,
      CASE WHEN A.FyHInicioI IS NULL THEN 'NO' ELSE 'SI' END AS SeAtendio,
      CASE WHEN D5.idCuentaAtencion IS NULL THEN 'NO' ELSE 'SI' END AS FichaHcFirmada,
      CASE WHEN D4.idCuentaAtencion IS NULL THEN 'NO' ELSE 'SI' END AS FuaFirmada,
      FF.Descripcion AS FuenteFinanciamiento
    FROM SIGH..Atenciones A WITH (NOLOCK)
    LEFT JOIN SIGH..Citas C WITH (NOLOCK) ON C.IdAtencion = A.IdAtencion
    LEFT JOIN SIGH..ProgramacionMedica PM WITH (NOLOCK) ON PM.IdProgramacion = C.IdProgramacion
    LEFT JOIN SIGH..Turnos T WITH (NOLOCK) ON T.IdTurno = PM.IdTurno
    LEFT JOIN SIGH..TurnoE TE WITH (NOLOCK) ON TE.IdTurno = T.IdTurno
    LEFT JOIN SIGH_EST..T_Upss_Consultorio S WITH (NOLOCK) ON S.cod_Consultorio = A.IdServicioIngreso
    LEFT JOIN SIGH_EST..T_Upss_Servicio SR WITH (NOLOCK) ON SR.cod_Servicio = S.cod_Servicio
    LEFT JOIN SIGH..Pacientes P WITH (NOLOCK) ON P.IdPaciente = A.IdPaciente
    LEFT JOIN SIGH..TiposDocIdentidad TD WITH (NOLOCK) ON TD.IdDocIdentidad = P.IdDocIdentidad
    LEFT JOIN SIGH..Medicos ME WITH (NOLOCK) ON ME.IdMedico = A.IdMedicoIngreso
    LEFT JOIN SIGH..Empleados EM WITH (NOLOCK) ON EM.IdEmpleado = ME.IdEmpleado
    LEFT JOIN SIGH..TiposEmpleado TEM WITH (NOLOCK) ON TEM.IdTipoEmpleado = EM.IdTipoEmpleado
    LEFT JOIN SIGH..TiposEdad TED WITH (NOLOCK) ON TED.IdTipoEdad = A.IdTipoEdad
    LEFT JOIN SIGH..TiposSexo TS WITH (NOLOCK) ON TS.IdTipoSexo = P.IdTipoSexo
    LEFT JOIN SIGH..TiposDestinoAtencion DA WITH (NOLOCK) ON DA.IdDestinoAtencion = A.IdDestinoAtencion
    LEFT JOIN SIGH..AtencionesDatosAdicionales ADA WITH (NOLOCK) ON ADA.IdAtencion = A.IdAtencion
    LEFT JOIN SIGH..Establecimientos ES WITH (NOLOCK) ON ES.IdEstablecimiento = ADA.IdEstablecimientoOrigen
    LEFT JOIN SIGH..DetalleReferencia DR WITH (NOLOCK) ON DR.IdAtencion = A.IdAtencion
    LEFT JOIN SIGH..FacturacionCuentasAtencion FC WITH (NOLOCK) ON FC.IdCuentaAtencion = A.IdCuentaAtencion
    LEFT JOIN SIGH..EstadosCuenta EC WITH (NOLOCK) ON EC.IdEstado = FC.IdEstado
    LEFT JOIN SIGH..Empleados EM1 WITH (NOLOCK) ON EM1.IdEmpleado = FC.IdUsuarioCrea
    LEFT JOIN SIGH..FuentesFinanciamiento FF WITH (NOLOCK) ON FF.IdFuenteFinanciamiento = A.idFuenteFinanciamiento
    LEFT JOIN (
      SELECT idCuentaAtencion, MIN(CAST(FechaReceta AS date)) AS FechaActividad
      FROM SIGH..RecetaCabecera WITH (NOLOCK)
      WHERE idEstado IN (1, 2, 3)
        AND CAST(FechaReceta AS date) BETWEEN @fecha_inicio AND @fecha_fin
      GROUP BY idCuentaAtencion
    ) ACT ON ACT.idCuentaAtencion = A.IdCuentaAtencion
    LEFT JOIN (
      SELECT RC.idCuentaAtencion, SUM(RD.CantidadPedida) AS Ctda_Pedida, SUM(RDI.CantidadDespachada) AS Ctda_Despcahada
      FROM SIGH..RecetaCabecera RC WITH (NOLOCK)
      LEFT JOIN SIGH..RecetaDetalle RD WITH (NOLOCK) ON RD.idReceta = RC.idReceta
      LEFT JOIN SIGH..RecetaDetalleItem RDI WITH (NOLOCK) ON RDI.idReceta = RD.idReceta AND RDI.idItem = RD.idItem
      WHERE RC.idEstado IN (1, 2, 3) AND RC.idPuntoCarga = 5
      GROUP BY RC.idCuentaAtencion
    ) RX ON RX.idCuentaAtencion = A.IdCuentaAtencion
    LEFT JOIN (
      SELECT idCuentaAtencion, tipoDocumento
      FROM SIGH..documentos_firmados
      WHERE tipoDocumento IN ('FUA') AND estado = 1
    ) D4 ON D4.idCuentaAtencion = A.IdCuentaAtencion
    LEFT JOIN (
      SELECT idCuentaAtencion, tipoDocumento
      FROM SIGH..documentos_firmados
      WHERE tipoDocumento IN ('HistoriaClinica') AND estado = 1
    ) D5 ON D5.idCuentaAtencion = A.IdCuentaAtencion
    WHERE A.IdCuentaAtencion IN (${accountList.join(', ')})
      AND ACT.FechaActividad IS NOT NULL
      AND CAST(A.FechaIngreso AS date) NOT BETWEEN @fecha_inicio AND @fecha_fin
      AND A.idEstadoAtencion IN (1, 2)
      AND S.cod_EsServicioCE IN (0, 1, 2, 3, 4)
      AND S.cod_upss IN (1, 5)
    `,
    [
      { name: 'fecha_inicio', type: sql.NVarChar, value: startDate },
      { name: 'fecha_fin', type: sql.NVarChar, value: endDate },
    ],
    { connection: connectionName, timeoutMs: 120000 },
  )

  return rows.map((row) => ({
    ORD: '',
    SERVICIO: normalizeExportCell(row.Servicio),
    CONSULTORIO: normalizeExportCell(row.Consultorio),
    FECHA_ATENCION: extractLegacyDatePart(row.FechaActividad),
    TURNO: normalizeExportCell(row.Turno),
    HORA_ATENCION: normalizeExportCell(row.HoraIngreso),
    ESTABLECIMIENTO_DE_SALUD: normalizeExportCell(row.EstablecimientoSalud),
    NRO_DE_REFERENCIA: normalizeExportCell(row.NroReferencia),
    FECHA_DE_REFERENCIA: normalizeExportCell(row.FechaReferencia),
    NRO_DE_EXPEDIENTE: normalizeExportCell(row.NroExpediente),
    NRO_DE_HISTORIA_CLINICA: normalizeExportCell(row.NroHistoriaClinica),
    CUENTA: normalizeExportCell(row.Cuenta),
    NOMBRES_DE_PACIENTE: normalizeExportCell(row.NombrePaciente),
    TIPO_DOCUMENTO: normalizeExportCell(row.TipoDocumento),
    NRO_DE_DOCUMENTO: normalizeExportCell(row.NroDocumento),
    SEXO: normalizeExportCell(row.Sexo),
    EDAD: normalizeExportCell(row.Edad),
    TIPOEDAD: normalizeExportCell(row.TipoEdad),
    TELEFONO_1: normalizeExportCell(row.Telefono1),
    TELEFONO_2: normalizeExportCell(row.Telefono2),
    TELEFONO_3: normalizeExportCell(row.Telefono3),
    NRO_DOCUMENTO_PROFESIONAL: normalizeExportCell(row.NroDocumentoProfesional),
    NOMBRE_PROFESIONAL: normalizeExportCell(row.NombreProfesional),
    ESPECIALIDAD_DE_PROFESIONAL: normalizeExportCell(row.EspecialidadProfesional),
    DESTINO_ATENCION: normalizeExportCell(row.DestinoAtencion),
    TIPO_ALTA: normalizeExportCell(row.TipoAlta),
    PROXIMA_CITA: normalizeExportCell(row.ProximaCita),
    MOTIVO_CITA: normalizeExportCell(row.MotivoCita),
    EMITIO_RECETA: normalizeExportCell(row.EmitioReceta),
    ATENDIO_RECETA: normalizeExportCell(row.AtendioReceta),
    ESTADO_CUENTA: normalizeExportCell(row.EstadoCuenta),
    CREA_CUENTA: normalizeExportCell(row.CreaCuenta),
    CONDICION_PACIENTE: normalizeExportCell(row.CondicionPaciente),
    SE_ATENDIO: normalizeExportCell(row.SeAtendio),
    FICHA_HC_FIRMADA: normalizeExportCell(row.FichaHcFirmada),
    FUA_FIRMADA: normalizeExportCell(row.FuaFirmada),
    FUENTE_FINANCIAMIENTO: normalizeExportCell(row.FuenteFinanciamiento),
  }))
}

function mapRangeHistoriasClinicasRows(rows) {
  return rows.map((row) => mapRangeHistoriasClinicasRow(row))
}

function mapRangePacientesFallecidosRows(rows) {
  return rows.map((row) => mapRangePacientesFallecidosRow(row))
}

function mapRangeReferidosRows(rows) {
  return rows.map((row) => mapRangeReferidosRow(row))
}

function mapRangeMonitoreoDengueRows(rows) {
  return rows.map((row) => mapRangeMonitoreoDengueRow(row))
}

function mapRangeProduccionTicketRows(rows) {
  return rows.map((row) => mapRangeProduccionTicketRow(row))
}

async function mapRangeTelemonitoreoRows(rows, context = {}) {
  const mappedRows = rows.map((row) => mapRangeTelemonitoreoRow(row))
  const pendingAccountIds = getPendingRecoveryAccountIds(
    context.key,
    mappedRows.map((row) => row.CUENTA),
  )

  if (pendingAccountIds.length === 0) {
    return reindexMappedTelemonitoreoRows(mappedRows)
  }

  const recoveredRows = await loadRecoveredTelemonitoreoRows({
    startDate: context.startDate,
    endDate: context.endDate,
    connectionName: context.connectionName,
    accountIds: pendingAccountIds,
  })

  return reindexMappedTelemonitoreoRows(
    mergeMappedRowsByKey(mappedRows, recoveredRows, 'CUENTA'),
  )
}

function mapRangeProdAdmRows(rows) {
  return rows.map((row) => mapRangeProdAdmRow(row))
}

const ALTAS_RANGE_TEMPLATE = createRangeTemplate({
  tipoReporte: 'Reporte de Nominal de Pacientes con Alta Médica',
  labelColor: 'E7F5FE',
  valueEndCol: 6,
  columns: [
    { key: 'ORD', label: 'ORD', width: 8, headerColor: 'D9D9D9', align: 'center' },
    { key: 'UPSS_EGRESO', label: 'UPSS EGRESO', width: 22, headerColor: 'D9D9D9' },
    { key: 'SERVICIO_EGRESO', label: 'SERVICIO EGRESO', width: 28, headerColor: 'D9D9D9' },
    { key: 'FECHA_EGRESO', label: 'FECHA EGRESO', width: 16, headerColor: 'D9D9D9', format: 'excel-date', numFmt: 'dd/mm/yyyy', align: 'center' },
    { key: 'HORA_EGRESO', label: 'HORA EGRESO', width: 14, headerColor: 'D9D9D9', format: 'excel-time', numFmt: 'hh:mm', align: 'center' },
    { key: 'NRO_CUENTA', label: 'NRO CUENTA', width: 14, headerColor: 'D9D9D9', align: 'center' },
    { key: 'APELLIDOS_Y_NOMBRES', label: 'APELLIDOS Y NOMBRES', width: 36, headerColor: 'D9D9D9' },
    { key: 'TIPO_DOCUMENTO', label: 'TIPO DOCUMENTO', width: 16, headerColor: 'D9D9D9' },
    { key: 'NRO_DOCUMENTO', label: 'NRO DOCUMENTO', width: 16, headerColor: 'D9D9D9', asText: true, align: 'left' },
    { key: 'NRO_HISTORIA', label: 'NRO HISTORIA', width: 16, headerColor: 'D9D9D9', asText: true, align: 'left' },
    { key: 'TELEFONOS_REFERENCIA', label: 'TELEFONOS REFERENCIA', width: 20, headerColor: 'D9D9D9' },
    { key: 'EDAD', label: 'EDAD', width: 8, headerColor: 'D9D9D9', align: 'center' },
    { key: 'TIPO_EDAD', label: 'TIPO EDAD', width: 10, headerColor: 'D9D9D9', align: 'center' },
    { key: 'SEXO', label: 'SEXO', width: 8, headerColor: 'D9D9D9', align: 'center' },
    { key: 'IAFAS_SEGURO', label: 'IAFAS/SEGURO', width: 16, headerColor: 'D9D9D9', align: 'center' },
    { key: 'TIPO_PRUEBA', label: 'TIPO PRUEBA', width: 16, headerColor: 'D9D9D9', align: 'center' },
    { key: 'RESULTADO', label: 'RESULTADO', width: 14, headerColor: 'D9D9D9', align: 'center' },
    { key: 'FECHA_DE_INGRESO', label: 'FECHA DE INGRESO', width: 18, headerColor: 'D9D9D9', format: 'excel-date', numFmt: 'dd/mm/yyyy', align: 'center' },
    { key: 'HORA_DE_INGRESO', label: 'HORA DE INGRESO', width: 14, headerColor: 'D9D9D9', format: 'excel-time', numFmt: 'hh:mm', align: 'center' },
    { key: 'DIAS_HOSP', label: 'DIAS HOSP', width: 10, headerColor: 'D9D9D9', align: 'center' },
    { key: 'CIEX_DX', label: 'CIEX DX', width: 12, headerColor: 'D9D9D9', align: 'center' },
    { key: 'TIPO_DX', label: 'TIPO DX', width: 12, headerColor: 'D9D9D9', align: 'center' },
    { key: 'NOMBRE_DX', label: 'NOMBRE DX', width: 34, headerColor: 'D9D9D9' },
    { key: 'DESTINO_PACIENTE', label: 'DESTINO PACIENTE', width: 20, headerColor: 'D9D9D9' },
    { key: 'CONDICION_PACIENTE', label: 'CONDICION PACIENTE', width: 18, headerColor: 'D9D9D9' },
    { key: 'FECHA_RESULTADO_POS', label: 'FECHA RESULTADO(+)', width: 18, headerColor: '83F998', format: 'excel-date', numFmt: 'dd/mm/yyyy', align: 'center' },
    { key: 'RESULTADO_POS', label: 'RESULTADO(+)', width: 14, headerColor: '83F998', align: 'center' },
    { key: 'TIPO_MUESTRA_POS', label: 'TIPO MUESTRA(+)', width: 18, headerColor: '83F998', align: 'center' },
    { key: 'TIPO_PRUEBA_POS', label: 'TIPO PRUEBA(+)', width: 18, headerColor: '83F998', align: 'center' },
    { key: 'FECHA_RESULTADO_NEG', label: 'FECHA RESULTADO(-)', width: 18, headerColor: '83F998', format: 'excel-date', numFmt: 'dd/mm/yyyy', align: 'center' },
    { key: 'RESULTADO_NEG', label: 'RESULTADO(-)', width: 14, headerColor: '83F998', align: 'center' },
    { key: 'TIPO_MUESTRA_NEG', label: 'TIPO MUESTRA(-)', width: 18, headerColor: '83F998', align: 'center' },
    { key: 'TIPO_PRUEBA_NEG', label: 'TIPO PRUEBA(-)', width: 18, headerColor: '83F998', align: 'center' },
    { key: 'FICHA', label: 'FICHA', width: 10, headerColor: 'D9D9D9', align: 'center' },
    { key: 'CONDICION', label: 'CONDICION', width: 14, headerColor: 'D9D9D9', align: 'center' },
  ],
})

const SIN_FIRMA_RANGE_TEMPLATE = createRangeTemplate({
  tipoReporte: 'Listado de Historias Clinicas y Recetas SIN firma Electronica',
  labelColor: 'E7F5FE',
  valueEndCol: 6,
  columns: [
    { key: 'NRO_CUENTA', label: 'Nro Cuenta', width: 14, headerColor: '9FDEEF', align: 'center' },
    { key: 'NOMBRE_PACIENTE', label: 'Nombre Paciente', width: 34, headerColor: '9FDEEF' },
    { key: 'NRO_DOCUMENTO', label: 'Nro Documento', width: 16, headerColor: '9FDEEF', asText: true, align: 'left' },
    { key: 'NRO_HISTORIA_CLINICA', label: 'Nro Historia Clinica', width: 18, headerColor: '9FDEEF', asText: true, align: 'left' },
    { key: 'TIPO_DOCUMENTO', label: 'Tipo Documento', width: 16, headerColor: '9FDEEF' },
    { key: 'FECHA_ATENCION', label: 'Fecha Atencion', width: 16, headerColor: '9FDEEF', format: 'excel-date', numFmt: 'dd/mm/yyyy', align: 'center' },
    { key: 'UPSS', label: 'UPSS', width: 24, headerColor: '9FDEEF' },
    { key: 'CONSULTORIO', label: 'Consultorio', width: 28, headerColor: '9FDEEF' },
    { key: 'TIPO_EMPLEADO', label: 'Tipo Empleado', width: 24, headerColor: '9FDEEF' },
    { key: 'EMPLEADO', label: 'Empleado', width: 30, headerColor: '9FDEEF' },
    { key: 'ESTADO_FIRMA', label: 'Estado Firma', width: 14, headerColor: '9FDEEF', align: 'center' },
    { key: 'CONDICION_PACIENTE', label: 'Condicion Paciente', width: 18, headerColor: '9FDEEF' },
    { key: 'ESTADO_ATENCION', label: 'Estado Atencion', width: 20, headerColor: '9FDEEF' },
  ],
})

const NUEVOS_EMERGENCIA_RANGE_TEMPLATE = createRangeTemplate({
  tipoReporte: 'LISTADO NOMINAL DE INGRESOS NUEVOS EN LOS SERVICIOS DE EMERGENCIA',
  labelColor: '75ABFD',
  valueEndCol: 6,
  columns: [
    { key: 'ORD', label: 'ORD', width: 8, headerColor: 'A9F5D0', align: 'center' },
    { key: 'AREA_SERVICIO_TOPICO', label: 'AREA/SERVICIO/TOPICO', width: 28, headerColor: 'A9F5D0' },
    { key: 'FECHA_INGRESO', label: 'FECHA INGRESO', width: 16, headerColor: 'A9F5D0', format: 'excel-date', numFmt: 'dd/mm/yyyy', align: 'center' },
    { key: 'HORA_INGRESO', label: 'HORA INGRESO', width: 14, headerColor: 'A9F5D0', format: 'excel-time', numFmt: 'hh:mm', align: 'center' },
    { key: 'NRO_HISTORIA', label: 'NRO. HISTORIA', width: 16, headerColor: 'A9F5D0', asText: true, align: 'left' },
    { key: 'NRO_CUENTA', label: 'NRO. CUENTA', width: 14, headerColor: 'A9F5D0', align: 'center' },
    { key: 'NOMBRE_DEL_PACIENTE', label: 'NOMBRE DEL PACIENTE', width: 34, headerColor: 'A9F5D0' },
    { key: 'TIPO_DOCUMENTO', label: 'TIPO DOCUMENTO', width: 16, headerColor: 'A9F5D0' },
    { key: 'NRO_DE_DOCUMENTO', label: 'NRO DE DOCUMENTO', width: 16, headerColor: 'A9F5D0', asText: true, align: 'left' },
    { key: 'SEXO', label: 'SEXO', width: 8, headerColor: 'A9F5D0', align: 'center' },
    { key: 'EDAD', label: 'EDAD', width: 8, headerColor: 'A9F5D0', align: 'center' },
    { key: 'TIPO_EDAD', label: 'TIPO EDAD', width: 12, headerColor: 'A9F5D0', align: 'center' },
    { key: 'DESTINO_ATENCION', label: 'DESTINO ATENCION', width: 22, headerColor: 'A9F5D0' },
    { key: 'PRIORIDAD', label: 'PRIORIDAD', width: 14, headerColor: 'A9F5D0', align: 'center' },
    { key: 'FINANCIAMIENTO', label: 'FINANCIAMIENTO', width: 16, headerColor: 'A9F5D0', align: 'center' },
    { key: 'ESTADO_CUENTA', label: 'ESTADO CUENTA', width: 20, headerColor: 'A9F5D0' },
    { key: 'CREA_CUENTA', label: 'CREA CUENTA', width: 28, headerColor: 'A9F5D0' },
  ],
})

const NUEVOS_UCA_RANGE_TEMPLATE = createRangeTemplate({
  tipoReporte: 'LISTADO NOMINAL DE INGRESOS NUEVOS EN LOS SERVICIOS DE ATENCION DE CIRUGIA AMBULATORIA-UCA',
  labelColor: '75ABFD',
  valueEndCol: 6,
  columns: [
    { key: 'ORD', label: 'ORD', width: 8, headerColor: 'A9F5D0', align: 'center' },
    { key: 'AREA_SERVICIO_TOPICO', label: 'AREA/SERVICIO/TOPICO', width: 34, headerColor: 'A9F5D0' },
    { key: 'FECHA_INGRESO', label: 'FECHA INGRESO', width: 16, headerColor: 'A9F5D0', format: 'excel-date', numFmt: 'dd/mm/yyyy', align: 'center' },
    { key: 'HORA_INGRESO', label: 'HORA INGRESO', width: 14, headerColor: 'A9F5D0', format: 'excel-time', numFmt: 'hh:mm', align: 'center' },
    { key: 'NRO_HISTORIA', label: 'NRO. HISTORIA', width: 16, headerColor: 'A9F5D0', asText: true, align: 'left' },
    { key: 'NRO_CUENTA', label: 'NRO. CUENTA', width: 14, headerColor: 'A9F5D0', align: 'center' },
    { key: 'NOMBRE_DEL_PACIENTE', label: 'NOMBRE DEL PACIENTE', width: 34, headerColor: 'A9F5D0' },
    { key: 'TIPO_DOCUMENTO', label: 'TIPO DOCUMENTO', width: 16, headerColor: 'A9F5D0' },
    { key: 'NRO_DE_DOCUMENTO', label: 'NRO DE DOCUMENTO', width: 16, headerColor: 'A9F5D0', asText: true, align: 'left' },
    { key: 'SEXO', label: 'SEXO', width: 8, headerColor: 'A9F5D0', align: 'center' },
    { key: 'EDAD', label: 'EDAD', width: 8, headerColor: 'A9F5D0', align: 'center' },
    { key: 'TIPO_EDAD', label: 'TIPO EDAD', width: 12, headerColor: 'A9F5D0', align: 'center' },
    { key: 'DESTINO_ATENCION', label: 'DESTINO ATENCION', width: 22, headerColor: 'A9F5D0' },
    { key: 'FINANCIAMIENTO', label: 'FINANCIAMIENTO', width: 16, headerColor: 'A9F5D0', align: 'center' },
    { key: 'ESTADO_CUENTA', label: 'ESTADO CUENTA', width: 20, headerColor: 'A9F5D0' },
    { key: 'CREA_CUENTA', label: 'CREA CUENTA', width: 28, headerColor: 'A9F5D0' },
  ],
})

const ATENDIDOS_RANGE_TEMPLATE = createRangeTemplate({
  tipoReporte: 'Reporte de Nominal de Pacientes Admisionados',
  labelColor: 'E7F5FE',
  valueEndCol: 5,
  columns: [
    { key: 'NRO_DE_CUENTA', label: 'NRO DE CUENTA', width: 14, headerColor: '81BEF7', align: 'center' },
    { key: 'ESTADO_CUENTA', label: 'ESTADO CUENTA', width: 18, headerColor: '81BEF7' },
    { key: 'FECHA_CREA_CUENTA', label: 'FECHA CREA CUENTA', width: 22, headerColor: '81BEF7', format: 'excel-datetime', numFmt: 'dd/mm/yyyy hh:mm:ss', align: 'center' },
    { key: 'UPSS_ATENCION', label: 'UPSS ATENCION', width: 24, headerColor: '81BEF7' },
    { key: 'CONSULTORIO_ATENCION', label: 'CONSULTORIO ATENCION', width: 28, headerColor: '81BEF7' },
    { key: 'FECHA_PROBABLE', label: 'FECHA PROBABLE', width: 22, headerColor: '81BEF7', format: 'excel-datetime', numFmt: 'dd/mm/yyyy hh:mm:ss', align: 'center' },
    { key: 'INICIO_ATENCION', label: 'INICIO ATENCION', width: 18, headerColor: '81BEF7', format: 'excel-datetime', numFmt: 'yyyy-mm-dd hh:mm', align: 'center' },
    { key: 'FIN_DE_ATENCION', label: 'FIN DE ATENCION', width: 18, headerColor: '81BEF7', format: 'excel-datetime', numFmt: 'yyyy-mm-dd hh:mm', align: 'center' },
    { key: 'NOMBRE_DEL_PACIENTE', label: 'NOMBRE DEL PACIENTE', width: 34, headerColor: '81BEF7' },
    { key: 'ORIGEN_DE_ATENCION', label: 'ORIGEN DE ATENCION', width: 18, headerColor: '81BEF7' },
    { key: 'FUENTE_DE_FINANCIAMIENTO', label: 'FUENTE DE FINANCIAMIENTO', width: 20, headerColor: '81BEF7' },
    { key: 'ASEGURADORA', label: 'ASEGURADORA', width: 24, headerColor: '81BEF7' },
    { key: 'PRIORIDAD', label: 'PRIORIDAD', width: 14, headerColor: '81BEF7', align: 'center' },
    { key: 'PROFESIONAL_ATENDIO', label: 'PROFESIONAL ATENDIO', width: 30, headerColor: '81BEF7' },
    { key: 'ESPECILIDAD_DE_PROFESIONAL', label: 'ESPECILIDAD DE PROFESIONAL', width: 28, headerColor: '81BEF7' },
    { key: 'ESTADO_DE_LA_ATENCION', label: 'ESTADO DE LA ATENCION', width: 20, headerColor: '81BEF7' },
    { key: 'CODIGO_DE_EMPLEADO', label: 'CODIGO DE EMPLEADO', width: 16, headerColor: '81BEF7', align: 'center' },
    { key: 'EMPLEADO_CREA', label: 'EMPLEADO CREA', width: 28, headerColor: '81BEF7' },
    { key: 'TIPO_DE_EMPLEADO', label: 'TIPO DE EMPLEADO', width: 20, headerColor: '81BEF7' },
    { key: 'COD_CIE_1', label: 'COD CIE 1', width: 12, headerColor: '81BEF7', align: 'center' },
    { key: 'TIPO_CIE_1', label: 'TIPO CIE 1', width: 12, headerColor: '81BEF7', align: 'center' },
    { key: 'DESCRIPCION_CIE_1', label: 'DESCRIPCION CIE 1', width: 34, headerColor: '81BEF7' },
    { key: 'COD_CIE_2', label: 'COD CIE 2', width: 12, headerColor: '81BEF7', align: 'center' },
    { key: 'TIPO_CIE_2', label: 'TIPO CIE 2', width: 12, headerColor: '81BEF7', align: 'center' },
    { key: 'DESCRIPCION_CIE_2', label: 'DESCRIPCION CIE 2', width: 34, headerColor: '81BEF7' },
    { key: 'COD_CIE_3', label: 'COD CIE 3', width: 12, headerColor: '81BEF7', align: 'center' },
    { key: 'TIPO_CIE_3', label: 'TIPO CIE 3', width: 12, headerColor: '81BEF7', align: 'center' },
    { key: 'DESCRIPCION_CIE_3', label: 'DESCRIPCION CIE 3', width: 34, headerColor: '81BEF7' },
    { key: 'ESTABLECIMIENTO_DE_SALUD_ADSCRIPCION', label: 'ESTABLECIMIENTO DE SALUD ADSCRIPCION', width: 34, headerColor: '81BEF7' },
  ],
})

function mapRangeAltasRow(row) {
  const condicionPaciente = normalizeExportCell(col(row, 'CONDICIONPACIENTE'))
  const resultado = normalizeExportCell(col(row, 'RESULTADO'))

  return {
    ORD: normalizeExportCell(col(row, 'NRO_ORD')),
    UPSS_EGRESO: normalizeExportCell(col(row, 'UPSS')),
    SERVICIO_EGRESO: normalizeExportCell(col(row, 'SERVICIO')),
    FECHA_EGRESO: normalizeExportCell(col(row, 'FECHAEGRESO')),
    HORA_EGRESO: normalizeExportCell(col(row, 'HORAEGRESO')),
    NRO_CUENTA: normalizeExportCell(col(row, 'IDCUENTA')),
    APELLIDOS_Y_NOMBRES: normalizeExportCell(col(row, 'PACIENTE')),
    TIPO_DOCUMENTO: normalizeExportCell(col(row, 'TIPO_DOC')),
    NRO_DOCUMENTO: normalizeExportCell(col(row, 'NRO_DOC')),
    NRO_HISTORIA: normalizeExportCell(col(row, 'NRO_HISTORIA')),
    TELEFONOS_REFERENCIA: normalizeExportCell(col(row, 'TELEFONO')),
    EDAD: normalizeExportCell(col(row, 'EDAD')),
    TIPO_EDAD: normalizeExportCell(col(row, 'TIPO_EDAD')),
    SEXO: normalizeExportCell(col(row, 'TIPO_SEXO')),
    IAFAS_SEGURO: normalizeExportCell(col(row, 'SEGURO')),
    TIPO_PRUEBA: normalizeExportCell(col(row, 'TIPO_MUESTRA')),
    RESULTADO: resultado,
    FECHA_DE_INGRESO: normalizeExportCell(col(row, 'FECHA_INGRESO')),
    HORA_DE_INGRESO: normalizeExportCell(col(row, 'HORAINGRESO')),
    DIAS_HOSP: normalizeExportCell(col(row, 'DIAS_HOSP')),
    CIEX_DX: normalizeExportCell(col(row, 'DX_EGRESO')),
    TIPO_DX: normalizeExportCell(col(row, 'TIPO_DX')),
    NOMBRE_DX: normalizeExportCell(col(row, 'DES_DX')),
    DESTINO_PACIENTE: normalizeExportCell(col(row, 'DESTINOPACIENTE')),
    CONDICION_PACIENTE: condicionPaciente,
    FECHA_RESULTADO_POS: normalizeExportCell(col(row, 'FECHARESULTADO')),
    RESULTADO_POS: resultado,
    TIPO_MUESTRA_POS: normalizeExportCell(col(row, 'TIPOMUESTRA')),
    TIPO_PRUEBA_POS: normalizeExportCell(col(row, 'TIPOPRUEBA')),
    FECHA_RESULTADO_NEG: normalizeExportCell(col(row, 'FECHARESULTADO_N')),
    RESULTADO_NEG: normalizeExportCell(col(row, 'RESULTADO_N')),
    TIPO_MUESTRA_NEG: normalizeExportCell(col(row, 'TIPOMUESTRA_N')),
    TIPO_PRUEBA_NEG: normalizeExportCell(col(row, 'TIPOPRUEBA_N')),
    FICHA: normalizeExportCell(col(row, 'TIENEFICHA')),
    CONDICION: condicionPaciente,
  }
}

function mapRangeSinFirmaRow(row) {
  return {
    NRO_CUENTA: normalizeExportCell(col(row, 'IDCUENTA')),
    NOMBRE_PACIENTE: normalizeExportCell(col(row, 'NOMBREPACIENTE')),
    NRO_DOCUMENTO: normalizeExportCell(col(row, 'NRODOCUMENTO')),
    NRO_HISTORIA_CLINICA: normalizeExportCell(col(row, 'HISTORIACLINICA')),
    TIPO_DOCUMENTO: normalizeExportCell(col(row, 'TIPODOCUMENTO')),
    FECHA_ATENCION: normalizeExportCell(col(row, 'FECHAATENCION')),
    UPSS: normalizeExportCell(col(row, 'UPSS')),
    CONSULTORIO: normalizeExportCell(col(row, 'CONSULTORIO')),
    TIPO_EMPLEADO: normalizeExportCell(col(row, 'TIPOEMPLEADO')),
    EMPLEADO: normalizeExportCell(col(row, 'EMPLEADO')),
    ESTADO_FIRMA: normalizeExportCell(col(row, 'ESTADOFIRMA')),
    CONDICION_PACIENTE: normalizeExportCell(col(row, 'CONDICIONPACIENTE')),
    ESTADO_ATENCION: normalizeExportCell(col(row, 'DESTINOATENCION')),
  }
}

function mapRangeNuevosEmergenciaRow(row) {
  return {
    ORD: normalizeExportCell(col(row, 'ORD')),
    AREA_SERVICIO_TOPICO: normalizeExportCell(col(row, 'SERVICIO')),
    FECHA_INGRESO: normalizeExportCell(col(row, 'FECHAING')),
    HORA_INGRESO: normalizeExportCell(col(row, 'HORAING')),
    NRO_HISTORIA: normalizeExportCell(col(row, 'NROHISTORIA')),
    NRO_CUENTA: normalizeExportCell(col(row, 'IDCUENTA')),
    NOMBRE_DEL_PACIENTE: normalizeExportCell(col(row, 'NOMBREPACIENTE')),
    TIPO_DOCUMENTO: normalizeExportCell(col(row, 'TIPODOCUMENTO')),
    NRO_DE_DOCUMENTO: normalizeExportCell(col(row, 'NRODOCUMENTO')),
    SEXO: normalizeExportCell(col(row, 'SEXO')),
    EDAD: normalizeExportCell(col(row, 'EDAD')),
    TIPO_EDAD: normalizeExportCell(col(row, 'TIPOEDAD')),
    DESTINO_ATENCION: normalizeExportCell(col(row, 'DESTINOATC')),
    PRIORIDAD: normalizeExportCell(col(row, 'PRIORIDAD')),
    FINANCIAMIENTO: normalizeExportCell(col(row, 'FTEFTO')),
    ESTADO_CUENTA: normalizeExportCell(col(row, 'ESTADOCUENTA')),
    CREA_CUENTA: normalizeExportCell(col(row, 'EMPLEADOCREA')),
  }
}

function mapRangeNuevosUcaRow(row) {
  return {
    ORD: normalizeExportCell(col(row, 'ORD')),
    AREA_SERVICIO_TOPICO: normalizeExportCell(col(row, 'SERVICIO')),
    FECHA_INGRESO: normalizeExportCell(col(row, 'FECHAING')),
    HORA_INGRESO: normalizeExportCell(col(row, 'HORAING')),
    NRO_HISTORIA: normalizeExportCell(col(row, 'NROHISTORIA')),
    NRO_CUENTA: normalizeExportCell(col(row, 'IDCUENTA')),
    NOMBRE_DEL_PACIENTE: normalizeExportCell(col(row, 'NOMBREPACIENTE')),
    TIPO_DOCUMENTO: normalizeExportCell(col(row, 'TIPODOCUMENTO')),
    NRO_DE_DOCUMENTO: normalizeExportCell(col(row, 'NRODOCUMENTO')),
    SEXO: normalizeExportCell(col(row, 'SEXO')),
    EDAD: normalizeExportCell(col(row, 'EDAD')),
    TIPO_EDAD: normalizeExportCell(col(row, 'TIPOEDAD')),
    DESTINO_ATENCION: normalizeExportCell(col(row, 'DESTINOATC')),
    FINANCIAMIENTO: normalizeExportCell(col(row, 'FTEFTO')),
    ESTADO_CUENTA: normalizeExportCell(col(row, 'ESTADOCUENTA')),
    CREA_CUENTA: normalizeExportCell(col(row, 'EMPLEADOCREA')),
  }
}

function mapRangeAtendidosRow(row) {
  return {
    NRO_DE_CUENTA: normalizeExportCell(col(row, 'IDCUENTAATENCION')),
    ESTADO_CUENTA: normalizeExportCell(col(row, 'ESTADOCUENTA')),
    FECHA_CREA_CUENTA: normalizeExportCell(col(row, 'FECHACREACTA')),
    UPSS_ATENCION: normalizeExportCell(col(row, 'DES_UPSS')),
    CONSULTORIO_ATENCION: normalizeExportCell(col(row, 'DES_CONSULTORIO')),
    FECHA_PROBABLE: normalizeExportCell(col(row, 'FECHAPROBABLE')),
    INICIO_ATENCION: normalizeExportCell(col(row, 'INICIOATENCION')),
    FIN_DE_ATENCION: normalizeExportCell(col(row, 'FINATENCION')),
    NOMBRE_DEL_PACIENTE: normalizeExportCell(col(row, 'NOMBREPACIENTE')),
    ORIGEN_DE_ATENCION: normalizeExportCell(col(row, 'ORIGENATC')),
    FUENTE_DE_FINANCIAMIENTO: normalizeExportCell(col(row, 'FTEFTO')),
    ASEGURADORA: normalizeExportCell(col(row, 'ASEGURADORA')),
    PRIORIDAD: normalizeExportCell(col(row, 'TIPOGRAVEDAD')),
    PROFESIONAL_ATENDIO: normalizeExportCell(col(row, 'MEDICO')),
    ESPECILIDAD_DE_PROFESIONAL: normalizeExportCell(col(row, 'ESPECIALIDAD_MED')),
    ESTADO_DE_LA_ATENCION: normalizeExportCell(col(row, 'ESTADOATENCION')),
    CODIGO_DE_EMPLEADO: normalizeExportCell(col(row, 'CODIGOUSUARIO')),
    EMPLEADO_CREA: normalizeExportCell(col(row, 'USUARIO_CREA')),
    TIPO_DE_EMPLEADO: normalizeExportCell(col(row, 'USUARIO_EMPLEO')),
    COD_CIE_1: normalizeExportCell(col(row, 'DX1')),
    TIPO_CIE_1: normalizeExportCell(col(row, 'TIPODX1')),
    DESCRIPCION_CIE_1: normalizeExportCell(col(row, 'DESDX1')),
    COD_CIE_2: normalizeExportCell(col(row, 'DX2')),
    TIPO_CIE_2: normalizeExportCell(col(row, 'TIPODX2')),
    DESCRIPCION_CIE_2: normalizeExportCell(col(row, 'DESDX2')),
    COD_CIE_3: normalizeExportCell(col(row, 'DX3')),
    TIPO_CIE_3: normalizeExportCell(col(row, 'TIPODX3')),
    DESCRIPCION_CIE_3: normalizeExportCell(col(row, 'DESDX3')),
    ESTABLECIMIENTO_DE_SALUD_ADSCRIPCION: normalizeExportCell(col(row, 'EESS')),
  }
}

function mapRangeAltasRows(rows) {
  return rows.map((row) => mapRangeAltasRow(row))
}

function mapRangeSinFirmaRows(rows) {
  return rows.map((row) => mapRangeSinFirmaRow(row))
}

function mapRangeNuevosEmergenciaRows(rows) {
  return rows.map((row) => mapRangeNuevosEmergenciaRow(row))
}

function mapRangeNuevosUcaRows(rows) {
  return rows.map((row) => mapRangeNuevosUcaRow(row))
}

async function mapRangeAtendidosRows(rows, context = {}) {
  const mappedRows = rows.map((row) => mapRangeAtendidosRow(row))
  const pendingAccountIds = getPendingRecoveryAccountIds(
    context.key,
    mappedRows.map((row) => row.NRO_DE_CUENTA),
  )

  if (pendingAccountIds.length === 0) {
    return mappedRows
  }

  const recoveredRows = await loadRecoveredAtendidosRows({
    startDate: context.startDate,
    endDate: context.endDate,
    connectionName: context.connectionName,
    accountIds: pendingAccountIds,
  })

  return sortMappedAtendidosRows(
    mergeMappedRowsByKey(mappedRows, recoveredRows, 'NRO_DE_CUENTA'),
  )
}

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
    template: HISTORIAS_CLINICAS_RANGE_TEMPLATE,
    rowsMapper: mapRangeHistoriasClinicasRows,
  },
  exporta_d_xls_2: {
    procedure: 'SP_REPORTE_D_EXCEL2',
    fileName: 'atenciones-telemonitoreo.xlsx',
    maxDays: 31,
    template: TELEMONITOREO_RANGE_TEMPLATE,
    rowsMapper: mapRangeTelemonitoreoRows,
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
    template: ALTAS_RANGE_TEMPLATE,
    rowsMapper: mapRangeAltasRows,
  },
  exporta_d_xls_6: {
    procedure: 'SP_REPORTE_D_EXCEL6',
    fileName: 'pacientes-fallecidos.xlsx',
    maxDays: 31,
    template: FALLECIDOS_RANGE_TEMPLATE,
    rowsMapper: mapRangePacientesFallecidosRows,
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
    template: REFERIDOS_RANGE_TEMPLATE,
    rowsMapper: mapRangeReferidosRows,
  },
  exporta_d_xls_8: {
    procedure: 'SP_REPORTE_D_EXCEL8',
    fileName: 'pacientes-atendidos.xlsx',
    maxDays: 31,
    template: ATENDIDOS_RANGE_TEMPLATE,
    rowsMapper: mapRangeAtendidosRows,
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
    maxDays: 31,
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
    template: NUEVOS_EMERGENCIA_RANGE_TEMPLATE,
    rowsMapper: mapRangeNuevosEmergenciaRows,
  },
  exporta_d_xls_14: {
    procedure: 'SP_REPORTE_D_EXCEL14',
    fileName: 'pacientes-nuevos-uca.xlsx',
    maxDays: 31,
    template: NUEVOS_UCA_RANGE_TEMPLATE,
    rowsMapper: mapRangeNuevosUcaRows,
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
    template: MONITOREO_DENGUE_RANGE_TEMPLATE,
    rowsMapper: mapRangeMonitoreoDengueRows,
  },
  exporta_d_xls_18: {
    procedure: 'SP_REPORTE_D_EXCEL16',
    fileName: 'usuarios-apertura-cuentas.xlsx',
    maxDays: 31,
    template: PROD_ADM_RANGE_TEMPLATE,
    rowsMapper: mapRangeProdAdmRows,
  },
  exporta_d_xls_19: {
    procedure: 'SP_REPORTE_D_EXCEL18',
    fileName: 'produccion_ticket.xlsx',
    maxDays: 10,
    template: PRODUCCION_TICKET_RANGE_TEMPLATE,
    rowsMapper: mapRangeProduccionTicketRows,
  },
  exporta_d_xls_20: {
    procedure: 'SP_REPORTE_D_EXCEL20',
    fileName: 'historias-recetas-sin-firma.xlsx',
    maxDays: 31,
    template: SIN_FIRMA_RANGE_TEMPLATE,
    rowsMapper: mapRangeSinFirmaRows,
  },
  exporta_d_xls_21: {
    procedure: 'SP_REPORTE_D_EXCEL21_DENGUE_SIN_SIGNOS_ALARMA',
    fileName: 'pacientes-dengue-sin-signos-alarma.xlsx',
    maxDays: 92,
    template: createDengueSinSignosAlarmaTemplate(),
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

const LAVADO_REPORTE_TEMPLATE = {
  sheetName: 'Registro Lavado de Manos',
  spacerRows: 1,
  metadata: [
    { label: 'Desde', value: '{{startDate}}' },
    { label: 'Hasta', value: '{{endDate}}' },
    { label: 'Fecha y Hora de Reporte', value: '{{reportDateTime}}' },
    { label: 'Tipo de reporte', value: 'Listado de Registros realizados en Monitoreo y Evaluacion de Lavado de Manos' },
  ],
  metadataLayout: {
    labelStartCol: 1,
    labelEndCol: 2,
    valueStartCol: 3,
    valueEndCol: 6,
    labelColor: 'E7F5FE',
  },
  columns: [
    { key: 'Metodo',       label: 'Metodo',           width: 14, headerColor: '70D3FE' },
    { key: 'idregistro',   label: 'Idregistro',       width: 11, headerColor: '70D3FE', align: 'center' },
    { key: 'fechareg1',    label: 'Fecha Registro',   width: 23, headerColor: '70D3FE', format: 'datetime-sql-legacy' },
    { key: 'nro_documento',label: 'Nro Documento',    width: 16, headerColor: '70D3FE', asText: true, align: 'left' },
    { key: 'empleado',     label: 'Usuario Evaluado', width: 36, headerColor: '96FCF3' },
    { key: 'nombre_cargo', label: 'Profesion',        width: 24, headerColor: '96FCF3' },
    { key: 'upss',         label: 'Upss',             width: 20, headerColor: '96FCF3' },
    { key: 'servicio',     label: 'Servicio',         width: 24, headerColor: '96FCF3' },
    { key: 'observacion',  label: 'Observacion',      width: 34, headerColor: '96FCF3' },
    { key: 'tiempo',       label: 'Tiempo',           width: 12, headerColor: '96FCF3', align: 'center' },
    { key: 'idactividad',  label: 'IdActividad',      width: 12, headerColor: '96FCF3', align: 'center' },
    { key: 'actividad',    label: 'Actividad',        width: 36, headerColor: '96FCF3' },
    { key: 'valoractividad', label: 'Valor Actividad', width: 14, headerColor: '96FCF3', align: 'center' },
    { key: 'omision',      label: 'Omision',          width: 10, headerColor: '96FCF3', align: 'center', blankWhenZero: true },
    { key: 'lavado',       label: 'Lavado',           width: 10, headerColor: '96FCF3', align: 'center', blankWhenZero: true },
    { key: 'friccion',     label: 'Friccion',         width: 10, headerColor: '96FCF3', align: 'center', blankWhenZero: true },
    { key: 'guantes',      label: 'Guantes',          width: 10, headerColor: '96FCF3', align: 'center', blankWhenZero: true },
  ],
}

const LAVADO_EXPORTS = {
  listado_registro: {
    procedure: 'SP_EPI_REPORTE_LAVADO',
    fileName: 'registro-lavado-de-manos.xlsx',
    template: LAVADO_REPORTE_TEMPLATE,
  },
}

function createDengueSinSignosAlarmaTemplate() {
  return {
    sheetName: 'Dengue sin signos',
    spacerRows: 1,
    headerRowHeight: 28,
    dataRowHeight: 18,
    autoFilter: true,
    metadata: [
      { label: 'Reporte', value: 'Pacientes con diagnostico A97.0 - Dengue sin signos de alarma' },
      { label: 'Intervalo de fechas', value: '{{dateRange}}' },
      { label: 'Diagnostico', value: 'CIE-10 A97.0 - Dengue sin signos de alarma' },
      { label: 'Fuente', value: 'SisGalenPlus' },
    ],
    metadataLayout: {
      labelStartCol: 1,
      labelEndCol: 3,
      valueStartCol: 4,
      valueEndCol: 8,
      labelColor: 'D9EAF7',
    },
    columns: [
    { key: 'IDATENCION', label: 'IDATENCION', width: 12, headerColor: 'E7F5FE', align: 'center' },
    { key: 'CUENTA', label: 'CUENTA', width: 12, headerColor: 'E7F5FE', align: 'center' },
    { key: 'UPSS', label: 'UPSS', width: 24, headerColor: 'D9EAF7' },
    { key: 'SERVICIO_EGRESO', label: 'SERVICIO EGRESO', width: 28, headerColor: 'D9EAF7' },
    { key: 'FECHA_EGRESO', label: 'FECHA EGRESO', width: 15, headerColor: 'D9EAF7', format: 'excel-date', numFmt: 'dd/mm/yyyy', align: 'center' },
    { key: 'CONDICION_ALTA', label: 'CONDICION ALTA', width: 16, headerColor: 'D9EAF7', align: 'center' },
    { key: 'PACIENTE', label: 'PACIENTE', width: 42, headerColor: 'E2F6E8' },
    { key: 'EDAD', label: 'EDAD', width: 8, headerColor: 'E2F6E8', align: 'center' },
    { key: 'TIPO_EDAD', label: 'TIPO EDAD', width: 12, headerColor: 'E2F6E8', align: 'center' },
    { key: 'SEXO', label: 'SEXO', width: 12, headerColor: 'E2F6E8', align: 'center' },
    { key: 'TELEFONO', label: 'TELEFONO', width: 16, headerColor: 'E2F6E8', asText: true },
    { key: 'TELEFONO_2', label: 'TELEFONO 2', width: 16, headerColor: 'E2F6E8', asText: true },
    { key: 'FECHA_INGRESO', label: 'FECHA INGRESO', width: 15, headerColor: 'FFF2CC', format: 'excel-date', numFmt: 'dd/mm/yyyy', align: 'center' },
    { key: 'FECHA_HORA_INGRESO', label: 'FECHA Y HORA INGRESO', width: 21, headerColor: 'FFF2CC', format: 'excel-datetime', numFmt: 'dd/mm/yyyy hh:mm', align: 'center' },
    { key: 'FECHA_INICIO_SINTOMAS', label: 'FECHA INICIO SINTOMAS', width: 21, headerColor: 'FFF2CC', format: 'excel-date', numFmt: 'dd/mm/yyyy', align: 'center' },
    { key: 'DISTRITO_FICHA', label: 'DISTRITO FICHA', width: 22, headerColor: 'EADCF8' },
    { key: 'DISTRITO_PROCEDENCIA_ARBO', label: 'DISTRITO PROCEDENCIA ARBO', width: 28, headerColor: 'EADCF8' },
    { key: 'DISTRITO_DOMICILIO', label: 'DISTRITO DOMICILIO', width: 24, headerColor: 'EADCF8' },
    { key: 'SERVICIO_INGRESO', label: 'SERVICIO INGRESO', width: 28, headerColor: 'D9EAF7' },
    { key: 'ORIGEN_ATENCION', label: 'ORIGEN ATENCION', width: 24, headerColor: 'D9EAF7' },
    { key: 'MES_INGRESO', label: 'MES INGRESO', width: 12, headerColor: 'FFF2CC', align: 'center' },
    { key: 'GRUPO_EDAD', label: 'GRUPO EDAD', width: 15, headerColor: 'E2F6E8', align: 'center' },
    { key: 'DISTRITO_PACIENTE', label: 'DISTRITO PACIENTE', width: 24, headerColor: 'EADCF8' },
    { key: 'FECHA_REGISTRO_ARBO', label: 'FECHA REGISTRO ARBO', width: 21, headerColor: 'FFF2CC', format: 'excel-datetime', numFmt: 'dd/mm/yyyy hh:mm', align: 'center' },
    { key: 'ORDEN_GRUPO_EDAD', label: 'ORDEN GRUPO EDAD', width: 16, headerColor: 'E2F6E8', align: 'center' },
    ],
  }
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
      { title: 'PSIQUIATRIA', color: '#FA7985', keys: ['p1','p2','p3'] },
      { title: 'PSICOTERAPIA INDIVIDUAL', color: '#FEF170', keys: ['x1','x2','x3','x4','x5','x6'] },
      { title: 'INTERVENCION FAMILIAR', color: '#A8FE91', keys: ['y1','y2'] },
      { title: 'REDES DE APOYO O VISITA DOMICILIARIA', color: '#96FCF3', keys: ['z1'] },
    ],
  },

  exporta_xls_2: {
    tipoReporte: '0060614 - TRATAMIENTO DE NI\u00D1OS, NI\u00D1AS Y ADOLESCENTES AFECTADOS POR MALTRATO INFANTIL',
    metaColspan: 11,
    groups: [
      { title: 'PSIQUIATRIA', color: '#FA7985', keys: ['p1','p2'] },
      { title: 'PSICOTERAPIA INDIVIDUAL', color: '#FEF170', keys: ['x1','x2','x3','x4','x5','x6'] },
      { title: 'INTERVENCION FAMILIAR', color: '#A8FE91', keys: ['y1','y2'] },
      { title: 'REDES DE APOYO O VISITA DOMICILIARIA', color: '#96FCF3', keys: ['z1'] },
    ],
  },

  exporta_xls_3: {
    tipoReporte: '0070611 TRATAMIENTO AMBULATORIO DE PERSONAS CON ANSIEDAD',
    metaColspan: 12,
    groups: [
      { title: 'PSIQUIATRIA', color: '#FA7985', keys: ['p1','p2','p3'] },
      { title: 'PSICOTERAPIA INDIVIDUAL', color: '#FEF170', keys: ['x1','x2','x3','x4','x5','x6'] },
      { title: 'INTERVENCION FAMILIAR', color: '#A8FE91', keys: ['y1','y2'] },
      { title: 'REDES DE APOYO O VISITA DOMICILIARIA', color: '#96FCF3', keys: ['z1'] },
    ],
  },

  exporta_xls_4: {
    tipoReporte: '0070612 - TRATAMIENTO ESPECIALIZADO EN VIOLENCIA FAMILIAR',
    metaColspan: 11,
    headerLabels: { hc: 'HC' },
    groups: [
      { title: 'PSIQUIATRIA', color: '#FA7985', keys: ['p1','p2'] },
      { title: 'PSICOTERAPIA INDIVIDUAL', color: '#FEF170', keys: ['x1','x2','x3','x4','x5','x6'] },
      { title: 'INTERVENCION FAMILIAR', color: '#A8FE91', keys: ['y1','y2'] },
      { title: 'REDES DE APOYO O VISITA DOMICILIARIA', color: '#96FCF3', keys: ['z1'] },
    ],
  },

  exporta_xls_5: {
    tipoReporte: '5005190 TRATAMIENTO AMBULATORIO DE PERSONAS CON DEPRESI\u00D3N MODERADA',
    metaColspan: 12,
    groups: [
      { title: 'PSIQUIATRIA', color: '#FA7985', keys: ['p1','p2','p3'] },
      { title: 'PSICOTERAPIA INDIVIDUAL', color: '#FEF170', keys: ['x1','x2','x3','x4','x5','x6'] },
      { title: 'INTERVENCION FAMILIAR', color: '#A8FE91', keys: ['y1','y2'] },
      { title: 'REDES DE APOYO O VISITA DOMICILIARIA', color: '#96FCF3', keys: ['z1'] },
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

  exporta_xls_7: {
    tipoReporte: '5005927 TRATAMIENTO AMBULATORIO DE NI\u00D1OS Y NI\u00D1AS Y ADOLESCENTES DE 0 A 17 A\u00D1OS POR TRASTORNOS MENTALES Y DEL COMPORTAMIENTO',
    metaColspan: 12,
    groups: [
      { title: 'PSIQUIATRIA', color: '#FA7985', keys: ['p1','p2'] },
      { title: 'PSICOTERAPIA INDIVIDUAL', color: '#FEF170', keys: ['x1','x2','x3','x4','x5','x6'] },
      { title: 'INTERVENCION FAMILIAR', color: '#A8FE91', keys: ['y1','y2','y3'] },
      { title: 'REDES DE APOYO O VISITA DOMICILIARIA', color: '#96FCF3', keys: ['z1'] },
    ],
  },

  exporta_xls_8: {
    tipoReporte: '0070615 TRATAMIENTO ESPECIALIZADO NI\u00D1OS, NI\u00D1AS Y ADOLESCENTES AFECTADOS POR VIOLENCIA SEXUAL',
    metaColspan: 11,
    groups: [
      { title: 'PSIQUIATRIA', color: '#FA7985', keys: ['p1','p2'] },
      { title: 'PSICOTERAPIA INDIVIDUAL', color: '#FEF170', keys: ['x1','x2','x3','x4','x5','x6'] },
      { title: 'INTERVENCION FAMILIAR', color: '#A8FE91', keys: ['y1','y2'] },
      { title: 'REDES DE APOYO O VISITA DOMICILIARIA', color: '#96FCF3', keys: ['z1'] },
    ],
  },

  exporta_xls_9: {
    tipoReporte: '0070616 - TRATAMIENTO AMBULATORIO DE NI\u00D1OS Y NI\u00D1AS DE 0 A 17 A\u00D1OS CON TRASTORNOS DEL ESPECTRO AUTISTA',
    metaColspan: 15,
    groups: [
      { title: 'PSIQUIATRIA', color: '#FA7985', keys: ['p1','p2'] },
      { title: 'PSICOTERAPIA INDIVIDUAL', color: '#FEF170', keys: ['x1','x2','x3','x4','x5','x6'] },
      { title: 'INTERVENCION GRUPAL / TERAPIA OCUPACIONAL / TERAPIA DE LENGUAJE', color: '#A8FE91', keys: ['y1','y2','y3','y4','y5','y6'] },
      { title: 'REDES DE APOYO O VISITA DOMICILIARIA', color: '#96FCF3', keys: ['z1'] },
    ],
  },

  exporta_xls_10: {
    tipoReporte: '5005195 TRATAMIENTO AMBULATORIO A PERSONAS CON S\u00EDNDROME PSIC\u00D3TICO O TRASTORNO DEL ESPECTRO DE LA ESQUIZOFRENIA',
    metaColspan: 12,
    groups: [
      { title: 'PSIQUIATRIA', color: '#FA7985', keys: ['p1','p2','p3'] },
      { title: 'PSICOTERAPIA INDIVIDUAL', color: '#FEF170', keys: ['x1','x2','x3','x4','x5','x6'] },
      { title: 'INTERVENCION FAMILIAR', color: '#A8FE91', keys: ['y1','y2'] },
      { title: 'REDES DE APOYO O VISITA DOMICILIARIA', color: '#96FCF3', keys: ['z1'] },
    ],
  },

  exporta_xls_11: {
    tipoReporte: '5005192 INTERVENCIONES BREVES MOTIVACIONALES PARA PERSONAS CON CONSUMO PERJUDICIAL DEL ALCOHOL Y TABACO.',
    metaColspan: 5,
    groups: [
      { title: 'PSIQUIATRIA / CONSEJERIA', color: '#FA7985', keys: ['p1'] },
      { title: 'INTERVENCION BREVE', color: '#70D3FE', keys: ['s1','s2','s3','s4'] },
    ],
  },

  exporta_xls_12: {
    tipoReporte: 'TRATAMIENTO AMBULATORIO PARA PERSONAS CON DETERIORO COGNITIVO',
    metaColspan: 16,
    groups: [
      { title: 'PSIQUIATRIA', color: '#FA7985', keys: ['p1','p2','p3','p4'] },
      { title: 'REHABILITACION COGNITIVA', color: '#FEF170', keys: ['x1','x2','x3','x4','x5','x6'] },
      { title: 'PSICOEDUCACION A FAMILIA', color: '#A8FE91', keys: ['y1','y2'] },
      { title: 'TERAPIA OCUPACIONAL GRUPAL / TERAPIAS FISICAS', color: '#96FCF3', keys: ['z1','z2','z3','z4'] },
    ],
  },

  exporta_xls_13: {
    tipoReporte: '0060613 - TRATAMIENTO ESPECIALIZADO DE PERSONAS POR VIOLENCIA SEXUAL',
    metaColspan: 11,
    groups: [
      { title: 'PSIQUIATRIA', color: '#FA7985', keys: ['p1','p2'] },
      { title: 'PSICOTERAPIA INDIVIDUAL', color: '#FEF170', keys: ['x1','x2','x3','x4','x5','x6'] },
      { title: 'INTERVENCION FAMILIAR', color: '#A8FE91', keys: ['y1','y2'] },
      { title: 'REDES DE APOYO O VISITA DOMICILIARIA', color: '#96FCF3', keys: ['z1'] },
    ],
  },

  exporta_xls_14: {
    tipoReporte: 'INTERVENCI\u00D3N PARA PERSONA CON DEPENDENCIA DE ALCOHOL Y TABACO',
    metaColspan: 12,
    groups: [
      { title: 'PSIQUIATRIA', color: '#FA7985', keys: ['p1','p2','p3','p4'] },
      { title: 'ENTREVISTAS MOTIVACIONALES', color: '#FEF170', keys: ['x1','x2'] },
      { title: 'PSICOTERAPIA INDIVIDUAL', color: '#A8FE91', keys: ['y1','y2','y3','y4'] },
      { title: 'INTERVENCION FAMILIAR', color: '#96FCF3', keys: ['z1','z2'] },
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

function normalizeAuthText(value) {
  if (value === null || value === undefined) {
    return ''
  }

  return String(value).trim().replace(/\s+/g, ' ')
}

function hasLetters(value) {
  return /[A-Za-zÁÉÍÓÚÑáéíóúñ]/.test(value)
}

function resolveEmployeeName(row) {
  const candidates = [
    row.NOMBRES,
    row.nombres,
    row.EMPLEADO,
    row.empleado,
    row.NOMBRE_COMPLETO,
    row.nombre_completo,
    row.NOMBRE,
    row.nombre,
    row.USUARIO_NOMBRE,
    row.usuario_nombre,
    row.USU_NOMBRE,
    row.usu_nombre,
  ]
    .map(normalizeAuthText)
    .filter(Boolean)

  // Prioriza valores con letras para evitar propagar DNI/identificadores numericos.
  const namedCandidate = candidates.find(hasLetters)

  return namedCandidate ?? candidates[0] ?? ''
}

const LEGACY_AUTH_PROCEDURES = {
  general: { procedure: 'SP_USUARIO_VALIDA', paramStyle: 'legacy', connection: 'sigh1' },
  lavado: { procedure: 'SP_USUARIO_VALIDA_LM', paramStyle: 'legacy' },
  'epidemiologia/pacientes-oncologicos': { procedure: 'SP_USUARIO_VALIDA_EPI_ONCOLOGICOS', paramStyle: 'legacy' },
  'epidemiologia/pfa-sifilis-sarampion': { procedure: 'SP_USUARIO_VALIDA_EPI_PFA_SIFILIS_SARAMPION', paramStyle: 'legacy' },
  'epidemiologia/isqx': { procedure: 'SP_USUARIO_VALIDA_EPI_ISQX', paramStyle: 'legacy' },
  'epidemiologia/mordedura-canina': { procedure: 'SP_USUARIO_VALIDA_EPI_MORDEDURA_CANINA', paramStyle: 'legacy' },
  'epidemiologia/cirugia-procedimiento': { procedure: 'SP_USUARIO_VALIDA_EPI_CIRUGIA_PROCEDIMIENTO', paramStyle: 'legacy' },
  'epidemiologia/seguimiento-dengue': { procedure: 'SP_USUARIO_VALIDA_EPI_SEGUIMIENTO_DENGUE', paramStyle: 'legacy' },
  'zona-descarga/morbilidad-materna': { procedure: 'SP_USUARIO_VALIDA_MORBILIDAD_MATERNA', paramStyle: 'legacy' },
  'zona-descarga/dengue-sin-signos-alarma': { procedure: 'SP_USUARIO_VALIDA_DENGUE_SIN_SIGNOS_ALARMA', paramStyle: 'legacy' },
}

export function hasLegacyAuthScope(scope) {
  return Object.prototype.hasOwnProperty.call(LEGACY_AUTH_PROCEDURES, scope)
}

function buildAuthParams({ dni, password, ip, paramStyle }) {
  if (paramStyle === 'legacy') {
    return [
      { name: 'usuario', type: sql.VarChar(20), value: String(dni ?? '').substring(0, 20) },
      { name: 'clave', type: sql.VarChar(20), value: String(password ?? '').substring(0, 20) },
      { name: 'ipequipo', type: sql.VarChar(20), value: String(ip || '0.0.0.0').substring(0, 20) },
    ]
  }

  return [
    { name: 'dni', type: sql.NVarChar, value: dni },
    { name: 'password', type: sql.NVarChar, value: password },
    { name: 'ip', type: sql.NVarChar, value: ip },
  ]
}

export async function validateLegacyUser({ dni, password, ip, scope = 'general' }) {
  const authDefinition = LEGACY_AUTH_PROCEDURES[scope] ?? LEGACY_AUTH_PROCEDURES.general
  const rows = await executeProcedure(
    authDefinition.procedure,
    buildAuthParams({ dni, password, ip, paramStyle: authDefinition.paramStyle }),
    { connection: authDefinition.connection ?? 'general' },
  )

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
    employeeName: resolveEmployeeName(row),
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

export class ExportValidationError extends Error {
  constructor(message) {
    super(message)
    this.name = 'ExportValidationError'
    this.statusCode = 400
  }
}

function isDateOnly(value) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(String(value ?? ''))) {
    return false
  }

  const date = new Date(`${value}T00:00:00.000Z`)
  return !Number.isNaN(date.getTime()) && date.toISOString().slice(0, 10) === value
}

function daysBetween(startDate, endDate) {
  const start = new Date(startDate)
  const end = new Date(endDate)
  return Math.floor((end.getTime() - start.getTime()) / 86400000) + 1
}

function requiresDateRange(catalog) {
  return ['range', 'salud-mental', 'lavado'].includes(catalog)
}

function validateExportDateRange({ catalog, exportDefinition, startDate, endDate }) {
  if (!requiresDateRange(catalog)) {
    return
  }

  if (!startDate || !endDate) {
    throw new ExportValidationError('Debe indicar fecha de inicio y fecha fin.')
  }

  if (!isDateOnly(startDate) || !isDateOnly(endDate)) {
    throw new ExportValidationError('Las fechas deben tener formato YYYY-MM-DD.')
  }

  const diff = daysBetween(startDate, endDate)
  if (diff <= 0) {
    throw new ExportValidationError('La fecha de inicio no puede ser mayor que la fecha fin.')
  }

  if (exportDefinition.maxDays && diff > exportDefinition.maxDays) {
    throw new ExportValidationError(`El rango de fechas no debe exceder ${exportDefinition.maxDays} dias.`)
  }
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
    throw new ExportValidationError('No se encontro la configuracion del exporte solicitado.')
  }

  validateExportDateRange({ catalog, exportDefinition, startDate, endDate })

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

  if (typeof exportDefinition.customBuilder === 'function') {
    const customResult = await exportDefinition.customBuilder({
      catalog,
      key,
      employeeId: Number(employeeId) || 0,
      ip,
      startDate,
      endDate,
      params,
      fileName: exportDefinition.fileName,
      connectionName: exportDefinition.connection ?? resolveCatalogConnection(catalog),
    })

    if (!customResult?.content) {
      throw new Error('No se pudo construir el archivo exportable solicitado.')
    }

    return {
      fileName: customResult.fileName ?? exportDefinition.fileName,
      mimeType: customResult.mimeType ?? MIME_XLSX,
      content: customResult.content,
      rowCount: Number.isFinite(Number(customResult.rowCount))
        ? Number(customResult.rowCount)
        : 0,
    }
  }

  const rows = await executeProcedure(exportDefinition.procedure, params, {
    timeoutMs: 900000,
    connection: exportDefinition.connection ?? resolveCatalogConnection(catalog),
  })
  const mappedRows =
    typeof exportDefinition.rowsMapper === 'function'
      ? await exportDefinition.rowsMapper(rows, {
          catalog,
          key,
          startDate,
          endDate,
          connectionName: exportDefinition.connection ?? resolveCatalogConnection(catalog),
        })
      : typeof exportDefinition.rowMapper === 'function'
        ? rows.map((row) => exportDefinition.rowMapper(row))
        : rows

  // Build real XLSX — pick builder by priority:
  //   1. salud-mental   → structured two-level header workbook
  //   2. template       → tabulated workbook with explicit column mapping
  //   3. default        → simple flat-dump workbook
  const mhConfig = catalog === 'salud-mental' ? getMentalHealthConfig(key) : null

  const content = await (mhConfig
    ? buildStructuredWorkbook({
        config: mhConfig,
        rows: mappedRows,
        startDate,
        endDate,
        title: exportDefinition.fileName,
      })
    : exportDefinition.template
      ? buildTabulatedWorkbook({
          template: exportDefinition.template,
          rows: mappedRows,
          title: exportDefinition.fileName,
          startDate,
          endDate,
        })
      : buildSimpleWorkbook({
          title: exportDefinition.fileName,
          rows: mappedRows,
        }))

  return {
    fileName: exportDefinition.fileName,
    mimeType: MIME_XLSX,
    content,
    rowCount: mappedRows.length,
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
