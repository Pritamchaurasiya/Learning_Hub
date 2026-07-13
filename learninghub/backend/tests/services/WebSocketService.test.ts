import { WebSocketService } from '../../src/services/WebSocketService'
import { EventEmitter } from 'events'

jest.mock('../../src/utils/logger', () => {
  const mockLogger = {
    warn: jest.fn(),
    error: jest.fn(),
    info: jest.fn(),
    debug: jest.fn(),
    audit: jest.fn(),
  }
  return {
    ...mockLogger,
    default: mockLogger,
  }
})

describe('WebSocketService Suite', () => {
  let service: WebSocketService
  let mockIo: any
  let mockSocket: any

  beforeEach(() => {
    jest.clearAllMocks()
    jest.useFakeTimers()
    service = new WebSocketService()

    mockSocket = new EventEmitter() as any
    mockSocket.id = 'socket-123'
    mockSocket.data = { userId: 'user-abc' }
    mockSocket.disconnect = jest.fn()

    // Preserve EventEmitter emit for testing events, but mock outgoing emits like ping-heartbeat
    const origEmit = EventEmitter.prototype.emit.bind(mockSocket)
    mockSocket.emit = jest.fn((event: string, ...args: any[]) => {
      if (event === 'ping-heartbeat') return true
      return origEmit(event, ...args)
    })

    mockIo = {
      to: jest.fn().mockReturnThis(),
      emit: jest.fn(),
      sockets: {
        sockets: new Map([['socket-123', mockSocket]]),
      },
    }
  })

  afterEach(() => {
    service.stopHeartbeatMonitor()
    jest.useRealTimers()
  })

  it('should register socket and track connection stats', () => {
    service.registerSocket(mockSocket)
    expect(service.getActiveConnectionsCount()).toBe(1)

    const stats = service.getClientStats('socket-123')
    expect(stats).toBeDefined()
    expect(stats?.userId).toBe('user-abc')
    expect(stats?.isAlive).toBe(true)
  })

  it('should unregister socket on disconnect event', () => {
    service.registerSocket(mockSocket)
    expect(service.getActiveConnectionsCount()).toBe(1)

    mockSocket.emit('disconnect')
    expect(service.getActiveConnectionsCount()).toBe(0)
  })

  it('should update lastPingAt and set isAlive to true on pong-heartbeat', () => {
    service.registerSocket(mockSocket)
    const initialStats = service.getClientStats('socket-123')!
    initialStats.isAlive = false

    mockSocket.emit('pong-heartbeat')
    expect(service.getClientStats('socket-123')?.isAlive).toBe(true)
  })

  it('should send ping-heartbeat during heartbeat monitor check', () => {
    service.setSocketIO(mockIo)
    service.registerSocket(mockSocket)

    jest.advanceTimersByTime(30000)

    expect(mockSocket.emit).toHaveBeenCalledWith('ping-heartbeat', expect.any(Object))
    expect(service.getClientStats('socket-123')?.isAlive).toBe(false)
  })

  it('should prune dead socket when client fails to respond to ping', () => {
    service.setSocketIO(mockIo)
    service.registerSocket(mockSocket)

    // First interval: sends ping, sets isAlive = false
    jest.advanceTimersByTime(30000)
    expect(service.getClientStats('socket-123')?.isAlive).toBe(false)

    // Second interval without pong: timeout exceeded -> disconnect and unregister
    jest.advanceTimersByTime(30000)
    expect(mockSocket.disconnect).toHaveBeenCalledWith(true)
    expect(service.getActiveConnectionsCount()).toBe(0)
  })

  it('should emit notifications to user rooms correctly', () => {
    service.setSocketIO(mockIo)
    service.notifyUser('user-abc', 'test-event', { foo: 'bar' })

    expect(mockIo.to).toHaveBeenCalledWith('user-abc')
    expect(mockIo.emit).toHaveBeenCalledWith('test-event', { foo: 'bar' })
  })
})
