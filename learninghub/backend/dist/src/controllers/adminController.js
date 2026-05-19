"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.getCourseAnalytics = exports.getUserAnalytics = exports.getSecurityEvents = exports.getAuditLogs = exports.getAnalytics = exports.deleteCourse = exports.updateCourse = exports.createCourse = exports.getAdminCourses = exports.getSystemStatus = exports.deleteUser = exports.updateUserRole = exports.getUsers = exports.getDashboardStats = void 0;
const prismaClient_1 = require("../prismaClient");
const logger_1 = __importDefault(require("../utils/logger"));
const pagination_1 = require("../utils/pagination");
const AnalyticsService_1 = require("../services/AnalyticsService");
/**
 * Get admin dashboard statistics
 * Includes: total users, active users, total courses, revenue metrics
 */
const getDashboardStats = async (req, res) => {
    const adminId = req.user?.userId ?? '';
    try {
        // Log dashboard access
        logger_1.default.audit('ACCESS_DASHBOARD', adminId, { action: 'view_dashboard_stats' });
        // Run all database count queries concurrently for performance
        const twentyFourHoursAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        const [totalUsers, activeUsers, newUsersToday, totalCourses, recentCompletions, totalEnrollments, testSubmissions,] = await Promise.all([
            prismaClient_1.prisma.user.count(),
            prismaClient_1.prisma.user.count({
                where: { lastActive: { gte: twentyFourHoursAgo } },
            }),
            prismaClient_1.prisma.user.count({
                where: { createdAt: { gte: today } },
            }),
            prismaClient_1.prisma.course.count(),
            prismaClient_1.prisma.userProgress.count({
                where: {
                    status: 'COMPLETED',
                    updatedAt: { gte: twentyFourHoursAgo },
                },
            }),
            prismaClient_1.prisma.userProgress.count(),
            prismaClient_1.prisma.testResult.count({
                where: { completedAt: { gte: twentyFourHoursAgo } },
            }),
        ]);
        res.status(200).json({
            status: 'success',
            data: {
                total_users: totalUsers,
                active_users_24h: activeUsers,
                new_users_today: newUsersToday,
                total_courses: totalCourses,
                recent_completions: recentCompletions,
                total_enrollments: totalEnrollments,
                test_submissions_24h: testSubmissions,
                total_revenue: null,
                revenue_today: null,
                revenue_tracking_enabled: false,
            },
        });
    }
    catch (error) {
        logger_1.default.error('Admin getDashboardStats error', error instanceof Error ? error : new Error(String(error)), {
            adminId,
        });
        res.status(500).json({ status: 'error', message: 'Internal server error' });
    }
};
exports.getDashboardStats = getDashboardStats;
/**
 * Get all users with pagination and search
 */
