import { useEffect, useMemo, useState } from 'react'
import { RefreshCcw } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { SighPageShell } from '@/modules/sigh/components/sigh-page-shell'
import { resolveRowNumber, resolveRowText } from '@/modules/sigh/sigh-utils'
import { getOcupacionHospitalizacionReport, getOcupacionUciReport } from '@/modules/sigh/services/sigh-reports.service'
import type { SighTableRow } from '@/modules/sigh/types'

interface OcupacionRow {
  piso: string
  servicio: string
  tipo: string
  totalCamas: number
  habilitadas: number
  ocupadas: number
  disponibles: number
}

interface OcupacionSums {
  totalCamas: number
  habilitadas: number
  ocupadas: number
  disponibles: number
}

interface OcupacionDataItem {
  kind: 'data'
  row: OcupacionRow
  showPiso: boolean
  showServicio: boolean
}

interface OcupacionSubtotalItem {
  kind: 'subtotal'
  piso: string
  sums: OcupacionSums
}

interface OcupacionTotalItem {
  kind: 'total'
  sums: OcupacionSums
}

type OcupacionTableItem = OcupacionDataItem | OcupacionSubtotalItem | OcupacionTotalItem

interface OcupacionBlockProps {
  title: 'Hospitalizacion' | 'UCI'
  rows: OcupacionRow[]
  loading: boolean
}

const COLOR_HEADER_MAIN = '#2F628F'
const COLOR_HEADER_SECOND = '#3B719F'
const COLOR_OCUPADAS = '#E9D46A'
const COLOR_DISPONIBLES = '#AEEA9B'
const COLOR_PORCENTAJE = '#E9E2B8'
const COLOR_SUBTOTAL = '#D0D0D0'
const COLOR_TOTAL = '#C6C6C6'

const WRAPPER = 'w-full max-w-full sm:mx-auto sm:w-fit'
const TABLE_CARD = `${WRAPPER} border-border/70 shadow-sm`
const TABLE_CONTAINER = 'overflow-x-auto rounded-sm border border-[#cfd7df] bg-white'
const TABLE_BASE = 'w-auto min-w-[820px] table-fixed border-collapse text-[11px] leading-[1.1]'

const TH_BASE = 'border border-[#d0d7e0] px-2 py-1 text-center text-[10px] font-semibold uppercase tracking-[0.03em] text-white'
const TH_LEFT = `${TH_BASE} text-left`

const TD_BASE = 'border border-[#d9dfe6] px-2 py-1 text-[11px] leading-[1.1] align-middle'
const TD_TEXT = `${TD_BASE} text-left`
const TD_NUMBER = `${TD_BASE} text-center tabular-nums`

const ROW_SUBTOTAL = 'font-semibold text-[#1f2937]'
const ROW_TOTAL = 'font-bold text-[#111827]'

function normalizeOcupacionRow(raw: SighTableRow): OcupacionRow {
  return {
    piso: resolveRowText(raw, 'PISO', ['piso']).trim() || 'Sin piso',
    servicio: resolveRowText(raw, 'CONSULTORIO', ['SERVICIO', 'servicio']).trim() || 'Sin servicio',
    tipo: resolveRowText(raw, 'TIPO', ['tipo']).trim() || '-',
    totalCamas: resolveRowNumber(raw, 'TOTAL', ['total', 'TOTCAMAS', 'tcamas']),
    habilitadas: resolveRowNumber(raw, 'C_HABI', ['CHABI', 'chabi']),
    ocupadas: resolveRowNumber(raw, 'C_OCUP', ['COCUP', 'cocup']),
    disponibles: resolveRowNumber(raw, 'C_LIBR', ['CLIBR', 'clibr']),
  }
}

function groupByConsecutivePiso(rows: OcupacionRow[]): Array<{ piso: string; rows: OcupacionRow[] }> {
  const groups: Array<{ piso: string; rows: OcupacionRow[] }> = []

  for (const row of rows) {
    const last = groups[groups.length - 1]
    if (last && last.piso === row.piso) {
      last.rows.push(row)
      continue
    }

    groups.push({ piso: row.piso, rows: [row] })
  }

  return groups
}

