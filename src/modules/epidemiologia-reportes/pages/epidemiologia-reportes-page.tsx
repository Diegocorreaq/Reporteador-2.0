import { useMemo, useState, type ReactNode } from 'react'
import { useLocation } from 'react-router-dom'
import {
  AlertCircle,
  CalendarDays,
  ClipboardList,
  Download,
  FileDown,
  FileSpreadsheet,
  ListChecks,
  Search,
  ShieldCheck,
} from 'lucide-react'
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
import {
  downloadEpidemiologiaReporte,
  validateEpidemiologiaReporteUser,
  type EpidemiologiaReportKey,
} from '@/modules/epidemiologia-reportes/services/epidemiologia-reportes.service'

type DateMode = 'range' | 'single'

interface DownloadRequest {
  report?: EpidemiologiaReportKey
  subtype?: string
  dateMode?: DateMode
  key?: string
  skipAuth?: boolean
}

interface ModuleConfig {
  key: EpidemiologiaReportKey
  title: string
  subtitle: string
  gradient: string
  accent: string
  tags: Array<{ icon: typeof CalendarDays; label: string }>
}

const MODULES: Record<string, ModuleConfig> = {
  'pacientes-oncologicos': {
    key: 'pacientes-oncologicos',
    title: 'Busqueda de pacientes oncologicos',
    subtitle:
      'Genere la lista de pacientes identificados con diagnosticos relacionados al grupo de enfermedades oncologicas mediante un rango de fechas claro y facil de usar.',
    gradient: 'linear-gradient(120deg, #8f2257 0%, #c93668 52%, #e58b18 100%)',
    accent: 'text-[#b73764] bg-[#fff0dc]',
    tags: [
      { icon: CalendarDays, label: 'Consulta por periodo' },
      { icon: FileDown, label: 'Descarga en Excel' },
      { icon: ShieldCheck, label: 'Data no en tiempo real' },
    ],
  },
  'pfa-sifilis-sarampion': {
    key: 'pfa-sifilis-sarampion',
    title: 'Datos de pacientes con PFA, Sifilis y Sarampion',
    subtitle:
      'Seleccione el modulo correspondiente y exporte los registros de enfermedades transmisibles con una experiencia mas ordenada y consistente.',
    gradient: 'linear-gradient(120deg, #4f328d 0%, #7250c8 58%, #a58be8 100%)',
    accent: 'text-[#6541a6] bg-[#efe6ff]',
    tags: [
      { icon: CalendarDays, label: 'Consulta por periodo' },
      { icon: FileDown, label: 'Descarga por modulo' },
      { icon: ShieldCheck, label: 'Data hasta un dia antes' },
    ],
  },
  isqx: {
    key: 'isqx',
    title: 'BAI Infeccion del Sitio Quirurgico',
    subtitle:
      'Monitoree pacientes con reingresos segun procedimientos quirurgicos y consulte los tiempos de retorno esperados de forma mas clara y ordenada.',
    gradient: 'linear-gradient(120deg, #214f8c 0%, #2e72d4 55%, #17a8bf 100%)',
    accent: 'text-[#0b75a5] bg-[#dcfbff]',
    tags: [
      { icon: CalendarDays, label: 'Monitoreo por dia' },
      { icon: ShieldCheck, label: 'Considera antibioticos' },
      { icon: ListChecks, label: 'Tabla de referencia' },
    ],
  },
  'mordedura-canina': {
    key: 'mordedura-canina',
    title: 'Pacientes con mordedura canina',
    subtitle:
      'Consulte y exporte los registros identificados con diagnosticos relacionados a mordedura canina dentro del periodo seleccionado.',
    gradient: 'linear-gradient(120deg, #9d4618 0%, #e46b2f 58%, #edae50 100%)',
    accent: 'text-[#bd5d24] bg-[#fff1df]',
    tags: [
      { icon: Search, label: 'Busqueda por periodo' },
      { icon: ShieldCheck, label: 'Data en tiempo real' },
      { icon: FileDown, label: 'Descarga inmediata' },
    ],
  },
  'cirugia-procedimiento': {
    key: 'cirugia-procedimiento',
    title: 'Cirugias procedimiento',
    subtitle:
      'Exporte la lista de procedimientos quirurgicos dentro de un periodo definido, con una interfaz mas legible y enfocada en la accion principal.',
    gradient: 'linear-gradient(120deg, #0f6f55 0%, #279766 58%, #7ccf9f 100%)',
    accent: 'text-[#17845f] bg-[#e2f8ec]',
    tags: [
      { icon: CalendarDays, label: 'Rango de fechas' },
      { icon: FileDown, label: 'Archivo Excel' },
      { icon: ShieldCheck, label: 'Data desde 2019' },
    ],
  },
  'seguimiento-dengue': {
    key: 'seguimiento-dengue',
    title: 'Pacientes DENGUE hospitalizados',
    subtitle:
      'Exporte en Excel el corte diario de pacientes hospitalizados con dengue desde una interfaz mas clara, directa y enfocada solo en este reporte.',
    gradient: 'linear-gradient(120deg, #087b86 0%, #25988f 55%, #d7a92d 100%)',
    accent: 'text-[#03899b] bg-[#fff3c6]',
    tags: [
      { icon: CalendarDays, label: 'Corte por fecha' },
      { icon: FileDown, label: 'Descarga inmediata' },
      { icon: ClipboardList, label: 'Pacientes hospitalizados' },
    ],
  },
}

