import { useCallback, useEffect, useMemo, useState } from 'react'
import { AlertCircle, Download, Edit, Plus, Search, ShieldCheck, Trash2 } from 'lucide-react'
import { EmptyState } from '@/components/feedback/empty-state'
import { LoadingState } from '@/components/feedback/loading-state'
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
import { Select } from '@/components/ui/select'
import { workspaceMeta } from '@/config/module-registry'
import { useActiveNavigationItem } from '@/hooks/use-active-navigation-item'
import {
  anularLavadoRegistro,
  buildDefaultLavadoFilters,
  createLavadoRegistro,
  exportLavadoRegistros,
  fetchLavadoActividades,
  fetchLavadoRegistroById,
  fetchLavadoRegistros,
  searchLavadoEmpleados,
  updateLavadoRegistro,
  validateLavadoUser,
} from '@/modules/lavado-manos/services/lavado-manos.service'
import type {
  LavadoActividad,
  LavadoEmpleado,
  LavadoFilters,
  LavadoItemPayload,
  LavadoRegistroListItem,
  LavadoRegistroPayload,
} from '@/modules/lavado-manos/types'

const FORMATO_OPTIONS = [
  { value: 1, label: 'Tecnica de agua y jabon' },
  { value: 2, label: 'Tecnica de solucion alcoholica' },
  { value: 3, label: '5 momentos de higiene' },
]

interface FormState {
  id: number | null
  empleadoQuery: string
  empleadoId: number
  empleado: string
  upss: string
  servicio: string
  fechaRegistro: string
  tiempo: string
  observacion: string
  tipo: number
  values: Record<number, LavadoItemPayload>
}

function buildDefaultFormState(tipo = 1): FormState {
  return {
    id: null,
    empleadoQuery: '',
    empleadoId: 0,
    empleado: '',
    upss: '',
    servicio: '',
    fechaRegistro: new Date().toISOString().slice(0, 10),
    tiempo: '',
    observacion: '',
    tipo,
    values: {},
  }
}

function toNumber(value: unknown) {
  const parsed = Number(value)
  return Number.isFinite(parsed) ? parsed : 0
}

function buildPayloadFromForm(form: FormState, actividades: LavadoActividad[]): LavadoRegistroPayload {
  const items = actividades.map((actividad) => {
    const current = form.values[actividad.idactividad] ?? { idActividad: actividad.idactividad, valor: 0 }

    return {
      idActividad: actividad.idactividad,
      valor: current.valor ?? 0,
      omision: current.omision ?? 0,
      lavado: current.lavado ?? 0,
      friccion: current.friccion ?? 0,
      guantes: current.guantes ?? 0,
    }
  })

  return {
    empleadoId: form.empleadoId,
    fechaRegistro: form.fechaRegistro,
    tipo: form.tipo,
    upss: form.upss,
    servicio: form.servicio,
    tiempo: form.tiempo,
    observacion: form.observacion,
    items,
  }
}

