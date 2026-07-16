const PPR_SCOPE_ADMIN_EMPLOYEE_IDS = new Set([5713])

const PPR_0002_NEONATOLOGIA_CODES = new Set(['3330505', '3330501', '3330506', '3330619'])

const PPR_0002_COMPLICACIONES_CODES = new Set([
  '3330601',
  '3330621',
  '3330622',
  '3330623',
  '3330624',
  '3330625',
  '3330626',
  '3330627',
  '3330628',
  '3330629',
  '3330701',
  '3330711',
  '3330713',
  '3330714',
  '3330715',
  '3330716',
  '3330717',
  '3330718',
  '3330719',
  '3330720',
])

const PPR_0016_TBC_CODES = new Set([
  '4395701',
  '4396201',
  '4396202',
  '4396401',
  '4396402',
  '4396505',
  '4396506',
  '4397301',
  '4397302',
  '4397303',
  '4397304',
  '4397305',
  '4396305',
  '4397201',
])

const PPR_0018_ODONTOLOGIA_CODES = new Set([
  '0068001',
  '0068002',
  '0068003',
  '0068101',
  '5000601',
  '5000602',
  '5000606',
  '5000701',
  '5000702',
  '5000703',
  '5000704',
  '5000705',
  '5000804',
  '5000814',
  '5000815',
  '5000816',
  '5000817',
  '5000818',
])

const PPR_0018_CRONICOS_CODES = new Set([
  '5001606',
  '5001608',
  '5001704',
  '5001705',
])

const PPR_ACTIVITY_GROUPS = {
  2: {
    NEO: { code: 'NEO', name: 'Neonatologia', sortOrder: 1 },
    COMP: { code: 'COMP', name: 'Con complicaciones', sortOrder: 2 },
    OBS: { code: 'OBS', name: 'Obstetricia', sortOrder: 3 },
  },
  16: {
    TBC: { code: 'TBC', name: 'TBC', sortOrder: 1 },
    VIH: { code: 'VIH', name: 'VIH/SIDA', sortOrder: 2 },
  },
  18: {
    OFT: { code: 'OFT', name: 'Oftalmologia', sortOrder: 1 },
    ODONTO: { code: 'ODONTO', name: 'Odontologia', sortOrder: 2 },
    CRON: { code: 'CRON', name: 'Cronicos', sortOrder: 3 },
  },
}

const PPR_ACTIVITY_GROUP_SCOPES = {
  2: {
    2586: new Set(['NEO']),
    2865: new Set(['OBS']),
    4758: new Set(['COMP']),
  },
  16: {
    2582: new Set(['TBC']),
    4226: new Set(['VIH']),
  },
  18: {
    1780: new Set(['OFT']),
    1929: new Set(['CRON']),
    2791: new Set(['ODONTO']),
  },
}

export function normalizePprProgramCode(value) {
  const normalized = String(value ?? '').trim().replace(/^0+/, '')
  return normalized || '0'
}

export function extractPprActivitySourceKey(value) {
  return String(value ?? '').match(/\b(\d{7})\b/)?.[1] ?? null
}

export function getPprActivityGroupDefinition(programCode, groupCode) {
  const programGroups = PPR_ACTIVITY_GROUPS[normalizePprProgramCode(programCode)] ?? {}
  return programGroups[String(groupCode ?? '').trim().toUpperCase()] ?? null
}

export function resolvePprActivityGroup(programCode, activityName, explicitGroupCode = null) {
  const normalizedProgramCode = normalizePprProgramCode(programCode)
  const explicitGroup = getPprActivityGroupDefinition(normalizedProgramCode, explicitGroupCode)
  if (explicitGroup) return explicitGroup

  const activityCode = extractPprActivitySourceKey(activityName)

  if (normalizedProgramCode === '2') {
    if (PPR_0002_NEONATOLOGIA_CODES.has(activityCode)) {
      return PPR_ACTIVITY_GROUPS[2].NEO
    }
    if (PPR_0002_COMPLICACIONES_CODES.has(activityCode)) {
      return PPR_ACTIVITY_GROUPS[2].COMP
    }
    return PPR_ACTIVITY_GROUPS[2].OBS
  }

  if (normalizedProgramCode === '16') {
    if (PPR_0016_TBC_CODES.has(activityCode)) {
      return PPR_ACTIVITY_GROUPS[16].TBC
    }
    return PPR_ACTIVITY_GROUPS[16].VIH
  }

  if (normalizedProgramCode === '18') {
    if (PPR_0018_CRONICOS_CODES.has(activityCode)) {
      return PPR_ACTIVITY_GROUPS[18].CRON
    }
    if (PPR_0018_ODONTOLOGIA_CODES.has(activityCode)) {
      return PPR_ACTIVITY_GROUPS[18].ODONTO
    }
    return PPR_ACTIVITY_GROUPS[18].OFT
  }

  return null
}

export function getPprEmployeeActivityScope(programCode, employeeId) {
  if (PPR_SCOPE_ADMIN_EMPLOYEE_IDS.has(Number(employeeId))) return null

  const programScopes = PPR_ACTIVITY_GROUP_SCOPES[normalizePprProgramCode(programCode)]
  if (!programScopes) return null

  return programScopes[Number(employeeId)] ?? null
}

export function canPprEmployeeEditActivity({ programCode, activityName, activityGroupCode, employeeId }) {
  if (PPR_SCOPE_ADMIN_EMPLOYEE_IDS.has(Number(employeeId))) return true

  const normalizedProgramCode = normalizePprProgramCode(programCode)
  const programGroups = PPR_ACTIVITY_GROUPS[normalizedProgramCode]
  if (!programGroups) return true

  const scope = getPprEmployeeActivityScope(normalizedProgramCode, employeeId)
  if (!scope) return false

  const group = resolvePprActivityGroup(normalizedProgramCode, activityName, activityGroupCode)
  return group ? scope.has(group.code) : false
}

export function getPprEmployeeActivityScopeGroups(programCode, employeeId) {
  const scope = getPprEmployeeActivityScope(programCode, employeeId)
  if (!scope) return []

  const programGroups = PPR_ACTIVITY_GROUPS[normalizePprProgramCode(programCode)] ?? {}
  return Array.from(scope)
    .map((groupCode) => programGroups[groupCode])
    .filter(Boolean)
    .sort((a, b) => a.sortOrder - b.sortOrder)
}

export function getPprProgramActivityGroups(programCode) {
  const programGroups = PPR_ACTIVITY_GROUPS[normalizePprProgramCode(programCode)] ?? {}
  return Object.values(programGroups).sort((a, b) => a.sortOrder - b.sortOrder)
}

export function filterPprActivitiesForEmployee(rows, { programCodeKey, activityNameKey, employeeId }) {
  return rows.filter((row) => {
    return canPprEmployeeEditActivity({
      programCode: row[programCodeKey],
      activityName: row[activityNameKey],
      activityGroupCode: row.activity_group_code,
      employeeId,
    })
  })
}
