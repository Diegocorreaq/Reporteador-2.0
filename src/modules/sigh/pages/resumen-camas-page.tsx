import { useEffect, useMemo, useState } from 'react'
import { RefreshCcw } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Select } from '@/components/ui/select'
import { SighFilterPanel } from '@/modules/sigh/components/sigh-filter-panel'
import { SighPageShell } from '@/modules/sigh/components/sigh-page-shell'
import { SighTable } from '@/modules/sigh/components/sigh-table'
import { resolveRowNumber, resolveRowText } from '@/modules/sigh/sigh-utils'
import { getCamasDetalle, getResumenCamasReport, listTiposCama } from '@/modules/sigh/services/sigh-reports.service'
import type { SighTableRow } from '@/modules/sigh/types'

function safePercent(numerator: number, denominator: number) {
  if (!denominator) return '0'
  return ((numerator / denominator) * 100).toFixed(0)
}

export function ResumenCamasPage() {
  const [tipos, setTipos] = useState<Array<{ idTipo: string; tipo: string }>>([])
  const [selectedTipo, setSelectedTipo] = useState('0')
  const [rows, setRows] = useState<SighTableRow[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [detailRows, setDetailRows] = useState<SighTableRow[]>([])
  const [detailTitle, setDetailTitle] = useState('')
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

  const handleFetch = async () => {
    setLoading(true)
    setError(null)
    try {
      const payload = await getResumenCamasReport(selectedTipo)
      setRows(payload)
    } catch (fetchError) {
      const message = fetchError instanceof Error ? fetchError.message : 'No se pudo consultar Resumen de Camas.'
      setError(message)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    void handleFetch()
  }, [])

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
      const message = detailError instanceof Error ? detailError.message : 'No se pudo obtener el detalle.'
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

  return (
    <SighPageShell
      error={error}
      description="Resumen de camas por piso/servicio filtrado por tipo de cama."
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

      <div className="overflow-x-auto rounded-md border border-border/70 bg-white">
        <table className="min-w-[980px] border-collapse text-[12px]">
          <thead>
            <tr className="bg-[#eef5fb] text-[#123B63]">
              <th className="border-b border-border px-2 py-1 font-semibold uppercase">Piso</th>
              <th className="border-b border-border px-2 py-1 font-semibold uppercase">Servicio</th>
              <th className="border-b border-border px-2 py-1 font-semibold uppercase">Tipo</th>
              <th className="border-b border-border px-2 py-1 font-semibold uppercase">Operativas</th>
              <th className="border-b border-border px-2 py-1 font-semibold uppercase">Ocupadas</th>
              <th className="border-b border-border px-2 py-1 font-semibold uppercase">% Ocupacion</th>
              <th className="border-b border-border px-2 py-1 font-semibold uppercase">Disponibles</th>
              <th className="border-b border-border px-2 py-1 font-semibold uppercase">Transitorias</th>
              <th className="border-b border-border px-2 py-1 font-semibold uppercase">Inhabilitadas</th>
            </tr>
          </thead>
          <tbody>
            {rows.length ? (
              rows.map((row, index) => {
                const operativas = resolveRowNumber(row, 'CHABI', ['chabi'])
                const ocupadas = resolveRowNumber(row, 'COCUP', ['cocup'])
                const disponibles = resolveRowNumber(row, 'CLIBR', ['clibr'])
                const transitorias = resolveRowNumber(row, 'CTRAN', ['ctran'])
                const inhabilitadas = resolveRowNumber(row, 'CINAH', ['cinah'])

                return (
                  <tr key={`resumen-cama-${index}`} className="odd:bg-white even:bg-[#f8fbff]">
                    <td className="border-b border-border/70 px-2 py-1">{resolveRowText(row, 'PISO', ['piso']) || '-'}</td>
                    <td className="border-b border-border/70 px-2 py-1">{resolveRowText(row, 'SERVICIO', ['servicio']) || '-'}</td>
                    <td className="border-b border-border/70 px-2 py-1">{resolveRowText(row, 'TIPO', ['tipo']) || '-'}</td>
                    <td className="border-b border-border/70 px-2 py-1 text-center">
                      <button type="button" className="text-brand-strong hover:underline" onClick={() => void openDetail('1', row, 'Detalle camas operativas')}>
                        {operativas}
                      </button>
                    </td>
                    <td className="border-b border-border/70 px-2 py-1 text-center">
                      <button type="button" className="text-brand-strong hover:underline" onClick={() => void openDetail('2', row, 'Detalle camas ocupadas')}>
                        {ocupadas}
                      </button>
                    </td>
                    <td className="border-b border-border/70 px-2 py-1 text-center">{safePercent(ocupadas, operativas)}%</td>
                    <td className="border-b border-border/70 px-2 py-1 text-center">
                      <button type="button" className="text-brand-strong hover:underline" onClick={() => void openDetail('3', row, 'Detalle camas disponibles')}>
                        {disponibles}
                      </button>
                    </td>
                    <td className="border-b border-border/70 px-2 py-1 text-center">
                      <button type="button" className="text-brand-strong hover:underline" onClick={() => void openDetail('4', row, 'Detalle camas transitorias')}>
                        {transitorias}
                      </button>
                    </td>
                    <td className="border-b border-border/70 px-2 py-1 text-center">
                      <button type="button" className="text-brand-strong hover:underline" onClick={() => void openDetail('5', row, 'Detalle camas inhabilitadas')}>
                        {inhabilitadas}
                      </button>
                    </td>
                  </tr>
                )
              })
            ) : (
              <tr>
                <td colSpan={9} className="px-3 py-5 text-center text-xs text-muted">
                  {loading ? 'Consultando resumen de camas...' : 'No se encuentran registros.'}
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

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
