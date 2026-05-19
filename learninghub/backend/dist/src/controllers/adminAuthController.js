"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.adminRegister = exports.adminLogin = void 0;
const bcryptjs_1 = __importDefault(require("bcryptjs"));
const prismaClient_1 = require("../prismaClient");
const logger_1 = __importDefault(require("../utils/logger"));
const auth_1 = require("../utils/auth");
const errors_1 = require("../utils/errors");
/**
 * Admin Authentication Controller
 * Handles admin-specific auth flows
 * Base route: /admin/auth
 */
const adminLogin = async (req, res) => {
    try {
        const { email, password } = req.body;
        if (!email || !password) {
            throw new errors_1.ValidationError('Email and password are required');
        }
        const normalizedEmail = email.toLowerCase().trim();
        const user = await prismaClient_1.prisma.user.findUnique({
            where: { email: normalizedEmail },
            select: {
                id: true,
                email: true,
                password: true,
                role: true,
                username: true,
                failedLogins: true,
                lockedUntil: true,
            },
        });
        if (!user || (user.role !== 'ADMIN' && user.role !== 'SUPERADMIN')) {
            logger_1.default.warn('Admin login attempt with invalid credentials', { email: normalizedEmail });
            throw new errors_1.AuthenticationError('Invalid admin credentials');
        }
        if (user.lockedUntil && user.lockedUntil > new Date()) {
            const remainingMinutes = Math.ceil((user.lockedUntil.getTime() - Date.now()) / 60000);
            throw new errors_1.AuthenticationError(`Account locked. Try again in ${remainingMinutes} minutes`);
        }
        const isPasswordValid = await bcryptjs_1.default.compare(password, user.password);
        if (!isPasswordValid) {
            const newFailedLogins = user.failedLogins + 1;
            const maxAttempts = 5;
            const lockoutDuration = 30 * 60 * 1000;
            await prismaClient_1.prisma.user.update({
                where: { id: user.id },
                data: {
                    failedLogins: newFailedLogins,
                    lockedUntil: newFailedLogins >= maxAttempts ? new Date(Date.now() + lockoutDuration) : null,
                },
            });
            logger_1.default.warn('Admin login attempt with invalid password', {
                userId: user.id,
                failedLogins: newFailedLogins,
            });
            throw new errors_1.AuthenticationError('Invalid admin credentials');
        }
        await prismaClient_1.prisma.user.update({
            where: { id: user.id },
            data: {
                lastActive: new Date(),
                failedLogins: 0,
                lockedUntil: null,
                loginCount: { increment: 1 },
                lastLoginAt: new Date(),
            },
        });
        const token = (0, auth_1.generateToken)(user.id, user.email, user.role);
        const refreshToken = (0, auth_1.generateRefreshToken)(user.id, user.email, user.role);
        logger_1.default.info('Admin login successful', { adminId: user.id, email: user.email });
        res.json({
            status: 'success',
            data: {
                access_token: token,
                refresh_token: refreshToken,
                user: {
                    id: user.id,
                    email: user.email,
                    username: user.username ?? 'Admin',
                    role: user.role,
                },
            },
        });
    }
    catch (error) {
        if (error instanceof errors_1.AuthenticationError) {
            res.status(401).json({ status: 'error', message: error.message });
            return;
        }
        if (error instanceof errors_1.ValidationError) {
            res.status(400).json({ status: 'error', message: error.message });
            return;
        }
        logger_1.default.error('Admin login error', error instanceof Error ? error : new Error(String(error)));
        res.status(500).json({ status: 'error', message: 'Internal server error' });
    }
};
exports.adminLogin = adminLogin;
const adminRegister = async (req, res) => {
    try {
        const { email, password, username, adminSecret } = req.body;
        // Validate required fields
        if (!email || !password || !username || !adminSecret) {
            throw new errors_1.ValidationError('All fields are required');
        }
        // Verify admin secret (acts as a shared password for admin registration)
        const expectedSecret = process.env.ADMIN_SECRET;
        if (!expectedSecret) {
            logger_1.default.error('Admin registration attempted but ADMIN_SECRET not configured');
            throw new errors_1.AuthorizationError('Admin registration is not properly configured');
        }
        if (adminSecret !== expectedSecret) {
            logger_1.default.warn('Invalid admin registration attempt with wrong secret', { email });
            throw new errors_1.AuthorizationError('Invalid admin registration secret');
        }
        // Check if user already exists
        const existingUser = await prismaClient_1.prisma.user.findUnique({
            where: { email: email.toLowerCase().trim() },
        });
        if (existingUser) {
            res.status(409).json({ status: 'error', message: 'User with this email already exists' });
            return;
        }
        // Hash password
        const hashedPassword = await bcryptjs_1.default.hash(password, 12);
        // Create admin user with ADMIN role
        const admin = await prismaClient_1.prisma.user.create({
            data: {
                email: email.toLowerCase().trim(),
                password: hashedPassword,
                username,
                role: 'ADMIN',
                avatar: `https://api.dicebear.com/7.x/initials/svg?seed=${encodeURIComponent(username)}`,
                xp: 0,
                level: 1,
                streak: 0,
                longestStreak: 0,
            },
            select: {
                id: true,
                email: true,
                username: true,
                role: true,
                createdAt: true,
            },
        });
        logger_1.default.info('Admin user created successfully', { adminId: admin.id, email: admin.email });
        // Generate tokens for immediate login
        const token = (0, auth_1.generateToken)(admin.id, admin.email, admin.role);
        const refreshToken = (0, auth_1.generateRefreshToken)(admin.id, admin.email, admin.role);
        res.status(201).json({
            status: 'success',
            message: 'Admin account created successfully',
            data: {
                access_token: token,
                refresh_token: refreshToken,
                user: {
                    id: admin.id,
                    email: admin.email,
                    username: admin.username,
                    role: admin.role,
                },
            },
        });
    }
    catch (error) {
        if (error instanceof errors_1.AuthorizationError) {
            res.status(403).json({ status: 'error', message: error.message });
            return;
        }
        if (error instanceof errors_1.ValidationError) {
            res.status(400).json({ status: 'error', message: error.message });
            return;
        }
        logger_1.default.error('Admin registration error', error instanceof Error ? error : new Error(String(error)));
        res.status(500).json({ status: 'error', message: 'Internal server error' });
    }
};
exports.adminRegister = adminRegister;
