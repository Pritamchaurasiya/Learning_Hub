import 'dotenv/config'
import path from 'path'
import express, { Request, Response, NextFunction } from 'express'
import compression from 'compression'
import http from 'http'
import net from 'net'
import { Server } from 'socket.io'
import swaggerUi from 'swagger-ui-express'
import * as Sentry from '@sentry/node'
import { createAdapter } from '@socket.io/redis-adapter'
import { createClient } from 'redis'
import { initSentry } from './utils/sentry'
initSentry()

import routes from './routes'
import { errorHandler, notFoundHandler } from './middleware/errorHandler'
import { requestId, requestLogger } from './middleware/requestLogger'
import { sanitizeMiddleware } from './middleware/sanitizeMiddleware'
import { csrfProtection, generateCsrfTokenForSession } from './middleware/csrfMiddleware'
import { sendError, sendSuccess } from './utils/responseHelper'
import { cookieMiddleware } from './utils/cookies'
import {
  corsOptions,
  authRateLimit,
  adminRateLimit,
  mfaRateLimit,
  csrfRateLimit,
  prisma,
} from './config'
import { swaggerSpec } from './config/swagger'
import logger from './utils/logger'
import { config } from './utils/env'
import { startTokenCleanupScheduler, stopTokenCleanupScheduler } from './jobs/tokenCleanup'
import { startAiNotificationsJob, stopAiNotificationsJob } from './jobs/aiNotificationsJob'
import { startTestExpiryJob, stopTestExpiryJob } from './jobs/testExpiryJob'
import { startStaleSessionJob, stopStaleSessionJob } from './jobs/staleSessionJob'
import { configureSecurity } from './middleware/securityMiddleware'
import { globalLimiter, stopMemoryStoreCleanup } from './middleware/rateLimiter'
import { stopUserRateLimitCleanup } from './middleware/userRateLimit'
import { anomalyDetection } from './middleware/anomalyDetection'
import { setupWebSockets } from './websockets'
import { notificationService } from './services/NotificationService'
import { webSocketService } from './services/WebSocketService'
import { cacheService } from './services/CacheService'

const app = express()
const httpServer = http.createServer(app)
const io = new Server(httpServer, {
  cors: {
    origin: corsOptions.origin,
    methods: ['GET', 'POST'],
    credentials: true,
  },
  pingTimeout: 60000,
  pingInterval: 25000,
  maxHttpBufferSize: 10000,
})

notificationService.setSocketIO(io)
webSocketService.setSocketIO(io)

let ioPubClient: ReturnType<typeof createClient> | undefined
let ioSubClient: ReturnType<typeof createClient> | undefined

if (process.env.REDIS_ENABLED === 'true' && process.env.REDIS_URL) {
  ioPubClient = createClient({ url: process.env.REDIS_URL })
  ioSubClient = ioPubClient.duplicate()

  Promise.all([ioPubClient.connect(), ioSubClient.connect()])
    .then(() => {
      if (ioPubClient && ioSubClient) {
        io.adapter(createAdapter(ioPubClient, ioSubClient))
        logger.info('Socket.IO Redis adapter attached successfully')
      }
    })
    .catch(err => {
      logger.error('Failed to connect Socket.IO Redis clients:', err)
    })
}

app.use((req: Request, _res: Response, next: NextFunction) => {
  req.io = io
  next()
})

app.use(requestId)
app.use(requestLogger)

configureSecurity(app)
app.use(compression())
app.use(globalLimiter)
app.use(express.json({ limit: '1mb' }))
app.use(express.urlencoded({ extended: true, limit: '1mb' }))
app.use(cookieMiddleware)
app.use(sanitizeMiddleware)
app.use('/api/v1', csrfProtection)

app.use('/uploads', express.static(path.join(process.cwd(), 'uploads')))

app.get('/api/v1/csrf-token', csrfRateLimit, async (req: Request, res: Response) => {
  const sessionId = req.headers['x-session-id'] as string
  if (!sessionId) {
    sendError(res, 'Missing session identifier', 400, 'CSRF_MISSING_SESSION')
    return
  }
  const token = await generateCsrfTokenForSession(sessionId)
  sendSuccess(res, { csrfToken: token })
})

app.get('/api/v1/health', async (_req: Request, res: Response) => {
  const start = Date.now()
  let dbHealthy = false
  let dbLatency = 0
  try {
    await prisma.$queryRaw`SELECT 1`
    dbLatency = Date.now() - start
    dbHealthy = true
  } catch {
    dbLatency = Date.now() - start
  }
  sendSuccess(res, {
    status: 'ok',
    version: '1.0.0',
    uptime: process.uptime(),
    database: { healthy: dbHealthy, latency: dbLatency },
  })
})

