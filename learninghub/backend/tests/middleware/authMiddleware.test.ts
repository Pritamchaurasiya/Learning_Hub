import { Request, Response, NextFunction } from 'express'
import { prisma } from '../../src/prismaClient'

// ── Mock the actual dependencies that authMiddleware.ts imports ──

const mockVerifyAccessToken = jest.fn()
jest.mock('../../src/utils/auth', () => ({
  verifyAccessToken: (...args: any[]) => mockVerifyAccessToken(...args),
}))

const mockCacheGet = jest.fn()
const mockCacheSet = jest.fn()
jest.mock('../../src/services/CacheService', () => ({
  cacheService: {
    get: (...args: any[]) => mockCacheGet(...args),
    set: (...args: any[]) => mockCacheSet(...args),
    delete: jest.fn().mockResolvedValue(true),
  },
}))
jest.mock('../../src/utils/logger', () => ({
  __esModule: true,
  default: {
    info: jest.fn(),
    warn: jest.fn(),
    error: jest.fn(),
    debug: jest.fn(),
    audit: jest.fn(),
  },
}))

// Import AFTER mocks are set up
import { authenticate, optionalAuth, authorize, getCachedUserAccountStatus, invalidateUserAccountStatus } from '../../src/middleware/authMiddleware'

function makeReqResNext(headers: Record<string, string> = {}) {
  const req = {
    headers,
    user: undefined as any,
    requestId: 'test-req-id',
  } as unknown as Request

  const json = jest.fn()
  const status = jest.fn().mockReturnValue({ json })
  const res = { status, json } as unknown as Response
  const next = jest.fn() as unknown as NextFunction

  return { req, res, next, json, status }
}

describe('authenticate middleware', () => {
  beforeEach(() => {
    jest.clearAllMocks()
    mockCacheGet.mockResolvedValue(null)
    mockCacheSet.mockResolvedValue(undefined)
    ;(prisma.user.findUnique as jest.Mock).mockResolvedValue({ id: 'u1', deletedAt: null, lockedUntil: null })
  })

  it('returns 401 when Authorization header is missing', async () => {
    const { req, res, next, status, json } = makeReqResNext()
    await authenticate(req, res, next)
    expect(status).toHaveBeenCalledWith(401)
    expect(json).toHaveBeenCalledWith(
      expect.objectContaining({ message: 'Authentication required' })
    )
    expect(next).not.toHaveBeenCalled()
  })

  it('returns 401 when Authorization header does not start with Bearer', async () => {
    const { req, res, next, status } = makeReqResNext({ authorization: 'Basic abc123' })
    await authenticate(req, res, next)
    expect(status).toHaveBeenCalledWith(401)
    expect(next).not.toHaveBeenCalled()
  })

  it('returns 401 when token is invalid', async () => {
    mockVerifyAccessToken.mockImplementation(() => {
      throw new Error('Invalid token')
    })
    const { req, res, next, status } = makeReqResNext({ authorization: 'Bearer bad-token' })
    await authenticate(req, res, next)
    expect(status).toHaveBeenCalledWith(401)
    expect(next).not.toHaveBeenCalled()
  })

  it('returns 401 when token is expired', async () => {
    mockVerifyAccessToken.mockImplementation(() => {
      throw new Error('Token expired')
    })
    const { req, res, next, status, json } = makeReqResNext({
      authorization: 'Bearer expired-token',
    })
    await authenticate(req, res, next)
    expect(status).toHaveBeenCalledWith(401)
    expect(json).toHaveBeenCalledWith(expect.objectContaining({ code: 'TOKEN_EXPIRED' }))
    expect(next).not.toHaveBeenCalled()
  })

  it('returns 401 when user not found in DB', async () => {
    mockVerifyAccessToken.mockReturnValue({ userId: 'u1', email: 'a@b.com', role: 'STUDENT' })
    ;(prisma.user.findUnique as jest.Mock).mockResolvedValue(null)
    const { req, res, next, status } = makeReqResNext({ authorization: 'Bearer valid-token' })
    await authenticate(req, res, next)
    expect(status).toHaveBeenCalledWith(401)
    expect(next).not.toHaveBeenCalled()
  })

  it('returns 401 when account is soft-deleted', async () => {
    mockVerifyAccessToken.mockReturnValue({ userId: 'u1', email: 'a@b.com', role: 'STUDENT' })
    ;(prisma.user.findUnique as jest.Mock).mockResolvedValue({ id: 'u1', deletedAt: new Date(), lockedUntil: null })
    const { req, res, next, status } = makeReqResNext({ authorization: 'Bearer valid-token' })
    await authenticate(req, res, next)
    expect(status).toHaveBeenCalledWith(401)
    expect(next).not.toHaveBeenCalled()
  })

  it('returns 401 when account is locked', async () => {
    const future = new Date(Date.now() + 60000)
    mockVerifyAccessToken.mockReturnValue({ userId: 'u1', email: 'a@b.com', role: 'STUDENT' })
    ;(prisma.user.findUnique as jest.Mock).mockResolvedValue({ id: 'u1', deletedAt: null, lockedUntil: future })
    const { req, res, next, status } = makeReqResNext({ authorization: 'Bearer valid-token' })
    await authenticate(req, res, next)
    expect(status).toHaveBeenCalledWith(401)
    expect(next).not.toHaveBeenCalled()
  })

  it('calls next() and attaches user when token is valid', async () => {
    const decoded = { userId: 'u1', email: 'a@b.com', role: 'STUDENT' }
    mockVerifyAccessToken.mockReturnValue(decoded)
    ;(prisma.user.findUnique as jest.Mock).mockResolvedValue({ id: 'u1', deletedAt: null, lockedUntil: null })
    const { req, res, next } = makeReqResNext({ authorization: 'Bearer valid-token' })
    await authenticate(req, res, next)
    expect(next).toHaveBeenCalled()
    expect(req.user).toEqual(expect.objectContaining({ userId: 'u1', role: 'STUDENT' }))
  })
})

