import { useCallback, useEffect, useMemo, useState } from 'react'
import { RefreshCcw } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Select } from '@/components/ui/select'
import { SighFilterPanel } from '@/modules/sigh/components/sigh-filter-panel'
import { SighPageShell } from '@/modules/sigh/components/sigh-page-shell'
import { SighTable, type SighTableColumn } from '@/modules/sigh/components/sigh-table'
import { CAMAS_DETAIL_MODAL_SPECS } from '@/modules/sigh/camas-detail-modal-specs'
import { compareNullableTextLast, resolveRowNumber, resolveRowText } from '@/modules/sigh/sigh-utils'
import {
  getCamasDetalle,
  getMonitoreoCamasReport,
  getResumenCamasReport,
  listTiposCama,
} from '@/modules/sigh/services/sigh-reports.service'
import type { SighTableRow } from '@/modules/sigh/types'

interface ResumenCamasRow {
  idservicio: number
  piso: string
  servicio: string
  tipo: string
  operativas: number
  ocupadas: number
  disponibles: number
  transitorias: number
  inhabilitadas: number
}

interface ResumenSums {
  operativas: number
  ocupadas: number
  disponibles: number
  transitorias: number
  inhabilitadas: number
}

interface DataItem {
  type: 'data'
  row: ResumenCamasRow
  showPiso: boolean
  pisoSpan: number
  showServicio: boolean
  servicioSpan: number
}

interface SubtotalItem {
  type: 'subtotal'
  piso: string
  sums: ResumenSums
}

interface TotalItem {
  type: 'total'
  sums: ResumenSums
}

type ResumenTableItem = DataItem | SubtotalItem | TotalItem

interface DetalleIdLookup {
  byServiceKey: Map<string, number>
  bySignatureKey: Map<string, number>
}

const TH = 'border-b border-white/20 px-2 py-2 text-[11px] font-bold uppercase tracking-[0.04em]'
const TD = 'border-b border-border/65 px-2 py-1.5 text-[12px] leading-[1.2]'
const TD_TEXT = `${TD} text-left`
const TD_NUM = `${TD} text-right tabular-nums`
const TD_PISO = `${TD} w-[148px] min-w-[148px] max-w-[168px] border-r border-r-[#c8d7e6] bg-[#eef4fa] text-center align-middle font-semibold leading-snug text-[#1f3650] whitespace-normal break-words`
const TD_SERVICIO = `${TD_TEXT} align-middle font-medium text-[#123B63]`

function safePercentValue(numerator: number, denominator: number): number {
  const num = Number.isFinite(numerator) ? numerator : 0
  const den = Number.isFinite(denominator) ? denominator : 0
  if (den <= 0) {
    return 0
  }

  return (num / den) * 100
}

function normalizePercentScale(value: number): number {
  const safe = Number.isFinite(value) ? value : 0
  if (safe > 0 && safe <= 1) {
    return safe * 100
  }

  return safe
}

function formatPercent(value: number): string {
  const normalized = normalizePercentScale(value)
  const oneDecimal = Math.round(normalized * 10) / 10
  const text = Number.isInteger(oneDecimal) ? String(Math.round(oneDecimal)) : oneDecimal.toFixed(1)
  return `${text}%`
}

function normalizePiso(piso: string): string {
  const clean = piso.trim()
  return clean || 'Sin piso'
}

function parseResumenRow(raw: SighTableRow): ResumenCamasRow {
  return {
    idservicio: resolveRowNumber(raw, 'IDSERVICIO', ['idservicio', 'id_servicio', 'ID_SERVICIO']),
    piso: normalizePiso(resolveRowText(raw, 'PISO', ['piso'])),
    servicio: resolveRowText(raw, 'NOMBRESERVICIO', ['SERVICIO', 'CONSULTORIO', 'servicio']).trim() || 'Sin servicio',
    tipo: resolveRowText(raw, 'TIPO', ['tipo']).trim() || '-',
    operativas: resolveRowNumber(raw, 'HABILITADAS', ['CHABI', 'chabi']),
    ocupadas: resolveRowNumber(raw, 'OCUPADAS', ['COCUP', 'cocup']),
    disponibles: resolveRowNumber(raw, 'LIBRES', ['CLIBR', 'clibr']),
    transitorias: resolveRowNumber(raw, 'TRASFERIDOS', ['CTRAN', 'ctran']),
    inhabilitadas: resolveRowNumber(raw, 'INABILITADOS', ['CINAH', 'cinah']),
  }
}

