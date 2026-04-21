import { useEffect, useMemo, useState } from 'react'
import { Download, RefreshCcw } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { SighPageShell } from '@/modules/sigh/components/sigh-page-shell'
import { CAMAS_DETAIL_MODAL_SPECS } from '@/modules/sigh/camas-detail-modal-specs'
import { compareNullableTextLast } from '@/modules/sigh/sigh-utils'
import {
  downloadMonitoreoCamasResumen,
  downloadMonitoreoCamasSusalud,
  getCamasDetalle,
  getMonitoreoCamasReport,
} from '@/modules/sigh/services/sigh-reports.service'
import type { SighTableRow } from '@/modules/sigh/types'

// ─── Types ───────────────────────────────────────────────────────────────────

interface CamasRow {
  idservicio: number
  piso: string
  servicio: string
  tipo: string
  orden: number
  camas: number
  c_vm: number
  c_fl: number
  total: number
  tocupa: number
  chabi: number
  cocup: number
  clibr: number
  ctran: number
  cinah: number
  totcamas: number
  ordenvm: number
  totvm: number
  totfl: number
  pcr: number
  espera: number
  espera_ant: number
  espera_mol: number
  totalvm: number
  vmopera: number
  vminopera: number
  totalaf: number
  afopera: number
  afinopera: number
  veces: number
  veces1: number
}

interface Sums {
  camas: number
  totcamas: number
  tocupa: number
  demanda: number
  total: number
  chabi: number
  cocup: number
  clibr: number
  ctran: number
  cinah: number
  pcr: number
  espera_ant: number
  espera_mol: number
  c_vm: number
  totalvm: number
  vmopera: number
  vminopera: number
  c_fl: number
  totalaf: number
  afopera: number
  afinopera: number
}

interface DataItem {
  type: 'data'
  row: CamasRow
  metrics: ServiceMetrics
  showPiso: boolean
  pisoSpan: number
  showServicio: boolean
  servicioSpan: number
}

interface SubtotalItem {
  type: 'subtotal'
  sums: Sums
  bgColor: string
}

interface TotalItem {
  type: 'total'
  sums: Sums
}

type TableItem = DataItem | SubtotalItem | TotalItem

interface ServiceMetrics {
  camas: number
  totcamas: number
  tocupa: number
  diferencia: number
  demanda: number
  porcentaje: number
  c_vm: number
  totalvm: number
  vmopera: number
  vminopera: number
  vmPct: number
  c_fl: number
  totalaf: number
  afopera: number
  afinopera: number
  afPct: number
}

interface ServiceGroup {
  key: string
  piso: string
  servicio: string
  rows: CamasRow[]
  metrics: ServiceMetrics
}

// ─── Data processing ─────────────────────────────────────────────────────────

function parseCamasRow(raw: SighTableRow): CamasRow {
  function n(key: string): number {
    const v = raw[key]
    if (typeof v === 'number') return Number.isFinite(v) ? v : 0
    const p = Number(String(v ?? '').trim())
    return Number.isFinite(p) ? p : 0
  }
  function s(key: string): string {
    return String(raw[key] ?? '').trim()
  }
  return {
    idservicio: n('idservicio'),
    piso: s('piso'),
    servicio: s('servicio'),
    tipo: s('tipo'),
    orden: n('orden'),
    camas: n('camas'),
    c_vm: n('c_vm'),
    c_fl: n('c_fl'),
    total: n('total'),
    tocupa: n('tocupa'),
    chabi: n('chabi'),
    cocup: n('cocup'),
    clibr: n('clibr'),
    ctran: n('ctran'),
    cinah: n('cinah'),
    totcamas: n('totcamas'),
    ordenvm: n('ordenvm'),
    totvm: n('totvm'),
    totfl: n('totfl'),
    pcr: n('pcr'),
    espera: n('espera'),
    espera_ant: n('espera_ant'),
    espera_mol: n('espera_mol'),
    totalvm: n('totalvm'),
    vmopera: n('vmopera'),
    vminopera: n('vminopera'),
    totalaf: n('totalaf'),
    afopera: n('afopera'),
    afinopera: n('afinopera'),
    veces: n('veces') || 1,
    veces1: n('veces1') || 1,
  }
}

