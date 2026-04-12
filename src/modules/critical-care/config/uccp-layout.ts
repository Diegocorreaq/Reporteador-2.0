import type {
  CriticalCareLayoutConfig,
  CriticalCareTableColumn,
} from '@/modules/critical-care/types'

function column(
  key: string,
  label: string,
  options: Partial<CriticalCareTableColumn> = {},
): CriticalCareTableColumn {
  return {
    key,
    label,
    align: 'left',
    ...options,
  }
}

const YEAR_COLUMN = column('anio', 'Anio', { aliases: ['ANIO'], align: 'center' })
const MONTH_COLUMN = column('nmes', 'MES', { aliases: ['mes', 'NMES', 'MES'], align: 'center' })
const PRIORIDAD_COLUMN = column('prioridad', 'Prioridad', {
  aliases: ['PRIORIDAD', 'PRIORIDAD_RPTA'],
})
const UPSS_COLUMN = column('upss', 'UPSS', { aliases: ['UPSS'], collapseDuplicates: true })

const MONTHLY_TOTAL_COLUMNS: CriticalCareTableColumn[] = [
  column('total', 'TOTAL', { aliases: ['TOTAL'], align: 'right', sum: true }),
  column('ene', 'ENE', { aliases: ['ENE'], align: 'right', sum: true }),
  column('feb', 'FEB', { aliases: ['FEB'], align: 'right', sum: true }),
  column('mar', 'MAR', { aliases: ['MAR'], align: 'right', sum: true }),
  column('abr', 'ABR', { aliases: ['ABR'], align: 'right', sum: true }),
  column('may', 'MAY', { aliases: ['MAY'], align: 'right', sum: true }),
  column('jun', 'JUN', { aliases: ['JUN'], align: 'right', sum: true }),
  column('jul', 'JUL', { aliases: ['JUL'], align: 'right', sum: true }),
  column('agt', 'AGT', { aliases: ['AGT', 'AGO'], align: 'right', sum: true }),
  column('sep', 'SEP', { aliases: ['SEP'], align: 'right', sum: true }),
  column('oct', 'OCT', { aliases: ['OCT'], align: 'right', sum: true }),
  column('nov', 'NOV', { aliases: ['NOV'], align: 'right', sum: true }),
  column('dic', 'DIC', { aliases: ['DIC'], align: 'right', sum: true }),
]

