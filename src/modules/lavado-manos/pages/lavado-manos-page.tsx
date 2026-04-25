import { useEffect, useMemo, useState } from 'react'
import { Download, Droplets, Edit, ListChecks, Search, ShieldCheck, Trash2 } from 'lucide-react'
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
import { useShellUiStore } from '@/stores/use-shell-ui-store'
import {
  anularLavadoRegistro,
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
  {
    value: 1,
    filterLabel: 'TECNICA DE AGUA Y JABON',
    actionLabel: 'Agua y Jabon',
    dialogTitle: 'Higiene de Manos: Tecnica de Agua y Jabon',
  },
  {
    value: 2,
    filterLabel: 'TECNICA DE SOLUCION ALCOHOLICA',
    actionLabel: 'Solucion Alcoholica',
    dialogTitle: 'Desinfeccion de Manos con: Solucion Alcoholica',
  },
  {
    value: 3,
    filterLabel: '05 MOMENTOS DE LAVADO DE MANO',
    actionLabel: '5 Momentos de Higiene',
    dialogTitle: 'Los 05 Momentos para la Higiene de las Manos',
  },
] as const

interface FormState {
  id: number | null
  empleadoQuery: string
  empleadoId: number
  empleado: string
  tipoEmpleado: string
  upss: string
  servicio: string
  fechaRegistro: string
  tiempo: string
  observacion: string
  tipo: number
  values: Record<number, LavadoItemPayload>
}

function buildDefaultFilters(): LavadoFilters {
  const today = new Date().toISOString().slice(0, 10)
  return {
    fechaInicio: today,
    fechaFin: today,
    tipo: 1,
  }
}

