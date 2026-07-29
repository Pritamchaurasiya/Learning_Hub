import { Server } from 'socket.io'
import { verifyAccessToken } from '../utils/auth'
import { prisma } from '../config'
import logger from '../utils/logger'
import { sanitizeInput } from '../config'
import { webSocketService } from '../services/WebSocketService'
import { parseCookies } from '../utils/cookies'

const MAX_ROOM_ID_LENGTH = 128

const isValidRoomId = (roomId: unknown): roomId is string =>
  typeof roomId === 'string' && roomId.length > 0 && roomId.length <= MAX_ROOM_ID_LENGTH

type UserAccountStatus = {
  id: string
  deletedAt: Date | null
  lockedUntil: Date | null
}

const isAccountActive = (user: UserAccountStatus): boolean => {
  return !user.deletedAt && !(user.lockedUntil && user.lockedUntil > new Date())
}

async function hasRoomAccess(userId: string, roomId: string): Promise<boolean> {
  if (roomId === userId) return true
  if (
    roomId.startsWith('quiz-') ||
    roomId.startsWith('test-') ||
    roomId.startsWith('contest-') ||
    roomId.startsWith('live-')
  ) {
    return true
  }

  const testSession = await prisma.testSession.findFirst({
    where: { id: roomId, userId },
    select: { id: true },
  })
  if (testSession) return true

  const chatSession = await prisma.aIChatSession.findFirst({
    where: { id: roomId, userId },
    select: { id: true },
  })
  if (chatSession) return true

  return false
}

export const setupWebSockets = (io: Server) => {
  webSocketService.setSocketIO(io)

  io.use(async (socket, next) => {
    const authToken = socket.handshake.auth.token
    const cookies = parseCookies(socket.handshake.headers.cookie as string | undefined)
    const cookieToken = cookies?.access_token
    const token = (authToken && typeof authToken === 'string' ? authToken : cookieToken) as
      string | undefined
    if (!token || typeof token !== 'string') {
      return next(new Error('Authentication required'))
    }

    let decoded: { userId: string; role: string }

    try {
      decoded = verifyAccessToken(token)
    } catch {
      return next(new Error('Invalid token'))
    }

    try {
      const user = (await prisma.user.findUnique({
        where: { id: decoded.userId },
        select: { id: true, deletedAt: true, lockedUntil: true },
      })) as UserAccountStatus | null

      if (!user) {
        return next(new Error('User not found'))
      }

      if (!isAccountActive(user)) {
        return next(
          new Error(
            user.deletedAt ? 'Account has been deactivated' : 'Account is temporarily locked'
          )
        )
      }

      socket.data.userId = decoded.userId
      socket.data.userRole = decoded.role
      next()
    } catch (error) {
      logger.error(
        'WebSocket authentication error',
        error instanceof Error ? error : new Error(String(error))
      )
      return next(new Error('Authentication error'))
    }
  })

  const messageCooldown = new Map<string, number>()
  // Prevent memory leaks by cleaning up stale cooldowns periodically
  setInterval(() => {
    const now = Date.now()
    for (const [id, timestamp] of messageCooldown.entries()) {
      if (now - timestamp > 500) {
        messageCooldown.delete(id)
      }
    }
  }, 10000).unref() // Sweep every 10s

  io.on('connection', socket => {
    logger.info('User connected', { socketId: socket.id, userId: socket.data.userId })
    webSocketService.registerSocket(socket)

    // Automatically join a personal room for direct messages and notifications
    void socket.join(socket.data.userId)

    socket.on('join-room', async (roomId: string) => {
      if (!isValidRoomId(roomId)) {
        socket.emit('error', { message: 'Invalid room ID' })
        return
      }

      try {
        const hasAccess = await hasRoomAccess(socket.data.userId, roomId)
        if (!hasAccess) {
          logger.warn('Unauthorized room join attempt', {
            socketId: socket.id,
            roomId,
            userId: socket.data.userId,
          })
          socket.emit('error', { message: 'Access denied' })
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
      if (!isValidRoomId(roomId) || !socket.rooms.has(roomId)) {
        return
      }
      void socket.leave(roomId)
      socket.to(roomId).emit('user-left', { socketId: socket.id, userId: socket.data.userId })
    })

    // WebRTC Signaling
    socket.on('webrtc-offer', (data: { target: string; offer: unknown; roomId: string }) => {
      if (
        !isValidRoomId(data.roomId) ||
        !socket.rooms.has(data.roomId) ||
        typeof data.target !== 'string'
      ) {
        return
      }
      socket.to(data.target).emit('webrtc-offer', {
        sender: socket.id,
        offer: data.offer,
      })
    })

    socket.on('webrtc-answer', (data: { target: string; answer: unknown; roomId: string }) => {
      if (
        !isValidRoomId(data.roomId) ||
        !socket.rooms.has(data.roomId) ||
        typeof data.target !== 'string'
      ) {
        return
      }
      socket.to(data.target).emit('webrtc-answer', {
        sender: socket.id,
        answer: data.answer,
      })
    })

    socket.on(
      'webrtc-ice-candidate',
      (data: { target: string; candidate: unknown; roomId: string }) => {
        if (
          !isValidRoomId(data.roomId) ||
          !socket.rooms.has(data.roomId) ||
          typeof data.target !== 'string'
        ) {
          return
        }
        socket.to(data.target).emit('webrtc-ice-candidate', {
          sender: socket.id,
          candidate: data.candidate,
        })
      }
    )

    // Real-time Chat Messaging with rate limiting
    socket.on('send-message', (data: { roomId: string; message: string }) => {
      if (!isValidRoomId(data.roomId)) {
        socket.emit('error', { message: 'Invalid room ID' })
        return
      }

      if (!socket.rooms.has(data.roomId)) {
        socket.emit('error', { message: 'Not a member of this room' })
        return
      }

      const now = Date.now()
      const lastMessage = messageCooldown.get(socket.id) ?? 0

      if (now - lastMessage < 500) {
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
      if (!isValidRoomId(data.roomId) || !socket.rooms.has(data.roomId)) {
        socket.emit('error', { message: 'Cannot raise hand in this room' })
        return
      }
      io.to(data.roomId).emit('hand-raised', { user: socket.data.userId })
    })

    socket.on('disconnecting', () => {
      // socket.rooms is a Set containing all rooms the socket is currently in
      // including their own socket.id room and userId room.
      socket.rooms.forEach(roomId => {
        if (roomId !== socket.id && roomId !== socket.data.userId) {
          socket.to(roomId).emit('user-left', { socketId: socket.id, userId: socket.data.userId })
        }
      })
    })

    socket.on('disconnect', () => {
      logger.info('User disconnected', { socketId: socket.id, userId: socket.data.userId })
      messageCooldown.delete(socket.id)
    })
  })
}
