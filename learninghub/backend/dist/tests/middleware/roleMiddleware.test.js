"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const jest_mock_extended_1 = require("jest-mock-extended");
const roleMiddleware_1 = require("../../src/middleware/roleMiddleware");
describe('RoleMiddleware', () => {
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
    });
    describe('requireRole', () => {
        it('should call next() when user has required role', () => {
            mockReq.user = { userId: 'user-123', role: 'admin' };
            const middleware = (0, roleMiddleware_1.requireRole)(['admin', 'instructor']);
            middleware(mockReq, mockRes, mockNext);
            expect(mockNext).toHaveBeenCalled();
            expect(statusMock).not.toHaveBeenCalled();
        });
        it('should return 401 when user is not authenticated', () => {
            mockReq.user = undefined;
            const middleware = (0, roleMiddleware_1.requireRole)(['admin']);
            middleware(mockReq, mockRes, mockNext);
            expect(statusMock).toHaveBeenCalledWith(401);
            expect(jsonMock).toHaveBeenCalledWith({
                status: 'error',
                message: 'Unauthorized',
            });
            expect(mockNext).not.toHaveBeenCalled();
        });
        it('should return 403 when user lacks required role', () => {
            mockReq.user = { userId: 'user-123', role: 'student' };
            const middleware = (0, roleMiddleware_1.requireRole)(['admin']);
            middleware(mockReq, mockRes, mockNext);
            expect(statusMock).toHaveBeenCalledWith(403);
            expect(jsonMock).toHaveBeenCalledWith({
                status: 'error',
                message: 'Forbidden: Insufficient permissions',
            });
            expect(mockNext).not.toHaveBeenCalled();
        });
        it('should accept multiple roles', () => {
            mockReq.user = { userId: 'user-123', role: 'instructor' };
            const middleware = (0, roleMiddleware_1.requireRole)(['admin', 'instructor']);
            middleware(mockReq, mockRes, mockNext);
            expect(mockNext).toHaveBeenCalled();
        });
    });
    describe('requireAdmin', () => {
        it('should call next() for admin user', () => {
            mockReq.user = { userId: 'user-123', role: 'admin' };
            (0, roleMiddleware_1.requireAdmin)(mockReq, mockRes, mockNext);
            expect(mockNext).toHaveBeenCalled();
        });
        it('should return 401 when user is not authenticated', () => {
            mockReq.user = undefined;
            (0, roleMiddleware_1.requireAdmin)(mockReq, mockRes, mockNext);
            expect(statusMock).toHaveBeenCalledWith(401);
            expect(jsonMock).toHaveBeenCalledWith({
                status: 'error',
                message: 'Unauthorized',
            });
        });
        it('should return 403 for non-admin users', () => {
            mockReq.user = { userId: 'user-123', role: 'student' };
            (0, roleMiddleware_1.requireAdmin)(mockReq, mockRes, mockNext);
            expect(statusMock).toHaveBeenCalledWith(403);
            expect(jsonMock).toHaveBeenCalledWith({
                status: 'error',
                message: 'Admin access required',
            });
        });
        it('should return 403 for instructor users', () => {
            mockReq.user = { userId: 'user-123', role: 'instructor' };
            (0, roleMiddleware_1.requireAdmin)(mockReq, mockRes, mockNext);
            expect(statusMock).toHaveBeenCalledWith(403);
            expect(jsonMock).toHaveBeenCalledWith({
                status: 'error',
                message: 'Admin access required',
            });
        });
    });
    describe('requireInstructorOrAdmin', () => {
        it('should call next() for admin user', () => {
            mockReq.user = { userId: 'user-123', role: 'admin' };
            (0, roleMiddleware_1.requireInstructorOrAdmin)(mockReq, mockRes, mockNext);
            expect(mockNext).toHaveBeenCalled();
        });
        it('should call next() for instructor user', () => {
            mockReq.user = { userId: 'user-123', role: 'instructor' };
            (0, roleMiddleware_1.requireInstructorOrAdmin)(mockReq, mockRes, mockNext);
            expect(mockNext).toHaveBeenCalled();
        });
        it('should return 401 when user is not authenticated', () => {
            mockReq.user = undefined;
            (0, roleMiddleware_1.requireInstructorOrAdmin)(mockReq, mockRes, mockNext);
            expect(statusMock).toHaveBeenCalledWith(401);
            expect(jsonMock).toHaveBeenCalledWith({
                status: 'error',
                message: 'Unauthorized',
            });
        });
        it('should return 403 for student users', () => {
            mockReq.user = { userId: 'user-123', role: 'student' };
            (0, roleMiddleware_1.requireInstructorOrAdmin)(mockReq, mockRes, mockNext);
            expect(statusMock).toHaveBeenCalledWith(403);
            expect(jsonMock).toHaveBeenCalledWith({
                status: 'error',
                message: 'Instructor or Admin access required',
            });
        });
    });
});
