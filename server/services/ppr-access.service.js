export const PPR_READONLY_EMPLOYEE_IDS = new Set([
  3833,
  4064,
  5526,
  4550,
  6358,
  3436,
  6739,
  3137,
])

export function isPprReadOnlyEmployee(employeeId) {
  return PPR_READONLY_EMPLOYEE_IDS.has(Number(employeeId))
}

export function normalizePprPortalRole(rawRole, employeeId) {
  const role = String(rawRole ?? '').toLowerCase().trim()
  if (role === 'admin') return 'admin'
  if (isPprReadOnlyEmployee(employeeId) || ['consulta', 'viewer', 'lector', 'read_only'].includes(role)) {
    return 'consulta'
  }
  return 'coordinador'
}
