import express from 'express'
import helmet from 'helmet'
import cors from 'cors'
import cookieParser from 'cookie-parser'
import { reportsRouter } from './routes/reports.js'
import { authRouter } from './routes/auth.js'
import { serverConfig } from './config.js'
import { closeSqlPool } from './db/sql-server.js'
import { requestContext } from './middleware/request-context.js'
import { errorHandler } from './middleware/error-handler.js'
import { apiLimiter } from './middleware/rate-limit.js'
import { logger } from './utils/logger.js'

const app = express()

// Trust reverse proxy headers only in production (nginx, etc.)
if (serverConfig.isProduction) {
  app.set('trust proxy', 1)
}

// Security headers via helmet
app.use(
  helmet({
    contentSecurityPolicy: {
      directives: {
        defaultSrc: ["'self'"],
        scriptSrc: ["'self'"],
        styleSrc: ["'self'", "'unsafe-inline'"],
        imgSrc: ["'self'", 'data:'],
        connectSrc: ["'self'"],
        fontSrc: ["'self'"],
        objectSrc: ["'none'"],
        frameSrc: ["'none'"],
      },
    },
    crossOriginEmbedderPolicy: false,
  }),
)

// CORS — only when frontend and backend run cross-origin (configured via CORS_ORIGIN env)
if (serverConfig.corsOrigins) {
  app.use(
    cors({
      origin: (origin, callback) => {
        // Allow requests with no origin (same-origin, server-to-server)
        if (!origin || serverConfig.corsOrigins.includes(origin)) {
          callback(null, true)
        } else {
          callback(new Error('Origen no permitido por política CORS.'))
        }
      },
      credentials: true,
      methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
      allowedHeaders: ['Content-Type', 'X-Requested-With'],
    }),
  )
}

// Cookie parser (required for reading session cookies)
app.use(cookieParser())

// Body parsing with conservative limits (prevents large payload attacks)
app.use(express.json({ limit: '100kb' }))
app.use(express.urlencoded({ extended: false, limit: '100kb' }))

// Attach correlation ID and structured request logging
app.use(requestContext)

// General API rate limit on the entire legacy-api prefix
app.use('/legacy-api', apiLimiter)

// Auth routes (login/me/logout) — mounted before reports so they are always reachable
app.use('/legacy-api', authRouter)

// Application routes
app.use('/legacy-api', reportsRouter)

// Centralized error handler — must be last
app.use(errorHandler)

const server = app.listen(serverConfig.port, () => {
  logger.info({
    event: 'server:start',
    port: serverConfig.port,
    environment: serverConfig.isProduction ? 'production' : 'development',
    message: `legacy-api escuchando en http://localhost:${serverConfig.port}`,
  })
})

server.on('error', (error) => {
  logger.error({ event: 'server:listen-error', message: error.message, code: error.code })
  process.exit(1)
})

async function shutdown(signal) {
  logger.info({ event: 'server:shutdown', signal })
  server.close(async () => {
    await closeSqlPool().catch((error) => {
      logger.error({ event: 'server:shutdown:pool-close-error', message: error.message })
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
