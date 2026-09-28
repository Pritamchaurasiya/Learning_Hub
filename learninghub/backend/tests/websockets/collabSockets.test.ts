import { setupWebSockets } from '../../src/websockets'
import { verifyAccessToken } from '../../src/utils/auth'
import { prisma } from '../../src/config'

jest.mock('../../src/utils/auth', () => ({
  verifyAccessToken: jest.fn(),
}))

jest.mock('../../src/config', () => {
  const actual = jest.requireActual('../../src/config/security')
  return {
    prisma: {
      user: { findUnique: jest.fn() },
      testSession: { findFirst: jest.fn() },
      aIChatSession: { findFirst: jest.fn() },
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

describe('Live Collaborative DSA WebSocket Subsystem', () => {
  let mockIo: any
  let connectionHandler: (socket: any) => void

  beforeEach(() => {
    jest.resetAllMocks()

    mockIo = {
      use: jest.fn(),
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

  it('allows joining collab- rooms and broadcasts code updates', async () => {
    const eventHandlers: Record<string, Function> = {}
    const toEmitMock = jest.fn()

    const mockSocket: any = {
      id: 'socket-peer-1',
      handshake: { address: '127.0.0.1' },
      data: { userId: 'usr-1', userRole: 'STUDENT' },
      rooms: new Set(['socket-peer-1', 'usr-1']),
      join: jest.fn((room: string) => {
        mockSocket.rooms.add(room)
      }),
      leave: jest.fn(),
      on: jest.fn((event, fn) => {
        eventHandlers[event] = fn
      }),
      emit: jest.fn(),
      to: jest.fn().mockReturnValue({
        emit: toEmitMock,
      }),
    }

    connectionHandler(mockSocket)

    // Join room
    await eventHandlers['join-room']('collab-dsa-two-sum-room1')
    expect(mockSocket.join).toHaveBeenCalledWith('collab-dsa-two-sum-room1')

    // Broadcast code change
    eventHandlers['collab-code-change']({
      roomId: 'collab-dsa-two-sum-room1',
      code: 'function twoSum() { return [0, 1]; }',
      language: 'javascript',
      version: 1,
    })

    expect(mockSocket.to).toHaveBeenCalledWith('collab-dsa-two-sum-room1')
    expect(toEmitMock).toHaveBeenCalledWith('collab-code-update', expect.objectContaining({
      senderUserId: 'usr-1',
      code: 'function twoSum() { return [0, 1]; }',
      language: 'javascript',
      version: 1,
    }))
  })

  it('broadcasts remote cursor movement', async () => {
    const eventHandlers: Record<string, Function> = {}
    const toEmitMock = jest.fn()

    const mockSocket: any = {
      id: 'socket-peer-2',
      handshake: { address: '127.0.0.1' },
      data: { userId: 'usr-2', userRole: 'STUDENT' },
      rooms: new Set(['collab-room-123']),
      join: jest.fn(),
      on: jest.fn((event, fn) => {
        eventHandlers[event] = fn
      }),
      emit: jest.fn(),
      to: jest.fn().mockReturnValue({
        emit: toEmitMock,
      }),
    }

    connectionHandler(mockSocket)

    eventHandlers['collab-cursor-move']({
      roomId: 'collab-room-123',
      line: 14,
      ch: 8,
    })

    expect(toEmitMock).toHaveBeenCalledWith('collab-cursor-update', {
      senderSocketId: 'socket-peer-2',
      senderUserId: 'usr-2',
      line: 14,
      ch: 8,
    })
  })

  it('broadcasts shared test runs and test results', async () => {
    const eventHandlers: Record<string, Function> = {}
    const toEmitMock = jest.fn()

    const mockSocket: any = {
      id: 'socket-peer-3',
      handshake: { address: '127.0.0.1' },
      data: { userId: 'usr-3', userRole: 'STUDENT' },
      rooms: new Set(['collab-room-456']),
      join: jest.fn(),
      on: jest.fn((event, fn) => {
        eventHandlers[event] = fn
      }),
      emit: jest.fn(),
      to: jest.fn().mockReturnValue({
        emit: toEmitMock,
      }),
    }

    connectionHandler(mockSocket)

    eventHandlers['collab-run-tests']({ roomId: 'collab-room-456' })
    expect(toEmitMock).toHaveBeenCalledWith('collab-peer-running-tests', {
      senderSocketId: 'socket-peer-3',
      senderUserId: 'usr-3',
    })

    eventHandlers['collab-test-results']({
      roomId: 'collab-room-456',
      output: 'Testcase 1: Passed (0.4ms)\nTestcase 2: Passed (0.3ms)',
      status: 'passed',
    })

    expect(toEmitMock).toHaveBeenCalledWith('collab-test-results-shared', {
      senderSocketId: 'socket-peer-3',
      senderUserId: 'usr-3',
      output: 'Testcase 1: Passed (0.4ms)\nTestcase 2: Passed (0.3ms)',
      status: 'passed',
    })
  })
})
