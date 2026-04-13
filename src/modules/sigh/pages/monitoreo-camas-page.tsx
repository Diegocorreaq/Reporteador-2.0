import { useEffect, useMemo, useState } from 'react'
import { Download, RefreshCcw } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { SighPageShell } from '@/modules/sigh/components/sigh-page-shell'
import { SighTable } from '@/modules/sigh/components/sigh-table'
import { resolveRowNumber, resolveRowText } from '@/modules/sigh/sigh-utils'
import {
  downloadMonitoreoCamasResumen,
  downloadMonitoreoCamasSusalud,
  getCamasDetalle,
  getMonitoreoCamasReport,
} from '@/modules/sigh/services/sigh-reports.service'
import type { SighTableRow } from '@/modules/sigh/types'

function safePercent(numerator: number, denominator: number) {
  if (!denominator) return '0'
  return ((numerator / denominator) * 100).toFixed(0)
}

function clickableMetric(
  value: number,
  onClick: () => void,
  tone?: 'warning' | 'success',
) {
  if (value <= 0) {
    return '-'
  }

  const className =
    tone === 'warning'
      ? 'h-6 rounded bg-[#fff2cc] px-2 text-[11px] text-warning'
      : tone === 'success'
        ? 'h-6 rounded bg-[#dcfce7] px-2 text-[11px] text-success'
        : 'h-6 rounded px-2 text-[11px]'

  return (
    <button type="button" className={className} onClick={onClick}>
      {value}
    </button>
  )
}

