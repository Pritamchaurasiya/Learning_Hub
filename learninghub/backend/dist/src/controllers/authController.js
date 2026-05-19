"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.resetPassword = exports.forgotPassword = exports.verifyEmail = exports.sendVerificationEmail = exports.deleteAccount = exports.uploadAvatar = exports.changePassword = exports.updateProfile = exports.me = exports.refresh = exports.login = exports.register = void 0;
const bcryptjs_1 = __importDefault(require("bcryptjs"));
const crypto_1 = __importDefault(require("crypto"));
const prismaClient_1 = require("../prismaClient");
const auth_1 = require("../utils/auth");
const logger_1 = __importDefault(require("../utils/logger"));
const QueryOptimizationService_1 = require("../services/QueryOptimizationService");
const EmailService_1 = require("../services/EmailService");
const register = async (req, res) => {
    try {
        const { email, password, username } = req.body;
        const normalizedEmail = typeof email === 'string' ? email.trim().toLowerCase() : '';
        if (!normalizedEmail || !password) {
            res.status(400).json({ status: 'error', message: 'Email and password are required' });
            return;
        }
        const existingUser = await prismaClient_1.prisma.user.findUnique({ where: { email: normalizedEmail } });
        if (existingUser) {
            res.status(409).json({ status: 'error', message: 'Email already exists' });
            return;
        }
        const hashedPassword = await bcryptjs_1.default.hash(password, 12);
        const user = await prismaClient_1.prisma.user.create({
            data: {
                email: normalizedEmail,
                username,
                password: hashedPassword,
                role: 'STUDENT',
            },
        });
        const token = (0, auth_1.generateToken)(user.id, user.email, user.role);
        const refreshToken = (0, auth_1.generateRefreshToken)(user.id, user.email, user.role);
        res.status(201).json({
            status: 'success',
            message: 'Registration successful',
            data: {
                access_token: token,
                refresh_token: refreshToken,
                user: {
                    id: user.id,
                    email: user.email,
                    username: user.username,
                    role: user.role,
                    xp: user.xp,
                    level: user.level,
                    streak: user.streak,
                },
            },
        });
    }
    catch (error) {
        logger_1.default.error('Register error', error instanceof Error ? error : new Error(String(error)), {
            email: req.body.email,
            ip: req.ip,
        });
        res.status(500).json({ status: 'error', message: 'Internal server error' });
    }
};
exports.register = register;
const login = async (req, res) => {
    try {
        const { email, password } = req.body;
        const normalizedEmail = typeof email === 'string' ? email.trim().toLowerCase() : '';
        const user = await prismaClient_1.prisma.user.findUnique({ where: { email: normalizedEmail } });
        if (!user) {
            res.status(401).json({ status: 'error', message: 'Invalid email or password' });
            return;
        }
        // SECURITY: Always verify password - no bypass allowed in any environment
        const isValidPassword = await bcryptjs_1.default.compare(password, user.password);
        // SECURITY: Never log password validity — only log email (no auth result leakage)
        logger_1.default.info('Login attempt', { email: normalizedEmail });
        if (!isValidPassword) {
            res.status(401).json({ status: 'error', message: 'Invalid email or password' });
            return;
        }
        // Update lastActive to power admin dashboard '24h active users' metric
        await prismaClient_1.prisma.user.update({ where: { id: user.id }, data: { lastActive: new Date() } });
        const token = (0, auth_1.generateToken)(user.id, user.email, user.role);
        const refreshToken = (0, auth_1.generateRefreshToken)(user.id, user.email, user.role);
        res.status(200).json({
            status: 'success',
            message: 'Login successful',
            data: {
                access_token: token,
                refresh_token: refreshToken,
                user: {
                    id: user.id,
                    email: user.email,
                    username: user.username,
                    role: user.role,
                    xp: user.xp,
                    level: user.level,
                    streak: user.streak,
                    lastActive: user.lastActive,
                },
            },
        });
    }
    catch (error) {
        logger_1.default.error('Login error', error instanceof Error ? error : new Error(String(error)), {
            email: req.body.email,
            ip: req.ip,
        });
        res.status(500).json({ status: 'error', message: 'Internal server error' });
    }
};
exports.login = login;
const refresh = async (req, res) => {
    try {
        const refreshToken = req.body.refresh_token ?? req.body.refresh;
        if (!refreshToken) {
            res.status(400).json({ status: 'error', message: 'Refresh token is required' });
            return;
        }
        const decoded = (0, auth_1.verifyRefreshToken)(refreshToken);
        if (!decoded?.userId) {
            res.status(401).json({ status: 'error', message: 'Invalid refresh token' });
            return;
        }
        const storedToken = await prismaClient_1.prisma.refreshToken.findUnique({
            where: { token: refreshToken },
        });
        if (!storedToken ||
            storedToken.revokedAt ||
            storedToken.usedAt ||
            storedToken.expiresAt < new Date()) {
            if (storedToken) {
                await prismaClient_1.prisma.refreshToken.update({
                    where: { id: storedToken.id },
                    data: { revokedAt: new Date() },
                });
            }
            res.status(401).json({ status: 'error', message: 'Invalid or expired refresh token' });
            return;
        }
        const user = await prismaClient_1.prisma.user.findUnique({ where: { id: decoded.userId } });
        if (!user || user.deletedAt) {
            res.status(401).json({ status: 'error', message: 'User no longer exists' });
            return;
        }
        await prismaClient_1.prisma.refreshToken.update({
            where: { id: storedToken.id },
            data: { usedAt: new Date() },
        });
        const access_token = (0, auth_1.generateToken)(user.id, user.email, user.role);
        const new_refresh_token = (0, auth_1.generateRefreshToken)(user.id, user.email, user.role);
        await prismaClient_1.prisma.refreshToken.create({
            data: {
                userId: user.id,
                token: new_refresh_token,
                expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
            },
        });
        res.json({
            status: 'success',
            data: {
                access_token,
                refresh_token: new_refresh_token,
            },
        });
    }
    catch (error) {
        logger_1.default.error('Token refresh error', error instanceof Error ? error : new Error(String(error)));
        res.status(401).json({ status: 'error', message: 'Invalid or expired refresh token' });
    }
};
exports.refresh = refresh;
const me = async (req, res) => {
    try {
        const userId = req.user?.userId;
        if (!userId) {
            res.status(401).json({ status: 'error', message: 'Authentication required' });
            return;
        }
        const [user, performance, bookmarks, achievements] = await Promise.all([
            prismaClient_1.prisma.user.findUnique({ where: { id: userId } }),
            QueryOptimizationService_1.queryOptimizationService.getUserPerformanceSummary(userId),
            prismaClient_1.prisma.bookmark.findMany({ where: { userId }, take: 10, orderBy: { createdAt: 'desc' } }),
            prismaClient_1.prisma.userAchievement.findMany({
                where: { userId },
                take: 20,
                orderBy: { unlockedAt: 'desc' },
            }),
        ]);
        if (!user) {
            res.status(404).json({ status: 'error', message: 'User not found' });
            return;
        }
        await prismaClient_1.prisma.user.update({ where: { id: userId }, data: { lastActive: new Date() } });
        res.json({
            status: 'success',
            data: {
                user: {
                    id: user.id,
                    email: user.email,
                    username: user.username,
                    role: user.role,
                    xp: user.xp,
                    level: user.level,
                    streak: user.streak,
                    lastActive: user.lastActive,
                },
                performance: performance.test_stats,
                recent_tests: performance.recent_tests,
                bookmarks,
                achievements,
            },
        });
    }
    catch (error) {
        logger_1.default.error('Get user profile error', error instanceof Error ? error : new Error(String(error)), { userId: req.user?.userId });
        res.status(500).json({ status: 'error', message: 'Internal server error' });
    }
};
exports.me = me;
const updateProfile = async (req, res) => {
    try {
        const userId = req.user?.userId;
        if (!userId) {
            res.status(401).json({ status: 'error', message: 'Authentication required' });
            return;
        }
        const { username, email, bio, location, website } = req.body;
        // Check if email is already taken by another user
        const normalizedEmail = typeof email === 'string' ? email.trim().toLowerCase() : undefined;
        if (normalizedEmail) {
            const existingUser = await prismaClient_1.prisma.user.findFirst({
                where: { email: normalizedEmail, NOT: { id: userId } },
            });
            if (existingUser) {
                res.status(409).json({ status: 'error', message: 'Email is already in use' });
                return;
            }
        }
        const updatedUser = await prismaClient_1.prisma.user.update({
            where: { id: userId },
            data: {
                ...(username && { username }),
                ...(normalizedEmail && {
                    email: normalizedEmail,
                    emailVerified: false, // Require re-verification when email changes
                }),
                ...(bio !== undefined && { bio }),
                ...(location !== undefined && { location }),
                ...(website !== undefined && { website }),
                updatedAt: new Date(),
            },
            select: {
                id: true,
                email: true,
                username: true,
                avatar: true,
                bio: true,
                location: true,
                website: true,
                role: true,
                xp: true,
                level: true,
                streak: true,
                lastActive: true,
            },
        });
        res.json({
            status: 'success',
            message: 'Profile updated successfully',
            data: { user: updatedUser },
        });
    }
    catch (error) {
        logger_1.default.error('Update profile error', error instanceof Error ? error : new Error(String(error)), {
            userId: req.user?.userId,
            email: req.body.email,
        });
        res.status(500).json({ status: 'error', message: 'Internal server error' });
    }
};
exports.updateProfile = updateProfile;
const changePassword = async (req, res) => {
    try {
        const userId = req.user?.userId;
        if (!userId) {
            res.status(401).json({ status: 'error', message: 'Authentication required' });
            return;
        }
        const { currentPassword, newPassword } = req.body;
        if (!currentPassword || !newPassword) {
            res
                .status(400)
                .json({ status: 'error', message: 'Current password and new password are required' });
            return;
        }
        // Validate new password complexity
        if (newPassword.length < 8 ||
            !/[A-Z]/.test(newPassword) ||
            !/[a-z]/.test(newPassword) ||
            !/[0-9]/.test(newPassword) ||
            !/[^A-Za-z0-9]/.test(newPassword)) {
            res.status(400).json({
                status: 'error',
                message: 'Password must be at least 8 characters with uppercase, lowercase, number, and special character',
            });
            return;
        }
        const user = await prismaClient_1.prisma.user.findUnique({ where: { id: userId } });
        if (!user) {
            res.status(404).json({ status: 'error', message: 'User not found' });
            return;
        }
        const isValidPassword = await bcryptjs_1.default.compare(currentPassword, user.password);
        if (!isValidPassword) {
            res.status(401).json({ status: 'error', message: 'Current password is incorrect' });
            return;
        }
        const hashedPassword = await bcryptjs_1.default.hash(newPassword, 12);
        await prismaClient_1.prisma.user.update({
            where: { id: userId },
            data: { password: hashedPassword },
        });
        res.json({
            status: 'success',
            message: 'Password changed successfully',
        });
    }
    catch (error) {
        logger_1.default.error('Change password error', error instanceof Error ? error : new Error(String(error)), {
            userId: req.user?.userId,
        });
        res.status(500).json({ status: 'error', message: 'Internal server error' });
    }
};
exports.changePassword = changePassword;
const uploadAvatar = async (req, res) => {
    try {
        const userId = req.user?.userId;
        if (!userId) {
            res.status(401).json({ status: 'error', message: 'Authentication required' });
            return;
        }
        // Support both multipart (req.file) and base64 (req.body.avatar)
        let avatarPath;
        if (req.file) {
            // Multer uploaded file
            avatarPath = `/avatars/${req.file.filename}`;
        }
        else if (req.body.avatar && typeof req.body.avatar === 'string') {
            const avatar = req.body.avatar.trim();
            const isDataUrl = avatar.startsWith('data:image/');
            const isHttpsUrl = avatar.startsWith('https://');
            if ((!isDataUrl && !isHttpsUrl) || avatar.length > 2_000_000) {
                res.status(400).json({ status: 'error', message: 'Invalid avatar format' });
                return;
            }
            avatarPath = avatar;
        }
        else {
            res.status(400).json({ status: 'error', message: 'No avatar provided' });
            return;
        }
        const updatedUser = await prismaClient_1.prisma.user.update({
            where: { id: userId },
            data: { avatar: avatarPath },
            select: {
                id: true,
                email: true,
                username: true,
                avatar: true,
            },
        });
        res.json({
            status: 'success',
            message: 'Avatar uploaded successfully',
            data: { user: updatedUser },
        });
    }
    catch (error) {
        logger_1.default.error('Upload avatar error', error instanceof Error ? error : new Error(String(error)), {
            userId: req.user?.userId,
        });
        res.status(500).json({ status: 'error', message: 'Internal server error' });
    }
};
exports.uploadAvatar = uploadAvatar;
/**
 * Delete user account (soft delete)
 */
