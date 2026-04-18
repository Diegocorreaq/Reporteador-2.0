import { useEffect, useMemo, useState } from 'react'
import { Download, RefreshCcw } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { SighPageShell } from '@/modules/sigh/components/sigh-page-shell'
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
  camas: number
  total: number
  tocupa: number
  chabi: number
  cocup: number
  clibr: number
  ctran: number
  cinah: number
  pcr: number
  espera: number
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
  veces: number
  veces1: number
}

interface Sums {
  camas: number
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
  showPiso: boolean
  showServicio: boolean
  showVecesGroup: boolean
  vecesSpan: number
  showVeces1Group: boolean
  veces1Span: number
  diferencia: number
  porcentaje: number
  demandaA: number
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
    camas: n('camas'),
    total: n('total'),
    tocupa: n('tocupa'),
    chabi: n('chabi'),
    cocup: n('cocup'),
    clibr: n('clibr'),
    ctran: n('ctran'),
    cinah: n('cinah'),
    pcr: n('pcr'),
    espera: n('espera'),
    espera_ant: n('espera_ant'),
    espera_mol: n('espera_mol'),
    c_vm: n('c_vm'),
    totalvm: n('totalvm'),
    vmopera: n('vmopera'),
    vminopera: n('vminopera'),
    c_fl: n('c_fl'),
    totalaf: n('totalaf'),
    afopera: n('afopera'),
    afinopera: n('afinopera'),
    veces: n('veces') || 1,
    veces1: n('veces1') || 1,
  }
}

function emptySums(): Sums {
  return {
    camas: 0, total: 0, chabi: 0, cocup: 0, clibr: 0,
    ctran: 0, cinah: 0, pcr: 0, espera_ant: 0, espera_mol: 0,
    c_vm: 0, totalvm: 0, vmopera: 0, vminopera: 0,
    c_fl: 0, totalaf: 0, afopera: 0, afinopera: 0,
  }
}

function addRowToSums(s: Sums, row: CamasRow, isVecesFirst: boolean, isVeces1First: boolean) {
  if (isVecesFirst) s.camas += row.camas
  if (isVeces1First) { s.totalvm += row.totalvm; s.totalaf += row.totalaf }
  s.total += row.total
  s.chabi += row.chabi
  s.cocup += row.cocup
  s.clibr += row.clibr
  s.ctran += row.ctran
  s.cinah += row.cinah
  s.pcr += row.pcr
  s.espera_ant += row.espera_ant
  s.espera_mol += row.espera_mol
  s.c_vm += row.c_vm
  s.vmopera += row.vmopera
  s.vminopera += row.vminopera
  s.c_fl += row.c_fl
  s.afopera += row.afopera
  s.afinopera += row.afinopera
}

function processCamasData(rawRows: SighTableRow[]): TableItem[] {
  const rows = rawRows.map(parseCamasRow)
  const items: TableItem[] = []

  let currentPiso = ''
  let prevServicio = ''
  let xfilas = 1, xfl = 1
  let xfilas1 = 1, xfl1 = 1
  let pisoSums = emptySums()
  let globalSums = emptySums()

  for (let i = 0; i < rows.length; i++) {
    const row = rows[i]

    const isVecesFirst = xfilas === 1 || xfilas > xfl
    if (isVecesFirst) { xfilas = 1; xfl = row.veces || 1 }

    const isVeces1First = xfilas1 === 1 || xfilas1 > xfl1
    if (isVeces1First) { xfilas1 = 1; xfl1 = row.veces1 || 1 }

    const pisoChanged = i > 0 && row.piso !== currentPiso

    if (pisoChanged) {
      items.push({ type: 'subtotal', sums: { ...pisoSums }, bgColor: '#D7D7D7' })
      pisoSums = emptySums()
    }

    addRowToSums(pisoSums, row, isVecesFirst, isVeces1First)
    addRowToSums(globalSums, row, isVecesFirst, isVeces1First)

    const diferencia = isVecesFirst ? row.total - row.camas : 0
    const demandaA   = isVecesFirst ? row.tocupa - row.camas : 0
    const porcentaje = isVecesFirst
      ? row.camas > 0 ? (row.tocupa / row.camas) * 100 : NaN
      : NaN

    items.push({
      type: 'data',
      row,
      showPiso: pisoChanged || i === 0,
      showServicio: row.servicio !== prevServicio,
      showVecesGroup: isVecesFirst,
      vecesSpan: xfl,
      showVeces1Group: isVeces1First,
      veces1Span: xfl1,
      diferencia,
      porcentaje,
      demandaA,
    })

    if (i === rows.length - 1) {
      items.push({ type: 'subtotal', sums: { ...pisoSums }, bgColor: '#F0F1F1' })
    }

    currentPiso = row.piso
    prevServicio = row.servicio
    xfilas++
    xfilas1++
  }

  if (rows.length > 0) {
    items.push({ type: 'total', sums: globalSums })
  }

  return items
}

