import { Request, Response } from 'express'
import bcrypt from 'bcryptjs'
import { prisma } from '../../src/prismaClient'
import { adminLogin, adminRegister, verifyMfa } from '../../src/controllers/adminAuthController'
import { MfaService } from '../../src/services/MfaService'

jest.mock('../../src/services/MfaService')

describe('AdminAuthController', () => {
  let mockReq: Partial<Request>
  let mockRes: Partial<Response>
  let nextFn: jest.Mock

  beforeEach(() => {
    jest.clearAllMocks()
    process.env.ADMIN_SECRET = 'test-admin-secret-key-32charslong!!'

    mockReq = {
      body: {},
    }
    mockRes = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn().mockReturnThis(),
      cookie: jest.fn().mockReturnThis(),
    }
    nextFn = jest.fn()
  })

  describe('adminLogin', () => {
    it('should return 400 when email or password is missing', async () => {
      mockReq.body = { email: 'admin@example.com' }
      await adminLogin(mockReq as Request, mockRes as Response, nextFn)
      expect(mockRes.status).toHaveBeenCalledWith(400)
    })

    it('should return 401 when admin user does not exist or has non-admin role', async () => {
      ;(prisma.user.findUnique as jest.Mock).mockResolvedValue({
        id: 'user-1',
        email: 'student@example.com',
        role: 'STUDENT',
      })

      mockReq.body = { email: 'student@example.com', password: 'password123' }
      await adminLogin(mockReq as Request, mockRes as Response, nextFn)
      expect(mockRes.status).toHaveBeenCalledWith(401)
    })

    it('should return 401 and lock account after failed login threshold', async () => {
      const hashedPassword = await bcrypt.hash('correctPassword', 10)
      ;(prisma.user.findUnique as jest.Mock).mockResolvedValue({
        id: 'admin-1',
        email: 'admin@example.com',
        password: hashedPassword,
        role: 'ADMIN',
        failedLogins: 4,
        lockedUntil: null,
      })
      ;(prisma.user.update as jest.Mock).mockResolvedValue({})

      mockReq.body = { email: 'admin@example.com', password: 'wrongPassword' }
      await adminLogin(mockReq as Request, mockRes as Response, nextFn)
      expect(mockRes.status).toHaveBeenCalledWith(401)
      expect(prisma.user.update).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { id: 'admin-1' },
          data: expect.objectContaining({
            failedLogins: 5,
            lockedUntil: expect.any(Date),
          }),
        })
      )
    })

    it('should login successfully for valid admin credentials', async () => {
      const hashedPassword = await bcrypt.hash('adminPass123', 10)
      ;(prisma.user.findUnique as jest.Mock).mockResolvedValue({
        id: 'admin-1',
        email: 'admin@example.com',
        password: hashedPassword,
        role: 'ADMIN',
        username: 'AdminUser',
        failedLogins: 0,
        lockedUntil: null,
        mfaEnabled: false,
      })
      ;(prisma.user.update as jest.Mock).mockResolvedValue({})
      ;(prisma.refreshToken.create as jest.Mock).mockResolvedValue({})

      mockReq.body = { email: 'admin@example.com', password: 'adminPass123' }
      await adminLogin(mockReq as Request, mockRes as Response, nextFn)

      expect(mockRes.status).toHaveBeenCalledWith(200)
      expect(mockRes.json).toHaveBeenCalledWith(
        expect.objectContaining({
          status: 'success',
          data: expect.objectContaining({
            user: expect.objectContaining({
              id: 'admin-1',
              email: 'admin@example.com',
              role: 'ADMIN',
            }),
          }),
        })
      )
    })

    it('should require MFA when user has mfaEnabled', async () => {
      const hashedPassword = await bcrypt.hash('adminPass123', 10)
      ;(prisma.user.findUnique as jest.Mock).mockResolvedValue({
        id: 'admin-1',
        email: 'admin@example.com',
        password: hashedPassword,
        role: 'ADMIN',
        username: 'AdminUser',
        failedLogins: 0,
        lockedUntil: null,
        mfaEnabled: true,
      })
      ;(prisma.user.update as jest.Mock).mockResolvedValue({})

      mockReq.body = { email: 'admin@example.com', password: 'adminPass123' }
      await adminLogin(mockReq as Request, mockRes as Response, nextFn)

      expect(mockRes.status).toHaveBeenCalledWith(200)
      expect(mockRes.json).toHaveBeenCalledWith(
        expect.objectContaining({
          status: 'success',
          data: expect.objectContaining({
            mfaRequired: true,
            userId: 'admin-1',
          }),
        })
      )
    })
  })

  describe('verifyMfa', () => {
    it('should verify valid MFA token for admin', async () => {
      ;(prisma.user.findUnique as jest.Mock).mockResolvedValue({
        id: 'admin-1',
        email: 'admin@example.com',
        username: 'AdminUser',
        role: 'ADMIN',
        mfaEnabled: true,
      })
      ;(MfaService.validateToken as jest.Mock).mockResolvedValue(true)
      ;(prisma.refreshToken.create as jest.Mock).mockResolvedValue({})

      mockReq.body = { userId: 'admin-1', token: '123456' }
      await verifyMfa(mockReq as Request, mockRes as Response, nextFn)

      expect(mockRes.status).toHaveBeenCalledWith(200)
      expect(mockRes.json).toHaveBeenCalledWith(
        expect.objectContaining({
          status: 'success',
          data: expect.objectContaining({
            user: expect.objectContaining({
              id: 'admin-1',
            }),
          }),
        })
      )
    })
  })

  describe('adminRegister', () => {
    it('should reject registration when secret is invalid', async () => {
      mockReq.body = {
        email: 'newadmin@example.com',
        password: 'Password123!',
        username: 'NewAdmin',
        adminSecret: 'wrong-secret',
      }
      await adminRegister(mockReq as Request, mockRes as Response, nextFn)
      expect(mockRes.status).toHaveBeenCalledWith(403)
    })

    it('should register new admin when secret is valid and email is unique', async () => {
      ;(prisma.user.findUnique as jest.Mock).mockResolvedValue(null)
      ;(prisma.user.create as jest.Mock).mockResolvedValue({
        id: 'new-admin-1',
        email: 'newadmin@example.com',
        username: 'NewAdmin',
        role: 'ADMIN',
        createdAt: new Date(),
      })
      ;(prisma.refreshToken.create as jest.Mock).mockResolvedValue({})

      mockReq.body = {
        email: 'newadmin@example.com',
        password: 'Password123!',
        username: 'NewAdmin',
        adminSecret: 'test-admin-secret-key-32charslong!!',
      }

      await adminRegister(mockReq as Request, mockRes as Response, nextFn)
      expect(mockRes.status).toHaveBeenCalledWith(201)
      expect(mockRes.json).toHaveBeenCalledWith(
        expect.objectContaining({
          status: 'success',
          data: expect.objectContaining({
            user: expect.objectContaining({
              id: 'new-admin-1',
              role: 'ADMIN',
            }),
          }),
        })
      )
    })
  })
})
