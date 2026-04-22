import { Fragment, useMemo, useState } from 'react'
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
  validateLegacyExportUser,
} from '@/modules/exportaciones/services/legacy-exports.service'

interface ReportRow {
  technicalKey: string
  label: string
}

interface ReportGroup {
  title: string
  headerStyle: {
    backgroundColor: string
    color: string
  }
  rows: ReportRow[]
}

const REPORT_GROUPS: ReportGroup[] = [
  {
    title: 'TRATAMIENTO DE PERSONAS CON PROBLEMAS PSICOSOCIALES',
    headerStyle: { backgroundColor: '#d4ecf9', color: '#1f4b6e' },
    rows: [
      { technicalKey: 'exporta_xls_4', label: '0070612 - TRATAMIENTO ESPECIALIZADO EN VIOLENCIA FAMILIAR.' },
      { technicalKey: 'exporta_xls_13', label: '0070613 - TRATAMIENTO ESPECIALIZADO DE PERSONAS POR VIOLENCIA SEXUAL.' },
      { technicalKey: 'exporta_xls_2', label: '0060614 - TRATAMIENTO DE NIÑOS, NIÑAS Y ADOLESCENTES AFECTADOS POR MALTRATO INFANTIL.' },
      { technicalKey: 'exporta_xls_8', label: '0070615 - TRATAMIENTO ESPECIALIZADO NIÑOS, NIÑAS Y ADOLESCENTES AFECTADOS POR VIOLENCIA SEXUAL.' },
    ],
  },
  {
    title:
      'TRATAMIENTO AMBULATORIO DE NIÑOS Y NIÑAS DE 0 A 17 AÑOS CON TRASTORNOS MENTALES Y DEL COMPORTAMIENTO Y/O PROBLEMAS PSICOSOCIALES PROPIOS DE LA INFANCIA Y LA ADOLESCENCIA',
    headerStyle: { backgroundColor: '#f7d8d1', color: '#6b3e37' },
    rows: [
      { technicalKey: 'exporta_xls_9', label: '0070616 - TRATAMIENTO AMBULATORIO DE NIÑOS Y NIÑAS DE 0 A 17 AÑOS CON TRASTORNOS DEL ESPECTRO AUTISTA.' },
      { technicalKey: 'exporta_xls_7', label: '5005927 - TRATAMIENTO AMBULATORIO DE NIÑOS Y NIÑAS Y ADOLESCENTES DE 0 A 17 AÑOS POR TRASTORNOS MENTALES Y DEL COMPORTAMIENTO.' },
    ],
  },
  {
    title: 'TRATAMIENTO AMBULATORIO DE PERSONAS CON TRANSTORNOS AFECTIVOS (DEPRESION Y CONDUCTA SUICIDA) Y DE ANSIEDAD',
    headerStyle: { backgroundColor: '#d7f1dc', color: '#245636' },
    rows: [
      { technicalKey: 'exporta_xls_5', label: '5005190 - TRATAMIENTO AMBULATORIO DE PERSONAS CON DEPRESIÓN MODERADA.' },
      { technicalKey: 'exporta_xls_1', label: '0070610 - TRATAMIENTO AMBULATORIO DE PERSONAS CON CONDUCTA SUICIDA.' },
      { technicalKey: 'exporta_xls_3', label: '0070611 - TRATAMIENTO AMBULATORIO DE PERSONAS CON ANSIEDAD.' },
    ],
  },
  {
    title: 'TRATAMIENTO AMBULATORIO DE PERSONAS CON TRASTORNO DEL COMPORTAMIENTO DEBIDO AL CONSUMO DE ALCOHOL Y TABACO',
    headerStyle: { backgroundColor: '#f4e4c7', color: '#664829' },
    rows: [
      { technicalKey: 'exporta_xls_11', label: '5005192 - INTERVENCIONES BREVES MOTIVACIONALES PARA PERSONAS CON CONSUMO PERJUDICIAL DE ALCOHOL Y TABACO.' },
      { technicalKey: 'exporta_xls_14', label: '0070617 - INTERVENCIÓN PARA PERSONA CON DEPENDENCIA DE ALCOHOL Y TABACO.' },
    ],
  },
  {
    title: 'TRATAMIENTO AMBULATORIO DE PERSONAS CON SINDROME O TRASTORNO PSICOTICO',
    headerStyle: { backgroundColor: '#ecefbf', color: '#596026' },
    rows: [
      {
        technicalKey: 'exporta_xls_10',
        label: '5005195 - TRATAMIENTO AMBULATORIO A PERSONAS CON SÍNDROME PSICÓTICO O TRASTORNO DEL ESPECTRO DE LA ESQUIZOFRENIA.',
      },
      { technicalKey: 'exporta_xls_12', label: '0070629 - TRATAMIENTO AMBULATORIO PARA PERSONAS CON DETERIORO COGNITIVO.' },
    ],
  },
]

