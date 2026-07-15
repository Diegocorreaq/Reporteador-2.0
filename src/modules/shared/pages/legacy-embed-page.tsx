import { Download, FileSpreadsheet } from 'lucide-react'
import { type FormEvent, useState } from 'react'
import { useLocation } from 'react-router-dom'
import { Alert } from '@/components/ui/alert'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { findLegacyModuleMapping } from '@/config/legacy-functional-map'
import {
  downloadPowerBiDashboardExcel,
  type PowerBiDashboardExportType,
} from '@/modules/indicadores/services/eficiencia-export.service'

const DEFAULT_MIN_EXPORT_DATE = '2019-01-01'

function toDateInputValue(date: Date) {
  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')
  return `${year}-${month}-${day}`
}

interface DashboardExcelExportConfig {
  type: PowerBiDashboardExportType
  title: string
  description: string
  minDate?: string
}

const dashboardExcelExports: Partial<Record<string, DashboardExcelExportConfig>> = {
  'indicadores-hospitalarios/indicadores-de-eficiencia': {
    type: 'eficiencia',
    title: 'indicadores de eficiencia',
    description: 'Seleccione el rango de fechas para generar el Excel con las bases de cada indicador.',
  },
  'indicadores-hospitalarios/indicadores-de-eficacia': {
    type: 'eficacia',
    title: 'indicadores de eficacia',
    description: 'Seleccione el rango de fechas para generar el Excel con las bases de cada indicador.',
  },
  'indicadores-hospitalarios/indicadores-de-calidad': {
    type: 'calidad',
    title: 'indicadores de calidad',
    description: 'Seleccione el rango de fechas para generar el Excel con las bases de cada indicador.',
  },
  'atencion-ambulatoria-hospitalizacion/consulta-externa-por-consultorio-y-profesional': {
    type: 'consultaExternaConsultorioProfesional',
    title: 'consulta externa por consultorio y profesional',
    description: 'Seleccione el rango de fechas para generar el Excel con las bases de los cuadros del dashboard.',
    minDate: '2020-01-01',
  },
}

export function LegacyEmbedPage() {
  const location = useLocation()
  const mapping = findLegacyModuleMapping(location.pathname)
  const today = new Date()
  const [exportDialogOpen, setExportDialogOpen] = useState(false)
  const [fechaInicio, setFechaInicio] = useState(`${today.getFullYear()}-01-01`)
  const [fechaFin, setFechaFin] = useState(toDateInputValue(today))
  const [exporting, setExporting] = useState(false)
  const [exportError, setExportError] = useState('')
  const dashboardExport = mapping?.path ? dashboardExcelExports[mapping.path] : undefined
  const minExportDate = dashboardExport?.minDate ?? DEFAULT_MIN_EXPORT_DATE

  async function handleDashboardExport(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setExportError('')

    if (!dashboardExport) {
      setExportError('No se encontro exportador para este dashboard.')
      return
    }

    if (!fechaInicio || !fechaFin) {
      setExportError('Seleccione fecha de inicio y fecha fin.')
      return
    }

    if (fechaInicio > fechaFin) {
      setExportError('La fecha de inicio no puede ser mayor que la fecha fin.')
      return
    }

    if (fechaInicio < minExportDate || fechaFin < minExportDate) {
      setExportError(`Solo se puede consultar informacion desde ${minExportDate}.`)
      return
    }

    setExporting(true)
    try {
      await downloadPowerBiDashboardExcel(dashboardExport.type, { fechaInicio, fechaFin })
      setExportDialogOpen(false)
    } catch {
      setExportError('No se pudo generar el Excel. Revise el rango de fechas e intente nuevamente.')
    } finally {
      setExporting(false)
    }
  }

  if (!mapping?.powerBiUrl) {
    return (
      <section className="py-4">
        <Alert variant="warning">
          No se encontro el enlace Power BI preservado para esta ruta.
        </Alert>
      </section>
    )
  }

  return (
    <>
      <section className="flex min-h-[calc(100vh-6rem)] flex-col">
        <div className={`relative flex flex-1 flex-col ${dashboardExport ? 'gap-2 md:gap-0' : ''}`}>
          {dashboardExport ? (
            <Button
              aria-label="Descargar Excel"
              className="group h-10 w-full justify-start gap-2 overflow-hidden rounded-full border-emerald-200 bg-white px-3 text-emerald-700 shadow-md transition-[width,background-color,border-color,box-shadow] duration-300 ease-out hover:border-emerald-300 hover:bg-emerald-50 hover:text-emerald-800 hover:shadow-lg md:absolute md:-right-4 md:top-4 md:z-10 md:h-11 md:w-14 md:justify-start md:gap-0 md:pl-3 md:pr-7 md:hover:w-44 md:hover:gap-2 md:hover:pl-4"
              onClick={() => {
                setExportError('')
                setExportDialogOpen(true)
              }}
              size="icon"
              type="button"
              variant="outline"
            >
              <Download className="h-5 w-5 shrink-0" />
              <span className="whitespace-nowrap text-xs font-semibold transition-[max-width,opacity,transform] duration-300 ease-out md:max-w-0 md:-translate-x-1 md:overflow-hidden md:opacity-0 md:group-hover:max-w-[120px] md:group-hover:translate-x-0 md:group-hover:opacity-100">
                Descargar Excel
              </span>
            </Button>
          ) : null}
          <iframe
            allowFullScreen
            className="block w-full flex-1 rounded-xl border border-border bg-white shadow-sm"
            frameBorder="0"
            scrolling="no"
            src={mapping.powerBiUrl}
            style={{ minHeight: `${mapping.frameHeight ?? 800}px` }}
            title={mapping.title}
          />
        </div>
      </section>

      <Dialog open={exportDialogOpen} onOpenChange={setExportDialogOpen}>
        <DialogContent>
          <form onSubmit={handleDashboardExport}>
            <DialogHeader>
              <DialogTitle>Exportar {dashboardExport?.title ?? 'dashboard'}</DialogTitle>
              <DialogDescription>
                {dashboardExport?.description ?? 'Seleccione el rango de fechas para generar el Excel.'}
              </DialogDescription>
            </DialogHeader>

            <div className="grid gap-4 sm:grid-cols-2">
              <label className="space-y-1.5 text-sm font-medium text-text">
                Fecha inicio
                <Input
                  max={fechaFin}
                  min={minExportDate}
                  onChange={(event) => setFechaInicio(event.target.value)}
                  required
                  type="date"
                  value={fechaInicio}
                />
              </label>
              <label className="space-y-1.5 text-sm font-medium text-text">
                Fecha fin
                <Input
                  min={fechaInicio > minExportDate ? fechaInicio : minExportDate}
                  onChange={(event) => setFechaFin(event.target.value)}
                  required
                  type="date"
                  value={fechaFin}
                />
              </label>
            </div>

            {exportError ? <p className="mt-3 text-sm text-danger">{exportError}</p> : null}

            <DialogFooter>
              <Button disabled={exporting} type="button" variant="ghost" onClick={() => setExportDialogOpen(false)}>
                Cancelar
              </Button>
              <Button disabled={exporting} type="submit">
                <FileSpreadsheet className="h-4 w-4" />
                {exporting ? 'Generando...' : 'Exportar Excel'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </>
  )
}
