import dotenv from 'dotenv'
import { logger } from './utils/logger.js'

dotenv.config()

const isProduction = process.env.NODE_ENV === 'production'

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

function buildDbConfig(prefix = '', overrides = {}) {
  const hostKey = prefix ? `${prefix}_HOST` : 'SQL_HOST'
  const portKey = prefix ? `${prefix}_PORT` : 'SQL_PORT'
  const dbKey = overrides.databaseKey ?? (prefix ? `${prefix}_DATABASE` : 'SQL_DATABASE')
  const userKey = prefix ? `${prefix}_USER` : 'SQL_USER'
  const passKey = prefix ? `${prefix}_PASSWORD` : 'SQL_PASSWORD'
  const encKey = prefix ? `${prefix}_ENCRYPT` : 'SQL_ENCRYPT'
  const trustKey = prefix ? `${prefix}_TRUST_CERT` : 'SQL_TRUST_CERT'
  const poolKey = prefix ? `${prefix}_POOL_MAX` : 'SQL_POOL_MAX'
  const requestTimeoutKey = prefix ? `${prefix}_REQUEST_TIMEOUT` : 'SQL_REQUEST_TIMEOUT'
  const connectionTimeoutKey = prefix ? `${prefix}_CONNECTION_TIMEOUT` : 'SQL_CONNECTION_TIMEOUT'

  const encrypt = toBoolean(process.env[encKey], isProduction)
  const trustServerCertificate = toBoolean(process.env[trustKey], !isProduction)

  if (isProduction && !encrypt) {
    logger.warn({
      event: 'config:sql-insecure',
      prefix: prefix || 'general',
      message: `SQL connection '${prefix || 'general'}' has encrypt=false in production. Set ${encKey}=true.`,
    })
  }

  if (isProduction && trustServerCertificate) {
    logger.warn({
      event: 'config:sql-insecure',
      prefix: prefix || 'general',
      message: `SQL connection '${prefix || 'general'}' has trustServerCertificate=true in production. Set ${trustKey}=false.`,
    })
  }

  return {
    server: process.env[hostKey] ?? overrides.defaultHost ?? '192.168.32.129',
    port: toNumber(process.env[portKey], 1433),
    database: process.env[dbKey] ?? overrides.defaultDatabase ?? 'SIGH_DEPURA',
    user: process.env[userKey] ?? '',
    password: process.env[passKey] ?? '',
    requestTimeout: Math.max(toNumber(process.env[requestTimeoutKey], 180000), 30000),
    connectionTimeout: Math.max(toNumber(process.env[connectionTimeoutKey], 30000), 30000),
    options: {
      encrypt,
      trustServerCertificate,
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

function validateProductionConfig() {
  if (!isProduction) return

  const missing = []

  if (!process.env.JWT_SECRET) {
    missing.push('JWT_SECRET')
  }

  if (missing.length > 0) {
    // Fail fast — missing critical secret in production
    logger.error({
      event: 'config:startup-validation-failed',
      missing,
      message: `Variables de entorno críticas no configuradas en producción: ${missing.join(', ')}`,
    })
    process.exit(1)
  }
}

if (!process.env.JWT_SECRET) {
  if (isProduction) {
    // Already handled above via validateProductionConfig
  } else {
    logger.warn({
      event: 'config:jwt-secret-missing',
      message:
        'JWT_SECRET no está configurado. Las sesiones no serán seguras. Configura JWT_SECRET en .env.',
    })
  }
}

// Parse allowed CORS origins from env (comma-separated list)
function parseCorsOrigins() {
  const raw = process.env.CORS_ORIGIN
  if (!raw) return null
  return raw
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean)
}

export const serverConfig = {
  port: toNumber(process.env.SERVER_PORT, 8787),
  isProduction,
  jwtSecret: process.env.JWT_SECRET ?? 'dev-insecure-secret-change-in-production',
  corsOrigins: parseCorsOrigins(),
  db: {
    general: buildDbConfig(''),
    sigh1: buildDbConfig('SIGH_SQL1'),
    sigh2: buildDbConfig('SIGH_SQL2'),
    cnv: buildDbConfig('CNV_DB', {
      databaseKey: 'CNV_DB_NAME',
      defaultHost: '192.168.32.129',
      defaultDatabase: 'SIGH_DEPURA',
    }),
  },
}

// Validate required production config (must run after serverConfig is defined)
validateProductionConfig()
