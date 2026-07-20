import { validateLegacyUser } from './legacy-export.service.js'
import { isPprReadOnlyEmployee, normalizePprPortalRole } from './ppr-access.service.js'
import {
  executeProcedure_General as executeProcedure,
  executeQuery_General as executeQuery,
  sql,
} from './sigh-sql-helpers.js'

/**
 * Valida si un usuario tiene acceso al Portal PPR llamando SP_USUARIO_VALIDA_ppr.
 * Mismo patrón que SP_USUARIO_VALIDA_LM para Lavado de Manos.
 * Se llama desde POST /ppr/validate cuando el usuario intenta ingresar al portal.
 */
export async function validatePprUser({ username, password, ip }) {
  if (!username || !password) {
    return { ok: false, employeeId: null, employeeName: '', message: 'Credenciales requeridas.' }
  }

  const denied = {
    ok: false,
    employeeId: null,
    employeeName: '',
    role: null,
    message: 'El usuario no tiene autorizacion para el Portal PPR.',
  }

  async function validateReadOnlyFallback() {
    const usernameCandidates = [String(username).trim()]
    const employeeRows = await executeQuery(`
      SELECT TOP 1
        IdEmpleado,
        DNI
      FROM dbo.T_Empleado
      WHERE LTRIM(RTRIM(Usuario)) = @username
        OR LTRIM(RTRIM(DNI)) = @username;
    `, [
      { name: 'username', type: sql.NVarChar(30), value: String(username).trim() },
    ]).catch(() => [])

    const employeeDni = String(employeeRows[0]?.DNI ?? '').trim()
    if (employeeDni && !usernameCandidates.includes(employeeDni)) {
      usernameCandidates.push(employeeDni)
    }

    let fallback = null
    for (const candidate of usernameCandidates) {
      fallback = await validateLegacyUser({
        dni: candidate,
        password: String(password).trim(),
        ip,
        scope: 'general',
      }).catch(() => null)

      if (fallback?.ok) break
    }

    if (!fallback?.ok || !fallback.employeeId || !isPprReadOnlyEmployee(fallback.employeeId)) {
      return null
    }

    return {
      ok: true,
      employeeId: Number(fallback.employeeId),
      employeeName: String(fallback.employeeName ?? '').trim(),
      role: 'consulta',
      message: 'Acceso autorizado.',
    }
  }

  try {
    const rows = await executeProcedure('SP_USUARIO_VALIDA_ppr', [
      { name: 'usuario', type: sql.VarChar(20), value: String(username).substring(0, 20) },
      { name: 'clave', type: sql.VarChar(20), value: String(password).substring(0, 20) },
      { name: 'ipequipo', type: sql.VarChar(20), value: String(ip || '0.0.0.0').substring(0, 20) },
    ])

    const row = rows?.[0]
    const employeeId = row?.IDEMPLEADO ?? row?.idempleado ?? null
    const employeeName = String(row?.EMPLEADO ?? row?.empleado ?? '').trim()

    if (!employeeId) {
      const fallback = await validateReadOnlyFallback()
      if (fallback) return fallback

      return denied
    }

    return {
      ok: true,
      employeeId: Number(employeeId),
      employeeName,
      role: normalizePprPortalRole(row?.ROL ?? row?.rol ?? 'coordinador', employeeId),
      message: 'Acceso autorizado.',
    }
  } catch {
    const fallback = await validateReadOnlyFallback().catch(() => null)
    if (fallback) return fallback

    return { ok: false, employeeId: null, employeeName: '', role: null, message: 'No se pudo verificar el acceso. Intente nuevamente.' }
  }
}
