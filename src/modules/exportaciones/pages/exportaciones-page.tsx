import { useEffect, useMemo, useState } from 'react'
import { AlertCircle, Download } from 'lucide-react'
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
import { workspaceMeta } from '@/config/module-registry'
import { useActiveNavigationItem } from '@/hooks/use-active-navigation-item'
import {
  downloadLegacyExport,
  getExportCatalogOptions,
  validateLegacyExportUser,
} from '@/modules/exportaciones/services/legacy-exports.service'

interface LegacyVisibleReportRow {
  ord: number
  key: string
  label: string
  fallbackMaxDays: number
}

const VISIBLE_REPORT_ROWS: LegacyVisibleReportRow[] = [
  {
    ord: 1,
    key: 'exporta_d_xls_11',
    label: 'BAI - MORBILIDAD MATERNA EXTREMA',
    fallbackMaxDays: 92,
  },
]

function buildDefaultFilters() {
  const today = new Date().toISOString().slice(0, 10)
  return {
    fechaInicio: today,
    fechaFin: today,
  }
}

function daysBetween(startDate: string, endDate: string) {
  const start = new Date(`${startDate}T00:00:00`)
  const end = new Date(`${endDate}T00:00:00`)
  return Math.floor(Math.abs(end.getTime() - start.getTime()) / 86400000) + 1
}

