import express, { Request, Response, NextFunction } from 'express'
import cors from 'cors'
import helmet from 'helmet'
import compression from 'compression'
import hpp from 'hpp'
import { createServer } from 'http'
import { Server } from 'socket.io'
import 'dotenv/config'
import { initSentry } from './utils/sentry'
initSentry()

import path from 'path'
import routes from './routes'
import { handleWebhook } from './controllers/paymentsController'
import { errorHandler, notFoundHandler } from './middleware/errorHandler'
import { requestId, requestLogger } from './middleware/authMiddleware'
import { sanitizeMiddleware } from './middleware/sanitizeMiddleware'
import { csrfProtection, generateCsrfTokenForSession } from './middleware/csrfMiddleware'
import { sessionTimeoutMiddleware } from './middleware/sessionTimeoutMiddleware'
import {
  corsOptions,
  helmetConfig,
  generalRateLimit,
  authRateLimit,
  adminRateLimit,
  mfaRateLimit,
  csrfRateLimit,
} from './config'
import { createAdapter } from '@socket.io/redis-adapter'
import { createClient } from 'redis'
import logger from './utils/logger'
import { prisma } from './config'
import { config } from './utils/env'
import { startTokenCleanupScheduler, stopTokenCleanupScheduler } from './jobs/tokenCleanup'
import { startAiNotificationsJob, stopAiNotificationsJob } from './jobs/aiNotificationsJob'
import { startTestExpiryJob, stopTestExpiryJob } from './jobs/testExpiryJob'
import { startStaleSessionJob, stopStaleSessionJob } from './jobs/staleSessionJob'
import { setupWebSockets } from './websockets'
import { notificationService } from './services/NotificationService'
import { cacheService } from './services/CacheService'

const app = express()
const httpServer = createServer(app)
const io = new Server(httpServer, {
  cors: {
    origin: corsOptions.origin,
    methods: ['GET', 'POST'],
    credentials: true,
  },
  pingTimeout: 60000,
  pingInterval: 25000,
})

// Inject IO into NotificationService
notificationService.setSocketIO(io)

// Setup Redis adapter for Socket.IO if enabled
if (process.env.REDIS_ENABLED === 'true' && process.env.REDIS_URL) {
  const pubClient = createClient({ url: process.env.REDIS_URL })
  const subClient = pubClient.duplicate()

  Promise.all([pubClient.connect(), subClient.connect()])
    .then(() => {
      io.adapter(createAdapter(pubClient, subClient))
      logger.info('Socket.IO Redis adapter attached successfully')
    })
    .catch(err => {
      logger.error('Failed to connect Socket.IO Redis clients:', err)
    })
}

// Attach io to request for use in controllers
app.use((req: Request, _res: Response, next: NextFunction) => {
  req.io = io
  next()
})

// Request ID for tracing
app.use(requestId)
app.use(requestLogger)

// Security Middlewares
import { configureSecurity } from './middleware/securityMiddleware'
import { globalLimiter } from './middleware/rateLimiter'

configureSecurity(app)

app.use(compression())

// Apply Global Rate Limiting
app.use(globalLimiter)

// IMPORTANT: Stripe webhook MUST receive raw body before express.json() parsing.
// Mount it before body-parsing middleware so the raw Buffer is preserved for
// signature verification.
app.post('/api/v1/payments/webhook', express.raw({ type: 'application/json' }), handleWebhook)

// Body parsing (after webhook route)
app.use(express.json({ limit: '1mb' }))
app.use(express.urlencoded({ extended: true, limit: '1mb' }))

// Global Input Sanitization
app.use(sanitizeMiddleware)

// CSRF Protection — skip for safe methods, webhooks, and auth routes
app.use('/api/v1', csrfProtection)

// Serve uploads statically
app.use('/uploads', express.static(path.join(process.cwd(), 'uploads')))

// CSRF token generation endpoint (for frontend to fetch) — rate limited
app.get('/api/v1/csrf-token', csrfRateLimit, async (req: Request, res: Response) => {
  const sessionId = req.headers['x-session-id'] as string
  if (!sessionId) {
    res.status(400).json({
      status: 'error',
      message: 'Missing session identifier',
      code: 'CSRF_MISSING_SESSION',
    })
    return
  }
  const token = await generateCsrfTokenForSession(sessionId)
  res.json({
    status: 'success',
    csrfToken: token,
  })
})

