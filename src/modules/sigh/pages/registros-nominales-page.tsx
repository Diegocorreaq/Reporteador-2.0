import { useEffect, useMemo, useState } from 'react'
import { Download, ShieldCheck } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { SighPageShell } from '@/modules/sigh/components/sigh-page-shell'
import { SisgalenValidationDialog } from '@/modules/sigh/components/sisgalen-validation-dialog'
import {
  downloadSighExport,
  getSighExportCatalog,
  validateSisgalenUser,
} from '@/modules/sigh/services/sigh-reports.service'

interface ExportItem {
  key: string
  label: string
}

const NOMINAL_EXPORT_ITEMS: ExportItem[] = [
  { key: 'exportaxls_1', label: 'Informe a familia' },
  { key: 'exportaxls_2', label: 'Oxigenoterapia hospitalizacion' },
  { key: 'exportaxls_3', label: 'Oxigenoterapia emergencia/UCI' },
  { key: 'exportaxls_10', label: 'Pacientes hospitalizados corte' },
  { key: 'exportaxls_int_a', label: 'Interconsultas UCI + hospitalizacion' },
  { key: 'exportaxls_int_b', label: 'Interconsultas UCI hospitalizacion' },
  { key: 'exportaxls_int_c', label: 'Interconsultas a diferentes' },
  { key: 'exportaxls_4', label: 'Pacientes hospitalizados programado' },
  { key: 'exportaxls_5', label: 'Pacientes de alta' },
  { key: 'exportaxls_6', label: 'Pacientes fallecidos' },
  { key: 'exportaxls_7', label: 'Camas' },
  { key: 'exportaxls_8', label: 'Familia programado' },
  { key: 'exportaxls_13', label: 'Pacientes hospitalizados con vacunas' },
]

export function RegistrosNominalesPage() {
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [authError, setAuthError] = useState<string | null>(null)
  const [isAuthorizing, setIsAuthorizing] = useState(false)
  const [authorizedUser, setAuthorizedUser] = useState<{ employeeId: number; employeeName: string } | null>(null)
  const [isAuthDialogOpen, setIsAuthDialogOpen] = useState(true)
  const [availableKeys, setAvailableKeys] = useState<Set<string>>(new Set())
  const [downloadKey, setDownloadKey] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    void (async () => {
      try {
        const options = await getSighExportCatalog('current-sigh')
        setAvailableKeys(new Set(options.map((option) => option.key)))
      } catch (catalogError) {
        console.warn('No se pudo cargar el catalogo nominal.', catalogError)
      }
    })()
  }, [])

  const rows = useMemo(
    () =>
      NOMINAL_EXPORT_ITEMS.map((item, index) => ({
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

  const handleDownload = async (key: string, enabled: boolean) => {
    if (!authorizedUser) {
      setError('Debe autorizar un usuario SISGALEN antes de exportar.')
      return
    }
    if (!enabled) {
      setError('Este exporte no esta disponible en el catalogo actual.')
      return
    }

    setError(null)
    setDownloadKey(key)
    try {
      await downloadSighExport({
        catalog: 'current-sigh',
        key,
        employeeId: authorizedUser.employeeId,
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
      description="Exportacion nominal al momento con validacion SISGALEN obligatoria."
      actions={
        <Button size="sm" variant="outline" onClick={() => setIsAuthDialogOpen(true)}>
          <ShieldCheck className="h-4 w-4" />
          {authorizedUser ? 'Cambiar usuario' : 'Validar usuario'}
        </Button>
      }
    >
      <Card className="border-border/70">
        <CardHeader className="border-b border-border/60 pb-3">
          <CardTitle className="text-sm">
            Usuario autorizado:{' '}
            <span className="font-semibold text-brand-strong">{authorizedUser?.employeeName ?? 'No validado'}</span>
          </CardTitle>
        </CardHeader>
        <CardContent className="pt-4">
          <div className="overflow-x-auto rounded-md border border-border/70">
            <table className="min-w-full border-collapse text-[12px]">
              <thead>
                <tr className="bg-[#eef5fb] text-[#123B63]">
                  <th className="border-b border-border px-2 py-1 text-right font-semibold uppercase">Ord</th>
                  <th className="border-b border-border px-2 py-1 text-left font-semibold uppercase">Tipo de reporte</th>
                  <th className="border-b border-border px-2 py-1 text-left font-semibold uppercase">Archivo</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((row) => (
                  <tr key={row.key} className="odd:bg-white even:bg-[#f8fbff]">
                    <td className="border-b border-border/70 px-2 py-1 text-right">{row.order}</td>
                    <td className="border-b border-border/70 px-2 py-1">{row.label}</td>
                    <td className="border-b border-border/70 px-2 py-1">
                      <Button
                        size="sm"
                        variant="ghost"
                        className="h-7 px-2 text-[11px] text-brand-strong hover:text-brand"
                        onClick={() => void handleDownload(row.key, row.enabled)}
                        disabled={!authorizedUser || downloadKey === row.key || !row.enabled}
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