// ─── Color helpers ────────────────────────────────────────────────────────────

function pctBg(pct: number): string {
  if (!Number.isFinite(pct)) return '#D3D3D3'
  if (pct <= 0)  return '#9DDE58'
  if (pct <= 60) return '#9DDE58'
  if (pct <= 80) return '#F6F871'
  if (pct <= 100) return '#FB6C5D'
  return '#D37DFA'
}

function pctText(pct: number): string {
  if (!Number.isFinite(pct)) return 'NaN'
  if (pct > 100) return '100+'
  return String(Math.round(pct))
}

function pctTitle(pct: number): string | undefined {
  if (pct > 100) return `+${Math.round(pct - 100)}%`
  return undefined
}

function difBg(dif: number): string {
  if (dif > 0) return '#F6F871'
  if (dif < 0) return '#FB6C5D'
  return ''
}

// ─── Cell helpers ─────────────────────────────────────────────────────────────

const TH = 'border border-border px-1.5 py-1 text-[10px] font-semibold uppercase text-center'
const TD = 'border border-border/60 px-1.5 py-0.5 text-[10px] text-center'
const TD_SUBTOTAL = 'border border-border/60 px-1.5 py-0.5 text-[10px] text-center font-bold'

function numCell(v: number): string {
  return v === 0 ? '' : String(v)
}

// ─── Modal config ─────────────────────────────────────────────────────────────

interface ModalSpec {
  title: string
  columns: { key: string; label: string }[]
}

