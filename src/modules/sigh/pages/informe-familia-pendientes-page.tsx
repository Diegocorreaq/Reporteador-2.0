import { useEffect, useState } from 'react'
import { Download, RefreshCcw, ShieldCheck } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Select } from '@/components/ui/select'
import { SighFilterPanel } from '@/modules/sigh/components/sigh-filter-panel'
import { SighPageShell } from '@/modules/sigh/components/sigh-page-shell'
import { SisgalenValidationDialog } from '@/modules/sigh/components/sisgalen-validation-dialog'
import { SighTable, type SighTableColumn } from '@/modules/sigh/components/sigh-table'
import {
  downloadFamiliaPendienteNominal,
  getFamiliaPendienteReport,
  listFamiliaPendienteUpss,
  validateSisgalenUser,
} from '@/modules/sigh/services/sigh-reports.service'
import type { FamiliaPendienteRow, SighOption } from '@/modules/sigh/types'

const FAMILY_COLUMNS: SighTableColumn[] = [
  { key: 'servicioActual', label: 'Servicio actual' },
  { key: 'idCuenta', label: 'IdCuenta', align: 'center' },
  { key: 'paciente', label: 'Paciente' },
  { key: 'fechaIngreso', label: 'Fecha ingreso', align: 'center' },
  { key: 'fechaUltInforme', label: 'Fecha ult informe', align: 'center' },
  { key: 'seInformo', label: 'Se informo', align: 'center' },
  { key: 'diasHosp', label: 'Dias hosp', align: 'center' },
  { key: 'tiempoSinInforme', label: 'Tiempo s/informe', align: 'center' },
  { key: 'fechaCorte', label: 'Fecha corte', align: 'center' },
]

export function InformeFamiliaPendientesPage() {
  const [upssOptions, setUpssOptions] = useState<SighOption[]>([])
  const [selectedUpss, setSelectedUpss] = useState('')
  const [rows, setRows] = useState<FamiliaPendienteRow[]>([])
  const [counters, setCounters] = useState({ over12: 0, over24: 0 })
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [isAuthDialogOpen, setIsAuthDialogOpen] = useState(false)
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [authError, setAuthError] = useState<string | null>(null)
  const [isAuthorizing, setIsAuthorizing] = useState(false)
  const [authorizedUser, setAuthorizedUser] = useState<{ employeeId: number; employeeName: string } | null>(null)
  const [pendingExport, setPendingExport] = useState(false)

  useEffect(() => {
    void (async () => {
      try {
        const options = await listFamiliaPendienteUpss()
        setUpssOptions(options)
      } catch (upssError) {
        console.warn('No se pudo cargar UPSS para familia pendientes.', upssError)
      }
    })()
  }, [])

  const handleFetch = async () => {
    if (!selectedUpss) {
      setError('Seleccione una UPSS para consultar.')
      return
    }

    setError(null)
    setLoading(true)
    try {
      const payload = await getFamiliaPendienteReport(selectedUpss)
      setRows(payload.rows)
      setCounters(payload.counters)
    } catch (fetchError) {
      const message = fetchError instanceof Error ? fetchError.message : 'No se pudo consultar el reporte.'
      setError(message)
    } finally {
      setLoading(false)
    }
  }

  const executeExport = async (employeeId: number) => {
    if (!selectedUpss) {
      setError('Seleccione una UPSS antes de exportar.')
      return
    }

    try {
      await downloadFamiliaPendienteNominal({
        upss: selectedUpss,
        employeeId,
      })
    } catch (exportError) {
      const message = exportError instanceof Error ? exportError.message : 'No se pudo exportar el reporte nominal.'
      setError(message)
    }
  }

  const handleExportClick = () => {
    if (authorizedUser?.employeeId) {
      void executeExport(authorizedUser.employeeId)
      return
    }
    setPendingExport(true)
    setIsAuthDialogOpen(true)
  }

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

      if (pendingExport) {
        setPendingExport(false)
        await executeExport(validation.employeeId)
      }
    } catch (authRequestError) {
      const message = authRequestError instanceof Error ? authRequestError.message : 'No se pudo validar el usuario.'
      setAuthError(message)
    } finally {
      setIsAuthorizing(false)
    }
  }

  return (
    <SighPageShell
      error={error}
      description="Gestion de pacientes sin informe familiar con semaforizacion por tiempo y exportacion nominal."
      actions={
        <>
          <Button size="sm" variant="outline" onClick={() => setIsAuthDialogOpen(true)}>
            <ShieldCheck className="h-4 w-4" />
            {authorizedUser ? 'Usuario validado' : 'Validar usuario'}
          </Button>
          <Button size="sm" variant="outline" onClick={() => void handleExportClick()} disabled={!selectedUpss}>
            <Download className="h-4 w-4" />
            Exportar nominal
          </Button>
        </>
      }
    >
      <SighFilterPanel
        rightSlot={
          <div className="flex flex-wrap gap-4 text-xs">
            <div className="flex items-center gap-2">
              <span className="inline-block h-3 w-3 rounded bg-[#ffe9a7]" />
              <span>Mayor a 12 horas: {counters.over12}</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="inline-block h-3 w-3 rounded bg-[#ffd3d3]" />
              <span>Mayor a 24 horas: {counters.over24}</span>
            </div>
          </div>
        }
      >
        <div className="w-[260px] space-y-1">
          <label className="text-xs font-semibold text-brand-strong" htmlFor="familia-upss-select">
            UPSS
          </label>
          <Select id="familia-upss-select" value={selectedUpss} onChange={(event) => setSelectedUpss(event.target.value)}>
            <option value="">Seleccionar</option>
            {upssOptions.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </Select>
        </div>
        <Button size="sm" variant="outline" onClick={() => void handleFetch()} className="mb-0.5">
          <RefreshCcw className="h-4 w-4" />
          Consultar
        </Button>
      </SighFilterPanel>

      <SighTable
        rows={rows}
        columns={FAMILY_COLUMNS}
        emptyMessage={loading ? 'Consultando reporte...' : 'No se encuentran registros.'}
        rowClassName={(row) => {
          const typedRow = row as FamiliaPendienteRow
          if (typedRow.alertState === 'over24') {
            return '[&>td:nth-child(2)]:bg-[#ffdede] [&>td:nth-child(3)]:bg-[#ffdede]'
          }
          return '[&>td:nth-child(2)]:bg-[#fff4c9] [&>td:nth-child(3)]:bg-[#fff4c9]'
        }}
      />

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
