import { httpClient } from '@/services/http/client'

export type EpidemiologiaReportKey =
  | 'pacientes-oncologicos'
  | 'pfa-sifilis-sarampion'
  | 'isqx'
  | 'mordedura-canina'
  | 'cirugia-procedimiento'
  | 'seguimiento-dengue'

export interface DownloadEpidemiologiaReporteParams {
  report: EpidemiologiaReportKey
  subtype?: string
  fechaInicio?: string
  fechaFin?: string
  fecha?: string
}

export interface EpidemiologiaUserValidationPayload {
  ok: boolean
  employeeId: number | null
  employeeName: string
  message: string
}

function parseFileName(contentDisposition?: string) {
  if (!contentDisposition) return 'reporte-epidemiologia.xlsx'

  const utf8Match = contentDisposition.match(/filename\*=UTF-8''([^;]+)/i)
  if (utf8Match?.[1]) return decodeURIComponent(utf8Match[1])

  const simpleMatch = contentDisposition.match(/filename="?([^"]+)"?/i)
  return simpleMatch?.[1] ?? 'reporte-epidemiologia.xlsx'
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

export async function downloadEpidemiologiaReporte(params: DownloadEpidemiologiaReporteParams) {
  const response = await httpClient.get<Blob>('/epidemiologia/reportes/export', {
    params,
    responseType: 'blob',
    timeout: 240000,
  })

  const fileName = parseFileName(response.headers['content-disposition'])
  triggerBrowserDownload(response.data, fileName)
}

export async function validateEpidemiologiaReporteUser(
  username: string,
  password: string,
  report: EpidemiologiaReportKey,
) {
  const response = await httpClient.post<EpidemiologiaUserValidationPayload>('/epidemiologia/reportes/validate', {
    username,
    password,
    report,
  })

  return response.data
}
