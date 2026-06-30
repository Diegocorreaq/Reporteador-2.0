import { httpClient } from '@/services/http/client'

interface DownloadFileResponse {
  data: Blob
  headers: Record<string, string>
}

function parseFileName(contentDisposition?: string) {
  if (!contentDisposition) {
    return 'indicadores-hospitalarios.xlsx'
  }

  const utf8Match = contentDisposition.match(/filename\*=UTF-8''([^;]+)/i)
  if (utf8Match?.[1]) {
    return decodeURIComponent(utf8Match[1])
  }

  const simpleMatch = contentDisposition.match(/filename="?([^"]+)"?/i)
  return simpleMatch?.[1] ?? 'indicadores-hospitalarios.xlsx'
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

const indicatorExportEndpoints = {
  eficiencia: '/indicadores/eficiencia/export/excel',
  eficacia: '/indicadores/eficacia/export/excel',
  calidad: '/indicadores/calidad/export/excel',
} as const

const dashboardExportEndpoints = {
  ...indicatorExportEndpoints,
  consultaExternaConsultorioProfesional: '/consulta-externa/consultorio-profesional/export/excel',
} as const

export type HospitalIndicatorExportType = keyof typeof indicatorExportEndpoints
export type PowerBiDashboardExportType = keyof typeof dashboardExportEndpoints

export async function downloadPowerBiDashboardExcel(type: PowerBiDashboardExportType, filters: {
  fechaInicio: string
  fechaFin: string
}) {
  const response = (await httpClient.get(dashboardExportEndpoints[type], {
    params: filters,
    responseType: 'blob',
    timeout: 180000,
  })) as DownloadFileResponse

  triggerBrowserDownload(response.data, parseFileName(response.headers['content-disposition']))
}

export async function downloadIndicadoresHospitalariosExcel(type: HospitalIndicatorExportType, filters: {
  fechaInicio: string
  fechaFin: string
}) {
  return downloadPowerBiDashboardExcel(type, filters)
}

export async function downloadIndicadoresEficienciaExcel(filters: {
  fechaInicio: string
  fechaFin: string
}) {
  return downloadIndicadoresHospitalariosExcel('eficiencia', filters)
}