const getUsers = async (req, res) => {
    const adminId = req.user?.userId ?? '';
    try {
        const { search } = req.query;
        const { page: parsedPage, limit: parsedLimit, skip } = (0, pagination_1.getPaginationParams)(req.query);
        logger_1.default.audit('ACCESS_USER_LIST', adminId, {
            page: parsedPage,
            search: search ? String(search) : undefined,
        });
        const where = {};
        if (search) {
            where.OR = [
                { username: { contains: search, mode: 'insensitive' } },
                { email: { contains: search, mode: 'insensitive' } },
            ];
        }
        const [users, total] = await Promise.all([
            prismaClient_1.prisma.user.findMany({
                where,
                skip,
                take: parsedLimit,
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
                    createdAt: true,
                },
            }),
            prismaClient_1.prisma.user.count({ where }),
        ]);
        res.status(200).json({
            status: 'success',
            data: {
                users,
                pagination: {
                    page: parsedPage,
                    limit: parsedLimit,
                    total,
                    totalPages: Math.ceil(total / parsedLimit),
                },
            },
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
    const adminId = req.user?.userId ?? '';
    try {
        const uppercaseRole = role?.toUpperCase();
        if (!['STUDENT', 'INSTRUCTOR', 'ADMIN', 'SUPERADMIN'].includes(uppercaseRole)) {
            res.status(400).json({ status: 'error', message: 'Invalid role' });
            return;
        }
        const user = await prismaClient_1.prisma.user.update({
            where: { id },
            data: { role: uppercaseRole },
            select: {
                id: true,
                email: true,
                username: true,
                role: true,
            },
        });
        // Log admin action using audit logger
        logger_1.default.audit('UPDATE_USER_ROLE', adminId, { targetUserId: id, newRole: role });
        res.status(200).json({
            status: 'success',
            message: 'User role updated successfully',
            data: user,
        });
    }
    catch (error) {
        logger_1.default.error('Admin updateUserRole error', error instanceof Error ? error : new Error(String(error)), {
            adminId,
            targetUserId: id,
            newRole: role,
        });
        res.status(500).json({ status: 'error', message: 'Internal server error' });
    }
};
exports.updateUserRole = updateUserRole;
/**
 * Delete user (admin action with audit) — cascade-safe
 */
const deleteUser = async (req, res) => {
    const id = req.params.id;
    const adminId = req.user?.userId ?? '';
    try {
        // Prevent self-deletion
        if (id === adminId) {
            res.status(400).json({ status: 'error', message: 'Cannot delete your own account' });
            return;
        }
        // Prevent non-superadmin from deleting admins (privilege escalation guard)
        const targetUser = await prismaClient_1.prisma.user.findUnique({
            where: { id },
            select: { role: true, username: true },
        });
        if (!targetUser) {
            res.status(404).json({ status: 'error', message: 'User not found' });
            return;
        }
        if ((targetUser.role === 'ADMIN' || targetUser.role === 'SUPERADMIN') &&
            req.user?.role !== 'SUPERADMIN') {
            res
                .status(403)
                .json({ status: 'error', message: 'Only SUPERADMIN can delete admin accounts' });
            return;
        }
        // Cascade delete all dependent records in a transaction
        await prismaClient_1.prisma.$transaction([
            prismaClient_1.prisma.testResult.deleteMany({ where: { userId: id } }),
            prismaClient_1.prisma.lessonCompletion.deleteMany({ where: { userId: id } }),
            prismaClient_1.prisma.userProgress.deleteMany({ where: { userId: id } }),
            prismaClient_1.prisma.bookmark.deleteMany({ where: { userId: id } }),
            prismaClient_1.prisma.note.deleteMany({ where: { userId: id } }),
            prismaClient_1.prisma.userAchievement.deleteMany({ where: { userId: id } }),
            prismaClient_1.prisma.refreshToken.deleteMany({ where: { userId: id } }),
            prismaClient_1.prisma.userSession.deleteMany({ where: { userId: id } }),
            prismaClient_1.prisma.auditLog.deleteMany({ where: { userId: id } }),
            prismaClient_1.prisma.notification.deleteMany({ where: { userId: id } }),
            prismaClient_1.prisma.dailyGoal.deleteMany({ where: { userId: id } }),
            prismaClient_1.prisma.activityLog.deleteMany({ where: { userId: id } }),
            prismaClient_1.prisma.user.delete({ where: { id } }),
        ]);
        // Log admin action using audit logger
        logger_1.default.audit('DELETE_USER', adminId, { targetUserId: id, targetUsername: targetUser.username });
        res.status(200).json({
            status: 'success',
            message: 'User deleted successfully',
        });
    }
    catch (error) {
        logger_1.default.error('Admin deleteUser error', error instanceof Error ? error : new Error(String(error)), {
            adminId,
            targetUserId: id,
        });
        res.status(500).json({ status: 'error', message: 'Internal server error' });
    }
};
exports.deleteUser = deleteUser;
/**
 * Get system health/status
 */
const getSystemStatus = async (req, res) => {
    const adminId = req.user?.userId ?? '';
    try {
        // Log system status access
        logger_1.default.audit('ACCESS_SYSTEM_STATUS', adminId, { action: 'view_system_health' });
        // Check database connection
        await prismaClient_1.prisma.$queryRaw `SELECT 1`;
        res.status(200).json({
            status: 'success',
            data: {
                database: 'connected',
                timestamp: new Date().toISOString(),
                uptime: process.uptime(),
            },
        });
    }
    catch (error) {
        logger_1.default.error('Admin getSystemStatus error', error instanceof Error ? error : new Error(String(error)), {
            adminId,
        });
        res.status(500).json({
            status: 'error',
            message: 'System check failed',
            data: { database: 'disconnected' },
        });
    }
};
exports.getSystemStatus = getSystemStatus;
// ==================== COURSE MANAGEMENT ====================
/**
 * Get all courses with filters (admin view)
 */
const getAdminCourses = async (req, res) => {
    const adminId = req.user?.userId ?? '';
    try {
        const { status, category, search, page = '1', limit = '20' } = req.query;
        const parsedPage = Math.max(1, parseInt(page, 10));
        const parsedLimit = Math.min(100, Math.max(1, parseInt(limit, 10)));
        const skip = (parsedPage - 1) * parsedLimit;
        const where = {};
        if (status && typeof status === 'string') {
            switch (status) {
                case 'published':
                    where.isPublished = true;
                    break;
                case 'draft':
                    where.isPublished = false;
                    break;
                case 'archived':
                    where.deletedAt = { not: null };
                    break;
            }
        }
        if (category && typeof category === 'string') {
            where.category = { contains: category, mode: 'insensitive' };
        }
        if (search && typeof search === 'string') {
            where.OR = [
                { title: { contains: search, mode: 'insensitive' } },
                { description: { contains: search, mode: 'insensitive' } },
            ];
        }
        const [courses, total] = await Promise.all([
            prismaClient_1.prisma.course.findMany({
                where,
                skip,
                take: parsedLimit,
                orderBy: { updatedAt: 'desc' },
                select: {
                    id: true,
                    title: true,
                    description: true,
                    thumbnail: true,
                    difficulty: true,
                    category: true,
                    isPublished: true,
                    studentCount: true,
                    rating: true,
                    price: true,
                    createdAt: true,
                    updatedAt: true,
                    instructor: {
                        select: { username: true, email: true },
                    },
                },
            }),
            prismaClient_1.prisma.course.count({ where }),
        ]);
        res.status(200).json({
            status: 'success',
            data: courses,
            pagination: {
                page: parsedPage,
                limit: parsedLimit,
                total,
                totalPages: Math.ceil(total / parsedLimit),
            },
        });
    }
    catch (error) {
        logger_1.default.error('Admin getCourses error', error instanceof Error ? error : new Error(String(error)), { adminId });
        res.status(500).json({ status: 'error', message: 'Internal server error' });
    }
};
exports.getAdminCourses = getAdminCourses;
/**
 * Create a new course (admin)
 */
const createCourse = async (req, res) => {
    const adminId = req.user?.userId ?? '';
    try {
        const { title, description, difficulty, category, thumbnail, price, instructorId } = req.body;
        if (!title || !description || !difficulty) {
            res
                .status(400)
                .json({ status: 'error', message: 'Title, description, and difficulty are required' });
            return;
        }
        const course = await prismaClient_1.prisma.course.create({
            data: {
                title,
                description,
                shortDescription: description.substring(0, 200),
                phase: 'BEGINNER',
                duration: 0,
                // eslint-disable-next-line @typescript-eslint/no-explicit-any
                difficulty: difficulty,
                category,
                thumbnail,
                price: price ? Number(price) : null,
                instructorId,
                isPublished: false,
                content: '',
                tags: [],
                certificate: false,
            },
            select: {
                id: true,
                title: true,
                description: true,
                difficulty: true,
                category: true,
                isPublished: true,
                createdAt: true,
            },
        });
        logger_1.default.audit('CREATE_COURSE', adminId, { courseId: course.id, title: course.title });
        res.status(201).json({
            status: 'success',
            message: 'Course created successfully',
            data: course,
        });
    }
    catch (error) {
        logger_1.default.error('Admin createCourse error', error instanceof Error ? error : new Error(String(error)), { adminId });
        res.status(500).json({ status: 'error', message: 'Internal server error' });
    }
};
exports.createCourse = createCourse;
/**
 * Update course (admin)
 */
const updateCourse = async (req, res) => {
    const adminId = req.user?.userId ?? '';
    const courseId = req.params.id;
    try {
        const { title, description, difficulty, category, thumbnail, price, isPublished } = req.body;
        const existing = await prismaClient_1.prisma.course.findUnique({ where: { id: courseId } });
        if (!existing) {
            res.status(404).json({ status: 'error', message: 'Course not found' });
            return;
        }
        const updated = await prismaClient_1.prisma.course.update({
            where: { id: courseId },
            data: {
                ...(title && { title }),
                ...(description && { description }),
                // eslint-disable-next-line @typescript-eslint/no-explicit-any
                ...(difficulty && { difficulty: difficulty }),
                ...(category && { category }),
                ...(thumbnail !== undefined && { thumbnail }),
                ...(price !== undefined && { price: Number(price) }),
                ...(isPublished !== undefined && { isPublished }),
                updatedAt: new Date(),
            },
            select: {
                id: true,
                title: true,
                description: true,
                difficulty: true,
                isPublished: true,
                updatedAt: true,
            },
        });
        logger_1.default.audit('UPDATE_COURSE', adminId, { courseId, fields: Object.keys(req.body) });
        res.status(200).json({
            status: 'success',
            message: 'Course updated successfully',
            data: updated,
        });
    }
    catch (error) {
        logger_1.default.error('Admin updateCourse error', error instanceof Error ? error : new Error(String(error)), { adminId, courseId: req.params.id });
        res.status(500).json({ status: 'error', message: 'Internal server error' });
    }
};
exports.updateCourse = updateCourse;
/**
 * Delete course (admin)
 */
const deleteCourse = async (req, res) => {
    const adminId = req.user?.userId ?? '';
    const courseId = req.params.id;
    try {
        const course = await prismaClient_1.prisma.course.findUnique({ where: { id: courseId } });
        if (!course) {
            res.status(404).json({ status: 'error', message: 'Course not found' });
            return;
        }
        await prismaClient_1.prisma.course.delete({ where: { id: courseId } });
        logger_1.default.audit('DELETE_COURSE', adminId, { courseId, title: course.title });
        res.status(200).json({
            status: 'success',
            message: 'Course deleted successfully',
        });
    }
    catch (error) {
        logger_1.default.error('Admin deleteCourse error', error instanceof Error ? error : new Error(String(error)), { adminId, courseId });
        res.status(500).json({ status: 'error', message: 'Internal server error' });
    }
};
exports.deleteCourse = deleteCourse;
// ==================== ANALYTICS ====================
/**
 * Get admin analytics overview
 */
const getAnalytics = async (req, res) => {
    const adminId = req.user?.userId ?? '';
    try {
        const days = req.query.days ? parseInt(req.query.days) : 30;
        const analytics = await AnalyticsService_1.analyticsService.getPlatformAnalytics(days);
        const security = await AnalyticsService_1.analyticsService.getSecurityEvents(days);
        logger_1.default.audit('ACCESS_ANALYTICS', adminId, { days });
        res.status(200).json({
            status: 'success',
            data: {
                ...analytics,
                security,
            },
        });
    }
    catch (error) {
        logger_1.default.error('Admin getAnalytics error', error instanceof Error ? error : new Error(String(error)), { adminId });
        res.status(500).json({ status: 'error', message: 'Internal server error' });
    }
};
exports.getAnalytics = getAnalytics;
/**
 * GET /admin/audit-logs
 * View audit logs with filtering.
 */
const getAuditLogs = async (req, res) => {
    const adminId = req.user?.userId ?? '';
    try {
        const { page, limit, user_id, action, severity, entity_type, start_date, end_date } = req.query;
        const logs = await AnalyticsService_1.analyticsService.getAuditLogs({
            page: page ? parseInt(page) : undefined,
            limit: limit ? parseInt(limit) : undefined,
            userId: user_id,
            action: action,
            severity: severity,
            entityType: entity_type,
            startDate: start_date ? new Date(start_date) : undefined,
            endDate: end_date ? new Date(end_date) : undefined,
        });
        logger_1.default.audit('VIEW_AUDIT_LOGS', adminId, { filters: req.query });
        res.status(200).json({ status: 'success', data: logs });
    }
    catch (error) {
        logger_1.default.error('Admin getAuditLogs error', error instanceof Error ? error : new Error(String(error)), { adminId });
        res.status(500).json({ status: 'error', message: 'Internal server error' });
    }
};
exports.getAuditLogs = getAuditLogs;
/**
 * GET /admin/security
 * View security events summary.
 */
const getSecurityEvents = async (req, res) => {
    const adminId = req.user?.userId ?? '';
    try {
        const days = req.query.days ? parseInt(req.query.days) : 7;
        const events = await AnalyticsService_1.analyticsService.getSecurityEvents(days);
        logger_1.default.audit('VIEW_SECURITY', adminId, { days });
        res.status(200).json({ status: 'success', data: events });
    }
    catch (error) {
        logger_1.default.error('Admin getSecurityEvents error', error instanceof Error ? error : new Error(String(error)), { adminId });
        res.status(500).json({ status: 'error', message: 'Internal server error' });
    }
};
exports.getSecurityEvents = getSecurityEvents;
/**
 * Get user analytics breakdown
 */
const getUserAnalytics = async (req, res) => {
    try {
        const byRole = await prismaClient_1.prisma.user.groupBy({
            by: ['role'],
            _count: { id: true },
        });
        const growth = await prismaClient_1.prisma.user.groupBy({
            by: ['createdAt'],
            _count: { id: true },
            orderBy: { createdAt: 'asc' },
            take: 30,
        });
        res.status(200).json({
            status: 'success',
            data: {
                byRole: byRole.map(g => ({ role: g.role, count: g._count.id })),
                growth: growth.map(g => ({
                    date: g.createdAt.toISOString().split('T')[0],
                    count: g._count.id,
                })),
            },
        });
    }
    catch (error) {
        logger_1.default.error('Admin getUserAnalytics error', error instanceof Error ? error : new Error(String(error)));
        res.status(500).json({ status: 'error', message: 'Internal server error' });
    }
};
exports.getUserAnalytics = getUserAnalytics;
/**
 * Get course analytics breakdown
 */
const getCourseAnalytics = async (req, res) => {
    try {
        const popular = await prismaClient_1.prisma.course.findMany({
            take: 10,
            orderBy: { studentCount: 'desc' },
            select: {
                id: true,
                title: true,
                studentCount: true,
                category: true,
            },
        });
        const byCategory = await prismaClient_1.prisma.course.groupBy({
            by: ['category'],
            _count: { id: true },
            where: { category: { not: null } },
        });
        res.status(200).json({
            status: 'success',
            data: {
                popular: popular.map(p => ({
                    id: p.id,
                    title: p.title,
                    enrollments: p.studentCount,
                })),
                byCategory: byCategory.map(c => ({
                    category: c.category ?? 'Uncategorized',
                    count: c._count.id,
                })),
            },
        });
    }
    catch (error) {
        logger_1.default.error('Admin getCourseAnalytics error', error instanceof Error ? error : new Error(String(error)));
        res.status(500).json({ status: 'error', message: 'Internal server error' });
    }
};
exports.getCourseAnalytics = getCourseAnalytics;
