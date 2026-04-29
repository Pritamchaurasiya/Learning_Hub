"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const jest_mock_extended_1 = require("jest-mock-extended");
const prismaClient_1 = require("../src/prismaClient");
// Mock the prisma client
jest.mock('../src/prismaClient', () => ({
    prisma: (0, jest_mock_extended_1.mockDeep)(),
}));
// Reset mocks before each test
beforeEach(() => {
    (0, jest_mock_extended_1.mockReset)(prismaClient_1.prisma);
});
// Set test environment variables
process.env.JWT_SECRET = 'test-jwt-secret-for-testing-only';
process.env.JWT_EXPIRES_IN = '1h';
process.env.REFRESH_TOKEN_EXPIRES_IN = '7d';
process.env.NODE_ENV = 'test';
process.env.LOG_LEVEL = '3'; // DEBUG level for tests
// Suppress console output during tests (optional, can be enabled for debugging)
// global.console = {
//   ...console,
//   log: jest.fn(),
//   debug: jest.fn(),
//   info: jest.fn(),
//   warn: jest.fn(),
// };
