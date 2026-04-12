import { useState } from 'react'
import { Input } from '@/components/ui/input'
import { SighDailyMatrixBlock } from '@/modules/sigh/components/sigh-daily-matrix-block'
import { SighFilterPanel } from '@/modules/sigh/components/sigh-filter-panel'
import { SighPageShell } from '@/modules/sigh/components/sigh-page-shell'
import { getMonthEndDate, getMonthStartDate } from '@/modules/sigh/sigh-utils'
import { getGestionCitasReport } from '@/modules/sigh/services/sigh-reports.service'
import type { GestionCitasReport } from '@/modules/sigh/types'

export function GestionCitasPage() {
  const [filters, setFilters] = useState({
    fechaInicio: getMonthStartDate(),
    fechaFin: getMonthEndDate(),
  })
  const [report, setReport] = useState<GestionCitasReport | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const handleProcess = async () => {
    if (filters.fechaInicio > filters.fechaFin) {
      setError('La fecha de inicio no puede ser mayor a la fecha fin.')
      return
    }

    setError(null)
    setLoading(true)
    try {
      const payload = await getGestionCitasReport(filters)
      setReport(payload)
    } catch (processError) {
      const message = processError instanceof Error ? processError.message : 'No se pudo consultar Gestion de Citas.'
      setError(message)
    } finally {
      setLoading(false)
    }
  }

  return (
    <SighPageShell
      error={error}
      description="Monitoreo de gestion de citas por bloques funcionales y dias del periodo."
    >
      <SighFilterPanel
        processLabel="Consultar"
        onProcess={() => void handleProcess()}
        rightSlot={
          <div className="flex flex-wrap items-center gap-4 text-xs">
            <div className="flex items-center gap-2">
              <span className="inline-block h-3 w-3 rounded bg-[#99D799]" />
              <span>Cubierto</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="inline-block h-3 w-3 rounded bg-[#A1A2A1]" />
              <span>No programado</span>
            </div>
          </div>
        }
      >
        <div className="w-[180px] space-y-1">
          <label className="text-xs font-semibold text-brand-strong" htmlFor="gc-fecha-inicio">
            Desde
          </label>
          <Input
            id="gc-fecha-inicio"
            type="date"
            value={filters.fechaInicio}
            onChange={(event) => setFilters((current) => ({ ...current, fechaInicio: event.target.value }))}
          />
        </div>

        <div className="w-[180px] space-y-1">
          <label className="text-xs font-semibold text-brand-strong" htmlFor="gc-fecha-fin">
            Hasta
          </label>
          <Input
            id="gc-fecha-fin"
            type="date"
            value={filters.fechaFin}
            onChange={(event) => setFilters((current) => ({ ...current, fechaFin: event.target.value }))}
          />
        </div>
      </SighFilterPanel>

      {loading && !report ? <p className="text-sm text-muted">Consultando bloques de gestion de citas...</p> : null}

      <div className="space-y-4">
        {(report?.blocks ?? []).map((block) => (
          <SighDailyMatrixBlock
            key={block.id}
            title={block.title}
            days={block.days}
            rows={block.rows}
            firstColumnLabel="Consultorio"
            firstColumnKeys={['consultorio', 'especialidad']}
            secondColumnLabel="Turno"
            secondColumnKeys={['turno']}
          />
        ))}
      </div>
    </SighPageShell>
  )
}