const TRANSMISIBLE_CARDS = [
  { subtype: 'pfa', title: 'PFA', description: 'Exportacion de pacientes relacionados a paralisis flacida aguda.' },
  { subtype: 'sifilis', title: 'Sifilis', description: 'Exportacion de pacientes con diagnosticos asociados a sifilis.' },
  { subtype: 'sarampion', title: 'Sarampion y Rubeola', description: 'Exportacion del modulo combinado de sarampion y rubeola.' },
  { subtype: 'rubeola', title: 'SRC', description: 'Exportacion de sindrome de rubeola congenita por rango de fechas.' },
]

const CANINA_CODES = [
  'W53.0', 'W53.1', 'W53.2', 'W53.3', 'W53.4', 'W53.5', 'W53.6', 'W53.7', 'W53.8', 'W53.9',
  'W54.0', 'W54.1', 'W54.2', 'W54.3', 'W54.4', 'W54.5', 'W54.6', 'W54.7', 'W54.8', 'W54.9',
  'W55.0', 'W55.1', 'W55.2', 'W55.3', 'W55.4', 'W55.5', 'W55.6', 'W55.7', 'W55.8', 'W55.9',
  'U24.4', 'U60.0', 'U60.1', 'U60.3', 'U60.4', 'U60.5', 'U60.6', 'U60.7', 'U60.88', 'U32.72',
  'U60.21', 'U60.22', 'U60.23', 'U60.41', 'U60.90', 'U60.91', 'U60.92', 'U60.93', 'U60.94', 'W55.91',
]

const ISQX_REFERENCE = [
  ['27130', 'ARTROPLASTIA, REEMPLAZO PROTESICO ACETABULAR Y FEMORAL PROXIMAL, CON O SIN INJERTO AUTOLOGO O ALOINJERTO', '365 dias'],
  ['47480', 'COLECISTECTOMIA O COLECISTOSTOMIA CON EXPLORACION, DRENAJE O EXTRACCION DE CALCULO', '30 dias'],
  ['47562', 'COLECISTECTOMIA LAPAROSCOPICA', '30 dias'],
  ['47563', 'COLECISTECTOMIA LAPAROSCOPICA CON COLANGIOGRAFIA', '30 dias'],
  ['47564', 'COLECISTECTOMIA CON EXPLORACION DE VIAS BILIARES POR LAPAROSCOPIA', '30 dias'],
  ['47570', 'COLECISTOENTEROSTOMIA POR LAPAROSCOPIA', '30 dias'],
  ['47600', 'COLECISTECTOMIA', '30 dias'],
  ['47605', 'COLECISTECTOMIA CON COLANGIOGRAFIA', '30 dias'],
  ['47610', 'COLECISTECTOMIA CON EXPLORACION DE CONDUCTO BILIAR COMUN', '30 dias'],
  ['49505', 'HERNIOPLASTIA CON O SIN HIDROCELECTOMIA, REDUCIBLE', '30 dias'],
  ['49596', 'HERNIOPLASTIA INGUINAL INCARCERADA O ESTRANGULADA', '30 dias'],
  ['49650', 'HERNIOPLASTIA INGUINAL POR LAPAROSCOPIA', '30 dias'],
  ['59400', 'ATENCION OBSTETRICA DE RUTINA INCLUYENDO ATENCION PREPARTO, PARTO VAGINAL Y ATENCION POSPARTO', '30 dias'],
  ['59409', 'PARTO VAGINAL', '30 dias'],
  ['59514', 'CESAREA', '30 dias'],
  ['59516', 'CESAREA MAS LIGADURA DE TROMPAS', '30 dias'],
  ['59525', 'CESAREA MAS HISTERECTOMIA SUBTOTAL O TOTAL', '30 dias'],
]

