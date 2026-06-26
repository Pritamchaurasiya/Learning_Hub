import { Request, Response } from 'express'
import { mockDeep, DeepMockProxy } from 'jest-mock-extended'
import { register, login, refresh, me } from '../../src/controllers/authController'
import { prisma } from '../../src/prismaClient'
import bcrypt from 'bcryptjs'
import { createUser } from '../factories/user.factory'

// Mock dependencies
jest.mock('bcryptjs')
jest.mock('../../src/utils/auth', () => ({
  generateToken: jest.fn().mockReturnValue('mock-token'),
  generateRefreshToken: jest.fn().mockReturnValue('mock-refresh-token'),
  verifyRefreshToken: jest.fn(),
  hashToken: jest.fn().mockReturnValue('hashed-token'),
}))
jest.mock('../../src/utils/logger', () => ({
  __esModule: true,
  default: {
    error: jest.fn(),
    info: jest.fn(),
    warn: jest.fn(),
    debug: jest.fn(),
    audit: jest.fn(),
  },
}))
jest.mock('../../src/services/EmailService', () => ({
  emailService: {
    sendVerificationEmail: jest.fn().mockResolvedValue(true),
    sendPasswordResetEmail: jest.fn().mockResolvedValue(true),
  },
}))
jest.mock('../../src/services/QueryOptimizationService', () => ({
  queryOptimizationService: {
    getUserPerformanceSummary: jest.fn().mockResolvedValue({
      test_stats: { total_tests: 0, average_score: 0, best_score: 0, worst_score: 0 },
      recent_tests: [],
    }),
  },
}))
jest.mock('../../src/services/CacheService', () => ({
  cacheService: {
    get: jest.fn().mockResolvedValue(null),
    set: jest.fn().mockResolvedValue(true),
    generateKey: jest.fn().mockReturnValue('mock-key'),
    delete: jest.fn().mockResolvedValue(true),
  },
}))
jest.mock('../../src/config', () => ({
  bcryptConfig: { rounds: 10 },
}))

