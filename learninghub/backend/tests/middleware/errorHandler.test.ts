import { Request, Response, NextFunction } from 'express'
import { mockDeep, DeepMockProxy } from 'jest-mock-extended'
import { errorHandler, notFoundHandler, AppError } from '../../src/middleware/errorHandler'

jest.mock('../../src/utils/logger', () => ({
  error: jest.fn(),
  info: jest.fn(),
  debug: jest.fn(),
}))

describe('ErrorHandler Middleware', () => {
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

    // Reset environment
    delete process.env.NODE_ENV
    jest.clearAllMocks()
  })

  describe('errorHandler', () => {
    it('should handle operational errors with custom status code', () => {
      const error = new AppError('Validation failed', 400, true)

      mockReq.originalUrl = '/api/test'
      mockReq.method = 'POST'
      Object.defineProperty(mockReq, 'ip', { value: '127.0.0.1', writable: true })

      errorHandler(error, mockReq as any, mockRes, mockNext)

      expect(statusMock).toHaveBeenCalledWith(400)
      expect(jsonMock).toHaveBeenCalledWith({
        status: 'error',
        message: 'Validation failed',
      })
    })

    it('should handle 404 not found errors', () => {
      const error = new AppError('Resource not found', 404, true)

      mockReq.originalUrl = '/api/users/123'
      mockReq.method = 'GET'

      errorHandler(error, mockReq as any, mockRes, mockNext)

      expect(statusMock).toHaveBeenCalledWith(404)
      expect(jsonMock).toHaveBeenCalledWith({
        status: 'error',
        message: 'Resource not found',
      })
    })

    it('should handle 500 server errors with generic message', () => {
      const error = new AppError('Database connection failed', 500, false)

      mockReq.originalUrl = '/api/users'
      mockReq.method = 'POST'

      errorHandler(error, mockReq as any, mockRes, mockNext)

      expect(statusMock).toHaveBeenCalledWith(500)
      expect(jsonMock).toHaveBeenCalledWith({
        status: 'error',
        message: 'Internal Server Error',
      })
    })

    it('should include stack trace in development mode', () => {
      process.env.NODE_ENV = 'development'
      const error = new AppError('Test error', 500, false)

      mockReq.originalUrl = '/api/test'
      mockReq.method = 'GET'

      errorHandler(error, mockReq as any, mockRes, mockNext)

      const callArg = jsonMock.mock.calls[0]?.[0]
      expect(callArg.status).toBe('error')
      expect(callArg.message).toBe('Internal Server Error')
      expect(callArg.stack).toBeDefined()
    })

    it('should default to 500 status code when not specified', () => {
      const error = new Error('Unknown error')

      mockReq.originalUrl = '/api/test'
      mockReq.method = 'GET'

      errorHandler(error, mockReq as any, mockRes, mockNext)

      expect(statusMock).toHaveBeenCalledWith(500)
    })
  })

  describe('notFoundHandler', () => {
    it('should return 404 directly for unknown routes', () => {
      mockReq.originalUrl = '/api/unknown-route'
      mockReq.method = 'GET'

      notFoundHandler(mockReq as any, mockRes as any)

      // notFoundHandler now returns 404 directly instead of calling next()
      expect(statusMock).toHaveBeenCalledWith(404)
      expect(jsonMock).toHaveBeenCalledWith({
        status: 'error',
        message: 'Route not found: GET /api/unknown-route',
      })
      expect(mockNext).not.toHaveBeenCalled()
    })

    it('should handle nested routes correctly', () => {
      mockReq.originalUrl = '/api/v1/users/999/details'
      mockReq.method = 'GET'

      notFoundHandler(mockReq as any, mockRes as any)

      expect(statusMock).toHaveBeenCalledWith(404)
      expect(jsonMock).toHaveBeenCalledWith({
        status: 'error',
        message: 'Route not found: GET /api/v1/users/999/details',
      })
    })
  })
})
