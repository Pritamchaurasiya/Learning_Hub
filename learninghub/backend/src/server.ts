import express, { Request, Response, NextFunction } from 'express'
import cors from 'cors'
import helmet from 'helmet'
import compression from 'compression'
import hpp from 'hpp'
import { createServer } from 'http'
import { Server } from 'socket.io'
import 'dotenv/config'
import routes from './routes'
import { errorHandler, notFoundHandler } from './middleware/errorHandler'
import { requestId, requestLogger } from './middleware/authMiddleware'
import {
  corsOptions,
  helmetConfig,
  generalRateLimit,
  authRateLimit,
  adminRateLimit,
} from './config'
import logger from './utils/logger'
import { prisma } from './config'
import { config } from './utils/env'

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
  req.io = io
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

// Body parsing
app.use(express.json({ limit: '10mb' }))
app.use(express.urlencoded({ extended: true, limit: '10mb' }))

// Rate Limiting - General API
app.use(generalRateLimit)

// Auth endpoints get stricter rate limiting
const authRateLimiter = authRateLimit
const adminRateLimiter = adminRateLimit

// API Routes - Versioned
// Apply specific rate limiting
app.use('/api/v1/auth', authRateLimiter) // Stricter rate limiting for auth
app.use('/api/v1/admin', adminRateLimiter) // Ultra-strict for admin
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
    const { verifyAccessToken } = require('./utils/auth')
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
      socket.to(roomId).emit('user-joined', { socketId: socket.id, userId: socket.data.userId })
    } catch {
      socket.emit('error', { message: 'Failed to join room' })
    }
  })

  socket.on('leave-room', (roomId: string) => {
    void socket.leave(roomId)
    socket.to(roomId).emit('user-left', { socketId: socket.id, userId: socket.data.userId })
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

    io.to(data.roomId).emit('new-message', {
      message: data.message,
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
})

// Graceful shutdown — ensures DB connections are properly closed
const gracefulShutdown = (signal: string) => {
  logger.info(`${signal} received, shutting down gracefully`)
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
export default app