export const UCCP_LAYOUT: CriticalCareLayoutConfig = {
  module: 'uccp',
  modules: [
    {
      id: 'uccp-1',
      numberLabel: '1.-',
      title: 'Porcentaje de Interconsultas solicitadas a la UCCP',
      blocks: [
        {
          kind: 'table',
          datasetKey: 'uccp8',
          columns: [
            YEAR_COLUMN,
            MONTH_COLUMN,
            column('totint', 'Nro de I/C UCCP', { aliases: ['TOT_INT'], align: 'right', sum: true }),
            column('totuci', 'Nro de IC / TODOS', { aliases: ['TOT_UCI'], align: 'right', sum: true }),
            column('indicador', '%', { aliases: ['INDICADOR'], align: 'right', decimals: 1 }),
          ],
          totals: {
            enabled: true,
            label: 'TOTAL',
            labelColSpan: 2,
            formulas: [
              {
                targetKey: 'indicador',
                numeratorKey: 'totint',
                denominatorKey: 'totuci',
                multiplier: 100,
                decimals: 1,
              },
            ],
          },
        },
      ],
    },
    {
      id: 'uccp-2',
      numberLabel: '2.-',
      title: 'Numero de Interconsultas Respondidas',
      blocks: [
        {
          kind: 'table',
          datasetKey: 'uccp1A',
          columns: [
            YEAR_COLUMN,
            MONTH_COLUMN,
            column('total', 'Total Solicitadas', { aliases: ['TOTAL'], align: 'right', sum: true }),
            column('no_r', 'No Respondidas', { aliases: ['NO_R', 'NO_RPTA', 'NO_RPT'], align: 'right', sum: true }),
            column('si_r', 'Respondidas', { aliases: ['SI_R', 'SI_RPTA', 'SI_RPT'], align: 'right', sum: true }),
          ],
          totals: {
            enabled: true,
            label: 'TOTAL',
            labelColSpan: 2,
          },
        },
        {
          kind: 'chart',
          datasetKey: 'uccp1',
          chartType: 'line',
          title: 'Numero de Interconsultas Respondidas - UCCP',
          seriesField: 'tipo',
          seriesAliases: ['TIPO'],
        },
        {
          kind: 'chart',
          datasetKey: 'uccp2A',
          chartType: 'pie',
          title: 'Porcentaje de Interconsultas por Prioridad',
          categoryField: 'prioridad',
          categoryAliases: ['PRIORIDAD_RPTA', 'PRIORIDAD'],
          valueField: 'total',
          valueAliases: ['TOTAL'],
        },
      ],
    },
    {
      id: 'uccp-3',
      numberLabel: '3.-',
      title: 'Porcentaje y Numero de Interconsultas Respondidas por Prioridad de Respuesta',
      blocks: [
        {
          kind: 'table',
          datasetKey: 'uccp2',
          priorityClickable: true,
          columns: [
            YEAR_COLUMN,
            PRIORIDAD_COLUMN,
            column('porcentaje', '%', { align: 'right', decimals: 1, derivePercentOfKey: 'total' }),
            ...MONTHLY_TOTAL_COLUMNS,
          ],
          totals: {
            enabled: true,
            label: 'TOTAL',
            labelColSpan: 3,
          },
        },
        {
          kind: 'chart',
          datasetKey: 'uccp2',
          chartType: 'line',
          title: 'Numero de Interconsultas por PRIORIDAD',
          seriesField: 'prioridad',
          seriesAliases: ['PRIORIDAD_RPTA', 'PRIORIDAD'],
        },
        {
          kind: 'heading',
          text: 'Promedio de interconsultas respondidas por dia en la UCCP',
        },
        {
          kind: 'table',
          datasetKey: 'uccp9',
          columns: [
            YEAR_COLUMN,
            MONTH_COLUMN,
            column('totint', 'Nro de Interconsultas respondidas', { aliases: ['TOT_INT'], align: 'right', sum: true }),
            column('totdias', 'Nro de Dias realizados', { aliases: ['NRODIAS', 'TOT_DIAS'], align: 'right', sum: true }),
            column('indicador', 'Promedio', { aliases: ['INDICADOR'], align: 'right', decimals: 1 }),
          ],
          totals: {
            enabled: true,
            label: 'TOTAL',
            labelColSpan: 2,
            formulas: [
              {
                targetKey: 'indicador',
                numeratorKey: 'totint',
                denominatorKey: 'totdias',
                decimals: 1,
              },
            ],
          },
        },
      ],
    },
    {
      id: 'uccp-4',
      numberLabel: '4.-',
      title: 'INTERCONSULTAS SOLICITADAS A USNA',
      blocks: [
        {
          kind: 'table',
          datasetKey: 'uccp12',
          columns: [
            YEAR_COLUMN,
            column('especialidad', 'Servicio', { aliases: ['ESPECIALIDAD', 'SERVICIO'] }),
            ...MONTHLY_TOTAL_COLUMNS,
          ],
          totals: {
            enabled: true,
            label: 'TOTAL',
            labelColSpan: 2,
          },
        },
      ],
    },
    {
      id: 'uccp-5',
      numberLabel: '5.-',
      title: 'Tasa de Admision de UCCP',
      blocks: [
        { kind: 'heading', text: 'Contabilidad por Paciente' },
        {
          kind: 'table',
          datasetKey: 'uccp7',
          columns: [
            YEAR_COLUMN,
            MONTH_COLUMN,
            column('ingresos', 'Nro de Pacientes con Ingreso a UCCP', { aliases: ['INGRESOS'], align: 'right', sum: true }),
            column('interco', 'Nro de Pacientes con Interconsultas respondidas por la UCCP', { aliases: ['INTERCO'], align: 'right', sum: true }),
            column('indicador', '%', { aliases: ['INDICADOR'], align: 'right', decimals: 1 }),
          ],
          totals: {
            enabled: true,
            label: 'TOTAL',
            labelColSpan: 2,
            formulas: [
              {
                targetKey: 'indicador',
                numeratorKey: 'interco',
                denominatorKey: 'ingresos',
                multiplier: 100,
                decimals: 1,
              },
            ],
          },
        },
        {
          kind: 'table',
          datasetKey: 'uccp7A',
          columns: [YEAR_COLUMN, PRIORIDAD_COLUMN, ...MONTHLY_TOTAL_COLUMNS],
          totals: {
            enabled: true,
            label: 'TOTAL',
            labelColSpan: 2,
          },
        },
        { kind: 'heading', text: 'Contabilidad por Nro de Ingresos' },
        {
          kind: 'table',
          datasetKey: 'uccp7B',
          columns: [
            YEAR_COLUMN,
            MONTH_COLUMN,
            column('ingresos', 'Nro de Ingreso a UCCP', { aliases: ['INGRESOS'], align: 'right', sum: true }),
            column('interco', 'Nro de Interconsultas respondidas por la UCCP', { aliases: ['INTERCO'], align: 'right', sum: true }),
            column('indicador', '%', { aliases: ['INDICADOR'], align: 'right', decimals: 1 }),
          ],
          totals: {
            enabled: true,
            label: 'TOTAL',
            labelColSpan: 2,
            formulas: [
              {
                targetKey: 'indicador',
                numeratorKey: 'interco',
                denominatorKey: 'ingresos',
                multiplier: 100,
                decimals: 1,
              },
            ],
          },
        },
        {
          kind: 'table',
          datasetKey: 'uccp7C',
          columns: [YEAR_COLUMN, PRIORIDAD_COLUMN, ...MONTHLY_TOTAL_COLUMNS],
          totals: {
            enabled: true,
            label: 'TOTAL',
            labelColSpan: 2,
          },
        },
      ],
    },
    {
      id: 'uccp-6',
      numberLabel: '6.-',
      title: 'Promedio de Severidad de Enfermedad (ESCALA APACHE/ESCALA SOFA)',
      blocks: [
        {
          kind: 'table',
          datasetKey: 'uccp13A',
          columns: [
            YEAR_COLUMN,
            column('apache', 'Puntaje Apache', { aliases: ['MEDAPACHE', 'APACHE'], align: 'center' }),
            column('valapache', '%', { aliases: ['VALAPACHE'], align: 'center' }),
            ...MONTHLY_TOTAL_COLUMNS,
          ],
          summaryRows: [
            {
              label: 'Total de Ingresos',
              labelColSpan: 3,
              highlight: true,
              cells: [
                ...MONTHLY_TOTAL_COLUMNS.map((item) => ({
                  targetKey: item.key,
                  operation: 'sum' as const,
                })),
              ],
            },
            {
              label: 'Suma de Apache',
              labelColSpan: 3,
              cells: [
                { targetKey: 'total', operation: 'sum', sourceKey: 'tot1' },
                { targetKey: 'ene', operation: 'sum', sourceKey: 'ene1' },
                { targetKey: 'feb', operation: 'sum', sourceKey: 'feb1' },
                { targetKey: 'mar', operation: 'sum', sourceKey: 'mar1' },
                { targetKey: 'abr', operation: 'sum', sourceKey: 'abr1' },
                { targetKey: 'may', operation: 'sum', sourceKey: 'may1' },
                { targetKey: 'jun', operation: 'sum', sourceKey: 'jun1' },
                { targetKey: 'jul', operation: 'sum', sourceKey: 'jul1' },
                { targetKey: 'agt', operation: 'sum', sourceKey: 'agt1' },
                { targetKey: 'sep', operation: 'sum', sourceKey: 'sep1' },
                { targetKey: 'oct', operation: 'sum', sourceKey: 'oct1' },
                { targetKey: 'nov', operation: 'sum', sourceKey: 'nov1' },
                { targetKey: 'dic', operation: 'sum', sourceKey: 'dic1' },
              ],
            },
            {
              label: 'Promedio',
              labelColSpan: 3,
              highlight: true,
              cells: [
                { targetKey: 'total', operation: 'ratio', numeratorKey: 'tot1', denominatorKey: 'tot', decimals: 1 },
                { targetKey: 'ene', operation: 'ratio', numeratorKey: 'ene1', denominatorKey: 'ene', decimals: 1 },
                { targetKey: 'feb', operation: 'ratio', numeratorKey: 'feb1', denominatorKey: 'feb', decimals: 1 },
                { targetKey: 'mar', operation: 'ratio', numeratorKey: 'mar1', denominatorKey: 'mar', decimals: 1 },
                { targetKey: 'abr', operation: 'ratio', numeratorKey: 'abr1', denominatorKey: 'abr', decimals: 1 },
                { targetKey: 'may', operation: 'ratio', numeratorKey: 'may1', denominatorKey: 'may', decimals: 1 },
                { targetKey: 'jun', operation: 'ratio', numeratorKey: 'jun1', denominatorKey: 'jun', decimals: 1 },
                { targetKey: 'jul', operation: 'ratio', numeratorKey: 'jul1', denominatorKey: 'jul', decimals: 1 },
                { targetKey: 'agt', operation: 'ratio', numeratorKey: 'agt1', denominatorKey: 'agt', decimals: 1 },
                { targetKey: 'sep', operation: 'ratio', numeratorKey: 'sep1', denominatorKey: 'sep', decimals: 1 },
                { targetKey: 'oct', operation: 'ratio', numeratorKey: 'oct1', denominatorKey: 'oct', decimals: 1 },
                { targetKey: 'nov', operation: 'ratio', numeratorKey: 'nov1', denominatorKey: 'nov', decimals: 1 },
                { targetKey: 'dic', operation: 'ratio', numeratorKey: 'dic1', denominatorKey: 'dic', decimals: 1 },
              ],
            },
          ],
        },
        {
          kind: 'table',
          datasetKey: 'uccp13B',
          columns: [
            YEAR_COLUMN,
            column('sofa', 'Puntaje Sofa', { aliases: ['MEDSOFA', 'SOFA'], align: 'center' }),
            column('valsofa', '% Mortalidad', { aliases: ['VALSOFA'], align: 'center' }),
            ...MONTHLY_TOTAL_COLUMNS,
          ],
          summaryRows: [
            {
              label: 'Total de Ingresos',
              labelColSpan: 3,
              highlight: true,
              cells: [
                ...MONTHLY_TOTAL_COLUMNS.map((item) => ({
                  targetKey: item.key,
                  operation: 'sum' as const,
                })),
              ],
            },
            {
              label: 'Suma de Sofa',
              labelColSpan: 3,
              cells: [
                { targetKey: 'total', operation: 'sum', sourceKey: 'tot1' },
                { targetKey: 'ene', operation: 'sum', sourceKey: 'ene1' },
                { targetKey: 'feb', operation: 'sum', sourceKey: 'feb1' },
                { targetKey: 'mar', operation: 'sum', sourceKey: 'mar1' },
                { targetKey: 'abr', operation: 'sum', sourceKey: 'abr1' },
                { targetKey: 'may', operation: 'sum', sourceKey: 'may1' },
                { targetKey: 'jun', operation: 'sum', sourceKey: 'jun1' },
                { targetKey: 'jul', operation: 'sum', sourceKey: 'jul1' },
                { targetKey: 'agt', operation: 'sum', sourceKey: 'agt1' },
                { targetKey: 'sep', operation: 'sum', sourceKey: 'sep1' },
                { targetKey: 'oct', operation: 'sum', sourceKey: 'oct1' },
                { targetKey: 'nov', operation: 'sum', sourceKey: 'nov1' },
                { targetKey: 'dic', operation: 'sum', sourceKey: 'dic1' },
              ],
            },
            {
              label: 'Promedio',
              labelColSpan: 3,
              highlight: true,
              cells: [
                { targetKey: 'total', operation: 'ratio', numeratorKey: 'tot1', denominatorKey: 'tot', decimals: 1 },
                { targetKey: 'ene', operation: 'ratio', numeratorKey: 'ene1', denominatorKey: 'ene', decimals: 1 },
                { targetKey: 'feb', operation: 'ratio', numeratorKey: 'feb1', denominatorKey: 'feb', decimals: 1 },
                { targetKey: 'mar', operation: 'ratio', numeratorKey: 'mar1', denominatorKey: 'mar', decimals: 1 },
                { targetKey: 'abr', operation: 'ratio', numeratorKey: 'abr1', denominatorKey: 'abr', decimals: 1 },
                { targetKey: 'may', operation: 'ratio', numeratorKey: 'may1', denominatorKey: 'may', decimals: 1 },
                { targetKey: 'jun', operation: 'ratio', numeratorKey: 'jun1', denominatorKey: 'jun', decimals: 1 },
                { targetKey: 'jul', operation: 'ratio', numeratorKey: 'jul1', denominatorKey: 'jul', decimals: 1 },
                { targetKey: 'agt', operation: 'ratio', numeratorKey: 'agt1', denominatorKey: 'agt', decimals: 1 },
                { targetKey: 'sep', operation: 'ratio', numeratorKey: 'sep1', denominatorKey: 'sep', decimals: 1 },
                { targetKey: 'oct', operation: 'ratio', numeratorKey: 'oct1', denominatorKey: 'oct', decimals: 1 },
                { targetKey: 'nov', operation: 'ratio', numeratorKey: 'nov1', denominatorKey: 'nov', decimals: 1 },
                { targetKey: 'dic', operation: 'ratio', numeratorKey: 'dic1', denominatorKey: 'dic', decimals: 1 },
              ],
            },
          ],
        },
      ],
    },
    {
      id: 'uccp-8',
      numberLabel: '8.-',
      title: 'Porcentaje de Pacientes Referidos de un EESS a la UCCP',
      blocks: [
        {
          kind: 'table',
          datasetKey: 'uccp4',
          columns: [
            YEAR_COLUMN,
            MONTH_COLUMN,
            column('referidos', 'Nro de Referidos', { aliases: ['REFERIDOS', 'REFERIDO'], align: 'right', sum: true }),
            column('egresos', 'Nro de Egresos', { aliases: ['EGRESOS', 'EGRESO'], align: 'right', sum: true }),
            column('indicador', '% Referidos', { aliases: ['INDICADOR'], align: 'right', decimals: 1 }),
          ],
          totals: {
            enabled: true,
            label: 'TOTAL',
            labelColSpan: 2,
            formulas: [
              {
                targetKey: 'indicador',
                numeratorKey: 'referidos',
                denominatorKey: 'egresos',
                multiplier: 100,
                decimals: 1,
              },
            ],
          },
        },
        {
          kind: 'chart',
          datasetKey: 'uccp4',
          chartType: 'bar',
          title: 'Porcentaje de Referencias enviadas a otros EESS',
          categoryField: 'nmess',
          categoryAliases: ['NMESS', 'NMES'],
          valueField: 'indicador',
          valueAliases: ['INDICADOR'],
        },
        {
          kind: 'chart',
          datasetKey: 'uccp4A',
          chartType: 'line',
          title: 'Numero de Referidos a otros EESS egresados de UCCP',
          seriesField: 'anio',
          seriesAliases: ['ANIO'],
        },
      ],
    },
    {
      id: 'uccp-9',
      numberLabel: '9.-',
      title: 'Porcentaje de reingreso precoz a la UCCP (estancia <= 48 Horas)',
      blocks: [
        {
          kind: 'table',
          datasetKey: 'uccp14',
          columns: [
            YEAR_COLUMN,
            MONTH_COLUMN,
            column('reingreso', 'Total de reingresos a la UCCP', { aliases: ['NRO_REI', 'REINGRESO'], align: 'right', sum: true }),
            column('egresos', 'Total de egresos de UCCP', { aliases: ['TOT_EGR', 'EGRESOS'], align: 'right', sum: true }),
            column('indicador', 'Indicador (%)', { aliases: ['INDICADOR'], align: 'right', decimals: 1 }),
          ],
          totals: {
            enabled: true,
            label: 'TOTAL',
            labelColSpan: 2,
            formulas: [
              {
                targetKey: 'indicador',
                numeratorKey: 'reingreso',
                denominatorKey: 'egresos',
                multiplier: 100,
                decimals: 1,
              },
            ],
          },
        },
      ],
    },
    {
      id: 'uccp-11',
      numberLabel: '11.-',
      title: 'Porcentaje de utilizacion de ventiladores mecanicos',
      blocks: [
        {
          kind: 'table',
          datasetKey: 'uccp3',
          headerRows: [
            [
              { label: 'Anio', rowSpan: 2, align: 'center' },
              { label: 'MES', rowSpan: 2, align: 'center' },
              { label: 'UCI', colSpan: 3, align: 'center' },
              { label: 'UCIN', colSpan: 3, align: 'center' },
            ],
            [
              { label: '% Utilizado', align: 'center' },
              { label: '% Libre', align: 'center' },
              { label: 'Promedio Camas', align: 'center' },
              { label: '% Utilizado', align: 'center' },
              { label: '% Libre', align: 'center' },
              { label: 'Promedio Camas', align: 'center' },
            ],
          ],
          columns: [
            YEAR_COLUMN,
            column('mes', 'MES', { aliases: ['MES', 'NMES'], align: 'center' }),
            column('uci_ocupa', '% Utilizado UCI', { aliases: ['UCI_OCUPA', 'UCI_OCUPADO'], align: 'right', decimals: 1 }),
            column('uci_libre', '% Libre UCI', { aliases: ['UCI_LIBRE'], align: 'right', decimals: 1 }),
            column('uci_cama', 'Promedio Camas UCI', { aliases: ['UCI_CAMA', 'UCI_CAMAS'], align: 'right' }),
            column('ucin_ocupa', '% Utilizado UCIN', { aliases: ['UCIN_OCUPA', 'UCIN_OCUPADO'], align: 'right', decimals: 1 }),
            column('ucin_libre', '% Libre UCIN', { aliases: ['UCIN_LIBRE'], align: 'right', decimals: 1 }),
            column('ucin_cama', 'Promedio Camas UCIN', { aliases: ['UCIN_CAMA', 'UCIN_CAMAS'], align: 'right' }),
          ],
        },
        {
          kind: 'chart',
          datasetKey: 'uccp3A',
          chartType: 'stacked_bar',
          title: 'Porcentaje de Utilizacion de Ventiladores Mecanicos - UCI',
          seriesField: 'tipo',
          seriesAliases: ['TIPO'],
          filterField: 'codigo',
          filterAliases: ['CODIGO'],
          filterEquals: '9000',
        },
        {
          kind: 'chart',
          datasetKey: 'uccp3A',
          chartType: 'stacked_bar',
          title: 'Porcentaje de Utilizacion de Ventiladores Mecanicos - UCIN',
          seriesField: 'tipo',
          seriesAliases: ['TIPO'],
          filterField: 'codigo',
          filterAliases: ['CODIGO'],
          filterEquals: '9000',
          invertFilter: true,
        },
      ],
    },
    {
      id: 'uccp-13',
      numberLabel: '13.-',
      title: 'Porcentaje de egresos por transferencias de pacientes de la UCCP a otros servicios',
      blocks: [
        {
          kind: 'table',
          datasetKey: 'uccp5',
          columns: [
            YEAR_COLUMN,
            MONTH_COLUMN,
            column('p_trans', 'Nro de egresos por transferencias', { aliases: ['P_TRANS'], align: 'right', sum: true }),
            column('p_total', 'Numero total de egresos de la UCCP', { aliases: ['P_TOTAL', 'TOTAL'], align: 'right', sum: true }),
            column('indicador', '%', { aliases: ['INDICADOR'], align: 'right', decimals: 1 }),
          ],
          totals: {
            enabled: true,
            label: 'TOTAL',
            labelColSpan: 2,
            formulas: [
              {
                targetKey: 'indicador',
                numeratorKey: 'p_trans',
                denominatorKey: 'p_total',
                multiplier: 100,
                decimals: 1,
              },
            ],
          },
        },
        {
          kind: 'chart',
          datasetKey: 'uccp5',
          chartType: 'bar',
          title: 'Porcentaje de Transferencias a Otros Servicios',
          categoryField: 'nmess',
          categoryAliases: ['NMESS', 'NMES'],
          valueField: 'indicador',
          valueAliases: ['INDICADOR'],
        },
        {
          kind: 'table',
          datasetKey: 'uccp5A',
          columns: [YEAR_COLUMN, column('servicio', 'Servicio', { aliases: ['DES_SERVICIO', 'SERVICIO'] }), ...MONTHLY_TOTAL_COLUMNS],
          totals: { enabled: true, label: 'TOTAL', labelColSpan: 2 },
        },
      ],
    },
    {
      id: 'uccp-14',
      numberLabel: '14.-',
      title: 'Porcentaje de egresos por referencia de pacientes de la UCCP a otro Establecimiento de Salud.',
      blocks: [
        {
          kind: 'table',
          datasetKey: 'uccp6',
          columns: [
            YEAR_COLUMN,
            MONTH_COLUMN,
            column('referidos', 'Nro de Referidos', { aliases: ['REFERIDOS', 'REFERIDO'], align: 'right', sum: true }),
            column('egresos', 'Nro de Egresos', { aliases: ['EGRESOS', 'EGRESO'], align: 'right', sum: true }),
            column('indicador', '% Referidos', { aliases: ['INDICADOR'], align: 'right', decimals: 1 }),
          ],
          totals: {
            enabled: true,
            label: 'TOTAL',
            labelColSpan: 2,
            formulas: [
              {
                targetKey: 'indicador',
                numeratorKey: 'referidos',
                denominatorKey: 'egresos',
                multiplier: 100,
                decimals: 1,
              },
            ],
          },
        },
        {
          kind: 'chart',
          datasetKey: 'uccp6',
          chartType: 'bar',
          title: 'Porcentaje de Referencias enviadas a otros EESS',
          categoryField: 'nmess',
          categoryAliases: ['NMESS', 'NMES'],
          valueField: 'indicador',
          valueAliases: ['INDICADOR'],
        },
        {
          kind: 'chart',
          datasetKey: 'uccp6A',
          chartType: 'line',
          title: 'Numero de Referidos a otros EESS egresados de UCCP',
          seriesField: 'anio',
          seriesAliases: ['ANIO'],
        },
      ],
    },
    {
      id: 'uccp-15',
      numberLabel: '15.-',
      title: 'Porcentaje de Necropcias de pacientes de la UCCP',
      blocks: [
        { kind: 'heading', text: 'Fallecidos Mayor a 48 Horas' },
        {
          kind: 'table',
          datasetKey: 'uccp20',
          columns: [
            YEAR_COLUMN,
            MONTH_COLUMN,
            column('tot_mor', 'Fallecidos Derivado a la Morgue', { aliases: ['TOT_MOR'], align: 'right', sum: true }),
            column('tot_def', 'Fallecidos en UCCP', { aliases: ['TOT_DEF'], align: 'right', sum: true }),
            column('indicador', '% Necropcia', { aliases: ['INDICADOR'], align: 'right', decimals: 1 }),
          ],
          totals: {
            enabled: true,
            label: 'TOTAL',
            labelColSpan: 2,
            formulas: [
              {
                targetKey: 'indicador',
                numeratorKey: 'tot_mor',
                denominatorKey: 'tot_def',
                multiplier: 100,
                decimals: 1,
              },
            ],
          },
        },
      ],
    },
    {
      id: 'uccp-16',
      numberLabel: '16.-',
      title: 'Numero de egresos por defuncion de pacientes de la UCCP con estancia mayor a 48 horas',
      blocks: [
        { kind: 'heading', text: 'Defunciones, segun servicio de procedencia' },
        {
          kind: 'table',
          datasetKey: 'uccp20A',
          columns: [YEAR_COLUMN, UPSS_COLUMN, column('especialidad', 'Servicio procede', { aliases: ['SERVICIO', 'ESPECIALIDAD'] }), ...MONTHLY_TOTAL_COLUMNS],
          totals: { enabled: true, label: 'TOTAL', labelColSpan: 3 },
        },
        { kind: 'heading', text: 'Defunciones, segun prioridad de atencion al ingreso a la UCCP.' },
        {
          kind: 'table',
          datasetKey: 'uccp20B',
          columns: [YEAR_COLUMN, UPSS_COLUMN, PRIORIDAD_COLUMN, ...MONTHLY_TOTAL_COLUMNS],
          totals: { enabled: true, label: 'TOTAL', labelColSpan: 3 },
        },
      ],
    },
    {
      id: 'uccp-17',
      numberLabel: '17.-',
      title: 'Tasa de Mortalidad en UCCP.',
      blocks: [
        { kind: 'heading', text: 'Tasa BRUTA de Mortalidad en UCCP' },
        {
          kind: 'table',
          datasetKey: 'uccp16A',
          columns: [
            YEAR_COLUMN,
            MONTH_COLUMN,
            column('totfall', 'Nro de Defunciones', { aliases: ['TOTFALL', 'TOTFAL'], align: 'right', sum: true }),
            column('totegr', 'Nro de Egresos', { aliases: ['TOTEGR'], align: 'right', sum: true }),
            column('tasa', 'Tasa %', { align: 'right', decimals: 1 }),
          ],
          totals: {
            enabled: true,
            label: 'TOTAL',
            labelColSpan: 2,
            formulas: [
              {
                targetKey: 'tasa',
                numeratorKey: 'totfall',
                denominatorKey: 'totegr',
                multiplier: 100,
                decimals: 1,
              },
            ],
          },
        },
        { kind: 'heading', text: 'Tasa NETA de Mortalidad en UCCP' },
        {
          kind: 'table',
          datasetKey: 'uccp16B',
          columns: [
            YEAR_COLUMN,
            MONTH_COLUMN,
            column('totfall', 'Nro de Defunciones (+ 48 Horas en el Servicio)', { aliases: ['TOTFALL', 'TOTFAL'], align: 'right', sum: true }),
            column('totegr', 'Nro de Egresos', { aliases: ['TOTEGR'], align: 'right', sum: true }),
            column('tasa', 'Tasa %', { align: 'right', decimals: 1 }),
          ],
          totals: {
            enabled: true,
            label: 'TOTAL',
            labelColSpan: 2,
            formulas: [
              {
                targetKey: 'tasa',
                numeratorKey: 'totfall',
                denominatorKey: 'totegr',
                multiplier: 100,
                decimals: 1,
              },
            ],
          },
        },
      ],
    },
  ],
}
