import { csrfProtection } from '../../middleware/csrfMiddleware'
import { AuthService } from '../../services/AuthService'
import { Request, Response } from 'express'
import bcrypt from 'bcryptjs'

jest.mock('../../services/CacheService', () => ({
  cacheService: {
    userKey: jest.fn((id: string) => `user:${id}`),
    set: jest.fn().mockResolvedValue(true),
    get: jest.fn().mockResolvedValue(null),
    delete: jest.fn().mockResolvedValue(true),
    del: jest.fn().mockResolvedValue(true),
  },
  invalidateAuthStatusCache: jest.fn().mockResolvedValue(undefined),
}))

describe('Authentication security regression suite', () => {
  describe('csrfProtection middleware', () => {
    let mockReq: Partial<Request>
    let mockRes: Partial<Response>
    let nextFunction: jest.Mock

    beforeEach(() => {
      process.env.NODE_ENV = 'development'
      mockRes = {
        status: jest.fn().mockReturnThis(),
        json: jest.fn().mockReturnThis(),
      }
      nextFunction = jest.fn()
    })

    it.each(['/api/v1/auth/demo-login', '/auth/demo-login'])(
      'allows the local-only demo-login pre-auth flow in development: %s',
      async path => {
        mockReq = { method: 'POST', originalUrl: path, headers: {} }
        await csrfProtection(mockReq as Request, mockRes as Response, nextFunction)
        expect(nextFunction).toHaveBeenCalled()
        expect(mockRes.status).not.toHaveBeenCalled()
      }
    )

    it('does not exempt demo-login from CSRF checks in production', async () => {
      const previousNodeEnv = process.env.NODE_ENV
      process.env.NODE_ENV = 'production'
      try {
        mockReq = {
          method: 'POST',
          originalUrl: '/api/v1/auth/demo-login',
          headers: {},
        }
        await csrfProtection(mockReq as Request, mockRes as Response, nextFunction)
        expect(nextFunction).not.toHaveBeenCalled()
        expect(mockRes.status).toHaveBeenCalledWith(403)
      } finally {
        process.env.NODE_ENV = previousNodeEnv
      }
    })

    it('keeps the MFA pre-authentication endpoint exemption', async () => {
      mockReq = {
        method: 'POST',
        originalUrl: '/api/v1/auth/mfa/login',
        headers: {},
      }
      await csrfProtection(mockReq as Request, mockRes as Response, nextFunction)
      expect(nextFunction).toHaveBeenCalled()
      expect(mockRes.status).not.toHaveBeenCalled()
    })

    it('blocks unexempted state-changing paths without a CSRF token', async () => {
      mockReq = {
        method: 'POST',
        originalUrl: '/api/v1/user/profile',
        headers: {},
      }
      await csrfProtection(mockReq as Request, mockRes as Response, nextFunction)
      expect(nextFunction).not.toHaveBeenCalled()
      expect(mockRes.status).toHaveBeenCalledWith(403)
    })
  })

  describe('AuthService demo identity protections', () => {
    let prismaMock: any
    let authService: AuthService

    beforeEach(() => {
      process.env.NODE_ENV = 'development'
      prismaMock = {
        user: {
          findFirst: jest.fn(),
          update: jest.fn().mockResolvedValue({}),
          upsert: jest.fn(),
        },
        userSession: {
          findMany: jest.fn().mockResolvedValue([]),
          create: jest.fn().mockResolvedValue({ id: 'session-1' }),
          deleteMany: jest.fn().mockResolvedValue({ count: 0 }),
        },
        refreshToken: {
          findMany: jest.fn().mockResolvedValue([]),
          create: jest.fn().mockResolvedValue({ id: 'refresh-1' }),
          deleteMany: jest.fn().mockResolvedValue({ count: 0 }),
        },
        auditLog: {
          create: jest.fn().mockResolvedValue({ id: 'audit-1' }),
        },
        verificationToken: {
          upsert: jest.fn().mockResolvedValue({}),
        },
        $transaction: jest.fn().mockImplementation(async (callback: any) => callback(prismaMock)),
      }
      authService = new AuthService(prismaMock as any)
    })

    it('does not auto-provision a missing demo admin identity', async () => {
      prismaMock.user.findFirst.mockResolvedValueOnce(null)
      await expect(
        authService.login({ email: 'admin@learninghub.com', password: 'Admin@123!' })
      ).rejects.toThrow('Invalid credentials')
      expect(prismaMock.user.upsert).not.toHaveBeenCalled()
      expect(prismaMock.user.create).toBeUndefined()
    })

    it('does not accept a hardcoded alternate demo password', async () => {
      const storedHash = await bcrypt.hash('A different long password!', 10)
      const demoStudent = {
        id: 'student-demo-id',
        email: 'student@learninghub.com',
        username: 'student',
        password: storedHash,
        role: 'STUDENT',
        emailVerified: true,
        xp: 1250,
        level: 5,
        streak: 7,
        failedLogins: 0,
        lockedUntil: null,
      }
      prismaMock.user.findFirst.mockResolvedValueOnce(demoStudent)
      await expect(
        authService.login({ email: 'student@learninghub.com', password: 'Student@123!' })
      ).rejects.toThrow('Invalid credentials')
      expect(prismaMock.user.update).toHaveBeenCalled()
      expect(prismaMock.auditLog.create).toHaveBeenCalled()
    })

    it('does not bypass an active lockout for a demo identity', async () => {
      const lockedAdmin = {
        id: 'admin-demo-id',
        email: 'admin@learninghub.com',
        username: 'admin',
        password: await bcrypt.hash('Admin@123!', 10),
        role: 'ADMIN',
        emailVerified: true,
        xp: 9999,
        level: 25,
        streak: 21,
        failedLogins: 5,
        lockedUntil: new Date(Date.now() + 600000),
      }
      prismaMock.user.findFirst.mockResolvedValueOnce(lockedAdmin)
      await expect(
        authService.login({ email: 'admin@learninghub.com', password: 'Admin@123!' })
      ).rejects.toThrow('Account locked')
      expect(prismaMock.user.update).not.toHaveBeenCalled()
    })

    it('rejects reserved demo identities outside the explicit development runtime', async () => {
      const previousNodeEnv = process.env.NODE_ENV
      process.env.NODE_ENV = 'production'
      try {
        await expect(
          authService.login({ email: 'student@learninghub.com', password: 'Student@123!' })
        ).rejects.toThrow('Invalid credentials')
        expect(prismaMock.user.findFirst).not.toHaveBeenCalled()
      } finally {
        process.env.NODE_ENV = previousNodeEnv
      }
    })
  })
})
