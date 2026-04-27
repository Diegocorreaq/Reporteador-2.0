import { executeProcedure_General as executeProcedure, sql } from './sigh-sql-helpers.js'

const MONTHS_ES = [
  'Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio',
  'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre',
]

function periodLabel(year, month) {
  return `${MONTHS_ES[(month ?? 1) - 1] ?? '?'} ${year}`
}

export async function getPeriodoActivo() {
  const rows = await executeProcedure('SP_PPR_PERIODO_ACTIVO', [])
  const r = rows[0]
  if (!r) return null
  return {
    id: Number(r.id),
    year: Number(r.year),
    month: Number(r.month),
    label: periodLabel(r.year, r.month),
    isOpen: Boolean(r.is_open),
    deadline: r.deadline ?? null,
  }
}

export async function getProgramasUsuario(employeeId) {
  const rows = await executeProcedure('SP_PPR_PROGRAMAS_USUARIO', [
    { name: 'employee_id', type: sql.Int, value: Number(employeeId) },
  ])
  return rows.map((r) => ({
    id: Number(r.id),
    code: String(r.code ?? ''),
    name: String(r.name ?? ''),
    totalActividades: Number(r.total_actividades ?? 0),
    completadas: Number(r.completadas ?? 0),
  }))
}

export async function getActividadesPrograma({ programaId, periodoId, employeeId }) {
  const rows = await executeProcedure('SP_PPR_ACTIVIDADES_PROGRAMA', [
    { name: 'program_id', type: sql.Int, value: Number(programaId) },
    { name: 'period_id', type: sql.Int, value: Number(periodoId) },
    { name: 'employee_id', type: sql.Int, value: Number(employeeId) },
  ])
  return rows.map((r) => ({
    id: Number(r.id),
    code: String(r.code ?? ''),
    name: String(r.name ?? ''),
    unit: String(r.unit ?? ''),
    annualGoal: r.annual_goal != null ? Number(r.annual_goal) : null,
    sortOrder: Number(r.sort_order ?? 0),
    value: r.value != null ? Number(r.value) : null,
    notes: String(r.notes ?? ''),
    signed: Boolean(r.signed_at),
  }))
}

export async function guardarValor({ activityId, periodId, employeeId, value, notes }) {
  await executeProcedure('SP_PPR_GUARDAR_VALOR', [
    { name: 'activity_id', type: sql.Int, value: Number(activityId) },
    { name: 'period_id', type: sql.Int, value: Number(periodId) },
    { name: 'employee_id', type: sql.Int, value: Number(employeeId) },
    { name: 'value', type: sql.Decimal(18, 2), value: Number(value) },
    { name: 'notes', type: sql.NVarChar(500), value: notes ?? null },
  ])
}

export async function firmarPeriodo({ employeeId, periodId }) {
  const rows = await executeProcedure('SP_PPR_FIRMAR_PERIODO', [
    { name: 'employee_id', type: sql.Int, value: Number(employeeId) },
    { name: 'period_id', type: sql.Int, value: Number(periodId) },
  ])
  return rows[0]?.signed_at ?? new Date().toISOString()
}

// SP_PPR_PERIODOS_USUARIO(@employee_id INT)
// Returns: id, year, month, is_open, deadline, signed_at, completadas, total_actividades
export async function getPeriodosUsuario(employeeId) {
  const rows = await executeProcedure('SP_PPR_PERIODOS_USUARIO', [
    { name: 'employee_id', type: sql.Int, value: Number(employeeId) },
  ])
  return rows.map((r) => ({
    id: Number(r.id),
    year: Number(r.year),
    month: Number(r.month),
    label: periodLabel(r.year, r.month),
    isOpen: Boolean(r.is_open),
    deadline: r.deadline ?? null,
    isSigned: r.signed_at != null,
    signedAt: r.signed_at ?? null,
    completadas: Number(r.completadas ?? 0),
    totalActividades: Number(r.total_actividades ?? 0),
  }))
}

// ─── Admin functions ──────────────────────────────────────────────────────────

// SP_PPR_ADMIN_VERIFICAR(@employee_id INT) → Returns: is_admin (1 or 0)
export async function verificarAdmin(employeeId) {
  const rows = await executeProcedure('SP_PPR_ADMIN_VERIFICAR', [
    { name: 'employee_id', type: sql.Int, value: Number(employeeId) },
  ])
  return Boolean(rows?.[0]?.is_admin)
}

