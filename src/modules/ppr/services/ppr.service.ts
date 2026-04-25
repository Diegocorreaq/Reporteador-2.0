import { httpClient } from '@/services/http/client'
import type { PprActividad, PprPeriodo, PprPrograma } from '@/modules/ppr/types'

export async function fetchPeriodoActivo(): Promise<PprPeriodo> {
  const res = await httpClient.get<{ periodo: PprPeriodo }>('/ppr/periodo-activo')
  return res.data.periodo
}

export async function fetchProgramas(): Promise<PprPrograma[]> {
  const res = await httpClient.get<{ programas: PprPrograma[] }>('/ppr/programas')
  return res.data.programas
}

export async function fetchActividades(programaId: number, periodoId: number): Promise<PprActividad[]> {
  const res = await httpClient.get<{ actividades: PprActividad[] }>('/ppr/actividades', {
    params: { programaId, periodoId },
  })
  return res.data.actividades
}

export async function saveValor(payload: {
  activityId: number
  periodId: number
  value: number
  notes?: string
}): Promise<void> {
  await httpClient.post('/ppr/valores', payload)
}

export async function firmarPeriodo(periodId: number): Promise<{ signedAt: string }> {
  const res = await httpClient.post<{ ok: boolean; signedAt: string }>('/ppr/firmar', { periodId })
  return { signedAt: res.data.signedAt }
}
