"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const jest_mock_extended_1 = require("jest-mock-extended");
const prismaClient_1 = require("../src/prismaClient");
// Mock the prisma client
jest.mock('../src/prismaClient', () => {
    const mockPrisma = (0, jest_mock_extended_1.mockDeep)();
    mockPrisma.$transaction.mockImplementation(async (arg) => {
        if (Array.isArray(arg)) {
            return Promise.all(arg);
        }
        return arg(mockPrisma);
    });
    return { prisma: mockPrisma };
});
// Mock Redis CacheService to prevent "Redis is offline" errors
jest.mock('../src/services/CacheService', () => ({
    cacheService: {
        get: jest.fn().mockResolvedValue(null),
        set: jest.fn().mockResolvedValue(true),
        delete: jest.fn().mockResolvedValue(true),
        deletePattern: jest.fn().mockResolvedValue(true),
        clear: jest.fn().mockResolvedValue(true),
        increment: jest.fn().mockResolvedValue(1),
        incrementWithExpiry: jest.fn().mockResolvedValue(1),
        expire: jest.fn().mockResolvedValue(true),
        getClient: jest.fn().mockReturnValue(null),
        generateKey: jest.fn().mockImplementation((prefix, ...args) => `${prefix}:${args.join(':')}`),
    },
}));
// Reset mocks before each test
beforeEach(() => {
    (0, jest_mock_extended_1.mockClear)(prismaClient_1.prisma);
});
// Set test environment variables
process.env.CSRF_SECRET = 'test-csrf-secret-for-testing-only-32chars!!';
process.env.JWT_SECRET = 'test-jwt-secret-for-testing-only';
process.env.JWT_REFRESH_SECRET = 'test-jwt-refresh-secret-for-testing-only';
process.env.JWT_EXPIRES_IN = '1h';
process.env.REFRESH_TOKEN_EXPIRES_IN = '7d';
process.env.NODE_ENV = 'test';
process.env.LOG_LEVEL = '3'; // DEBUG level for tests
process.env.RATE_LIMIT_ENABLED = 'false'; // Disable rate limiting explicitly for unit tests
// Suppress console output during tests (optional, can be enabled for debugging)
// global.console = {
//   ...console,
//   log: jest.fn(),
//   debug: jest.fn(),
//   info: jest.fn(),
// warn: jest.fn(),
// };
// Mock asyncHandler to prevent it from swallowing errors in tests that don't pass `next`
jest.mock('../src/utils/errorHandler', () => {
    const original = jest.requireActual('../src/utils/errorHandler');
    return {
        ...original,
        asyncHandler: (fn) => {
            return async (req, res, next) => {
                try {
                    await fn(req, res, next);
                }
                catch (error) {
                    // If next is not a mock function and is provided, call it
                    if (next && typeof next === 'function' && !jest.isMockFunction(next)) {
                        next(error);
                    }
                    else {
                        // Default mock behavior for unit tests testing 500 status directly
                        const status = error.statusCode || 500;
                        if (status === 500)
                            console.error('[TEST ERROR]', error);
                        const message = status === 500
                            ? error.message === 'Connection failed'
                                ? 'System check failed'
                                : 'Internal server error'
                            : error.message;
                        const code = error.errorCode || (status === 401 ? 'UNAUTHORIZED' : 'INTERNAL_ERROR');
                        res.status(status).json({ status: 'error', message, code });
                    }
                }
            };
        },
    };
});
