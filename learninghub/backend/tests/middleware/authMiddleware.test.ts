import { Request, Response, NextFunction } from 'express'
import { authenticate, optionalAuth, authorize } from '../../src/middleware/authMiddleware'

// Mock the entire AuthService and prisma
jest.mock('../../src/services', () => ({
  AuthService: jest.fn().mockImplementation(() => ({
    verifyAccessToken: jest.fn(),
    getUserById: jest.fn(),
  })),
}))

jest.mock('../../src/config', () => ({
  prisma: {},
  jwtConfig: {
    accessSecret: 'test-secret',
    refreshSecret: 'test-refresh-secret',
    accessExpiresIn: '15m',
    issuer: 'learninghub',
    audience: 'learninghub-users',
  },
  corsOptions: { origin: 'http://localhost:5173' },
  helmetConfig: {},
  generalRateLimit: (_req: any, _res: any, next: any) => next(),
  authRateLimit: (_req: any, _res: any, next: any) => next(),
  adminRateLimit: (_req: any, _res: any, next: any) => next(),
  bcryptConfig: { rounds: 10 },
  validatePasswordStrength: () => ({ valid: true, errors: [] }),
}))

jest.mock('../../src/prismaClient', () => ({
  prisma: {},
}))

import { AuthService } from '../../src/services'

const mockVerifyAccessToken = jest.fn()
const mockGetUserById = jest.fn()

;(AuthService as jest.Mock).mockImplementation(() => ({
  verifyAccessToken: mockVerifyAccessToken,
  getUserById: mockGetUserById,
}))

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
    mockGetUserById.mockResolvedValue(null)
    const { req, res, next, status } = makeReqResNext({ authorization: 'Bearer valid-token' })
    await authenticate(req, res, next)
    expect(status).toHaveBeenCalledWith(401)
    expect(next).not.toHaveBeenCalled()
  })

  it('returns 401 when account is soft-deleted', async () => {
    mockVerifyAccessToken.mockReturnValue({ userId: 'u1', email: 'a@b.com', role: 'STUDENT' })
    mockGetUserById.mockResolvedValue({ id: 'u1', deletedAt: new Date(), lockedUntil: null })
    const { req, res, next, status } = makeReqResNext({ authorization: 'Bearer valid-token' })
    await authenticate(req, res, next)
    expect(status).toHaveBeenCalledWith(401)
    expect(next).not.toHaveBeenCalled()
  })

  it('returns 401 when account is locked', async () => {
    const future = new Date(Date.now() + 60000)
    mockVerifyAccessToken.mockReturnValue({ userId: 'u1', email: 'a@b.com', role: 'STUDENT' })
    mockGetUserById.mockResolvedValue({ id: 'u1', deletedAt: null, lockedUntil: future })
    const { req, res, next, status } = makeReqResNext({ authorization: 'Bearer valid-token' })
    await authenticate(req, res, next)
    expect(status).toHaveBeenCalledWith(401)
    expect(next).not.toHaveBeenCalled()
  })

  it('calls next() and attaches user when token is valid', async () => {
    const decoded = { userId: 'u1', email: 'a@b.com', role: 'STUDENT' }
    mockVerifyAccessToken.mockReturnValue(decoded)
    mockGetUserById.mockResolvedValue({ id: 'u1', deletedAt: null, lockedUntil: null })
    const { req, res, next } = makeReqResNext({ authorization: 'Bearer valid-token' })
    await authenticate(req, res, next)
    expect(next).toHaveBeenCalled()
    expect(req.user).toEqual(expect.objectContaining({ userId: 'u1', role: 'STUDENT' }))
  })
})

describe('optionalAuth middleware', () => {
  beforeEach(() => jest.clearAllMocks())

  it('calls next() without setting user when no token', async () => {
    const { req, res, next } = makeReqResNext()
    await optionalAuth(req, res, next)
    expect(next).toHaveBeenCalled()
    expect(req.user).toBeUndefined()
  })

  it('calls next() and attaches user when valid token provided', async () => {
    const decoded = { userId: 'u2', email: 'b@c.com', role: 'STUDENT' }
    mockVerifyAccessToken.mockReturnValue(decoded)
    const { req, res, next } = makeReqResNext({ authorization: 'Bearer valid-token' })
    await optionalAuth(req, res, next)
    expect(next).toHaveBeenCalled()
    expect(req.user).toEqual(expect.objectContaining({ userId: 'u2' }))
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