export function LavadoManosPage() {
  const { item } = useActiveNavigationItem()
  const [filters, setFilters] = useState<LavadoFilters>(buildDefaultLavadoFilters())
  const [rows, setRows] = useState<LavadoRegistroListItem[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [isExporting, setIsExporting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [authError, setAuthError] = useState<string | null>(null)
  const [isAuthorizing, setIsAuthorizing] = useState(false)
  const [authorizedUser, setAuthorizedUser] = useState<{ employeeId: number; employeeName: string } | null>(null)
  const [isAuthDialogOpen, setIsAuthDialogOpen] = useState(true)
  const [isFormDialogOpen, setIsFormDialogOpen] = useState(false)
  const [form, setForm] = useState<FormState>(buildDefaultFormState())
  const [actividades, setActividades] = useState<LavadoActividad[]>([])
  const [isSaving, setIsSaving] = useState(false)
  const [employeeOptions, setEmployeeOptions] = useState<LavadoEmpleado[]>([])
  const [isSearchingEmployee, setIsSearchingEmployee] = useState(false)

  const isRangeValid = filters.fechaInicio <= filters.fechaFin

  const loadRows = useCallback(async () => {
    if (!isRangeValid) {
      setError('La fecha inicio no puede ser mayor que la fecha fin.')
      return
    }

    setError(null)
    setIsLoading(true)
    try {
      const data = await fetchLavadoRegistros(filters)
      setRows(data)
    } catch (loadError) {
      const message = loadError instanceof Error ? loadError.message : 'No se pudo cargar el listado de lavado.'
      setError(message)
    } finally {
      setIsLoading(false)
    }
  }, [filters, isRangeValid])

  useEffect(() => {
    void loadRows()
  }, [loadRows])

  useEffect(() => {
    void (async () => {
      try {
        const data = await fetchLavadoActividades(form.tipo)
        setActividades(data)
      } catch (activityError) {
        console.warn('No se pudo cargar actividades de lavado.', activityError)
        setActividades([])
      }
    })()
  }, [form.tipo])

  const handleAuthorize = async () => {
    setAuthError(null)
    setIsAuthorizing(true)
    try {
      const validation = await validateLavadoUser(username, password)
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

  const handleSearchEmployees = async () => {
    const query = form.empleadoQuery.trim()
    if (query.length < 2) {
      return
    }

    setIsSearchingEmployee(true)
    try {
      const options = await searchLavadoEmpleados(query)
      setEmployeeOptions(options)
    } catch (searchError) {
      console.warn('No se pudo buscar empleados.', searchError)
      setEmployeeOptions([])
    } finally {
      setIsSearchingEmployee(false)
    }
  }

  const handleOpenCreate = () => {
    setForm(buildDefaultFormState(form.tipo || 1))
    setEmployeeOptions([])
    setIsFormDialogOpen(true)
  }

  const handleOpenEdit = async (id: number) => {
    try {
      const detail = await fetchLavadoRegistroById(id)
      const detailValues = detail.detalle.reduce<Record<number, LavadoItemPayload>>((accumulator, item) => {
        accumulator[toNumber(item.idactividad)] = {
          idActividad: toNumber(item.idactividad),
          valor: toNumber(item.valoractividad),
          omision: toNumber(item.omision),
          lavado: toNumber(item.lavado),
          friccion: toNumber(item.friccion),
          guantes: toNumber(item.guantes),
        }
        return accumulator
      }, {})

      setForm({
        id,
        empleadoQuery: detail.registro.empleado,
        empleadoId: toNumber(detail.registro.idempleado),
        empleado: detail.registro.empleado,
        upss: detail.registro.upss,
        servicio: detail.registro.servicio,
        fechaRegistro: String(detail.registro.fecha).slice(0, 10),
        tiempo: detail.registro.tiempo || '',
        observacion: detail.registro.observacion || '',
        tipo: toNumber(detail.registro.tipo) || 1,
        values: detailValues,
      })
      setEmployeeOptions([])
      setIsFormDialogOpen(true)
    } catch (editError) {
      const message = editError instanceof Error ? editError.message : 'No se pudo cargar el registro.'
      setError(message)
    }
  }

  const handleSave = async () => {
    if (!authorizedUser) {
      setError('Debe validar autorizacion para registrar cambios.')
      return
    }

    if (!form.empleadoId) {
      setError('Debe seleccionar un empleado.')
      return
    }

    setError(null)
    setIsSaving(true)
    try {
      const payload = buildPayloadFromForm(form, actividades)
      if (form.id) {
        await updateLavadoRegistro(form.id, payload)
      } else {
        await createLavadoRegistro(payload)
      }

      setIsFormDialogOpen(false)
      await loadRows()
    } catch (saveError) {
      const message = saveError instanceof Error ? saveError.message : 'No se pudo guardar el registro.'
      setError(message)
    } finally {
      setIsSaving(false)
    }
  }

  const handleAnular = async (id: number) => {
    if (!authorizedUser) {
      setError('Debe validar autorizacion para anular registros.')
      return
    }

    const confirm = window.confirm(`Esta seguro de anular el registro ${id}?`)
    if (!confirm) {
      return
    }

    setError(null)
    try {
      const result = await anularLavadoRegistro(id)
      if (result.estado !== 1) {
        setError(result.mensaje)
        return
      }

      await loadRows()
    } catch (cancelError) {
      const message = cancelError instanceof Error ? cancelError.message : 'No se pudo anular el registro.'
      setError(message)
    }
  }

  const handleExport = async () => {
    if (!isRangeValid) {
      setError('El rango de fechas para exportar no es valido.')
      return
    }

    setIsExporting(true)
    setError(null)
    try {
      await exportLavadoRegistros({
        fechaInicio: filters.fechaInicio,
        fechaFin: filters.fechaFin,
      })
    } catch (exportError) {
      const message = exportError instanceof Error ? exportError.message : 'No se pudo exportar el listado.'
      setError(message)
    } finally {
      setIsExporting(false)
    }
  }

  const resolvedTitle = useMemo(
    () => item?.label ?? 'Lavado de Manos',
    [item?.label],
  )

  return (
    <section className="space-y-4">
      <PageHeader
        eyebrow={workspaceMeta.main.shortLabel}
        title={resolvedTitle}
        description="Modulo operativo de monitoreo, evaluacion y registro de lavado de manos."
        actions={
          <div className="flex gap-2">
            <Button variant="outline" onClick={() => setIsAuthDialogOpen(true)}>
              <ShieldCheck className="h-4 w-4" />
              Autorizacion
            </Button>
            <Button onClick={handleOpenCreate} disabled={!authorizedUser}>
              <Plus className="h-4 w-4" />
              Nuevo registro
            </Button>
          </div>
        }
      />

      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base">Filtros de busqueda</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            <div>
              <label className="mb-1 block text-xs font-semibold text-muted" htmlFor="lavado-inicio">
                Fecha inicio
              </label>
              <Input
                id="lavado-inicio"
                type="date"
                value={filters.fechaInicio}
                onChange={(event) => setFilters((current) => ({ ...current, fechaInicio: event.target.value }))}
              />
            </div>
            <div>
              <label className="mb-1 block text-xs font-semibold text-muted" htmlFor="lavado-fin">
                Fecha fin
              </label>
              <Input
                id="lavado-fin"
                type="date"
                value={filters.fechaFin}
                onChange={(event) => setFilters((current) => ({ ...current, fechaFin: event.target.value }))}
              />
            </div>
            <div>
              <label className="mb-1 block text-xs font-semibold text-muted" htmlFor="lavado-tipo">
                Tipo de formato
              </label>
              <Select
                id="lavado-tipo"
                value={String(filters.tipo)}
                onChange={(event) => setFilters((current) => ({ ...current, tipo: Number(event.target.value) }))}
              >
                <option value="0">Todos</option>
                {FORMATO_OPTIONS.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </Select>
            </div>
            <div className="flex items-end gap-2">
              <Button className="w-full" onClick={() => void loadRows()} disabled={isLoading}>
                <Search className="h-4 w-4" />
                Procesar
              </Button>
              <Button variant="outline" onClick={() => void handleExport()} disabled={isExporting}>
                <Download className="h-4 w-4" />
              </Button>
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
            <EmptyState title="Sin autorizacion" description="Valide un usuario para habilitar operaciones." />
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
          <CardTitle className="text-base">Listado de registros</CardTitle>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <LoadingState />
          ) : rows.length ? (
            <div className="overflow-x-auto">
              <table className="min-w-full border-collapse text-sm">
                <thead>
                  <tr className="bg-canvas">
                    <th className="border-b border-border px-3 py-2 text-left text-xs font-semibold uppercase text-muted">ID</th>
                    <th className="border-b border-border px-3 py-2 text-left text-xs font-semibold uppercase text-muted">Empleado</th>
                    <th className="border-b border-border px-3 py-2 text-left text-xs font-semibold uppercase text-muted">Cargo</th>
                    <th className="border-b border-border px-3 py-2 text-left text-xs font-semibold uppercase text-muted">UPSS</th>
                    <th className="border-b border-border px-3 py-2 text-left text-xs font-semibold uppercase text-muted">Servicio</th>
                    <th className="border-b border-border px-3 py-2 text-left text-xs font-semibold uppercase text-muted">Fecha</th>
                    <th className="border-b border-border px-3 py-2 text-left text-xs font-semibold uppercase text-muted">Estado</th>
                    <th className="border-b border-border px-3 py-2 text-left text-xs font-semibold uppercase text-muted">Acciones</th>
                  </tr>
                </thead>
                <tbody>
                  {rows.map((row) => (
                    <tr key={row.idregistro} className="odd:bg-white even:bg-canvas/40">
                      <td className="border-b border-border px-3 py-2">{row.idregistro}</td>
                      <td className="border-b border-border px-3 py-2">{row.empleado}</td>
                      <td className="border-b border-border px-3 py-2">{row.tipoempleado}</td>
                      <td className="border-b border-border px-3 py-2">{row.upss}</td>
                      <td className="border-b border-border px-3 py-2">{row.servicio}</td>
                      <td className="border-b border-border px-3 py-2">{String(row.fecha).slice(0, 10)}</td>
                      <td className="border-b border-border px-3 py-2">{row.estado}</td>
                      <td className="border-b border-border px-3 py-2">
                        <div className="flex gap-2">
                          <Button size="sm" variant="outline" onClick={() => void handleOpenEdit(row.idregistro)} disabled={!authorizedUser}>
                            <Edit className="h-4 w-4" />
                          </Button>
                          <Button size="sm" variant="outline" onClick={() => void handleAnular(row.idregistro)} disabled={!authorizedUser || row.estado === 'Anulado'}>
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <EmptyState title="Sin registros" description="No se encontraron registros para los filtros seleccionados." />
          )}
        </CardContent>
      </Card>

      <Dialog open={isAuthDialogOpen} onOpenChange={setIsAuthDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Autorizacion inicial</DialogTitle>
            <DialogDescription>Ingrese usuario y clave autorizados para lavado de manos.</DialogDescription>
          </DialogHeader>
          <div className="space-y-3">
            <div>
              <label className="mb-1 block text-xs font-semibold text-muted" htmlFor="lavado-username">
                Usuario
              </label>
              <Input id="lavado-username" value={username} onChange={(event) => setUsername(event.target.value)} />
            </div>
            <div>
              <label className="mb-1 block text-xs font-semibold text-muted" htmlFor="lavado-password">
                Clave
              </label>
              <Input
                id="lavado-password"
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

      <Dialog open={isFormDialogOpen} onOpenChange={setIsFormDialogOpen}>
        <DialogContent className="w-[min(96vw,1080px)]">
          <DialogHeader>
            <DialogTitle>{form.id ? 'Editar registro' : 'Nuevo registro'}</DialogTitle>
            <DialogDescription>Complete los datos de cabecera y detalle del formato seleccionado.</DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              <div>
                <label className="mb-1 block text-xs font-semibold text-muted" htmlFor="form-empleado">
                  Empleado
                </label>
                <div className="flex gap-2">
                  <Input
                    id="form-empleado"
                    value={form.empleadoQuery}
                    onChange={(event) => setForm((current) => ({ ...current, empleadoQuery: event.target.value }))}
                    placeholder="Buscar por nombre"
                  />
                  <Button variant="outline" onClick={() => void handleSearchEmployees()} disabled={isSearchingEmployee}>
                    <Search className="h-4 w-4" />
                  </Button>
                </div>
                {employeeOptions.length ? (
                  <div className="mt-2 max-h-36 overflow-auto rounded-md border border-border">
                    {employeeOptions.map((employee) => (
                      <button
                        key={`${employee.idempleado}-${employee.dni}`}
                        type="button"
                        className="flex w-full items-start justify-between border-b border-border px-2 py-1.5 text-left text-xs last:border-b-0 hover:bg-canvas"
                        onClick={() =>
                          setForm((current) => ({
                            ...current,
                            empleadoQuery: employee.empleado,
                            empleado: employee.empleado,
                            empleadoId: toNumber(employee.idempleado),
                            upss: employee.upss,
                            servicio: employee.servicio,
                          }))
                        }
                      >
                        <span>{employee.empleado}</span>
                        <span className="text-muted">{employee.tipoempleado}</span>
                      </button>
                    ))}
                  </div>
                ) : null}
              </div>

              <div>
                <label className="mb-1 block text-xs font-semibold text-muted" htmlFor="form-tipo">
                  Formato
                </label>
                <Select
                  id="form-tipo"
                  value={String(form.tipo)}
                  onChange={(event) => setForm((current) => ({ ...current, tipo: Number(event.target.value), values: {} }))}
                >
                  {FORMATO_OPTIONS.map((option) => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </Select>
              </div>

              <div>
                <label className="mb-1 block text-xs font-semibold text-muted" htmlFor="form-fecha">
                  Fecha registro
                </label>
                <Input
                  id="form-fecha"
                  type="date"
                  value={form.fechaRegistro}
                  onChange={(event) => setForm((current) => ({ ...current, fechaRegistro: event.target.value }))}
                />
              </div>

              <div>
                <label className="mb-1 block text-xs font-semibold text-muted" htmlFor="form-upss">
                  UPSS
                </label>
                <Input id="form-upss" value={form.upss} onChange={(event) => setForm((current) => ({ ...current, upss: event.target.value }))} />
              </div>

              <div>
                <label className="mb-1 block text-xs font-semibold text-muted" htmlFor="form-servicio">
                  Servicio
                </label>
                <Input
                  id="form-servicio"
                  value={form.servicio}
                  onChange={(event) => setForm((current) => ({ ...current, servicio: event.target.value }))}
                />
              </div>

              <div>
                <label className="mb-1 block text-xs font-semibold text-muted" htmlFor="form-tiempo">
                  Tiempo
                </label>
                <Input
                  id="form-tiempo"
                  value={form.tiempo}
                  onChange={(event) => setForm((current) => ({ ...current, tiempo: event.target.value }))}
                  placeholder="Minutos"
                />
              </div>
            </div>

            <div>
              <label className="mb-1 block text-xs font-semibold text-muted" htmlFor="form-observacion">
                Observacion
              </label>
              <Input
                id="form-observacion"
                value={form.observacion}
                onChange={(event) => setForm((current) => ({ ...current, observacion: event.target.value }))}
                placeholder="Observaciones del registro"
              />
            </div>

            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-base">Actividades del formato</CardTitle>
              </CardHeader>
              <CardContent>
                {actividades.length ? (
                  <div className="space-y-2">
                    {actividades.map((actividad) => {
                      const current = form.values[actividad.idactividad] ?? {
                        idActividad: actividad.idactividad,
                        valor: 0,
                        omision: 0,
                        lavado: 0,
                        friccion: 0,
                        guantes: 0,
                      }

                      return (
                        <div key={actividad.idactividad} className="rounded-md border border-border p-3">
                          <div className="mb-2 flex items-center justify-between">
                            <p className="text-sm font-medium text-text">
                              {actividad.idactividad} - {actividad.actividad}
                            </p>
                            <label className="inline-flex items-center gap-2 text-xs text-muted">
                              <input
                                type="checkbox"
                                checked={Boolean(current.valor)}
                                onChange={(event) =>
                                  setForm((previous) => ({
                                    ...previous,
                                    values: {
                                      ...previous.values,
                                      [actividad.idactividad]: {
                                        ...current,
                                        valor: event.target.checked ? 1 : 0,
                                      },
                                    },
                                  }))
                                }
                              />
                              Cumple
                            </label>
                          </div>

                          {form.tipo === 3 ? (
                            <div className="grid gap-2 sm:grid-cols-4">
                              <label className="inline-flex items-center gap-2 text-xs text-muted">
                                <input
                                  type="radio"
                                  name={`momento-${actividad.idactividad}`}
                                  checked={Boolean(current.omision)}
                                  onChange={() =>
                                    setForm((previous) => ({
                                      ...previous,
                                      values: {
                                        ...previous.values,
                                        [actividad.idactividad]: {
                                          ...current,
                                          valor: 1,
                                          omision: 1,
                                          lavado: 0,
                                          friccion: 0,
                                        },
                                      },
                                    }))
                                  }
                                />
                                Omision
                              </label>
                              <label className="inline-flex items-center gap-2 text-xs text-muted">
                                <input
                                  type="radio"
                                  name={`momento-${actividad.idactividad}`}
                                  checked={Boolean(current.lavado)}
                                  onChange={() =>
                                    setForm((previous) => ({
                                      ...previous,
                                      values: {
                                        ...previous.values,
                                        [actividad.idactividad]: {
                                          ...current,
                                          valor: 1,
                                          omision: 0,
                                          lavado: 1,
                                          friccion: 0,
                                        },
                                      },
                                    }))
                                  }
                                />
                                Lavado
                              </label>
                              <label className="inline-flex items-center gap-2 text-xs text-muted">
                                <input
                                  type="radio"
                                  name={`momento-${actividad.idactividad}`}
                                  checked={Boolean(current.friccion)}
                                  onChange={() =>
                                    setForm((previous) => ({
                                      ...previous,
                                      values: {
                                        ...previous.values,
                                        [actividad.idactividad]: {
                                          ...current,
                                          valor: 1,
                                          omision: 0,
                                          lavado: 0,
                                          friccion: 1,
                                        },
                                      },
                                    }))
                                  }
                                />
                                Friccion
                              </label>
                              <label className="inline-flex items-center gap-2 text-xs text-muted">
                                <input
                                  type="checkbox"
                                  checked={Boolean(current.guantes)}
                                  onChange={(event) =>
                                    setForm((previous) => ({
                                      ...previous,
                                      values: {
                                        ...previous.values,
                                        [actividad.idactividad]: {
                                          ...current,
                                          guantes: event.target.checked ? 1 : 0,
                                        },
                                      },
                                    }))
                                  }
                                />
                                Guantes
                              </label>
                            </div>
                          ) : null}
                        </div>
                      )
                    })}
                  </div>
                ) : (
                  <EmptyState title="Sin actividades" description="No se encontraron actividades para el formato seleccionado." />
                )}
              </CardContent>
            </Card>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setIsFormDialogOpen(false)}>
              Cancelar
            </Button>
            <Button onClick={() => void handleSave()} disabled={isSaving}>
              {isSaving ? 'Guardando...' : form.id ? 'Actualizar registro' : 'Guardar registro'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </section>
  )
}