export function ExportacionesPage() {
  const { item } = useActiveNavigationItem()
  const [filters, setFilters] = useState(buildDefaultFilters())
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [authError, setAuthError] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [isAuthorizing, setIsAuthorizing] = useState(false)
  const [isDownloadingKey, setIsDownloadingKey] = useState<string | null>(null)
  const [isAuthDialogOpen, setIsAuthDialogOpen] = useState(true)
  const [maxDaysByKey, setMaxDaysByKey] = useState<Record<string, number>>({})
  const [authorizedUser, setAuthorizedUser] = useState<{ employeeId: number; employeeName: string } | null>(null)

  const isRangeValid = useMemo(() => filters.fechaInicio <= filters.fechaFin, [filters.fechaInicio, filters.fechaFin])

  useEffect(() => {
    void (async () => {
      try {
        const catalogRows = await getExportCatalogOptions('range')
        const mapped = catalogRows.reduce<Record<string, number>>((accumulator, row) => {
          if (row.maxDays) {
            accumulator[row.key] = row.maxDays
          }
          return accumulator
        }, {})
        setMaxDaysByKey(mapped)
      } catch (catalogError) {
        console.warn('No se pudo cargar el catalogo de exportes por rango.', catalogError)
      }
    })()
  }, [])

  const handleAuthorize = async () => {
    setAuthError(null)
    setIsAuthorizing(true)
    try {
      const validation = await validateLegacyExportUser(username, password, 'general')
      if (!validation.ok || !validation.employeeId) {
        setAuthError(validation.message || 'No se pudo validar el usuario.')
        return
      }

      setAuthorizedUser({
        employeeId: validation.employeeId,
        employeeName: validation.employeeName,
      })
      setIsAuthDialogOpen(false)
    } catch (authRequestError) {
      const message = authRequestError instanceof Error ? authRequestError.message : 'No se pudo validar el usuario.'
      setAuthError(message)
    } finally {
      setIsAuthorizing(false)
    }
  }

  const handleDownload = async (report: LegacyVisibleReportRow) => {
    if (!authorizedUser) {
      setError('Debe autorizar un usuario antes de exportar.')
      return
    }

    if (!isRangeValid) {
      setError('El rango de fechas no es valido.')
      return
    }

    const maxDays = maxDaysByKey[report.key] ?? report.fallbackMaxDays
    const diff = daysBetween(filters.fechaInicio, filters.fechaFin)
    if (diff > maxDays) {
      setError(`El rango de fechas para este reporte no debe exceder ${maxDays} dias.`)
      return
    }

    setError(null)
    setIsDownloadingKey(report.key)
    try {
      await downloadLegacyExport({
        catalog: 'range',
        key: report.key,
        fechaInicio: filters.fechaInicio,
        fechaFin: filters.fechaFin,
        employeeId: authorizedUser.employeeId,
      })
    } catch (downloadError) {
      const message = downloadError instanceof Error ? downloadError.message : 'No se pudo descargar el archivo.'
      setError(message)
    } finally {
      setIsDownloadingKey(null)
    }
  }

  return (
    <section className="space-y-2.5">
      <header className="space-y-0.5">
        <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
          <span className="rounded-md bg-brand-soft px-2 py-0.5 text-[10px] font-bold uppercase tracking-[0.12em] text-brand-strong">
            {workspaceMeta.main.shortLabel}
          </span>
          <h1 className="text-lg font-semibold text-brand-strong sm:text-xl">
            {item?.label ?? 'Registros Procesados'}
          </h1>
        </div>
        <p className="text-xs text-muted">Zona de Descarga de Informacion por Periodos.</p>
      </header>

      <div className="rounded-md border border-border/70 bg-canvas/10 px-3 py-2">
        <div className="flex flex-row items-center justify-between gap-4 flex-wrap">
          <div className="flex items-center gap-2">
            <label className="shrink-0 text-[12px] font-semibold text-text" htmlFor="range-fecha-inicio">
              Desde:
            </label>
            <Input
              id="range-fecha-inicio"
              type="date"
              className="h-8 w-[128px] text-[12px]"
              value={filters.fechaInicio}
              onChange={(event) => setFilters((current) => ({ ...current, fechaInicio: event.target.value }))}
            />
          </div>
          <div className="flex items-center gap-2">
            <label className="shrink-0 text-[12px] font-semibold text-text" htmlFor="range-fecha-fin">
              Hasta:
            </label>
            <Input
              id="range-fecha-fin"
              type="date"
              className="h-8 w-[128px] text-[12px]"
              value={filters.fechaFin}
              onChange={(event) => setFilters((current) => ({ ...current, fechaFin: event.target.value }))}
            />
          </div>
          <div className="min-w-0 text-[12px] text-text md:text-right">
            <span className="font-semibold">Usuario:</span>{' '}
            <span className="font-medium">{authorizedUser ? authorizedUser.employeeName : ''}</span>
          </div>
        </div>
      </div>

      {error ? (
        <Alert className="flex items-center gap-2 py-1.5 text-sm">
          <AlertCircle className="h-4 w-4" />
          <span>{error}</span>
        </Alert>
      ) : null}
<br></br>
      <div className="overflow-x-auto rounded-md border border-border/80">
        <table className="w-full min-w-[760px] border-collapse text-[12px]">
          <thead>
            <tr className="bg-brand-strong text-white">
              <th className="w-14 border-b border-white/15 px-2 py-1 text-right text-[11px] font-semibold uppercase tracking-wide">
              ORD
              </th>
<th className="border-b border-white/15 px-2 py-1 text-left text-[11px] font-semibold uppercase tracking-wide">                TIPO DE REPORTE
              </th>
<th className="border-b border-white/15 px-2 py-1 text-left text-[11px] font-semibold uppercase tracking-wide">                ARCHIVO
              </th>
            </tr>
          </thead>

          <tbody>
            {VISIBLE_REPORT_ROWS.map((report) => (
              <tr key={report.key} className="bg-white">
                <td className="border-b border-border px-2 py-0.5 text-[11px] text-right font-medium align-top">{report.ord}</td>
                <td className="border-b border-border px-2 py-0.5 text-[11px] align-top">{report.label}</td>
                <td className="border-b border-border px-2 py-0.5 text-[11px] text-left align-middle">
  <Button
    size="sm"
    variant="ghost"
    className="h-6 gap-1 px-0 text-[10px] font-medium text-[#2b6faa] hover:bg-transparent hover:text-[#1f588b] hover:underline"
    disabled={!authorizedUser || !isRangeValid || isDownloadingKey === report.key}
    onClick={() => void handleDownload(report)}
  >
    <Download className="h-3 w-3" />
    Exportar
  </Button>
</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <Dialog open={isAuthDialogOpen} onOpenChange={setIsAuthDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Permisos para acceder a Reportes Nominales</DialogTitle>
            <DialogDescription>Ingrese numero de DNI y contrasena SISGALEN.</DialogDescription>
          </DialogHeader>
          <div className="space-y-3">
            <div>
              <label className="mb-1 block text-xs font-semibold text-muted" htmlFor="range-username">
                Numero de DNI
              </label>
              <Input id="range-username" value={username} onChange={(event) => setUsername(event.target.value)} />
            </div>
            <div>
              <label className="mb-1 block text-xs font-semibold text-muted" htmlFor="range-password">
                Contrasena SISGALEN
              </label>
              <Input
                id="range-password"
                type="password"
                value={password}
                onChange={(event) => setPassword(event.target.value)}
              />
            </div>
            {authError ? (
              <Alert className="flex items-center gap-2">
                <AlertCircle className="h-4 w-4" />
                <span>{authError}</span>
              </Alert>
            ) : null}
          </div>
          <DialogFooter>
            <Button onClick={() => void handleAuthorize()} disabled={isAuthorizing}>
              {isAuthorizing ? 'Validando...' : 'Aceptar'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </section>
  )
}

