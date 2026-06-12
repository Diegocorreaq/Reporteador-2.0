import sql from 'mssql'
import { serverConfig } from '../config.js'

const poolPromises = {
  general: null,
  sigh1: null,
  sigh2: null,
  cnv: null,
}

function assertCredentials(dbConfig) {
  if (!dbConfig.user || !dbConfig.password) {
    throw new Error(
      'Faltan SQL_USER y SQL_PASSWORD. Configura las credenciales en .env para habilitar consultas directas a SQL Server.',
    )
  }
}

export async function getSqlPool(connectionName = 'general') {
  if (!poolPromises[connectionName]) {
    const dbConfig = serverConfig.db[connectionName]

    if (!dbConfig) {
      throw new Error(`Connection '${connectionName}' is not configured.`)
    }

    assertCredentials(dbConfig)

    poolPromises[connectionName] = new sql.ConnectionPool(dbConfig)
      .connect()
      .catch((error) => {
        poolPromises[connectionName] = null
        throw error
      })
  }

  return poolPromises[connectionName]
}

export async function closeSqlPool(connectionName) {
  if (connectionName) {
    // Close specific connection
    if (!poolPromises[connectionName]) {
      return
    }

    const pool = await poolPromises[connectionName]
    poolPromises[connectionName] = null
    await pool.close()
  } else {
    // Close all connections
    await Promise.all(
      Object.keys(poolPromises).map((name) => {
        if (!poolPromises[name]) {
          return Promise.resolve()
        }

        return poolPromises[name].then((pool) => {
          poolPromises[name] = null
          return pool.close()
        })
      }),
    )
  }
}

export { sql }
