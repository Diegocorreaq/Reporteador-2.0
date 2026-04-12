import { useEffect, useMemo, useState } from 'react'
import { AlertCircle, Download, Lock } from 'lucide-react'
import { EmptyState } from '@/components/feedback/empty-state'
import { PageHeader } from '@/components/data-display/page-header'
import { Alert } from '@/components/ui/alert'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
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

const RANGE_REPORTS = [
  { key: 'exporta_d_xls_1', legacyKey: 'historias_clinicas', label: 'Historias clinicas', fallbackMaxDays: 31 },
  { key: 'exporta_d_xls_2', legacyKey: 'atenciones_telemonitoreo', label: 'Atenciones telemonitoreo', fallbackMaxDays: 31 },
  { key: 'exporta_d_xls_3', legacyKey: 'solicitud_teleorientacion', label: 'Solicitud teleorientacion', fallbackMaxDays: 31 },
  { key: 'exporta_d_xls_4', legacyKey: 'transferencias', label: 'Transferencias', fallbackMaxDays: 31 },
  { key: 'exporta_d_xls_5', legacyKey: 'pac_altas', label: 'Pacientes de alta', fallbackMaxDays: 31 },
  { key: 'exporta_d_xls_6', legacyKey: 'pac_fallecidos', label: 'Pacientes fallecidos', fallbackMaxDays: 31 },
  { key: 'exporta_d_xls_6_h', legacyKey: 'pac_fallecidos_h', label: 'Pacientes fallecidos hospitalizados', fallbackMaxDays: 31 },
  { key: 'exporta_d_xls_7', legacyKey: 'pac_referidos', label: 'Pacientes referidos', fallbackMaxDays: 33 },
  { key: 'exporta_d_xls_8', legacyKey: 'pac_atendidos', label: 'Pacientes atendidos', fallbackMaxDays: 31 },
  { key: 'exporta_d_xls_9', legacyKey: 'interconsulta_uci_adultos', label: 'Interconsulta UCI adultos', fallbackMaxDays: 31 },
  { key: 'exporta_d_xls_10', legacyKey: 'interconsulta_otros', label: 'Interconsulta otros', fallbackMaxDays: 31 },
  { key: 'exporta_d_xls_11', legacyKey: 'morbilidad_materna', label: 'Morbilidad materna extrema', fallbackMaxDays: 92 },
  { key: 'exporta_d_xls_12', legacyKey: 'pac_hospitalizados', label: 'Pacientes hospitalizados', fallbackMaxDays: 31 },
  { key: 'exporta_d_xls_13', legacyKey: 'pac_nuevos_emergencia', label: 'Pacientes nuevos emergencia', fallbackMaxDays: 31 },
  { key: 'exporta_d_xls_14', legacyKey: 'pac_nuevos_uca', label: 'Pacientes nuevos UCA', fallbackMaxDays: 31 },
  { key: 'exporta_d_xls_15', legacyKey: 'pac_ficha_covid', label: 'Pacientes ficha COVID', fallbackMaxDays: 31 },
  { key: 'exporta_d_xls_16', legacyKey: 'produccion_admision', label: 'Produccion admision', fallbackMaxDays: 31 },
]

