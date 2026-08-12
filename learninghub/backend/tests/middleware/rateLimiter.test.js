"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const rateLimiter_1 = require("../../src/middleware/rateLimiter");
const CacheService_1 = require("../../src/services/CacheService");
// Mock cacheService
jest.mock('../../src/services/CacheService', () => ({
    cacheService: {
        incrementWithExpiry: jest.fn(),
    },
}));
describe('RateLimiter Middleware', () => {
    let mockReq;
    let mockRes;
    let mockNext;
    let statusMock;
    let jsonMock;
    let setHeaderMock;
    let originalEnv;
    beforeAll(() => {
        originalEnv = process.env.NODE_ENV;
        process.env.NODE_ENV = 'production'; // Bypass the test environment check
        process.env.RATE_LIMIT_ENABLED = 'true'; // Override global test setup
    });
    afterAll(() => {
        process.env.NODE_ENV = originalEnv;
        delete process.env.RATE_LIMIT_ENABLED;
    });
    beforeEach(() => {
        jest.clearAllMocks();
        jsonMock = jest.fn().mockReturnThis();
        statusMock = jest.fn().mockReturnValue({ json: jsonMock });
        setHeaderMock = jest.fn();
        mockReq = {
            ip: '192.168.1.1',
            originalUrl: '/api/v1/auth/login',
            headers: {},
            socket: {},
        };
        mockRes = {
            status: statusMock,
            json: jsonMock,
            set: setHeaderMock,
        };
        mockNext = jest.fn();
    });
    it('should pass if within limits (Redis path)', async () => {
        ;
        CacheService_1.cacheService.incrementWithExpiry.mockResolvedValue(3);
        const middleware = (0, rateLimiter_1.createRateLimiter)({
            windowMs: 60000,
            max: 5,
            keyPrefix: 'test_limit',
        });
        await middleware(mockReq, mockRes, mockNext);
        expect(CacheService_1.cacheService.incrementWithExpiry).toHaveBeenCalledWith(expect.any(String), 1, 60000);
        expect(setHeaderMock).toHaveBeenCalledWith('X-RateLimit-Limit', '5');
        expect(setHeaderMock).toHaveBeenCalledWith('X-RateLimit-Remaining', '2');
        expect(mockNext).toHaveBeenCalled();
        expect(statusMock).not.toHaveBeenCalled();
    });
    it('should set expire on first request in window', async () => {
        ;
        CacheService_1.cacheService.incrementWithExpiry.mockResolvedValue(1);
        const middleware = (0, rateLimiter_1.createRateLimiter)({
            windowMs: 60000,
            max: 5,
            keyPrefix: 'test_limit',
        });
        await middleware(mockReq, mockRes, mockNext);
        expect(CacheService_1.cacheService.incrementWithExpiry).toHaveBeenCalledWith(expect.any(String), 1, 60000);
        expect(mockNext).toHaveBeenCalled();
    });
    it('should block and return 429 when max limit is exceeded', async () => {
        ;
        CacheService_1.cacheService.incrementWithExpiry.mockResolvedValue(6);
        const middleware = (0, rateLimiter_1.createRateLimiter)({
            windowMs: 60000,
            max: 5,
            keyPrefix: 'test_limit',
            message: 'Too many test requests.',
        });
        await middleware(mockReq, mockRes, mockNext);
        expect(statusMock).toHaveBeenCalledWith(429);
        expect(jsonMock).toHaveBeenCalledWith({
            status: 'error',
            message: 'Too many test requests.',
            code: 'RATE_LIMIT_EXCEEDED',
            details: {
                retryAfter: expect.any(Number),
                limit: 5,
                remaining: 0,
            },
        });
        expect(mockNext).not.toHaveBeenCalled();
    });
    it('should fallback gracefully to in-memory store if Redis throws error', async () => {
        ;
        CacheService_1.cacheService.incrementWithExpiry.mockRejectedValue(new Error('Redis is offline'));
        const middleware = (0, rateLimiter_1.createRateLimiter)({
            windowMs: 60000,
            max: 2,
            keyPrefix: 'fallback_limit',
        });
        // First request
        await middleware(mockReq, mockRes, mockNext);
        expect(mockNext).toHaveBeenCalled();
        expect(setHeaderMock).toHaveBeenCalledWith('X-RateLimit-Remaining', '1');
        // Second request
        mockNext = jest.fn();
        await middleware(mockReq, mockRes, mockNext);
        expect(mockNext).toHaveBeenCalled();
        expect(setHeaderMock).toHaveBeenCalledWith('X-RateLimit-Remaining', '0');
        // Third request (should block)
        mockNext = jest.fn();
        await middleware(mockReq, mockRes, mockNext);
        expect(statusMock).toHaveBeenCalledWith(429);
        expect(mockNext).not.toHaveBeenCalled();
    });
    it('should reset the in-memory fallback after the window expires', async () => {
        ;
        CacheService_1.cacheService.incrementWithExpiry.mockRejectedValue(new Error('Redis is offline'));
        const middleware = (0, rateLimiter_1.createRateLimiter)({
            windowMs: 1,
            max: 1,
            keyPrefix: 'ttl_reset_limit',
        });
        await middleware(mockReq, mockRes, mockNext);
        expect(setHeaderMock).toHaveBeenCalledWith('X-RateLimit-Remaining', '0');
        await new Promise(resolve => setTimeout(resolve, 5));
        mockNext = jest.fn();
        await middleware(mockReq, mockRes, mockNext);
        expect(mockNext).toHaveBeenCalled();
        expect(setHeaderMock).toHaveBeenCalledWith('X-RateLimit-Remaining', '0');
    });
    it('should stop memory store cleanup without throwing', () => {
        expect(() => (0, rateLimiter_1.stopMemoryStoreCleanup)()).not.toThrow();
    });
    describe('getClientIp helper', () => {
        it('should extract IP from x-forwarded-for header', () => {
            mockReq.headers = { 'x-forwarded-for': '203.0.113.195, 70.41.3.18' };
            const ip = (0, rateLimiter_1.getClientIp)(mockReq);
            expect(ip).toBe('203.0.113.195');
        });
        it('should fallback to req.ip', () => {
            ;
            mockReq.ip = '10.0.0.1';
            const ip = (0, rateLimiter_1.getClientIp)(mockReq);
            expect(ip).toBe('10.0.0.1');
        });
    });
});
