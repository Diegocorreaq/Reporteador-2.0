import { useEffect, useMemo, useRef, useState } from 'react'
import { RefreshCcw } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { SighPageShell } from '@/modules/sigh/components/sigh-page-shell'
import { SighTable, type SighTableColumn } from '@/modules/sigh/components/sigh-table'
import { resolveRowNumber, resolveRowText } from '@/modules/sigh/sigh-utils'
import { getMonitoreoVentanillaReport } from '@/modules/sigh/services/sigh-reports.service'
import type { MonitoreoVentanillaReport } from '@/modules/sigh/types'

const REFRESH_INTERVAL_MS = 90000

export function MonitoreoVentanillaPage() {
  const [report, setReport] = useState<MonitoreoVentanillaReport | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const abortRef = useRef<AbortController | null>(null)

  const columns = useMemo<SighTableColumn[]>(
    () => [
      {
        key: 'ventanilla',
        label: 'Ventanilla',
        align: 'center',
        render: (_, row) => resolveRowText(row, 'LUGAR', ['lugar']),
      },
      {
        key: 'ticket',
        label: 'Ticket',
        align: 'center',
        render: (_, row) => resolveRowText(row, 'TICKET', ['ticket']),
      },
      {
        key: 'horae',
        label: 'Hora llegada',
        align: 'center',
        render: (_, row) => resolveRowText(row, 'HORAE', ['horae']),
      },
      {
        key: 'horal',
        label: 'Hora llamado',
        align: 'center',
        render: (_, row) => resolveRowText(row, 'HORAL', ['horal']),
      },
      {
        key: 'tiempo1',
        label: 'Tiempo llegada-llamado (min)',
        align: 'center',
        render: (_, row) => {
          const value = resolveRowNumber(row, 'TIEMPO1', ['tiempo1'])
          const className = value === 0 ? 'inline-block rounded px-2 py-0.5 bg-[#ffd9d9] text-danger font-semibold' : ''
          return <span className={className}>{value}</span>
        },
      },
      {
        key: 'horai',
        label: 'Hora inicio',
        align: 'center',
        render: (_, row) => resolveRowText(row, 'HORAI', ['horai']),
      },
      {
        key: 'horaf',
        label: 'Hora fin',
        align: 'center',
        render: (_, row) => resolveRowText(row, 'HORAF', ['horaf']),
      },
      {
        key: 'tiempo2',
        label: 'Tiempo inicio-fin (min)',
        align: 'center',
        render: (_, row) => {
          const value = resolveRowNumber(row, 'TIEMPO2', ['tiempo2'])
          const className = value === 0 ? 'inline-block rounded px-2 py-0.5 bg-[#ffd9d9] text-danger font-semibold' : ''
          return <span className={className}>{value}</span>
        },
      },
      {
        key: 'tipo',
        label: 'Tipo de atencion',
        align: 'center',
        render: (_, row) => resolveRowText(row, 'TIPO', ['tipo']),
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
      const payload = await getMonitoreoVentanillaReport(controller.signal)
      setReport(payload)
    } catch (fetchError) {
      if (fetchError instanceof Error && fetchError.name === 'CanceledError') return
      const message = fetchError instanceof Error ? fetchError.message : 'No se pudo consultar el monitoreo de ventanilla.'
      setError(message)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    void handleFetch()
    const interval = window.setInterval(() => {
      void handleFetch()
    }, REFRESH_INTERVAL_MS)

    return () => {
      window.clearInterval(interval)
      abortRef.current?.abort()
    }
  }, [])

  return (
    <SighPageShell
      error={error}
      description="Monitoreo por ventanilla con tiempos operativos (refresco automatico cada 90 segundos)."
      actions={
        <Button size="sm" variant="outline" onClick={() => void handleFetch()}>
          <RefreshCcw className="h-4 w-4" />
          Actualizar
        </Button>
      }
    >
      <SighTable
        rows={report?.rows ?? []}
        columns={columns}
        emptyMessage={loading ? 'Actualizando monitoreo...' : 'No se encuentran registros.'}
      />
    </SighPageShell>
  )
}
