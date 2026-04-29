"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.uploadAvatar = exports.changePassword = exports.updateProfile = exports.me = exports.refresh = exports.login = exports.register = void 0;
const bcryptjs_1 = __importDefault(require("bcryptjs"));
const prismaClient_1 = require("../prismaClient");
const auth_1 = require("../utils/auth");
const logger_1 = __importDefault(require("../utils/logger"));
const register = async (req, res) => {
    try {
        const { email, password, username } = req.body;
        if (!email || !password) {
            res.status(400).json({ status: 'error', message: 'Email and password are required' });
            return;
        }
        const existingUser = await prismaClient_1.prisma.user.findUnique({ where: { email } });
        if (existingUser) {
            res.status(409).json({ status: 'error', message: 'Email already exists' });
            return;
        }
        const hashedPassword = await bcryptjs_1.default.hash(password, 10);
        const user = await prismaClient_1.prisma.user.create({
            data: {
                email,
                username,
                password: hashedPassword,
                role: 'student'
            },
        });
        const token = (0, auth_1.generateToken)(user.id, user.role);
        const refreshToken = (0, auth_1.generateRefreshToken)(user.id, user.role);
        res.status(201).json({
            status: 'success',
            message: 'User created successfully',
            data: {
                token,
                refresh_token: refreshToken,
                user: {
                    id: user.id,
                    email: user.email,
                    username: user.username,
                    role: user.role,
                    xp: user.xp,
                    level: user.level,
                    streak: user.streak
                }
            }
        });
    }
    catch (error) {
        logger_1.default.error('Register error', error instanceof Error ? error : new Error(String(error)), {
            email: req.body.email,
            ip: req.ip
        });
        res.status(500).json({ status: 'error', message: 'Internal server error' });
    }
};
exports.register = register;
const login = async (req, res) => {
    try {
        const { email, password } = req.body;
        const user = await prismaClient_1.prisma.user.findUnique({ where: { email } });
        if (!user) {
            res.status(401).json({ status: 'error', message: 'Invalid email or password' });
            return;
        }
        const isValidPassword = await bcryptjs_1.default.compare(password, user.password);
        if (!isValidPassword) {
            res.status(401).json({ status: 'error', message: 'Invalid email or password' });
            return;
        }
        const token = (0, auth_1.generateToken)(user.id, user.role);
        const refreshToken = (0, auth_1.generateRefreshToken)(user.id, user.role);
        res.json({
            status: 'success',
            message: 'Login successful',
            data: {
                token,
                refresh_token: refreshToken,
                user: {
                    id: user.id,
                    email: user.email,
                    username: user.username,
                    role: user.role,
                    xp: user.xp,
                    level: user.level,
                    streak: user.streak,
                    lastActive: user.lastActive
                }
            }
        });
    }
    catch (error) {
        logger_1.default.error('Login error', error instanceof Error ? error : new Error(String(error)), {
            email: req.body.email,
            ip: req.ip
        });
        res.status(500).json({ status: 'error', message: 'Internal server error' });
    }
};
exports.login = login;
const refresh = async (req, res) => {
    try {
        // Support both refresh_token and refresh for backward compatibility
        const refreshToken = req.body.refresh_token || req.body.refresh;
        if (!refreshToken) {
            res.status(400).json({ status: 'error', message: 'Refresh token is required' });
            return;
        }
        const decoded = (0, auth_1.verifyRefreshToken)(refreshToken);
        if (!decoded || !decoded.userId) {
            res.status(401).json({ status: 'error', message: 'Invalid refresh token' });
            return;
        }
        const user = await prismaClient_1.prisma.user.findUnique({ where: { id: decoded.userId } });
        if (!user) {
            res.status(401).json({ status: 'error', message: 'User no longer exists' });
            return;
        }
        const access_token = (0, auth_1.generateToken)(user.id, user.role);
        const new_refresh_token = (0, auth_1.generateRefreshToken)(user.id, user.role);
        res.json({
            status: 'success',
            data: {
                access_token,
                refresh_token: new_refresh_token
            }
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
        const userId = req.user.userId;
        const user = await prismaClient_1.prisma.user.findUnique({
            where: { id: userId },
            include: {
                progress: true,
                bookmarks: true,
                achievements: true
            }
        });
        if (!user) {
            res.status(404).json({ status: 'error', message: 'User not found' });
            return;
        }
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
                    lastActive: user.lastActive
                },
                progress: user.progress,
                bookmarks: user.bookmarks,
                achievements: user.achievements
            }
        });
    }
    catch (error) {
        logger_1.default.error('Get user profile error', error instanceof Error ? error : new Error(String(error)), {
            userId: req.user?.userId
        });
        res.status(500).json({ status: 'error', message: 'Internal server error' });
    }
};
exports.me = me;
const updateProfile = async (req, res) => {
    try {
        const userId = req.user.userId;
        const { username, email, bio, location, website } = req.body;
        // Check if email is already taken by another user
        if (email) {
            const existingUser = await prismaClient_1.prisma.user.findFirst({
                where: { email, NOT: { id: userId } }
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
                ...(email && { email }),
                ...(bio !== undefined && { bio }),
                ...(location !== undefined && { location }),
                ...(website !== undefined && { website }),
                updatedAt: new Date()
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
                lastActive: true
            }
        });
        res.json({
            status: 'success',
            message: 'Profile updated successfully',
            data: { user: updatedUser }
        });
    }
    catch (error) {
        logger_1.default.error('Update profile error', error instanceof Error ? error : new Error(String(error)), {
            userId: req.user?.userId,
            email: req.body.email
        });
        res.status(500).json({ status: 'error', message: 'Internal server error' });
    }
};
exports.updateProfile = updateProfile;
const changePassword = async (req, res) => {
    try {
        const userId = req.user.userId;
        const { currentPassword, newPassword } = req.body;
        if (!currentPassword || !newPassword) {
            res.status(400).json({ status: 'error', message: 'Current password and new password are required' });
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
                message: 'Password must be at least 8 characters with uppercase, lowercase, number, and special character'
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
            data: { password: hashedPassword }
        });
        res.json({
            status: 'success',
            message: 'Password changed successfully'
        });
    }
    catch (error) {
        logger_1.default.error('Change password error', error instanceof Error ? error : new Error(String(error)), {
            userId: req.user?.userId
        });
        res.status(500).json({ status: 'error', message: 'Internal server error' });
    }
};
exports.changePassword = changePassword;
const uploadAvatar = async (req, res) => {
    try {
        const userId = req.user.userId;
        // Support both multipart (req.file) and base64 (req.body.avatar)
        let avatarPath;
        if (req.file) {
            // Multer uploaded file
            avatarPath = `/avatars/${req.file.filename}`;
        }
        else if (req.body.avatar) {
            // Base64 data URL - for demo store as-is
            avatarPath = req.body.avatar;
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
                avatar: true
            }
        });
        res.json({
            status: 'success',
            message: 'Avatar uploaded successfully',
            data: { user: updatedUser }
        });
    }
    catch (error) {
        console.error('Upload avatar error:', error);
        res.status(500).json({ status: 'error', message: 'Internal server error' });
    }
};
exports.uploadAvatar = uploadAvatar;
