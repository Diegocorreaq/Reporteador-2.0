import { httpClient } from '@/services/http/client'
import type {
  PprActividad,
  PprActividadAdmin,
  PprCoordinador,
  PprEmpleadoResult,
  PprImportResult,
  PprImportSource,
  PprPeriodo,
  PprPeriodoItem,
  PprPrograma,
  PprProgramaAdmin,
  PprProgramaDetalle,
  PprResumenPrograma,
  PprValidationSummary,
} from '@/modules/ppr/types'

export interface PprValidationResult {
  ok: boolean
  employeeId: number | null
  employeeName: string
  role: 'coordinador' | 'admin' | null
  message: string
}

export async function validatePprUser(username: string, password: string): Promise<PprValidationResult> {
  const res = await httpClient.post<PprValidationResult>('/ppr/validate', { username, password })
  return res.data
}

export async function fetchPeriodoActivo(): Promise<PprPeriodo> {
  const res = await httpClient.get<{ periodo: PprPeriodo }>('/ppr/periodo-activo')
  return res.data.periodo
}

export async function fetchProgramas(employeeId: number): Promise<PprPrograma[]> {
  const res = await httpClient.get<{ programas: PprPrograma[] }>('/ppr/programas', {
    params: { employeeId },
  })
  return res.data.programas
}

export async function fetchActividades(
  programaId: number,
  periodoId: number,
  employeeId: number,
): Promise<PprActividad[]> {
  const res = await httpClient.get<{ actividades: PprActividad[] }>('/ppr/actividades', {
    params: { programaId, periodoId, employeeId },
  })
  return res.data.actividades
}

export async function saveValor(payload: {
  activityId: number
  periodId: number
  employeeId: number
  value: number
  notes?: string
}): Promise<void> {
  await httpClient.post('/ppr/valores', payload)
}

export async function validarValor(payload: {
  activityId: number
  periodId: number
  employeeId: number
}): Promise<{ validatedAt: string }> {
  const res = await httpClient.post<{ ok: boolean; validatedAt: string }>('/ppr/valores/validar', payload)
  return { validatedAt: res.data.validatedAt }
}

export async function fetchValidationSummary(
  employeeId: number,
  periodId: number,
): Promise<PprValidationSummary> {
  const res = await httpClient.get<{ resumen: PprValidationSummary }>('/ppr/validacion/resumen', {
    params: { employeeId, periodId },
  })
  return res.data.resumen
}

export async function firmarPeriodo(
  periodId: number,
  employeeId: number,
  forceForTesting = false,
): Promise<{ signedAt: string }> {
  const res = await httpClient.post<{ ok: boolean; signedAt: string }>('/ppr/firmar', {
    periodId,
    employeeId,
    forceForTesting,
  })
  return { signedAt: res.data.signedAt }
}

export async function fetchPeriodos(employeeId: number): Promise<PprPeriodoItem[]> {
  const res = await httpClient.get<{ periodos: PprPeriodoItem[] }>('/ppr/periodos', {
    params: { employeeId },
  })
  return res.data.periodos
}

export async function fetchResumen(employeeId: number, year: number): Promise<PprResumenPrograma[]> {
  const res = await httpClient.get<{ resumen: PprResumenPrograma[]; year: number }>('/ppr/resumen', {
    params: { employeeId, year },
  })
  return res.data.resumen
}

export async function fetchProgramaDetalle(
  programId: number,
  year: number,
  employeeId: number,
): Promise<PprProgramaDetalle> {
  const res = await httpClient.get<{ detalle: PprProgramaDetalle }>('/ppr/programa-detalle', {
    params: { programId, year, employeeId },
  })
  return res.data.detalle
}

// ─── Admin ────────────────────────────────────────────────────────────────────

export async function searchEmpleados(q: string, adminId: number): Promise<PprEmpleadoResult[]> {
  const res = await httpClient.get<{ empleados: PprEmpleadoResult[] }>('/ppr/empleados/search', {
    params: { q, adminId },
  })
  return res.data.empleados
}

export async function fetchCoordinadores(adminId: number): Promise<PprCoordinador[]> {
  const res = await httpClient.get<{ coordinadores: PprCoordinador[] }>('/ppr/admin/coordinadores', {
    params: { adminId },
  })
  return res.data.coordinadores
}

export async function agregarCoordinador(employeeId: number, adminId: number): Promise<void> {
  await httpClient.post('/ppr/admin/coordinadores', { employeeId, adminId })
}

export async function toggleCoordinador(employeeId: number, activo: boolean, adminId: number): Promise<void> {
  await httpClient.patch(`/ppr/admin/coordinadores/${employeeId}`, { activo, adminId })
}

export async function fetchProgramasAdmin(adminId: number): Promise<PprProgramaAdmin[]> {
  const res = await httpClient.get<{ programas: PprProgramaAdmin[] }>('/ppr/admin/programas', {
    params: { adminId },
  })
  return res.data.programas
}

export async function fetchImportSources(adminId: number): Promise<PprImportSource[]> {
  const res = await httpClient.get<{ sources: PprImportSource[] }>('/ppr/admin/cargas/sources', {
    params: { adminId },
  })
  return res.data.sources
}

export async function runImportCarga(
  programId: number,
  sourceId: string,
  adminId: number,
): Promise<PprImportResult> {
  const res = await httpClient.post<{ ok: boolean; result: PprImportResult }>('/ppr/admin/cargas/run', {
    programId,
    sourceId,
    adminId,
  })
  return res.data.result
}

export async function downloadMatrizExcel(year: number, adminId: number): Promise<void> {
  const res = await httpClient.get('/ppr/admin/export/matriz', {
    params: { year, adminId },
    responseType: 'blob',
  })
  const url = URL.createObjectURL(new Blob([res.data]))
  const a = document.createElement('a')
  a.href = url
  a.download = `Matriz_PPR_${year}.xlsx`
  document.body.appendChild(a)
  a.click()
  a.remove()
  URL.revokeObjectURL(url)
}

export async function fetchActividadesAdmin(programId: number, adminId: number): Promise<PprActividadAdmin[]> {
  const res = await httpClient.get<{ actividades: PprActividadAdmin[] }>('/ppr/admin/actividades', {
    params: { programId, adminId },
  })
  return res.data.actividades
}

export async function guardarActividadAdmin(payload: {
  id: number | null
  programId: number
  code: string
  name: string
  unit: string
  annualGoal: number | null
  sortOrder: number
  isActive: boolean
  adminId: number
}): Promise<{ id: number }> {
  const res = await httpClient.post<{ ok: boolean; id: number }>('/ppr/admin/actividades', payload)
  return { id: res.data.id }
}

export async function toggleActividadAdmin(
  activityId: number,
  isActive: boolean,
  adminId: number,
): Promise<void> {
  await httpClient.patch(`/ppr/admin/actividades/${activityId}/toggle`, { isActive, adminId })
}

export async function guardarAsignacion(
  employeeId: number,
  programId: number,
  activo: boolean,
  adminId: number,
): Promise<void> {
  await httpClient.post('/ppr/admin/asignacion', { employeeId, programId, activo, adminId })
}
