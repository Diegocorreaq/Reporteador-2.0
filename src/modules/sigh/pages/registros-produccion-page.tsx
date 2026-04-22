import { useEffect, useMemo, useState } from 'react'
import { Download, ShieldCheck } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { SighPageShell } from '@/modules/sigh/components/sigh-page-shell'
import { SisgalenValidationDialog } from '@/modules/sigh/components/sisgalen-validation-dialog'
import { countDaysBetween, getMonthEndDate, getMonthStartDate } from '@/modules/sigh/sigh-utils'
import {
  downloadSighExport,
  getSighExportCatalog,
  validateSisgalenUser,
} from '@/modules/sigh/services/sigh-reports.service'

interface ExportItem {
  key: string
  label: string
  fallbackMaxDays: number
}

const RANGE_EXPORT_ITEMS: ExportItem[] = [
  { key: 'exporta_d_xls_1', label: 'Reporte de Historias Clínicas Aperturadas', fallbackMaxDays: 31 },
  { key: 'exporta_d_xls_19', label: 'Listado de Ticket de Ventanilla', fallbackMaxDays: 31 },
  { key: 'exporta_d_xls_2', label: 'Listado Nominal de Pacientes Programados y Atendidos en los Servicios Ambulatorios', fallbackMaxDays: 31 },
  { key: 'exporta_d_xls_13', label: 'Listado Nominal de Ingresos Nuevos en los Servicios de Emergencia', fallbackMaxDays: 31 },
  { key: 'exporta_d_xls_14', label: 'Listado Nominal de Ingresos Nuevos en los Servicios de Atención de Cirugía Ambulatoria - UCA', fallbackMaxDays: 31 },
  { key: 'exporta_d_xls_5', label: 'Listado Nominal de Pacientes con Alta Médica', fallbackMaxDays: 31 },
  { key: 'exporta_d_xls_6', label: 'Listado Nominal de Pacientes Fallecidos (Registrado en SISGALEN)', fallbackMaxDays: 31 },
  { key: 'exporta_d_xls_7', label: 'Listado Nominal de Pacientes Movimiento de Referencias (Enviadas y Recibidas)', fallbackMaxDays: 33 },
  { key: 'exporta_d_xls_8', label: 'Listado Nominal de Pacientes Admisionados', fallbackMaxDays: 31 },
  { key: 'exporta_d_xls_17', label: 'Listado de Pacientes que Ingresaron por Triaje y con Temperatura >= 37.5°', fallbackMaxDays: 31 },
  { key: 'exporta_d_xls_18', label: 'Listado de Usuarios Apertura de Cuentas', fallbackMaxDays: 31 },
  { key: 'exporta_d_xls_20', label: 'Lista de Historias Clínicas y Recetas sin Firma Electrónica en Consulta Externa de todas las Especialidades', fallbackMaxDays: 31 },
]

