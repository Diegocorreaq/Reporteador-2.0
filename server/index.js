import express from 'express'
import { reportsRouter } from './routes/reports.js'
import { serverConfig } from './config.js'
import { closeSqlPool } from './db/sql-server.js'

const app = express()

app.disable('x-powered-by')
app.use(express.json())
app.use('/legacy-api', reportsRouter)

app.use((error, _request, response, _next) => {
  console.error('legacy-api error', error)
  response.status(500).json({
    message: 'Error interno del servidor.',
  })
})

const server = app.listen(serverConfig.port, () => {
  console.log(`legacy-api escuchando en http://localhost:${serverConfig.port}`)
})

async function shutdown(signal) {
  console.log(`Cerrando legacy-api por ${signal}...`)
  server.close(async () => {
    await closeSqlPool().catch((error) => {
      console.error('No se pudo cerrar el pool SQL.', error)
    })
    process.exit(0)
  })
}

process.on('SIGINT', () => {
  void shutdown('SIGINT')
})

process.on('SIGTERM', () => {
  void shutdown('SIGTERM')
})
