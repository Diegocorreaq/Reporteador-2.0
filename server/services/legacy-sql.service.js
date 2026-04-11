import { getSqlPool, sql } from '../db/sql-server.js'

function inferSqlType(value) {
  if (typeof value === 'number' && Number.isInteger(value)) {
    return sql.Int
  }

  if (typeof value === 'number') {
    return sql.Float
  }

  if (typeof value === 'boolean') {
    return sql.Bit
  }

  return sql.NVarChar
}

function normalizeValue(value) {
  if (value instanceof Date) {
    return value.toISOString()
  }

  return value
}

function normalizeRecordset(recordset = []) {
  return recordset.map((row) =>
    Object.fromEntries(Object.entries(row).map(([key, value]) => [key, normalizeValue(value)])),
  )
}

function applyParams(request, params = []) {
  params.forEach((param, index) => {
    const name = param.name ?? `p${index}`
    request.input(name, param.type ?? inferSqlType(param.value), param.value)
  })

  return params.map((param, index) => `@${param.name ?? `p${index}`}`).join(', ')
}

export async function executeProcedure(name, params = [], options = {}) {
  const pool = await getSqlPool()
  const request = pool.request()

  if (options.timeoutMs) {
    request.timeout = options.timeoutMs
  }

  const placeholders = applyParams(request, params)
  const query = placeholders ? `EXEC ${name} ${placeholders}` : `EXEC ${name}`
  const result = await request.query(query)

  return normalizeRecordset(result.recordset)
}

export async function executeQuery(query, params = [], options = {}) {
  const pool = await getSqlPool()
  const request = pool.request()

  if (options.timeoutMs) {
    request.timeout = options.timeoutMs
  }

  applyParams(request, params)

  const result = await request.query(query)
  return normalizeRecordset(result.recordset)
}

export { sql }
