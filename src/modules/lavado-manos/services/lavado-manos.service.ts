import { httpClient } from '@/services/http/client'
import type {
  LavadoActividad,
  LavadoEmpleado,
  LavadoFilters,
  LavadoRegistroDetalle,
  LavadoRegistroListItem,
  LavadoRegistroPayload,
} from '@/modules/lavado-manos/types'

function parseDownloadFileName(contentDisposition?: string) {
  if (!contentDisposition) {
    return 'lavado-de-manos.xls'
  }

  const utf8 = contentDisposition.match(/filename\*=UTF-8''([^;]+)/i)
  if (utf8?.[1]) {
    return decodeURIComponent(utf8[1])
  }

  const simple = contentDisposition.match(/filename="?([^"]+)"?/i)
  return simple?.[1] ?? 'lavado-de-manos.xls'
}

function triggerDownload(blob: Blob, fileName: string) {
  const blobUrl = URL.createObjectURL(blob)
  const anchor = document.createElement('a')
  anchor.href = blobUrl
  anchor.download = fileName
  document.body.append(anchor)
  anchor.click()
  anchor.remove()
  URL.revokeObjectURL(blobUrl)
}

export function buildDefaultLavadoFilters(): LavadoFilters {
  const now = new Date()
  const year = now.getFullYear()
  return {
    fechaInicio: `${year}-01-01`,
    fechaFin: `${year}-12-31`,
    tipo: 0,
  }
}

export async function validateLavadoUser(username: string, password: string) {
  const response = await httpClient.post<{
    ok: boolean
    employeeId: number | null
    employeeName: string
    message: string
  }>('/epidemiologia/lavado/validate', { username, password })

  return response.data
}

export async function fetchLavadoRegistros(filters: LavadoFilters) {
  const response = await httpClient.get<{ rows: LavadoRegistroListItem[] }>('/epidemiologia/lavado', {
    params: filters,
  })

  return response.data.rows
}

export async function fetchLavadoActividades(tipo: number) {
  const response = await httpClient.get<{ rows: LavadoActividad[] }>('/epidemiologia/lavado/actividades', {
    params: { tipo },
  })

  return response.data.rows
}

export async function searchLavadoEmpleados(nombre: string) {
  const response = await httpClient.get<{ rows: LavadoEmpleado[] }>('/epidemiologia/lavado/empleados', {
    params: { nombre },
  })

  return response.data.rows
}

export async function fetchLavadoRegistroById(id: number) {
  const response = await httpClient.get<LavadoRegistroDetalle>(`/epidemiologia/lavado/${id}`)
  return response.data
}

export async function createLavadoRegistro(payload: LavadoRegistroPayload) {
  const response = await httpClient.post<LavadoRegistroDetalle>('/epidemiologia/lavado', payload)
  return response.data
}

export async function updateLavadoRegistro(id: number, payload: LavadoRegistroPayload) {
  const response = await httpClient.put<LavadoRegistroDetalle>(`/epidemiologia/lavado/${id}`, payload)
  return response.data
}

export async function anularLavadoRegistro(id: number) {
  const response = await httpClient.post<{ estado: number; mensaje: string }>(`/epidemiologia/lavado/${id}/anular`)
  return response.data
}

export async function exportLavadoRegistros(filters: LavadoFilters) {
  const response = await httpClient.get<Blob>('/epidemiologia/lavado/export', {
    params: filters,
    responseType: 'blob',
    timeout: 120000,
  })
  const fileName = parseDownloadFileName(response.headers['content-disposition'])
  triggerDownload(response.data, fileName)
}
