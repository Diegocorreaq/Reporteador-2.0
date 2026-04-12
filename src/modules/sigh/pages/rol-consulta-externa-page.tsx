import { useState } from 'react'
import { Input } from '@/components/ui/input'
import { SighDailyMatrixBlock } from '@/modules/sigh/components/sigh-daily-matrix-block'
import { SighFilterPanel } from '@/modules/sigh/components/sigh-filter-panel'
import { SighPageShell } from '@/modules/sigh/components/sigh-page-shell'
import { getMonthEndDate, getMonthStartDate } from '@/modules/sigh/sigh-utils'
import { getRolConsultaExternaReport } from '@/modules/sigh/services/sigh-reports.service'
import type { GestionCitasReport } from '@/modules/sigh/types'

export function RolConsultaExternaPage() {
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
      const payload = await getRolConsultaExternaReport(filters)
      setReport(payload)
    } catch (processError) {
      const message = processError instanceof Error ? processError.message : 'No se pudo consultar Rol Consulta Externa.'
      setError(message)
    } finally {
      setLoading(false)
    }
  }

  return (
    <SighPageShell
      error={error}
      description="Programacion de consulta externa segmentada en consultorios, procedimientos e interconsultas."
    >
      <SighFilterPanel processLabel="Consultar" onProcess={() => void handleProcess()}>
        <div className="w-[180px] space-y-1">
          <label className="text-xs font-semibold text-brand-strong" htmlFor="rol-fecha-inicio">
            Desde
          </label>
          <Input
            id="rol-fecha-inicio"
            type="date"
            value={filters.fechaInicio}
            onChange={(event) => setFilters((current) => ({ ...current, fechaInicio: event.target.value }))}
          />
        </div>

        <div className="w-[180px] space-y-1">
          <label className="text-xs font-semibold text-brand-strong" htmlFor="rol-fecha-fin">
            Hasta
          </label>
          <Input
            id="rol-fecha-fin"
            type="date"
            value={filters.fechaFin}
            onChange={(event) => setFilters((current) => ({ ...current, fechaFin: event.target.value }))}
          />
        </div>
      </SighFilterPanel>

      {loading && !report ? <p className="text-sm text-muted">Consultando bloques de rol...</p> : null}

      <div className="space-y-4">
        {(report?.blocks ?? []).map((block) => (
          <SighDailyMatrixBlock
            key={block.id}
            title={block.title}
            days={block.days}
            rows={block.rows}
            firstColumnLabel={block.id === 'int' ? 'Especialidad' : 'Consultorio'}
            firstColumnKeys={block.id === 'int' ? ['especialidad', 'consultorio'] : ['consultorio', 'especialidad']}
            secondColumnLabel="Turno"
            secondColumnKeys={['turno']}
          />
        ))}
      </div>
    </SighPageShell>
  )
}
