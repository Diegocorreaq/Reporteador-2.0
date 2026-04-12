import { httpClient } from '@/services/http/client'
import type {
  FamiliaPendienteReport,
  GestionCitasReport,
  LegacyValidationResponse,
  MonitoreoTicketsReport,
  MonitoreoVentanillaReport,
  ProduccionMedicoEmpleado,
  ProduccionMedicosDetalleReport,
  ProduccionMedicosResumenReport,
  SighExportCatalogOption,
  SighOption,
  SighTableRow,
} from '@/modules/sigh/types'

interface DownloadFileResponse {
  data: Blob
  headers: Record<string, string>
}

interface DateRangeFilters {
  fechaInicio: string
  fechaFin: string
}

interface ProduccionMedicosFilters extends DateRangeFilters {
  empleadoId: number
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

async function downloadBlob(path: string, params: Record<string, string | number | undefined>) {
  const response = (await httpClient.get(path, {
    params,
    responseType: 'blob',
    timeout: 180000,
  })) as DownloadFileResponse

  const fileName = parseFileName(response.headers['content-disposition'])
  triggerBrowserDownload(response.data, fileName)
}

export async function validateSisgalenUser(username: string, password: string) {
  const response = await httpClient.post<LegacyValidationResponse>('/exports/validate', {
    username,
    password,
    scope: 'general',
  })

  return response.data
}

export async function getSighExportCatalog(catalog: string) {
  const response = await httpClient.get<{ rows: SighExportCatalogOption[] }>('/exports/catalog', {
    params: { catalog },
  })

  return response.data.rows
}

export async function downloadSighExport(params: {
  catalog: 'current-sigh' | 'range'
  key: string
  employeeId: number
  fechaInicio?: string
  fechaFin?: string
}) {
  await downloadBlob('/exports/download', {
    catalog: params.catalog,
    key: params.key,
    employeeId: params.employeeId,
    fechaInicio: params.fechaInicio,
    fechaFin: params.fechaFin,
  })
}

export async function listFamiliaPendienteUpss() {
  const response = await httpClient.get<{ rows: SighOption[] }>('/sigh/monitoreo/familia-pendiente/upss')
  return response.data.rows
}

export async function getFamiliaPendienteReport(upss: string) {
  const response = await httpClient.get<FamiliaPendienteReport>('/sigh/monitoreo/familia-pendiente', {
    params: { upss },
  })

  return response.data
}

export async function downloadFamiliaPendienteNominal(params: {
  upss: string
  employeeId: number
  service?: string
}) {
  await downloadBlob('/sigh/monitoreo/familia-pendiente/export', {
    upss: params.upss,
    servicio: params.service ?? '',
    employeeId: params.employeeId,
  })
}

export async function searchProduccionMedicos(term: string) {
  const response = await httpClient.get<{ rows: ProduccionMedicoEmpleado[] }>('/sigh/prod-medicos/empleados', {
    params: { term },
  })

  return response.data.rows
}

export async function getProduccionMedicosResumen(filters: ProduccionMedicosFilters) {
  const response = await httpClient.get<ProduccionMedicosResumenReport>('/sigh/prod-medicos/resumen', {
    params: filters,
    timeout: 180000,
  })

  return response.data
}

export async function getProduccionMedicosDetalle(filters: ProduccionMedicosFilters & { orden: number }) {
  const response = await httpClient.get<ProduccionMedicosDetalleReport>('/sigh/prod-medicos/detalle', {
    params: filters,
    timeout: 180000,
  })

  return response.data
}

export async function downloadProduccionMedicosExcel(filters: ProduccionMedicosFilters) {
  await downloadBlob('/sigh/prod-medicos/export/excel', filters)
}

export function getProduccionMedicosPdfUrl(filters: ProduccionMedicosFilters) {
  const base = `${httpClient.defaults.baseURL ?? ''}/sigh/prod-medicos/export/pdf`
  const query = new URLSearchParams({
    fechaInicio: filters.fechaInicio,
    fechaFin: filters.fechaFin,
    empleadoId: String(filters.empleadoId),
  })

  return `${base}?${query.toString()}`
}

export async function listCamasServicios() {
  const response = await httpClient.get<{ rows: Array<{ tipo: string; nombre: string }> }>('/sigh/camas/servicios')
  return response.data.rows
}

export async function getCamasServicioInfo(servicio: string) {
  const response = await httpClient.get<{ row: SighTableRow | null }>('/sigh/camas/servicio-info', {
    params: { servicio },
  })
  return response.data.row
}

export async function getGestionEstanciaReport(filters: {
  servicio: string
  tipo: string
  idTipo: string
}) {
  const response = await httpClient.get<{ rows: SighTableRow[] }>('/sigh/camas/estancia', {
    params: filters,
    timeout: 180000,
  })

  return response.data.rows
}

export async function getGestionEstanciaMovimientos(filters: {
  upss: string
  servicio: string
}) {
  const response = await httpClient.get<{ rows: SighTableRow[] }>('/sigh/camas/estancia/movimientos', {
    params: filters,
  })

  return response.data.rows
}

export async function getGestionEstanciaMovimientoDetalle(orden: number | string) {
  const [cabecera, diagnosticos, transferencias, profesionales, procedimientos, dxcqx] = await Promise.all([
    httpClient.get<{ rows: SighTableRow[] }>(`/sigh/camas/estancia/movimientos/${orden}/cabecera`),
    httpClient.get<{ rows: SighTableRow[] }>(`/sigh/camas/estancia/movimientos/${orden}/diagnosticos`),
    httpClient.get<{ rows: SighTableRow[] }>(`/sigh/camas/estancia/movimientos/${orden}/transferencias`),
    httpClient.get<{ rows: SighTableRow[] }>(`/sigh/camas/estancia/movimientos/${orden}/profesionales`),
    httpClient.get<{ rows: SighTableRow[] }>(`/sigh/camas/estancia/movimientos/${orden}/procedimientos`),
    httpClient.get<{ rows: SighTableRow[] }>(`/sigh/camas/estancia/movimientos/${orden}/dxcqx`),
  ])

  return {
    cabecera: cabecera.data.rows,
    diagnosticos: diagnosticos.data.rows,
    transferencias: transferencias.data.rows,
    profesionales: profesionales.data.rows,
    procedimientos: procedimientos.data.rows,
    dxcqx: dxcqx.data.rows,
  }
}

export async function getMonitoreoCamasReport() {
  const response = await httpClient.get<{ rows: SighTableRow[] }>('/sigh/camas/monitoreo', {
    timeout: 180000,
  })
  return response.data.rows
}

export async function downloadMonitoreoCamasResumen() {
  await downloadBlob('/sigh/camas/export/resumen', {})
}

export async function downloadMonitoreoCamasSusalud() {
  await downloadBlob('/sigh/camas/export/susalud', {})
}

export async function listTiposCama() {
  const response = await httpClient.get<{ rows: Array<{ idTipo: string; tipo: string }> }>('/sigh/camas/tipos')
  return response.data.rows
}

export async function getResumenCamasReport(tipoCama: string) {
  const response = await httpClient.get<{ rows: SighTableRow[] }>('/sigh/camas/resumen', {
    params: { tipoCama },
  })
  return response.data.rows
}

export async function getOcupacionHospitalizacionReport() {
  const response = await httpClient.get<{ rows: SighTableRow[] }>('/sigh/camas/ocupacion/hospitalizacion')
  return response.data.rows
}

export async function getOcupacionUciReport() {
  const response = await httpClient.get<{ rows: SighTableRow[] }>('/sigh/camas/ocupacion/uci')
  return response.data.rows
}

export async function getCamasDetalle(tipoDetalle: string, idServicio: number | string, tipo: string) {
  const response = await httpClient.get<{ rows: SighTableRow[] }>('/sigh/camas/detalle', {
    params: {
      tipoDetalle,
      idServicio,
      tipo,
    },
  })

  return response.data.rows
}

export async function getGestionCitasReport(filters: DateRangeFilters) {
  const response = await httpClient.get<GestionCitasReport>('/sigh/gestion-citas', {
    params: filters,
    timeout: 180000,
  })
  return response.data
}

export async function getRolConsultaExternaReport(filters: DateRangeFilters) {
  const response = await httpClient.get<GestionCitasReport>('/sigh/rol-consulta-externa', {
    params: filters,
    timeout: 180000,
  })
  return response.data
}

export async function getMonitoreoTicketsReport() {
  const response = await httpClient.get<MonitoreoTicketsReport>('/sigh/monitoreo-tickets', {
    timeout: 180000,
  })
  return response.data
}

export async function getMonitoreoVentanillaReport() {
  const response = await httpClient.get<MonitoreoVentanillaReport>('/sigh/monitoreo-ventanilla', {
    timeout: 180000,
  })
  return response.data
}
