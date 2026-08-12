"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.resetMockContext = exports.getMockContext = exports.createMockContext = void 0;
const jest_mock_extended_1 = require("jest-mock-extended");
const createMockContext = () => {
    return {
        prisma: (0, jest_mock_extended_1.mockDeep)(),
    };
};
exports.createMockContext = createMockContext;
// Singleton for test context
let mockContext;
const getMockContext = () => {
    if (!mockContext) {
        mockContext = (0, exports.createMockContext)();
    }
    return mockContext;
};
exports.getMockContext = getMockContext;
// Reset mock context between tests
const resetMockContext = () => {
    mockContext = (0, exports.createMockContext)();
};
exports.resetMockContext = resetMockContext;
