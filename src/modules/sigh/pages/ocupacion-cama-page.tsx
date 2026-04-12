import { useEffect, useState } from 'react'
import { RefreshCcw } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { SighPageShell } from '@/modules/sigh/components/sigh-page-shell'
import { resolveRowNumber, resolveRowText } from '@/modules/sigh/sigh-utils'
import { getOcupacionHospitalizacionReport, getOcupacionUciReport } from '@/modules/sigh/services/sigh-reports.service'
import type { SighTableRow } from '@/modules/sigh/types'

function safePercent(numerator: number, denominator: number) {
  if (!denominator) return '0'
  return ((numerator / denominator) * 100).toFixed(1)
}

interface OccupancyBlockProps {
  title: string
  rows: SighTableRow[]
  loading: boolean
}

function OccupancyBlock({ title, rows, loading }: OccupancyBlockProps) {
  return (
    <Card className="border-border/70">
      <CardHeader className="border-b border-border/60 pb-3">
        <CardTitle className="text-sm">{title}</CardTitle>
      </CardHeader>
      <CardContent className="pt-4">
        <div className="overflow-x-auto rounded-md border border-border/70 bg-white">
          <table className="min-w-[860px] border-collapse text-[12px]">
            <thead>
              <tr className="bg-[#eef5fb] text-[#123B63]">
                <th className="border-b border-border px-2 py-1 font-semibold uppercase">Piso</th>
                <th className="border-b border-border px-2 py-1 font-semibold uppercase">Servicio</th>
                <th className="border-b border-border px-2 py-1 font-semibold uppercase">Tipo</th>
                <th className="border-b border-border px-2 py-1 text-center font-semibold uppercase">Total</th>
                <th className="border-b border-border px-2 py-1 text-center font-semibold uppercase">Habilitadas</th>
                <th className="border-b border-border px-2 py-1 text-center font-semibold uppercase">Ocupadas</th>
                <th className="border-b border-border px-2 py-1 text-center font-semibold uppercase">Disponibles</th>
                <th className="border-b border-border px-2 py-1 text-center font-semibold uppercase">% Ocupacion</th>
              </tr>
            </thead>
            <tbody>
              {rows.length ? (
                rows.map((row, index) => {
                  const total = resolveRowNumber(row, 'TOTAL', ['total'])
                  const habilitadas = resolveRowNumber(row, 'CHABI', ['chabi'])
                  const ocupadas = resolveRowNumber(row, 'COCUP', ['cocup'])
                  const disponibles = resolveRowNumber(row, 'CLIBR', ['clibr'])
                  return (
                    <tr key={`${title}-${index}`} className="odd:bg-white even:bg-[#f8fbff]">
                      <td className="border-b border-border/70 px-2 py-1">{resolveRowText(row, 'PISO', ['piso']) || '-'}</td>
                      <td className="border-b border-border/70 px-2 py-1">{resolveRowText(row, 'SERVICIO', ['servicio']) || '-'}</td>
                      <td className="border-b border-border/70 px-2 py-1">{resolveRowText(row, 'TIPO', ['tipo']) || '-'}</td>
                      <td className="border-b border-border/70 px-2 py-1 text-center">{total}</td>
                      <td className="border-b border-border/70 px-2 py-1 text-center">{habilitadas}</td>
                      <td className="border-b border-border/70 px-2 py-1 text-center">{ocupadas}</td>
                      <td className="border-b border-border/70 px-2 py-1 text-center">{disponibles}</td>
                      <td className="border-b border-border/70 px-2 py-1 text-center">{safePercent(ocupadas, habilitadas)}%</td>
                    </tr>
                  )
                })
              ) : (
                <tr>
                  <td colSpan={8} className="px-3 py-5 text-center text-xs text-muted">
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
  const [hospitalizacionRows, setHospitalizacionRows] = useState<SighTableRow[]>([])
  const [uciRows, setUciRows] = useState<SighTableRow[]>([])
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

      setHospitalizacionRows(hospitalizacion)
      setUciRows(uci)
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
      <div className="space-y-4">
        <OccupancyBlock title="Hospitalizacion" rows={hospitalizacionRows} loading={loading} />
        <OccupancyBlock title="UCI" rows={uciRows} loading={loading} />
      </div>
    </SighPageShell>
  )
}