function sortCamasRowsNullsLast(rows: CamasRow[]): CamasRow[] {
  return rows
    .map((row, index) => ({ row, index }))
    .sort((left, right) => (
      compareNullableTextLast(left.row.piso, right.row.piso) ||
      compareNullableTextLast(left.row.servicio, right.row.servicio) ||
      compareNullableTextLast(left.row.tipo, right.row.tipo) ||
      left.index - right.index
    ))
    .map((item) => item.row)
}

function emptySums(): Sums {
  return {
    camas: 0, totcamas: 0, tocupa: 0, demanda: 0,
    total: 0, chabi: 0, cocup: 0, clibr: 0,
    ctran: 0, cinah: 0, pcr: 0, espera_ant: 0, espera_mol: 0,
    c_vm: 0, totalvm: 0, vmopera: 0, vminopera: 0,
    c_fl: 0, totalaf: 0, afopera: 0, afinopera: 0,
  }
}

function safePercentValue(numerator: number, denominator: number): number {
  const safeNumerator = Number.isFinite(numerator) ? numerator : 0
  const safeDenominator = Number.isFinite(denominator) ? denominator : 0
  if (safeDenominator <= 0) {
    return 0
  }

  return (safeNumerator / safeDenominator) * 100
}

function clampPercent(value: number): number {
  if (!Number.isFinite(value)) {
    return 0
  }

  if (value < 0) {
    return 0
  }

  if (value > 100) {
    return 100
  }

  return value
}

function computeServiceMetrics(rows: CamasRow[]): ServiceMetrics {
  const camas = rows.reduce((max, row) => Math.max(max, row.camas), 0)
  const totalFilas = rows.reduce((sum, row) => sum + row.total, 0)
  const totcamas = rows.reduce((max, row) => Math.max(max, row.totcamas), totalFilas)
  const tocupaPorTipos = rows.reduce((sum, row) => sum + row.cocup, 0)
  const tocupaSp = rows.reduce((max, row) => Math.max(max, row.tocupa), 0)
  const tocupa = Math.max(tocupaPorTipos, tocupaSp)
  const ocupacionBase = Math.min(tocupa, camas)
  const demanda = Math.max(tocupa - camas, 0)

  const c_vm = rows.reduce((max, row) => Math.max(max, row.c_vm), 0)
  const totalvm = rows.reduce((max, row) => Math.max(max, row.totalvm), 0)
  const vmopera = rows.reduce((max, row) => Math.max(max, row.vmopera), 0)
  const vminopera = rows.reduce((max, row) => Math.max(max, row.vminopera), 0)

  const c_fl = rows.reduce((max, row) => Math.max(max, row.c_fl), 0)
  const totalaf = rows.reduce((max, row) => Math.max(max, row.totalaf), 0)
  const afopera = rows.reduce((max, row) => Math.max(max, row.afopera), 0)
  const afinopera = rows.reduce((max, row) => Math.max(max, row.afinopera), 0)

  return {
    camas,
    totcamas,
    tocupa,
    diferencia: totcamas - camas,
    demanda,
    porcentaje: clampPercent(safePercentValue(ocupacionBase, camas)),
    c_vm,
    totalvm,
    vmopera,
    vminopera,
    vmPct: clampPercent(safePercentValue(c_vm, vmopera)),
    c_fl,
    totalaf,
    afopera,
    afinopera,
    afPct: clampPercent(safePercentValue(c_fl, afopera)),
  }
}

function buildServiceGroups(rows: CamasRow[]): ServiceGroup[] {
  const groups: ServiceGroup[] = []

  for (const row of rows) {
    const key = `${row.piso}|${row.idservicio}|${row.servicio}`
    const lastGroup = groups[groups.length - 1]

    if (lastGroup && lastGroup.key === key) {
      lastGroup.rows.push(row)
      continue
    }

    groups.push({
      key,
      piso: row.piso,
      servicio: row.servicio,
      rows: [row],
      metrics: computeServiceMetrics([row]),
    })
  }

  for (const group of groups) {
    group.metrics = computeServiceMetrics(group.rows)
  }

  return groups
}

