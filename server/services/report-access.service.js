import { executeProcedure, sql } from './legacy-sql.service.js'

const REPORT_ACCESS_PROCEDURES = {
  'laboratorio-cultivos/mapa-microbiologico': {
    procedure: 'SP_USUARIO_VALIDA_MAPA_MICROBIOLOGICO',
    permission: 'menu.sigh.laboratorio-cultivos.mapa-microbiologico',
    connection: 'general',
  },
}

export function getReportAccessPermission(scope) {
  return REPORT_ACCESS_PROCEDURES[scope]?.permission ?? null
}

export function hasReportAccessScope(scope) {
  return Object.prototype.hasOwnProperty.call(REPORT_ACCESS_PROCEDURES, scope)
}

export async function validateReportAccess({ scope, dni, ip }) {
  const definition = REPORT_ACCESS_PROCEDURES[scope]
  if (!definition) {
    return { ok: false, permission: null }
  }

  const rows = await executeProcedure(
    definition.procedure,
    [
      { name: 'usuario', type: sql.VarChar(20), value: String(dni ?? '').substring(0, 20) },
      { name: 'ipequipo', type: sql.VarChar(20), value: String(ip || '0.0.0.0').substring(0, 20) },
    ],
    { connection: definition.connection },
  )

  return {
    ok: rows.length > 0,
    permission: definition.permission,
  }
}
