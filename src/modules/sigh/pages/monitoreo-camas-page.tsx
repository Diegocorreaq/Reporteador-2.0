import { useEffect, useMemo, useState, type CSSProperties } from 'react'
import { Download, RefreshCcw, Search } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Select } from '@/components/ui/select'
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

interface FilterState {
  search: string
  piso: string
  onlyDemand: boolean
  onlyNoAvailable: boolean
  onlyCovid: boolean
  onlyPending: boolean
  onlyRespiratory: boolean
}

interface DetailContext {
  servicio: string
  tipo: string
  title: string
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

  const c_vm = rows.reduce((sum, row) => sum + row.c_vm, 0)
  const totalvm = rows.reduce((max, row) => Math.max(max, row.totalvm), 0)
  const vmopera = rows.reduce((max, row) => Math.max(max, row.vmopera), 0)
  const vminopera = rows.reduce((max, row) => Math.max(max, row.vminopera), 0)

  const c_fl = rows.reduce((sum, row) => sum + row.c_fl, 0)
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

function normalizeFilterText(value: string): string {
  return value
    .trim()
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
}

function filterCamasRows(rawRows: SighTableRow[], filters: FilterState): SighTableRow[] {
  const search = normalizeFilterText(filters.search)
  const indexedRows = rawRows.map((raw, index) => ({ raw, row: parseCamasRow(raw), index }))
  const sortedRows = indexedRows
    .sort((left, right) => (
      compareNullableTextLast(left.row.piso, right.row.piso) ||
      compareNullableTextLast(left.row.servicio, right.row.servicio) ||
      compareNullableTextLast(left.row.tipo, right.row.tipo) ||
      left.index - right.index
    ))

  const groups: Array<{ rows: typeof sortedRows; metrics: ServiceMetrics }> = []
  for (const item of sortedRows) {
    const key = `${item.row.piso}|${item.row.idservicio}|${item.row.servicio}`
    const last = groups[groups.length - 1]
    const lastRow = last?.rows[0]?.row
    const lastKey = lastRow ? `${lastRow.piso}|${lastRow.idservicio}|${lastRow.servicio}` : ''
    if (last && lastKey === key) {
      last.rows.push(item)
      continue
    }
    groups.push({ rows: [item], metrics: computeServiceMetrics([item.row]) })
  }

  return groups.flatMap((group) => {
    group.metrics = computeServiceMetrics(group.rows.map((item) => item.row))
    const first = group.rows[0]?.row
    if (!first) return []

    const available = group.rows.reduce((sum, item) => sum + item.row.clibr, 0)
    const hasCovid = group.rows.some((item) => item.row.pcr > 0)
    const hasPending = group.rows.some((item) => item.row.espera_ant > 0 || item.row.espera_mol > 0)
    const hasRespiratory = group.metrics.c_vm > 0 || group.metrics.c_fl > 0
    const serviceText = normalizeFilterText(first.servicio)

    if (search && !serviceText.includes(search)) return []
    if (filters.piso && first.piso !== filters.piso) return []
    if (filters.onlyDemand && group.metrics.demanda <= 0) return []
    if (filters.onlyNoAvailable && available > 0) return []
    if (filters.onlyCovid && !hasCovid) return []
    if (filters.onlyPending && !hasPending) return []
    if (filters.onlyRespiratory && !hasRespiratory) return []

    return group.rows.map((item) => item.raw)
  })
}

// ─── Color helpers ────────────────────────────────────────────────────────────

const NOT_APPLICABLE_BG = '#E2E8F0'
const NOT_APPLICABLE_TEXT = '#475569'

function hasApprovedBeds(camas: number): boolean {
  return Number.isFinite(camas) && camas > 0
}

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

function occupancyText(camas: number, pct: number): string {
  return hasApprovedBeds(camas) ? pctText(pct) : 'N/A'
}

function occupancyStyle(camas: number, pct: number): CSSProperties {
  return hasApprovedBeds(camas)
    ? { backgroundColor: pctBg(pct) }
    : { backgroundColor: NOT_APPLICABLE_BG, color: NOT_APPLICABLE_TEXT, fontWeight: 700 }
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

function detailTitle(type: string): string {
  const titles: Record<string, string> = {
    '1': 'camas operativas',
    '2': 'camas ocupadas',
    '3': 'camas disponibles',
    '4': 'camas transitorias',
    '5': 'camas inhabilitadas',
    '6': 'ventilación mecánica',
    '7': 'oxígeno de alto flujo',
    '8': 'pacientes Covid (+)',
    '9': 'pendientes antígeno',
    '9a': 'pendientes molecular',
  }

  return titles[type] ?? 'detalle'
}

// ─── Cell helpers ─────────────────────────────────────────────────────────────

const STICKY_PISO_WIDTH = 116
const STICKY_SERVICIO_WIDTH = 248
const STICKY_TIPO_WIDTH = 132

const TH = 'border border-[#b8c8d8] px-2 py-1.5 text-[10px] font-bold text-center leading-tight'
const TH_GROUP = `${TH} bg-[#dbeaf6] text-[#0f3558]`
const TH_SUB = `${TH} bg-[#f3f8fc] text-[#123B63]`
const TD = 'border border-border/60 px-2 py-1 text-[10.5px] text-center leading-tight'
const TD_PISO = `${TD} bg-[#f8fbff] font-semibold text-[#1f3650] align-top`
const TD_SERVICIO = `${TD} bg-[#f4f9fd] font-semibold text-[#123B63] text-left align-top leading-snug`
const TD_TIPO = `${TD} text-left pl-3 text-[#334155] bg-white`
const TD_SUBTOTAL = 'border border-border/60 px-2 py-1 text-[10.5px] text-center font-bold'
const STICKY_SHADOW = 'shadow-[8px_0_12px_-12px_rgba(15,41,66,0.6)]'

const stickyPisoStyle: CSSProperties = { left: 0, minWidth: STICKY_PISO_WIDTH, width: STICKY_PISO_WIDTH }
const stickyServicioStyle: CSSProperties = {
  left: STICKY_PISO_WIDTH,
  minWidth: STICKY_SERVICIO_WIDTH,
  width: STICKY_SERVICIO_WIDTH,
}
const stickyTipoStyle: CSSProperties = {
  left: STICKY_PISO_WIDTH + STICKY_SERVICIO_WIDTH,
  minWidth: STICKY_TIPO_WIDTH,
  width: STICKY_TIPO_WIDTH,
}

function numCell(v: number): string {
  return String(Number.isFinite(v) ? v : 0)
}

function DetailValueButton({
  value,
  label,
  tone = 'default',
  onClick,
}: {
  value: number
  label: string
  tone?: 'default' | 'warning' | 'success' | 'support'
  onClick: () => void
}) {
  if (value <= 0) {
    return <>{value}</>
  }

  const toneClass = {
    default: 'border-[#91b2cc] bg-white text-[#0f3558] hover:bg-[#e9f4fb]',
    warning: 'border-[#d89a40] bg-[#fff7e6] text-[#7a3b00] hover:bg-[#ffe9ba]',
    success: 'border-[#58a56f] bg-[#e9f8ee] text-[#176234] hover:bg-[#d6f2df]',
    support: 'border-[#5aa7cc] bg-[#e5f6fd] text-[#075985] hover:bg-[#d4eef9]',
  }[tone]

  return (
    <button
      type="button"
      className={`inline-flex min-w-6 cursor-pointer items-center justify-center rounded-full border px-2 py-0.5 text-[10px] font-bold shadow-sm transition ${toneClass}`}
      title={label}
      aria-label={label}
      onClick={onClick}
    >
      {value}
    </button>
  )
}

function FilterChip({
  active,
  children,
  onClick,
}: {
  active: boolean
  children: string
  onClick: () => void
}) {
  return (
    <button
      type="button"
      className={`h-8 rounded-full border px-3 text-[11px] font-semibold transition ${
        active
          ? 'border-[#005F8F] bg-[#e3f2fb] text-[#005F8F] shadow-sm'
          : 'border-border bg-white text-[#39546b] hover:border-[#7aaac4] hover:bg-[#f4f9fd]'
      }`}
      aria-pressed={active}
      onClick={onClick}
    >
      {children}
    </button>
  )
}

function KpiStrip({ totals }: { totals: Sums | null }) {
  if (!totals) return null

  const items = [
    { label: 'Operativas', value: totals.chabi },
    { label: 'Ocupadas', value: totals.cocup },
    { label: 'Disponibles', value: totals.clibr },
    { label: 'Demanda adicional', value: totals.demanda, alert: totals.demanda > 0 },
    { label: 'Covid (+)', value: totals.pcr, alert: totals.pcr > 0 },
    { label: 'Pendientes antígeno', value: totals.espera_ant, alert: totals.espera_ant > 0 },
    { label: 'Pendientes molecular', value: totals.espera_mol, alert: totals.espera_mol > 0 },
    { label: 'VM en uso', value: totals.c_vm, support: true },
    { label: 'AF en uso', value: totals.c_fl, support: true },
  ]

  return (
    <div className="mb-4 grid gap-2 sm:grid-cols-2 lg:grid-cols-5 xl:grid-cols-9">
      {items.map((item) => (
        <div
          key={item.label}
          className={`rounded-md border px-3 py-2 shadow-sm ${
            item.alert
              ? 'border-[#e3b15f] bg-[#fff8e8]'
              : item.support
                ? 'border-[#a7d7ec] bg-[#eef9fd]'
                : 'border-border bg-[#fbfdff]'
          }`}
        >
          <p className="text-[10px] font-bold uppercase leading-tight text-[#4b6478]">{item.label}</p>
          <p className="mt-1 text-xl font-bold text-[#0f3558]">{item.value}</p>
        </div>
      ))}
    </div>
  )
}

function ColorLegend() {
  const items = [
    { label: 'Estable / disponible', color: '#BFE8C3' },
    { label: 'Atención', color: '#F6E78B' },
    { label: 'Alerta', color: '#F2C27A' },
    { label: 'Crítico', color: '#F2A6A6' },
    { label: 'Soporte VM/AF', color: '#B8E6FC' },
    { label: 'N/A / sin camas aprobadas', color: NOT_APPLICABLE_BG },
  ]

  return (
    <div className="mb-3 flex flex-wrap items-center gap-2 rounded-md border border-border/70 bg-[#fbfdff] px-3 py-2">
      <span className="mr-1 text-[11px] font-bold uppercase text-[#365268]">Leyenda</span>
      {items.map((item) => (
        <span key={item.label} className="inline-flex items-center gap-1.5 text-[11px] text-[#425b70]">
          <span className="h-3 w-3 rounded-sm border border-black/10" style={{ backgroundColor: item.color }} />
          {item.label}
        </span>
      ))}
    </div>
  )
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

function occupancyPctText(num: number, den: number): string {
  return hasApprovedBeds(den) ? safePct(num, den) : 'N/A'
}

function SubtotalRow({ sums, bg }: { sums: Sums; bg: string }) {
  const tdSubtotal = `${TD_SUBTOTAL} border-t-2 border-t-[#c9d7e6]`
  const subtotalBg = bg === '#D7D7D7' ? '#e8edf3' : '#f2f5f9'

  return (
    <tr style={{ backgroundColor: subtotalBg }}>
      <td
        colSpan={3}
        className={`${tdSubtotal} sticky z-10 text-right tracking-wide text-[#1f3650] ${STICKY_SHADOW}`}
        style={{ left: 0, minWidth: STICKY_PISO_WIDTH + STICKY_SERVICIO_WIDTH + STICKY_TIPO_WIDTH, backgroundColor: subtotalBg }}
      >
        Sub Total
      </td>
      {/* Escenario (1) */}
      <td className={tdSubtotal}>{sums.camas}</td>
      <td className={tdSubtotal}>{sums.totcamas - sums.camas}</td>
      <td className={tdSubtotal}>{occupancyPctText(Math.min(sums.tocupa, sums.camas), sums.camas)}</td>
      <td className={tdSubtotal}>{sums.demanda}</td>
      {/* Camas según condición */}
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
      <td
        colSpan={3}
        className={`${tdTotal} sticky z-10 text-right text-[11px] tracking-wide ${STICKY_SHADOW}`}
        style={{ left: 0, minWidth: STICKY_PISO_WIDTH + STICKY_SERVICIO_WIDTH + STICKY_TIPO_WIDTH }}
      >
        Total General
      </td>
      <td className={tdTotal}>{sums.camas}</td>
      <td className={tdTotal}>{sums.totcamas - sums.camas}</td>
      <td className={tdTotal}>{occupancyPctText(Math.min(sums.tocupa, sums.camas), sums.camas)}</td>
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
  const [filters, setFilters] = useState<FilterState>({
    search: '',
    piso: '',
    onlyDemand: false,
    onlyNoAvailable: false,
    onlyCovid: false,
    onlyPending: false,
    onlyRespiratory: false,
  })

  const [detailRows, setDetailRows] = useState<SighTableRow[]>([])
  const [detailLoading, setDetailLoading] = useState(false)
  const [detailType, setDetailType] = useState<string>('')
  const [detailContext, setDetailContext] = useState<DetailContext | null>(null)
  const [isDetailOpen, setIsDetailOpen] = useState(false)

  const handleFetch = async () => {
    if (loading) return
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
    setDetailContext({
      servicio: row.servicio,
      tipo: row.tipo,
      title: detailTitle(type),
    })
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

  const pisos = useMemo(() => {
    const values = new Set(rows.map((row) => parseCamasRow(row).piso).filter(Boolean))
    return [...values].sort(compareNullableTextLast)
  }, [rows])

  const filteredRows = useMemo(() => filterCamasRows(rows, filters), [rows, filters])
  const tableItems = useMemo(() => processCamasData(filteredRows), [filteredRows])
  const totalSummary = useMemo(() => {
    const totalItem = [...tableItems].reverse().find((item) => item.type === 'total')
    if (!totalItem || totalItem.type !== 'total') {
      return null
    }

    return totalItem.sums
  }, [tableItems])

  const modalSpec = CAMAS_DETAIL_MODAL_SPECS[detailType] ?? { title: 'Detalle', columns: [] }

  return (
    <SighPageShell
      error={error}
      description="Resumen operativo de camas por piso/servicio/tipo con accesos de detalle y exportación."
      actions={
        <>
          <Button className="w-full sm:w-auto" size="sm" variant="outline" disabled={loading} onClick={() => void handleFetch()}>
            <RefreshCcw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
            {loading ? 'Actualizando' : 'Actualizar'}
          </Button>
          <Button
            size="sm"
            className="w-full gap-1.5 font-semibold sm:w-auto"
            style={{ backgroundColor: '#005F8F', color: '#fff' }}
            onClick={() => void downloadMonitoreoCamasResumen()}
          >
            <Download className="h-4 w-4" /> Resumen por Piso
          </Button>
          <Button
            size="sm"
            className="w-full gap-1.5 font-semibold sm:w-auto"
            style={{ backgroundColor: '#2C6E99', color: '#fff' }}
            onClick={() => void downloadMonitoreoCamasSusalud()}
          >
            <Download className="h-4 w-4" /> Resumen SUSALUD
          </Button>
        </>
      }
    >
      <Card className="border-border/70">
        <CardHeader className="border-b border-border/60 pb-3">
          <CardTitle className="text-sm">Resumen de camas</CardTitle>
        </CardHeader>
        <CardContent className="pt-4">
          <KpiStrip totals={totalSummary} />

          <div className="mb-3 rounded-md border border-border/70 bg-[#f8fbfe] p-3">
            <div className="grid gap-2 lg:grid-cols-[minmax(220px,1fr)_220px_auto]">
              <label className="relative block">
                <span className="sr-only">Buscar servicio</span>
                <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted" />
                <Input
                  className="h-9 rounded-md pl-9 text-xs"
                  placeholder="Buscar por servicio"
                  value={filters.search}
                  onChange={(event) => setFilters((current) => ({ ...current, search: event.target.value }))}
                />
              </label>
              <Select
                className="h-9 rounded-md text-xs"
                value={filters.piso}
                aria-label="Filtrar por piso"
                onChange={(event) => setFilters((current) => ({ ...current, piso: event.target.value }))}
              >
                <option value="">Todos los pisos</option>
                {pisos.map((piso) => (
                  <option key={piso} value={piso}>{piso}</option>
                ))}
              </Select>
              <div className="flex flex-wrap gap-2">
                <FilterChip active={filters.onlyDemand} onClick={() => setFilters((current) => ({ ...current, onlyDemand: !current.onlyDemand }))}>
                  Solo con demanda adicional
                </FilterChip>
                <FilterChip active={filters.onlyNoAvailable} onClick={() => setFilters((current) => ({ ...current, onlyNoAvailable: !current.onlyNoAvailable }))}>
                  Solo sin disponibles
                </FilterChip>
                <FilterChip active={filters.onlyCovid} onClick={() => setFilters((current) => ({ ...current, onlyCovid: !current.onlyCovid }))}>
                  Solo con Covid
                </FilterChip>
                <FilterChip active={filters.onlyPending} onClick={() => setFilters((current) => ({ ...current, onlyPending: !current.onlyPending }))}>
                  Solo con pendientes
                </FilterChip>
                <FilterChip active={filters.onlyRespiratory} onClick={() => setFilters((current) => ({ ...current, onlyRespiratory: !current.onlyRespiratory }))}>
                  Solo con VM/AF en uso
                </FilterChip>
              </div>
            </div>
          </div>

          <ColorLegend />

          <p className="mb-2 text-[11px] text-muted sm:hidden">Desliza horizontalmente para ver toda la matriz operativa.</p>

          <div className="relative">
            {loading && rows.length > 0 ? (
              <div className="pointer-events-none absolute right-3 top-3 z-30 rounded-full border border-[#bcd8e8] bg-white/95 px-3 py-1 text-[11px] font-semibold text-[#005F8F] shadow-sm">
                Actualizando datos...
              </div>
            ) : null}
            <div className="max-h-[68vh] overflow-auto rounded-md border border-border/70 bg-white">
            <table className="border-separate border-spacing-0 text-[10px]" style={{ minWidth: 1780 }}>
              <thead className="bg-[#eef5fb] text-[#123B63]">
                {/* Row 1 - group headers */}
                <tr>
                  <th className={`${TH_GROUP} sticky top-0 z-30`} style={{ ...stickyPisoStyle, backgroundColor: '#dbeaf6' }} rowSpan={2}>Piso</th>
                  <th className={`${TH_GROUP} sticky top-0 z-30`} style={{ ...stickyServicioStyle, backgroundColor: '#dbeaf6' }} rowSpan={2}>Servicio</th>
                  <th className={`${TH_GROUP} sticky top-0 z-30 ${STICKY_SHADOW}`} style={{ ...stickyTipoStyle, backgroundColor: '#dbeaf6' }} rowSpan={2}>Tipo</th>
                  <th className={`${TH_GROUP} sticky top-0 z-20`} colSpan={4}>Escenario (1)</th>
                  <th className={`${TH_GROUP} sticky top-0 z-20`} colSpan={7}>Camas según condición</th>
                  <th className={`${TH_GROUP} sticky top-0 z-20`} colSpan={2}>Resultados Pendientes</th>
                  <th className={`${TH_GROUP} sticky top-0 z-20`} colSpan={5}>Ventilación Mecánica (VM)</th>
                  <th className={`${TH_GROUP} sticky top-0 z-20`} colSpan={5}>Oxígeno Alto Flujo (AF)</th>
                </tr>
                {/* Row 2 - subcolumns */}
                <tr>
                  <th className={`${TH_SUB} sticky top-[33px] z-20`}>Camas Aprobadas (A)</th>
                  <th className={`${TH_SUB} sticky top-[33px] z-20`}>Brecha (B-A)</th>
                  <th className={`${TH_SUB} sticky top-[33px] z-20`}>% Ocupación (C/A)</th>
                  <th className={`${TH_SUB} sticky top-[33px] z-20`}>Demanda Adicional</th>

                  <th className={`${TH_SUB} sticky top-[33px] z-20`}>Totales (B)</th>
                  <th className={`${TH_SUB} sticky top-[33px] z-20`}>Operativas</th>
                  <th className={`${TH_SUB} sticky top-[33px] z-20`}>Ocupadas (C)</th>
                  <th className={`${TH_SUB} sticky top-[33px] z-20`}>Disponibles</th>
                  <th className={`${TH_SUB} sticky top-[33px] z-20`}>Transitorias</th>
                  <th className={`${TH_SUB} sticky top-[33px] z-20`}>Inhabilitadas</th>
                  <th className={`${TH_SUB} sticky top-[33px] z-20`}>Covid (+)</th>

                  <th className={`${TH_SUB} sticky top-[33px] z-20`}>Antígena</th>
                  <th className={`${TH_SUB} sticky top-[33px] z-20`}>Molecular</th>

                  <th className={`${TH_SUB} sticky top-[33px] z-20`}>VM en uso (D)</th>
                  <th className={`${TH_SUB} sticky top-[33px] z-20`}>Total</th>
                  <th className={`${TH_SUB} sticky top-[33px] z-20`}>Operativas (E)</th>
                  <th className={`${TH_SUB} sticky top-[33px] z-20`}>Inoperativas</th>
                  <th className={`${TH_SUB} sticky top-[33px] z-20`}>% uso VM (D/E)</th>

                  <th className={`${TH_SUB} sticky top-[33px] z-20`}>AF en uso (F)</th>
                  <th className={`${TH_SUB} sticky top-[33px] z-20`}>Total</th>
                  <th className={`${TH_SUB} sticky top-[33px] z-20`}>Operativas (G)</th>
                  <th className={`${TH_SUB} sticky top-[33px] z-20`}>Inoperativas</th>
                  <th className={`${TH_SUB} sticky top-[33px] z-20`}>% uso AF (F/G)</th>
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
                          <td
                            className={`${TD_PISO} sticky z-10`}
                            style={{ ...stickyPisoStyle, backgroundColor: '#f8fbff' }}
                            rowSpan={pisoSpan}
                          >
                            {row.piso}
                          </td>
                        )}
                        {/* Servicio */}
                        {showServicio && (
                          <td
                            className={`${TD_SERVICIO} sticky z-10`}
                            style={{ ...stickyServicioStyle, backgroundColor: '#f4f9fd' }}
                            rowSpan={servicioSpan}
                          >
                            {row.servicio}
                          </td>
                        )}
                        {/* Tipo */}
                        <td
                          className={`${TD_TIPO} sticky z-10 ${STICKY_SHADOW}`}
                          style={{ ...stickyTipoStyle, backgroundColor: '#fff' }}
                        >
                          <span className="inline-flex items-center gap-1">
                            <span className="text-slate-400">-</span>
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
                            <td className={TD} rowSpan={servicioSpan} style={occupancyStyle(metrics.camas, metrics.porcentaje)}>
                              {occupancyText(metrics.camas, metrics.porcentaje)}
                            </td>
                            <td className={`${TD} ${metrics.demanda > 0 ? 'font-semibold text-[#8a3d00]' : ''}`} rowSpan={servicioSpan}
                              style={{ backgroundColor: demBgColor || undefined }}>
                              {metrics.demanda}
                            </td>
                          </>
                        )}

                        {/* Camas según condición */}
                        <td className={TD}>{row.total}</td>

                        {/* Operativas */}
                        <td className={TD}>
                          <DetailValueButton value={row.chabi} label="Ver detalle de camas operativas" onClick={() => void openDetail('1', row)} />
                        </td>

                        {/* Ocupadas */}
                        <td className={TD} style={{ backgroundColor: row.cocup > 0 ? '#F3D979' : undefined }}>
                          <DetailValueButton value={row.cocup} label="Ver detalle de camas ocupadas" tone="warning" onClick={() => void openDetail('2', row)} />
                        </td>

                        {/* Disponibles */}
                        <td className={TD} style={{ backgroundColor: disponiblesBgColor }}>
                          <DetailValueButton value={row.clibr} label="Ver detalle de camas disponibles" tone="success" onClick={() => void openDetail('3', row)} />
                        </td>

                        {/* Transitorias */}
                        <td className={TD}>
                          <DetailValueButton value={row.ctran} label="Ver detalle de camas transitorias" onClick={() => void openDetail('4', row)} />
                        </td>

                        {/* Inhabilitadas */}
                        <td className={TD} style={{ backgroundColor: inhabilitadasBgColor }}>
                          <DetailValueButton value={row.cinah} label="Ver detalle de camas inhabilitadas" tone="warning" onClick={() => void openDetail('5', row)} />
                        </td>

                        {/* Covid (+) */}
                        <td className={TD}>
                          <DetailValueButton value={row.pcr} label="Ver detalle de pacientes Covid positivo" tone="success" onClick={() => void openDetail('8', row)} />
                        </td>

                        {/* Resultado Espera */}
                        {/* Antígena */}
                        <td className={TD} style={{ backgroundColor: esperaAntBgColor }}>
                          <DetailValueButton value={row.espera_ant} label="Ver resultados pendientes antígeno" tone="warning" onClick={() => void openDetail('9', row)} />
                        </td>

                        {/* Molecular */}
                        <td className={TD} style={{ backgroundColor: esperaMolBgColor }}>
                          <DetailValueButton value={row.espera_mol} label="Ver resultados pendientes molecular" tone="warning" onClick={() => void openDetail('9a', row)} />
                        </td>

                        {/* Ventilación Mecánica */}
                        {showServicio && (
                          <>
                            <td className={TD} rowSpan={servicioSpan} style={{ backgroundColor: '#B8E6FC' }}>
                              <DetailValueButton value={metrics.c_vm} label="Ver detalle de ventilación mecánica en uso" tone="support" onClick={() => void openDetail('6', row)} />
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

                        {/* Oxígeno Alto Flujo */}
                        {showServicio && (
                          <>
                            <td className={TD} rowSpan={servicioSpan} style={afInactive ? afMutedStyle : { backgroundColor: '#B8E6FC' }}>
                              <DetailValueButton value={metrics.c_fl} label="Ver detalle de oxígeno alto flujo en uso" tone="support" onClick={() => void openDetail('7', row)} />
                            </td>
                            <td className={TD} rowSpan={servicioSpan} style={afMutedStyle}>{numCell(metrics.totalaf)}</td>
                            <td className={TD} rowSpan={servicioSpan} style={afMutedStyle}>{numCell(metrics.afopera)}</td>
                            <td className={TD} rowSpan={servicioSpan} style={afMutedStyle}>{numCell(metrics.afinopera)}</td>
                            <td className={TD} rowSpan={servicioSpan}
                              style={afInactive
                                ? afMutedStyle
                                : { backgroundColor: metrics.afopera > 0 ? pctBg(metrics.afPct) : undefined }}>
                              {metrics.totalaf === 0 ? '-' : pctText(metrics.afPct)}
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
          </div>
        </CardContent>
      </Card>

      {/* Detail modal */}
      <Dialog open={isDetailOpen} onOpenChange={setIsDetailOpen}>
        <DialogContent className="w-[min(95vw,1300px)] max-w-none">
          <DialogHeader>
            <DialogTitle>{modalSpec.title}</DialogTitle>
            {detailContext ? (
              <DialogDescription>
                {detailContext.servicio} - {detailContext.tipo} - {detailContext.title}
              </DialogDescription>
            ) : null}
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