function addGroupToSums(sums: Sums, group: ServiceGroup) {
  sums.camas += group.metrics.camas
  sums.totcamas += group.metrics.totcamas
  sums.tocupa += group.metrics.tocupa
  sums.demanda += group.metrics.demanda

  sums.total += group.rows.reduce((sum, row) => sum + row.total, 0)
  sums.chabi += group.rows.reduce((sum, row) => sum + row.chabi, 0)
  sums.cocup += group.rows.reduce((sum, row) => sum + row.cocup, 0)
  sums.clibr += group.rows.reduce((sum, row) => sum + row.clibr, 0)
  sums.ctran += group.rows.reduce((sum, row) => sum + row.ctran, 0)
  sums.cinah += group.rows.reduce((sum, row) => sum + row.cinah, 0)
  sums.pcr += group.rows.reduce((sum, row) => sum + row.pcr, 0)
  sums.espera_ant += group.rows.reduce((sum, row) => sum + row.espera_ant, 0)
  sums.espera_mol += group.rows.reduce((sum, row) => sum + row.espera_mol, 0)

  // VM/AF are service-level capacities and can repeat by subtype.
  sums.c_vm += group.metrics.c_vm
  sums.totalvm += group.metrics.totalvm
  sums.vmopera += group.metrics.vmopera
  sums.vminopera += group.metrics.vminopera
  sums.c_fl += group.metrics.c_fl
  sums.totalaf += group.metrics.totalaf
  sums.afopera += group.metrics.afopera
  sums.afinopera += group.metrics.afinopera
}

function processCamasData(rawRows: SighTableRow[]): TableItem[] {
  const rows = sortCamasRowsNullsLast(rawRows.map(parseCamasRow))
  const groups = buildServiceGroups(rows)
  const items: TableItem[] = []

  const pisoRowSpanMap = new Map<string, number>()
  for (const group of groups) {
    pisoRowSpanMap.set(group.piso, (pisoRowSpanMap.get(group.piso) ?? 0) + group.rows.length)
  }

  let currentPiso = groups[0]?.piso ?? ''
  let pisoSums = emptySums()
  const globalSums = emptySums()
  const renderedPisos = new Set<string>()

  groups.forEach((group, groupIndex) => {
    const pisoChanged = groupIndex > 0 && group.piso !== currentPiso

    if (pisoChanged) {
      items.push({ type: 'subtotal', sums: { ...pisoSums }, bgColor: '#D7D7D7' })
      pisoSums = emptySums()
    }

    addGroupToSums(pisoSums, group)
    addGroupToSums(globalSums, group)

    group.rows.forEach((row, rowIndex) => {
      const isFirstInService = rowIndex === 0
      const showPiso = isFirstInService && !renderedPisos.has(group.piso)
      if (showPiso) {
        renderedPisos.add(group.piso)
      }

      items.push({
        type: 'data',
        row,
        metrics: group.metrics,
        showPiso,
        pisoSpan: pisoRowSpanMap.get(group.piso) ?? 1,
        showServicio: isFirstInService,
        servicioSpan: group.rows.length,
      })
    })

    if (groupIndex === groups.length - 1) {
      items.push({ type: 'subtotal', sums: { ...pisoSums }, bgColor: '#F0F1F1' })
    }

    currentPiso = group.piso
  })

  if (rows.length > 0) {
    items.push({ type: 'total', sums: globalSums })
  }

  return items
}

// ─── Color helpers ────────────────────────────────────────────────────────────

function pctBg(pct: number): string {
  const pctCapped = clampPercent(pct)
  if (pctCapped <= 60) return '#9DDE58'
  if (pctCapped <= 80) return '#F6F871'
  if (pctCapped <= 90) return '#F2B66D'
  return '#FB6C5D'
}

function pctText(pct: number): string {
  return String(Math.round(clampPercent(pct)))
}

function difBg(dif: number): string {
  if (dif > 0) return '#F6F871'
  if (dif < 0) return '#FB6C5D'
  return ''
}

function demandBg(value: number): string | undefined {
  if (value <= 0) return undefined
  if (value <= 2) return '#F6F3A2'
  if (value <= 5) return '#F2C27A'
  return '#F4A6A6'
}

function waitBg(value: number): string | undefined {
  if (value <= 0) return undefined
  if (value <= 2) return '#F6F3A2'
  if (value <= 5) return '#F2C27A'
  return '#F4A6A6'
}

function disabledBg(value: number, total: number): string | undefined {
  if (value <= 0) return undefined
  const ratio = total > 0 ? value / total : 1
  if (ratio <= 0.1) return '#F6F3A2'
  if (ratio <= 0.25) return '#F2C27A'
  return '#F4A6A6'
}

function availableBg(value: number, total: number): string {
  if (total <= 0) return '#F8FAFC'
  const ratio = total > 0 ? value / total : 0
  if (value <= 0) return '#F4A6A6'
  if (ratio <= 0.15) return '#F2C27A'
  if (ratio <= 0.3) return '#F6F3A2'
  return '#BFFCB3'
}