function sortResumenRowsNullsLast(rows: SighTableRow[]): SighTableRow[] {
  return rows
    .map((row, index) => ({
      row,
      index,
      pisoRaw: resolveRowText(row, 'PISO', ['piso']).trim(),
      servicioRaw: resolveRowText(row, 'NOMBRESERVICIO', ['SERVICIO', 'CONSULTORIO', 'servicio']).trim(),
      tipoRaw: resolveRowText(row, 'TIPO', ['tipo']).trim(),
    }))
    .sort((left, right) => (
      compareNullableTextLast(left.pisoRaw, right.pisoRaw) ||
      compareNullableTextLast(left.servicioRaw, right.servicioRaw) ||
      compareNullableTextLast(left.tipoRaw, right.tipoRaw) ||
      left.index - right.index
    ))
    .map((item) => item.row)
}

function normalizeToken(value: string): string {
  return String(value ?? '')
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]/g, '')
}

function buildServiceKey(row: Pick<ResumenCamasRow, 'piso' | 'servicio' | 'tipo'>): string {
  return `${normalizeToken(row.piso)}|${normalizeToken(row.servicio)}|${normalizeToken(row.tipo)}`
}

function buildSignatureKey(row: Pick<ResumenCamasRow, 'piso' | 'tipo' | 'operativas' | 'ocupadas' | 'disponibles' | 'transitorias' | 'inhabilitadas'>): string {
  return [
    normalizeToken(row.piso),
    normalizeToken(row.tipo),
    row.operativas,
    row.ocupadas,
    row.disponibles,
    row.transitorias,
    row.inhabilitadas,
  ].join('|')
}

function registerUniqueId(map: Map<string, number>, key: string, idServicio: number) {
  if (!key || idServicio <= 0) {
    return
  }

  const current = map.get(key)
  if (current === undefined) {
    map.set(key, idServicio)
    return
  }

  if (current !== idServicio) {
    map.set(key, 0)
  }
}

function buildDetalleIdLookup(rows: SighTableRow[]): DetalleIdLookup {
  const byServiceKey = new Map<string, number>()
  const bySignatureKey = new Map<string, number>()

  rows.forEach((raw) => {
    const parsed: ResumenCamasRow = {
      idservicio: resolveRowNumber(raw, 'IDSERVICIO', ['idservicio', 'id_servicio']),
      piso: normalizePiso(resolveRowText(raw, 'PISO', ['piso'])),
      servicio: resolveRowText(raw, 'SERVICIO', ['NOMBRESERVICIO', 'CONSULTORIO', 'servicio']).trim(),
      tipo: resolveRowText(raw, 'TIPO', ['tipo']).trim(),
      operativas: resolveRowNumber(raw, 'CHABI', ['HABILITADAS', 'chabi']),
      ocupadas: resolveRowNumber(raw, 'COCUP', ['OCUPADAS', 'cocup']),
      disponibles: resolveRowNumber(raw, 'CLIBR', ['LIBRES', 'clibr']),
      transitorias: resolveRowNumber(raw, 'CTRAN', ['TRASFERIDOS', 'ctran']),
      inhabilitadas: resolveRowNumber(raw, 'CINAH', ['INABILITADOS', 'cinah']),
    }

    registerUniqueId(byServiceKey, buildServiceKey(parsed), parsed.idservicio)
    registerUniqueId(bySignatureKey, buildSignatureKey(parsed), parsed.idservicio)
  })

  return { byServiceKey, bySignatureKey }
}

function resolveDetalleId(row: ResumenCamasRow, lookup: DetalleIdLookup): number {
  if (row.idservicio > 0) {
    return row.idservicio
  }

  const byService = lookup.byServiceKey.get(buildServiceKey(row)) ?? 0
  if (byService > 0) {
    return byService
  }

  const bySignature = lookup.bySignatureKey.get(buildSignatureKey(row)) ?? 0
  if (bySignature > 0) {
    return bySignature
  }

  return 0
}

function emptySums(): ResumenSums {
  return {
    operativas: 0,
    ocupadas: 0,
    disponibles: 0,
    transitorias: 0,
    inhabilitadas: 0,
  }
}

function addToSums(sums: ResumenSums, row: ResumenCamasRow) {
  sums.operativas += row.operativas
  sums.ocupadas += row.ocupadas
  sums.disponibles += row.disponibles
  sums.transitorias += row.transitorias
  sums.inhabilitadas += row.inhabilitadas
}

