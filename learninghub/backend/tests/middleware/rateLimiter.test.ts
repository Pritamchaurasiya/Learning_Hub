import {
  createRateLimiter,
  cleanupMemoryStore,
  getClientIp,
} from '../../src/middleware/rateLimiter'
import { Request, Response, NextFunction } from 'express'
import { cacheService } from '../../src/services/CacheService'

// Mock cacheService
jest.mock('../../src/services/CacheService', () => ({
  cacheService: {
    incrementWithExpiry: jest.fn(),
  },
}))

describe('RateLimiter Middleware', () => {
  let mockReq: Partial<Request>
  let mockRes: Partial<Response>
  let mockNext: NextFunction
  let statusMock: jest.Mock
  let jsonMock: jest.Mock
  let setHeaderMock: jest.Mock
  let originalEnv: string | undefined

  beforeAll(() => {
    originalEnv = process.env.NODE_ENV
    process.env.NODE_ENV = 'production' // Bypass the test environment check
  })

  afterAll(() => {
    process.env.NODE_ENV = originalEnv
  })

  beforeEach(() => {
    jest.clearAllMocks()
    jsonMock = jest.fn().mockReturnThis()
    statusMock = jest.fn().mockReturnValue({ json: jsonMock })
    setHeaderMock = jest.fn()

    mockReq = {
      ip: '192.168.1.1',
      originalUrl: '/api/v1/auth/login',
      headers: {},
      socket: {} as any,
    }

    mockRes = {
      status: statusMock as any,
      json: jsonMock as any,
      set: setHeaderMock as any,
    }

    mockNext = jest.fn()
  })

  it('should pass if within limits (Redis path)', async () => {
    ;(cacheService.incrementWithExpiry as jest.Mock).mockResolvedValue(3)

    const middleware = createRateLimiter({
      windowMs: 60000,
      max: 5,
      keyPrefix: 'test_limit',
    })

    await middleware(mockReq as Request, mockRes as Response, mockNext)

    expect(cacheService.incrementWithExpiry).toHaveBeenCalledWith(expect.any(String), 1, 60000)
    expect(setHeaderMock).toHaveBeenCalledWith('X-RateLimit-Limit', '5')
    expect(setHeaderMock).toHaveBeenCalledWith('X-RateLimit-Remaining', '2')
    expect(mockNext).toHaveBeenCalled()
    expect(statusMock).not.toHaveBeenCalled()
  })

  it('should set expire on first request in window', async () => {
    ;(cacheService.incrementWithExpiry as jest.Mock).mockResolvedValue(1)

    const middleware = createRateLimiter({
      windowMs: 60000,
      max: 5,
      keyPrefix: 'test_limit',
    })

    await middleware(mockReq as Request, mockRes as Response, mockNext)

    expect(cacheService.incrementWithExpiry).toHaveBeenCalledWith(expect.any(String), 1, 60000)
    expect(mockNext).toHaveBeenCalled()
  })

  it('should block and return 429 when max limit is exceeded', async () => {
    ;(cacheService.incrementWithExpiry as jest.Mock).mockResolvedValue(6)

    const middleware = createRateLimiter({
      windowMs: 60000,
      max: 5,
      keyPrefix: 'test_limit',
      message: 'Too many test requests.',
    })

    await middleware(mockReq as Request, mockRes as Response, mockNext)

    expect(statusMock).toHaveBeenCalledWith(429)
    expect(jsonMock).toHaveBeenCalledWith({
      status: 'error',
      message: 'Too many test requests.',
      code: 'RATE_LIMIT_EXCEEDED',
      details: {
        retryAfter: expect.any(Number),
        limit: 5,
        remaining: 0,
      },
    })
    expect(mockNext).not.toHaveBeenCalled()
  })

  it('should fallback gracefully to in-memory store if Redis throws error', async () => {
    ;(cacheService.incrementWithExpiry as jest.Mock).mockRejectedValue(
      new Error('Redis is offline')
    )

    const middleware = createRateLimiter({
      windowMs: 60000,
      max: 2,
      keyPrefix: 'fallback_limit',
    })

    // First request
    await middleware(mockReq as Request, mockRes as Response, mockNext)
    expect(mockNext).toHaveBeenCalled()
    expect(setHeaderMock).toHaveBeenCalledWith('X-RateLimit-Remaining', '1')

    // Second request
    mockNext = jest.fn()
    await middleware(mockReq as Request, mockRes as Response, mockNext)
    expect(mockNext).toHaveBeenCalled()
    expect(setHeaderMock).toHaveBeenCalledWith('X-RateLimit-Remaining', '0')

    // Third request (should block)
    mockNext = jest.fn()
    await middleware(mockReq as Request, mockRes as Response, mockNext)
    expect(statusMock).toHaveBeenCalledWith(429)
    expect(mockNext).not.toHaveBeenCalled()
  })

  it('should reset the in-memory fallback after the window expires', async () => {
    ;(cacheService.incrementWithExpiry as jest.Mock).mockRejectedValue(
      new Error('Redis is offline')
    )

    const middleware = createRateLimiter({
      windowMs: 1,
      max: 1,
      keyPrefix: 'ttl_reset_limit',
    })

    await middleware(mockReq as Request, mockRes as Response, mockNext)
    expect(setHeaderMock).toHaveBeenCalledWith('X-RateLimit-Remaining', '0')

    await new Promise(resolve => setTimeout(resolve, 5))
    mockNext = jest.fn()
    await middleware(mockReq as Request, mockRes as Response, mockNext)

    expect(mockNext).toHaveBeenCalled()
    expect(setHeaderMock).toHaveBeenCalledWith('X-RateLimit-Remaining', '0')
  })

  it('should clean up expired records in memory store', () => {
    expect(() => cleanupMemoryStore()).not.toThrow()
  })

  describe('getClientIp helper', () => {
    it('should extract IP from x-forwarded-for header', () => {
      mockReq.headers = { 'x-forwarded-for': '203.0.113.195, 70.41.3.18' }
      const ip = getClientIp(mockReq as Request)
      expect(ip).toBe('203.0.113.195')
    })

    it('should fallback to req.ip', () => {
      ;(mockReq as any).ip = '10.0.0.1'
      const ip = getClientIp(mockReq as Request)
      expect(ip).toBe('10.0.0.1')
    })
  })
})
