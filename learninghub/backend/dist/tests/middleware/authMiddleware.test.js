"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const authMiddleware_1 = require("../../src/middleware/authMiddleware");
// Mock the entire AuthService and prisma
jest.mock('../../src/services', () => ({
    AuthService: jest.fn().mockImplementation(() => ({
        verifyAccessToken: jest.fn(),
        getUserById: jest.fn(),
    })),
}));
jest.mock('../../src/config', () => ({
    prisma: {},
    jwtConfig: {
        accessSecret: 'test-secret',
        refreshSecret: 'test-refresh-secret',
        accessExpiresIn: '15m',
        issuer: 'learninghub',
        audience: 'learninghub-users',
    },
    corsOptions: { origin: 'http://localhost:5173' },
    helmetConfig: {},
    generalRateLimit: (_req, _res, next) => next(),
    authRateLimit: (_req, _res, next) => next(),
    adminRateLimit: (_req, _res, next) => next(),
    bcryptConfig: { rounds: 10 },
    validatePasswordStrength: () => ({ valid: true, errors: [] }),
}));
jest.mock('../../src/prismaClient', () => ({
    prisma: {},
}));
const services_1 = require("../../src/services");
const mockVerifyAccessToken = jest.fn();
const mockGetUserById = jest.fn();
services_1.AuthService.mockImplementation(() => ({
    verifyAccessToken: mockVerifyAccessToken,
    getUserById: mockGetUserById,
}));
function makeReqResNext(headers = {}) {
    const req = {
        headers,
        user: undefined,
        requestId: 'test-req-id',
    };
    const json = jest.fn();
    const status = jest.fn().mockReturnValue({ json });
    const res = { status, json };
    const next = jest.fn();
    return { req, res, next, json, status };
}
describe('authenticate middleware', () => {
    beforeEach(() => {
        jest.clearAllMocks();
    });
    it('returns 401 when Authorization header is missing', async () => {
        const { req, res, next, status, json } = makeReqResNext();
        await (0, authMiddleware_1.authenticate)(req, res, next);
        expect(status).toHaveBeenCalledWith(401);
        expect(json).toHaveBeenCalledWith(expect.objectContaining({ message: 'Authentication required' }));
        expect(next).not.toHaveBeenCalled();
    });
    it('returns 401 when Authorization header does not start with Bearer', async () => {
        const { req, res, next, status } = makeReqResNext({ authorization: 'Basic abc123' });
        await (0, authMiddleware_1.authenticate)(req, res, next);
        expect(status).toHaveBeenCalledWith(401);
        expect(next).not.toHaveBeenCalled();
    });
    it('returns 401 when token is invalid', async () => {
        mockVerifyAccessToken.mockImplementation(() => {
            throw new Error('Invalid token');
        });
        const { req, res, next, status } = makeReqResNext({ authorization: 'Bearer bad-token' });
        await (0, authMiddleware_1.authenticate)(req, res, next);
        expect(status).toHaveBeenCalledWith(401);
        expect(next).not.toHaveBeenCalled();
    });
    it('returns 401 when token is expired', async () => {
        mockVerifyAccessToken.mockImplementation(() => {
            throw new Error('Token expired');
        });
        const { req, res, next, status, json } = makeReqResNext({
            authorization: 'Bearer expired-token',
        });
        await (0, authMiddleware_1.authenticate)(req, res, next);
        expect(status).toHaveBeenCalledWith(401);
        expect(json).toHaveBeenCalledWith(expect.objectContaining({ code: 'TOKEN_EXPIRED' }));
        expect(next).not.toHaveBeenCalled();
    });
    it('returns 401 when user not found in DB', async () => {
        mockVerifyAccessToken.mockReturnValue({ userId: 'u1', email: 'a@b.com', role: 'STUDENT' });
        mockGetUserById.mockResolvedValue(null);
        const { req, res, next, status } = makeReqResNext({ authorization: 'Bearer valid-token' });
        await (0, authMiddleware_1.authenticate)(req, res, next);
        expect(status).toHaveBeenCalledWith(401);
        expect(next).not.toHaveBeenCalled();
    });
    it('returns 401 when account is soft-deleted', async () => {
        mockVerifyAccessToken.mockReturnValue({ userId: 'u1', email: 'a@b.com', role: 'STUDENT' });
        mockGetUserById.mockResolvedValue({ id: 'u1', deletedAt: new Date(), lockedUntil: null });
        const { req, res, next, status } = makeReqResNext({ authorization: 'Bearer valid-token' });
        await (0, authMiddleware_1.authenticate)(req, res, next);
        expect(status).toHaveBeenCalledWith(401);
        expect(next).not.toHaveBeenCalled();
    });
    it('returns 401 when account is locked', async () => {
        const future = new Date(Date.now() + 60000);
        mockVerifyAccessToken.mockReturnValue({ userId: 'u1', email: 'a@b.com', role: 'STUDENT' });
        mockGetUserById.mockResolvedValue({ id: 'u1', deletedAt: null, lockedUntil: future });
        const { req, res, next, status } = makeReqResNext({ authorization: 'Bearer valid-token' });
        await (0, authMiddleware_1.authenticate)(req, res, next);
        expect(status).toHaveBeenCalledWith(401);
        expect(next).not.toHaveBeenCalled();
    });
    it('calls next() and attaches user when token is valid', async () => {
        const decoded = { userId: 'u1', email: 'a@b.com', role: 'STUDENT' };
        mockVerifyAccessToken.mockReturnValue(decoded);
        mockGetUserById.mockResolvedValue({ id: 'u1', deletedAt: null, lockedUntil: null });
        const { req, res, next } = makeReqResNext({ authorization: 'Bearer valid-token' });
        await (0, authMiddleware_1.authenticate)(req, res, next);
        expect(next).toHaveBeenCalled();
        expect(req.user).toEqual(expect.objectContaining({ userId: 'u1', role: 'STUDENT' }));
    });
});
describe('optionalAuth middleware', () => {
    beforeEach(() => jest.clearAllMocks());
    it('calls next() without setting user when no token', async () => {
        const { req, res, next } = makeReqResNext();
        await (0, authMiddleware_1.optionalAuth)(req, res, next);
        expect(next).toHaveBeenCalled();
        expect(req.user).toBeUndefined();
    });
    it('calls next() and attaches user when valid token provided', async () => {
        const decoded = { userId: 'u2', email: 'b@c.com', role: 'STUDENT' };
        mockVerifyAccessToken.mockReturnValue(decoded);
        const { req, res, next } = makeReqResNext({ authorization: 'Bearer valid-token' });
        await (0, authMiddleware_1.optionalAuth)(req, res, next);
        expect(next).toHaveBeenCalled();
        expect(req.user).toEqual(expect.objectContaining({ userId: 'u2' }));
    });
    it('calls next() without user when token is invalid (does not throw)', async () => {
        mockVerifyAccessToken.mockImplementation(() => {
            throw new Error('bad');
        });
        const { req, res, next } = makeReqResNext({ authorization: 'Bearer bad-token' });
        await (0, authMiddleware_1.optionalAuth)(req, res, next);
        expect(next).toHaveBeenCalled();
        expect(req.user).toBeUndefined();
    });
});
describe('authorize middleware', () => {
    it('returns 401 when no user attached', () => {
        const { req, res, next, status } = makeReqResNext();
        (0, authMiddleware_1.authorize)('ADMIN')(req, res, next);
        expect(status).toHaveBeenCalledWith(401);
        expect(next).not.toHaveBeenCalled();
    });
    it('returns 403 when user role not in allowed list', () => {
        const { req, res, next, status } = makeReqResNext();
        req.user = { userId: 'u1', email: 'a@b.com', role: 'STUDENT' };
        (0, authMiddleware_1.authorize)('ADMIN')(req, res, next);
        expect(status).toHaveBeenCalledWith(403);
        expect(next).not.toHaveBeenCalled();
    });
    it('calls next() when user role is allowed', () => {
        const { req, res, next } = makeReqResNext();
        req.user = { userId: 'u1', email: 'a@b.com', role: 'ADMIN' };
        (0, authMiddleware_1.authorize)('ADMIN', 'SUPERADMIN')(req, res, next);
        expect(next).toHaveBeenCalled();
    });
});
