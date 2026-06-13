import { mockDeep, mockReset } from 'jest-mock-extended'
import { prisma } from '../src/prismaClient'

// Mock the prisma client
jest.mock('../src/prismaClient', () => ({
  prisma: mockDeep<typeof prisma>(),
}))

// Mock Redis CacheService to prevent "Redis is offline" errors
jest.mock('../src/services/CacheService', () => ({
  cacheService: {
    get: jest.fn().mockResolvedValue(null),
    set: jest.fn().mockResolvedValue(true),
    delete: jest.fn().mockResolvedValue(true),
    clear: jest.fn().mockResolvedValue(true),
    increment: jest.fn().mockResolvedValue(1),
    getClient: jest.fn().mockReturnValue(null),
  },
}))

// Reset mocks before each test
beforeEach(() => {
  mockReset(prisma)
})

// Set test environment variables
process.env.JWT_SECRET = 'test-jwt-secret-for-testing-only'
process.env.JWT_REFRESH_SECRET = 'test-jwt-refresh-secret-for-testing-only'
process.env.JWT_EXPIRES_IN = '1h'
process.env.REFRESH_TOKEN_EXPIRES_IN = '7d'
process.env.NODE_ENV = 'test'
process.env.LOG_LEVEL = '3' // DEBUG level for tests

// Suppress console output during tests (optional, can be enabled for debugging)
// global.console = {
//   ...console,
//   log: jest.fn(),
//   debug: jest.fn(),
//   info: jest.fn(),
//   warn: jest.fn(),
// };
