import { PrismaClient } from '@prisma/client'
import { AuthService } from '../../src/services/AuthService'
import { AuditService } from '../../src/services/AuditService'
import bcrypt from 'bcryptjs'
import jwt from 'jsonwebtoken'

// Mock dependencies
jest.mock('bcryptjs')
jest.mock('jsonwebtoken')
jest.mock('../../src/services/CacheService', () => ({
  cacheService: {
    get: jest.fn(),
    set: jest.fn(),
    delete: jest.fn(),
    deletePattern: jest.fn(),
    userKey: (userId: string) => `user:${userId}`,
    userProgressKey: (userId: string, courseId: string) => `progress:${userId}:${courseId}`,
    courseKey: (courseId: string) => `course:${courseId}`,
  },
}))

const mockPrisma = {
  user: {
    findUnique: jest.fn(),
    findFirst: jest.fn(),
    create: jest.fn(),
    update: jest.fn(),
  },
  refreshToken: {
    findUnique: jest.fn(),
    create: jest.fn(),
    update: jest.fn(),
    updateMany: jest.fn(),
    deleteMany: jest.fn(),
    findMany: jest.fn(),
  },
  userSession: {
    create: jest.fn(),
    findMany: jest.fn(),
    update: jest.fn(),
    updateMany: jest.fn(),
  },
  auditLog: {
    create: jest.fn(),
  },
} as unknown as PrismaClient

