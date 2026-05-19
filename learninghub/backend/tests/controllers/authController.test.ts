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
}))
jest.mock('../../src/utils/logger', () => ({
  error: jest.fn(),
  info: jest.fn(),
  debug: jest.fn(),
  audit: jest.fn(),
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
        password: 'password123',
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
      ;(bcrypt.hash as jest.Mock).mockResolvedValue('hashed-password')

      await register(mockReq, mockRes)

      expect(statusMock).toHaveBeenCalledWith(201)
      expect(jsonMock).toHaveBeenCalledWith({
        status: 'success',
        message: 'Registration successful',
        data: {
          access_token: 'mock-token',
          refresh_token: 'mock-refresh-token',
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
      expect(jsonMock).toHaveBeenCalledWith({
        status: 'error',
        message: 'Email and password are required',
      })
    })

    it('should return 409 when email already exists', async () => {
      const userData = {
        email: 'existing@example.com',
        password: 'password123',
      }
      const existingUser = createUser({ email: userData.email })

      mockReq.body = userData
      ;(prisma.user.findUnique as jest.Mock).mockResolvedValue(existingUser)

      await register(mockReq, mockRes)

      expect(statusMock).toHaveBeenCalledWith(409)
      expect(jsonMock).toHaveBeenCalledWith({
        status: 'error',
        message: 'Email already exists',
      })
    })

    it('should return 500 on database error', async () => {
      mockReq.body = {
        email: 'test@example.com',
        password: 'password123',
      }
      Object.defineProperty(mockReq, 'ip', { value: '127.0.0.1' })
      ;(prisma.user.findUnique as jest.Mock).mockRejectedValue(new Error('Database error'))

      await register(mockReq, mockRes)

      expect(statusMock).toHaveBeenCalledWith(500)
      expect(jsonMock).toHaveBeenCalledWith({
        status: 'error',
        message: 'Internal server error',
      })
    })
  })

  describe('login', () => {
    it('should login successfully with valid credentials', async () => {
      const userData = {
        email: 'test@example.com',
        password: 'password123',
      }
      const existingUser = createUser({
        id: 'user-123',
        email: userData.email,
        password: 'hashed-password',
      })

      mockReq.body = userData
      ;(prisma.user.findUnique as jest.Mock).mockResolvedValue(existingUser)
      ;(bcrypt.compare as jest.Mock).mockResolvedValue(true)

      await login(mockReq, mockRes)

      expect(statusMock).toHaveBeenCalledWith(200)
      expect(jsonMock).toHaveBeenCalledWith({
        status: 'success',
        message: 'Login successful',
        data: {
          access_token: 'mock-token',
          refresh_token: 'mock-refresh-token',
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
        password: 'password123',
      }
      ;(prisma.user.findUnique as jest.Mock).mockResolvedValue(null)

      await login(mockReq, mockRes)

      expect(statusMock).toHaveBeenCalledWith(401)
      expect(jsonMock).toHaveBeenCalledWith({
        status: 'error',
        message: 'Invalid email or password',
      })
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
      ;(bcrypt.compare as jest.Mock).mockResolvedValue(false)

      await login(mockReq, mockRes)

      expect(statusMock).toHaveBeenCalledWith(401)
      expect(jsonMock).toHaveBeenCalledWith({
        status: 'error',
        message: 'Invalid email or password',
      })
    })

    it('should return 500 on database error', async () => {
      mockReq.body = {
        email: 'test@example.com',
        password: 'password123',
      }
      Object.defineProperty(mockReq, 'ip', { value: '127.0.0.1' })
      ;(prisma.user.findUnique as jest.Mock).mockRejectedValue(new Error('Database error'))

      await login(mockReq, mockRes)

      expect(statusMock).toHaveBeenCalledWith(500)
      expect(jsonMock).toHaveBeenCalledWith({
        status: 'error',
        message: 'Internal server error',
      })
    })
  })

  describe('refresh', () => {
    const { verifyRefreshToken } = jest.requireMock('../../src/utils/auth')

    it('should refresh token successfully', async () => {
      const refreshToken = 'valid-refresh-token'
      const user = createUser({ id: 'user-123' })

      mockReq.body = { refresh_token: refreshToken }
      verifyRefreshToken.mockReturnValue({ userId: user.id })
      ;(prisma.user.findUnique as jest.Mock).mockResolvedValue(user)

      await refresh(mockReq, mockRes)

      expect(jsonMock).toHaveBeenCalledWith({
        status: 'success',
        data: {
          access_token: 'mock-token',
          refresh_token: 'mock-refresh-token',
        },
      })
    })

    it('should accept refresh key for backward compatibility', async () => {
      const refreshToken = 'valid-refresh-token'
      const user = createUser({ id: 'user-123' })

      mockReq.body = { refresh: refreshToken }
      verifyRefreshToken.mockReturnValue({ userId: user.id })
      ;(prisma.user.findUnique as jest.Mock).mockResolvedValue(user)

      await refresh(mockReq, mockRes)

      expect(jsonMock).toHaveBeenCalledWith({
        status: 'success',
        data: {
          access_token: 'mock-token',
          refresh_token: 'mock-refresh-token',
        },
      })
    })

    it('should return 400 when refresh token is missing', async () => {
      mockReq.body = {}

      await refresh(mockReq, mockRes)

      expect(statusMock).toHaveBeenCalledWith(400)
      expect(jsonMock).toHaveBeenCalledWith({
        status: 'error',
        message: 'Refresh token is required',
      })
    })

    it('should return 401 for invalid refresh token', async () => {
      mockReq.body = { refresh_token: 'invalid-token' }
      verifyRefreshToken.mockReturnValue(null)

      await refresh(mockReq, mockRes)

      expect(statusMock).toHaveBeenCalledWith(401)
      expect(jsonMock).toHaveBeenCalledWith({
        status: 'error',
        message: 'Invalid refresh token',
      })
    })

    it('should return 401 when user no longer exists', async () => {
      const refreshToken = 'valid-refresh-token'

      mockReq.body = { refresh_token: refreshToken }
      verifyRefreshToken.mockReturnValue({ userId: 'non-existent-id' })
      ;(prisma.user.findUnique as jest.Mock).mockResolvedValue(null)

      await refresh(mockReq, mockRes)

      expect(statusMock).toHaveBeenCalledWith(401)
      expect(jsonMock).toHaveBeenCalledWith({
        status: 'error',
        message: 'User no longer exists',
      })
    })

    it('should return 401 on token verification error', async () => {
      mockReq.body = { refresh_token: 'token' }
      verifyRefreshToken.mockImplementation(() => {
        throw new Error('Invalid token')
      })

      await refresh(mockReq, mockRes)

      expect(statusMock).toHaveBeenCalledWith(401)
      expect(jsonMock).toHaveBeenCalledWith({
        status: 'error',
        message: 'Invalid or expired refresh token',
      })
    })
  })

  describe('me', () => {
    it('should return user profile successfully', async () => {
      const user = createUser({
        id: 'user-123',
      })
      const mockProgress: unknown[] = []
      const mockBookmarks: unknown[] = []
      const mockAchievements: unknown[] = []

      ;(mockReq as any).user = { userId: user.id, email: user.email, role: user.role }
      ;(prisma.user.findUnique as jest.Mock).mockResolvedValue(user)
      ;(prisma.userProgress.findMany as jest.Mock).mockResolvedValue(mockProgress)
      ;(prisma.bookmark.findMany as jest.Mock).mockResolvedValue(mockBookmarks)
      ;(prisma.userAchievement.findMany as jest.Mock).mockResolvedValue(mockAchievements)
      ;(prisma.user.update as jest.Mock).mockResolvedValue(user)

      await me(mockReq as any, mockRes)

      expect(jsonMock).toHaveBeenCalledWith({
        status: 'success',
        data: {
          user: {
            id: user.id,
            email: user.email,
            username: user.username,
            role: user.role,
            xp: user.xp,
            level: user.level,
            streak: user.streak,
            lastActive: user.lastActive,
          },
          progress: mockProgress,
          bookmarks: mockBookmarks,
          achievements: mockAchievements,
        },
      })
    })

    it('should return 404 when user not found', async () => {
      ;(mockReq as any).user = { userId: 'non-existent-id' }
      ;(prisma.user.findUnique as jest.Mock).mockResolvedValue(null)

      await me(mockReq as any, mockRes)

      expect(statusMock).toHaveBeenCalledWith(404)
      expect(jsonMock).toHaveBeenCalledWith({
        status: 'error',
        message: 'User not found',
      })
    })

    it('should return 500 on database error', async () => {
      ;(mockReq as any).user = { userId: 'user-123' }
      ;(prisma.user.findUnique as jest.Mock).mockRejectedValue(new Error('Database error'))

      await me(mockReq as any, mockRes)

      expect(statusMock).toHaveBeenCalledWith(500)
      expect(jsonMock).toHaveBeenCalledWith({
        status: 'error',
        message: 'Internal server error',
      })
    })
  })
})
