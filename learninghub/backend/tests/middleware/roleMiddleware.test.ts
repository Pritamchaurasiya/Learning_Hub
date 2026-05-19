import { Request, Response, NextFunction } from 'express'
import { mockDeep, DeepMockProxy } from 'jest-mock-extended'
import {
  requireRole,
  requireAdmin,
  requireInstructorOrAdmin,
} from '../../src/middleware/roleMiddleware'

describe('RoleMiddleware', () => {
  let mockReq: DeepMockProxy<Request>
  let mockRes: DeepMockProxy<Response>
  let mockNext: jest.Mock
  let jsonMock: jest.Mock
  let statusMock: jest.Mock

  beforeEach(() => {
    jsonMock = jest.fn().mockReturnThis()
    statusMock = jest.fn().mockReturnValue({ json: jsonMock })
    mockReq = mockDeep<Request>()
    mockRes = mockDeep<Response>()
    mockRes.status = statusMock as any
    mockRes.json = jsonMock as any
    mockNext = jest.fn()
  })

  describe('requireRole', () => {
    it('should call next() when user has required role', () => {
      mockReq.user = { userId: 'user-123', email: 'test@example.com', role: 'admin' }

      const middleware = requireRole(['admin', 'instructor'])
      middleware(mockReq as any, mockRes, mockNext)

      expect(mockNext).toHaveBeenCalled()
      expect(statusMock).not.toHaveBeenCalled()
    })

    it('should return 401 when user is not authenticated', () => {
      mockReq.user = undefined

      const middleware = requireRole(['admin'])
      middleware(mockReq as any, mockRes, mockNext)

      expect(statusMock).toHaveBeenCalledWith(401)
      expect(jsonMock).toHaveBeenCalledWith({
        status: 'error',
        message: 'Unauthorized',
      })
      expect(mockNext).not.toHaveBeenCalled()
    })

    it('should return 403 when user lacks required role', () => {
      mockReq.user = { userId: 'user-123', email: 'test@example.com', role: 'student' }

      const middleware = requireRole(['admin'])
      middleware(mockReq as any, mockRes, mockNext)

      expect(statusMock).toHaveBeenCalledWith(403)
      expect(jsonMock).toHaveBeenCalledWith({
        status: 'error',
        message: 'Forbidden: Insufficient permissions',
      })
      expect(mockNext).not.toHaveBeenCalled()
    })

    it('should accept multiple roles', () => {
      mockReq.user = { userId: 'user-123', email: 'test@example.com', role: 'instructor' }

      const middleware = requireRole(['admin', 'instructor'])
      middleware(mockReq as any, mockRes, mockNext)

      expect(mockNext).toHaveBeenCalled()
    })
  })

  describe('requireAdmin', () => {
    it('should call next() for admin user', () => {
      mockReq.user = { userId: 'user-123', email: 'test@example.com', role: 'admin' }

      requireAdmin(mockReq as any, mockRes, mockNext)

      expect(mockNext).toHaveBeenCalled()
    })

    it('should return 401 when user is not authenticated', () => {
      mockReq.user = undefined

      requireAdmin(mockReq as any, mockRes, mockNext)

      expect(statusMock).toHaveBeenCalledWith(401)
      expect(jsonMock).toHaveBeenCalledWith({
        status: 'error',
        message: 'Unauthorized',
      })
    })

    it('should return 403 for non-admin users', () => {
      mockReq.user = { userId: 'user-123', email: 'test@example.com', role: 'student' }

      requireAdmin(mockReq as any, mockRes, mockNext)

      expect(statusMock).toHaveBeenCalledWith(403)
      expect(jsonMock).toHaveBeenCalledWith({
        status: 'error',
        message: 'Admin access required',
      })
    })

    it('should return 403 for instructor users', () => {
      mockReq.user = { userId: 'user-123', email: 'test@example.com', role: 'instructor' }

      requireAdmin(mockReq as any, mockRes, mockNext)

      expect(statusMock).toHaveBeenCalledWith(403)
      expect(jsonMock).toHaveBeenCalledWith({
        status: 'error',
        message: 'Admin access required',
      })
    })
  })

  describe('requireInstructorOrAdmin', () => {
    it('should call next() for admin user', () => {
      mockReq.user = { userId: 'user-123', email: 'test@example.com', role: 'admin' }

      requireInstructorOrAdmin(mockReq as any, mockRes, mockNext)

      expect(mockNext).toHaveBeenCalled()
    })

    it('should call next() for instructor user', () => {
      mockReq.user = { userId: 'user-123', email: 'test@example.com', role: 'instructor' }

      requireInstructorOrAdmin(mockReq as any, mockRes, mockNext)

      expect(mockNext).toHaveBeenCalled()
    })

    it('should return 401 when user is not authenticated', () => {
      mockReq.user = undefined

      requireInstructorOrAdmin(mockReq as any, mockRes, mockNext)

      expect(statusMock).toHaveBeenCalledWith(401)
      expect(jsonMock).toHaveBeenCalledWith({
        status: 'error',
        message: 'Unauthorized',
      })
    })

    it('should return 403 for student users', () => {
      mockReq.user = { userId: 'user-123', email: 'test@example.com', role: 'student' }

      requireInstructorOrAdmin(mockReq as any, mockRes, mockNext)

      expect(statusMock).toHaveBeenCalledWith(403)
      expect(jsonMock).toHaveBeenCalledWith({
        status: 'error',
        message: 'Instructor or Admin access required',
      })
    })
  })
})