function today() {
  return new Date().toISOString().slice(0, 10)
}

function routeKey(pathname: string) {
  return pathname.split('/').filter(Boolean).at(-1) ?? 'pacientes-oncologicos'
}

function resolveModule(pathname: string) {
  const key = routeKey(pathname)
  return MODULES[key] ?? MODULES['pacientes-oncologicos']
}

function DateField({
  id,
  label,
  value,
  onChange,
}: {
  id: string
  label: string
  value: string
  onChange: (value: string) => void
}) {
  return (
    <div className="space-y-1">
      <label className="block text-[12px] font-semibold text-text" htmlFor={id}>
        {label}
      </label>
      <Input
        id={id}
        type="date"
        className="h-8 text-[12px]"
        value={value}
        onChange={(event) => onChange(event.target.value)}
      />
    </div>
  )
}

function Hero({ module }: { module: ModuleConfig }) {
  return (
    <section
      className="relative overflow-hidden rounded-md px-5 py-5 text-white shadow-sm"
      style={{ background: module.gradient }}
    >
      <span className="inline-flex rounded-md bg-black/20 px-2 py-1 text-[10px] font-bold uppercase tracking-wide">
        Exportar Registros
      </span>
      <h1 className="mt-3 text-2xl font-bold leading-tight">{module.title}</h1>
      <p className="mt-1 max-w-3xl text-xs font-medium leading-relaxed text-white/95">{module.subtitle}</p>
      <div className="mt-4 flex flex-wrap gap-2">
        {module.tags.map((tag) => {
          const Icon = tag.icon
          return (
            <span key={tag.label} className="inline-flex items-center gap-1.5 rounded-md bg-white/20 px-2.5 py-1.5 text-[11px] font-bold">
              <Icon className="h-3.5 w-3.5" />
              {tag.label}
            </span>
          )
        })}
      </div>
    </section>
  )
}