// SP_PPR_ADMIN_COORDINADORES → Returns (one row per program assignment):
//   idempleado, nombre, dni, activo, fecha_alta, program_id, program_code, program_name
export async function getCoordinadores() {
  const rows = await executeProcedure('SP_PPR_ADMIN_COORDINADORES', [])
  const map = new Map()
  for (const r of rows) {
    const id = Number(r.idempleado)
    if (!map.has(id)) {
      map.set(id, {
        employeeId: id,
        employeeName: String(r.nombre ?? ''),
        dni: String(r.dni ?? ''),
        activo: Boolean(r.activo),
        fechaAlta: r.fecha_alta ?? null,
        programas: [],
        _seen: new Set(),
      })
    }
    const entry = map.get(id)
    const programId = r.program_id != null ? Number(r.program_id) : null
    if (programId != null && !entry._seen.has(programId)) {
      entry._seen.add(programId)
      entry.programas.push({
        id: programId,
        code: String(r.program_code ?? ''),
        name: String(r.program_name ?? ''),
      })
    }
  }
  return Array.from(map.values()).map(({ _seen, ...coord }) => coord)
}

// SP_PPR_ADMIN_GUARDAR_COORDINADOR(@idempleado INT, @activo BIT, @admin_id INT)
//   Add (activo=1) or deactivate (activo=0) a coordinator.
//   SP should look up nombre/DNI from SIGH employee tables.
export async function guardarCoordinador({ employeeId, activo, adminId }) {
  const rows = await executeProcedure('SP_PPR_ADMIN_GUARDAR_COORDINADOR', [
    { name: 'idempleado', type: sql.Int, value: Number(employeeId) },
    { name: 'activo', type: sql.Bit, value: activo ? 1 : 0 },
    { name: 'admin_id', type: sql.Int, value: Number(adminId) },
  ])
  return rows[0] ?? { ok: 1, message: 'OK' }
}

// SP_PPR_ADMIN_PROGRAMAS → Returns: id, code, name (all programs in the system)
export async function getTodosLosProgramas() {
  const rows = await executeProcedure('SP_PPR_ADMIN_PROGRAMAS', [])
  return rows.map((r) => ({
    id: Number(r.id),
    code: String(r.code ?? ''),
    name: String(r.name ?? ''),
  }))
}

// SP_PPR_ADMIN_GUARDAR_ASIGNACION(@idempleado INT, @program_id INT, @activo BIT, @admin_id INT)
export async function guardarAsignacion({ employeeId, programId, activo, adminId }) {
  await executeProcedure('SP_PPR_ADMIN_GUARDAR_ASIGNACION', [
    { name: 'idempleado', type: sql.Int, value: Number(employeeId) },
    { name: 'program_id', type: sql.Int, value: Number(programId) },
    { name: 'activo', type: sql.Bit, value: activo ? 1 : 0 },
    { name: 'admin_id', type: sql.Int, value: Number(adminId) },
  ])
}

// SP_PPR_RESUMEN_ANUAL(@employee_id INT, @year INT)
// Returns: program_id, program_code, program_name, period_id, month,
//          completadas, total_actividades, signed_at
export async function getResumenAnual(employeeId, year) {
  const rows = await executeProcedure('SP_PPR_RESUMEN_ANUAL', [
    { name: 'employee_id', type: sql.Int, value: Number(employeeId) },
    { name: 'year', type: sql.Int, value: Number(year) },
  ])
  const programaMap = new Map()
  for (const r of rows) {
    const pid = Number(r.program_id)
    if (!programaMap.has(pid)) {
      programaMap.set(pid, {
        programaId: pid,
        code: String(r.program_code ?? ''),
        name: String(r.program_name ?? ''),
        meses: [],
      })
    }
    programaMap.get(pid).meses.push({
      periodoId: r.period_id != null ? Number(r.period_id) : null,
      month: Number(r.month),
      label: periodLabel(year, r.month),
      completadas: Number(r.completadas ?? 0),
      totalActividades: Number(r.total_actividades ?? 0),
      isSigned: r.signed_at != null,
    })
  }
  return Array.from(programaMap.values())
}