function isAfInactive(metrics: ServiceMetrics): boolean {
  return metrics.c_fl === 0 && metrics.totalaf === 0 && metrics.afopera === 0 && metrics.afinopera === 0
}

// ─── Cell helpers ─────────────────────────────────────────────────────────────

const TH = 'border border-border px-1.5 py-1 text-[10px] font-semibold text-center'
const TH_GROUP = `${TH} bg-[#e2edf7] text-[#123B63]`
const TH_SUB = `${TH} bg-[#f1f6fb] text-[#123B63]`
const TD = 'border border-border/60 px-1.5 py-0.5 text-[10px] text-center'
const TD_PISO = `${TD} bg-[#fafcff] font-medium text-[#1f3650] align-top`
const TD_SERVICIO = `${TD} bg-[#f6fbff] font-semibold text-[#123B63] text-left align-top`
const TD_TIPO = `${TD} text-left pl-4 text-[#334155]`
const TD_SUBTOTAL = 'border border-border/60 px-1.5 py-0.5 text-[10px] text-center font-bold'

function numCell(v: number): string {
  return String(Number.isFinite(v) ? v : 0)
}

// ─── Modal config ─────────────────────────────────────────────────────────────

function resolveDetailCell(row: SighTableRow, key: string): string {
  if (key in row) return String(row[key] ?? '')
  const lower = key.toLowerCase()
  const upper = key.toUpperCase()
  for (const k of Object.keys(row)) {
    if (k.toLowerCase() === lower || k.toUpperCase() === upper) return String(row[k] ?? '')
  }
  return ''
}

