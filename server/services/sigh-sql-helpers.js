/**
 * Wrappers for legacy-sql service with pre-configured connections
 * This ensures each service module automatically uses the correct connection
 */

import { executeProcedure as baseProcedure, executeQuery as baseQuery, sql } from './legacy-sql.service.js'

/**
 * SIGH 1 - Default for most SIGH modules
 * Used by: monitoreo, gestion-cita, camas, exportaciones, etc.
 */
export async function executeProcedure_Sigh1(name, params = [], options = {}) {
  return baseProcedure(name, params, {
    ...options,
    connection: 'sigh1',
  })
}

export async function executeQuery_Sigh1(query, params = [], options = {}) {
  return baseQuery(query, params, {
    ...options,
    connection: 'sigh1',
  })
}

/**
 * SIGH 2 - Producción de Médicos only
 */
export async function executeProcedure_Sigh2(name, params = [], options = {}) {
  return baseProcedure(name, params, {
    ...options,
    connection: 'sigh2',
  })
}

export async function executeQuery_Sigh2(query, params = [], options = {}) {
  return baseQuery(query, params, {
    ...options,
    connection: 'sigh2',
  })
}

export async function executeProcedure_Cnv(name, params = [], options = {}) {
  return baseProcedure(name, params, {
    ...options,
    connection: 'cnv',
  })
}

/**
 * General - Main app modules
 */
export async function executeProcedure_General(name, params = [], options = {}) {
  return baseProcedure(name, params, {
    ...options,
    connection: 'general',
  })
}

export async function executeQuery_General(query, params = [], options = {}) {
  return baseQuery(query, params, {
    ...options,
    connection: 'general',
  })
}

export { sql }