describe('AuthController', () => {
  let mockReq: DeepMockProxy<Request>
  let mockRes: DeepMockProxy<Response>
  let jsonMock: jest.Mock
  let statusMock: jest.Mock

  beforeEach(() => {
    jsonMock = jest.fn().mockReturnThis()
    statusMock = jest.fn().mockReturnValue({ json: jsonMock })
    mockReq = mockDeep<Request>()
    mockRes = mockDeep<Response>()
    mockRes.status = statusMock as any
    mockRes.json = jsonMock as any

    // Reset all mocks
    jest.clearAllMocks()
  })

  describe('register', () => {
    it('should register a new user successfully', async () => {
      const userData = {
        email: 'test@example.com',
        password: 'StrongPass123!',
        username: 'testuser',
      }
      const createdUser = createUser({
        id: 'user-123',
        email: userData.email,
        username: userData.username,
        role: 'STUDENT',
      })

      mockReq.body = userData
      ;(prisma.user.findUnique as jest.Mock).mockResolvedValue(null)
      ;(prisma.user.create as jest.Mock).mockResolvedValue(createdUser)
      ;(prisma.refreshToken.create as jest.Mock).mockResolvedValue({ id: 'rt-1' })
      ;(bcrypt.hash as jest.Mock).mockResolvedValue('hashed-password')

      await register(mockReq, mockRes)

      expect(statusMock).toHaveBeenCalledWith(201)
      expect(jsonMock).toHaveBeenCalledWith({
        status: 'success',
        message: 'Registration successful',
        data: {
          access_token: 'mock-token',
          user: {
            id: createdUser.id,
            email: createdUser.email,
            username: createdUser.username,
            role: createdUser.role,
            xp: createdUser.xp,
            level: createdUser.level,
            streak: createdUser.streak,
          },
        },
      })
    })

    it('should return 400 when email or password is missing', async () => {
      mockReq.body = { email: 'test@example.com' }

      await register(mockReq, mockRes)

      expect(statusMock).toHaveBeenCalledWith(400)
      expect(jsonMock).toHaveBeenCalledWith(
        expect.objectContaining({
          status: 'error',
          message: 'Email and password are required',
        })
      )
    })

    it('should return 409 when email already exists', async () => {
      const userData = {
        email: 'existing@example.com',
        password: 'StrongPass123!',
      }
      const existingUser = createUser({ email: userData.email })

      mockReq.body = userData
      ;(prisma.user.findUnique as jest.Mock).mockResolvedValue(existingUser)

      await register(mockReq, mockRes)

      expect(statusMock).toHaveBeenCalledWith(409)
      expect(jsonMock).toHaveBeenCalledWith(
        expect.objectContaining({
          status: 'error',
          message: 'Email already exists',
        })
      )
    })

    it('should return 500 on database error', async () => {
      mockReq.body = {
        email: 'test@example.com',
        password: 'StrongPass123!',
      }
      Object.defineProperty(mockReq, 'ip', { value: '127.0.0.1' })
      ;(prisma.user.findUnique as jest.Mock).mockRejectedValue(new Error('Database error'))

      await register(mockReq, mockRes)

      expect(statusMock).toHaveBeenCalledWith(500)
      expect(jsonMock).toHaveBeenCalledWith(
        expect.objectContaining({
          status: 'error',
          message: 'Internal server error',
        })
      )
    })
  })

  describe('login', () => {
    it('should login successfully with valid credentials', async () => {
      const userData = {
        email: 'test@example.com',
        password: 'StrongPass123!',
      }
      const existingUser = createUser({
        id: 'user-123',
        email: userData.email,
        password: 'hashed-password',
      })

      mockReq.body = userData
      ;(prisma.user.findUnique as jest.Mock).mockResolvedValue(existingUser)
      ;(prisma.user.update as jest.Mock).mockResolvedValue(existingUser)
      ;(prisma.refreshToken.create as jest.Mock).mockResolvedValue({ id: 'rt-1' })
      ;(bcrypt.compare as jest.Mock).mockResolvedValue(true)

      await login(mockReq, mockRes)

      expect(statusMock).toHaveBeenCalledWith(200)
      expect(jsonMock).toHaveBeenCalledWith({
        status: 'success',
        message: 'Login successful',
        data: {
          access_token: 'mock-token',
          user: {
            id: existingUser.id,
            email: existingUser.email,
            username: existingUser.username,
            role: existingUser.role,
            xp: existingUser.xp,
            level: existingUser.level,
            streak: existingUser.streak,
            lastActive: existingUser.lastActive,
          },
        },
      })
    })

    it('should return 401 for non-existent user', async () => {
      mockReq.body = {
        email: 'nonexistent@example.com',
        password: 'StrongPass123!',
      }
      ;(prisma.user.findUnique as jest.Mock).mockResolvedValue(null)

      await login(mockReq, mockRes)

      expect(statusMock).toHaveBeenCalledWith(401)
      expect(jsonMock).toHaveBeenCalledWith(
        expect.objectContaining({
          status: 'error',
          message: 'Invalid email or password',
        })
      )
    })

    it('should return 401 for invalid password', async () => {
      const userData = {
        email: 'test@example.com',
        password: 'wrongpassword',
      }
      const existingUser = createUser({
        email: userData.email,
        password: 'hashed-password',
      })

      mockReq.body = userData
      ;(prisma.user.findUnique as jest.Mock).mockResolvedValue(existingUser)
      ;(prisma.user.update as jest.Mock).mockResolvedValue(existingUser)
      ;(bcrypt.compare as jest.Mock).mockResolvedValue(false)

      await login(mockReq, mockRes)

      expect(statusMock).toHaveBeenCalledWith(401)
      expect(jsonMock).toHaveBeenCalledWith(
        expect.objectContaining({
          status: 'error',
          message: 'Invalid email or password',
        })
      )
    })

    it('should return 500 on database error', async () => {
      mockReq.body = {
        email: 'test@example.com',
        password: 'StrongPass123!',
      }
      Object.defineProperty(mockReq, 'ip', { value: '127.0.0.1' })
      ;(prisma.user.findUnique as jest.Mock).mockRejectedValue(new Error('Database error'))

      await login(mockReq, mockRes)

      expect(statusMock).toHaveBeenCalledWith(500)
      expect(jsonMock).toHaveBeenCalledWith(
        expect.objectContaining({
          status: 'error',
          message: 'Internal server error',
        })
      )
    })
  })

  describe('refresh', () => {
    const { verifyRefreshToken } = jest.requireMock('../../src/utils/auth')

    it('should refresh token successfully', async () => {
      const refreshToken = 'valid-refresh-token'
      const user = createUser({ id: 'user-123' })

      mockReq.body = { refresh_token: refreshToken }
      verifyRefreshToken.mockReturnValue({ userId: user.id })
      ;(prisma.refreshToken.findUnique as jest.Mock).mockResolvedValue({
        id: 'rt-1',
        token: 'hashed-token',
        userId: user.id,
        revokedAt: null,
        usedAt: null,
        expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
      })
      ;(prisma.refreshToken.update as jest.Mock).mockResolvedValue({})
      ;(prisma.refreshToken.create as jest.Mock).mockResolvedValue({ id: 'rt-2' })
      ;(prisma.user.findUnique as jest.Mock).mockResolvedValue(user)

      await refresh(mockReq, mockRes)

      expect(jsonMock).toHaveBeenCalledWith(
        expect.objectContaining({
          status: 'success',
          data: expect.objectContaining({
            access_token: 'mock-token',
          }),
        })
      )
    })

    it('should accept refresh key for backward compatibility', async () => {
      const refreshToken = 'valid-refresh-token'
      const user = createUser({ id: 'user-123' })

      mockReq.body = { refresh: refreshToken }
      verifyRefreshToken.mockReturnValue({ userId: user.id })
      ;(prisma.refreshToken.findUnique as jest.Mock).mockResolvedValue({
        id: 'rt-1',
        token: 'hashed-token',
        userId: user.id,
        revokedAt: null,
        usedAt: null,
        expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
      })
      ;(prisma.refreshToken.update as jest.Mock).mockResolvedValue({})
      ;(prisma.refreshToken.create as jest.Mock).mockResolvedValue({ id: 'rt-2' })
      ;(prisma.user.findUnique as jest.Mock).mockResolvedValue(user)

      await refresh(mockReq, mockRes)

      expect(jsonMock).toHaveBeenCalledWith(
        expect.objectContaining({
          status: 'success',
          data: expect.objectContaining({
            access_token: 'mock-token',
          }),
        })
      )
    })

    it('should return 400 when refresh token is missing', async () => {
      mockReq.body = {}
      mockReq.cookies = {}

      await refresh(mockReq, mockRes)

      expect(statusMock).toHaveBeenCalledWith(400)
      expect(jsonMock).toHaveBeenCalledWith(
        expect.objectContaining({
          status: 'error',
          message: 'Refresh token is required',
        })
      )
    })

    it('should return 401 for invalid refresh token', async () => {
      mockReq.body = { refresh_token: 'invalid-token' }
      verifyRefreshToken.mockReturnValue(null)

      await refresh(mockReq, mockRes)

      expect(statusMock).toHaveBeenCalledWith(401)
      expect(jsonMock).toHaveBeenCalledWith(
        expect.objectContaining({
          status: 'error',
          message: 'Invalid refresh token',
        })
      )
    })

    it('should return 401 when user no longer exists', async () => {
      const refreshToken = 'valid-refresh-token'

      mockReq.body = { refresh_token: refreshToken }
      verifyRefreshToken.mockReturnValue({ userId: 'non-existent-id' })
      ;(prisma.refreshToken.findUnique as jest.Mock).mockResolvedValue({
        id: 'rt-1',
        token: 'hashed-token',
        revokedAt: null,
        usedAt: null,
        expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
      })
      ;(prisma.user.findUnique as jest.Mock).mockResolvedValue(null)

      await refresh(mockReq, mockRes)

      expect(statusMock).toHaveBeenCalledWith(401)
      expect(jsonMock).toHaveBeenCalledWith(
        expect.objectContaining({
          status: 'error',
          message: 'User no longer exists',
        })
      )
    })

    it('should return 401 on token verification error', async () => {
      mockReq.body = { refresh_token: 'token' }
      verifyRefreshToken.mockImplementation(() => {
        throw new Error('Invalid token')
      })

      await refresh(mockReq, mockRes)

      expect(statusMock).toHaveBeenCalledWith(401)
      expect(jsonMock).toHaveBeenCalledWith(
        expect.objectContaining({
          status: 'error',
          message: 'Invalid or expired refresh token',
        })
      )
    })
  })

  describe('me', () => {
    it('should return user profile successfully', async () => {
      const user = createUser({
        id: 'user-123',
      })

      ;(mockReq as any).user = { userId: user.id, email: user.email, role: user.role }
      ;(prisma.user.findUnique as jest.Mock).mockResolvedValue(user)
      ;(prisma.userProgress.findMany as jest.Mock).mockResolvedValue([])
      ;(prisma.bookmark.findMany as jest.Mock).mockResolvedValue([])
      ;(prisma.userAchievement.findMany as jest.Mock).mockResolvedValue([])
      ;(prisma.user.update as jest.Mock).mockResolvedValue(user)

      await me(mockReq as any, mockRes)

      expect(jsonMock).toHaveBeenCalledWith(
        expect.objectContaining({
          status: 'success',
          data: expect.objectContaining({
            user: expect.objectContaining({
              id: user.id,
              email: user.email,
              username: user.username,
              role: user.role,
            }),
            bookmarks: [],
            achievements: [],
          }),
        })
      )
    })

    it('should return 404 when user not found', async () => {
      ;(mockReq as any).user = { userId: 'non-existent-id' }
      ;(prisma.user.findUnique as jest.Mock).mockResolvedValue(null)
      // me() calls Promise.all which also calls findMany — mock them to prevent errors
      ;(prisma.bookmark.findMany as jest.Mock).mockResolvedValue([])
      ;(prisma.userAchievement.findMany as jest.Mock).mockResolvedValue([])
      ;(prisma.userProgress.findMany as jest.Mock).mockResolvedValue([])

      await me(mockReq as any, mockRes)

      expect(statusMock).toHaveBeenCalledWith(404)
      expect(jsonMock).toHaveBeenCalledWith(
        expect.objectContaining({
          status: 'error',
          message: 'User not found',
        })
      )
    })

    it('should return 500 on database error', async () => {
      ;(mockReq as any).user = { userId: 'user-123' }
      ;(prisma.user.findUnique as jest.Mock).mockRejectedValue(new Error('Database error'))

      await me(mockReq as any, mockRes)

      expect(statusMock).toHaveBeenCalledWith(500)
      expect(jsonMock).toHaveBeenCalledWith(
        expect.objectContaining({
          status: 'error',
          message: 'Internal server error',
        })
      )
    })
  })
})
