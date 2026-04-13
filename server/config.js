import dotenv from 'dotenv'

dotenv.config()

function toNumber(value, fallback) {
  const parsed = Number(value)

  return Number.isFinite(parsed) ? parsed : fallback
}

function toBoolean(value, fallback) {
  if (value === undefined) {
    return fallback
  }

  return ['1', 'true', 'yes', 'on'].includes(String(value).toLowerCase())
}

function buildDbConfig(prefix = '') {
  const hostKey = prefix ? `${prefix}_HOST` : 'SQL_HOST'
  const portKey = prefix ? `${prefix}_PORT` : 'SQL_PORT'
  const dbKey = prefix ? `${prefix}_DATABASE` : 'SQL_DATABASE'
  const userKey = prefix ? `${prefix}_USER` : 'SQL_USER'
  const passKey = prefix ? `${prefix}_PASSWORD` : 'SQL_PASSWORD'
  const encKey = prefix ? `${prefix}_ENCRYPT` : 'SQL_ENCRYPT'
  const trustKey = prefix ? `${prefix}_TRUST_CERT` : 'SQL_TRUST_CERT'
  const poolKey = prefix ? `${prefix}_POOL_MAX` : 'SQL_POOL_MAX'

  return {
    server: process.env[hostKey] ?? '192.168.32.129',
    port: toNumber(process.env[portKey], 1433),
    database: process.env[dbKey] ?? 'SIGH_DEPURA',
    user: process.env[userKey] ?? '',
    password: process.env[passKey] ?? '',
    options: {
      encrypt: toBoolean(process.env[encKey], false),
      trustServerCertificate: toBoolean(process.env[trustKey], true),
      enableArithAbort: true,
      appName: 'Reporteador-2.0',
    },
    pool: {
      max: toNumber(process.env[poolKey], 10),
      min: 0,
      idleTimeoutMillis: 30000,
    },
  }
}

export const serverConfig = {
  port: toNumber(process.env.SERVER_PORT, 8787),
  db: {
    // General connection for main app
    general: buildDbConfig(''),

    // SIGH connection 1 (default for most SIGH modules)
    sigh1: buildDbConfig('SIGH_SQL1'),

    // SIGH connection 2 (for Producción de Médicos)
    sigh2: buildDbConfig('SIGH_SQL2'),
  },
}
