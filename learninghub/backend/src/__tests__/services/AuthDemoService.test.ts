import { csrfProtection } from '../../middleware/csrfMiddleware'
import { AuthService } from '../../services/AuthService'
import { Request, Response } from 'express'
import bcrypt from 'bcryptjs'

jest.mock('../../services/CacheService', () => ({
  cacheService: {
    userKey: jest.fn((id: string) => `user:${id}`),
    set: jest.fn().mockResolvedValue(true),
    get: jest.fn().mockResolvedValue(null),
    del: jest.fn().mockResolvedValue(true),
  },
  invalidateAuthStatusCache: jest.fn().mockResolvedValue(undefined),
}))

describe('Auth & Demo Resilience Suite (Milestone 35)', () => {
  describe('csrfProtection Middleware', () => {
    let mockReq: Partial<Request>
    let mockRes: Partial<Response>
    let nextFunction: jest.Mock

    beforeEach(() => {
      mockRes = {
        status: jest.fn().mockReturnThis(),
        json: jest.fn().mockReturnThis(),
      }
      nextFunction = jest.fn()
    })

    it('exempts /api/v1/auth/demo-login from CSRF requirements', async () => {
      mockReq = {
        method: 'POST',
        originalUrl: '/api/v1/auth/demo-login',
        headers: {},
      }

      await csrfProtection(mockReq as Request, mockRes as Response, nextFunction)
      expect(nextFunction).toHaveBeenCalled()
      expect(mockRes.status).not.toHaveBeenCalled()
    })

    it('exempts /auth/demo-login from CSRF requirements', async () => {
      mockReq = {
        method: 'POST',
        originalUrl: '/auth/demo-login',
        headers: {},
      }

      await csrfProtection(mockReq as Request, mockRes as Response, nextFunction)
      expect(nextFunction).toHaveBeenCalled()
      expect(mockRes.status).not.toHaveBeenCalled()
    })

    it('exempts /api/v1/auth/mfa/login from CSRF requirements', async () => {
      mockReq = {
        method: 'POST',
        originalUrl: '/api/v1/auth/mfa/login',
        headers: {},
      }

      await csrfProtection(mockReq as Request, mockRes as Response, nextFunction)
      expect(nextFunction).toHaveBeenCalled()
      expect(mockRes.status).not.toHaveBeenCalled()
    })

    it('blocks unexempted state-changing paths without CSRF token', async () => {
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

  describe('AuthService Demo Account Self-Healing & Compatibility', () => {
    let prismaMock: any
    let authService: AuthService

    beforeEach(() => {
      prismaMock = {
        $transaction: jest.fn().mockImplementation(async (cb: any) => cb(prismaMock)),
        user: {
          findFirst: jest.fn(),
          findUnique: jest.fn(),
          create: jest.fn(),
          update: jest.fn(),
          upsert: jest.fn(),
        },
        userSession: {
          findMany: jest.fn().mockResolvedValue([]),
          create: jest.fn().mockResolvedValue({ id: 'sess-1' }),
          deleteMany: jest.fn().mockResolvedValue({ count: 0 }),
        },
        refreshToken: {
          findMany: jest.fn().mockResolvedValue([]),
          create: jest.fn().mockResolvedValue({ id: 'ref-1' }),
          deleteMany: jest.fn().mockResolvedValue({ count: 0 }),
        },
        auditLog: {
          create: jest.fn().mockResolvedValue({ id: 'audit-1' }),
        },
        verificationToken: {
          upsert: jest.fn().mockResolvedValue({}),
        },
      }

      authService = new AuthService(prismaMock as any)
    })

    it('auto-provisions demo student account if not present in database', async () => {
      const hashedPassword = await bcrypt.hash('Student@123!', 10)
      const mockCreatedUser = {
        id: 'student-demo-id',
        email: 'student@learninghub.com',
        username: 'student',
        password: hashedPassword,
        role: 'STUDENT',
        emailVerified: true,
        xp: 1250,
        level: 5,
        streak: 7,
        failedLogins: 0,
        lockedUntil: null,
      }

      // First call findByEmail returns null
      prismaMock.user.findFirst.mockResolvedValueOnce(null)
      // Upsert returns the newly provisioned user
      prismaMock.user.upsert.mockResolvedValueOnce(mockCreatedUser)

      const result = await authService.login({
        email: 'student@learninghub.com',
        password: 'Student@123!',
      })

      expect(prismaMock.user.upsert).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { email: 'student@learninghub.com' },
          create: expect.objectContaining({
            email: 'student@learninghub.com',
            role: 'STUDENT',
            emailVerified: true,
          }),
        })
      )
      expect(result.user.email).toBe('student@learninghub.com')
      expect(result.tokens).toBeDefined()
      expect(result.tokens.accessToken).toBeDefined()
    })

    it('allows alternate demo password and syncs password hash', async () => {
      const oldHash = await bcrypt.hash('Student@2026#Hub', 10)
      const mockUser = {
        id: 'student-demo-id',
        email: 'student@learninghub.com',
        username: 'student',
        password: oldHash,
        role: 'STUDENT',
        emailVerified: true,
        xp: 1250,
        level: 5,
        streak: 7,
        failedLogins: 0,
        lockedUntil: null,
      }

      prismaMock.user.findFirst.mockResolvedValueOnce(mockUser)
      prismaMock.user.update.mockResolvedValueOnce(mockUser)

      // Login using Student@123!
      const result = await authService.login({
        email: 'student@learninghub.com',
        password: 'Student@123!',
      })

      expect(result.user.email).toBe('student@learninghub.com')
      expect(prismaMock.user.update).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { id: 'student-demo-id' },
          data: expect.objectContaining({
            failedLogins: 0,
            lockedUntil: null,
          }),
        })
      )
    })

    it('auto-unlocks locked demo user when valid demo credentials are supplied', async () => {
      const validHash = await bcrypt.hash('Admin@123!', 10)
      const mockLockedAdmin = {
        id: 'admin-demo-id',
        email: 'admin@learninghub.com',
        username: 'admin',
        password: validHash,
        role: 'ADMIN',
        emailVerified: true,
        xp: 9999,
        level: 25,
        streak: 21,
        failedLogins: 5,
        lockedUntil: new Date(Date.now() + 600000), // locked for 10 minutes
      }

      prismaMock.user.findFirst.mockResolvedValueOnce(mockLockedAdmin)
      prismaMock.user.update.mockResolvedValueOnce({
        ...mockLockedAdmin,
        lockedUntil: null,
        failedLogins: 0,
      })

      const result = await authService.login({
        email: 'admin@learninghub.com',
        password: 'Admin@123!',
      })

      expect(result.user.email).toBe('admin@learninghub.com')
      expect(prismaMock.user.update).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { id: 'admin-demo-id' },
          data: { failedLogins: 0, lockedUntil: null },
        })
      )
    })
  })
})