function ExportCard({
  icon,
  iconClass,
  title,
  description,
  children,
  warning,
  disabled,
  loading,
  onDownload,
  wide = false,
}: {
  icon: ReactNode
  iconClass: string
  title: string
  description: string
  children: ReactNode
  warning?: string
  disabled?: boolean
  loading?: boolean
  onDownload: () => void
  wide?: boolean
}) {
  return (
    <article className={`rounded-md border border-border/50 bg-white p-4 shadow-sm ${wide ? 'mx-auto w-full max-w-5xl' : ''}`}>
      <div className="flex items-start gap-3">
        <div className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-lg ${iconClass}`}>{icon}</div>
        <div className="min-w-0">
          <h2 className="text-sm font-bold text-brand-strong">{title}</h2>
          <p className="mt-0.5 text-[11px] leading-relaxed text-muted">{description}</p>
        </div>
      </div>
      <div className="mt-4 space-y-3">{children}</div>
      {warning ? (
        <div className="mt-3 rounded-md border border-amber-300 bg-amber-50 px-3 py-2 text-[11px] text-amber-800">
          {warning}
        </div>
      ) : null}
      <div className="mt-3 flex justify-end">
        <Button
          size="sm"
          className="h-8 gap-1.5 px-3 text-[11px] font-semibold"
          disabled={disabled || loading}
          onClick={onDownload}
        >
          <Download className="h-3.5 w-3.5" />
          {loading ? 'Generando...' : 'Descargar Excel'}
        </Button>
      </div>
    </article>
  )
}

export function EpidemiologiaReportesPage() {
  const location = useLocation()
  const module = resolveModule(location.pathname)
  const [startDate, setStartDate] = useState(today())
  const [endDate, setEndDate] = useState(today())
  const [singleDate, setSingleDate] = useState(today())
  const [error, setError] = useState<string | null>(null)
  const [downloadingKey, setDownloadingKey] = useState<string | null>(null)
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [authError, setAuthError] = useState<string | null>(null)
  const [isAuthorizing, setIsAuthorizing] = useState(false)
  const [authorizedReport, setAuthorizedReport] = useState<EpidemiologiaReportKey | null>(null)
  const [isAuthDialogOpen, setIsAuthDialogOpen] = useState(false)
  const [pendingDownload, setPendingDownload] = useState<DownloadRequest | null>(null)
  const isRangeValid = useMemo(() => startDate <= endDate, [startDate, endDate])

  const download = async ({
    report = module.key,
    subtype,
    dateMode = 'range',
    key = `${report}-${subtype ?? 'general'}`,
    skipAuth = false,
  }: DownloadRequest) => {
    if (dateMode === 'range' && !isRangeValid) {
      setError('La fecha inicial no puede ser mayor que la fecha final.')
      return
    }

    if (!skipAuth && authorizedReport !== module.key) {
      setPendingDownload({ report, subtype, dateMode, key })
      setAuthError(null)
      setIsAuthDialogOpen(true)
      return
    }

    setError(null)
    setDownloadingKey(key)
    try {
      await downloadEpidemiologiaReporte({
        report,
        subtype,
        fechaInicio: dateMode === 'range' ? startDate : undefined,
        fechaFin: dateMode === 'range' ? endDate : undefined,
        fecha: dateMode === 'single' ? singleDate : undefined,
      })
    } catch (downloadError) {
      setError(downloadError instanceof Error ? downloadError.message : 'No se pudo descargar el archivo.')
    } finally {
      setDownloadingKey(null)
    }
  }

  const handleAuthorize = async () => {
    setAuthError(null)
    setError(null)
    setIsAuthorizing(true)
    try {
      const validation = await validateEpidemiologiaReporteUser(username, password, module.key)
      if (!validation.ok || !validation.employeeId) {
        setAuthError(validation.message || 'No se pudo validar el usuario.')
        return
      }

      setAuthorizedReport(module.key)
      setIsAuthDialogOpen(false)
      const nextDownload = pendingDownload
      setPendingDownload(null)
      if (nextDownload) {
        await download({ ...nextDownload, skipAuth: true })
      }
    } catch (authRequestError) {
      setAuthError(authRequestError instanceof Error ? authRequestError.message : 'No se pudo validar el usuario.')
    } finally {
      setIsAuthorizing(false)
    }
  }

  const commonRangeFields = (
    <div className="grid gap-3 md:grid-cols-2">
      <DateField id="fecha-inicio" label="Desde" value={startDate} onChange={setStartDate} />
      <DateField id="fecha-fin" label="Hasta" value={endDate} onChange={setEndDate} />
    </div>
  )

  return (
    <section className="space-y-4">
      <Hero module={module} />

      {error ? (
        <Alert className="flex items-center gap-2 py-1.5 text-sm">
          <AlertCircle className="h-4 w-4" />
          <span>{error}</span>
        </Alert>
      ) : null}

      {module.key === 'pacientes-oncologicos' ? (
        <ExportCard
          wide
          icon={<FileSpreadsheet className="h-5 w-5" />}
          iconClass={module.accent}
          title="Lista de pacientes con diagnostico oncologico"
          description="Seleccione el rango de fechas para exportar el reporte consolidado."
          warning="La data no es en tiempo real. Se recomienda exportar informacion hasta un dia antes de la fecha actual."
          disabled={!isRangeValid}
          loading={downloadingKey === 'pacientes-oncologicos-general'}
          onDownload={() => void download({ key: 'pacientes-oncologicos-general' })}
        >
          {commonRangeFields}
        </ExportCard>
      ) : null}

      {module.key === 'pfa-sifilis-sarampion' ? (
        <>
          <div className="grid gap-4 xl:grid-cols-4">
            {TRANSMISIBLE_CARDS.map((card) => (
              <ExportCard
                key={card.subtype}
                icon={<ShieldCheck className="h-5 w-5" />}
                iconClass={module.accent}
                title={card.title}
                description={card.description}
                disabled={!isRangeValid}
                loading={downloadingKey === card.subtype}
                onDownload={() => void download({ subtype: card.subtype, key: card.subtype })}
              >
                <DateField id={`desde-${card.subtype}`} label="Fecha desde" value={startDate} onChange={setStartDate} />
                <DateField id={`hasta-${card.subtype}`} label="Fecha hasta" value={endDate} onChange={setEndDate} />
              </ExportCard>
            ))}
          </div>
          <p className="text-[11px] text-muted">La data se encuentra actualizada hasta un dia antes de la fecha actual.</p>
        </>
      ) : null}

      {module.key === 'isqx' ? (
        <>
          <ExportCard
            icon={<Search className="h-5 w-5" />}
            iconClass={module.accent}
            title="Monitoreo de pacientes con reingresos"
            description="Ingrese el dia de monitoreo para obtener los pacientes con reingresos segun su procedimiento realizado."
            warning="El reporte muestra solo pacientes que hayan consumido antibioticos en alguna de sus atenciones. Data disponible desde 2021."
            loading={downloadingKey === 'isqx-reingresos'}
            onDownload={() => void download({ dateMode: 'single', subtype: 'reingresos', key: 'isqx-reingresos' })}
          >
            <DateField id="fecha-monitoreo" label="Dia de monitoreo" value={singleDate} onChange={setSingleDate} />
          </ExportCard>

          <article className="rounded-md border border-border/50 bg-white p-4 shadow-sm">
            <div className="flex items-start gap-3">
              <div className={`flex h-9 w-9 items-center justify-center rounded-lg ${module.accent}`}>
                <ListChecks className="h-5 w-5" />
              </div>
              <div>
                <h2 className="text-sm font-bold text-brand-strong">Monitoreo segun procedimientos y dias de retorno</h2>
                <p className="mt-0.5 text-[11px] text-muted">Referencia de CPT y tiempo de monitoreo utilizado en el modulo.</p>
              </div>
            </div>
            <div className="mt-4 overflow-x-auto">
              <table className="w-full min-w-[900px] border-collapse text-[11px]">
                <thead>
                  <tr className="bg-[#2f5f9f] text-white">
                    <th className="w-24 px-2 py-1.5 text-left font-semibold">CPT</th>
                    <th className="px-2 py-1.5 text-left font-semibold">Procedimientos</th>
                    <th className="w-44 px-2 py-1.5 text-left font-semibold">Tiempo de monitoreo</th>
                  </tr>
                </thead>
                <tbody>
                  {ISQX_REFERENCE.map(([code, procedure, days]) => (
                    <tr key={`${code}-${procedure}`} className="odd:bg-[#f5f9fd] even:bg-white">
                      <td className="border-b border-border/60 px-2 py-1">{code}</td>
                      <td className="border-b border-border/60 px-2 py-1">{procedure}</td>
                      <td className="border-b border-border/60 px-2 py-1">{days}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </article>
        </>
      ) : null}

      {module.key === 'mordedura-canina' ? (
        <div className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_minmax(420px,0.9fr)]">
          <ExportCard
            icon={<FileSpreadsheet className="h-5 w-5" />}
            iconClass={module.accent}
            title="Generar reporte"
            description="Seleccione el rango de fechas para exportar la lista de pacientes identificados."
            warning="El reporte usa diagnosticos relacionados a la enfermedad y trabaja con data en tiempo real."
            disabled={!isRangeValid}
            loading={downloadingKey === 'mordedura-canina-general'}
            onDownload={() => void download({ key: 'mordedura-canina-general' })}
          >
            {commonRangeFields}
          </ExportCard>
          <article className="rounded-md border border-border/50 bg-white p-4 shadow-sm">
            <div className="flex items-start gap-3">
              <div className={`flex h-9 w-9 items-center justify-center rounded-lg ${module.accent}`}>
                <ListChecks className="h-5 w-5" />
              </div>
              <div>
                <h2 className="text-sm font-bold text-brand-strong">Diagnosticos usados</h2>
                <p className="mt-0.5 text-[11px] text-muted">Referencia CIE empleada para identificar los casos asociados.</p>
              </div>
            </div>
            <div className="mt-4 flex flex-wrap gap-2">
              {CANINA_CODES.map((code) => (
                <span key={code} className="rounded-full bg-canvas px-2 py-1 text-[11px] font-semibold text-brand-strong">
                  {code}
                </span>
              ))}
            </div>
          </article>
        </div>
      ) : null}

      {module.key === 'cirugia-procedimiento' ? (
        <ExportCard
          wide
          icon={<FileSpreadsheet className="h-5 w-5" />}
          iconClass={module.accent}
          title="Lista de procedimientos quirurgicos"
          description="Seleccione el periodo que desea exportar para generar el reporte."
          warning="La data no es en tiempo real. Se recomienda exportar informacion hasta un dia despues del dia actual."
          disabled={!isRangeValid}
          loading={downloadingKey === 'cirugia-procedimiento-general'}
          onDownload={() => void download({ key: 'cirugia-procedimiento-general' })}
        >
          {commonRangeFields}
        </ExportCard>
      ) : null}

      {module.key === 'seguimiento-dengue' ? (
        <div className="grid gap-4 xl:grid-cols-2">
          <ExportCard
            icon={<FileSpreadsheet className="h-5 w-5" />}
            iconClass={module.accent}
            title="Generar reporte de DENGUE"
            description="Seleccione la fecha de busqueda para descargar el consolidado de pacientes hospitalizados con dengue."
            loading={downloadingKey === 'dengue-corte'}
            onDownload={() => void download({ dateMode: 'single', key: 'dengue-corte' })}
          >
            <DateField id="fecha-dengue-corte" label="Fecha de busqueda" value={singleDate} onChange={setSingleDate} />
          </ExportCard>
          <ExportCard
            icon={<CalendarDays className="h-5 w-5" />}
            iconClass={module.accent}
            title="Generar reporte dengue por rango"
            description="Seleccione fecha desde y hasta para descargar el consolidado de pacientes hospitalizados con dengue."
            disabled={!isRangeValid}
            loading={downloadingKey === 'dengue-rango'}
            onDownload={() => void download({ dateMode: 'range', key: 'dengue-rango' })}
          >
            {commonRangeFields}
          </ExportCard>
        </div>
      ) : null}

      <div className="border-t border-border/70 pt-3 text-[11px] text-muted">
        Desarrollado por la Unidad de Inteligencia Sanitaria - Area de Estadistica
      </div>

      <Dialog open={isAuthDialogOpen} onOpenChange={setIsAuthDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Permisos para acceder a Reportes Nominales</DialogTitle>
            <DialogDescription>Ingrese NUMERO DE DNI y CONTRASEÑA SISGALEN.</DialogDescription>
          </DialogHeader>
          <div className="space-y-3">
            <div>
              <label className="mb-1 block text-xs font-semibold text-muted" htmlFor="epidemiologia-username">
                NUMERO DE DNI
              </label>
              <Input
                id="epidemiologia-username"
                value={username}
                onChange={(event) => setUsername(event.target.value)}
                className="h-9"
              />
            </div>
            <div>
              <label className="mb-1 block text-xs font-semibold text-muted" htmlFor="epidemiologia-password">
                CONTRASEÑA SISGALEN
              </label>
              <Input
                id="epidemiologia-password"
                type="password"
                value={password}
                onChange={(event) => setPassword(event.target.value)}
                className="h-9"
              />
            </div>
            {authError ? <Alert variant="danger">{authError}</Alert> : null}
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
