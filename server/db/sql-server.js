import sql from 'mssql'
import { serverConfig } from '../config.js'

let poolPromise = null

function assertCredentials() {
  if (!serverConfig.db.user || !serverConfig.db.password) {
    throw new Error(
      'Faltan SQL_USER y SQL_PASSWORD. Configura las credenciales en .env para habilitar consultas directas a SQL Server.',
    )
  }
}

export async function getSqlPool() {
  if (!poolPromise) {
    assertCredentials()

    poolPromise = new sql.ConnectionPool(serverConfig.db)
      .connect()
      .catch((error) => {
        poolPromise = null
        throw error
      })
  }

  return poolPromise
}

export async function closeSqlPool() {
  if (!poolPromise) {
    return
  }

  const pool = await poolPromise
  poolPromise = null
  await pool.close()
}

export { sql }
