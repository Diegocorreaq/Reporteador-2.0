import { httpClient } from '@/services/http/client'
import type {
  PprActividad,
  PprCoordinador,
  PprPeriodo,
  PprPeriodoItem,
  PprPrograma,
  PprProgramaAdmin,
  PprResumenPrograma,
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

export async function firmarPeriodo(periodId: number, employeeId: number): Promise<{ signedAt: string }> {
  const res = await httpClient.post<{ ok: boolean; signedAt: string }>('/ppr/firmar', { periodId, employeeId })
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

// ─── Admin ────────────────────────────────────────────────────────────────────

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

export async function guardarAsignacion(
  employeeId: number,
  programId: number,
  activo: boolean,
  adminId: number,
): Promise<void> {
  await httpClient.post('/ppr/admin/asignacion', { employeeId, programId, activo, adminId })
}
