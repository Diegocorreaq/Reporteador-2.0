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
  order: number
  label: string
  badgeText: string
  badgeTone: 'moment' | 'scheduled'
}

const NOMINAL_EXPORT_ITEMS: ExportItem[] = [
  {
    key: 'exportaxls_10',
    order: 4,
    label: 'REPORTE DIARIO DE PACIENTES HOSPITALIZADOS',
    badgeText: 'Cortes del momento',
    badgeTone: 'moment',
  },
  {
    key: 'exportaxls_4',
    order: 8,
    label: 'REPORTE DIARIO DE PACIENTES HOSPITALIZADOS',
    badgeText: 'Corte Programados 07:00 AM y 07:00 PM',
    badgeTone: 'scheduled',
  },
  {
    key: 'exportaxls_5',
    order: 9,
    label: 'REPORTE DIARIO DE PACIENTES DE ALTA',
    badgeText: 'Corte Programados 07:00 AM y 07:00 PM',
    badgeTone: 'scheduled',
  },
  {
    key: 'exportaxls_6',
    order: 10,
    label: 'REPORTE DIARIO DE PACIENTES FALLECIDOS',
    badgeText: 'Corte Programados 07:00 AM y 07:00 PM',
    badgeTone: 'scheduled',
  },
  {
    key: 'exportaxls_7',
    order: 11,
    label: 'REPORTE DIARIO DE CAMAS',
    badgeText: 'Corte Programados 07:00 AM y 07:00 PM',
    badgeTone: 'scheduled',
  },
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
      NOMINAL_EXPORT_ITEMS.map((item) => ({
        ...item,
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
          <div className="flex flex-wrap items-center justify-between gap-2">
            <CardTitle className="text-sm">
              Usuario autorizado:{' '}
              <span className="font-semibold text-brand-strong">{authorizedUser?.employeeName ?? 'No validado'}</span>
            </CardTitle>
            <p className="text-[11px] text-muted">Exportación nominal al momento — requiere validación SISGALEN</p>
          </div>
        </CardHeader>
        <CardContent className="pt-4">
          <div className="overflow-x-auto rounded-md border border-border/70">
            <table className="min-w-[700px] border-collapse text-[12px]">
              <thead>
                <tr className="bg-[#123B63] text-white">
                  <th className="w-10 border-b border-white/15 px-2 py-1.5 text-right text-[11px] font-semibold uppercase tracking-wide">Ord</th>
                  <th className="border-b border-white/15 px-2 py-1.5 text-left text-[11px] font-semibold uppercase tracking-wide">Tipo de Reporte</th>
                  <th className="w-28 border-b border-white/15 px-2 py-1.5 text-center text-[11px] font-semibold uppercase tracking-wide">Archivo</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((row) => (
                  <tr key={row.key} className="odd:bg-white even:bg-[#f8fbff]">
                    <td className="border-b border-border/70 px-2 py-1 text-right align-middle">{row.order}</td>
                    <td className="border-b border-border/70 px-2 py-1 align-middle font-medium text-[#123B63]">
                      <div className="flex flex-wrap items-center gap-1.5">
                        <span>{row.label}</span>
                        <span
                          className="inline-flex rounded px-1.5 py-0.5 text-[10px] font-semibold leading-none text-white"
                          style={row.badgeTone === 'moment' ? { backgroundColor: '#58B35E' } : { backgroundColor: '#69BCD7' }}
                        >
                          {row.badgeText}
                        </span>
                      </div>
                    </td>
                    <td className="border-b border-border/70 px-2 py-1 align-middle">
                      <Button
                        size="sm"
                        className="h-7 gap-1.5 px-3 text-[11px] font-semibold"
                        style={row.enabled && authorizedUser ? { backgroundColor: '#005F8F', color: '#fff' } : undefined}
                        variant={row.enabled && authorizedUser ? 'default' : 'outline'}
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

