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

/**
 * Execute a stored procedure with automatic connection resolution
 * @param {string} name - Procedure name
 * @param {Array} params - Parameters
 * @param {Object} options - Options
 * @param {number} [options.timeoutMs] - Query timeout
 * @param {string} [options.connection] - Connection name: 'general' (default), 'sigh1', or 'sigh2'
 * @returns {Promise<Array>} Recordset
 */
export async function executeProcedure(name, params = [], options = {}) {
  const connectionName = options.connection ?? 'general'
  const pool = await getSqlPool(connectionName)
  const request = pool.request()

  if (options.timeoutMs) {
    request.timeout = options.timeoutMs
  }

  const placeholders = applyParams(request, params)
  const query = placeholders ? `EXEC ${name} ${placeholders}` : `EXEC ${name}`
  const result = await request.query(query)

  return normalizeRecordset(result.recordset)
}

/**
 * Execute a stored procedure and return every resultset.
 * Useful for exports where one procedure returns multiple report blocks.
 * @param {string} name - Procedure name
 * @param {Array} params - Parameters
 * @param {Object} options - Options
 * @param {number} [options.timeoutMs] - Query timeout
 * @param {string} [options.connection] - Connection name
 * @returns {Promise<Array<Array>>} All normalized recordsets
 */
export async function executeProcedureRecordsets(name, params = [], options = {}) {
  const connectionName = options.connection ?? 'general'
  const pool = await getSqlPool(connectionName)
  const request = pool.request()

  if (options.timeoutMs) {
    request.timeout = options.timeoutMs
  }

  params.forEach((param, index) => {
    const paramName = param.name ?? `p${index}`
    request.input(paramName, param.type ?? inferSqlType(param.value), param.value)
  })

  const result = await request.execute(name)
  return (result.recordsets ?? []).map((recordset) => normalizeRecordset(recordset))
}

/**
 * Execute a SQL query with automatic connection resolution
 * @param {string} query - SQL query
 * @param {Array} params - Parameters
 * @param {Object} options - Options
 * @param {number} [options.timeoutMs] - Query timeout
 * @param {string} [options.connection] - Connection name: 'general' (default), 'sigh1', or 'sigh2'
 * @returns {Promise<Array>} Recordset
 */
export async function executeQuery(query, params = [], options = {}) {
  const connectionName = options.connection ?? 'general'
  const pool = await getSqlPool(connectionName)
  const request = pool.request()

  if (options.timeoutMs) {
    request.timeout = options.timeoutMs
  }

  applyParams(request, params)

  const result = await request.query(query)
  return normalizeRecordset(result.recordset)
}

export { sql }
