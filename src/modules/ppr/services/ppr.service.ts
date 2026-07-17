import { httpClient } from '@/services/http/client'
import { appConfig } from '@/config/app-config'
import type {
  PprActividad,
  PprActividadAdmin,
  PprCoordinador,
  PprEmpleadoResult,
  PprEvaluacionMensual,
  PprImportResult,
  PprImportSource,
  PprPeriodo,
  PprPeriodoItem,
  PprProgramDocument,
  PprPrograma,
  PprProgramaAdmin,
  PprProgramaDetalle,
  PprProgramaPreliminar,
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

export interface PprSignedDocumentInfo {
  id: number
  code: string
  fileName: string
  documentHash: string
  contentHash: string
  signatureType: string
  signatureLabel?: string
  signerDni?: string
  signerName?: string
  signedAt?: string
}

export interface PprPdfFile {
  blob: Blob
  fileName: string
}

function parseFileName(contentDisposition: string | undefined, fallback: string) {
  if (!contentDisposition) return fallback
  const utf8Match = contentDisposition.match(/filename\*=UTF-8''([^;]+)/i)
  if (utf8Match?.[1]) return decodeURIComponent(utf8Match[1])
  const simpleMatch = contentDisposition.match(/filename="?([^";]+)"?/i)
  return simpleMatch?.[1] ?? fallback
}

export function triggerPprPdfDownload(file: PprPdfFile) {
  const url = URL.createObjectURL(file.blob)
  const link = document.createElement('a')
  link.href = url
  link.download = file.fileName
  document.body.appendChild(link)
  link.click()
  link.remove()
  window.setTimeout(() => URL.revokeObjectURL(url), 1_000)
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

export function buildPprProgramDocumentDownloadUrl(
  programCode: string,
  documentType: string,
  documentId: number,
  employeeId?: number,
) {
  const apiBaseUrl = appConfig.apiBaseUrl.replace(/\/$/, '')
  const query = employeeId ? `?employeeId=${encodeURIComponent(String(employeeId))}` : ''
  return `${apiBaseUrl}/ppr/programas/${encodeURIComponent(programCode)}/documentos/${encodeURIComponent(documentType)}/${encodeURIComponent(String(documentId))}/download${query}`
}

export async function fetchPprProgramDocuments(
  programCode: string,
  documentType: string,
  employeeId?: number,
): Promise<PprProgramDocument[]> {
  const res = await httpClient.get<{ documents: PprProgramDocument[] }>(
    `/ppr/programas/${encodeURIComponent(programCode)}/documentos/${encodeURIComponent(documentType)}`,
    { params: employeeId ? { employeeId } : undefined },
  )
  return res.data.documents
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
  programId?: number | null,
): Promise<PprValidationSummary> {
  const res = await httpClient.get<{ resumen: PprValidationSummary }>('/ppr/validacion/resumen', {
    params: { employeeId, periodId, programId },
  })
  return res.data.resumen
}

export async function firmarPeriodo(
  periodId: number,
  employeeId: number,
  programId: number,
  forceForTesting = false,
): Promise<{ signedAt: string; document: PprSignedDocumentInfo }> {
  const res = await httpClient.post<{
    ok: boolean
    signedAt: string
    document: PprSignedDocumentInfo
  }>('/ppr/firmar', {
    periodId,
    employeeId,
    programId,
    forceForTesting,
  })
  return { signedAt: res.data.signedAt, document: res.data.document }
}

export async function fetchSignedDocumentInfo(
  periodId: number,
  employeeId: number,
  programId: number,
): Promise<PprSignedDocumentInfo | null> {
  const res = await httpClient.get<{
    exists: boolean
    document: PprSignedDocumentInfo | null
  }>(`/ppr/firmas/${periodId}`, {
    params: { employeeId, programId },
  })
  return res.data.document
}

export async function fetchPprDraftPdf(
  periodId: number,
  employeeId: number,
  programId: number,
): Promise<PprPdfFile> {
  const fallback = `PPR_periodo_${periodId}_borrador.pdf`
  const res = await httpClient.get<Blob>(`/ppr/documentos/${periodId}/borrador/pdf`, {
    params: { employeeId, programId },
    responseType: 'blob',
    timeout: 120000,
  })
  return {
    blob: res.data,
    fileName: parseFileName(res.headers['content-disposition'], fallback),
  }
}

export async function downloadSignedPeriodPdf(
  periodId: number,
  employeeId: number,
  programId: number,
  fileName?: string,
): Promise<void> {
  const fallback = fileName || `PPR_periodo_${periodId}_firmado.pdf`
  const res = await httpClient.get<Blob>(`/ppr/firmas/${periodId}/pdf`, {
    params: { employeeId, programId },
    responseType: 'blob',
    timeout: 120000,
  })
  triggerPprPdfDownload({
    blob: res.data,
    fileName: parseFileName(res.headers['content-disposition'], fallback),
  })
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

export async function fetchProgramaPreliminar(programId: number): Promise<PprProgramaPreliminar> {
  const res = await httpClient.get<{ preliminar: PprProgramaPreliminar }>('/ppr/programa-preliminar', {
    params: { programId },
    timeout: 120000,
  })
  return res.data.preliminar
}

export async function fetchEvaluacionMensual(
  programId: number,
  year: number,
  month: number,
): Promise<PprEvaluacionMensual> {
  const res = await httpClient.get<{ evaluacion: PprEvaluacionMensual }>('/ppr/evaluacion-mensual', {
    params: { programId, year, month },
    timeout: 120000,
  })
  return res.data.evaluacion
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
  activityGroupCode?: string | null
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