const MODAL_SPECS: Record<string, ModalSpec> = {
  '1': {
    title: 'Camas Operativas',
    columns: [
      { key: 'piso',        label: 'Tipo' },
      { key: 'codigocama',  label: 'Cod. Cama' },
      { key: 'estadocama',  label: 'Estado' },
      { key: 'paciente',    label: 'Paciente' },
    ],
  },
  '2': {
    title: 'Camas Ocupadas',
    columns: [
      { key: 'piso',        label: 'Tipo' },
      { key: 'codigocama',  label: 'Cod. Cama' },
      { key: 'estadocama',  label: 'Estado' },
      { key: 'paciente',    label: 'Paciente' },
    ],
  },
  '3': {
    title: 'Camas Disponibles',
    columns: [
      { key: 'piso',        label: 'Tipo' },
      { key: 'codigocama',  label: 'Cod. Cama' },
      { key: 'estadocama',  label: 'Estado' },
      { key: 'libre',       label: 'Libre Desde' },
    ],
  },
  '4': {
    title: 'Camas Transitorias',
    columns: [
      { key: 'piso',        label: 'Tipo' },
      { key: 'codigocama',  label: 'Cod. Cama' },
      { key: 'estadocama',  label: 'Estado' },
      { key: 'paciente',    label: 'Paciente' },
    ],
  },
  '5': {
    title: 'Camas Inhabilitadas',
    columns: [
      { key: 'piso',        label: 'Tipo' },
      { key: 'codigocama',  label: 'Cod. Cama' },
      { key: 'estadocama',  label: 'Estado' },
      { key: 'paciente',    label: 'Paciente' },
    ],
  },
  '6': {
    title: 'Ventilacion Mecanica — En Uso',
    columns: [
      { key: 'idcuenta',    label: 'Nro Cuenta' },
      { key: 'codigocama',  label: 'Cod. Cama' },
      { key: 'estadocama',  label: 'Estado' },
      { key: 'paciente',    label: 'Paciente' },
    ],
  },
  '7': {
    title: 'Oxigeno Alto Flujo — En Uso',
    columns: [
      { key: 'idcuenta',    label: 'Nro Cuenta' },
      { key: 'codigocama',  label: 'Cod. Cama' },
      { key: 'estadocama',  label: 'Estado' },
      { key: 'paciente',    label: 'Paciente' },
    ],
  },
  '8': {
    title: 'Prueba Realizada — Covid (+)',
    columns: [
      { key: 'idcuenta',    label: 'Nro Cuenta' },
      { key: 'paciente',    label: 'Paciente' },
      { key: 'cama',        label: 'Nro Cama' },
      { key: 'tipomuestra', label: 'Tipo Muestra' },
      { key: 'tipoprueba',  label: 'Tipo Prueba' },
      { key: 'fecha_i',     label: 'Fecha Ingreso' },
      { key: 'fecha_s',     label: 'Inicio Sintomas' },
      { key: 'fecha_m',     label: 'Fecha Solicitud' },
      { key: 'fecha_r',     label: 'Fecha Resultado' },
      { key: 'dias',        label: 'Dias c/Sintomas' },
      { key: 'diah',        label: 'Dias Estancia' },
      { key: 'caso',        label: 'Tipo Caso' },
    ],
  },
  '9': {
    title: 'Pendiente de Resultado — Antigena',
    columns: [
      { key: 'idcuenta',    label: 'Nro Cuenta' },
      { key: 'paciente',    label: 'Paciente' },
      { key: 'cama',        label: 'Nro Cama' },
      { key: 'tipomuestra', label: 'Tipo Muestra' },
      { key: 'tipoprueba',  label: 'Tipo Prueba' },
      { key: 'fecha_i',     label: 'Fecha Ingreso' },
      { key: 'fecha_s',     label: 'Inicio Sintomas' },
      { key: 'fecha_m',     label: 'Fecha Solicitud' },
      { key: 'fecha_r',     label: 'Fecha Resultado' },
      { key: 'dias',        label: 'Dias c/Sintomas' },
      { key: 'diah',        label: 'Dias Estancia' },
      { key: 'caso',        label: 'Tipo Caso' },
    ],
  },
  '9a': {
    title: 'Pendiente de Resultado — Molecular',
    columns: [
      { key: 'idcuenta',    label: 'Nro Cuenta' },
      { key: 'paciente',    label: 'Paciente' },
      { key: 'cama',        label: 'Nro Cama' },
      { key: 'tipomuestra', label: 'Tipo Muestra' },
      { key: 'tipoprueba',  label: 'Tipo Prueba' },
      { key: 'fecha_i',     label: 'Fecha Ingreso' },
      { key: 'fecha_s',     label: 'Inicio Sintomas' },
      { key: 'fecha_m',     label: 'Fecha Solicitud' },
      { key: 'fecha_r',     label: 'Fecha Resultado' },
      { key: 'dias',        label: 'Dias c/Sintomas' },
      { key: 'diah',        label: 'Dias Estancia' },
      { key: 'caso',        label: 'Tipo Caso' },
    ],
  },
}

// ─── Detail modal table ───────────────────────────────────────────────────────

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
  if (!den) return '0'
  return String(Math.round((num / den) * 100))
}