export function RegistrosProduccionPage() {
  const [filters, setFilters] = useState({
    fechaInicio: getMonthStartDate(),
    fechaFin: getMonthEndDate(),
  })
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [authError, setAuthError] = useState<string | null>(null)
  const [isAuthorizing, setIsAuthorizing] = useState(false)
  const [authorizedUser, setAuthorizedUser] = useState<{ employeeId: number; employeeName: string } | null>(null)
  const [isAuthDialogOpen, setIsAuthDialogOpen] = useState(true)
  const [maxDaysByKey, setMaxDaysByKey] = useState<Record<string, number>>({})
  const [availableKeys, setAvailableKeys] = useState<Set<string>>(new Set())
  const [downloadKey, setDownloadKey] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)

  const isRangeValid = useMemo(() => filters.fechaInicio <= filters.fechaFin, [filters.fechaFin, filters.fechaInicio])

  useEffect(() => {
    void (async () => {
      try {
        const options = await getSighExportCatalog('range')
        setAvailableKeys(new Set(options.map((option) => option.key)))
        setMaxDaysByKey(
          options.reduce<Record<string, number>>((accumulator, option) => {
            if (option.maxDays) {
              accumulator[option.key] = option.maxDays
            }
            return accumulator
          }, {}),
        )
      } catch (catalogError) {
        console.warn('No se pudo cargar el catalogo por rango.', catalogError)
      }
    })()
  }, [])

  const rows = useMemo(
    () =>
      RANGE_EXPORT_ITEMS.map((item, index) => ({
        ...item,
        order: index + 1,
        enabled: availableKeys.has(item.key),
      })),
    [availableKeys],
  )

  const handleAuthorize = async () => {
    setAuthError(null)
    setIsAuthorizing(true)
    try {
      const validation = await validateSisgalenUser(username, password)
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

  const handleDownload = async (row: (typeof rows)[number]) => {
    if (!authorizedUser) {
      setError('Debe autorizar un usuario SISGALEN antes de exportar.')
      return
    }

    if (!isRangeValid) {
      setError('El rango de fechas no es valido.')
      return
    }

    if (!row.enabled) {
      setError('Este exporte no esta disponible en el catalogo actual.')
      return
    }

    const maxDays = maxDaysByKey[row.key] ?? row.fallbackMaxDays
    const diff = countDaysBetween(filters.fechaInicio, filters.fechaFin)
    if (diff > maxDays) {
      setError(`El rango de fechas para este reporte no debe exceder ${maxDays} dias.`)
      return
    }

    setError(null)
    setDownloadKey(row.key)
    try {
      await downloadSighExport({
        catalog: 'range',
        key: row.key,
        employeeId: authorizedUser.employeeId,
        fechaInicio: filters.fechaInicio,
        fechaFin: filters.fechaFin,
      })
    } catch (downloadError) {
      const message = downloadError instanceof Error ? downloadError.message : 'No se pudo descargar el archivo.'
      setError(message)
    } finally {
      setDownloadKey(null)
    }
  }

  return (
    <SighPageShell
      error={error}
      description="Exportacion de registros por periodo con validacion SISGALEN y control de rango por reporte."
      actions={
        <Button className="w-full sm:w-auto" size="sm" variant="outline" onClick={() => setIsAuthDialogOpen(true)}>
          <ShieldCheck className="h-4 w-4" />
          {authorizedUser ? 'Cambiar usuario' : 'Validar usuario'}
        </Button>
      }
    >
      <Card className="border-border/70">
        <CardHeader className="border-b border-border/60 pb-3">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <CardTitle className="text-sm">
              Usuario autorizado:{' '}
              <span className="font-semibold text-brand-strong">{authorizedUser?.employeeName ?? 'No validado'}</span>
            </CardTitle>
            <p className="text-[11px] text-muted">Exportación por periodo — requiere validación SISGALEN</p>
          </div>
        </CardHeader>
        <CardContent className="space-y-4 pt-4">
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            <div className="space-y-1">
              <label className="text-xs font-semibold text-brand-strong" htmlFor="prod-fecha-inicio">
                Desde
              </label>
              <Input
                id="prod-fecha-inicio"
                type="date"
                value={filters.fechaInicio}
                onChange={(event) => setFilters((current) => ({ ...current, fechaInicio: event.target.value }))}
              />
            </div>
            <div className="space-y-1">
              <label className="text-xs font-semibold text-brand-strong" htmlFor="prod-fecha-fin">
                Hasta
              </label>
              <Input
                id="prod-fecha-fin"
                type="date"
                value={filters.fechaFin}
                onChange={(event) => setFilters((current) => ({ ...current, fechaFin: event.target.value }))}
              />
            </div>
            <div className="flex items-end text-xs text-muted sm:col-span-2 lg:col-span-1">
              Rango actual: {countDaysBetween(filters.fechaInicio, filters.fechaFin)} dias
            </div>
          </div>

          <p className="text-[11px] text-muted sm:hidden">Desliza la tabla para ver reportes y acciones.</p>

          <div className="overflow-x-auto rounded-md border border-border/70">
            <table className="min-w-[680px] border-collapse text-[11px] sm:min-w-[800px] sm:text-[12px]">
              <thead>
                <tr className="bg-[#123B63] text-white">
                  <th className="hidden w-10 border-b border-white/15 px-2 py-1.5 text-right text-[11px] font-semibold uppercase tracking-wide sm:table-cell">Ord</th>
                  <th className="border-b border-white/15 px-2 py-1.5 text-left text-[11px] font-semibold uppercase tracking-wide">Tipo de Reporte</th>
                  <th className="w-28 border-b border-white/15 px-2 py-1.5 text-center text-[11px] font-semibold uppercase tracking-wide">Archivo</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((row) => (
                  <tr key={row.key} className="odd:bg-white even:bg-[#f8fbff]">
                    <td className="hidden border-b border-border/70 px-2 py-1.5 text-right align-middle sm:table-cell">{row.order}</td>
                    <td className="border-b border-border/70 px-2 py-1.5 align-middle font-medium text-[#123B63] whitespace-normal">{row.label}</td>
                    <td className="border-b border-border/70 px-2 py-1.5 align-middle">
                      <Button
                        size="sm"
                        className="h-7 w-full gap-1.5 px-2 text-[11px] font-semibold sm:w-auto sm:px-3"
                        style={row.enabled && authorizedUser && isRangeValid ? { backgroundColor: '#005F8F', color: '#fff' } : undefined}
                        variant={row.enabled && authorizedUser && isRangeValid ? 'default' : 'outline'}
                        onClick={() => void handleDownload(row)}
                        disabled={!authorizedUser || downloadKey === row.key || !row.enabled || !isRangeValid}
                      >
                        <Download className="h-3.5 w-3.5" />
                        {row.enabled ? 'Exportar' : 'No disponible'}
                      </Button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>

      <SisgalenValidationDialog
        open={isAuthDialogOpen}
        username={username}
        password={password}
        error={authError}
        isSubmitting={isAuthorizing}
        onUsernameChange={setUsername}
        onPasswordChange={setPassword}
        onSubmit={() => void handleAuthorize()}
        onOpenChange={setIsAuthDialogOpen}
      />
    </SighPageShell>
  )
}