const deleteAccount = async (req, res) => {
    try {
        const userId = req.user?.userId;
        if (!userId) {
            res.status(401).json({ status: 'error', message: 'Authentication required' });
            return;
        }
        await prismaClient_1.prisma.user.update({
            where: { id: userId },
            data: {
                deletedAt: new Date(),
                email: `deleted_${userId}@deleted.local`,
                username: null,
            },
        });
        await prismaClient_1.prisma.refreshToken.deleteMany({
            where: { userId },
        });
        await prismaClient_1.prisma.userSession.updateMany({
            where: { userId },
            data: { isRevoked: true, revokedAt: new Date(), revokedReason: 'account_deleted' },
        });
        logger_1.default.audit('ACCOUNT_DELETION', userId, { reason: 'user_requested' });
        res.status(200).json({
            status: 'success',
            message: 'Account deleted successfully',
        });
    }
    catch (error) {
        logger_1.default.error('Delete account error', error instanceof Error ? error : new Error(String(error)), { userId: req.user?.userId });
        res.status(500).json({ status: 'error', message: 'Internal server error' });
    }
};
exports.deleteAccount = deleteAccount;
const sendVerificationEmail = async (req, res) => {
    try {
        const userId = req.user?.userId;
        if (!userId) {
            res.status(401).json({ status: 'error', message: 'Authentication required' });
            return;
        }
        const user = await prismaClient_1.prisma.user.findUnique({ where: { id: userId } });
        if (!user) {
            res.status(404).json({ status: 'error', message: 'User not found' });
            return;
        }
        if (user.emailVerified) {
            res.status(400).json({ status: 'error', message: 'Email already verified' });
            return;
        }
        const token = crypto_1.default.randomBytes(32).toString('hex');
        const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000); // 24 hours
        await prismaClient_1.prisma.verificationToken.upsert({
            where: { userId },
            update: { token, expiresAt },
            create: {
                userId,
                token,
                expiresAt,
            },
        });
        await EmailService_1.emailService.sendVerificationEmail(user.email, token, user.username || undefined);
        res.json({
            status: 'success',
            message: 'Verification email sent',
        });
    }
    catch (error) {
        logger_1.default.error('Send verification email error', error instanceof Error ? error : new Error(String(error)), { userId: req.user?.userId });
        res.status(500).json({ status: 'error', message: 'Internal server error' });
    }
};
exports.sendVerificationEmail = sendVerificationEmail;
const verifyEmail = async (req, res) => {
    try {
        const token = req.params.token;
        const verificationToken = await prismaClient_1.prisma.verificationToken.findUnique({
            where: { token },
        });
        if (!verificationToken || verificationToken.expiresAt < new Date()) {
            res.status(400).json({ status: 'error', message: 'Invalid or expired verification token' });
            return;
        }
        await prismaClient_1.prisma.$transaction([
            prismaClient_1.prisma.user.update({
                where: { id: verificationToken.userId },
                data: {
                    emailVerified: true,
                    emailVerifiedAt: new Date(),
                },
            }),
            prismaClient_1.prisma.verificationToken.delete({
                where: { token },
            }),
        ]);
        res.json({
            status: 'success',
            message: 'Email verified successfully',
        });
    }
    catch (error) {
        logger_1.default.error('Verify email error', error instanceof Error ? error : new Error(String(error)), {
            token: req.params.token,
        });
        res.status(500).json({ status: 'error', message: 'Internal server error' });
    }
};
exports.verifyEmail = verifyEmail;
const forgotPassword = async (req, res) => {
    try {
        const { email } = req.body;
        const normalizedEmail = typeof email === 'string' ? email.trim().toLowerCase() : '';
        if (!normalizedEmail) {
            res.status(400).json({ status: 'error', message: 'Email is required' });
            return;
        }
        const user = await prismaClient_1.prisma.user.findUnique({ where: { email: normalizedEmail } });
        if (!user) {
            res.json({
                status: 'success',
                message: 'If an account exists with that email, a password reset link has been sent',
            });
            return;
        }
        const token = crypto_1.default.randomBytes(32).toString('hex');
        const expiresAt = new Date(Date.now() + 60 * 60 * 1000); // 1 hour
        await prismaClient_1.prisma.passwordResetToken.create({
            data: {
                userId: user.id,
                token,
                expiresAt,
            },
        });
        await EmailService_1.emailService.sendPasswordResetEmail(user.email, token, user.username || undefined);
        res.json({
            status: 'success',
            message: 'If an account exists with that email, a password reset link has been sent',
        });
    }
    catch (error) {
        logger_1.default.error('Forgot password error', error instanceof Error ? error : new Error(String(error)), { email: req.body.email });
        res.status(500).json({ status: 'error', message: 'Internal server error' });
    }
};
exports.forgotPassword = forgotPassword;
const resetPassword = async (req, res) => {
    try {
        const { token, newPassword } = req.body;
        if (!token || !newPassword) {
            res.status(400).json({ status: 'error', message: 'Token and new password are required' });
            return;
        }
        if (newPassword.length < 8 ||
            !/[A-Z]/.test(newPassword) ||
            !/[a-z]/.test(newPassword) ||
            !/[0-9]/.test(newPassword) ||
            !/[^A-Za-z0-9]/.test(newPassword)) {
            res.status(400).json({
                status: 'error',
                message: 'Password must be at least 8 characters with uppercase, lowercase, number, and special character',
            });
            return;
        }
        const resetToken = await prismaClient_1.prisma.passwordResetToken.findUnique({
            where: { token },
            include: { user: true },
        });
        if (!resetToken || resetToken.expiresAt < new Date() || resetToken.usedAt) {
            res.status(400).json({ status: 'error', message: 'Invalid or expired reset token' });
            return;
        }
        const hashedPassword = await bcryptjs_1.default.hash(newPassword, 12);
        await prismaClient_1.prisma.$transaction([
            prismaClient_1.prisma.user.update({
                where: { id: resetToken.userId },
                data: { password: hashedPassword },
            }),
            prismaClient_1.prisma.passwordResetToken.update({
                where: { id: resetToken.id },
                data: { usedAt: new Date() },
            }),
            prismaClient_1.prisma.refreshToken.deleteMany({
                where: { userId: resetToken.userId },
            }),
        ]);
        res.json({
            status: 'success',
            message: 'Password reset successfully',
        });
    }
    catch (error) {
        logger_1.default.error('Reset password error', error instanceof Error ? error : new Error(String(error)), { token: req.body.token });
        res.status(500).json({ status: 'error', message: 'Internal server error' });
    }
};
exports.resetPassword = resetPassword;
