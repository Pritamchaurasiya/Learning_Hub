"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.getSystemStatus = exports.deleteUser = exports.updateUserRole = exports.getUsers = exports.getDashboardStats = void 0;
const prismaClient_1 = require("../prismaClient");
const logger_1 = __importDefault(require("../utils/logger"));
/**
 * Get admin dashboard statistics
 * Includes: total users, active users, total courses, revenue metrics
 */
const getDashboardStats = async (req, res) => {
    const adminId = req.user.userId;
    try {
        // Log dashboard access
        logger_1.default.audit('ACCESS_DASHBOARD', adminId, { action: 'view_dashboard_stats' });
        // Get total users count
        const totalUsers = await prismaClient_1.prisma.user.count();
        // Get active users (last 24 hours)
        const twentyFourHoursAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);
        const activeUsers = await prismaClient_1.prisma.user.count({
            where: {
                lastActive: {
                    gte: twentyFourHoursAgo
                }
            }
        });
        // Get new users today
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        const newUsersToday = await prismaClient_1.prisma.user.count({
            where: {
                createdAt: {
                    gte: today
                }
            }
        });
        // Get total courses
        const totalCourses = await prismaClient_1.prisma.course.count();
        // Get recent course completions
        const recentCompletions = await prismaClient_1.prisma.userProgress.count({
            where: {
                status: 'completed',
                updatedAt: {
                    gte: twentyFourHoursAgo
                }
            }
        });
        // Get total enrollments
        const totalEnrollments = await prismaClient_1.prisma.userProgress.count();
        // Get test submissions in last 24 hours
        const testSubmissions = await prismaClient_1.prisma.testResult.count({
            where: {
                completedAt: {
                    gte: twentyFourHoursAgo
                }
            }
        });
        res.json({
            status: 'success',
            data: {
                total_users: totalUsers,
                active_users_24h: activeUsers,
                new_users_today: newUsersToday,
                total_courses: totalCourses,
                recent_completions: recentCompletions,
                total_enrollments: totalEnrollments,
                test_submissions_24h: testSubmissions,
                // Mock revenue data (would come from payment system)
                total_revenue: 12500,
                revenue_today: 450
            }
        });
    }
    catch (error) {
        logger_1.default.error('Admin getDashboardStats error', error instanceof Error ? error : new Error(String(error)), {
            adminId
        });
        res.status(500).json({ status: 'error', message: 'Internal server error' });
    }
};
exports.getDashboardStats = getDashboardStats;
/**
 * Get all users with pagination and search
 */
const getUsers = async (req, res) => {
    const adminId = req.user.userId;
    try {
        const { page = '1', limit = '20', search } = req.query;
        // Log user list access
        logger_1.default.audit('ACCESS_USER_LIST', adminId, {
            page: Number(page),
            search: search ? String(search) : undefined
        });
        const skip = (parseInt(page) - 1) * parseInt(limit);
        const take = parseInt(limit);
        const where = {};
        if (search) {
            where.OR = [
                { username: { contains: search, mode: 'insensitive' } },
                { email: { contains: search, mode: 'insensitive' } }
            ];
        }
        const [users, total] = await Promise.all([
            prismaClient_1.prisma.user.findMany({
                where,
                skip,
                take,
                orderBy: { createdAt: 'desc' },
                select: {
                    id: true,
                    email: true,
                    username: true,
                    role: true,
                    avatar: true,
                    xp: true,
                    streak: true,
                    lastActive: true,
                    createdAt: true
                }
            }),
            prismaClient_1.prisma.user.count({ where })
        ]);
        res.json({
            status: 'success',
            data: {
                users,
                pagination: {
                    page: parseInt(page),
                    limit: take,
                    total,
                    totalPages: Math.ceil(total / take)
                }
            }
        });
    }
    catch (error) {
        logger_1.default.error('Admin getUsers error', error instanceof Error ? error : new Error(String(error)));
        res.status(500).json({ status: 'error', message: 'Internal server error' });
    }
};
exports.getUsers = getUsers;
/**
 * Update user role (admin action with audit)
 */
const updateUserRole = async (req, res) => {
    const id = req.params.id;
    const { role } = req.body;
    const adminId = req.user.userId;
    try {
        if (!['user', 'instructor', 'admin'].includes(role)) {
            res.status(400).json({ status: 'error', message: 'Invalid role' });
            return;
        }
        const user = await prismaClient_1.prisma.user.update({
            where: { id },
            data: { role },
            select: {
                id: true,
                email: true,
                username: true,
                role: true
            }
        });
        // Log admin action using audit logger
        logger_1.default.audit('UPDATE_USER_ROLE', adminId, { targetUserId: id, newRole: role });
        res.json({
            status: 'success',
            message: 'User role updated successfully',
            data: user
        });
    }
    catch (error) {
        logger_1.default.error('Admin updateUserRole error', error instanceof Error ? error : new Error(String(error)), {
            adminId,
            targetUserId: id,
            newRole: role
        });
        res.status(500).json({ status: 'error', message: 'Internal server error' });
    }
};
exports.updateUserRole = updateUserRole;
/**
 * Delete user (admin action with audit)
 */
const deleteUser = async (req, res) => {
    const id = req.params.id;
    const adminId = req.user.userId;
    try {
        // Prevent self-deletion
        if (id === adminId) {
            res.status(400).json({ status: 'error', message: 'Cannot delete your own account' });
            return;
        }
        await prismaClient_1.prisma.user.delete({ where: { id } });
        // Log admin action using audit logger
        logger_1.default.audit('DELETE_USER', adminId, { targetUserId: id });
        res.json({
            status: 'success',
            message: 'User deleted successfully'
        });
    }
    catch (error) {
        logger_1.default.error('Admin deleteUser error', error instanceof Error ? error : new Error(String(error)), {
            adminId,
            targetUserId: id
        });
        res.status(500).json({ status: 'error', message: 'Internal server error' });
    }
};
exports.deleteUser = deleteUser;
/**
 * Get system health/status
 */
const getSystemStatus = async (req, res) => {
    const adminId = req.user.userId;
    try {
        // Log system status access
        logger_1.default.audit('ACCESS_SYSTEM_STATUS', adminId, { action: 'view_system_health' });
        // Check database connection
        await prismaClient_1.prisma.$queryRaw `SELECT 1`;
        res.json({
            status: 'success',
            data: {
                database: 'connected',
                timestamp: new Date().toISOString(),
                uptime: process.uptime()
            }
        });
    }
    catch (error) {
        logger_1.default.error('Admin getSystemStatus error', error instanceof Error ? error : new Error(String(error)), {
            adminId
        });
        res.status(500).json({
            status: 'error',
            message: 'System check failed',
            data: { database: 'disconnected' }
        });
    }
};
exports.getSystemStatus = getSystemStatus;