function buildDefaultFormState(tipo = 1): FormState {
  return {
    id: null,
    empleadoQuery: '',
    empleadoId: 0,
    empleado: '',
    tipoEmpleado: '',
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

function getFormatoTitle(tipo: number) {
  return (
    FORMATO_OPTIONS.find((option) => option.value === tipo)?.dialogTitle ??
    'Registro de Lavado de Manos'
  )
}

function getTiempoLabel(tipo: number) {
  if (tipo === 2) return 'Tiempo 20-30 Seg'
  if (tipo === 1) return 'Tiempo 40-60 Seg'
  return 'Tiempo'
}

function normalizeInputDate(rawValue: string) {
  const value = String(rawValue ?? '').trim()
  if (!value) return new Date().toISOString().slice(0, 10)

  if (/^\d{4}-\d{2}-\d{2}/.test(value)) {
    return value.slice(0, 10)
  }

  if (/^\d{2}\/\d{2}\/\d{4}$/.test(value)) {
    const [day, month, year] = value.split('/')
    return `${year}-${month}-${day}`
  }

  return new Date().toISOString().slice(0, 10)
}

function formatDisplayDate(rawValue: string) {
  const value = String(rawValue ?? '').trim()
  if (!value) return '-'
  if (/^\d{2}\/\d{2}\/\d{4}/.test(value)) return value.slice(0, 10)
  if (/^\d{4}-\d{2}-\d{2}/.test(value)) {
    const [year, month, day] = value.slice(0, 10).split('-')
    return `${day}/${month}/${year}`
  }
  return value.slice(0, 10)
}

function buildDefaultItemValue(idActividad: number, tipo: number, isEdit = false): LavadoItemPayload {
  return {
    idActividad,
    valor: isEdit ? 0 : tipo === 3 ? 0 : 1,
    omision: 0,
    lavado: 0,
    friccion: 0,
    guantes: 0,
  }
}

function buildPayloadFromForm(form: FormState, actividades: LavadoActividad[]): LavadoRegistroPayload {
  const items = actividades.map((actividad) => {
    const current =
      form.values[actividad.idactividad] ??
      buildDefaultItemValue(actividad.idactividad, form.tipo, Boolean(form.id))

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
  const setSidebarCollapsed = useShellUiStore((state) => state.setSidebarCollapsed)
  const sidebarCollapsed = useShellUiStore((state) => state.sidebarCollapsed)

  const [filters, setFilters] = useState<LavadoFilters>(buildDefaultFilters())
  const [rows, setRows] = useState<LavadoRegistroListItem[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [isExporting, setIsExporting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [authError, setAuthError] = useState<string | null>(null)
  const [isAuthorizing, setIsAuthorizing] = useState(false)
  const [authorizedUser, setAuthorizedUser] = useState<{
    employeeId: number
    employeeName: string
  } | null>(null)
  const [isAuthDialogOpen, setIsAuthDialogOpen] = useState(true)
  const [isFormDialogOpen, setIsFormDialogOpen] = useState(false)
  const [form, setForm] = useState<FormState>(buildDefaultFormState())
  const [actividades, setActividades] = useState<LavadoActividad[]>([])
  const [isSaving, setIsSaving] = useState(false)
  const [employeeOptions, setEmployeeOptions] = useState<LavadoEmpleado[]>([])
  const [isSearchingEmployee, setIsSearchingEmployee] = useState(false)
  const [hasLoaded, setHasLoaded] = useState(false)

  const isRangeValid = useMemo(
    () => filters.fechaInicio <= filters.fechaFin,
    [filters.fechaInicio, filters.fechaFin],
  )

  useEffect(() => {
    setSidebarCollapsed(true)
  }, [setSidebarCollapsed])

  useEffect(() => {
    if (!isFormDialogOpen) return

    let cancelled = false
    void (async () => {
      try {
        const data = await fetchLavadoActividades(form.tipo)
        if (cancelled) return

        setActividades(data)
        setForm((current) => {
          const nextValues: Record<number, LavadoItemPayload> = {}
          data.forEach((actividad) => {
            nextValues[actividad.idactividad] =
              current.values[actividad.idactividad] ??
              buildDefaultItemValue(actividad.idactividad, current.tipo, Boolean(current.id))
          })

          return {
            ...current,
            values: nextValues,
          }
        })
      } catch (activityError) {
        if (cancelled) return
        console.warn('No se pudo cargar actividades de lavado.', activityError)
        setActividades([])
      }
    })()

    return () => {
      cancelled = true
    }
  }, [form.tipo, isFormDialogOpen])

  useEffect(() => {
    if (!isFormDialogOpen) return

    const query = form.empleadoQuery.trim()
    if (
      form.empleadoId > 0 ||
      query.length < 2 ||
      query === form.empleado ||
      query === String(form.empleadoId)
    ) {
      setEmployeeOptions([])
      return
    }

    const timer = window.setTimeout(async () => {
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
    }, 280)

    return () => {
      window.clearTimeout(timer)
    }
  }, [form.empleado, form.empleadoId, form.empleadoQuery, isFormDialogOpen])

  const loadRows = async (nextFilters = filters) => {
    if (nextFilters.fechaInicio > nextFilters.fechaFin) {
      setError('La fecha inicio no puede ser mayor que la fecha fin.')
      return
    }

    setError(null)
    setIsLoading(true)
    setHasLoaded(true)
    try {
      const data = await fetchLavadoRegistros(nextFilters)
      setRows(data)
    } catch (loadError) {
      const message =
        loadError instanceof Error
          ? loadError.message
          : 'No se pudo cargar el listado de lavado.'
      setError(message)
      setRows([])
    } finally {
      setIsLoading(false)
    }
  }

  const handleAuthorize = async () => {
    setAuthError(null)
    setError(null)
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
      await loadRows()
    } catch (authRequestError) {
      const message =
        authRequestError instanceof Error
          ? authRequestError.message
          : 'No se pudo validar el usuario.'
      setAuthError(message)
    } finally {
      setIsAuthorizing(false)
    }
  }

  const handleSelectEmployee = (employee: LavadoEmpleado) => {
    setForm((current) => ({
      ...current,
      empleadoQuery: employee.dni || employee.unido || employee.empleado,
      empleadoId: toNumber(employee.idempleado),
      empleado: employee.empleado,
      tipoEmpleado: employee.tipoempleado,
      upss: employee.upss,
      servicio: employee.servicio,
    }))
    setEmployeeOptions([])
  }

  const openCreateDialog = (tipo: number) => {
    setError(null)
    setEmployeeOptions([])
    setForm(buildDefaultFormState(tipo))
    setIsFormDialogOpen(true)
  }

  const handleOpenEdit = async (id: number) => {
    setError(null)
    try {
      const detail = await fetchLavadoRegistroById(id)
      const detailValues = detail.detalle.reduce<Record<number, LavadoItemPayload>>(
        (accumulator, detailItem) => {
          accumulator[toNumber(detailItem.idactividad)] = {
            idActividad: toNumber(detailItem.idactividad),
            valor: toNumber(detailItem.valoractividad),
            omision: toNumber(detailItem.omision),
            lavado: toNumber(detailItem.lavado),
            friccion: toNumber(detailItem.friccion),
            guantes: toNumber(detailItem.guantes),
          }
          return accumulator
        },
        {},
      )

      setForm({
        id,
        empleadoQuery: String(detail.registro.nro_documento || detail.registro.empleado || ''),
        empleadoId: toNumber(detail.registro.idempleado),
        empleado: detail.registro.empleado || '',
        tipoEmpleado: detail.registro.nombre_cargo || '',
        upss: detail.registro.upss || '',
        servicio: detail.registro.servicio || '',
        fechaRegistro: normalizeInputDate(String(detail.registro.fecha || '')),
        tiempo: detail.registro.tiempo || '',
        observacion: detail.registro.observacion || '',
        tipo: toNumber(detail.registro.tipo) || 1,
        values: detailValues,
      })
      setEmployeeOptions([])
      setIsFormDialogOpen(true)
    } catch (editError) {
      const message =
        editError instanceof Error ? editError.message : 'No se pudo cargar el registro.'
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

    if (!form.fechaRegistro) {
      setError('Debe ingresar la fecha de registro.')
      return
    }

    if (form.tipo !== 3 && !String(form.tiempo).trim()) {
      setError('Debe ingresar el tiempo de evaluacion.')
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
      const message =
        saveError instanceof Error ? saveError.message : 'No se pudo guardar el registro.'
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
    if (!confirm) return

    setError(null)
    try {
      const result = await anularLavadoRegistro(id)
      if (result.estado !== 1) {
        setError(result.mensaje)
        return
      }
      await loadRows()
    } catch (cancelError) {
      const message =
        cancelError instanceof Error ? cancelError.message : 'No se pudo anular el registro.'
      setError(message)
    }
  }

  const handleExport = async () => {
    if (!authorizedUser) {
      setError('Debe validar autorizacion para exportar.')
      return
    }

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
        tipo: filters.tipo,
      })
    } catch (exportError) {
      const message =
        exportError instanceof Error ? exportError.message : 'No se pudo exportar el listado.'
      setError(message)
    } finally {
      setIsExporting(false)
    }
  }

  const dialogTitle = `${getFormatoTitle(form.tipo)}${form.id ? ' - MODIFICAR' : ''}`
  const resolvedTitle = useMemo(() => item?.label ?? 'Lavado de Manos', [item?.label])

  const registroFields = (
    <>
      <div className="grid gap-2 md:grid-cols-[180px_1fr_1fr_180px]">
        <div className="space-y-1">
          <label
            className="block text-[11px] font-semibold uppercase text-[#123B63]"
            htmlFor="lavado-dni"
          >
            Nro de Dni
          </label>
          <Input
            id="lavado-dni"
            value={form.empleadoQuery}
            onChange={(event) =>
              setForm((current) => ({
                ...current,
                empleadoQuery: event.target.value,
                empleadoId: 0,
                empleado: '',
                tipoEmpleado: '',
              }))
            }
            placeholder="Buscar empleado"
            className="h-8 rounded-md px-2 text-xs"
          />
          {isSearchingEmployee ? <p className="text-[10px] text-muted">Buscando...</p> : null}
          {employeeOptions.length ? (
            <div className="max-h-32 overflow-auto rounded-md border border-border bg-white shadow-sm">
              {employeeOptions.map((employee) => (
                <button
                  key={`${employee.idempleado}-${employee.dni}`}
                  type="button"
                  className="flex w-full items-start justify-between border-b border-border/70 px-2 py-1 text-left text-[11px] last:border-b-0 hover:bg-[#f6fbff]"
                  onClick={() => handleSelectEmployee(employee)}
                >
                  <span className="truncate">{employee.unido || employee.empleado}</span>
                  <span className="ml-2 shrink-0 text-[10px] text-muted">
                    {employee.tipoempleado}
                  </span>
                </button>
              ))}
            </div>
          ) : null}
        </div>

        <div className="space-y-1">
          <label className="block text-[11px] font-semibold uppercase text-[#123B63]">
            Nombre Completo
          </label>
          <Input
            value={form.empleado}
            readOnly
            className="h-8 rounded-md bg-[#f8fafc] px-2 text-xs"
          />
        </div>

        <div className="space-y-1">
          <label className="block text-[11px] font-semibold uppercase text-[#123B63]">
            Tipo de Empleado
          </label>
          <Input
            value={form.tipoEmpleado}
            readOnly
            className="h-8 rounded-md bg-[#f8fafc] px-2 text-xs"
          />
        </div>

        <div className="space-y-1">
          <label
            className="block text-[11px] font-semibold uppercase text-[#123B63]"
            htmlFor="lavado-fecha-reg"
          >
            FechaRegistro
          </label>
          <Input
            id="lavado-fecha-reg"
            type="date"
            value={form.fechaRegistro}
            onChange={(event) =>
              setForm((current) => ({
                ...current,
                fechaRegistro: event.target.value,
              }))
            }
            className="h-8 rounded-md px-2 text-xs"
          />
        </div>
      </div>

      <div className="grid gap-2 md:grid-cols-[1fr_1fr_180px]">
        <div className="space-y-1">
          <label className="block text-[11px] font-semibold uppercase text-[#123B63]">Upss</label>
          <Input
            value={form.upss}
            onChange={(event) =>
              setForm((current) => ({
                ...current,
                upss: event.target.value,
              }))
            }
            className="h-8 rounded-md px-2 text-xs"
          />
        </div>

        <div className="space-y-1">
          <label className="block text-[11px] font-semibold uppercase text-[#123B63]">
            Servicio
          </label>
          <Input
            value={form.servicio}
            onChange={(event) =>
              setForm((current) => ({
                ...current,
                servicio: event.target.value,
              }))
            }
            className="h-8 rounded-md px-2 text-xs"
          />
        </div>

        {form.tipo !== 3 ? (
          <div className="space-y-1">
            <label className="block text-[11px] font-semibold uppercase text-[#123B63]">
              {getTiempoLabel(form.tipo)}
            </label>
            <Input
              type="number"
              min={0}
              value={form.tiempo}
              onChange={(event) =>
                setForm((current) => ({
                  ...current,
                  tiempo: event.target.value,
                }))
              }
              className="h-8 rounded-md px-2 text-xs"
            />
          </div>
        ) : null}
      </div>

      <div className="space-y-1">
        <label className="block text-[11px] font-semibold uppercase text-[#123B63]">
          Observacion
        </label>
        <Input
          value={form.observacion}
          onChange={(event) =>
            setForm((current) => ({
              ...current,
              observacion: event.target.value,
            }))
          }
          className="h-8 rounded-md px-2 text-xs"
        />
      </div>
    </>
  )

  return (
    <section className="space-y-3">
      <header className="space-y-0.5">
        <div className="flex flex-wrap items-center gap-2">
          <span className="rounded-md bg-brand-soft px-2 py-0.5 text-[10px] font-bold uppercase tracking-[0.12em] text-brand-strong">
            {workspaceMeta.main.shortLabel}
          </span>
          <h1 className="text-lg font-semibold text-brand-strong sm:text-xl">{resolvedTitle}</h1>
        </div>
        <p className="text-xs text-muted">Registro de Lavado de Manos</p>
      </header>

      <div className="rounded-md border border-[#d1dbe7] bg-white px-3 py-2">
        <div className="flex flex-col gap-3 lg:flex-row lg:flex-wrap lg:items-end">
          <div className="w-full space-y-1 sm:w-[180px]">
            <label
              className="block text-[11px] font-semibold text-[#123B63]"
              htmlFor="lavado-fecha-inicio"
            >
              Desde
            </label>
            <Input
              id="lavado-fecha-inicio"
              type="date"
              value={filters.fechaInicio}
              onChange={(event) =>
                setFilters((current) => ({
                  ...current,
                  fechaInicio: event.target.value,
                }))
              }
              className="h-8 w-full rounded-md px-2 text-xs"
            />
          </div>

          <div className="w-full space-y-1 sm:w-[180px]">
            <label
              className="block text-[11px] font-semibold text-[#123B63]"
              htmlFor="lavado-fecha-fin"
            >
              Hasta
            </label>
            <Input
              id="lavado-fecha-fin"
              type="date"
              value={filters.fechaFin}
              onChange={(event) =>
                setFilters((current) => ({
                  ...current,
                  fechaFin: event.target.value,
                }))
              }
              className="h-8 w-full rounded-md px-2 text-xs"
            />
          </div>

          <div className="w-full space-y-1 sm:w-[260px]">
            <label className="block text-[11px] font-semibold text-[#123B63]" htmlFor="lavado-tipo">
              Formato
            </label>
            <select
              id="lavado-tipo"
              value={String(filters.tipo)}
              onChange={(event) =>
                setFilters((current) => ({
                  ...current,
                  tipo: Number(event.target.value),
                }))
              }
              className="h-8 w-full rounded-md border border-input bg-background px-2 text-xs text-foreground shadow-xs outline-none ring-offset-background focus-visible:ring-2 focus-visible:ring-ring"
            >
              {FORMATO_OPTIONS.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.filterLabel}
                </option>
              ))}
            </select>
          </div>

          <div className="flex w-full flex-wrap items-center gap-2 sm:w-auto">
            <Button
              size="sm"
              variant="outline"
              className={
                sidebarCollapsed
                  ? 'h-8 w-full px-2 text-xs font-medium sm:w-8 sm:min-w-8 sm:px-0'
                  : 'h-8 w-full px-2.5 text-xs font-medium sm:w-auto sm:min-w-[94px]'
              }
              disabled={!authorizedUser || !isRangeValid || isLoading}
              onClick={() => void loadRows()}
              title="Mostrar"
            >
              <Search className="h-3.5 w-3.5 shrink-0" />
              {!sidebarCollapsed ? <span>Mostrar</span> : <span className="sm:sr-only">Mostrar</span>}
            </Button>

            <Button
              size="sm"
              variant="outline"
              className="h-8 w-full px-2.5 text-xs font-medium text-[#005F8F] hover:text-[#123B63] sm:w-auto sm:min-w-[94px]"
              disabled={!authorizedUser || !isRangeValid || isExporting}
              onClick={() => void handleExport()}
            >
              <Download className="h-3.5 w-3.5 shrink-0" />
              <span>Exportar</span>
            </Button>
          </div>

          <div className="flex w-full flex-wrap gap-2 lg:ml-auto lg:w-auto lg:justify-end">
            <Button
              size="sm"
              variant="secondary"
              className="h-9 w-full justify-start gap-1.5 px-2 text-[11px] font-medium sm:w-auto sm:min-w-[118px]"
              disabled={!authorizedUser}
              onClick={() => openCreateDialog(1)}
            >
              <Droplets className="h-3.5 w-3.5 shrink-0" />
              <span className="flex flex-col items-start leading-[1.05]">
                <span>Agua y</span>
                <span>Jabon</span>
              </span>
            </Button>

            <Button
              size="sm"
              variant="secondary"
              className="h-9 w-full justify-start gap-1.5 px-2 text-[11px] font-medium sm:w-auto sm:min-w-[118px]"
              disabled={!authorizedUser}
              onClick={() => openCreateDialog(2)}
            >
              <ShieldCheck className="h-3.5 w-3.5 shrink-0" />
              <span className="flex flex-col items-start leading-[1.05]">
                <span>Solucion</span>
                <span>Alcoholica</span>
              </span>
            </Button>

            <Button
              size="sm"
              variant="secondary"
              className="h-9 w-full justify-start gap-1.5 px-2 text-[11px] font-medium sm:w-auto sm:min-w-[118px]"
              disabled={!authorizedUser}
              onClick={() => openCreateDialog(3)}
            >
              <ListChecks className="h-3.5 w-3.5 shrink-0" />
              <span className="flex flex-col items-start leading-[1.05]">
                <span>5 Momentos</span>
                <span>de Higiene</span>
              </span>
            </Button>
          </div>
        </div>
      </div>

      {error ? <Alert variant="danger">{error}</Alert> : null}

      <p className="text-[11px] text-muted sm:hidden">Desliza la tabla para revisar registros y acciones.</p>

      <div className="overflow-x-auto rounded-md border border-[#d1dbe7] bg-white">
  <table className="w-full min-w-[900px] border-collapse text-[11px] leading-[1.1] sm:min-w-[1020px]">
          <thead>
  <tr className="bg-[#005F8F] text-white">
    <th className="w-[58px] border-b border-[#0e5078] px-1.5 py-1 text-center text-[10px] font-semibold uppercase tracking-wide">
      Id
    </th>
    <th className="w-[150px] border-b border-[#0e5078] px-1.5 py-1 text-left text-[10px] font-semibold uppercase tracking-wide">
      Empleado
    </th>
    <th className="w-[140px] border-b border-[#0e5078] px-1.5 py-1 text-left text-[10px] font-semibold uppercase tracking-wide">
      Profesional
    </th>
    <th className="w-[96px] border-b border-[#0e5078] px-1.5 py-1 text-left text-[10px] font-semibold uppercase tracking-wide">
      Upss
    </th>
    <th className="w-[150px] border-b border-[#0e5078] px-1.5 py-1 text-left text-[10px] font-semibold uppercase tracking-wide">
      Servicio
    </th>
    <th className="w-[92px] border-b border-[#0e5078] px-1.5 py-1 text-center text-[10px] font-semibold uppercase tracking-wide">
      Fecha Registro
    </th>
    <th className="w-[130px] border-b border-[#0e5078] px-1.5 py-1 text-left text-[10px] font-semibold uppercase tracking-wide">
      Observacion
    </th>
    <th className="w-[52px] border-b border-[#0e5078] px-1 py-1 text-center text-[10px] font-semibold uppercase tracking-wide">
      Tiempo
    </th>
    <th className="w-[58px] border-b border-[#0e5078] px-1 py-1 text-center text-[10px] font-semibold uppercase tracking-wide">
      Estado
    </th>
    <th
      colSpan={2}
      className="w-[56px] border-b border-[#0e5078] px-1 py-1 text-center text-[10px] font-semibold uppercase tracking-wide"
    >
      Accion
    </th>
  </tr>
</thead>
          <tbody>
  {isLoading ? (
    <tr>
      <td colSpan={11} className="px-3 py-6 text-center text-sm text-muted">
        Cargando registros...
      </td>
    </tr>
  ) : !hasLoaded ? (
    <tr>
      <td colSpan={11} className="px-3 py-6 text-center text-sm text-muted">
        Use el boton Mostrar para listar registros.
      </td>
    </tr>
  ) : rows.length ? (
    rows.map((row) => {
      const isAnulado = String(row.estado || '')
        .trim()
        .toLowerCase()
        .includes('anulado')

      return (
        <tr key={row.idregistro} className="odd:bg-white even:bg-[#f8fbff]">
          <td className="border-b border-border/80 px-1.5 py-1 text-center align-top">
            {row.idregistro}
          </td>

          <td className="border-b border-border/80 px-1.5 py-1 align-top break-words">
            {row.empleado || '-'}
          </td>

          <td className="border-b border-border/80 px-1.5 py-1 align-top break-words">
            {row.tipoempleado || '-'}
          </td>

          <td className="border-b border-border/80 px-1.5 py-1 align-top break-words">
            {row.upss || '-'}
          </td>

          <td className="border-b border-border/80 px-1.5 py-1 align-top break-words">
            {row.servicio || '-'}
          </td>

          <td className="border-b border-border/80 px-1.5 py-1 text-center align-top leading-[1.05]">
            {formatDisplayDate(String(row.fecha || ''))}
          </td>

          <td className="border-b border-border/80 px-1.5 py-1 align-top">
            <div
              className="max-w-[130px] overflow-hidden break-words"
              title={row.observacion || ''}
              style={{
                display: '-webkit-box',
                WebkitLineClamp: 2,
                WebkitBoxOrient: 'vertical',
              }}
            >
              {row.observacion || '-'}
            </div>
          </td>

          <td className="border-b border-border/80 px-1 py-1 text-center align-top">
            {row.tiempo || '-'}
          </td>

          <td className="border-b border-border/80 px-1 py-1 text-center align-top whitespace-nowrap">
            <span
              className={
                isAnulado
                  ? 'inline-flex rounded-full bg-red-100 px-1 py-0 text-[8px] font-semibold text-red-700'
                  : 'inline-flex rounded-full bg-emerald-100 px-1 py-0 text-[8px] font-semibold text-emerald-700'
              }
            >
              {isAnulado ? 'Anulado' : 'Activo'}
            </span>
          </td>

          <td className="border-b border-border/80 px-0.5 py-1 text-center align-top whitespace-nowrap">
            <Button
              type="button"
              variant="ghost"
              size="sm"
              className="h-5 w-5 p-0 text-[#2C6E99] hover:bg-[#eaf3fb]"
              title="Editar"
              disabled={!authorizedUser || isAnulado}
              onClick={() => void handleOpenEdit(row.idregistro)}
            >
              <Edit className="h-3 w-3" />
            </Button>
          </td>

          <td className="border-b border-border/80 px-0.5 py-1 text-center align-top whitespace-nowrap">
            <Button
              type="button"
              variant="ghost"
              size="sm"
              className="h-5 w-5 p-0 text-danger hover:bg-red-50"
              title="Anular"
              disabled={!authorizedUser || isAnulado}
              onClick={() => void handleAnular(row.idregistro)}
            >
              <Trash2 className="h-3 w-3" />
            </Button>
          </td>
        </tr>
      )
    })
  ) : (
    <tr>
      <td colSpan={11} className="px-3 py-6 text-center text-sm text-muted">
        No se encontraron registros para los filtros seleccionados.
      </td>
    </tr>
  )}
</tbody>
        </table>
      </div>

      <Dialog
        open={isAuthDialogOpen}
        onOpenChange={setIsAuthDialogOpen}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Permisos para acceder a Reportes Nominales</DialogTitle>
            <DialogDescription>Ingrese NUMERO DE DNI y CONTRASEÑA SISGALEN.</DialogDescription>
          </DialogHeader>
          <div className="space-y-3">
            <div>
              <label
                className="mb-1 block text-xs font-semibold text-muted"
                htmlFor="lavado-username"
              >
                NUMERO DE DNI
              </label>
              <Input
                id="lavado-username"
                value={username}
                onChange={(event) => setUsername(event.target.value)}
                className="h-9"
              />
            </div>
            <div>
              <label
                className="mb-1 block text-xs font-semibold text-muted"
                htmlFor="lavado-password"
              >
                CONTRASEÑA SISGALEN
              </label>
              <Input
                id="lavado-password"
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

      <Dialog open={isFormDialogOpen} onOpenChange={setIsFormDialogOpen}>
        <DialogContent className="w-[min(98vw,1180px)] max-h-[92vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{dialogTitle}</DialogTitle>
            <DialogDescription>
              Registro operativo de observacion de higiene de manos.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-3">
            {form.tipo === 3 ? (
              <>
                <p className="text-[11px] text-muted sm:hidden">Desliza la matriz para completar cada momento.</p>
                <div className="overflow-x-auto rounded-md border border-[#d5dee8]">
                <table className="w-full min-w-[700px] border-collapse text-[12px] sm:min-w-[860px]">
                  <thead>
                    <tr className="bg-[#eef5fb] text-[#123B63]">
                      <th className="border-b border-border px-2 py-1 text-center text-[10px] font-semibold uppercase">
                        Id
                      </th>
                      <th className="border-b border-border px-2 py-1 text-center text-[10px] font-semibold uppercase">
                        Observa
                      </th>
                      <th className="border-b border-border px-2 py-1 text-left text-[10px] font-semibold uppercase">
                        Actividad
                      </th>
                      <th className="border-b border-border px-2 py-1 text-center text-[10px] font-semibold uppercase">
                        Omision
                      </th>
                      <th className="border-b border-border px-2 py-1 text-center text-[10px] font-semibold uppercase">
                        Lavado de Manos
                      </th>
                      <th className="border-b border-border px-2 py-1 text-center text-[10px] font-semibold uppercase">
                        Friccion Alcohol
                      </th>
                      <th className="border-b border-border px-2 py-1 text-center text-[10px] font-semibold uppercase">
                        Guantes
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {actividades.map((actividad) => {
                      const current =
                        form.values[actividad.idactividad] ??
                        buildDefaultItemValue(actividad.idactividad, form.tipo, Boolean(form.id))

                      const enabled = Boolean(current.valor)
                      return (
                        <tr key={actividad.idactividad} className="odd:bg-white even:bg-[#f8fbff]">
                          <td className="border-b border-border/80 px-2 py-1 text-center">
                            {actividad.idactividad}
                          </td>
                          <td className="border-b border-border/80 px-2 py-1 text-center">
                            <input
                              type="checkbox"
                              checked={enabled}
                              onChange={(event) =>
                                setForm((previous) => ({
                                  ...previous,
                                  values: {
                                    ...previous.values,
                                    [actividad.idactividad]: event.target.checked
                                      ? {
                                          ...current,
                                          valor: 1,
                                        }
                                      : {
                                          ...current,
                                          valor: 0,
                                          omision: 0,
                                          lavado: 0,
                                          friccion: 0,
                                          guantes: 0,
                                        },
                                  },
                                }))
                              }
                            />
                          </td>
                          <td className="border-b border-border/80 px-2 py-1">
                            {actividad.actividad}
                          </td>
                          <td className="border-b border-border/80 px-2 py-1 text-center">
                            <input
                              type="radio"
                              name={`momento-${actividad.idactividad}`}
                              checked={Boolean(current.omision)}
                              disabled={!enabled}
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
                          </td>
                          <td className="border-b border-border/80 px-2 py-1 text-center">
                            <input
                              type="radio"
                              name={`momento-${actividad.idactividad}`}
                              checked={Boolean(current.lavado)}
                              disabled={!enabled}
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
                          </td>
                          <td className="border-b border-border/80 px-2 py-1 text-center">
                            <input
                              type="radio"
                              name={`momento-${actividad.idactividad}`}
                              checked={Boolean(current.friccion)}
                              disabled={!enabled}
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
                          </td>
                          <td className="border-b border-border/80 px-2 py-1 text-center">
                            <input
                              type="checkbox"
                              checked={Boolean(current.guantes)}
                              disabled={!enabled}
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
                          </td>
                        </tr>
                      )
                    })}
                    {!actividades.length ? (
                      <tr>
                        <td colSpan={7} className="px-2 py-4 text-center text-sm text-muted">
                          No hay actividades para el formato seleccionado.
                        </td>
                      </tr>
                    ) : null}
                  </tbody>
                </table>
                </div>
              </>
            ) : null}

            {registroFields}

            {form.tipo !== 3 ? (
              <>
                <p className="text-[11px] text-muted sm:hidden">Desliza la tabla para ver todas las actividades.</p>
                <div className="overflow-x-auto rounded-md border border-[#d5dee8]">
                <table className="w-full min-w-[560px] border-collapse text-[12px] sm:min-w-[620px]">
                  <thead>
                    <tr className="bg-[#eef5fb] text-[#123B63]">
                      <th className="border-b border-border px-2 py-1 text-center text-[10px] font-semibold uppercase">
                        Id
                      </th>
                      <th className="border-b border-border px-2 py-1 text-left text-[10px] font-semibold uppercase">
                        Actividad
                      </th>
                      <th className="border-b border-border px-2 py-1 text-center text-[10px] font-semibold uppercase">
                        Valor
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {actividades.map((actividad) => {
                      const current =
                        form.values[actividad.idactividad] ??
                        buildDefaultItemValue(actividad.idactividad, form.tipo, Boolean(form.id))
                      return (
                        <tr key={actividad.idactividad} className="odd:bg-white even:bg-[#f8fbff]">
                          <td className="border-b border-border/80 px-2 py-1 text-center">
                            {actividad.idactividad}
                          </td>
                          <td className="border-b border-border/80 px-2 py-1">
                            {actividad.actividad}
                          </td>
                          <td className="border-b border-border/80 px-2 py-1 text-center">
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
                          </td>
                        </tr>
                      )
                    })}
                    {!actividades.length ? (
                      <tr>
                        <td colSpan={3} className="px-2 py-4 text-center text-sm text-muted">
                          No hay actividades para el formato seleccionado.
                        </td>
                      </tr>
                    ) : null}
                  </tbody>
                </table>
                </div>
              </>
            ) : null}
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setIsFormDialogOpen(false)}>
              Cerrar
            </Button>
            <Button onClick={() => void handleSave()} disabled={isSaving}>
              {isSaving ? 'Guardando...' : form.id ? 'Actualizar' : 'Guardar'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </section>
  )
}
