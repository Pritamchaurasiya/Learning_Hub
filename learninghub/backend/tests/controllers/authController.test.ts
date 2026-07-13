import { Request, Response } from 'express'
import { mockDeep, DeepMockProxy } from 'jest-mock-extended'
import jwt from 'jsonwebtoken'
import {
  register,
  login,
  refresh,
  me,
  setupMfa,
  verifyAndEnableMfa,
  disableMfa,
  verifyMfaLogin,
} from '../../src/controllers/authController'
import { createUser } from '../factories/user.factory'
import { prisma } from '../../src/prismaClient'
import { MfaService } from '../../src/services/MfaService'
import { config } from '../../src/utils/env'

jest.mock('../../src/services/MfaService', () => ({
  MfaService: {
    generateSecret: jest.fn(),
    verifyAndEnable: jest.fn(),
    validateToken: jest.fn(),
  },
}))

// Mock AuthService – factory is self-contained (jest.mock is hoisted above all code)
var _svc: Record<string, jest.Mock>
jest.mock('../../src/services/AuthService', () => {
  const inst = {
    register: jest.fn(),
    login: jest.fn(),
    logout: jest.fn().mockResolvedValue(undefined),
    changePassword: jest.fn().mockResolvedValue(undefined),
    updateProfile: jest.fn().mockResolvedValue({}),
    deleteAccount: jest.fn().mockResolvedValue(undefined),
    resetPassword: jest.fn().mockResolvedValue(undefined),
    refreshToken: jest
      .fn()
      .mockResolvedValue({ accessToken: 'new-access', refreshToken: 'new-refresh' }),
  }
  _svc = inst
  return { __esModule: true, AuthService: jest.fn(() => inst) }
})

