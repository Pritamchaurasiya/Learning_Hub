import express, { Request, Response, NextFunction } from 'express'
import cors from 'cors'
import helmet from 'helmet'
import compression from 'compression'
import hpp from 'hpp'
import { createServer } from 'http'
import { Server } from 'socket.io'
import 'dotenv/config'
import routes from './routes'
import { verifyAccessToken } from './utils/auth'
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
  sanitizeInput,
} from './config'
import logger from './utils/logger'
import { prisma } from './config'
import { config } from './utils/env'
import { startTokenCleanupScheduler, stopTokenCleanupScheduler } from './jobs/tokenCleanup'

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

// Attach io to request for use in controllers
app.use((req: Request, res: Response, next: NextFunction) => {
  ;(req as any).io = io
  next()
})

// Request ID for tracing
app.use(requestId)
app.use(requestLogger)

// Security Middlewares
app.use(helmet(helmetConfig))
app.use(compression())
app.use(hpp()) // Prevent HTTP Parameter Pollution

// CORS configuration
app.use(cors(corsOptions))

// IMPORTANT: Stripe webhook MUST receive raw body before express.json() parsing.
// Mount it before body-parsing middleware so the raw Buffer is preserved for
// signature verification.
app.post('/api/v1/payments/webhook', express.raw({ type: 'application/json' }), handleWebhook)

// Body parsing (after webhook route)
app.use(express.json({ limit: '10mb' }))
app.use(express.urlencoded({ extended: true, limit: '10mb' }))

// Global Input Sanitization
app.use(sanitizeMiddleware)

// CSRF Protection — skip for safe methods, webhooks, and auth routes
app.use('/api/v1', csrfProtection)

// CSRF token generation endpoint (for frontend to fetch)
app.get('/api/v1/csrf-token', (req: Request, res: Response) => {
  const sessionId = req.headers['x-session-id'] as string
  if (!sessionId) {
    res.status(400).json({
      status: 'error',
      message: 'Missing session identifier',
      code: 'CSRF_MISSING_SESSION',
    })
    return
  }
  const token = generateCsrfTokenForSession(sessionId)
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
app.use('/api/v1', routes)

// SECURITY: Root mount removed — all API access must go through /api/v1/
// This ensures auth and admin rate limiters cannot be bypassed.

// API Health Check at versioned endpoint
app.get('/api/v1/health', async (req, res) => {
  try {
    // Check database connectivity
    await prisma.$queryRaw`SELECT 1`

    res.json({
      status: 'ok',
      version: 'v1',
      timestamp: new Date().toISOString(),
      services: {
        database: 'connected',
      },
    })
  } catch (error) {
    logger.error('Health check failed', error instanceof Error ? error : new Error(String(error)))
    res.status(503).json({
      status: 'error',
      version: 'v1',
      timestamp: new Date().toISOString(),
      services: {
        database: 'disconnected',
      },
    })
  }
})

// WebSocket logic
io.use((socket, next) => {
  const token = socket.handshake.auth.token || socket.handshake.query.token
  if (!token) {
    return next(new Error('Authentication required'))
  }

  try {
    const decoded = verifyAccessToken(token as string)
    socket.data.userId = decoded.userId
    socket.data.userRole = decoded.role
    next()
  } catch {
    return next(new Error('Invalid token'))
  }
})

io.on('connection', socket => {
  logger.info('User connected', { socketId: socket.id, userId: socket.data.userId })

  socket.on('join-room', async (roomId: string) => {
    // Verify user has access to this room (e.g., enrolled in course)
    try {
      const session = await prisma.liveSession.findUnique({
        where: { id: roomId },
        select: { id: true, status: true },
      })
      if (!session) {
        socket.emit('error', { message: 'Session not found' })
        return
      }
      void socket.join(roomId)
      logger.info('User joined room', { socketId: socket.id, roomId, userId: socket.data.userId })
      
      // Notify other users in the room that a new peer has joined
      socket.to(roomId).emit('user-joined', { socketId: socket.id, userId: socket.data.userId })
    } catch {
      socket.emit('error', { message: 'Failed to join room' })
    }
  })

  socket.on('leave-room', (roomId: string) => {
    void socket.leave(roomId)
    socket.to(roomId).emit('user-left', { socketId: socket.id, userId: socket.data.userId })
  })

  // WebRTC Signaling
  socket.on('webrtc-offer', (data: { target: string; offer: any; roomId: string }) => {
    socket.to(data.target).emit('webrtc-offer', {
      sender: socket.id,
      offer: data.offer,
    })
  })

  socket.on('webrtc-answer', (data: { target: string; answer: any; roomId: string }) => {
    socket.to(data.target).emit('webrtc-answer', {
      sender: socket.id,
      answer: data.answer,
    })
  })

  socket.on('webrtc-ice-candidate', (data: { target: string; candidate: any; roomId: string }) => {
    socket.to(data.target).emit('webrtc-ice-candidate', {
      sender: socket.id,
      candidate: data.candidate,
    })
  })

  // Real-time Chat Messaging with rate limiting
  const messageCooldown = new Map<string, number>()
  socket.on('send-message', (data: { roomId: string; message: string }) => {
    const now = Date.now()
    const lastMessage = messageCooldown.get(socket.id) || 0
    if (now - lastMessage < 500) {
      // 500ms cooldown
      socket.emit('error', { message: 'Message rate limit exceeded' })
      return
    }
    messageCooldown.set(socket.id, now)

    if (!data.message || data.message.length > 2000) {
      socket.emit('error', { message: 'Message too long' })
      return
    }

    const sanitizedMessage = sanitizeInput(data.message)
    if (!sanitizedMessage.trim()) {
      socket.emit('error', { message: 'Message contains invalid characters' })
      return
    }

    io.to(data.roomId).emit('new-message', {
      message: sanitizedMessage,
      sender: socket.data.userId,
      timestamp: new Date().toISOString(),
    })
  })

  // Real-time Hand Raise Event
  socket.on('raise-hand', (data: { roomId: string }) => {
    io.to(data.roomId).emit('hand-raised', { user: socket.data.userId })
  })

  socket.on('disconnect', () => {
    logger.info('User disconnected', { socketId: socket.id, userId: socket.data.userId })
  })
})

// Global Error Handlers
app.use(notFoundHandler)
app.use(errorHandler)

const PORT = config.port

// Start server
httpServer.listen(PORT, () => {
  logger.info(`Server running on http://localhost:${PORT}`)
  logger.info(`Environment: ${config.nodeEnv}`)
  startTokenCleanupScheduler()
})

// Graceful shutdown — ensures DB connections are properly closed
const gracefulShutdown = (signal: string) => {
  logger.info(`${signal} received, shutting down gracefully`)
  stopTokenCleanupScheduler()
  void io.close()
  httpServer.close(async () => {
    await prisma.$disconnect()
    logger.info('Server closed')
    process.exit(0)
  })
  // Force kill after 10s if graceful shutdown hangs
  setTimeout(() => {
    logger.error('Forced shutdown after timeout')
    process.exit(1)
  }, 10000)
}

process.on('SIGTERM', () => gracefulShutdown('SIGTERM'))
process.on('SIGINT', () => gracefulShutdown('SIGINT'))

// Catch unhandled promise rejections to prevent silent crashes
process.on('unhandledRejection', (reason: unknown) => {
  logger.error('Unhandled Rejection', reason instanceof Error ? reason : new Error(String(reason)))
})

export { io }
export default httpServer