describe('optionalAuth middleware', () => {
  beforeEach(() => {
    jest.clearAllMocks()
    mockCacheGet.mockResolvedValue(null)
    mockCacheSet.mockResolvedValue(undefined)
    ;(prisma.user.findUnique as jest.Mock).mockResolvedValue({ id: 'u2', deletedAt: null, lockedUntil: null })
  })

  it('calls next() without setting user when no token', async () => {
    const { req, res, next } = makeReqResNext()
    await optionalAuth(req, res, next)
    expect(next).toHaveBeenCalled()
    expect(req.user).toBeUndefined()
  })

  it('calls next() and attaches user when valid token provided', async () => {
    const decoded = { userId: 'u2', email: 'b@c.com', role: 'STUDENT' }
    mockVerifyAccessToken.mockReturnValue(decoded)
    ;(prisma.user.findUnique as jest.Mock).mockResolvedValue({ id: 'u2', deletedAt: null, lockedUntil: null })
    const { req, res, next } = makeReqResNext({ authorization: 'Bearer valid-token' })
    await optionalAuth(req, res, next)
    expect(next).toHaveBeenCalled()
    expect(req.user).toEqual(expect.objectContaining({ userId: 'u2' }))
  })

  it('calls next() without user when token belongs to deactivated account', async () => {
    const decoded = { userId: 'u2', email: 'b@c.com', role: 'STUDENT' }
    mockVerifyAccessToken.mockReturnValue(decoded)
    ;(prisma.user.findUnique as jest.Mock).mockResolvedValue({ id: 'u2', deletedAt: new Date(), lockedUntil: null })
    const { req, res, next } = makeReqResNext({ authorization: 'Bearer valid-token' })
    await optionalAuth(req, res, next)
    expect(next).toHaveBeenCalled()
    expect(req.user).toBeUndefined()
  })

  it('calls next() without user when token belongs to locked account', async () => {
    const decoded = { userId: 'u2', email: 'b@c.com', role: 'STUDENT' }
    mockVerifyAccessToken.mockReturnValue(decoded)
    ;(prisma.user.findUnique as jest.Mock).mockResolvedValue({
      id: 'u2',
      deletedAt: null,
      lockedUntil: new Date(Date.now() + 60000),
    })
    const { req, res, next } = makeReqResNext({ authorization: 'Bearer valid-token' })
    await optionalAuth(req, res, next)
    expect(next).toHaveBeenCalled()
    expect(req.user).toBeUndefined()
  })

  it('calls next() without user when token is invalid (does not throw)', async () => {
    mockVerifyAccessToken.mockImplementation(() => {
      throw new Error('bad')
    })
    const { req, res, next } = makeReqResNext({ authorization: 'Bearer bad-token' })
    await optionalAuth(req, res, next)
    expect(next).toHaveBeenCalled()
    expect(req.user).toBeUndefined()
  })
})

