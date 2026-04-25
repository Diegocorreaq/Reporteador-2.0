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