app.use('/api/v1/auth', authRateLimit)
app.use('/api/v1/admin', adminRateLimit)
app.use('/api/v1/auth/mfa', mfaRateLimit)
app.use('/api/v1/auth/verify-mfa', mfaRateLimit)

app.use('/api/v1', anomalyDetection)
app.use('/api/v1', routes)

if (process.env.NODE_ENV !== 'production' || process.env.ENABLE_SWAGGER === 'true') {
  app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(swaggerSpec))
}

setupWebSockets(io)

Sentry.setupExpressErrorHandler(app)
app.use(notFoundHandler)
app.use(errorHandler)

const PORT = config.port

async function warmup(): Promise<void> {
  logger.info('[Warmup] Starting cache pre-warm...')
  try {
    await cacheService.warm([
      {
        key: cacheService.generateKey('courses', 'list', 'all'),
        factory: async () => ({ status: 'warmed' }),
        ttl: 300,
      },
    ])
    const testCount = await prisma.test.count({ where: { isPublished: true, deletedAt: null } })
    if (testCount > 0) {
      const tests = await prisma.test.findMany({
        where: { isPublished: true, deletedAt: null },
        take: 20,
        orderBy: { createdAt: 'desc' },
        include: {
          _count: { select: { questions: true, results: true } },
          exam: {
            select: {
              id: true,
              name: true,
              slug: true,
              country: { select: { id: true, name: true, code: true } },
            },
          },
        },
      })
      await cacheService.set(
        cacheService.generateKey('listTests', '{"page":"1","limit":"20"}'),
        {
          data: tests,
          meta: { page: 1, limit: 20, total: testCount, totalPages: Math.ceil(testCount / 20) },
        },
        60
      )
    }
    logger.info('[Warmup] Cache pre-warm complete')
  } catch (err) {
    logger.warn(
      `[Warmup] Pre-warm encountered errors (non-fatal): ${err instanceof Error ? err.message : String(err)}`
    )
  }
}

const startServer = async (): Promise<void> => {
  await cacheService.connect()
  await prisma.$connect()
  logger.info('Database connection pool initialized')
  void warmup()

  httpServer.listen(PORT, () => {
    startTokenCleanupScheduler()
    startAiNotificationsJob()
    startTestExpiryJob()
    startStaleSessionJob()
    logger.info(`Server running on port ${config.port} [${config.nodeEnv}]`)
  })
}

void startServer()

const activeConnections = new Set<net.Socket>()

httpServer.on('connection', socket => {
  activeConnections.add(socket)
  socket.on('close', () => activeConnections.delete(socket))
})

const shutdownResources = async (): Promise<void> => {
  stopUserRateLimitCleanup()
  const shutdownTasks: Promise<unknown>[] = [
    cacheService.disconnect(),
    prisma.$disconnect(),
    Promise.resolve(stopMemoryStoreCleanup()),
  ]

  if (ioPubClient) shutdownTasks.push(ioPubClient.quit())
  if (ioSubClient) shutdownTasks.push(ioSubClient.quit())

  const results = await Promise.allSettled(shutdownTasks)

  for (const result of results) {
    if (result.status === 'rejected') {
      logger.error(
        '[Shutdown] Resource cleanup failed',
        result.reason instanceof Error ? result.reason : new Error(String(result.reason))
      )
    }
  }
}

const gracefulShutdown = (signal: string) => {
  logger.info(`${signal} received, shutting down gracefully`)
  stopTokenCleanupScheduler()
  stopAiNotificationsJob()
  stopTestExpiryJob()
  stopStaleSessionJob()

  httpServer.close(async () => {
    for (const socket of activeConnections) {
      socket.destroy()
    }
    activeConnections.clear()
    await shutdownResources()
    logger.info('Server closed successfully')
    process.exit(0)
  })

  setTimeout(() => {
    logger.error('Forced shutdown after timeout')
    process.exit(1)
  }, 15000)
}

process.on('SIGTERM', () => gracefulShutdown('SIGTERM'))
process.on('SIGINT', () => gracefulShutdown('SIGINT'))
process.on('unhandledRejection', (reason: unknown) => {
  logger.error('Unhandled Rejection', reason instanceof Error ? reason : new Error(String(reason)))
  gracefulShutdown('UNHANDLED_REJECTION')
})
process.on('uncaughtException', (error: Error) => {
  logger.error('Uncaught Exception', error)
  gracefulShutdown('UNCAUGHT_EXCEPTION')
})

export { io }
export default httpServer
