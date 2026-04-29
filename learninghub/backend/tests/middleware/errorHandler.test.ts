import { Request, Response, NextFunction } from 'express';
import { mockDeep, DeepMockProxy } from 'jest-mock-extended';
import { errorHandler, notFoundHandler, AppError } from '../../src/middleware/errorHandler';

jest.mock('../../src/utils/logger', () => ({
  error: jest.fn(),
  info: jest.fn(),
  debug: jest.fn(),
}));

describe('ErrorHandler Middleware', () => {
  let mockReq: DeepMockProxy<Request>;
  let mockRes: DeepMockProxy<Response>;
  let mockNext: jest.Mock;
  let jsonMock: jest.Mock;
  let statusMock: jest.Mock;

  beforeEach(() => {
    jsonMock = jest.fn().mockReturnThis();
    statusMock = jest.fn().mockReturnValue({ json: jsonMock });
    mockReq = mockDeep<Request>();
    mockRes = mockDeep<Response>();
    mockRes.status = statusMock;
    mockRes.json = jsonMock;
    mockNext = jest.fn();
    
    // Reset environment
    delete process.env.NODE_ENV;
    jest.clearAllMocks();
  });

  describe('errorHandler', () => {
    it('should handle operational errors with custom status code', () => {
      const error: AppError = new Error('Validation failed') as AppError;
      error.statusCode = 400;
      error.isOperational = true;

      mockReq.originalUrl = '/api/test';
      mockReq.method = 'POST';
      mockReq.ip = '127.0.0.1';

      errorHandler(error, mockReq as any, mockRes, mockNext);

      expect(statusMock).toHaveBeenCalledWith(400);
      expect(jsonMock).toHaveBeenCalledWith({
        error: {
          message: 'Validation failed',
        },
      });
    });

    it('should handle 404 not found errors', () => {
      const error: AppError = new Error('Resource not found') as AppError;
      error.statusCode = 404;
      error.isOperational = true;

      mockReq.originalUrl = '/api/users/123';
      mockReq.method = 'GET';

      errorHandler(error, mockReq as any, mockRes, mockNext);

      expect(statusMock).toHaveBeenCalledWith(404);
      expect(jsonMock).toHaveBeenCalledWith({
        error: {
          message: 'Resource not found',
        },
      });
    });

    it('should handle 500 server errors with generic message', () => {
      const error: AppError = new Error('Database connection failed') as AppError;
      error.statusCode = 500;
      error.isOperational = false;

      mockReq.originalUrl = '/api/users';
      mockReq.method = 'POST';

      errorHandler(error, mockReq as any, mockRes, mockNext);

      expect(statusMock).toHaveBeenCalledWith(500);
      expect(jsonMock).toHaveBeenCalledWith({
        error: {
          message: 'Internal Server Error',
        },
      });
    });

    it('should include stack trace in development mode', () => {
      process.env.NODE_ENV = 'development';
      const error: AppError = new Error('Test error') as AppError;
      error.statusCode = 500;
      error.stack = 'Error: Test error\n    at Test.file:1:1';

      mockReq.originalUrl = '/api/test';
      mockReq.method = 'GET';

      errorHandler(error, mockReq as any, mockRes, mockNext);

      expect(jsonMock).toHaveBeenCalledWith({
        error: {
          message: 'Internal Server Error',
          stack: error.stack,
        },
      });
    });

    it('should default to 500 status code when not specified', () => {
      const error: AppError = new Error('Unknown error') as AppError;

      mockReq.originalUrl = '/api/test';
      mockReq.method = 'GET';

      errorHandler(error, mockReq as any, mockRes, mockNext);

      expect(statusMock).toHaveBeenCalledWith(500);
    });
  });

  describe('notFoundHandler', () => {
    it('should create 404 error for unknown routes', () => {
      mockReq.originalUrl = '/api/unknown-route';

      notFoundHandler(mockReq as any, mockRes, mockNext);

      expect(mockNext).toHaveBeenCalledWith(expect.any(Error));
      const passedError = mockNext.mock.calls[0][0] as AppError;
      expect(passedError.statusCode).toBe(404);
      expect(passedError.isOperational).toBe(true);
      expect(passedError.message).toBe('Route not found: /api/unknown-route');
    });

    it('should handle nested routes correctly', () => {
      mockReq.originalUrl = '/api/v1/users/999/details';

      notFoundHandler(mockReq as any, mockRes, mockNext);

      const passedError = mockNext.mock.calls[0][0] as AppError;
      expect(passedError.message).toBe('Route not found: /api/v1/users/999/details');
    });
  });
});