function SubtotalRow({ sums, bg }: { sums: Sums; bg: string }) {
  return (
    <tr style={{ backgroundColor: bg }}>
      <td colSpan={3} className={`${TD_SUBTOTAL} text-right`}>Sub Total</td>
      {/* Escenario (1) */}
      <td className={TD_SUBTOTAL}>{sums.camas}</td>
      <td className={TD_SUBTOTAL}>{sums.total - sums.camas}</td>
      <td className={TD_SUBTOTAL}>{safePct(sums.cocup, sums.camas)}</td>
      <td className={TD_SUBTOTAL}></td>{/* Demanda Adicional — no aplica en subtotal */}
      {/* Camas segun condicion */}
      <td className={TD_SUBTOTAL}>{sums.total}</td>
      <td className={TD_SUBTOTAL}>{sums.chabi}</td>
      <td className={TD_SUBTOTAL}>{sums.cocup}</td>
      <td className={TD_SUBTOTAL}>{sums.clibr}</td>
      <td className={TD_SUBTOTAL}>{sums.ctran}</td>
      <td className={TD_SUBTOTAL}>{sums.cinah}</td>
      <td className={TD_SUBTOTAL}>{sums.pcr}</td>
      {/* Resultado Espera */}
      <td className={TD_SUBTOTAL}>{sums.espera_ant}</td>
      <td className={TD_SUBTOTAL}>{sums.espera_mol}</td>
      {/* VM */}
      <td className={TD_SUBTOTAL}>{sums.c_vm}</td>
      <td className={TD_SUBTOTAL}>{sums.totalvm}</td>
      <td className={TD_SUBTOTAL}>{sums.vmopera}</td>
      <td className={TD_SUBTOTAL}>{sums.vminopera}</td>
      <td className={TD_SUBTOTAL}>{safePct(sums.c_vm, sums.vmopera)}</td>
      {/* AF */}
      <td className={TD_SUBTOTAL}>{sums.c_fl}</td>
      <td className={TD_SUBTOTAL}>{sums.totalaf}</td>
      <td className={TD_SUBTOTAL}>{sums.afopera}</td>
      <td className={TD_SUBTOTAL}>{sums.afinopera}</td>
      <td className={TD_SUBTOTAL}>{safePct(sums.c_fl, sums.afopera)}</td>
    </tr>
  )
}