// Rate Limiting - General API
app.use(generalRateLimit)

// Session timeout enforcement (only active for authenticated requests)
app.use(sessionTimeoutMiddleware)

// API Routes - Versioned
// Apply specific rate limiting
app.use('/api/v1/auth', authRateLimit) // Stricter rate limiting for auth
app.use('/api/v1/admin', adminRateLimit) // Ultra-strict for admin
app.use('/api/v1/auth/mfa', mfaRateLimit) // Ultra-strict for MFA verification
app.use('/api/v1/auth/verify-mfa', mfaRateLimit)
import swaggerUi from 'swagger-ui-express'
import { swaggerSpec } from './config/swagger'

app.use('/api/v1', routes)

// Swagger Documentation Route (Only enabled in development or specific environments)
if (process.env.NODE_ENV !== 'production' || process.env.ENABLE_SWAGGER === 'true') {
  app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(swaggerSpec))
}

// SECURITY: Root mount removed — all API access must go through /api/v1/
// This ensures auth and admin rate limiters cannot be bypassed.

// Setup WebSocket logic
setupWebSockets(io)

import * as Sentry from '@sentry/node'
import { cleanupMemoryStore } from './middleware/rateLimiter'
import { stopCsrfCleanup } from './middleware/csrfMiddleware'

// Global Error Handlers
Sentry.setupExpressErrorHandler(app)
app.use(notFoundHandler)
app.use(errorHandler)

const PORT = config.port

const startServer = async (): Promise<void> => {
  await cacheService.connect()

  httpServer.listen(PORT, () => {
    logger.info(`Server running on http://localhost:${PORT}`)
    logger.info(`Environment: ${config.nodeEnv}`)
    startTokenCleanupScheduler()
    startAiNotificationsJob()
    startTestExpiryJob()
    startStaleSessionJob()
    logger.info(`Server is running on port ${config.port}`)
  })
}

void startServer()

// Track active connections for draining
const activeConnections = new Set<import('net').Socket>()

httpServer.on('connection', socket => {
  activeConnections.add(socket)
  socket.on('close', () => activeConnections.delete(socket))
})

const shutdownResources = async (): Promise<void> => {
  const results = await Promise.allSettled([
    cacheService.disconnect(),
    prisma.$disconnect(),
    Promise.resolve(cleanupMemoryStore()),
    Promise.resolve(stopCsrfCleanup()),
  ])

  for (const result of results) {
    if (result.status === 'rejected') {
      logger.error(
        '[Shutdown] Resource cleanup failed',
        result.reason instanceof Error ? result.reason : new Error(String(result.reason))
      )
    }
  }
}

// Graceful shutdown — ensures all connections and resources are properly closed
const gracefulShutdown = (signal: string) => {
  logger.info(`${signal} received, shutting down gracefully`)
  stopTokenCleanupScheduler()
  stopAiNotificationsJob()
  stopTestExpiryJob()
  stopStaleSessionJob()

  // Stop accepting new connections
  httpServer.close(async () => {
    // Force-drain remaining keep-alive connections
    for (const socket of activeConnections) {
      socket.destroy()
    }
    activeConnections.clear()

    await shutdownResources()
    logger.info('Server closed successfully')
    process.exit(0)
  })

  // Force kill after 15s if graceful shutdown hangs
  setTimeout(() => {
    logger.error('Forced shutdown after timeout')
    process.exit(1)
  }, 15000)
}

process.on('SIGTERM', () => gracefulShutdown('SIGTERM'))
process.on('SIGINT', () => gracefulShutdown('SIGINT'))

// Catch unhandled promise rejections to prevent silent crashes
process.on('unhandledRejection', (reason: unknown) => {
  logger.error('Unhandled Rejection', reason instanceof Error ? reason : new Error(String(reason)))
})

// Catch uncaught exceptions (last resort)
process.on('uncaughtException', (error: Error) => {
  logger.error('Uncaught Exception', error)
  gracefulShutdown('UNCAUGHT_EXCEPTION')
})

export { io }
export default httpServer