function groupByConsecutiveServicio(rows: OcupacionRow[]): Array<{ servicio: string; rows: OcupacionRow[] }> {
  const groups: Array<{ servicio: string; rows: OcupacionRow[] }> = []

  for (const row of rows) {
    const last = groups[groups.length - 1]
    if (last && last.servicio === row.servicio) {
      last.rows.push(row)
      continue
    }

    groups.push({ servicio: row.servicio, rows: [row] })
  }

  return groups
}

function emptySums(): OcupacionSums {
  return {
    totalCamas: 0,
    habilitadas: 0,
    ocupadas: 0,
    disponibles: 0,
  }
}

function addToSums(sums: OcupacionSums, row: OcupacionRow) {
  sums.totalCamas += row.totalCamas
  sums.habilitadas += row.habilitadas
  sums.ocupadas += row.ocupadas
  sums.disponibles += row.disponibles
}

function safePercentValue(numerator: number, denominator: number): number {
  const safeNumerator = Number.isFinite(numerator) ? numerator : 0
  const safeDenominator = Number.isFinite(denominator) ? denominator : 0
  if (safeDenominator <= 0) {
    return 0
  }

  return (safeNumerator / safeDenominator) * 100
}

function formatPercent(value: number): string {
  const safeValue = Number.isFinite(value) ? value : 0
  return safeValue.toFixed(1)
}

function buildOcupacionTableItems(rows: OcupacionRow[]): OcupacionTableItem[] {
  if (rows.length === 0) {
    return []
  }

  const items: OcupacionTableItem[] = []
  const globalSums = emptySums()
  const pisoGroups = groupByConsecutivePiso(rows)

  for (const pisoGroup of pisoGroups) {
    const pisoSums = emptySums()
    const servicioGroups = groupByConsecutiveServicio(pisoGroup.rows)
    let isFirstInPiso = true

    for (const servicioGroup of servicioGroups) {
      servicioGroup.rows.forEach((row, index) => {
        items.push({
          kind: 'data',
          row,
          showPiso: isFirstInPiso,
          showServicio: index === 0,
        })

        isFirstInPiso = false
        addToSums(pisoSums, row)
        addToSums(globalSums, row)
      })
    }

    items.push({
      kind: 'subtotal',
      piso: pisoGroup.piso,
      sums: { ...pisoSums },
    })
  }

  items.push({
    kind: 'total',
    sums: globalSums,
  })

  return items
}

function formatReportDate(value: Date): string {
  const day = String(value.getDate()).padStart(2, '0')
  const month = String(value.getMonth() + 1).padStart(2, '0')
  const year = String(value.getFullYear()).slice(-2)
  const minutes = String(value.getMinutes()).padStart(2, '0')
  const rawHours = value.getHours()
  const suffix = rawHours >= 12 ? 'pm' : 'am'
  const hours = String(rawHours % 12 || 12).padStart(2, '0')

  return `${day}/${month}/${year} ${hours}:${minutes} ${suffix}`
}