export function MonitoreoCamasPage() {
  const [rows, setRows] = useState<SighTableRow[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [detailRows, setDetailRows] = useState<SighTableRow[]>([])
  const [detailTitle, setDetailTitle] = useState('')
  const [isDetailOpen, setIsDetailOpen] = useState(false)

  const handleFetch = async () => {
    setLoading(true)
    setError(null)
    try {
      const payload = await getMonitoreoCamasReport()
      setRows(payload)
    } catch (fetchError) {
      const message = fetchError instanceof Error ? fetchError.message : 'No se pudo consultar Monitoreo de Camas.'
      setError(message)
    } finally {
      setLoading(false)
    }
  }

  const openDetail = async (detailType: string, row: SighTableRow, title: string) => {
    const idServicio = resolveRowNumber(row, 'IDSERVICIO', ['idservicio', 'id_servicio'])
    const tipo = resolveRowText(row, 'TIPO', ['tipo'])
    if (!idServicio) {
      return
    }

    setIsDetailOpen(true)
    setDetailRows([])
    setDetailTitle(title)

    try {
      const payload = await getCamasDetalle(detailType, idServicio, tipo)
      setDetailRows(payload)
    } catch (detailError) {
      const message = detailError instanceof Error ? detailError.message : 'No se pudo obtener el detalle de camas.'
      setError(message)
    }
  }

  const detailColumns = useMemo(
    () =>
      Object.keys(detailRows[0] ?? {}).map((key) => ({
        key,
        label: key,
      })),
    [detailRows],
  )

  useEffect(() => {
    void handleFetch()
  }, [])

  return (
    <SighPageShell
      error={error}
      description="Resumen operativo de camas por piso/servicio/tipo con accesos de detalle y exportacion."
      actions={
        <>
          <Button size="sm" variant="outline" onClick={() => void handleFetch()}>
            <RefreshCcw className="h-4 w-4" />
            Actualizar
          </Button>
          <Button
            size="sm"
            className="gap-1.5 font-semibold"
            style={{ backgroundColor: '#005F8F', color: '#fff' }}
            onClick={() => void downloadMonitoreoCamasResumen()}
          >
            <Download className="h-4 w-4" />
            Resumen por Piso
          </Button>
          <Button
            size="sm"
            className="gap-1.5 font-semibold"
            style={{ backgroundColor: '#2C6E99', color: '#fff' }}
            onClick={() => void downloadMonitoreoCamasSusalud()}
          >
            <Download className="h-4 w-4" />
            Resumen Susalud
          </Button>
        </>
      }
    >
      <Card className="border-border/70">
        <CardHeader className="border-b border-border/60 pb-3">
          <CardTitle className="text-sm">Monitoreo de camas</CardTitle>
        </CardHeader>
        <CardContent className="pt-4">
          <div className="overflow-x-auto rounded-md border border-border/70 bg-white">
            <table className="min-w-[1600px] border-collapse text-[11px]">
              <thead>
                <tr className="bg-[#eef5fb] text-[#123B63]">
                  <th className="border-b border-border px-2 py-1 font-semibold uppercase">Piso</th>
                  <th className="border-b border-border px-2 py-1 font-semibold uppercase">Servicio</th>
                  <th className="border-b border-border px-2 py-1 font-semibold uppercase">Tipo</th>
                  <th className="border-b border-border px-2 py-1 font-semibold uppercase">Camas Aprobadas (A)</th>
                  <th className="border-b border-border px-2 py-1 font-semibold uppercase">Difer. (B-A)</th>
                  <th className="border-b border-border px-2 py-1 font-semibold uppercase">% Ocupa (C/A)</th>
                  <th className="border-b border-border px-2 py-1 font-semibold uppercase">Demanda Adic.</th>
                  <th className="border-b border-border px-2 py-1 font-semibold uppercase">Totales (B)</th>
                  <th className="border-b border-border px-2 py-1 font-semibold uppercase">Operativas</th>
                  <th className="border-b border-border px-2 py-1 font-semibold uppercase">Ocupadas (C)</th>
                  <th className="border-b border-border px-2 py-1 font-semibold uppercase">Disponibles</th>
                  <th className="border-b border-border px-2 py-1 font-semibold uppercase">Transitorias</th>
                  <th className="border-b border-border px-2 py-1 font-semibold uppercase">Inhabilitadas</th>
                  <th className="border-b border-border px-2 py-1 font-semibold uppercase">Covid (+)</th>
                  <th className="border-b border-border px-2 py-1 font-semibold uppercase">Antigena</th>
                  <th className="border-b border-border px-2 py-1 font-semibold uppercase">Molecular</th>
                  <th className="border-b border-border px-2 py-1 font-semibold uppercase">En uso VM (D)</th>
                  <th className="border-b border-border px-2 py-1 font-semibold uppercase">Total VM</th>
                  <th className="border-b border-border px-2 py-1 font-semibold uppercase">Operat VM (E)</th>
                  <th className="border-b border-border px-2 py-1 font-semibold uppercase">Inoperat VM</th>
                  <th className="border-b border-border px-2 py-1 font-semibold uppercase">% Uso VM (D/E)</th>
                  <th className="border-b border-border px-2 py-1 font-semibold uppercase">En uso AF (F)</th>
                  <th className="border-b border-border px-2 py-1 font-semibold uppercase">Total AF</th>
                  <th className="border-b border-border px-2 py-1 font-semibold uppercase">Operat AF (G)</th>
                  <th className="border-b border-border px-2 py-1 font-semibold uppercase">Inoperat AF</th>
                  <th className="border-b border-border px-2 py-1 font-semibold uppercase">% Uso AF (F/G)</th>
                </tr>
              </thead>
              <tbody>
                {rows.length ? (
                  rows.map((row, index) => {
                    const camas = resolveRowNumber(row, 'CAMAS', ['camas'])
                    const total = resolveRowNumber(row, 'TOTAL', ['total'])
                    const tocupa = resolveRowNumber(row, 'TOCUPA', ['tocupa'])
                    const chabi = resolveRowNumber(row, 'CHABI', ['chabi'])
                    const cocup = resolveRowNumber(row, 'COCUP', ['cocup'])
                    const clibr = resolveRowNumber(row, 'CLIBR', ['clibr'])
                    const ctran = resolveRowNumber(row, 'CTRAN', ['ctran'])
                    const cinah = resolveRowNumber(row, 'CINAH', ['cinah'])
                    const pcr = resolveRowNumber(row, 'PCR', ['pcr'])
                    const esperaAnt = resolveRowNumber(row, 'ESPERA_ANT', ['espera_ant'])
                    const esperaMol = resolveRowNumber(row, 'ESPERA_MOL', ['espera_mol'])
                    const cVm = resolveRowNumber(row, 'C_VM', ['c_vm'])
                    const totalVm = resolveRowNumber(row, 'TOTALVM', ['totalvm'])
                    const vmOpera = resolveRowNumber(row, 'VMOPERA', ['vmopera'])
                    const vmInopera = resolveRowNumber(row, 'VMINOPERA', ['vminopera'])
                    const cFl = resolveRowNumber(row, 'C_FL', ['c_fl'])
                    const totalAf = resolveRowNumber(row, 'TOTALAF', ['totalaf'])
                    const afOpera = resolveRowNumber(row, 'AFOPERA', ['afopera'])
                    const afInopera = resolveRowNumber(row, 'AFINOPERA', ['afinopera'])

                    return (
                      <tr key={`camas-${index}`} className="odd:bg-white even:bg-[#f8fbff]">
                        <td className="border-b border-border/70 px-2 py-1">{resolveRowText(row, 'PISO', ['piso']) || '-'}</td>
                        <td className="border-b border-border/70 px-2 py-1">{resolveRowText(row, 'SERVICIO', ['servicio']) || '-'}</td>
                        <td className="border-b border-border/70 px-2 py-1">{resolveRowText(row, 'TIPO', ['tipo']) || '-'}</td>
                        <td className="border-b border-border/70 px-2 py-1 text-center">{camas}</td>
                        <td className="border-b border-border/70 px-2 py-1 text-center">{total - camas}</td>
                        <td className="border-b border-border/70 px-2 py-1 text-center">{safePercent(cocup, camas)}%</td>
                        <td className="border-b border-border/70 px-2 py-1 text-center">{tocupa - camas}</td>
                        <td className="border-b border-border/70 px-2 py-1 text-center">{total}</td>
                        <td className="border-b border-border/70 px-2 py-1 text-center">
                          {clickableMetric(chabi, () => void openDetail('1', row, 'Detalle de camas operativas'))}
                        </td>
                        <td className="border-b border-border/70 px-2 py-1 text-center">
                          {clickableMetric(cocup, () => void openDetail('2', row, 'Detalle de camas ocupadas'), 'warning')}
                        </td>
                        <td className="border-b border-border/70 px-2 py-1 text-center">
                          {clickableMetric(clibr, () => void openDetail('3', row, 'Detalle de camas disponibles'), 'success')}
                        </td>
                        <td className="border-b border-border/70 px-2 py-1 text-center">
                          {clickableMetric(ctran, () => void openDetail('4', row, 'Detalle de camas transitorias'))}
                        </td>
                        <td className="border-b border-border/70 px-2 py-1 text-center">
                          {clickableMetric(cinah, () => void openDetail('5', row, 'Detalle de camas inhabilitadas'))}
                        </td>
                        <td className="border-b border-border/70 px-2 py-1 text-center">
                          {clickableMetric(pcr, () => void openDetail('8', row, 'Detalle de pruebas positivas'))}
                        </td>
                        <td className="border-b border-border/70 px-2 py-1 text-center">
                          {clickableMetric(esperaAnt, () => void openDetail('9', row, 'Detalle de pruebas antigenas pendientes'))}
                        </td>
                        <td className="border-b border-border/70 px-2 py-1 text-center">
                          {clickableMetric(esperaMol, () => void openDetail('9a', row, 'Detalle de pruebas moleculares pendientes'))}
                        </td>
                        <td className="border-b border-border/70 px-2 py-1 text-center">
                          {clickableMetric(cVm, () => void openDetail('6', row, 'Detalle de ventilacion mecanica en uso'))}
                        </td>
                        <td className="border-b border-border/70 px-2 py-1 text-center">{totalVm}</td>
                        <td className="border-b border-border/70 px-2 py-1 text-center">{vmOpera}</td>
                        <td className="border-b border-border/70 px-2 py-1 text-center">{vmInopera}</td>
                        <td className="border-b border-border/70 px-2 py-1 text-center">{safePercent(cVm, vmOpera)}%</td>
                        <td className="border-b border-border/70 px-2 py-1 text-center">
                          {clickableMetric(cFl, () => void openDetail('7', row, 'Detalle de oxigeno alto flujo en uso'))}
                        </td>
                        <td className="border-b border-border/70 px-2 py-1 text-center">{totalAf}</td>
                        <td className="border-b border-border/70 px-2 py-1 text-center">{afOpera}</td>
                        <td className="border-b border-border/70 px-2 py-1 text-center">{afInopera}</td>
                        <td className="border-b border-border/70 px-2 py-1 text-center">{safePercent(cFl, afOpera)}%</td>
                      </tr>
                    )
                  })
                ) : (
                  <tr>
                    <td colSpan={26} className="px-3 py-5 text-center text-xs text-muted">
                      {loading ? 'Consultando monitoreo de camas...' : 'No se encuentran registros.'}
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>

      <Dialog open={isDetailOpen} onOpenChange={setIsDetailOpen}>
        <DialogContent className="w-[min(95vw,1200px)] max-w-none">
          <DialogHeader>
            <DialogTitle>{detailTitle}</DialogTitle>
          </DialogHeader>
          <SighTable rows={detailRows} columns={detailColumns} />
        </DialogContent>
      </Dialog>
    </SighPageShell>
  )
}