describe('AuthService', () => {
  let authService: AuthService
  let auditService: AuditService

  beforeEach(() => {
    jest.clearAllMocks()
    auditService = new AuditService(mockPrisma)
    authService = new AuthService(mockPrisma, auditService)
  })

  describe('register', () => {
    const validInput = {
      email: 'test@example.com',
      password: 'SecurePass123!',
      username: 'testuser',
    }

    it('should register a new user successfully', async () => {
      const mockUser = {
        id: 'user-1',
        email: validInput.email,
        username: validInput.username,
        password: 'hashed_password',
        role: 'STUDENT',
        createdAt: new Date(),
        updatedAt: new Date(),
      }

      ;(mockPrisma.user.findUnique as jest.Mock).mockResolvedValue(null)
      ;(mockPrisma.user.findFirst as jest.Mock).mockResolvedValue(null)
      ;(bcrypt.hash as jest.Mock).mockResolvedValue('hashed_password')
      ;(mockPrisma.user.create as jest.Mock).mockResolvedValue(mockUser)
      ;(mockPrisma.auditLog.create as jest.Mock).mockResolvedValue({})
      ;(mockPrisma.refreshToken.create as jest.Mock).mockResolvedValue({})
      ;(mockPrisma.refreshToken.findMany as jest.Mock).mockResolvedValue([])
      ;(mockPrisma.userSession.create as jest.Mock).mockResolvedValue({})
      ;(mockPrisma.userSession.findMany as jest.Mock).mockResolvedValue([])
      ;(jwt.sign as jest.Mock).mockReturnValue('mock_access_token')

      const result = await authService.register(validInput, '127.0.0.1')

      expect(result.user.email).toBe(validInput.email)
      expect(result.tokens.accessToken).toBe('mock_access_token')
      expect(mockPrisma.user.create).toHaveBeenCalled()
      expect(mockPrisma.auditLog.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            action: 'CREATE',
            description: 'User registered',
          }),
        })
      )
    })

    it('should reject invalid email format', async () => {
      const invalidInput = { ...validInput, email: 'invalid-email' }

      await expect(authService.register(invalidInput)).rejects.toThrow('Invalid email format')
    })

    it('should reject weak password', async () => {
      const weakPasswordInput = { ...validInput, password: '123' }

      await expect(authService.register(weakPasswordInput)).rejects.toThrow(
        'Password validation failed'
      )
    })

    it('should reject duplicate email', async () => {
      ;(mockPrisma.user.findUnique as jest.Mock).mockResolvedValue({ id: 'existing-user' })

      await expect(authService.register(validInput)).rejects.toThrow('Email already registered')
    })

    it('should reject duplicate username', async () => {
      ;(mockPrisma.user.findUnique as jest.Mock).mockResolvedValue(null) // email check
      ;(mockPrisma.user.findFirst as jest.Mock).mockResolvedValue({ id: 'existing-user' }) // username check

      await expect(authService.register(validInput)).rejects.toThrow('Username already taken')
    })
  })

  describe('login', () => {
    const loginInput = {
      email: 'test@example.com',
      password: 'SecurePass123!',
      ipAddress: '127.0.0.1',
      userAgent: 'Mozilla/5.0',
    }

    const mockUser = {
      id: 'user-1',
      email: loginInput.email,
      password: 'hashed_password',
      role: 'STUDENT',
      lockedUntil: null,
      failedLoginAttempts: 0,
      createdAt: new Date(),
      updatedAt: new Date(),
    }

    it('should login successfully with valid credentials', async () => {
      ;(mockPrisma.user.findUnique as jest.Mock).mockResolvedValue(mockUser)
      ;(bcrypt.compare as jest.Mock).mockResolvedValue(true)
      ;(mockPrisma.user.update as jest.Mock).mockResolvedValue(mockUser) // for incrementLoginCount
      ;(mockPrisma.userSession.create as jest.Mock).mockResolvedValue({})
      ;(mockPrisma.userSession.findMany as jest.Mock).mockResolvedValue([])
      ;(mockPrisma.auditLog.create as jest.Mock).mockResolvedValue({})
      ;(mockPrisma.refreshToken.create as jest.Mock).mockResolvedValue({})
      ;(mockPrisma.refreshToken.findMany as jest.Mock).mockResolvedValue([])
      ;(jwt.sign as jest.Mock).mockReturnValue('mock_access_token')

      const result = await authService.login(loginInput)

      expect(result.user).toBeDefined()
      expect(result.user.email).toBe(loginInput.email)
      expect(result.tokens.accessToken).toBe('mock_access_token')
      expect(mockPrisma.auditLog.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            action: 'LOGIN',
            description: 'User logged in successfully',
          }),
        })
      )
    })

    it('should reject login with invalid email', async () => {
      ;(mockPrisma.user.findUnique as jest.Mock).mockResolvedValue(null)

      await expect(authService.login(loginInput)).rejects.toThrow('Invalid credentials')
    })

    it('should reject login with invalid password', async () => {
      ;(mockPrisma.user.findUnique as jest.Mock).mockResolvedValue(mockUser)
      ;(bcrypt.compare as jest.Mock).mockResolvedValue(false)
      ;(mockPrisma.user.update as jest.Mock).mockResolvedValue(mockUser)
      ;(mockPrisma.auditLog.create as jest.Mock).mockResolvedValue({})

      await expect(authService.login(loginInput)).rejects.toThrow('Invalid credentials')
      expect(mockPrisma.auditLog.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            action: 'LOGIN',
            description: 'Failed login attempt',
            severity: 'WARNING',
          }),
        })
      )
    })

    it('should reject login for locked account', async () => {
      const lockedUser = {
        ...mockUser,
        lockedUntil: new Date(Date.now() + 3600000), // 1 hour from now
      }
      ;(mockPrisma.user.findUnique as jest.Mock).mockResolvedValue(lockedUser)

      await expect(authService.login(loginInput)).rejects.toThrow('Account locked')
    })

    it('should allow login after lock period expires', async () => {
      const unlockedUser = {
        ...mockUser,
        lockedUntil: new Date(Date.now() - 3600000), // 1 hour ago
      }
      ;(mockPrisma.user.findUnique as jest.Mock).mockResolvedValue(unlockedUser)
      ;(bcrypt.compare as jest.Mock).mockResolvedValue(true)
      ;(mockPrisma.user.update as jest.Mock).mockResolvedValue(unlockedUser)
      ;(mockPrisma.userSession.create as jest.Mock).mockResolvedValue({})
      ;(mockPrisma.userSession.findMany as jest.Mock).mockResolvedValue([])
      ;(mockPrisma.auditLog.create as jest.Mock).mockResolvedValue({})
      ;(mockPrisma.refreshToken.create as jest.Mock).mockResolvedValue({})
      ;(mockPrisma.refreshToken.findMany as jest.Mock).mockResolvedValue([])
      ;(jwt.sign as jest.Mock).mockReturnValue('mock_access_token')

      const result = await authService.login(loginInput)

      expect(result.user.email).toBe(loginInput.email)
    })
  })

  describe('refreshToken', () => {
    const mockRefreshToken = 'valid_refresh_token'
    const mockUser = {
      id: 'user-1',
      email: 'test@example.com',
      password: 'hashed_password',
      role: 'STUDENT',
      createdAt: new Date(),
      updatedAt: new Date(),
    }

    it('should refresh token successfully', async () => {
      const mockStoredToken = {
        id: 'token-1',
        token: mockRefreshToken,
        userId: mockUser.id,
        expiresAt: new Date(Date.now() + 86400000), // 1 day from now
        revokedAt: null,
        usedAt: null,
      }

      ;(jwt.verify as jest.Mock).mockReturnValue({
        userId: mockUser.id,
        email: mockUser.email,
        role: mockUser.role,
      })
      ;(mockPrisma.refreshToken.findUnique as jest.Mock).mockResolvedValue(mockStoredToken)
      ;(mockPrisma.user.findUnique as jest.Mock).mockResolvedValue(mockUser)
      ;(mockPrisma.refreshToken.update as jest.Mock).mockResolvedValue(mockStoredToken)
      ;(mockPrisma.refreshToken.create as jest.Mock).mockResolvedValue({})
      ;(mockPrisma.refreshToken.findMany as jest.Mock).mockResolvedValue([])
      ;(jwt.sign as jest.Mock).mockReturnValue('new_access_token')

      const result = await authService.refreshToken(mockRefreshToken)

      expect(result.accessToken).toBe('new_access_token')
      expect(mockPrisma.refreshToken.update).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({ usedAt: expect.any(Date) }),
        })
      )
    })

    it('should reject expired refresh token', async () => {
      const mockStoredToken = {
        id: 'token-1',
        token: mockRefreshToken,
        userId: mockUser.id,
        expiresAt: new Date(Date.now() - 86400000), // 1 day ago
        revokedAt: null,
        usedAt: null,
      }

      ;(jwt.verify as jest.Mock).mockReturnValue({
        userId: mockUser.id,
        email: mockUser.email,
        role: mockUser.role,
      })
      ;(mockPrisma.refreshToken.findUnique as jest.Mock).mockResolvedValue(mockStoredToken)

      await expect(authService.refreshToken(mockRefreshToken)).rejects.toThrow(
        'Invalid refresh token'
      )
    })

    it('should reject revoked refresh token', async () => {
      const mockStoredToken = {
        id: 'token-1',
        token: mockRefreshToken,
        userId: mockUser.id,
        expiresAt: new Date(Date.now() + 86400000),
        revokedAt: new Date(), // revoked
        usedAt: null,
      }

      ;(jwt.verify as jest.Mock).mockReturnValue({
        userId: mockUser.id,
        email: mockUser.email,
        role: mockUser.role,
      })
      ;(mockPrisma.refreshToken.findUnique as jest.Mock).mockResolvedValue(mockStoredToken)

      await expect(authService.refreshToken(mockRefreshToken)).rejects.toThrow(
        'Invalid refresh token'
      )
    })

    it('should reject token not in database', async () => {
      ;(jwt.verify as jest.Mock).mockReturnValue({
        userId: mockUser.id,
        email: mockUser.email,
        role: mockUser.role,
      })
      ;(mockPrisma.refreshToken.findUnique as jest.Mock).mockResolvedValue(null)

      await expect(authService.refreshToken(mockRefreshToken)).rejects.toThrow(
        'Invalid refresh token'
      )
    })
  })

  describe('logout', () => {
    const userId = 'user-1'
    const refreshToken = 'valid_refresh_token'

    it('should logout successfully', async () => {
      ;(mockPrisma.refreshToken.updateMany as jest.Mock).mockResolvedValue({ count: 1 })
      ;(mockPrisma.auditLog.create as jest.Mock).mockResolvedValue({})

      await authService.logout(userId, refreshToken, '127.0.0.1')

      const crypto = require('crypto')
      const tokenHash = crypto.createHash('sha256').update(refreshToken).digest('hex')

      expect(mockPrisma.refreshToken.updateMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { token: tokenHash, userId },
          data: { revokedAt: expect.any(Date) },
        })
      )
      expect(mockPrisma.auditLog.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            action: 'LOGOUT',
            description: 'User logged out',
          }),
        })
      )
    })

    it('should logout without refresh token', async () => {
      ;(mockPrisma.auditLog.create as jest.Mock).mockResolvedValue({})

      await authService.logout(userId, undefined, '127.0.0.1')

      expect(mockPrisma.refreshToken.updateMany).not.toHaveBeenCalled()
      expect(mockPrisma.auditLog.create).toHaveBeenCalled()
    })
  })

  describe('logoutAllDevices', () => {
    const userId = 'user-1'

    it('should logout from all devices successfully', async () => {
      ;(mockPrisma.refreshToken.updateMany as jest.Mock).mockResolvedValue({ count: 3 })
      ;(mockPrisma.userSession.updateMany as jest.Mock).mockResolvedValue({ count: 2 })
      ;(mockPrisma.auditLog.create as jest.Mock).mockResolvedValue({})

      await authService.logoutAllDevices(userId, '127.0.0.1')

      expect(mockPrisma.refreshToken.updateMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { userId, revokedAt: null },
          data: { revokedAt: expect.any(Date) },
        })
      )
      expect(mockPrisma.userSession.updateMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { userId, isRevoked: false },
          data: { isRevoked: true, revokedAt: expect.any(Date) },
        })
      )
      expect(mockPrisma.auditLog.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            action: 'LOGOUT',
            description: 'User logged out from all devices',
            severity: 'INFO',
          }),
        })
      )
    })
  })

  describe('changePassword', () => {
    const userId = 'user-1'
    const currentPassword = 'OldPass123!'
    const newPassword = 'NewPass456!'

    const mockUser = {
      id: userId,
      email: 'test@example.com',
      password: 'hashed_old_password',
      role: 'STUDENT',
      createdAt: new Date(),
      updatedAt: new Date(),
    }

    it('should change password successfully', async () => {
      ;(mockPrisma.user.findUnique as jest.Mock).mockResolvedValue(mockUser)
      ;(bcrypt.compare as jest.Mock).mockResolvedValue(true)
      ;(bcrypt.hash as jest.Mock).mockResolvedValue('hashed_new_password')
      ;(mockPrisma.user.update as jest.Mock).mockResolvedValue(mockUser)
      ;(mockPrisma.refreshToken.updateMany as jest.Mock).mockResolvedValue({ count: 2 })
      ;(mockPrisma.userSession.updateMany as jest.Mock).mockResolvedValue({ count: 1 })
      ;(mockPrisma.auditLog.create as jest.Mock).mockResolvedValue({})

      await authService.changePassword(userId, currentPassword, newPassword, '127.0.0.1')

      expect(mockPrisma.user.update).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { id: userId },
          data: expect.objectContaining({
            password: 'hashed_new_password',
          }),
        })
      )
      expect(mockPrisma.auditLog.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            action: 'PASSWORD_CHANGE',
            description: 'Password changed',
          }),
        })
      )
    })

    it('should reject incorrect current password', async () => {
      ;(mockPrisma.user.findUnique as jest.Mock).mockResolvedValue(mockUser)
      ;(bcrypt.compare as jest.Mock).mockResolvedValue(false)

      await expect(
        authService.changePassword(userId, currentPassword, newPassword)
      ).rejects.toThrow('Current password is incorrect')
    })

    it('should reject weak new password', async () => {
      ;(mockPrisma.user.findUnique as jest.Mock).mockResolvedValue(mockUser)
      ;(bcrypt.compare as jest.Mock).mockResolvedValue(true)

      await expect(authService.changePassword(userId, currentPassword, '123')).rejects.toThrow(
        'Password validation failed'
      )
    })

    it('should reject for non-existent user', async () => {
      ;(mockPrisma.user.findUnique as jest.Mock).mockResolvedValue(null)

      await expect(
        authService.changePassword(userId, currentPassword, newPassword)
      ).rejects.toThrow('User not found')
    })
  })

  describe('verifyAccessToken', () => {
    it('should verify valid token', () => {
      const mockPayload = {
        userId: 'user-1',
        email: 'test@example.com',
        role: 'STUDENT',
      }
      ;(jwt.verify as jest.Mock).mockReturnValue(mockPayload)

      const result = authService.verifyAccessToken('valid_token')

      expect(result).toEqual(mockPayload)
    })

    it('should reject expired token', () => {
      ;(jwt.verify as jest.Mock).mockImplementation(() => {
        throw new jwt.TokenExpiredError('Token expired', new Date())
      })

      expect(() => authService.verifyAccessToken('expired_token')).toThrow('Token expired')
    })

    it('should reject invalid token', () => {
      ;(jwt.verify as jest.Mock).mockImplementation(() => {
        throw new Error('Invalid token')
      })

      expect(() => authService.verifyAccessToken('invalid_token')).toThrow('Invalid token')
    })
  })

  describe('getUserById', () => {
    const userId = 'user-1'
    const mockUser = {
      id: userId,
      email: 'test@example.com',
      username: 'testuser',
      password: 'hashed_password',
      mfaSecret: 'secret',
      role: 'STUDENT',
      createdAt: new Date(),
      updatedAt: new Date(),
    }

    it('should return user from database', async () => {
      ;(mockPrisma.user.findUnique as jest.Mock).mockResolvedValue(mockUser)

      const result = await authService.getUserById(userId)

      expect(result).toBeDefined()
      expect(result?.email).toBe(mockUser.email)
      expect(result).not.toHaveProperty('password')
      expect(result).not.toHaveProperty('mfaSecret')
    })

    it('should return null for non-existent user', async () => {
      ;(mockPrisma.user.findUnique as jest.Mock).mockResolvedValue(null)

      const result = await authService.getUserById('non-existent')

      expect(result).toBeNull()
    })
  })
})
