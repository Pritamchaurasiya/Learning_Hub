import { Server } from 'socket.io'
import { verifyAccessToken } from '../utils/auth'
import { prisma } from '../config'
import logger from '../utils/logger'
import { sanitizeInput } from '../config'

type UserAccountStatus = {
  id: string
  deletedAt: Date | null
  lockedUntil: Date | null
}

const isAccountActive = (user: UserAccountStatus): boolean => {
  return !user.deletedAt && !(user.lockedUntil && user.lockedUntil > new Date())
}

export const setupWebSockets = (io: Server) => {
  io.use(async (socket, next) => {
    const token = socket.handshake.auth.token ?? socket.handshake.query.token
    if (!token) {
      return next(new Error('Authentication required'))
    }

    let decoded: { userId: string; role: string }

    try {
      decoded = verifyAccessToken(token as string)
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

  io.on('connection', socket => {
    logger.info('User connected', { socketId: socket.id, userId: socket.data.userId })

    // Automatically join a personal room for direct messages and notifications
    void socket.join(socket.data.userId)

    socket.on('join-room', async (roomId: string) => {
      try {
        const session = await prisma.liveSession.findUnique({
          where: { id: roomId },
          select: {
            id: true,
            status: true,
            maxParticipants: true,
            currentParticipants: true,
            instructorId: true,
          },
        })
        if (!session) {
          socket.emit('error', { message: 'Session not found' })
          return
        }

        if (session.status === 'completed' || session.status === 'cancelled') {
          socket.emit('error', { message: 'Session is not available' })
          return
        }

        if (session.currentParticipants >= session.maxParticipants) {
          socket.emit('error', { message: 'Session is full' })
          return
        }

        const isInstructor =
          socket.data.userRole === 'ADMIN' ||
          socket.data.userRole === 'SUPERADMIN' ||
          socket.data.userRole === 'INSTRUCTOR' ||
          session.instructorId === socket.data.userId

        if (!isInstructor) {
          socket.emit('error', { message: 'You do not have permission to join this session' })
          return
        }

        void socket.join(roomId)
        void prisma.liveSession
          .update({
            where: { id: roomId },
            data: { currentParticipants: { increment: 1 } },
          })
          .catch(() => {})

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

    socket.on(
      'webrtc-ice-candidate',
      (data: { target: string; candidate: any; roomId: string }) => {
        socket.to(data.target).emit('webrtc-ice-candidate', {
          sender: socket.id,
          candidate: data.candidate,
        })
      }
    )

    // Real-time Chat Messaging with rate limiting
    const messageCooldown = new Map<string, number>()
    socket.on('send-message', (data: { roomId: string; message: string }) => {
      const now = Date.now()
      const lastMessage = messageCooldown.get(socket.id) ?? 0

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

    socket.on('disconnecting', () => {
      // socket.rooms is a Set containing all rooms the socket is currently in
      // including their own socket.id room and userId room.
      socket.rooms.forEach(roomId => {
        if (roomId !== socket.id && roomId !== socket.data.userId) {
          void prisma.liveSession
            .updateMany({
              // use updateMany to avoid crashing if it's not a session ID
              where: { id: roomId, currentParticipants: { gt: 0 } },
              data: { currentParticipants: { decrement: 1 } },
            })
            .catch(() => {})
          socket.to(roomId).emit('user-left', { socketId: socket.id, userId: socket.data.userId })
        }
      })
    })

    socket.on('disconnect', () => {
      logger.info('User disconnected', { socketId: socket.id, userId: socket.data.userId })
    })
  })
}
