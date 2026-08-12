"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const AuthService_1 = require("../../src/services/AuthService");
const AuditService_1 = require("../../src/services/AuditService");
const bcryptjs_1 = __importDefault(require("bcryptjs"));
const jsonwebtoken_1 = __importDefault(require("jsonwebtoken"));
// Mock dependencies
jest.mock('bcryptjs');
jest.mock('jsonwebtoken');
jest.mock('../../src/services/CacheService', () => ({
    cacheService: {
        get: jest.fn(),
        set: jest.fn(),
        delete: jest.fn(),
        deletePattern: jest.fn(),
        userKey: (userId) => `user:${userId}`,
        userProgressKey: (userId, courseId) => `progress:${userId}:${courseId}`,
        courseKey: (courseId) => `course:${courseId}`,
        topicMasteryKey: (userId) => `topic-performance:mastery:${userId}`,
        topicWeakKey: (userId) => `topic-performance:weak:${userId}`,
        topicReviewKey: (userId) => `topic-performance:review:${userId}`,
        recommendationStudyKey: (userId) => `recommendation:study:${userId}`,
        recommendationTestKey: (userId) => `recommendation:test:${userId}`,
        recommendationRoadmapKey: (userId) => `recommendation:roadmap:${userId}`,
        recommendationSpacedKey: (userId) => `recommendation:spaced:${userId}`,
    },
}));
const mockPrisma = {
    user: {
        findUnique: jest.fn(),
        findFirst: jest.fn(),
        create: jest.fn(),
        update: jest.fn(),
    },
    refreshToken: {
        findUnique: jest.fn(),
        create: jest.fn(),
        update: jest.fn(),
        updateMany: jest.fn(),
        deleteMany: jest.fn(),
        findMany: jest.fn(),
    },
    userSession: {
        create: jest.fn(),
        findMany: jest.fn(),
        update: jest.fn(),
        updateMany: jest.fn(),
    },
    auditLog: {
        create: jest.fn(),
    },
    $transaction: jest.fn(),
};
describe('AuthService', () => {
    let authService;
    let auditService;
    beforeEach(() => {
        jest.clearAllMocks();
        auditService = new AuditService_1.AuditService(mockPrisma);
        authService = new AuthService_1.AuthService(mockPrisma, auditService);
    });
    describe('register', () => {
        const validInput = {
            email: 'test@example.com',
            password: 'SecurePass123!',
            username: 'testuser',
        };
        it('should register a new user successfully', async () => {
            const mockUser = {
                id: 'user-1',
                email: validInput.email,
                username: validInput.username,
                password: 'hashed_password',
                role: 'STUDENT',
                createdAt: new Date(),
                updatedAt: new Date(),
            };
            mockPrisma.user.findUnique.mockResolvedValue(null);
            mockPrisma.user.findFirst.mockResolvedValue(null);
            bcryptjs_1.default.hash.mockResolvedValue('hashed_password');
            mockPrisma.user.create.mockResolvedValue(mockUser);
            mockPrisma.auditLog.create.mockResolvedValue({});
            mockPrisma.refreshToken.create.mockResolvedValue({});
            mockPrisma.refreshToken.findMany.mockResolvedValue([]);
            mockPrisma.userSession.create.mockResolvedValue({});
            mockPrisma.userSession.findMany.mockResolvedValue([]);
            jsonwebtoken_1.default.sign.mockReturnValue('mock_access_token');
            const result = await authService.register(validInput, '127.0.0.1');
            expect(result.user.email).toBe(validInput.email);
            expect(result.tokens.accessToken).toBe('mock_access_token');
            expect(mockPrisma.user.create).toHaveBeenCalled();
            expect(mockPrisma.auditLog.create).toHaveBeenCalledWith(expect.objectContaining({
                data: expect.objectContaining({
                    action: 'CREATE',
                    description: 'User registered',
                }),
            }));
        });
        it('should reject invalid email format', async () => {
            const invalidInput = { ...validInput, email: 'invalid-email' };
            await expect(authService.register(invalidInput)).rejects.toThrow('Invalid email format');
        });
        it('should reject weak password', async () => {
            const weakPasswordInput = { ...validInput, password: '123' };
            await expect(authService.register(weakPasswordInput)).rejects.toThrow('Password validation failed');
        });
        it('should reject duplicate email', async () => {
            ;
            mockPrisma.user.findUnique.mockResolvedValue({ id: 'existing-user' });
            await expect(authService.register(validInput)).rejects.toThrow('Registration failed: Invalid request');
        });
        it('should reject duplicate username', async () => {
            ;
            mockPrisma.user.findUnique.mockResolvedValue(null) // email check
            ;
            mockPrisma.user.findFirst.mockResolvedValue({ id: 'existing-user' }); // username check
            await expect(authService.register(validInput)).rejects.toThrow('Registration failed: Invalid request');
        });
    });
    describe('login', () => {
        const loginInput = {
            email: 'test@example.com',
            password: 'SecurePass123!',
            ipAddress: '127.0.0.1',
            userAgent: 'Mozilla/5.0',
        };
        const mockUser = {
            id: 'user-1',
            email: loginInput.email,
            password: 'hashed_password',
            role: 'STUDENT',
            lockedUntil: null,
            failedLoginAttempts: 0,
            createdAt: new Date(),
            updatedAt: new Date(),
        };
        it('should login successfully with valid credentials', async () => {
            ;
            mockPrisma.user.findUnique.mockResolvedValue(mockUser);
            bcryptjs_1.default.compare.mockResolvedValue(true);
            mockPrisma.user.update.mockResolvedValue(mockUser) // for incrementLoginCount
            ;
            mockPrisma.userSession.create.mockResolvedValue({});
            mockPrisma.userSession.findMany.mockResolvedValue([]);
            mockPrisma.auditLog.create.mockResolvedValue({});
            mockPrisma.refreshToken.create.mockResolvedValue({});
            mockPrisma.refreshToken.findMany.mockResolvedValue([]);
            jsonwebtoken_1.default.sign.mockReturnValue('mock_access_token');
            const result = await authService.login(loginInput);
            expect(result.user).toBeDefined();
            expect(result.user.email).toBe(loginInput.email);
            expect(result.tokens.accessToken).toBe('mock_access_token');
            expect(mockPrisma.auditLog.create).toHaveBeenCalledWith(expect.objectContaining({
                data: expect.objectContaining({
                    action: 'LOGIN',
                    description: 'User logged in successfully',
                }),
            }));
        });
        it('should reject login with invalid email', async () => {
            ;
            mockPrisma.user.findUnique.mockResolvedValue(null);
            await expect(authService.login(loginInput)).rejects.toThrow('Invalid credentials');
        });
        it('should reject login with invalid password', async () => {
            ;
            mockPrisma.user.findUnique.mockResolvedValue(mockUser);
            bcryptjs_1.default.compare.mockResolvedValue(false);
            mockPrisma.user.update.mockResolvedValue(mockUser);
            mockPrisma.auditLog.create.mockResolvedValue({});
            await expect(authService.login(loginInput)).rejects.toThrow('Invalid credentials');
            expect(mockPrisma.auditLog.create).toHaveBeenCalledWith(expect.objectContaining({
                data: expect.objectContaining({
                    action: 'LOGIN',
                    description: 'Failed login attempt',
                    severity: 'WARNING',
                }),
            }));
        });
        it('should reject login for locked account', async () => {
            const lockedUser = {
                ...mockUser,
                lockedUntil: new Date(Date.now() + 3600000), // 1 hour from now
            };
            mockPrisma.user.findUnique.mockResolvedValue(lockedUser);
            await expect(authService.login(loginInput)).rejects.toThrow('Account locked');
        });
        it('should allow login after lock period expires', async () => {
            const unlockedUser = {
                ...mockUser,
                lockedUntil: new Date(Date.now() - 3600000), // 1 hour ago
            };
            mockPrisma.user.findUnique.mockResolvedValue(unlockedUser);
            bcryptjs_1.default.compare.mockResolvedValue(true);
            mockPrisma.user.update.mockResolvedValue(unlockedUser);
            mockPrisma.userSession.create.mockResolvedValue({});
            mockPrisma.userSession.findMany.mockResolvedValue([]);
            mockPrisma.auditLog.create.mockResolvedValue({});
            mockPrisma.refreshToken.create.mockResolvedValue({});
            mockPrisma.refreshToken.findMany.mockResolvedValue([]);
            jsonwebtoken_1.default.sign.mockReturnValue('mock_access_token');
            const result = await authService.login(loginInput);
            expect(result.user.email).toBe(loginInput.email);
        });
    });
    describe('refreshToken', () => {
        const mockRefreshToken = 'valid_refresh_token';
        const mockUser = {
            id: 'user-1',
            email: 'test@example.com',
            password: 'hashed_password',
            role: 'STUDENT',
            createdAt: new Date(),
            updatedAt: new Date(),
        };
        it('should refresh token successfully', async () => {
            const mockStoredToken = {
                id: 'token-1',
                token: mockRefreshToken,
                userId: mockUser.id,
                expiresAt: new Date(Date.now() + 86400000), // 1 day from now
                revokedAt: null,
                usedAt: null,
            };
            jsonwebtoken_1.default.verify.mockReturnValue({
                userId: mockUser.id,
                email: mockUser.email,
                role: mockUser.role,
            });
            mockPrisma.refreshToken.findUnique.mockResolvedValue(mockStoredToken);
            mockPrisma.user.findUnique.mockResolvedValue(mockUser);
            mockPrisma.refreshToken.create.mockResolvedValue({});
            mockPrisma.refreshToken.findMany.mockResolvedValue([]);
            mockPrisma.$transaction.mockImplementation(async (cb) => {
                const tx = {
                    refreshToken: {
                        updateMany: jest.fn().mockResolvedValue({ count: 1 }),
                    },
                };
                return cb(tx);
            });
            jsonwebtoken_1.default.sign.mockReturnValue('new_access_token');
            const result = await authService.refreshToken(mockRefreshToken);
            expect(result.accessToken).toBe('new_access_token');
            expect(mockPrisma.$transaction).toHaveBeenCalled();
        });
        it('should reject expired refresh token', async () => {
            const mockStoredToken = {
                id: 'token-1',
                token: mockRefreshToken,
                userId: mockUser.id,
                expiresAt: new Date(Date.now() - 86400000), // 1 day ago
                revokedAt: null,
                usedAt: null,
            };
            jsonwebtoken_1.default.verify.mockReturnValue({
                userId: mockUser.id,
                email: mockUser.email,
                role: mockUser.role,
            });
            mockPrisma.refreshToken.findUnique.mockResolvedValue(mockStoredToken);
            await expect(authService.refreshToken(mockRefreshToken)).rejects.toThrow('Invalid refresh token');
        });
        it('should reject revoked refresh token', async () => {
            const mockStoredToken = {
                id: 'token-1',
                token: mockRefreshToken,
                userId: mockUser.id,
                expiresAt: new Date(Date.now() + 86400000),
                revokedAt: new Date(), // revoked
                usedAt: null,
            };
            jsonwebtoken_1.default.verify.mockReturnValue({
                userId: mockUser.id,
                email: mockUser.email,
                role: mockUser.role,
            });
            mockPrisma.refreshToken.findUnique.mockResolvedValue(mockStoredToken);
            await expect(authService.refreshToken(mockRefreshToken)).rejects.toThrow('Invalid refresh token');
        });
        it('should reject token not in database', async () => {
            ;
            jsonwebtoken_1.default.verify.mockReturnValue({
                userId: mockUser.id,
                email: mockUser.email,
                role: mockUser.role,
            });
            mockPrisma.refreshToken.findUnique.mockResolvedValue(null);
            await expect(authService.refreshToken(mockRefreshToken)).rejects.toThrow('Invalid refresh token');
        });
    });
    describe('logout', () => {
        const userId = 'user-1';
        const refreshToken = 'valid_refresh_token';
        it('should logout successfully', async () => {
            ;
            mockPrisma.refreshToken.updateMany.mockResolvedValue({ count: 1 });
            mockPrisma.auditLog.create.mockResolvedValue({});
            await authService.logout(userId, refreshToken, '127.0.0.1');
            const crypto = require('crypto');
            const tokenHash = crypto.createHash('sha256').update(refreshToken).digest('hex');
            expect(mockPrisma.refreshToken.updateMany).toHaveBeenCalledWith(expect.objectContaining({
                where: { token: tokenHash, userId },
                data: { revokedAt: expect.any(Date) },
            }));
            expect(mockPrisma.auditLog.create).toHaveBeenCalledWith(expect.objectContaining({
                data: expect.objectContaining({
                    action: 'LOGOUT',
                    description: 'User logged out',
                }),
            }));
        });
        it('should logout without refresh token', async () => {
            ;
            mockPrisma.auditLog.create.mockResolvedValue({});
            await authService.logout(userId, undefined, '127.0.0.1');
            expect(mockPrisma.refreshToken.updateMany).not.toHaveBeenCalled();
            expect(mockPrisma.auditLog.create).toHaveBeenCalled();
        });
    });
    describe('logoutAllDevices', () => {
        const userId = 'user-1';
        it('should logout from all devices successfully', async () => {
            ;
            mockPrisma.refreshToken.updateMany.mockResolvedValue({ count: 3 });
            mockPrisma.userSession.updateMany.mockResolvedValue({ count: 2 });
            mockPrisma.auditLog.create.mockResolvedValue({});
            await authService.logoutAllDevices(userId, '127.0.0.1');
            expect(mockPrisma.refreshToken.updateMany).toHaveBeenCalledWith(expect.objectContaining({
                where: { userId, revokedAt: null },
                data: { revokedAt: expect.any(Date) },
            }));
            expect(mockPrisma.userSession.updateMany).toHaveBeenCalledWith(expect.objectContaining({
                where: { userId, isRevoked: false },
                data: { isRevoked: true, revokedAt: expect.any(Date) },
            }));
            expect(mockPrisma.auditLog.create).toHaveBeenCalledWith(expect.objectContaining({
                data: expect.objectContaining({
                    action: 'LOGOUT',
                    description: 'User logged out from all devices',
                    severity: 'INFO',
                }),
            }));
        });
    });
    describe('changePassword', () => {
        const userId = 'user-1';
        const currentPassword = 'OldPass123!';
        const newPassword = 'NewPass456!';
        const mockUser = {
            id: userId,
            email: 'test@example.com',
            password: 'hashed_old_password',
            role: 'STUDENT',
            createdAt: new Date(),
            updatedAt: new Date(),
        };
        it('should change password successfully', async () => {
            ;
            mockPrisma.user.findUnique.mockResolvedValue(mockUser);
            bcryptjs_1.default.compare.mockResolvedValue(true);
            bcryptjs_1.default.hash.mockResolvedValue('hashed_new_password');
            mockPrisma.user.update.mockResolvedValue(mockUser);
            mockPrisma.refreshToken.updateMany.mockResolvedValue({ count: 2 });
            mockPrisma.userSession.updateMany.mockResolvedValue({ count: 1 });
            mockPrisma.auditLog.create.mockResolvedValue({});
            await authService.changePassword(userId, currentPassword, newPassword, '127.0.0.1');
            expect(mockPrisma.user.update).toHaveBeenCalledWith(expect.objectContaining({
                where: { id: userId },
                data: expect.objectContaining({
                    password: 'hashed_new_password',
                }),
            }));
            expect(mockPrisma.auditLog.create).toHaveBeenCalledWith(expect.objectContaining({
                data: expect.objectContaining({
                    action: 'PASSWORD_CHANGE',
                    description: 'Password changed',
                }),
            }));
        });
        it('should reject incorrect current password', async () => {
            ;
            mockPrisma.user.findUnique.mockResolvedValue(mockUser);
            bcryptjs_1.default.compare.mockResolvedValue(false);
            await expect(authService.changePassword(userId, currentPassword, newPassword)).rejects.toThrow('Current password is incorrect');
        });
        it('should reject weak new password', async () => {
            ;
            mockPrisma.user.findUnique.mockResolvedValue(mockUser);
            bcryptjs_1.default.compare.mockResolvedValue(true);
            await expect(authService.changePassword(userId, currentPassword, '123')).rejects.toThrow('Password validation failed');
        });
        it('should reject for non-existent user', async () => {
            ;
            mockPrisma.user.findUnique.mockResolvedValue(null);
            await expect(authService.changePassword(userId, currentPassword, newPassword)).rejects.toThrow('User not found');
        });
    });
    describe('verifyAccessToken', () => {
        it('should verify valid token', () => {
            const mockPayload = {
                userId: 'user-1',
                email: 'test@example.com',
                role: 'STUDENT',
            };
            jsonwebtoken_1.default.verify.mockReturnValue(mockPayload);
            const result = authService.verifyAccessToken('valid_token');
            expect(result).toEqual(mockPayload);
        });
        it('should reject expired token', () => {
            ;
            jsonwebtoken_1.default.verify.mockImplementation(() => {
                throw new jsonwebtoken_1.default.TokenExpiredError('Token expired', new Date());
            });
            expect(() => authService.verifyAccessToken('expired_token')).toThrow('Token expired');
        });
        it('should reject invalid token', () => {
            ;
            jsonwebtoken_1.default.verify.mockImplementation(() => {
                throw new Error('Invalid token');
            });
            expect(() => authService.verifyAccessToken('invalid_token')).toThrow('Invalid token');
        });
    });
    describe('getUserById', () => {
        const userId = 'user-1';
        const mockUser = {
            id: userId,
            email: 'test@example.com',
            username: 'testuser',
            password: 'hashed_password',
            mfaSecret: 'secret',
            role: 'STUDENT',
            createdAt: new Date(),
            updatedAt: new Date(),
        };
        it('should return user from database', async () => {
            ;
            mockPrisma.user.findUnique.mockResolvedValue(mockUser);
            const result = await authService.getUserById(userId);
            expect(result).toBeDefined();
            expect(result?.email).toBe(mockUser.email);
            expect(result).not.toHaveProperty('password');
            expect(result).not.toHaveProperty('mfaSecret');
        });
        it('should return null for non-existent user', async () => {
            ;
            mockPrisma.user.findUnique.mockResolvedValue(null);
            const result = await authService.getUserById('non-existent');
            expect(result).toBeNull();
        });
    });
});