describe('authorize middleware', () => {
  it('returns 401 when no user attached', () => {
    const { req, res, next, status } = makeReqResNext()
    authorize('ADMIN')(req, res, next)
    expect(status).toHaveBeenCalledWith(401)
    expect(next).not.toHaveBeenCalled()
  })

  it('returns 403 when user role not in allowed list', () => {
    const { req, res, next, status } = makeReqResNext()
    req.user = { userId: 'u1', email: 'a@b.com', role: 'STUDENT' }
    authorize('ADMIN')(req, res, next)
    expect(status).toHaveBeenCalledWith(403)
    expect(next).not.toHaveBeenCalled()
  })

  it('calls next() when user role is allowed', () => {
    const { req, res, next } = makeReqResNext()
    req.user = { userId: 'u1', email: 'a@b.com', role: 'ADMIN' }
    authorize('ADMIN', 'SUPERADMIN')(req, res, next)
    expect(next).toHaveBeenCalled()
  })
})

describe('Single-Flight Request Coalescing (Milestone 37)', () => {
  beforeEach(() => {
    jest.clearAllMocks()
    mockCacheGet.mockResolvedValue(null)
    mockCacheSet.mockResolvedValue(undefined)
  })

  it('coalesces 10 concurrent requests into a single database query on cache miss', async () => {
    let queryExecutionCount = 0
    ;(prisma.user.findUnique as jest.Mock).mockImplementation(async () => {
      queryExecutionCount++
      // Simulate 20ms database network latency
      await new Promise(r => setTimeout(r, 20))
      return { id: 'u-concurrent-1', deletedAt: null, lockedUntil: null }
    })

    // 10 concurrent calls arriving at the exact same millisecond
    const concurrentRequests = Array.from({ length: 10 }, () =>
      getCachedUserAccountStatus('u-concurrent-1')
    )

    const results = await Promise.all(concurrentRequests)

    // All 10 callers received valid result
    expect(results).toHaveLength(10)
    for (const res of results) {
      expect(res).toEqual({ id: 'u-concurrent-1', deletedAt: null, lockedUntil: null })
    }

    // Crucial check: Exactly 1 database query was fired, eliminating thundering herds!
    expect(queryExecutionCount).toBe(1)
    expect(prisma.user.findUnique).toHaveBeenCalledTimes(1)
  })

  it('invalidates cache and in-flight promise cleanly', async () => {
    ;(prisma.user.findUnique as jest.Mock).mockResolvedValue({
      id: 'u-inv',
      deletedAt: null,
      lockedUntil: null,
    })

    await getCachedUserAccountStatus('u-inv')
    await invalidateUserAccountStatus('u-inv')

    // After invalidation, a new query can be cleanly initiated
    const fresh = await getCachedUserAccountStatus('u-inv')
    expect(fresh?.id).toBe('u-inv')
  })
})
