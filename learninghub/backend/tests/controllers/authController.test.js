"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const jest_mock_extended_1 = require("jest-mock-extended");
const jsonwebtoken_1 = __importDefault(require("jsonwebtoken"));
const authController_1 = require("../../src/controllers/authController");
const user_factory_1 = require("../factories/user.factory");
const prismaClient_1 = require("../../src/prismaClient");
const MfaService_1 = require("../../src/services/MfaService");
const env_1 = require("../../src/utils/env");
jest.mock('../../src/services/MfaService', () => ({
    MfaService: {
        generateSecret: jest.fn(),
        verifyAndEnable: jest.fn(),
        validateToken: jest.fn(),
    },
}));
// Mock AuthService – factory is self-contained (jest.mock is hoisted above all code)
var _svc;
jest.mock('../../src/services/AuthService', () => {
    const inst = {
        register: jest.fn(),
        login: jest.fn(),
        logout: jest.fn().mockResolvedValue(undefined),
        changePassword: jest.fn().mockResolvedValue(undefined),
        updateProfile: jest.fn().mockResolvedValue({}),
        deleteAccount: jest.fn().mockResolvedValue(undefined),
        resetPassword: jest.fn().mockResolvedValue(undefined),
        refreshToken: jest
            .fn()
            .mockResolvedValue({ accessToken: 'new-access', refreshToken: 'new-refresh' }),
    };
    _svc = inst;
    return { __esModule: true, AuthService: jest.fn(() => inst) };
});
jest.mock('../../src/utils/auth', () => ({
    generateToken: jest.fn().mockReturnValue('mock-token'),
    generateRefreshToken: jest.fn().mockReturnValue('mock-refresh-token'),
    verifyRefreshToken: jest.fn(),
    verifyMfaSessionToken: jest.fn().mockReturnValue('user-123'),
    hashToken: jest.fn().mockReturnValue('hashed-token'),
}));
jest.mock('../../src/utils/logger', () => ({
    __esModule: true,
    default: {
        error: jest.fn(),
        info: jest.fn(),
        warn: jest.fn(),
        debug: jest.fn(),
        audit: jest.fn(),
    },
}));
jest.mock('../../src/services/EmailService', () => ({
    emailService: {
        sendVerificationEmail: jest.fn().mockResolvedValue(true),
        sendPasswordResetEmail: jest.fn().mockResolvedValue(true),
    },
}));
jest.mock('../../src/services/CacheService', () => ({
    cacheService: {
        get: jest.fn().mockResolvedValue(null),
        set: jest.fn().mockResolvedValue(true),
        generateKey: jest.fn().mockReturnValue('mock-key'),
        delete: jest.fn().mockResolvedValue(true),
        incrementWithExpiry: jest.fn().mockResolvedValue(1),
        expire: jest.fn().mockResolvedValue(true),
    },
}));
jest.mock('../../src/services/QueryOptimizationService', () => ({
    queryOptimizationService: {
        getUserPerformanceSummary: jest
            .fn()
            .mockResolvedValue({
            test_stats: { total_tests: 0, average_score: 0, best_score: 0, worst_score: 0 },
            recent_tests: [],
        }),
    },
}));
jest.mock('../../src/config', () => ({
    __esModule: true,
    bcryptConfig: { rounds: 10 },
    validatePasswordStrength: jest.fn().mockReturnValue({ valid: true, errors: [] }),
}));
describe('AuthController', () => {
    let mockReq;
    let mockRes;
    let jsonMock;
    let statusMock;
    beforeEach(() => {
        jsonMock = jest.fn().mockReturnThis();
        statusMock = jest.fn().mockReturnValue({ json: jsonMock });
        mockReq = (0, jest_mock_extended_1.mockDeep)();
        mockReq.cookies = {};
        mockRes = (0, jest_mock_extended_1.mockDeep)();
        mockRes.status = statusMock;
        mockRes.json = jsonMock;
        jest.clearAllMocks();
    });
    describe('register', () => {
        it('should register a new user successfully', async () => {
            const userData = {
                email: 'test@example.com',
                password: 'StrongPass123!',
                username: 'testuser',
            };
            const createdUser = (0, user_factory_1.createUser)({
                id: 'user-123',
                email: userData.email,
                username: userData.username,
                role: 'STUDENT',
            });
            _svc.register.mockResolvedValue({
                user: createdUser,
                tokens: { accessToken: 'mock-token', refreshToken: 'mock-refresh-token', expiresIn: 900 },
            });
            mockReq.body = userData;
            mockReq.ip = '127.0.0.1';
            await (0, authController_1.register)(mockReq, mockRes, jest.fn());
            expect(mockRes.cookie).toHaveBeenCalledWith('access_token', 'mock-token', expect.any(Object));
            expect(mockRes.cookie).toHaveBeenCalledWith('refresh_token', 'mock-refresh-token', expect.any(Object));
            expect(statusMock).toHaveBeenCalledWith(201);
            expect(jsonMock).toHaveBeenCalledWith({
                status: 'success',
                message: 'Registration successful',
                data: {
                    user: {
                        id: createdUser.id,
                        email: createdUser.email,
                        username: createdUser.username,
                        role: createdUser.role,
                        xp: createdUser.xp,
                        level: createdUser.level,
                        streak: createdUser.streak,
                    },
                },
            });
        });
        it('should return 400 when email or password is missing', async () => {
            mockReq.body = { email: 'test@example.com' };
            await (0, authController_1.register)(mockReq, mockRes, jest.fn());
            expect(statusMock).toHaveBeenCalledWith(400);
            expect(jsonMock).toHaveBeenCalledWith(expect.objectContaining({ status: 'error', message: 'Email and password are required' }));
        });
        it('should return 400 when email already exists to prevent enumeration', async () => {
            _svc.register.mockRejectedValue(new Error('Registration failed: Invalid request'));
            mockReq.body = { email: 'existing@example.com', password: 'StrongPass123!' };
            await (0, authController_1.register)(mockReq, mockRes, jest.fn());
            expect(statusMock).toHaveBeenCalledWith(400);
            expect(jsonMock).toHaveBeenCalledWith(expect.objectContaining({ status: 'error', message: 'Registration failed. Email or username may be unavailable' }));
        });
        it('should return 500 on database error', async () => {
            _svc.register.mockRejectedValue(new Error('Database error'));
            mockReq.body = { email: 'test@example.com', password: 'StrongPass123!', username: 'testuser' };
            await (0, authController_1.register)(mockReq, mockRes, jest.fn());
            expect(statusMock).toHaveBeenCalledWith(500);
        });
    });
    describe('login', () => {
        it('should login successfully with valid credentials', async () => {
            const existingUser = (0, user_factory_1.createUser)({
                id: 'user-123',
                email: 'test@example.com',
                password: 'hashed-password',
            });
            _svc.login.mockResolvedValue({
                user: existingUser,
                tokens: { accessToken: 'mock-token', refreshToken: 'mock-refresh-token', expiresIn: 900 },
            });
            mockReq.body = { email: 'test@example.com', password: 'StrongPass123!' };
            await (0, authController_1.login)(mockReq, mockRes, jest.fn());
            expect(mockRes.cookie).toHaveBeenCalledWith('access_token', 'mock-token', expect.any(Object));
            expect(mockRes.cookie).toHaveBeenCalledWith('refresh_token', 'mock-refresh-token', expect.any(Object));
            expect(statusMock).toHaveBeenCalledWith(200);
            expect(jsonMock).toHaveBeenCalledWith({
                status: 'success',
                message: 'Login successful',
                data: {
                    user: {
                        id: existingUser.id,
                        email: existingUser.email,
                        username: existingUser.username,
                        role: existingUser.role,
                        xp: existingUser.xp,
                        level: existingUser.level,
                        streak: existingUser.streak,
                        lastActive: existingUser.lastActive,
                    },
                },
            });
        });
        it('should return mfaRequired challenge if user has mfaEnabled', async () => {
            const mfaUser = (0, user_factory_1.createUser)({ id: 'user-mfa', email: 'mfa@example.com', mfaEnabled: true });
            _svc.login.mockResolvedValue({
                user: mfaUser,
                tokens: { accessToken: 'mock-token', refreshToken: 'mock-refresh-token', expiresIn: 900 },
            });
            mockReq.body = { email: 'mfa@example.com', password: 'StrongPass123!' };
            await (0, authController_1.login)(mockReq, mockRes, jest.fn());
            expect(statusMock).toHaveBeenCalledWith(200);
            expect(jsonMock).toHaveBeenCalledWith({
                status: 'success',
                message: 'MFA verification required',
                data: {
                    mfaRequired: true,
                    mfaSessionToken: expect.any(String),
                },
            });
        });
        it('should return 401 for non-existent user', async () => {
            _svc.login.mockRejectedValue(new Error('Invalid credentials'));
            mockReq.body = { email: 'nonexistent@example.com', password: 'StrongPass123!' };
            await (0, authController_1.login)(mockReq, mockRes, jest.fn());
            expect(statusMock).toHaveBeenCalledWith(401);
            expect(jsonMock).toHaveBeenCalledWith(expect.objectContaining({ status: 'error', message: 'Invalid email or password' }));
        });
        it('should return 401 for invalid password', async () => {
            _svc.login.mockRejectedValue(new Error('Invalid credentials'));
            mockReq.body = { email: 'test@example.com', password: 'wrongpassword' };
            await (0, authController_1.login)(mockReq, mockRes, jest.fn());
            expect(statusMock).toHaveBeenCalledWith(401);
            expect(jsonMock).toHaveBeenCalledWith(expect.objectContaining({ status: 'error', message: 'Invalid email or password' }));
        });
        it('should return 500 on database error', async () => {
            _svc.login.mockRejectedValue(new Error('Database error'));
            mockReq.body = { email: 'test@example.com', password: 'StrongPass123!' };
            await (0, authController_1.login)(mockReq, mockRes, jest.fn());
            expect(statusMock).toHaveBeenCalledWith(500);
        });
    });
    describe('refresh', () => {
        const { verifyRefreshToken } = jest.requireMock('../../src/utils/auth');
        it('should refresh token successfully', async () => {
            const refreshToken = 'valid-refresh-token';
            const user = (0, user_factory_1.createUser)({ id: 'user-123' });
            mockReq.body = { refresh_token: refreshToken };
            verifyRefreshToken.mockReturnValue({ userId: user.id });
            prismaClient_1.prisma.refreshToken.findUnique.mockResolvedValue({
                id: 'rt-1',
                token: 'hashed-token',
                userId: user.id,
                revokedAt: null,
                usedAt: null,
                expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
            });
            prismaClient_1.prisma.refreshToken.update.mockResolvedValue({});
            prismaClient_1.prisma.refreshToken.create.mockResolvedValue({ id: 'rt-2' });
            prismaClient_1.prisma.user.findUnique.mockResolvedValue(user);
            await (0, authController_1.refresh)(mockReq, mockRes, jest.fn());
            expect(mockRes.cookie).toHaveBeenCalledWith('access_token', expect.any(String), expect.any(Object));
            expect(mockRes.cookie).toHaveBeenCalledWith('refresh_token', expect.any(String), expect.any(Object));
            expect(jsonMock).toHaveBeenCalledWith(expect.objectContaining({ status: 'success', data: { message: 'Token refreshed' } }));
        });
        it('should accept refresh key for backward compatibility', async () => {
            const user = (0, user_factory_1.createUser)({ id: 'user-123' });
            mockReq.body = { refresh: 'valid-refresh-token' };
            verifyRefreshToken.mockReturnValue({ userId: user.id });
            prismaClient_1.prisma.refreshToken.findUnique.mockResolvedValue({
                id: 'rt-1',
                token: 'hashed-token',
                userId: user.id,
                revokedAt: null,
                usedAt: null,
                expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
            });
            prismaClient_1.prisma.refreshToken.update.mockResolvedValue({});
            prismaClient_1.prisma.refreshToken.create.mockResolvedValue({ id: 'rt-2' });
            prismaClient_1.prisma.user.findUnique.mockResolvedValue(user);
            await (0, authController_1.refresh)(mockReq, mockRes, jest.fn());
            expect(mockRes.cookie).toHaveBeenCalledWith('access_token', expect.any(String), expect.any(Object));
            expect(mockRes.cookie).toHaveBeenCalledWith('refresh_token', expect.any(String), expect.any(Object));
            expect(jsonMock).toHaveBeenCalledWith(expect.objectContaining({ status: 'success', data: { message: 'Token refreshed' } }));
        });
        it('should return 400 when refresh token is missing', async () => {
            mockReq.body = {};
            await (0, authController_1.refresh)(mockReq, mockRes, jest.fn());
            expect(statusMock).toHaveBeenCalledWith(400);
            expect(jsonMock).toHaveBeenCalledWith(expect.objectContaining({ status: 'error', message: 'Refresh token is required' }));
        });
        it('should return 401 for invalid refresh token', async () => {
            mockReq.body = { refresh_token: 'invalid-token' };
            _svc.refreshToken.mockRejectedValue(new Error('Invalid refresh token'));
            await (0, authController_1.refresh)(mockReq, mockRes, jest.fn());
            expect(statusMock).toHaveBeenCalledWith(401);
            expect(jsonMock).toHaveBeenCalledWith(expect.objectContaining({ status: 'error', message: 'Invalid or expired refresh token' }));
        });
        it('should return 401 when user no longer exists', async () => {
            mockReq.body = { refresh_token: 'valid-refresh-token' };
            _svc.refreshToken.mockRejectedValue(new Error('User not found or deleted'));
            await (0, authController_1.refresh)(mockReq, mockRes, jest.fn());
            expect(statusMock).toHaveBeenCalledWith(401);
            expect(jsonMock).toHaveBeenCalledWith(expect.objectContaining({ status: 'error', message: 'Invalid or expired refresh token' }));
        });
        it('should return 401 on token verification error', async () => {
            mockReq.body = { refresh_token: 'token' };
            _svc.refreshToken.mockRejectedValue(new Error('Invalid or expired refresh token'));
            await (0, authController_1.refresh)(mockReq, mockRes, jest.fn());
            expect(statusMock).toHaveBeenCalledWith(401);
            expect(jsonMock).toHaveBeenCalledWith(expect.objectContaining({ status: 'error', message: 'Invalid or expired refresh token' }));
        });
    });
    describe('me', () => {
        it('should return user profile successfully', async () => {
            const user = (0, user_factory_1.createUser)({ id: 'user-123' });
            mockReq.user = { userId: user.id, email: user.email, role: user.role };
            prismaClient_1.prisma.user.findUnique.mockResolvedValue(user);
            prismaClient_1.prisma.userAchievement.findMany.mockResolvedValue([]);
            prismaClient_1.prisma.user.update.mockResolvedValue(user);
            await (0, authController_1.me)(mockReq, mockRes, jest.fn());
            expect(jsonMock).toHaveBeenCalledWith(expect.objectContaining({
                status: 'success',
                data: expect.objectContaining({
                    user: expect.objectContaining({
                        id: user.id,
                        email: user.email,
                        username: user.username,
                        role: user.role,
                    }),
                    bookmarks: [],
                    achievements: [],
                }),
            }));
        });
        it('should return 404 when user not found', async () => {
            ;
            mockReq.user = { userId: 'non-existent-id' };
            prismaClient_1.prisma.user.findUnique.mockResolvedValue(null);
            prismaClient_1.prisma.userAchievement.findMany.mockResolvedValue([]);
            await (0, authController_1.me)(mockReq, mockRes, jest.fn());
            expect(statusMock).toHaveBeenCalledWith(404);
            expect(jsonMock).toHaveBeenCalledWith(expect.objectContaining({ status: 'error', message: 'User not found' }));
        });
        it('should return 500 on database error', async () => {
            ;
            mockReq.user = { userId: 'user-123' };
            prismaClient_1.prisma.user.findUnique.mockRejectedValue(new Error('Database error'));
            await (0, authController_1.me)(mockReq, mockRes, jest.fn());
            expect(statusMock).toHaveBeenCalledWith(500);
            expect(jsonMock).toHaveBeenCalledWith(expect.objectContaining({ status: 'error', message: 'Internal server error' }));
        });
    });
    describe('MFA Endpoints', () => {
        it('setupMfa should return secret and qrCodeUrl when user does not have mfa enabled', async () => {
            ;
            mockReq.user = { userId: 'user-123' };
            prismaClient_1.prisma.user.findUnique.mockResolvedValue({
                id: 'user-123',
                email: 'test@example.com',
                mfaEnabled: false,
            });
            MfaService_1.MfaService.generateSecret.mockResolvedValue({
                secret: 'MOCKSECRET',
                qrCodeUrl: 'data:image/png;base64,mock',
            });
            await (0, authController_1.setupMfa)(mockReq, mockRes, jest.fn());
            expect(statusMock).toHaveBeenCalledWith(200);
            expect(jsonMock).toHaveBeenCalledWith(expect.objectContaining({
                status: 'success',
                data: { secret: 'MOCKSECRET', qrCodeUrl: 'data:image/png;base64,mock' },
            }));
        });
        it('verifyAndEnableMfa should return 200 when token is verified', async () => {
            ;
            mockReq.user = { userId: 'user-123' };
            mockReq.body = { token: '123456' };
            MfaService_1.MfaService.verifyAndEnable.mockResolvedValue(true);
            await (0, authController_1.verifyAndEnableMfa)(mockReq, mockRes, jest.fn());
            expect(statusMock).toHaveBeenCalledWith(200);
            expect(jsonMock).toHaveBeenCalledWith(expect.objectContaining({ status: 'success' }));
        });
        it('verifyMfaLogin should return access and refresh tokens when mfa token is valid', async () => {
            const mfaSessionToken = jsonwebtoken_1.default.sign({ userId: 'user-123', purpose: 'mfa_login', iat: Date.now() }, env_1.config.jwtRefreshSecret, { expiresIn: '5m' });
            mockReq.body = { mfaSessionToken, token: '123456' };
            MfaService_1.MfaService.validateToken.mockResolvedValue(true);
            prismaClient_1.prisma.user.findUnique.mockResolvedValue({
                id: 'user-123',
                email: 'test@example.com',
                username: 'testuser',
                role: 'STUDENT',
            });
            await (0, authController_1.verifyMfaLogin)(mockReq, mockRes, jest.fn());
            expect(mockRes.cookie).toHaveBeenCalledWith('access_token', 'mock-token', expect.any(Object));
            expect(mockRes.cookie).toHaveBeenCalledWith('refresh_token', 'mock-refresh-token', expect.any(Object));
            expect(statusMock).toHaveBeenCalledWith(200);
            expect(jsonMock).toHaveBeenCalledWith(expect.objectContaining({
                status: 'success',
                data: {
                    user: expect.objectContaining({
                        id: 'user-123',
                        email: 'test@example.com',
                        username: 'testuser',
                        role: 'STUDENT',
                    }),
                },
            }));
        });
    });
});
