import { setupWebSockets } from '../../src/websockets'
import { verifyAccessToken } from '../../src/utils/auth'
import { prisma } from '../../src/config'
import { webSocketService } from '../../src/services/WebSocketService'

jest.mock('../../src/utils/auth', () => ({
  verifyAccessToken: jest.fn(),
}))

jest.mock('../../src/config', () => {
  const actual = jest.requireActual('../../src/config/security')
  return {
    prisma: {
      user: {
        findUnique: jest.fn(),
      },
      testSession: {
        findFirst: jest.fn(),
      },
      aIChatSession: {
        findFirst: jest.fn(),
      },
    },
    sanitizeInput: actual.sanitizeInput,
  }
})

jest.mock('../../src/services/WebSocketService', () => ({
  webSocketService: {
    setSocketIO: jest.fn(),
    registerSocket: jest.fn(),
  },
}))

jest.mock('../../src/utils/logger', () => ({
  info: jest.fn(),
  warn: jest.fn(),
  error: jest.fn(),
  debug: jest.fn(),
  default: {
    info: jest.fn(),
    warn: jest.fn(),
    error: jest.fn(),
    debug: jest.fn(),
  },
}))

describe('WebSocket Subsystem & Signaling Tests', () => {
  let mockIo: any
  let authMiddleware: (socket: any, next: (err?: Error) => void) => Promise<void>
  let connectionHandler: (socket: any) => void

  beforeEach(() => {
    jest.resetAllMocks()

    mockIo = {
      use: jest.fn((fn) => {
        authMiddleware = fn
      }),
      on: jest.fn((event, fn) => {
        if (event === 'connection') {
          connectionHandler = fn
        }
      }),
      to: jest.fn().mockReturnThis(),
      emit: jest.fn(),
    }

    setupWebSockets(mockIo)
  })

  describe('Authentication Middleware', () => {
    it('should reject connection when no token is provided', async () => {
      const mockSocket = {
        handshake: {
          auth: {},
          headers: {},
        },
        data: {},
      }
      const next = jest.fn()

      await authMiddleware(mockSocket, next)

      expect(next).toHaveBeenCalledWith(new Error('Authentication required'))
    })

    it('should reject connection when token is invalid', async () => {
      const mockSocket = {
        handshake: {
          auth: { token: 'invalid.token' },
          headers: {},
        },
        data: {},
      }
      const next = jest.fn()
      ;(verifyAccessToken as jest.Mock).mockImplementation(() => {
        throw new Error('JWT verification failed')
      })

      await authMiddleware(mockSocket, next)

      expect(next).toHaveBeenCalledWith(new Error('Invalid token'))
    })

    it('should reject connection when user does not exist', async () => {
      const mockSocket = {
        handshake: {
          auth: { token: 'valid.token' },
          headers: {},
        },
        data: {},
      }
      const next = jest.fn()
      ;(verifyAccessToken as jest.Mock).mockReturnValue({ userId: 'user-1', role: 'STUDENT' })
      ;(prisma.user.findUnique as jest.Mock).mockResolvedValue(null)

      await authMiddleware(mockSocket, next)

      expect(next).toHaveBeenCalledWith(new Error('User not found'))
    })

    it('should reject connection when account is deactivated', async () => {
      const mockSocket = {
        handshake: {
          auth: { token: 'valid.token' },
          headers: {},
        },
        data: {},
      }
      const next = jest.fn()
      ;(verifyAccessToken as jest.Mock).mockReturnValue({ userId: 'user-1', role: 'STUDENT' })
      ;(prisma.user.findUnique as jest.Mock).mockResolvedValue({
        id: 'user-1',
        deletedAt: new Date(),
        lockedUntil: null,
      })

      await authMiddleware(mockSocket, next)

      expect(next).toHaveBeenCalledWith(new Error('Account has been deactivated'))
    })

    it('should reject connection when account is locked', async () => {
      const mockSocket = {
        handshake: {
          auth: { token: 'valid.token' },
          headers: {},
        },
        data: {},
      }
      const next = jest.fn()
      ;(verifyAccessToken as jest.Mock).mockReturnValue({ userId: 'user-1', role: 'STUDENT' })
      ;(prisma.user.findUnique as jest.Mock).mockResolvedValue({
        id: 'user-1',
        deletedAt: null,
        lockedUntil: new Date(Date.now() + 60000), // locked in future
      })

      await authMiddleware(mockSocket, next)

      expect(next).toHaveBeenCalledWith(new Error('Account is temporarily locked'))
    })

    it('should authenticate successfully with cookie token and set socket data', async () => {
      const mockSocket = {
        handshake: {
          auth: {},
          headers: {
            cookie: 'access_token=cookie.jwt.token; other=123',
          },
        },
        data: {} as any,
      }
      const next = jest.fn()
      ;(verifyAccessToken as jest.Mock).mockReturnValue({ userId: 'user-1', role: 'STUDENT' })
      ;(prisma.user.findUnique as jest.Mock).mockResolvedValue({
        id: 'user-1',
        deletedAt: null,
        lockedUntil: null,
      })

      await authMiddleware(mockSocket, next)

      expect(next).toHaveBeenCalledWith()
      expect(mockSocket.data.userId).toBe('user-1')
      expect(mockSocket.data.userRole).toBe('STUDENT')
    })
  })

  describe('Connection & Room Signaling Events', () => {
    let mockSocket: any
    let eventHandlers: Map<string, Function>
    let mockToEmitter: any

    beforeEach(() => {
      eventHandlers = new Map()
      mockToEmitter = {
        emit: jest.fn(),
      }

      mockSocket = {
        id: 'socket-test-123',
        handshake: { address: '127.0.0.1' },
        data: { userId: 'user-1', userRole: 'STUDENT' },
        rooms: new Set(['socket-test-123', 'user-1']),
        join: jest.fn().mockImplementation((room) => {
          mockSocket.rooms.add(room)
          return Promise.resolve()
        }),
        leave: jest.fn().mockImplementation((room) => {
          mockSocket.rooms.delete(room)
          return Promise.resolve()
        }),
        emit: jest.fn(),
        to: jest.fn().mockReturnValue(mockToEmitter),
        disconnect: jest.fn(),
        on: jest.fn((event, fn) => {
          eventHandlers.set(event, fn)
        }),
      }

      connectionHandler(mockSocket)
    })

    it('should register socket and join personal direct room on connection', () => {
      expect(webSocketService.registerSocket).toHaveBeenCalledWith(mockSocket)
      expect(mockSocket.join).toHaveBeenCalledWith('user-1')
    })

    it('should allow joining public classroom live and test rooms', async () => {
      const joinHandler = eventHandlers.get('join-room')!
      await joinHandler('live-session-101')

      expect(mockSocket.join).toHaveBeenCalledWith('live-session-101')
      expect(mockSocket.to).toHaveBeenCalledWith('live-session-101')
      expect(mockToEmitter.emit).toHaveBeenCalledWith('user-joined', {
        socketId: 'socket-test-123',
        userId: 'user-1',
      })
    })

    it('should reject join-room with invalid room ID format', async () => {
      const joinHandler = eventHandlers.get('join-room')!
      await joinHandler('')

      expect(mockSocket.emit).toHaveBeenCalledWith('error', { message: 'Invalid room ID' })
    })

    it('should reject join-room when unauthorized for private session', async () => {
      ;(prisma.testSession.findFirst as jest.Mock).mockResolvedValue(null)
      ;(prisma.aIChatSession.findFirst as jest.Mock).mockResolvedValue(null)

      const joinHandler = eventHandlers.get('join-room')!
      await joinHandler('private-session-999')

      expect(mockSocket.emit).toHaveBeenCalledWith('error', { message: 'Access denied' })
      expect(mockSocket.join).not.toHaveBeenCalledWith('private-session-999')
    })

    it('should leave room and notify occupants on leave-room event', () => {
      mockSocket.rooms.add('live-session-101')
      const leaveHandler = eventHandlers.get('leave-room')!
      leaveHandler('live-session-101')

      expect(mockSocket.leave).toHaveBeenCalledWith('live-session-101')
      expect(mockSocket.to).toHaveBeenCalledWith('live-session-101')
      expect(mockToEmitter.emit).toHaveBeenCalledWith('user-left', {
        socketId: 'socket-test-123',
        userId: 'user-1',
      })
    })

    it('should route WebRTC signaling offers to the target socket', () => {
      mockSocket.rooms.add('live-session-101')
      const offerHandler = eventHandlers.get('webrtc-offer')!
      offerHandler({
        target: 'peer-socket-456',
        offer: { sdp: 'offer-sdp-data' },
        roomId: 'live-session-101',
      })

      expect(mockSocket.to).toHaveBeenCalledWith('peer-socket-456')
      expect(mockToEmitter.emit).toHaveBeenCalledWith('webrtc-offer', {
        sender: 'socket-test-123',
        offer: { sdp: 'offer-sdp-data' },
      })
    })

    it('should route WebRTC signaling answers to the target socket', () => {
      mockSocket.rooms.add('live-session-101')
      const answerHandler = eventHandlers.get('webrtc-answer')!
      answerHandler({
        target: 'peer-socket-456',
        answer: { sdp: 'answer-sdp-data' },
        roomId: 'live-session-101',
      })

      expect(mockSocket.to).toHaveBeenCalledWith('peer-socket-456')
      expect(mockToEmitter.emit).toHaveBeenCalledWith('webrtc-answer', {
        sender: 'socket-test-123',
        answer: { sdp: 'answer-sdp-data' },
      })
    })

    it('should route WebRTC ICE candidates to the target socket', () => {
      mockSocket.rooms.add('live-session-101')
      const candidateHandler = eventHandlers.get('webrtc-ice-candidate')!
      candidateHandler({
        target: 'peer-socket-456',
        candidate: { candidate: 'candidate-data' },
        roomId: 'live-session-101',
      })

      expect(mockSocket.to).toHaveBeenCalledWith('peer-socket-456')
      expect(mockToEmitter.emit).toHaveBeenCalledWith('webrtc-ice-candidate', {
        sender: 'socket-test-123',
        candidate: { candidate: 'candidate-data' },
      })
    })

    it('should broadcast sanitized chat message to room', () => {
      mockSocket.rooms.add('live-session-101')
      const messageHandler = eventHandlers.get('send-message')!

      messageHandler({
        roomId: 'live-session-101',
        message: 'Hello World! <script>alert(1)</script>',
      })

      expect(mockIo.to).toHaveBeenCalledWith('live-session-101')
      expect(mockIo.emit).toHaveBeenCalledWith(
        'new-message',
        expect.objectContaining({
          sender: 'user-1',
          message: expect.not.stringContaining('<script>'),
        })
      )
    })

    it('should enforce message cooldown rate limit', () => {
      mockSocket.rooms.add('live-session-101')
      const messageHandler = eventHandlers.get('send-message')!

      // First message succeeds
      messageHandler({
        roomId: 'live-session-101',
        message: 'First Message',
      })
      expect(mockIo.emit).toHaveBeenCalledTimes(1)

      // Immediate second message gets rejected by 500ms cooldown
      messageHandler({
        roomId: 'live-session-101',
        message: 'Spam Message',
      })

      expect(mockSocket.emit).toHaveBeenCalledWith('error', {
        message: 'Message rate limit exceeded',
      })
      expect(mockIo.emit).toHaveBeenCalledTimes(1)
    })

    it('should broadcast raise-hand event when user raises hand in room', () => {
      mockSocket.rooms.add('live-session-101')
      const raiseHandHandler = eventHandlers.get('raise-hand')!

      raiseHandHandler({ roomId: 'live-session-101' })

      expect(mockIo.to).toHaveBeenCalledWith('live-session-101')
      expect(mockIo.emit).toHaveBeenCalledWith('hand-raised', { user: 'user-1' })
    })

    it('should notify all joined rooms when socket is disconnecting', () => {
      mockSocket.rooms.add('live-session-101')
      mockSocket.rooms.add('contest-room-2')

      const disconnectingHandler = eventHandlers.get('disconnecting')!
      disconnectingHandler()

      expect(mockSocket.to).toHaveBeenCalledWith('live-session-101')
      expect(mockSocket.to).toHaveBeenCalledWith('contest-room-2')
      expect(mockToEmitter.emit).toHaveBeenCalledWith('user-left', {
        socketId: 'socket-test-123',
        userId: 'user-1',
      })
    })
  })
})
