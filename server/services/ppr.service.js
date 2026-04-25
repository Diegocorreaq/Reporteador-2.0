import { executeProcedure_General as executeProcedure, sql } from './sigh-sql-helpers.js'

/**
 * Llama SP_USUARIO_VALIDA_ppr para verificar si el usuario tiene acceso PPR.
 * El SP valida credenciales + IDROL=210 (igual que SP_USUARIO_VALIDA_LM para Lavado de Manos).
 * Retorna 'ppr_coordinador' si el SP devuelve fila, null si no tiene acceso o hay error.
 *
 * Se llama una sola vez en el login y el resultado viaja en el JWT.
 */
export async function getPprUserRole({ username, password, ip }) {
  if (!username || !password) return null

  try {
    const rows = await executeProcedure('SP_USUARIO_VALIDA_ppr', [
      { name: 'usuario', type: sql.VarChar(20), value: String(username).substring(0, 20) },
      { name: 'clave', type: sql.VarChar(20), value: String(password).substring(0, 20) },
      { name: 'ipequipo', type: sql.VarChar(20), value: String(ip || '0.0.0.0').substring(0, 20) },
    ])

    if (!rows?.[0]?.IDEMPLEADO && !rows?.[0]?.idempleado) return null
    return 'ppr_coordinador'
  } catch {
    // SP no existe todavía o BD no disponible — login sigue funcionando sin acceso PPR
    return null
  }
}
