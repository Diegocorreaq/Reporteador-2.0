import { useEffect, useMemo, useRef, useState } from 'react'
import { RefreshCcw } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { SighKpiStrip } from '@/modules/sigh/components/sigh-kpi-strip'
import { SighPageShell } from '@/modules/sigh/components/sigh-page-shell'
import { SighTable, type SighTableColumn } from '@/modules/sigh/components/sigh-table'
import { resolveRowText } from '@/modules/sigh/sigh-utils'
import { getMonitoreoTicketsReport } from '@/modules/sigh/services/sigh-reports.service'
import type { MonitoreoTicketsReport } from '@/modules/sigh/types'

const REFRESH_INTERVAL_MS = 90000

function getCurrentDateTime() {
  const now = new Date()
  const date = now.toLocaleDateString('es-ES')
  const time = now.toLocaleTimeString('es-ES')
  return `${date} ${time}`
}

export function MonitoreoTicketsPage() {
  const [report, setReport] = useState<MonitoreoTicketsReport | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [currentDateTime, setCurrentDateTime] = useState(getCurrentDateTime())
  const abortRef = useRef<AbortController | null>(null)

  const columns = useMemo<SighTableColumn[]>(
    () => [
      {
        key: 'ticket',
        label: 'Nro ticket',
        align: 'center',
        render: (_, row) => resolveRowText(row, 'NROTICKET', ['nroticket', 'ticket']),
      },
      {
        key: 'entrada',
        label: 'Fecha y hora entrada',
        align: 'center',
        render: (_, row) => resolveRowText(row, 'FECENTRADA', ['fecentrada']),
      },
      {
        key: 'segundos',
        label: 'Tiempo espera (segundos)',
        align: 'center',
        render: (_, row) => resolveRowText(row, 'TESEGUNDO', ['tesegundo']),
      },
      {
        key: 'minutos',
        label: 'Tiempo espera (minutos)',
        align: 'center',
        render: (_, row) => resolveRowText(row, 'TEMINUTO', ['teminuto']),
      },
      {
        key: 'tipo',
        label: 'Tipo de atencion',
        align: 'center',
        render: (_, row) => resolveRowText(row, 'TIPOATENCION', ['tipoatencion']),
      },
    ],
    [],
  )

  const handleFetch = async () => {
    abortRef.current?.abort()
    const controller = new AbortController()
    abortRef.current = controller

    setLoading(true)
    setError(null)
    try {
      const payload = await getMonitoreoTicketsReport(controller.signal)
      setReport(payload)
    } catch (fetchError) {
      if (fetchError instanceof Error && fetchError.name === 'CanceledError') return
      const message = fetchError instanceof Error ? fetchError.message : 'No se pudo consultar el monitoreo de tickets.'
      setError(message)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    void handleFetch()
    const interval = window.setInterval(() => {
      void handleFetch()
      setCurrentDateTime(getCurrentDateTime())
    }, REFRESH_INTERVAL_MS)

    return () => {
      window.clearInterval(interval)
      abortRef.current?.abort()
    }
  }, [])

  return (
    <SighPageShell
      error={error}
      description="Monitoreo continuo de tickets en espera (refresco automatico cada 90 segundos)."
      actions={
        <Button size="sm" variant="outline" onClick={() => void handleFetch()}>
          <RefreshCcw className="h-4 w-4" />
          Actualizar
        </Button>
      }
    >
      <SighKpiStrip
        items={[
          { label: 'Fecha / Hora', value: currentDateTime },
          { label: 'Tiempo minimo', value: report?.summary.tiempoMinimo ?? '-' },
          { label: 'Tiempo promedio', value: report?.summary.tiempoPromedio ?? '-' },
          { label: 'Tiempo maximo', value: report?.summary.tiempoMaximo ?? '-' },
          { label: 'Nro en espera', value: report?.summary.enEspera ?? 0 },
        ]}
      />

      <SighTable
        rows={report?.rows ?? []}
        columns={columns}
        emptyMessage={loading ? 'Actualizando monitoreo...' : 'No se encuentran registros.'}
      />
    </SighPageShell>
  )
}
