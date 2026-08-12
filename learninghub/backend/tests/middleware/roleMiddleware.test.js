"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const authMiddleware_1 = require("../../src/middleware/authMiddleware");
jest.mock('../../src/utils/logger', () => ({
    __esModule: true,
    default: {
        info: jest.fn(),
        warn: jest.fn(),
        error: jest.fn(),
        debug: jest.fn(),
        audit: jest.fn(),
    },
}));
function makeReqResNext(userRole) {
    const req = {
        headers: {},
        user: userRole ? { userId: 'u1', email: 'a@b.com', role: userRole } : undefined,
        requestId: 'test-req-id',
    };
    const json = jest.fn();
    const status = jest.fn().mockReturnValue({ json });
    const res = { status, json };
    const next = jest.fn();
    return { req, res, next, json, status };
}
describe('authorize middleware (RBAC)', () => {
    beforeEach(() => {
        jest.clearAllMocks();
    });
    describe('authorize', () => {
        it('returns 401 when no user attached', () => {
            const { req, res, next, status } = makeReqResNext();
            (0, authMiddleware_1.authorize)('ADMIN')(req, res, next);
            expect(status).toHaveBeenCalledWith(401);
            expect(next).not.toHaveBeenCalled();
        });
        it('returns 403 when user role not in allowed list', () => {
            const { req, res, next, status } = makeReqResNext('STUDENT');
            (0, authMiddleware_1.authorize)('ADMIN')(req, res, next);
            expect(status).toHaveBeenCalledWith(403);
            expect(next).not.toHaveBeenCalled();
        });
        it('calls next() when user role is allowed', () => {
            const { req, res, next } = makeReqResNext('ADMIN');
            (0, authMiddleware_1.authorize)('ADMIN')(req, res, next);
            expect(next).toHaveBeenCalled();
        });
        it('allows multiple roles', () => {
            const { req, res, next } = makeReqResNext('INSTRUCTOR');
            (0, authMiddleware_1.authorize)('ADMIN', 'INSTRUCTOR', 'SUPERADMIN')(req, res, next);
            expect(next).toHaveBeenCalled();
        });
        it('rejects when user has none of the allowed roles', () => {
            const { req, res, next, status } = makeReqResNext('STUDENT');
            (0, authMiddleware_1.authorize)('ADMIN', 'INSTRUCTOR')(req, res, next);
            expect(status).toHaveBeenCalledWith(403);
            expect(next).not.toHaveBeenCalled();
        });
    });
    describe('authorizeAdmin', () => {
        it('allows ADMIN role', () => {
            const { req, res, next } = makeReqResNext('ADMIN');
            (0, authMiddleware_1.authorizeAdmin)(req, res, next);
            expect(next).toHaveBeenCalled();
        });
        it('allows SUPERADMIN role', () => {
            const { req, res, next } = makeReqResNext('SUPERADMIN');
            (0, authMiddleware_1.authorizeAdmin)(req, res, next);
            expect(next).toHaveBeenCalled();
        });
        it('blocks STUDENT role', () => {
            const { req, res, next, status } = makeReqResNext('STUDENT');
            (0, authMiddleware_1.authorizeAdmin)(req, res, next);
            expect(status).toHaveBeenCalledWith(403);
            expect(next).not.toHaveBeenCalled();
        });
    });
    describe('authorizeInstructor', () => {
        it('allows INSTRUCTOR role', () => {
            const { req, res, next } = makeReqResNext('INSTRUCTOR');
            (0, authMiddleware_1.authorizeInstructor)(req, res, next);
            expect(next).toHaveBeenCalled();
        });
        it('allows ADMIN role', () => {
            const { req, res, next } = makeReqResNext('ADMIN');
            (0, authMiddleware_1.authorizeInstructor)(req, res, next);
            expect(next).toHaveBeenCalled();
        });
        it('blocks STUDENT role', () => {
            const { req, res, next, status } = makeReqResNext('STUDENT');
            (0, authMiddleware_1.authorizeInstructor)(req, res, next);
            expect(status).toHaveBeenCalledWith(403);
            expect(next).not.toHaveBeenCalled();
        });
    });
    describe('authorizeSuperAdmin', () => {
        it('allows SUPERADMIN role', () => {
            const { req, res, next } = makeReqResNext('SUPERADMIN');
            (0, authMiddleware_1.authorizeSuperAdmin)(req, res, next);
            expect(next).toHaveBeenCalled();
        });
        it('blocks ADMIN role', () => {
            const { req, res, next, status } = makeReqResNext('ADMIN');
            (0, authMiddleware_1.authorizeSuperAdmin)(req, res, next);
            expect(status).toHaveBeenCalledWith(403);
            expect(next).not.toHaveBeenCalled();
        });
        it('blocks STUDENT role', () => {
            const { req, res, next, status } = makeReqResNext('STUDENT');
            (0, authMiddleware_1.authorizeSuperAdmin)(req, res, next);
            expect(status).toHaveBeenCalledWith(403);
            expect(next).not.toHaveBeenCalled();
        });
    });
});