jest.mock('../../src/utils/auth', () => ({
  generateToken: jest.fn().mockReturnValue('mock-token'),
  generateRefreshToken: jest.fn().mockReturnValue('mock-refresh-token'),
  verifyRefreshToken: jest.fn(),
  verifyMfaSessionToken: jest.fn().mockReturnValue('user-123'),
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

jest.mock('../../src/services/CacheService', () => ({
  cacheService: {
    get: jest.fn().mockResolvedValue(null),
    set: jest.fn().mockResolvedValue(true),
    generateKey: jest.fn().mockReturnValue('mock-key'),
    delete: jest.fn().mockResolvedValue(true),
    incrementWithExpiry: jest.fn().mockResolvedValue(1),
    expire: jest.fn().mockResolvedValue(true),
  },
}))

jest.mock('../../src/services/QueryOptimizationService', () => ({
  queryOptimizationService: {
    getUserPerformanceSummary: jest
      .fn()
      .mockResolvedValue({
        test_stats: { total_tests: 0, average_score: 0, best_score: 0, worst_score: 0 },
        recent_tests: [],
      }),
  },
}))

jest.mock('../../src/config', () => ({
  __esModule: true,
  bcryptConfig: { rounds: 10 },
  validatePasswordStrength: jest.fn().mockReturnValue({ valid: true, errors: [] }),
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
    mockReq.cookies = {}
    mockRes = mockDeep<Response>()
    mockRes.status = statusMock as any
    mockRes.json = jsonMock as any
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

      _svc.register.mockResolvedValue({
        user: createdUser,
        tokens: { accessToken: 'mock-token', refreshToken: 'mock-refresh-token', expiresIn: 900 },
      })
      mockReq.body = userData
      ;(mockReq as any).ip = '127.0.0.1'

      await register(mockReq as any, mockRes as any, jest.fn())

      expect(mockRes.cookie).toHaveBeenCalledWith('access_token', 'mock-token', expect.any(Object))
      expect(mockRes.cookie).toHaveBeenCalledWith(
        'refresh_token',
        'mock-refresh-token',
        expect.any(Object)
      )
      expect(statusMock).toHaveBeenCalledWith(201)
      expect(jsonMock).toHaveBeenCalledWith({
        status: 'success',
        message: 'Registration successful',
        data: {
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

      await register(mockReq as any, mockRes as any, jest.fn())

      expect(statusMock).toHaveBeenCalledWith(400)
      expect(jsonMock).toHaveBeenCalledWith(
        expect.objectContaining({ status: 'error', message: 'Email and password are required' })
      )
    })

    it('should return 400 when email already exists to prevent enumeration', async () => {
      _svc.register.mockRejectedValue(new Error('Registration failed: Invalid request'))
      mockReq.body = { email: 'existing@example.com', password: 'StrongPass123!' }

      await register(mockReq as any, mockRes as any, jest.fn())

      expect(statusMock).toHaveBeenCalledWith(400)
      expect(jsonMock).toHaveBeenCalledWith(
        expect.objectContaining({ status: 'error', message: 'Registration failed. Email or username may be unavailable' })
      )
    })

    it('should return 500 on database error', async () => {
      _svc.register.mockRejectedValue(new Error('Database error'))
      mockReq.body = { email: 'test@example.com', password: 'StrongPass123!', username: 'testuser' }

      await register(mockReq as any, mockRes as any, jest.fn())

      expect(statusMock).toHaveBeenCalledWith(500)
    })
  })

  describe('login', () => {
    it('should login successfully with valid credentials', async () => {
      const existingUser = createUser({
        id: 'user-123',
        email: 'test@example.com',
        password: 'hashed-password',
      })

      _svc.login.mockResolvedValue({
        user: existingUser,
        tokens: { accessToken: 'mock-token', refreshToken: 'mock-refresh-token', expiresIn: 900 },
      })
      mockReq.body = { email: 'test@example.com', password: 'StrongPass123!' }

      await login(mockReq as any, mockRes as any, jest.fn())

      expect(mockRes.cookie).toHaveBeenCalledWith('access_token', 'mock-token', expect.any(Object))
      expect(mockRes.cookie).toHaveBeenCalledWith(
        'refresh_token',
        'mock-refresh-token',
        expect.any(Object)
      )
      expect(statusMock).toHaveBeenCalledWith(200)
      expect(jsonMock).toHaveBeenCalledWith({
        status: 'success',
        message: 'Login successful',
        data: {
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

    it('should return mfaRequired challenge if user has mfaEnabled', async () => {
      const mfaUser = createUser({ id: 'user-mfa', email: 'mfa@example.com', mfaEnabled: true })
      _svc.login.mockResolvedValue({
        user: mfaUser,
        tokens: { accessToken: 'mock-token', refreshToken: 'mock-refresh-token', expiresIn: 900 },
      })
      mockReq.body = { email: 'mfa@example.com', password: 'StrongPass123!' }

      await login(mockReq as any, mockRes as any, jest.fn())

      expect(statusMock).toHaveBeenCalledWith(200)
      expect(jsonMock).toHaveBeenCalledWith({
        status: 'success',
        message: 'MFA verification required',
        data: {
          mfaRequired: true,
          mfaSessionToken: expect.any(String),
        },
      })
    })

    it('should return 401 for non-existent user', async () => {
      _svc.login.mockRejectedValue(new Error('Invalid credentials'))
      mockReq.body = { email: 'nonexistent@example.com', password: 'StrongPass123!' }

      await login(mockReq as any, mockRes as any, jest.fn())

      expect(statusMock).toHaveBeenCalledWith(401)
      expect(jsonMock).toHaveBeenCalledWith(
        expect.objectContaining({ status: 'error', message: 'Invalid email or password' })
      )
    })

    it('should return 401 for invalid password', async () => {
      _svc.login.mockRejectedValue(new Error('Invalid credentials'))
      mockReq.body = { email: 'test@example.com', password: 'wrongpassword' }

      await login(mockReq as any, mockRes as any, jest.fn())

      expect(statusMock).toHaveBeenCalledWith(401)
      expect(jsonMock).toHaveBeenCalledWith(
        expect.objectContaining({ status: 'error', message: 'Invalid email or password' })
      )
    })

    it('should return 500 on database error', async () => {
      _svc.login.mockRejectedValue(new Error('Database error'))
      mockReq.body = { email: 'test@example.com', password: 'StrongPass123!' }

      await login(mockReq as any, mockRes as any, jest.fn())

      expect(statusMock).toHaveBeenCalledWith(500)
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

      await refresh(mockReq as any, mockRes as any, jest.fn())

      expect(mockRes.cookie).toHaveBeenCalledWith(
        'access_token',
        expect.any(String),
        expect.any(Object)
      )
      expect(mockRes.cookie).toHaveBeenCalledWith(
        'refresh_token',
        expect.any(String),
        expect.any(Object)
      )
      expect(jsonMock).toHaveBeenCalledWith(
        expect.objectContaining({ status: 'success', data: { message: 'Token refreshed' } })
      )
    })

    it('should accept refresh key for backward compatibility', async () => {
      const user = createUser({ id: 'user-123' })

      mockReq.body = { refresh: 'valid-refresh-token' }
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

      await refresh(mockReq as any, mockRes as any, jest.fn())

      expect(mockRes.cookie).toHaveBeenCalledWith(
        'access_token',
        expect.any(String),
        expect.any(Object)
      )
      expect(mockRes.cookie).toHaveBeenCalledWith(
        'refresh_token',
        expect.any(String),
        expect.any(Object)
      )
      expect(jsonMock).toHaveBeenCalledWith(
        expect.objectContaining({ status: 'success', data: { message: 'Token refreshed' } })
      )
    })

    it('should return 400 when refresh token is missing', async () => {
      mockReq.body = {}
      await refresh(mockReq as any, mockRes as any, jest.fn())
      expect(statusMock).toHaveBeenCalledWith(400)
      expect(jsonMock).toHaveBeenCalledWith(
        expect.objectContaining({ status: 'error', message: 'Refresh token is required' })
      )
    })

    it('should return 401 for invalid refresh token', async () => {
      mockReq.body = { refresh_token: 'invalid-token' }
      _svc.refreshToken.mockRejectedValue(new Error('Invalid refresh token'))

      await refresh(mockReq as any, mockRes as any, jest.fn())

      expect(statusMock).toHaveBeenCalledWith(401)
      expect(jsonMock).toHaveBeenCalledWith(
        expect.objectContaining({ status: 'error', message: 'Invalid or expired refresh token' })
      )
    })

    it('should return 401 when user no longer exists', async () => {
      mockReq.body = { refresh_token: 'valid-refresh-token' }
      _svc.refreshToken.mockRejectedValue(new Error('User not found or deleted'))

      await refresh(mockReq as any, mockRes as any, jest.fn())

      expect(statusMock).toHaveBeenCalledWith(401)
      expect(jsonMock).toHaveBeenCalledWith(
        expect.objectContaining({ status: 'error', message: 'Invalid or expired refresh token' })
      )
    })

    it('should return 401 on token verification error', async () => {
      mockReq.body = { refresh_token: 'token' }
      _svc.refreshToken.mockRejectedValue(new Error('Invalid or expired refresh token'))

      await refresh(mockReq as any, mockRes as any, jest.fn())

      expect(statusMock).toHaveBeenCalledWith(401)
      expect(jsonMock).toHaveBeenCalledWith(
        expect.objectContaining({ status: 'error', message: 'Invalid or expired refresh token' })
      )
    })
  })

  describe('me', () => {
    it('should return user profile successfully', async () => {
      const user = createUser({ id: 'user-123' })

      ;(mockReq as any).user = { userId: user.id, email: user.email, role: user.role }
      ;(prisma.user.findUnique as jest.Mock).mockResolvedValue(user)
      ;(prisma.userAchievement.findMany as jest.Mock).mockResolvedValue([])
      ;(prisma.user.update as jest.Mock).mockResolvedValue(user)

      await me(mockReq as any, mockRes as any, jest.fn())

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
      ;(prisma.userAchievement.findMany as jest.Mock).mockResolvedValue([])

      await me(mockReq as any, mockRes as any, jest.fn())

      expect(statusMock).toHaveBeenCalledWith(404)
      expect(jsonMock).toHaveBeenCalledWith(
        expect.objectContaining({ status: 'error', message: 'User not found' })
      )
    })

    it('should return 500 on database error', async () => {
      ;(mockReq as any).user = { userId: 'user-123' }
      ;(prisma.user.findUnique as jest.Mock).mockRejectedValue(new Error('Database error'))

      await me(mockReq as any, mockRes as any, jest.fn())

      expect(statusMock).toHaveBeenCalledWith(500)
      expect(jsonMock).toHaveBeenCalledWith(
        expect.objectContaining({ status: 'error', message: 'Internal server error' })
      )
    })
  })

  describe('MFA Endpoints', () => {
    it('setupMfa should return secret and qrCodeUrl when user does not have mfa enabled', async () => {
      ;(mockReq as any).user = { userId: 'user-123' }
      ;(prisma.user.findUnique as jest.Mock).mockResolvedValue({
        id: 'user-123',
        email: 'test@example.com',
        mfaEnabled: false,
      })
      ;(MfaService.generateSecret as jest.Mock).mockResolvedValue({
        secret: 'MOCKSECRET',
        qrCodeUrl: 'data:image/png;base64,mock',
      })

      await setupMfa(mockReq as any, mockRes as any, jest.fn())

      expect(statusMock).toHaveBeenCalledWith(200)
      expect(jsonMock).toHaveBeenCalledWith(
        expect.objectContaining({
          status: 'success',
          data: { secret: 'MOCKSECRET', qrCodeUrl: 'data:image/png;base64,mock' },
        })
      )
    })

    it('verifyAndEnableMfa should return 200 when token is verified', async () => {
      ;(mockReq as any).user = { userId: 'user-123' }
      mockReq.body = { token: '123456' }
      ;(MfaService.verifyAndEnable as jest.Mock).mockResolvedValue(true)

      await verifyAndEnableMfa(mockReq as any, mockRes as any, jest.fn())

      expect(statusMock).toHaveBeenCalledWith(200)
      expect(jsonMock).toHaveBeenCalledWith(expect.objectContaining({ status: 'success' }))
    })

    it('verifyMfaLogin should return access and refresh tokens when mfa token is valid', async () => {
      const mfaSessionToken = jwt.sign(
        { userId: 'user-123', purpose: 'mfa_login', iat: Date.now() },
        config.jwtRefreshSecret,
        { expiresIn: '5m' }
      )
      mockReq.body = { mfaSessionToken, token: '123456' }
      ;(MfaService.validateToken as jest.Mock).mockResolvedValue(true)
      ;(prisma.user.findUnique as jest.Mock).mockResolvedValue({
        id: 'user-123',
        email: 'test@example.com',
        username: 'testuser',
        role: 'STUDENT',
      })

      await verifyMfaLogin(mockReq as any, mockRes as any, jest.fn())

      expect(mockRes.cookie).toHaveBeenCalledWith('access_token', 'mock-token', expect.any(Object))
      expect(mockRes.cookie).toHaveBeenCalledWith(
        'refresh_token',
        'mock-refresh-token',
        expect.any(Object)
      )
      expect(statusMock).toHaveBeenCalledWith(200)
      expect(jsonMock).toHaveBeenCalledWith(
        expect.objectContaining({
          status: 'success',
          data: {
            user: expect.objectContaining({
              id: 'user-123',
              email: 'test@example.com',
              username: 'testuser',
              role: 'STUDENT',
            }),
          },
        })
      )
    })
  })
})
