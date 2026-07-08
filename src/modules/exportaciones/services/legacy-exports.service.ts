import axios from 'axios'
import { httpClient } from '@/services/http/client'

export interface LegacyUserValidationPayload {
  ok: boolean
  employeeId: number | null
  employeeName: string
  message: string
}

export interface ExportCatalogOption {
  key: string
  fileName: string
  maxDays: number | null
}

interface DownloadExportParams {
  catalog: string
  key: string
  fechaInicio?: string
  fechaFin?: string
  employeeId?: number | null
}

function parseFileName(contentDisposition?: string) {
  if (!contentDisposition) {
    return 'reporte.xls'
  }

  const utf8Match = contentDisposition.match(/filename\*=UTF-8''([^;]+)/i)
  if (utf8Match?.[1]) {
    return decodeURIComponent(utf8Match[1])
  }

  const simpleMatch = contentDisposition.match(/filename="?([^"]+)"?/i)
  return simpleMatch?.[1] ?? 'reporte.xls'
}

function triggerBrowserDownload(blob: Blob, fileName: string) {
  const objectUrl = URL.createObjectURL(blob)
  const anchor = document.createElement('a')
  anchor.href = objectUrl
  anchor.download = fileName
  document.body.append(anchor)
  anchor.click()
  anchor.remove()
  URL.revokeObjectURL(objectUrl)
}

async function readDownloadErrorMessage(error: unknown) {
  if (!axios.isAxiosError(error)) {
    return null
  }

  const responseData = error.response?.data
  if (responseData instanceof Blob) {
    const text = await responseData.text()
    if (!text.trim()) {
      return null
    }

    try {
      const payload = JSON.parse(text) as { message?: unknown }
      return typeof payload.message === 'string' && payload.message.trim()
        ? payload.message.trim()
        : text.trim()
    } catch {
      return text.trim()
    }
  }

  const message = (responseData as { message?: unknown } | undefined)?.message
  return typeof message === 'string' && message.trim() ? message.trim() : null
}

export async function validateLegacyExportUser(
  username: string,
  password: string,
  scope: string = 'general',
) {
  const response = await httpClient.post<LegacyUserValidationPayload>('/exports/validate', {
    username,
    password,
    scope,
  })

  return response.data
}

export async function getExportCatalogOptions(catalog: string) {
  const response = await httpClient.get<{ rows: ExportCatalogOption[] }>('/exports/catalog', {
    params: { catalog },
  })

  return response.data.rows
}

export async function downloadLegacyExport(params: DownloadExportParams) {
  let response
  try {
    response = await httpClient.get<Blob>('/exports/download', {
      params: {
        catalog: params.catalog,
        key: params.key,
        fechaInicio: params.fechaInicio,
        fechaFin: params.fechaFin,
        employeeId: params.employeeId ?? 0,
      },
      responseType: 'blob',
      timeout: 900000,
    })
  } catch (error) {
    throw new Error((await readDownloadErrorMessage(error)) ?? 'No se pudo descargar el archivo.')
  }

  const fileName = parseFileName(response.headers['content-disposition'])
  triggerBrowserDownload(response.data, fileName)
}