function TotalGeneralRow({ sums }: { sums: Sums }) {
  return (
    <tr style={{ backgroundColor: '#D7D7D7' }}>
      <td colSpan={3} className={`${TD_SUBTOTAL} text-right`}>Total General</td>
      <td className={TD_SUBTOTAL}>{sums.camas}</td>
      <td className={TD_SUBTOTAL}>{sums.total - sums.camas}</td>
      <td className={TD_SUBTOTAL}>{safePct(sums.cocup, sums.camas)}</td>
      <td className={TD_SUBTOTAL}></td>{/* Demanda Adicional */}
      <td className={TD_SUBTOTAL}>{sums.total}</td>
      <td className={TD_SUBTOTAL}>{sums.chabi}</td>
      <td className={TD_SUBTOTAL}>{sums.cocup}</td>
      <td className={TD_SUBTOTAL}>{sums.clibr}</td>
      <td className={TD_SUBTOTAL}>{sums.ctran}</td>
      <td className={TD_SUBTOTAL}>{sums.cinah}</td>
      <td className={TD_SUBTOTAL}>{sums.pcr}</td>
      <td className={TD_SUBTOTAL}>{sums.espera_ant}</td>
      <td className={TD_SUBTOTAL}>{sums.espera_mol}</td>
      <td className={TD_SUBTOTAL}>{sums.c_vm}</td>
      <td className={TD_SUBTOTAL}>{sums.totalvm}</td>
      <td className={TD_SUBTOTAL}>{sums.vmopera}</td>
      <td className={TD_SUBTOTAL}>{sums.vminopera}</td>
      <td className={TD_SUBTOTAL}>{safePct(sums.c_vm, sums.vmopera)}</td>
      <td className={TD_SUBTOTAL}>{sums.c_fl}</td>
      <td className={TD_SUBTOTAL}>{sums.totalaf}</td>
      <td className={TD_SUBTOTAL}>{sums.afopera}</td>
      <td className={TD_SUBTOTAL}>{sums.afinopera}</td>
      <td className={TD_SUBTOTAL}>{safePct(sums.c_fl, sums.afopera)}</td>
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

  const modalSpec = MODAL_SPECS[detailType] ?? { title: 'Detalle', columns: [] }

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
                  <th className={TH} rowSpan={2}>Piso</th>
                  <th className={TH} rowSpan={2}>Servicio</th>
                  <th className={TH} rowSpan={2}>Tipo</th>
                  <th className={TH} colSpan={4}>Escenario (1)</th>
                  <th className={TH} colSpan={7}>Camas segun condicion</th>
                  <th className={TH} colSpan={2}>Resultado Espera</th>
                  <th className={TH} colSpan={5}>Ventilacion Mecanica</th>
                  <th className={TH} colSpan={5}>Oxigeno Alto Flujo</th>
                </tr>
                {/* Row 2 — subcolumns */}
                <tr>
                  <th className={TH}>Cama Aprobadas (A)</th>
                  <th className={TH}>Disfer.(B-A)</th>
                  <th className={TH}>% Ocupa (C/A)</th>
                  <th className={TH}>Demanda Adicional</th>

                  <th className={TH}>Totales (B)</th>
                  <th className={TH}>Operativas</th>
                  <th className={TH}>Ocupadas (C)</th>
                  <th className={TH}>Disponibles</th>
                  <th className={TH}>Transitorias</th>
                  <th className={TH}>Inhabilitadas</th>
                  <th className={TH}>Covid (+)</th>

                  <th className={TH}>Antigena</th>
                  <th className={TH}>Molecular</th>

                  <th className={TH}>En_Uso (D)</th>
                  <th className={TH}>Total</th>
                  <th className={TH}>Operat. (E)</th>
                  <th className={TH}>Inoperat.</th>
                  <th className={TH}>%_Uso (D/E)</th>

                  <th className={TH}>En_uso (F)</th>
                  <th className={TH}>Total</th>
                  <th className={TH}>Operat. (G)</th>
                  <th className={TH}>Inoperat.</th>
                  <th className={TH}>%_Uso (F/G)</th>
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

                    const { row, showPiso, showServicio,
                      showVecesGroup, vecesSpan,
                      showVeces1Group, veces1Span,
                      diferencia, porcentaje, demandaA } = item

                    const pctBgColor = pctBg(porcentaje)
                    const pctLabel   = pctText(porcentaje)
                    const pctHint    = pctTitle(porcentaje)

                    const difBgColor = difBg(diferencia)
                    const demBgColor = difBg(demandaA)

                    const vmPct = row.totalvm > 0 && row.vmopera > 0
                      ? (row.c_vm / row.vmopera) * 100 : 0
                    const afPct = row.totalaf > 0 && row.afopera > 0
                      ? (row.c_fl / row.afopera) * 100 : 0

                    return (
                      <tr key={`r-${idx}`} className="odd:bg-white even:bg-[#f8fbff]">

                        {/* Piso */}
                        <td className={TD}>{showPiso ? row.piso : ''}</td>
                        {/* Servicio */}
                        <td className={TD}>{showServicio ? row.servicio : ''}</td>
                        {/* Tipo */}
                        <td className={TD}>{row.tipo}</td>

                        {/* ── Escenario (1) ── */}
                        {showVecesGroup && (
                          <>
                            <td className={TD} rowSpan={vecesSpan}>{row.camas}</td>
                            <td className={TD} rowSpan={vecesSpan}
                              style={{ backgroundColor: difBgColor || undefined }}>
                              {diferencia}
                            </td>
                            <td className={TD} rowSpan={vecesSpan}
                              style={{ backgroundColor: pctBgColor }}
                              title={pctHint}>
                              {pctLabel}
                            </td>
                            <td className={TD} rowSpan={vecesSpan}
                              style={{ backgroundColor: demBgColor || undefined }}>
                              {demandaA}
                            </td>
                          </>
                        )}

                        {/* ── Camas segun condicion ── */}
                        <td className={TD}>{row.total}</td>

                        {/* Operativas — clickable */}
                        <td className={TD}>
                          {row.chabi > 0 ? (
                            <button type="button"
                              className="h-5 rounded px-1.5 text-[10px] hover:opacity-80"
                              onClick={() => void openDetail('1', row)}>
                              {row.chabi}
                            </button>
                          ) : ''}
                        </td>

                        {/* Ocupadas — amarillo */}
                        <td className={TD} style={{ backgroundColor: row.cocup > 0 ? '#F3D979' : undefined }}>
                          {row.cocup > 0 ? (
                            <button type="button"
                              className="h-5 rounded px-1.5 text-[10px] hover:opacity-80"
                              onClick={() => void openDetail('2', row)}>
                              {row.cocup}
                            </button>
                          ) : ''}
                        </td>

                        {/* Disponibles — verde */}
                        <td className={TD} style={{ backgroundColor: row.clibr > 0 ? '#BFFCB3' : undefined }}>
                          {row.clibr > 0 ? (
                            <button type="button"
                              className="h-5 rounded px-1.5 text-[10px] hover:opacity-80"
                              onClick={() => void openDetail('3', row)}>
                              {row.clibr}
                            </button>
                          ) : ''}
                        </td>

                        {/* Transitorias */}
                        <td className={TD}>
                          {row.ctran > 0 ? (
                            <button type="button"
                              className="h-5 rounded px-1.5 text-[10px] hover:opacity-80"
                              onClick={() => void openDetail('4', row)}>
                              {row.ctran}
                            </button>
                          ) : ''}
                        </td>

                        {/* Inhabilitadas */}
                        <td className={TD}>
                          {row.cinah > 0 ? (
                            <button type="button"
                              className="h-5 rounded px-1.5 text-[10px] hover:opacity-80"
                              onClick={() => void openDetail('5', row)}>
                              {row.cinah}
                            </button>
                          ) : ''}
                        </td>

                        {/* Covid (+) — badge verde */}
                        <td className={TD}>
                          {row.pcr > 0 ? (
                            <button type="button"
                              className="inline-block rounded bg-green-500 px-1.5 py-0.5 text-[10px] font-semibold text-white hover:bg-green-600"
                              onClick={() => void openDetail('8', row)}>
                              {row.pcr}
                            </button>
                          ) : ''}
                        </td>

                        {/* ── Resultado Espera ── */}
                        {/* Antigena — badge verde */}
                        <td className={TD}>
                          {row.espera_ant > 0 ? (
                            <button type="button"
                              className="inline-block rounded bg-green-500 px-1.5 py-0.5 text-[10px] font-semibold text-white hover:bg-green-600"
                              onClick={() => void openDetail('9', row)}>
                              {row.espera_ant}
                            </button>
                          ) : ''}
                        </td>

                        {/* Molecular — badge verde */}
                        <td className={TD}>
                          {row.espera_mol > 0 ? (
                            <button type="button"
                              className="inline-block rounded bg-green-500 px-1.5 py-0.5 text-[10px] font-semibold text-white hover:bg-green-600"
                              onClick={() => void openDetail('9a', row)}>
                              {row.espera_mol}
                            </button>
                          ) : ''}
                        </td>

                        {/* ── Ventilacion Mecanica ── */}
                        {/* En_Uso (D) — celeste */}
                        <td className={TD} style={{ backgroundColor: '#B8E6FC' }}>
                          {row.c_vm > 0 ? (
                            <button type="button"
                              className="h-5 rounded px-1.5 text-[10px] hover:opacity-80"
                              onClick={() => void openDetail('6', row)}>
                              {row.c_vm}
                            </button>
                          ) : ''}
                        </td>

                        {/* Total VM — rowspan */}
                        {showVeces1Group && (
                          <td className={TD} rowSpan={veces1Span}>{numCell(row.totalvm)}</td>
                        )}

                        <td className={TD}>{numCell(row.vmopera)}</td>
                        <td className={TD}>{numCell(row.vminopera)}</td>

                        {/* % Uso VM — coloreado */}
                        <td className={TD}
                          style={{ backgroundColor: row.totalvm > 0 && vmPct > 0 ? pctBg(vmPct) : undefined }}
                          title={vmPct > 100 ? `+${Math.round(vmPct - 100)}%` : undefined}>
                          {row.totalvm === 0 ? '0' : pctText(vmPct)}
                        </td>

                        {/* ── Oxigeno Alto Flujo ── */}
                        {/* En_uso (F) — celeste */}
                        <td className={TD} style={{ backgroundColor: '#B8E6FC' }}>
                          {row.c_fl > 0 ? (
                            <button type="button"
                              className="h-5 rounded px-1.5 text-[10px] hover:opacity-80"
                              onClick={() => void openDetail('7', row)}>
                              {row.c_fl}
                            </button>
                          ) : ''}
                        </td>

                        {/* Total AF — rowspan */}
                        {showVeces1Group && (
                          <td className={TD} rowSpan={veces1Span}>{numCell(row.totalaf)}</td>
                        )}

                        <td className={TD}>{numCell(row.afopera)}</td>
                        <td className={TD}>{numCell(row.afinopera)}</td>

                        {/* % Uso AF — coloreado */}
                        <td className={TD}
                          style={{ backgroundColor: row.totalaf > 0 && afPct > 0 ? pctBg(afPct) : undefined }}
                          title={afPct > 100 ? `+${Math.round(afPct - 100)}%` : undefined}>
                          {row.totalaf === 0 ? '0' : pctText(afPct)}
                        </td>
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