function DetailTable({ rows, columns }: { rows: SighTableRow[]; columns: { key: string; label: string }[] }) {
  const effectiveCols = columns.length > 0
    ? columns
    : Object.keys(rows[0] ?? {}).map((k) => ({ key: k, label: k }))

  return (
    <div className="overflow-x-auto rounded border border-border/70 bg-white">
      <table className="min-w-full border-collapse text-[11px]">
        <thead>
          <tr className="bg-[#eef5fb] text-[#123B63]">
            {effectiveCols.map((c) => (
              <th key={c.key} className="border-b border-border px-2 py-1 font-semibold uppercase text-center">
                {c.label}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.length === 0 ? (
            <tr>
              <td colSpan={effectiveCols.length} className="px-3 py-5 text-center text-xs text-muted">
                No se encuentran registros.
              </td>
            </tr>
          ) : (
            rows.map((row, i) => (
              <tr key={i} className="odd:bg-white even:bg-[#f8fbff]">
                {effectiveCols.map((c) => (
                  <td key={c.key} className="border-b border-border/60 px-2 py-0.5 text-center">
                    {resolveDetailCell(row, c.key) || ''}
                  </td>
                ))}
              </tr>
            ))
          )}
        </tbody>
      </table>
    </div>
  )
}

// ─── Subtotal / Total row renderers ──────────────────────────────────────────

function safePct(num: number, den: number): string {
  return String(Math.round(clampPercent(safePercentValue(num, den))))
}

function SubtotalRow({ sums, bg }: { sums: Sums; bg: string }) {
  const tdSubtotal = `${TD_SUBTOTAL} border-t-2 border-t-[#c9d7e6]`
  const subtotalBg = bg === '#D7D7D7' ? '#e8edf3' : '#f2f5f9'

  return (
    <tr style={{ backgroundColor: subtotalBg }}>
      <td colSpan={3} className={`${tdSubtotal} text-right tracking-wide text-[#1f3650]`}>Sub Total</td>
      {/* Escenario (1) */}
      <td className={tdSubtotal}>{sums.camas}</td>
      <td className={tdSubtotal}>{sums.totcamas - sums.camas}</td>
      <td className={tdSubtotal}>{safePct(Math.min(sums.tocupa, sums.camas), sums.camas)}</td>
      <td className={tdSubtotal}>{sums.demanda}</td>
      {/* Camas segun condicion */}
      <td className={tdSubtotal}>{sums.total}</td>
      <td className={tdSubtotal}>{sums.chabi}</td>
      <td className={tdSubtotal}>{sums.cocup}</td>
      <td className={tdSubtotal}>{sums.clibr}</td>
      <td className={tdSubtotal}>{sums.ctran}</td>
      <td className={tdSubtotal}>{sums.cinah}</td>
      <td className={tdSubtotal}>{sums.pcr}</td>
      {/* Resultado Espera */}
      <td className={tdSubtotal}>{sums.espera_ant}</td>
      <td className={tdSubtotal}>{sums.espera_mol}</td>
      {/* VM */}
      <td className={tdSubtotal}>{sums.c_vm}</td>
      <td className={tdSubtotal}>{sums.totalvm}</td>
      <td className={tdSubtotal}>{sums.vmopera}</td>
      <td className={tdSubtotal}>{sums.vminopera}</td>
      <td className={tdSubtotal}>{safePct(sums.c_vm, sums.vmopera)}</td>
      {/* AF */}
      <td className={tdSubtotal}>{sums.c_fl}</td>
      <td className={tdSubtotal}>{sums.totalaf}</td>
      <td className={tdSubtotal}>{sums.afopera}</td>
      <td className={tdSubtotal}>{sums.afinopera}</td>
      <td className={tdSubtotal}>{safePct(sums.c_fl, sums.afopera)}</td>
    </tr>
  )
}

function TotalGeneralRow({ sums }: { sums: Sums }) {
  const tdTotal = `${TD_SUBTOTAL} border-t-2 border-t-[#8fa9c2] bg-[#dce7f2] text-[#0f2942]`

  return (
    <tr>
      <td colSpan={3} className={`${tdTotal} text-right text-[11px] tracking-wide`}>Total General</td>
      <td className={tdTotal}>{sums.camas}</td>
      <td className={tdTotal}>{sums.totcamas - sums.camas}</td>
      <td className={tdTotal}>{safePct(Math.min(sums.tocupa, sums.camas), sums.camas)}</td>
      <td className={tdTotal}>{sums.demanda}</td>
      <td className={tdTotal}>{sums.total}</td>
      <td className={tdTotal}>{sums.chabi}</td>
      <td className={tdTotal}>{sums.cocup}</td>
      <td className={tdTotal}>{sums.clibr}</td>
      <td className={tdTotal}>{sums.ctran}</td>
      <td className={tdTotal}>{sums.cinah}</td>
      <td className={tdTotal}>{sums.pcr}</td>
      <td className={tdTotal}>{sums.espera_ant}</td>
      <td className={tdTotal}>{sums.espera_mol}</td>
      <td className={tdTotal}>{sums.c_vm}</td>
      <td className={tdTotal}>{sums.totalvm}</td>
      <td className={tdTotal}>{sums.vmopera}</td>
      <td className={tdTotal}>{sums.vminopera}</td>
      <td className={tdTotal}>{safePct(sums.c_vm, sums.vmopera)}</td>
      <td className={tdTotal}>{sums.c_fl}</td>
      <td className={tdTotal}>{sums.totalaf}</td>
      <td className={tdTotal}>{sums.afopera}</td>
      <td className={tdTotal}>{sums.afinopera}</td>
      <td className={tdTotal}>{safePct(sums.c_fl, sums.afopera)}</td>
    </tr>
  )
}

// ─── Main component ───────────────────────────────────────────────────────────

export function MonitoreoCamasPage() {
  const [rows, setRows] = useState<SighTableRow[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const [detailRows, setDetailRows] = useState<SighTableRow[]>([])
  const [detailLoading, setDetailLoading] = useState(false)
  const [detailType, setDetailType] = useState<string>('')
  const [isDetailOpen, setIsDetailOpen] = useState(false)

  const handleFetch = async () => {
    setLoading(true)
    setError(null)
    try {
      setRows(await getMonitoreoCamasReport())
    } catch (e) {
      setError(e instanceof Error ? e.message : 'No se pudo consultar Monitoreo de Camas.')
    } finally {
      setLoading(false)
    }
  }

  const openDetail = async (type: string, row: CamasRow) => {
    if (!row.idservicio) return
    setDetailType(type)
    setDetailRows([])
    setIsDetailOpen(true)
    setDetailLoading(true)
    try {
      const payload = await getCamasDetalle(type, row.idservicio, row.tipo)
      setDetailRows(payload)
    } catch (e) {
      setError(e instanceof Error ? e.message : 'No se pudo obtener el detalle.')
    } finally {
      setDetailLoading(false)
    }
  }

  useEffect(() => { void handleFetch() }, [])

  const tableItems = useMemo(() => processCamasData(rows), [rows])

  const modalSpec = CAMAS_DETAIL_MODAL_SPECS[detailType] ?? { title: 'Detalle', columns: [] }

  return (
    <SighPageShell
      error={error}
      description="Resumen operativo de camas por piso/servicio/tipo con accesos de detalle y exportacion."
      actions={
        <>
          <Button size="sm" variant="outline" onClick={() => void handleFetch()}>
            <RefreshCcw className="h-4 w-4" /> Actualizar
          </Button>
          <Button
            size="sm"
            className="gap-1.5 font-semibold"
            style={{ backgroundColor: '#005F8F', color: '#fff' }}
            onClick={() => void downloadMonitoreoCamasResumen()}
          >
            <Download className="h-4 w-4" /> Resumen por Piso
          </Button>
          <Button
            size="sm"
            className="gap-1.5 font-semibold"
            style={{ backgroundColor: '#2C6E99', color: '#fff' }}
            onClick={() => void downloadMonitoreoCamasSusalud()}
          >
            <Download className="h-4 w-4" /> Resumen Susalud
          </Button>
        </>
      }
    >
      <Card className="border-border/70">
        <CardHeader className="border-b border-border/60 pb-3">
          <CardTitle className="text-sm">Resumen de camas</CardTitle>
        </CardHeader>
        <CardContent className="pt-4">
          <div className="overflow-x-auto rounded-md border border-border/70 bg-white">
            <table className="border-collapse text-[10px]" style={{ minWidth: 1700 }}>
              <thead className="bg-[#eef5fb] text-[#123B63]">
                {/* Row 1 — group headers */}
                <tr>
                  <th className={TH_GROUP} rowSpan={2}>Piso</th>
                  <th className={TH_GROUP} rowSpan={2}>Servicio</th>
                  <th className={TH_GROUP} rowSpan={2}>Tipo</th>
                  <th className={TH_GROUP} colSpan={4}>Escenario (1)</th>
                  <th className={TH_GROUP} colSpan={7}>Estado de Camas</th>
                  <th className={TH_GROUP} colSpan={2}>Resultados Pendientes</th>
                  <th className={TH_GROUP} colSpan={5}>Ventilacion Mecanica (VM)</th>
                  <th className={TH_GROUP} colSpan={5}>Oxigeno Alto Flujo (AF)</th>
                </tr>
                {/* Row 2 — subcolumns */}
                <tr>
                  <th className={TH_SUB}>Camas Aprobadas (A)</th>
                  <th className={TH_SUB}>Brecha (B-A)</th>
                  <th className={TH_SUB}>% Ocupacion (C/A)</th>
                  <th className={TH_SUB}>Demanda Adicional</th>

                  <th className={TH_SUB}>Totales (B)</th>
                  <th className={TH_SUB}>Operativas</th>
                  <th className={TH_SUB}>Ocupadas (C)</th>
                  <th className={TH_SUB}>Disponibles</th>
                  <th className={TH_SUB}>Transitorias</th>
                  <th className={TH_SUB}>Inhabilitadas</th>
                  <th className={TH_SUB}>Covid (+)</th>

                  <th className={TH_SUB}>Antigena</th>
                  <th className={TH_SUB}>Molecular</th>

                  <th className={TH_SUB}>VM en uso (D)</th>
                  <th className={TH_SUB}>Total</th>
                  <th className={TH_SUB}>Operativas (E)</th>
                  <th className={TH_SUB}>Inoperativas</th>
                  <th className={TH_SUB}>% uso VM (D/E)</th>

                  <th className={TH_SUB}>AF en uso (F)</th>
                  <th className={TH_SUB}>Total</th>
                  <th className={TH_SUB}>Operativas (G)</th>
                  <th className={TH_SUB}>Inoperativas</th>
                  <th className={TH_SUB}>% uso AF (F/G)</th>
                </tr>
              </thead>
              <tbody>
                {tableItems.length === 0 ? (
                  <tr>
                    <td colSpan={26} className="px-3 py-5 text-center text-xs text-muted">
                      {loading ? 'Consultando monitoreo de camas...' : 'No se encuentran registros.'}
                    </td>
                  </tr>
                ) : (
                  tableItems.map((item, idx) => {
                    if (item.type === 'subtotal') {
                      return <SubtotalRow key={`sub-${idx}`} sums={item.sums} bg={item.bgColor} />
                    }
                    if (item.type === 'total') {
                      return <TotalGeneralRow key="total" sums={item.sums} />
                    }

                    const { row, metrics, showPiso, pisoSpan, showServicio, servicioSpan } = item

                    const pctBgColor = pctBg(metrics.porcentaje)
                    const difBgColor = difBg(metrics.diferencia)
                    const demBgColor = demandBg(metrics.demanda)
                    const disponiblesBgColor = availableBg(row.clibr, row.total)
                    const inhabilitadasBgColor = disabledBg(row.cinah, row.total)
                    const esperaAntBgColor = waitBg(row.espera_ant)
                    const esperaMolBgColor = waitBg(row.espera_mol)
                    const afInactive = isAfInactive(metrics)
                    const afMutedStyle = afInactive ? { backgroundColor: '#F8FAFC', color: '#94A3B8' } : undefined

                    return (
                      <tr key={`r-${idx}`} className={`${showServicio ? 'border-t-2 border-t-[#d5e2ef]' : ''} odd:bg-white even:bg-[#f8fbff]`}>

                        {/* Piso */}
                        {showPiso && (
                          <td className={TD_PISO} rowSpan={pisoSpan}>{row.piso}</td>
                        )}
                        {/* Servicio */}
                        {showServicio && (
                          <td className={TD_SERVICIO} rowSpan={servicioSpan}>{row.servicio}</td>
                        )}
                        {/* Tipo */}
                        <td className={TD_TIPO}>
                          <span className="inline-flex items-center gap-1">
                            <span className="text-slate-400">•</span>
                            <span>{row.tipo}</span>
                          </span>
                        </td>

                        {/* Escenario (1) */}
                        {showServicio && (
                          <>
                            <td className={TD} rowSpan={servicioSpan}>{metrics.camas}</td>
                            <td className={TD} rowSpan={servicioSpan}
                              style={{ backgroundColor: difBgColor || undefined }}>
                              {metrics.diferencia}
                            </td>
                            <td className={TD} rowSpan={servicioSpan} style={{ backgroundColor: pctBgColor }}>
                              {pctText(metrics.porcentaje)}
                            </td>
                            <td className={`${TD} ${metrics.demanda > 0 ? 'font-semibold text-[#8a3d00]' : ''}`} rowSpan={servicioSpan}
                              style={{ backgroundColor: demBgColor || undefined }}>
                              {metrics.demanda}
                            </td>
                          </>
                        )}

                        {/* Camas segun condicion */}
                        <td className={TD}>{row.total}</td>

                        {/* Operativas */}
                        <td className={TD}>
                          {row.chabi > 0 ? (
                            <button type="button"
                              className="h-5 rounded px-1.5 text-[10px] hover:opacity-80"
                              onClick={() => void openDetail('1', row)}>
                              {row.chabi}
                            </button>
                          ) : row.chabi}
                        </td>

                        {/* Ocupadas */}
                        <td className={TD} style={{ backgroundColor: row.cocup > 0 ? '#F3D979' : undefined }}>
                          {row.cocup > 0 ? (
                            <button type="button"
                              className="h-5 rounded px-1.5 text-[10px] hover:opacity-80"
                              onClick={() => void openDetail('2', row)}>
                              {row.cocup}
                            </button>
                          ) : row.cocup}
                        </td>

                        {/* Disponibles */}
                        <td className={TD} style={{ backgroundColor: disponiblesBgColor }}>
                          {row.clibr > 0 ? (
                            <button type="button"
                              className="h-5 rounded px-1.5 text-[10px] hover:opacity-80"
                              onClick={() => void openDetail('3', row)}>
                              {row.clibr}
                            </button>
                          ) : row.clibr}
                        </td>

                        {/* Transitorias */}
                        <td className={TD}>
                          {row.ctran > 0 ? (
                            <button type="button"
                              className="h-5 rounded px-1.5 text-[10px] hover:opacity-80"
                              onClick={() => void openDetail('4', row)}>
                              {row.ctran}
                            </button>
                          ) : row.ctran}
                        </td>

                        {/* Inhabilitadas */}
                        <td className={TD} style={{ backgroundColor: inhabilitadasBgColor }}>
                          {row.cinah > 0 ? (
                            <button type="button"
                              className="h-5 rounded px-1.5 text-[10px] hover:opacity-80"
                              onClick={() => void openDetail('5', row)}>
                              {row.cinah}
                            </button>
                          ) : row.cinah}
                        </td>

                        {/* Covid (+) */}
                        <td className={TD}>
                          {row.pcr > 0 ? (
                            <button type="button"
                              className="inline-block rounded bg-green-500 px-1.5 py-0.5 text-[10px] font-semibold text-white hover:bg-green-600"
                              onClick={() => void openDetail('8', row)}>
                              {row.pcr}
                            </button>
                          ) : row.pcr}
                        </td>

                        {/* Resultado Espera */}
                        {/* Antigena */}
                        <td className={TD} style={{ backgroundColor: esperaAntBgColor }}>
                          {row.espera_ant > 0 ? (
                            <button type="button"
                              className="inline-block rounded bg-[#d98b27] px-1.5 py-0.5 text-[10px] font-semibold text-white hover:opacity-90"
                              onClick={() => void openDetail('9', row)}>
                              {row.espera_ant}
                            </button>
                          ) : row.espera_ant}
                        </td>

                        {/* Molecular */}
                        <td className={TD} style={{ backgroundColor: esperaMolBgColor }}>
                          {row.espera_mol > 0 ? (
                            <button type="button"
                              className="inline-block rounded bg-[#d98b27] px-1.5 py-0.5 text-[10px] font-semibold text-white hover:opacity-90"
                              onClick={() => void openDetail('9a', row)}>
                              {row.espera_mol}
                            </button>
                          ) : row.espera_mol}
                        </td>

                        {/* Ventilacion Mecanica */}
                        {showServicio && (
                          <>
                            <td className={TD} rowSpan={servicioSpan} style={{ backgroundColor: '#B8E6FC' }}>
                              {metrics.c_vm > 0 ? (
                                <button type="button"
                                  className="h-5 rounded px-1.5 text-[10px] hover:opacity-80"
                                  onClick={() => void openDetail('6', row)}>
                                  {metrics.c_vm}
                                </button>
                              ) : metrics.c_vm}
                            </td>
                            <td className={TD} rowSpan={servicioSpan}>{numCell(metrics.totalvm)}</td>
                            <td className={TD} rowSpan={servicioSpan}>{numCell(metrics.vmopera)}</td>
                            <td className={TD} rowSpan={servicioSpan}>{numCell(metrics.vminopera)}</td>
                            <td className={TD} rowSpan={servicioSpan}
                              style={{ backgroundColor: metrics.vmopera > 0 ? pctBg(metrics.vmPct) : undefined }}>
                              {metrics.vmopera === 0 ? '0' : pctText(metrics.vmPct)}
                            </td>
                          </>
                        )}

                        {/* Oxigeno Alto Flujo */}
                        {showServicio && (
                          <>
                            <td className={TD} rowSpan={servicioSpan} style={afInactive ? afMutedStyle : { backgroundColor: '#B8E6FC' }}>
                              {metrics.c_fl > 0 ? (
                                <button type="button"
                                  className="h-5 rounded px-1.5 text-[10px] hover:opacity-80"
                                  onClick={() => void openDetail('7', row)}>
                                  {metrics.c_fl}
                                </button>
                              ) : metrics.c_fl}
                            </td>
                            <td className={TD} rowSpan={servicioSpan} style={afMutedStyle}>{numCell(metrics.totalaf)}</td>
                            <td className={TD} rowSpan={servicioSpan} style={afMutedStyle}>{numCell(metrics.afopera)}</td>
                            <td className={TD} rowSpan={servicioSpan} style={afMutedStyle}>{numCell(metrics.afinopera)}</td>
                            <td className={TD} rowSpan={servicioSpan}
                              style={afInactive
                                ? afMutedStyle
                                : { backgroundColor: metrics.afopera > 0 ? pctBg(metrics.afPct) : undefined }}>
                              {metrics.totalaf === 0 ? '—' : pctText(metrics.afPct)}
                            </td>
                          </>
                        )}
                      </tr>
                    )
                  })
                )}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>

      {/* Detail modal */}
      <Dialog open={isDetailOpen} onOpenChange={setIsDetailOpen}>
        <DialogContent className="w-[min(95vw,1300px)] max-w-none">
          <DialogHeader>
            <DialogTitle>{modalSpec.title}</DialogTitle>
          </DialogHeader>
          {detailLoading ? (
            <p className="py-6 text-center text-sm text-muted">Cargando detalle...</p>
          ) : (
            <DetailTable
              rows={detailRows}
              columns={modalSpec.columns.length > 0 ? modalSpec.columns
                : Object.keys(detailRows[0] ?? {}).map((k) => ({ key: k, label: k }))}
            />
          )}
        </DialogContent>
      </Dialog>
    </SighPageShell>
  )
}
