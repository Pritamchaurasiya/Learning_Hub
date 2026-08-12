"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const roleMiddleware_1 = require("../../src/middleware/roleMiddleware");
function makeReqResNext(role) {
    const req = {
        user: role ? { userId: 'user-123', email: 'test@example.com', role } : undefined,
    };
    const json = jest.fn();
    const status = jest.fn().mockReturnValue({ json });
    const res = { status, json };
    const next = jest.fn();
    return { req, res, next, json, status };
}
describe('roleMiddleware guards', () => {
    beforeEach(() => {
        jest.clearAllMocks();
    });
    describe('requireRole', () => {
        it('allows configured roles case-insensitively', () => {
            const { req, res, next, status } = makeReqResNext('instructor');
            (0, roleMiddleware_1.requireRole)(['ADMIN', 'INSTRUCTOR'])(req, res, next);
            expect(next).toHaveBeenCalled();
            expect(status).not.toHaveBeenCalled();
        });
        it('rejects unauthenticated requests', () => {
            const { req, res, next, status, json } = makeReqResNext();
            (0, roleMiddleware_1.requireRole)(['ADMIN'])(req, res, next);
            expect(status).toHaveBeenCalledWith(401);
            expect(json).toHaveBeenCalledWith({
                status: 'error',
                message: 'Authentication required',
                code: 'NO_TOKEN',
            });
            expect(next).not.toHaveBeenCalled();
        });
        it('rejects users without an allowed role', () => {
            const { req, res, next, status, json } = makeReqResNext('STUDENT');
            (0, roleMiddleware_1.requireRole)(['ADMIN'])(req, res, next);
            expect(status).toHaveBeenCalledWith(403);
            expect(json).toHaveBeenCalledWith({
                status: 'error',
                message: 'Insufficient permissions',
                code: 'FORBIDDEN',
            });
            expect(next).not.toHaveBeenCalled();
        });
    });
    describe('requireAdmin', () => {
        it.each(['ADMIN', 'SUPERADMIN'])('allows %s', role => {
            const { req, res, next, status } = makeReqResNext(role);
            (0, roleMiddleware_1.requireAdmin)(req, res, next);
            expect(next).toHaveBeenCalled();
            expect(status).not.toHaveBeenCalled();
        });
        it('rejects non-admin users', () => {
            const { req, res, next, status, json } = makeReqResNext('STUDENT');
            (0, roleMiddleware_1.requireAdmin)(req, res, next);
            expect(status).toHaveBeenCalledWith(403);
            expect(json).toHaveBeenCalledWith({
                status: 'error',
                message: 'Admin access required',
                code: 'FORBIDDEN',
            });
            expect(next).not.toHaveBeenCalled();
        });
    });
    describe('requireAdminPermission', () => {
        it.each(['ADMIN', 'SUPERADMIN'])('allows %s for named admin permissions', role => {
            const { req, res, next, status } = makeReqResNext(role);
            (0, roleMiddleware_1.requireAdminPermission)(['analytics.read'])(req, res, next);
            expect(next).toHaveBeenCalled();
            expect(status).not.toHaveBeenCalled();
        });
        it('rejects non-admin users', () => {
            const { req, res, next, status, json } = makeReqResNext('INSTRUCTOR');
            (0, roleMiddleware_1.requireAdminPermission)(['courses.write'])(req, res, next);
            expect(status).toHaveBeenCalledWith(403);
            expect(json).toHaveBeenCalledWith({
                status: 'error',
                message: 'Admin access required',
                code: 'FORBIDDEN',
            });
            expect(next).not.toHaveBeenCalled();
        });
    });
    describe('requireInstructorOrAdmin', () => {
        it.each(['INSTRUCTOR', 'ADMIN', 'SUPERADMIN'])('allows %s', role => {
            const { req, res, next, status } = makeReqResNext(role);
            (0, roleMiddleware_1.requireInstructorOrAdmin)(req, res, next);
            expect(next).toHaveBeenCalled();
            expect(status).not.toHaveBeenCalled();
        });
        it('rejects students', () => {
            const { req, res, next, status, json } = makeReqResNext('STUDENT');
            (0, roleMiddleware_1.requireInstructorOrAdmin)(req, res, next);
            expect(status).toHaveBeenCalledWith(403);
            expect(json).toHaveBeenCalledWith({
                status: 'error',
                message: 'Instructor or Admin access required',
                code: 'FORBIDDEN',
            });
            expect(next).not.toHaveBeenCalled();
        });
    });
});