function buildDefaultFilters() {
  const now = new Date()
  const year = now.getFullYear()

  return {
    fechaInicio: `${year}-01-01`,
    fechaFin: `${year}-12-31`,
  }
}

export function SaludMentalReportesPage() {
  const { item } = useActiveNavigationItem()
  const [filters, setFilters] = useState(buildDefaultFilters())
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [authError, setAuthError] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [isAuthorizing, setIsAuthorizing] = useState(false)
  const [isDownloadingKey, setIsDownloadingKey] = useState<string | null>(null)
  const [authorizedUser, setAuthorizedUser] = useState<{ employeeId: number; employeeName: string } | null>(null)
  const [isAuthDialogOpen, setIsAuthDialogOpen] = useState(true)

  const isRangeValid = useMemo(() => filters.fechaInicio <= filters.fechaFin, [filters.fechaInicio, filters.fechaFin])

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

  const handleDownload = async (key: string) => {
    if (!authorizedUser) {
      setError('Debe autorizar un usuario antes de exportar.')
      return
    }
    if (!isRangeValid) {
      setError('El rango de fechas no es válido.')
      return
    }

    setError(null)
    setIsDownloadingKey(key)
    try {
      await downloadLegacyExport({
        catalog: 'salud-mental',
        key,
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
    <section className="space-y-2">
      <header className="space-y-0.5">
        <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
          <span className="rounded-md bg-brand-soft px-2 py-0.5 text-[10px] font-bold uppercase tracking-[0.12em] text-brand-strong">
            {workspaceMeta.main.shortLabel}
          </span>
          <h1 className="text-lg font-semibold text-brand-strong sm:text-xl">
            {item?.label ?? 'Reportes Monitoreo'}
          </h1>
        </div>
        <p className="text-xs text-muted">Reportes de la Estrategia - Salud Mental.</p>
      </header>

      <div className="rounded-md border border-border/60 bg-white px-3 py-2">
        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-[minmax(0,180px)_minmax(0,180px)_minmax(0,1fr)] xl:items-end">
          <div className="space-y-1">
            <label className="block text-[11px] font-semibold text-text" htmlFor="sm-fecha-inicio">
              Desde
            </label>
            <Input
              id="sm-fecha-inicio"
              type="date"
              value={filters.fechaInicio}
              onChange={(event) => setFilters((current) => ({ ...current, fechaInicio: event.target.value }))}
              className="h-8 w-full rounded-md px-2 text-[11px]"
            />
          </div>
          <div className="space-y-1">
            <label className="block text-[11px] font-semibold text-text" htmlFor="sm-fecha-fin">
              Hasta
            </label>
            <Input
              id="sm-fecha-fin"
              type="date"
              value={filters.fechaFin}
              onChange={(event) => setFilters((current) => ({ ...current, fechaFin: event.target.value }))}
              className="h-8 w-full rounded-md px-2 text-[11px]"
            />
          </div>

          <div className="min-w-0 rounded-md bg-canvas/60 px-2 py-1.5 text-[11px] text-text xl:text-right">
            <span className="font-semibold">Usuario:</span>{' '}
            <span className="font-medium">
              {authorizedUser ? `${authorizedUser.employeeName}` : 'pendiente de validación'}
            </span>
          </div>
        </div>
      </div>

      {error ? (
        <Alert className="flex items-center gap-2 py-1.5 text-sm">
          <AlertCircle className="h-4 w-4" />
          <span>{error}</span>
        </Alert>
      ) : null}

      <p className="text-[11px] text-muted sm:hidden">Desliza la tabla para revisar todo el contenido.</p>

      <div className="overflow-x-auto rounded-md border border-border/70">
        <table className="w-full min-w-[620px] border-collapse text-[11px] leading-snug sm:min-w-[760px] lg:min-w-[920px]">
          <thead>
            <tr className="bg-[#123B63] text-white">
              <th className="w-10 border-b border-white/15 px-2 py-1.5 text-right text-[10px] font-semibold uppercase tracking-wide">N°</th>
              <th className="border-b border-white/15 px-2 py-1.5 text-left text-[10px] font-semibold uppercase tracking-wide">Tipo de Reporte</th>
              <th className="w-28 border-b border-white/15 px-2 py-1.5 text-center text-[10px] font-semibold uppercase tracking-wide">Archivo</th>
            </tr>
          </thead>
          <tbody>
            {REPORT_GROUPS.map((group) => (
              <Fragment key={group.title}>
                <tr>
                  <td
                    colSpan={3}
                    style={group.headerStyle}
                    className="border-b border-[#d6e4f0] px-2 py-[4px] text-left text-[10px] font-bold uppercase tracking-wide"
                  >
                    {group.title}
                  </td>
                </tr>
                {group.rows.map((report, index) => (
                  <tr key={`${group.title}-${report.technicalKey}`} className="odd:bg-white even:bg-canvas/30">
                    <td className="border-b border-border/70 px-2 py-1 text-right font-medium align-middle">{index + 1}</td>
                    <td className="border-b border-border/70 px-2 py-1 align-middle font-medium text-[#123B63] whitespace-normal">{report.label}</td>
                    <td className="border-b border-border/70 px-2 py-1 text-center align-middle">
                      <Button
                        size="sm"
                        className="h-7 w-full gap-1.5 px-2 text-[11px] font-semibold sm:w-auto sm:px-3"
                        style={authorizedUser && isRangeValid ? { backgroundColor: '#005F8F', color: '#fff' } : undefined}
                        variant={authorizedUser && isRangeValid ? 'default' : 'outline'}
                        disabled={!authorizedUser || !isRangeValid || isDownloadingKey === report.technicalKey}
                        onClick={() => void handleDownload(report.technicalKey)}
                      >
                        <Download className="h-3.5 w-3.5" />
                        {isDownloadingKey === report.technicalKey ? 'Descargando...' : 'Exportar'}
                      </Button>
                    </td>
                  </tr>
                ))}
              </Fragment>
            ))}
          </tbody>
        </table>
      </div>

      <Dialog open={isAuthDialogOpen} onOpenChange={setIsAuthDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Permisos para acceder a Reportes Nominales SM</DialogTitle>
            <DialogDescription>Ingrese número de DNI y contraseña SISGALEN.</DialogDescription>
          </DialogHeader>
          <div className="space-y-3">
            <div>
              <label className="mb-1 block text-xs font-semibold text-muted" htmlFor="sm-username">
                Número de DNI
              </label>
              <Input id="sm-username" value={username} onChange={(event) => setUsername(event.target.value)} />
            </div>
            <div>
              <label className="mb-1 block text-xs font-semibold text-muted" htmlFor="sm-password">
                Contraseña SISGALEN
              </label>
              <Input
                id="sm-password"
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