function groupByConsecutivePiso(rows: ResumenCamasRow[]): Array<{ piso: string; rows: ResumenCamasRow[] }> {
  const groups: Array<{ piso: string; rows: ResumenCamasRow[] }> = []

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

function groupByConsecutiveServicio(rows: ResumenCamasRow[]): Array<{ servicio: string; rows: ResumenCamasRow[] }> {
  const groups: Array<{ servicio: string; rows: ResumenCamasRow[] }> = []

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

function buildResumenTableItems(rows: ResumenCamasRow[]): ResumenTableItem[] {
  if (rows.length === 0) {
    return []
  }

  const items: ResumenTableItem[] = []
  const globalSums = emptySums()
  const pisoGroups = groupByConsecutivePiso(rows)

  for (const pisoGroup of pisoGroups) {
    const pisoSpan = pisoGroup.rows.length
    const pisoSums = emptySums()
    const serviceGroups = groupByConsecutiveServicio(pisoGroup.rows)
    let isFirstRowInPiso = true

    for (const serviceGroup of serviceGroups) {
      const servicioSpan = serviceGroup.rows.length

      serviceGroup.rows.forEach((row, rowIndex) => {
        items.push({
          type: 'data',
          row,
          showPiso: isFirstRowInPiso,
          pisoSpan,
          showServicio: rowIndex === 0,
          servicioSpan,
        })

        isFirstRowInPiso = false
        addToSums(pisoSums, row)
        addToSums(globalSums, row)
      })
    }

    items.push({ type: 'subtotal', piso: pisoGroup.piso, sums: { ...pisoSums } })
  }

  items.push({ type: 'total', sums: globalSums })

  return items
}

function occupancyPercent(row: ResumenCamasRow): number {
  return safePercentValue(row.ocupadas, row.operativas)
}

function occupancyTone(percent: number) {
  const normalized = normalizePercentScale(percent)

  if (normalized >= 95) {
    return { backgroundColor: '#fbe4e6', color: '#8a1f2e' }
  }

  if (normalized >= 80) {
    return { backgroundColor: '#f9ead7', color: '#8a4d1d' }
  }

  if (normalized >= 60) {
    return { backgroundColor: '#f8f2d8', color: '#7a5a11' }
  }

  return { backgroundColor: '#e8f4e9', color: '#1f5f35' }
}

function ocupadasTone(value: number, operativas: number) {
  if (value <= 0) {
    return { backgroundColor: '#f8f3ef', color: '#7a4a33' }
  }

  const ratio = operativas > 0 ? value / operativas : 1
  if (ratio >= 0.85) {
    return { backgroundColor: '#f5dfcf', color: '#7a3e1f' }
  }

  return { backgroundColor: '#faeadf', color: '#7a3e1f' }
}

function disponiblesTone(value: number, operativas: number) {
  if (value <= 0) {
    return { backgroundColor: '#edf2f7', color: '#475569' }
  }

  const ratio = operativas > 0 ? value / operativas : 0
  if (ratio <= 0.15) {
    return { backgroundColor: '#f8eed1', color: '#8a5a15' }
  }

  return { backgroundColor: '#e7f5ea', color: '#1f5f35' }
}

function DetailMetricButton({
  value,
  onClick,
}: {
  value: number
  onClick: () => void
}) {
  if (value <= 0) {
    return <span className="text-slate-500">{value}</span>
  }

  return (
    <button type="button" className="font-semibold text-[#0f4f7e] hover:underline" onClick={onClick}>
      {value}
    </button>
  )
}

function SubtotalRow({ sums }: { sums: ResumenSums }) {
  const pct = safePercentValue(sums.ocupadas, sums.operativas)
  const pctTone = occupancyTone(pct)
  const subtotalCell = 'border-t-2 border-b-2 border-[#ccd5df] px-2 py-1.5 text-right tabular-nums font-semibold'

  return (
    <tr className="bg-[#edf1f5] text-[#1f3650]">
      <td colSpan={3} className={`${subtotalCell} text-[11px] uppercase tracking-wide`}>
        Sub Total
      </td>
      <td className={subtotalCell}>{sums.operativas}</td>
      <td className={subtotalCell}>{sums.ocupadas}</td>
      <td className={subtotalCell} style={pctTone}>
        {formatPercent(pct)}
      </td>
      <td className={subtotalCell}>{sums.disponibles}</td>
      <td className={subtotalCell}>{sums.transitorias}</td>
      <td className={subtotalCell}>{sums.inhabilitadas}</td>
    </tr>
  )
}

function TotalGeneralRow({ sums }: { sums: ResumenSums }) {
  const pct = safePercentValue(sums.ocupadas, sums.operativas)
  const pctTone = occupancyTone(pct)
  const totalCell = 'border-y-2 border-[#7f97b0] px-2 py-2 text-right tabular-nums font-bold'

  return (
    <tr className="bg-[#d2deea] text-[#0f2942]">
      <td colSpan={3} className={`${totalCell} text-[11px] uppercase tracking-wide`}>
        Total General
      </td>
      <td className={totalCell}>{sums.operativas}</td>
      <td className={totalCell}>{sums.ocupadas}</td>
      <td className={totalCell} style={pctTone}>
        {formatPercent(pct)}
      </td>
      <td className={totalCell}>{sums.disponibles}</td>
      <td className={totalCell}>{sums.transitorias}</td>
      <td className={totalCell}>{sums.inhabilitadas}</td>
    </tr>
  )
}

export function ResumenCamasPage() {
  const [tipos, setTipos] = useState<Array<{ idTipo: string; tipo: string }>>([])
  const [selectedTipo, setSelectedTipo] = useState('0')
  const [rows, setRows] = useState<ResumenCamasRow[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const [detailRows, setDetailRows] = useState<SighTableRow[]>([])
  const [detailType, setDetailType] = useState('')
  const [detailLoading, setDetailLoading] = useState(false)
  const [isDetailOpen, setIsDetailOpen] = useState(false)

  useEffect(() => {
    void (async () => {
      try {
        const options = await listTiposCama()
        setTipos(options)
      } catch (typesError) {
        console.warn('No se pudo cargar el catalogo de tipos de cama.', typesError)
      }
    })()
  }, [])

  const handleFetch = useCallback(async () => {
    setLoading(true)
    setError(null)
    setRows([])

    try {
      const payload = await getResumenCamasReport(selectedTipo)
      const sortedPayload = sortResumenRowsNullsLast(payload)
      const normalizedRows = sortedPayload.map(parseResumenRow)

      if (normalizedRows.some((row) => row.idservicio <= 0)) {
        try {
          const monitoreoRows = await getMonitoreoCamasReport()
          const detailLookup = buildDetalleIdLookup(monitoreoRows)
          setRows(normalizedRows.map((row) => ({ ...row, idservicio: resolveDetalleId(row, detailLookup) })))
        } catch {
          setRows(normalizedRows)
        }
      } else {
        setRows(normalizedRows)
      }
    } catch (fetchError) {
      const message = fetchError instanceof Error ? fetchError.message : 'No se pudo consultar Resumen de Camas.'
      setError(message)
    } finally {
      setLoading(false)
    }
  }, [selectedTipo])

  useEffect(() => {
    void handleFetch()
  }, [handleFetch])

  const openDetail = async (type: string, row: ResumenCamasRow) => {
    if (!row.idservicio) {
      setError('No se pudo identificar el servicio para consultar el detalle de camas.')
      return
    }

    setDetailType(type)
    setDetailRows([])
    setIsDetailOpen(true)
    setDetailLoading(true)

    try {
      const payload = await getCamasDetalle(type, row.idservicio, row.tipo)
      setDetailRows(payload)
    } catch (detailError) {
      const message = detailError instanceof Error ? detailError.message : 'No se pudo obtener el detalle.'
      setError(message)
    } finally {
      setDetailLoading(false)
    }
  }

  const tableItems = useMemo(() => buildResumenTableItems(rows), [rows])

  const detailSpec = CAMAS_DETAIL_MODAL_SPECS[detailType] ?? { title: 'Detalle', columns: [] }

  const detailColumns = useMemo<SighTableColumn[]>(() => {
    if (detailSpec.columns.length > 0) {
      return detailSpec.columns.map((column) => ({
        ...column,
        align: 'center',
      }))
    }

    return Object.keys(detailRows[0] ?? {}).map((key) => ({
      key,
      label: key,
      align: 'center',
    }))
  }, [detailRows, detailSpec.columns])

  return (
    <SighPageShell
      error={error}
      description="Resumen de camas por piso/servicio/tipo con subtotales y total general por filtro de tipo de cama."
      actions={
        <Button size="sm" variant="outline" onClick={() => void handleFetch()}>
          <RefreshCcw className="h-4 w-4" />
          Actualizar
        </Button>
      }
    >
      <SighFilterPanel processLabel="Consultar" onProcess={() => void handleFetch()}>
        <div className="w-[260px] space-y-1">
          <label className="text-xs font-semibold text-brand-strong" htmlFor="resumen-cama-select">
            Tipo de cama
          </label>
          <Select id="resumen-cama-select" value={selectedTipo} onChange={(event) => setSelectedTipo(event.target.value)}>
            <option value="0">Seleccione todos</option>
            {tipos.map((tipo) => (
              <option key={tipo.idTipo} value={tipo.idTipo}>
                {tipo.tipo}
              </option>
            ))}
          </Select>
        </div>
      </SighFilterPanel>

      <Card className="border-border/70">
        <CardHeader className="border-b border-border/60 pb-3">
          <CardTitle className="text-sm">Resumen de camas</CardTitle>
        </CardHeader>
        <CardContent className="pt-4">
          <div className="overflow-x-auto rounded-md border border-border/70 bg-white">
            <table className="min-w-[1040px] border-collapse">
              <thead>
                <tr className="bg-[#0f3e66] text-white shadow-[inset_0_-1px_0_rgba(255,255,255,0.2)]">
                  <th className={`${TH} text-center`}>Piso</th>
                  <th className={`${TH} text-left`}>Servicio</th>
                  <th className={`${TH} text-left`}>Tipo</th>
                  <th className={`${TH} text-right`}>Operativas</th>
                  <th className={`${TH} bg-[#134b78] text-right`}>Ocupadas</th>
                  <th className={`${TH} bg-[#184f7a] text-right`}>% Ocupacion</th>
                  <th className={`${TH} bg-[#1a537f] text-right`}>Disponibles</th>
                  <th className={`${TH} text-right`}>Transitorias</th>
                  <th className={`${TH} text-right`}>Inhabilitadas</th>
                </tr>
              </thead>
              <tbody>
                {tableItems.length === 0 ? (
                  <tr>
                    <td colSpan={9} className="px-3 py-5 text-center text-xs text-muted">
                      {loading ? 'Consultando resumen de camas...' : 'No se encuentran registros.'}
                    </td>
                  </tr>
                ) : (
                  tableItems.map((item, index) => {
                    if (item.type === 'subtotal') {
                      return <SubtotalRow key={`subtotal-${item.piso}-${index}`} sums={item.sums} />
                    }

                    if (item.type === 'total') {
                      return <TotalGeneralRow key="total-general" sums={item.sums} />
                    }

                    const percent = occupancyPercent(item.row)
                    const percentTone = occupancyTone(percent)
                    const ocupadasCellTone = ocupadasTone(item.row.ocupadas, item.row.operativas)
                    const disponiblesCellTone = disponiblesTone(item.row.disponibles, item.row.operativas)

                    return (
                      <tr
                        key={`resumen-cama-${index}`}
                        className={`bg-white ${
                          item.showPiso ? 'border-t-2 border-t-[#a6bbcf]' : item.showServicio ? 'border-t border-t-[#d1ddea]' : ''
                        }`}
                      >
                        {item.showPiso && (
                          <td className={TD_PISO} rowSpan={item.pisoSpan}>
                            {item.row.piso}
                          </td>
                        )}
                        {item.showServicio && (
                          <td className={TD_SERVICIO} rowSpan={item.servicioSpan}>
                            {item.row.servicio}
                          </td>
                        )}
                        <td className={`${TD_TEXT} ${item.showServicio ? 'pl-2' : 'border-l-[3px] border-l-[#e0e9f3] pl-4 text-[#475569]'}`}>
                          {item.row.tipo}
                        </td>
                        <td className={TD_NUM}>
                          <DetailMetricButton value={item.row.operativas} onClick={() => void openDetail('1', item.row)} />
                        </td>
                        <td className={TD_NUM} style={ocupadasCellTone}>
                          <DetailMetricButton value={item.row.ocupadas} onClick={() => void openDetail('2', item.row)} />
                        </td>
                        <td className={`${TD_NUM} font-semibold`} style={percentTone}>
                          {formatPercent(percent)}
                        </td>
                        <td className={TD_NUM} style={disponiblesCellTone}>
                          <DetailMetricButton value={item.row.disponibles} onClick={() => void openDetail('3', item.row)} />
                        </td>
                        <td className={TD_NUM}>
                          <DetailMetricButton value={item.row.transitorias} onClick={() => void openDetail('4', item.row)} />
                        </td>
                        <td className={TD_NUM}>
                          <DetailMetricButton value={item.row.inhabilitadas} onClick={() => void openDetail('5', item.row)} />
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

      <Dialog open={isDetailOpen} onOpenChange={setIsDetailOpen}>
        <DialogContent className="w-[min(95vw,1200px)] max-w-none">
          <DialogHeader>
            <DialogTitle>{detailSpec.title}</DialogTitle>
          </DialogHeader>
          {detailLoading ? (
            <p className="py-6 text-center text-sm text-muted">Cargando detalle...</p>
          ) : (
            <SighTable rows={detailRows} columns={detailColumns} />
          )}
        </DialogContent>
      </Dialog>
    </SighPageShell>
  )
}
