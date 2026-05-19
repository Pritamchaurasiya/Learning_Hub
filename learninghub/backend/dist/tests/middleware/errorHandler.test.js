"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const jest_mock_extended_1 = require("jest-mock-extended");
const errorHandler_1 = require("../../src/middleware/errorHandler");
jest.mock('../../src/utils/logger', () => ({
    error: jest.fn(),
    info: jest.fn(),
    debug: jest.fn(),
}));
describe('ErrorHandler Middleware', () => {
    let mockReq;
    let mockRes;
    let mockNext;
    let jsonMock;
    let statusMock;
    beforeEach(() => {
        jsonMock = jest.fn().mockReturnThis();
        statusMock = jest.fn().mockReturnValue({ json: jsonMock });
        mockReq = (0, jest_mock_extended_1.mockDeep)();
        mockRes = (0, jest_mock_extended_1.mockDeep)();
        mockRes.status = statusMock;
        mockRes.json = jsonMock;
        mockNext = jest.fn();
        // Reset environment
        delete process.env.NODE_ENV;
        jest.clearAllMocks();
    });
    describe('errorHandler', () => {
        it('should handle operational errors with custom status code', () => {
            const error = new errorHandler_1.AppError('Validation failed', 400, true);
            mockReq.originalUrl = '/api/test';
            mockReq.method = 'POST';
            Object.defineProperty(mockReq, 'ip', { value: '127.0.0.1', writable: true });
            (0, errorHandler_1.errorHandler)(error, mockReq, mockRes, mockNext);
            expect(statusMock).toHaveBeenCalledWith(400);
            expect(jsonMock).toHaveBeenCalledWith({
                status: 'error',
                message: 'Validation failed',
            });
        });
        it('should handle 404 not found errors', () => {
            const error = new errorHandler_1.AppError('Resource not found', 404, true);
            mockReq.originalUrl = '/api/users/123';
            mockReq.method = 'GET';
            (0, errorHandler_1.errorHandler)(error, mockReq, mockRes, mockNext);
            expect(statusMock).toHaveBeenCalledWith(404);
            expect(jsonMock).toHaveBeenCalledWith({
                status: 'error',
                message: 'Resource not found',
            });
        });
        it('should handle 500 server errors with generic message', () => {
            const error = new errorHandler_1.AppError('Database connection failed', 500, false);
            mockReq.originalUrl = '/api/users';
            mockReq.method = 'POST';
            (0, errorHandler_1.errorHandler)(error, mockReq, mockRes, mockNext);
            expect(statusMock).toHaveBeenCalledWith(500);
            expect(jsonMock).toHaveBeenCalledWith({
                status: 'error',
                message: 'Internal Server Error',
            });
        });
        it('should include stack trace in development mode', () => {
            process.env.NODE_ENV = 'development';
            const error = new errorHandler_1.AppError('Test error', 500, false);
            mockReq.originalUrl = '/api/test';
            mockReq.method = 'GET';
            (0, errorHandler_1.errorHandler)(error, mockReq, mockRes, mockNext);
            const callArg = jsonMock.mock.calls[0]?.[0];
            expect(callArg.status).toBe('error');
            expect(callArg.message).toBe('Internal Server Error');
            expect(callArg.stack).toBeDefined();
        });
        it('should default to 500 status code when not specified', () => {
            const error = new Error('Unknown error');
            mockReq.originalUrl = '/api/test';
            mockReq.method = 'GET';
            (0, errorHandler_1.errorHandler)(error, mockReq, mockRes, mockNext);
            expect(statusMock).toHaveBeenCalledWith(500);
        });
    });
    describe('notFoundHandler', () => {
        it('should return 404 directly for unknown routes', () => {
            mockReq.originalUrl = '/api/unknown-route';
            mockReq.method = 'GET';
            (0, errorHandler_1.notFoundHandler)(mockReq, mockRes);
            // notFoundHandler now returns 404 directly instead of calling next()
            expect(statusMock).toHaveBeenCalledWith(404);
            expect(jsonMock).toHaveBeenCalledWith({
                status: 'error',
                message: 'Route not found: GET /api/unknown-route',
            });
            expect(mockNext).not.toHaveBeenCalled();
        });
        it('should handle nested routes correctly', () => {
            mockReq.originalUrl = '/api/v1/users/999/details';
            mockReq.method = 'GET';
            (0, errorHandler_1.notFoundHandler)(mockReq, mockRes);
            expect(statusMock).toHaveBeenCalledWith(404);
            expect(jsonMock).toHaveBeenCalledWith({
                status: 'error',
                message: 'Route not found: GET /api/v1/users/999/details',
            });
        });
    });
});
