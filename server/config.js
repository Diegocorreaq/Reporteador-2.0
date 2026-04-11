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

export const serverConfig = {
  port: toNumber(process.env.SERVER_PORT, 8787),
  db: {
    server: process.env.SQL_HOST ?? '192.168.32.129',
    port: toNumber(process.env.SQL_PORT, 1433),
    database: process.env.SQL_DATABASE ?? 'SIGH_DEPURA',
    user: process.env.SQL_USER ?? '',
    password: process.env.SQL_PASSWORD ?? '',
    options: {
      encrypt: toBoolean(process.env.SQL_ENCRYPT, false),
      trustServerCertificate: toBoolean(process.env.SQL_TRUST_CERT, true),
      enableArithAbort: true,
      appName: 'Reporteador-2.0',
    },
    pool: {
      max: toNumber(process.env.SQL_POOL_MAX, 10),
      min: 0,
      idleTimeoutMillis: 30000,
    },
  },
}