function buildDefaultFilters() {
  const now = new Date()
  const year = now.getFullYear()
  return {
    fechaInicio: `${year}-01-01`,
    fechaFin: `${year}-12-31`,
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

  const handleDownload = async (reportKey: string, fallbackMaxDays: number) => {
    if (!authorizedUser) {
      setError('Debe autorizar un usuario antes de exportar.')
      return
    }

    if (!isRangeValid) {
      setError('El rango de fechas no es valido.')
      return
    }

    const maxDays = maxDaysByKey[reportKey] ?? fallbackMaxDays
    const diff = daysBetween(filters.fechaInicio, filters.fechaFin)
    if (diff > maxDays) {
      setError(`El rango de fechas para este reporte no debe exceder ${maxDays} dias.`)
      return
    }

    setError(null)
    setIsDownloadingKey(reportKey)
    try {
      await downloadLegacyExport({
        catalog: 'range',
        key: reportKey,
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
    <section className="space-y-4">
      <PageHeader
        eyebrow={workspaceMeta.main.shortLabel}
        title={item?.label ?? 'Registros Procesados'}
        description="Zona de descarga de informacion por periodos con validacion de usuario."
        actions={
          <Button variant="outline" onClick={() => setIsAuthDialogOpen(true)}>
            <Lock className="h-4 w-4" />
            Cambiar autorizacion
          </Button>
        }
      />

      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base">Filtros de periodo</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid gap-3 sm:grid-cols-2">
            <div>
              <label className="mb-1 block text-xs font-semibold text-muted" htmlFor="range-fecha-inicio">
                Fecha inicio
              </label>
              <Input
                id="range-fecha-inicio"
                type="date"
                value={filters.fechaInicio}
                onChange={(event) => setFilters((current) => ({ ...current, fechaInicio: event.target.value }))}
              />
            </div>
            <div>
              <label className="mb-1 block text-xs font-semibold text-muted" htmlFor="range-fecha-fin">
                Fecha fin
              </label>
              <Input
                id="range-fecha-fin"
                type="date"
                value={filters.fechaFin}
                onChange={(event) => setFilters((current) => ({ ...current, fechaFin: event.target.value }))}
              />
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base">Usuario autorizado</CardTitle>
        </CardHeader>
        <CardContent>
          {authorizedUser ? (
            <p className="text-sm text-muted">
              <span className="font-semibold text-text">{authorizedUser.employeeName}</span>
              {` (ID ${authorizedUser.employeeId})`}
            </p>
          ) : (
            <EmptyState title="Sin autorizacion" description="Valide un usuario para habilitar la zona de descarga." />
          )}
        </CardContent>
      </Card>

      {error ? (
        <Alert className="flex items-center gap-2">
          <AlertCircle className="h-4 w-4" />
          <span>{error}</span>
        </Alert>
      ) : null}

      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base">Reportes exportables</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="min-w-full border-collapse text-sm">
              <thead>
                <tr className="bg-canvas">
                  <th className="border-b border-border px-3 py-2 text-left text-xs font-semibold uppercase text-muted">Legacy</th>
                  <th className="border-b border-border px-3 py-2 text-left text-xs font-semibold uppercase text-muted">Reporte</th>
                  <th className="border-b border-border px-3 py-2 text-left text-xs font-semibold uppercase text-muted">Rango maximo</th>
                  <th className="border-b border-border px-3 py-2 text-left text-xs font-semibold uppercase text-muted">Accion</th>
                </tr>
              </thead>
              <tbody>
                {RANGE_REPORTS.map((report) => {
                  const maxDays = maxDaysByKey[report.key] ?? report.fallbackMaxDays
                  return (
                    <tr key={report.key} className="odd:bg-white even:bg-canvas/40">
                      <td className="border-b border-border px-3 py-2 font-medium">{report.legacyKey}</td>
                      <td className="border-b border-border px-3 py-2">{report.label}</td>
                      <td className="border-b border-border px-3 py-2">{maxDays} dias</td>
                      <td className="border-b border-border px-3 py-2">
                        <Button
                          size="sm"
                          disabled={!authorizedUser || !isRangeValid || isDownloadingKey === report.key}
                          onClick={() => void handleDownload(report.key, report.fallbackMaxDays)}
                        >
                          <Download className="h-4 w-4" />
                          Exportar
                        </Button>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>

      <Dialog open={isAuthDialogOpen} onOpenChange={setIsAuthDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Autorizacion de usuario</DialogTitle>
            <DialogDescription>Ingrese credenciales autorizadas para la Zona de Descarga.</DialogDescription>
          </DialogHeader>
          <div className="space-y-3">
            <div>
              <label className="mb-1 block text-xs font-semibold text-muted" htmlFor="range-username">
                Usuario
              </label>
              <Input id="range-username" value={username} onChange={(event) => setUsername(event.target.value)} />
            </div>
            <div>
              <label className="mb-1 block text-xs font-semibold text-muted" htmlFor="range-password">
                Clave
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
              {isAuthorizing ? 'Validando...' : 'Validar usuario'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </section>
  )
}
