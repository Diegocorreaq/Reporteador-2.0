import { executeProcedure_General as executeProcedure, sql } from './sigh-sql-helpers.js'

/**
 * Valida si un usuario tiene acceso al Portal PPR llamando SP_USUARIO_VALIDA_ppr.
 * Mismo patrón que SP_USUARIO_VALIDA_LM para Lavado de Manos.
 * Se llama desde POST /ppr/validate cuando el usuario intenta ingresar al portal.
 */
export async function validatePprUser({ username, password, ip }) {
  if (!username || !password) {
    return { ok: false, employeeId: null, employeeName: '', message: 'Credenciales requeridas.' }
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
      return { ok: false, employeeId: null, employeeName: '', role: null, message: 'El usuario no tiene autorización para el Portal PPR.' }
    }

    const rawRole = String(row?.ROL ?? row?.rol ?? 'coordinador').toLowerCase().trim()
    const role = rawRole === 'admin' ? 'admin' : 'coordinador'

    return { ok: true, employeeId: Number(employeeId), employeeName, role, message: 'Acceso autorizado.' }
  } catch {
    return { ok: false, employeeId: null, employeeName: '', role: null, message: 'No se pudo verificar el acceso. Intente nuevamente.' }
  }
}