function OcupacionBlock({ title, rows, loading }: OcupacionBlockProps) {
  const tableItems = useMemo(() => buildOcupacionTableItems(rows), [rows])
  const blockSummary = useMemo(() => {
    const sums = rows.reduce(
      (accumulator, row) => ({
        totalCamas: accumulator.totalCamas + row.totalCamas,
        habilitadas: accumulator.habilitadas + row.habilitadas,
        ocupadas: accumulator.ocupadas + row.ocupadas,
        disponibles: accumulator.disponibles + row.disponibles,
      }),
      { totalCamas: 0, habilitadas: 0, ocupadas: 0, disponibles: 0 },
    )

    return {
      ...sums,
      porcentaje: formatPercent(safePercentValue(sums.ocupadas, sums.habilitadas)),
    }
  }, [rows])
  const legacySectionTitle = title === 'UCI' ? 'Reporte Resumen de Camas - UCI' : 'Reporte Resumen de Camas - HOSPITALIZACION'

  return (
    <Card className={TABLE_CARD}>
      <CardHeader className="border-b border-border/70 px-3 py-2">
        <CardTitle className="text-[12px] font-semibold tracking-[0.02em] text-[#1f3650]">{title}</CardTitle>
      </CardHeader>
      <CardContent className="p-2">
        {rows.length ? (
          <div className="mb-2 grid gap-2 sm:grid-cols-2 lg:hidden">
            <div className="rounded-sm border border-border bg-canvas/60 px-2 py-1.5">
              <p className="text-[10px] font-semibold uppercase tracking-wide text-muted">Habilitadas</p>
              <p className="text-base font-semibold text-brand-strong">{blockSummary.habilitadas}</p>
            </div>
            <div className="rounded-sm border border-border bg-canvas/60 px-2 py-1.5">
              <p className="text-[10px] font-semibold uppercase tracking-wide text-muted">Ocupadas</p>
              <p className="text-base font-semibold text-brand-strong">{blockSummary.ocupadas}</p>
            </div>
            <div className="rounded-sm border border-border bg-canvas/60 px-2 py-1.5">
              <p className="text-[10px] font-semibold uppercase tracking-wide text-muted">Disponibles</p>
              <p className="text-base font-semibold text-brand-strong">{blockSummary.disponibles}</p>
            </div>
            <div className="rounded-sm border border-border bg-canvas/60 px-2 py-1.5">
              <p className="text-[10px] font-semibold uppercase tracking-wide text-muted">% Ocupacion</p>
              <p className="text-base font-semibold text-brand-strong">{blockSummary.porcentaje}</p>
            </div>
          </div>
        ) : null}

        <p className="mb-2 text-[11px] text-muted sm:hidden">Desliza la tabla para ver piso, servicio y subtotales.</p>

        <div className={TABLE_CONTAINER}>
          <table className={TABLE_BASE}>
            <colgroup>
              <col className="w-[96px]" />
              <col className="w-[250px]" />
              <col className="w-[96px]" />
              <col className="w-[74px]" />
              <col className="w-[74px]" />
              <col className="w-[74px]" />
              <col className="w-[74px]" />
              <col className="w-[74px]" />
            </colgroup>
            <thead>
              <tr style={{ backgroundColor: COLOR_HEADER_MAIN }}>
                <th rowSpan={2} className={TH_BASE}>
                  Piso
                </th>
                <th rowSpan={2} className={TH_LEFT}>
                  Servicio
                </th>
                <th colSpan={6} className={TH_BASE}>
                  {legacySectionTitle}
                </th>
              </tr>
              <tr style={{ backgroundColor: COLOR_HEADER_SECOND }}>
                <th className={TH_LEFT}>Tipo</th>
                <th className={TH_BASE}>Total Camas</th>
                <th className={TH_BASE}>Habilitadas</th>
                <th className={TH_BASE}>Ocupadas</th>
                <th className={TH_BASE}>Disponibles</th>
                <th className={TH_BASE}>% Ocupacion</th>
              </tr>
            </thead>
            <tbody>
              {tableItems.length > 0 ? (
                tableItems.map((item, index) => {
                  if (item.kind === 'subtotal') {
                    const subtotalPercent = safePercentValue(item.sums.ocupadas, item.sums.habilitadas)
                    return (
                      <tr key={`subtotal-${item.piso}-${index}`} className={ROW_SUBTOTAL} style={{ backgroundColor: COLOR_SUBTOTAL }}>
                        <td colSpan={3} className={TD_NUMBER}>
                          Sub Total
                        </td>
                        <td className={TD_NUMBER}>{item.sums.totalCamas}</td>
                        <td className={TD_NUMBER}>{item.sums.habilitadas}</td>
                        <td className={TD_NUMBER}>{item.sums.ocupadas}</td>
                        <td className={TD_NUMBER}>{item.sums.disponibles}</td>
                        <td className={TD_NUMBER}>{formatPercent(subtotalPercent)}</td>
                      </tr>
                    )
                  }

                  if (item.kind === 'total') {
                    const totalPercent = safePercentValue(item.sums.ocupadas, item.sums.habilitadas)
                    return (
                      <tr key="total-general" className={ROW_TOTAL} style={{ backgroundColor: COLOR_TOTAL }}>
                        <td colSpan={3} className={TD_NUMBER}>
                          Total General
                        </td>
                        <td className={TD_NUMBER}>{item.sums.totalCamas}</td>
                        <td className={TD_NUMBER}>{item.sums.habilitadas}</td>
                        <td className={TD_NUMBER}>{item.sums.ocupadas}</td>
                        <td className={TD_NUMBER}>{item.sums.disponibles}</td>
                        <td className={TD_NUMBER}>{formatPercent(totalPercent)}</td>
                      </tr>
                    )
                  }

                  const rowPercent = safePercentValue(item.row.ocupadas, item.row.habilitadas)
                  return (
                    <tr key={`${title}-${index}`} className="odd:bg-white even:bg-[#f7f9fb]">
                      <td className={TD_TEXT}>{item.showPiso ? item.row.piso : ''}</td>
                      <td className={TD_TEXT}>{item.showServicio ? item.row.servicio : ''}</td>
                      <td className={TD_TEXT}>{item.row.tipo}</td>
                      <td className={TD_NUMBER}>{item.row.totalCamas}</td>
                      <td className={TD_NUMBER}>{item.row.habilitadas}</td>
                      <td className={TD_NUMBER} style={{ backgroundColor: COLOR_OCUPADAS }}>
                        {item.row.ocupadas}
                      </td>
                      <td className={TD_NUMBER} style={{ backgroundColor: COLOR_DISPONIBLES }}>
                        {item.row.disponibles}
                      </td>
                      <td className={TD_NUMBER} style={{ backgroundColor: COLOR_PORCENTAJE }}>
                        {formatPercent(rowPercent)}
                      </td>
                    </tr>
                  )
                })
              ) : (
                <tr>
                  <td colSpan={8} className="px-3 py-4 text-center text-[11px] text-muted">
                    {loading ? 'Consultando ocupacion...' : 'No se encuentran registros.'}
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </CardContent>
    </Card>
  )
}

export function OcupacionCamaPage() {
  const [hospitalizacionRows, setHospitalizacionRows] = useState<OcupacionRow[]>([])
  const [uciRows, setUciRows] = useState<OcupacionRow[]>([])
  const [generatedAt, setGeneratedAt] = useState<Date | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const handleFetch = async () => {
    setLoading(true)
    setError(null)
    try {
      const [hospitalizacion, uci] = await Promise.all([
        getOcupacionHospitalizacionReport(),
        getOcupacionUciReport(),
      ])

      setHospitalizacionRows(hospitalizacion.map(normalizeOcupacionRow))
      setUciRows(uci.map(normalizeOcupacionRow))
      setGeneratedAt(new Date())
    } catch (fetchError) {
      const message = fetchError instanceof Error ? fetchError.message : 'No se pudo consultar el porcentaje de ocupacion.'
      setError(message)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    void handleFetch()
  }, [])

  return (
    <SighPageShell
      error={error}
      description="Porcentaje de ocupacion de cama para Hospitalizacion y UCI."
      actions={
        <Button size="sm" variant="outline" onClick={() => void handleFetch()}>
          <RefreshCcw className="h-4 w-4" />
          Actualizar
        </Button>
      }
    >
      <div className="space-y-2">
        <div className={`${WRAPPER} rounded-sm border border-[#cfd7df] bg-[#eef4fa] px-3 py-1.5 text-center text-[12px] font-medium text-[#1f3650]`}>
          <span className="font-semibold">Fecha de Reporte:</span>{' '}
          <span className="font-semibold tabular-nums">
            {generatedAt ? formatReportDate(generatedAt) : '--/--/-- --:-- --'}
          </span>
        </div>

        <OcupacionBlock title="Hospitalizacion" rows={hospitalizacionRows} loading={loading} />
        <OcupacionBlock title="UCI" rows={uciRows} loading={loading} />
      </div>
    </SighPageShell>
  )
}
