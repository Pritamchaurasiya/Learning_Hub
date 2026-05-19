"use strict";
/**
 * Analytics Service
 *
 * Provides aggregated analytics for admin dashboard and user insights:
 *  - Platform-wide metrics
 *  - Revenue analytics
 *  - User growth trends
 *  - Course performance
 *  - Test engagement
 *  - Audit log viewer
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.analyticsService = exports.AnalyticsService = void 0;
const prismaClient_1 = require("../prismaClient");
class AnalyticsService {
    /**
     * Get comprehensive platform analytics for admin dashboard.
     */
    async getPlatformAnalytics(days = 30) {
        const startDate = new Date(Date.now() - days * 24 * 60 * 60 * 1000);
        const now = new Date();
        const [totalUsers, newUsers, activeUsers, totalCourses, totalTests, totalTestAttempts, totalRevenue, subscriptions,] = await Promise.all([
            prismaClient_1.prisma.user.count({ where: { deletedAt: null } }),
            prismaClient_1.prisma.user.count({ where: { createdAt: { gte: startDate }, deletedAt: null } }),
            prismaClient_1.prisma.user.count({
                where: {
                    lastActive: { gte: new Date(Date.now() - 24 * 60 * 60 * 1000) },
                    deletedAt: null,
                },
            }),
            prismaClient_1.prisma.course.count({ where: { isPublished: true, deletedAt: null } }),
            prismaClient_1.prisma.test.count({ where: { isPublished: true } }),
            prismaClient_1.prisma.testResult.count({ where: { status: 'COMPLETED' } }),
            this.getRevenueMetrics(),
            prismaClient_1.prisma.subscription.count({ where: { status: { in: ['ACTIVE', 'TRIAL'] } } }),
        ]);
        return {
            overview: {
                total_users: totalUsers,
                new_users_period: newUsers,
                active_users_24h: activeUsers,
                total_courses: totalCourses,
                total_tests: totalTests,
                total_test_attempts: totalTestAttempts,
                active_subscriptions: subscriptions,
                revenue: totalRevenue,
            },
            growth: await this.getUserGrowthTrend(days),
            engagement: await this.getEngagementMetrics(startDate),
            top_courses: await this.getTopCourses(),
        };
    }
    /**
     * Get revenue metrics.
     */
    async getRevenueMetrics() {
        const result = await prismaClient_1.prisma.activityLog.aggregate({
            where: {
                activityType: 'COURSE_ENROLL',
                metadata: { path: ['gateway'], equals: 'stripe' },
            },
            _count: { id: true },
        });
        return {
            total_transactions: result._count.id,
            // In production, integrate with Stripe for actual revenue
            estimated_revenue: null,
        };
    }
    /**
     * Get user growth trend over time.
     */
    async getUserGrowthTrend(days) {
        const users = await prismaClient_1.prisma.user.findMany({
            where: {
                createdAt: { gte: new Date(Date.now() - days * 24 * 60 * 60 * 1000) },
                deletedAt: null,
            },
            select: { createdAt: true },
            orderBy: { createdAt: 'asc' },
        });
        const dailyGrowth = {};
        for (const user of users) {
            const date = user.createdAt.toISOString().split('T')[0];
            dailyGrowth[date] = (dailyGrowth[date] ?? 0) + 1;
        }
        return Object.entries(dailyGrowth).map(([date, count]) => ({
            date,
            new_users: count,
        }));
    }
    /**
     * Get engagement metrics.
     */
    async getEngagementMetrics(startDate) {
        const [testResults, lessonCompletions] = await Promise.all([
            prismaClient_1.prisma.testResult.findMany({
                where: { completedAt: { gte: startDate }, status: 'COMPLETED' },
                select: { percentage: true, passed: true, completedAt: true },
            }),
            prismaClient_1.prisma.lessonCompletion.count({
                where: { completedAt: { gte: startDate } },
            }),
        ]);
        const avgTestScore = testResults.length > 0
            ? Math.round(testResults.reduce((s, r) => s + r.percentage, 0) / testResults.length)
            : 0;
        const passRate = testResults.length > 0
            ? Math.round((testResults.filter(r => r.passed).length / testResults.length) * 100)
            : 0;
        return {
            tests_completed: testResults.length,
            average_test_score: avgTestScore,
            pass_rate: passRate,
            lessons_completed: lessonCompletions,
        };
    }
    /**
     * Get top performing courses.
     */
    async getTopCourses() {
        return prismaClient_1.prisma.course.findMany({
            where: { isPublished: true, deletedAt: null },
            orderBy: { studentCount: 'desc' },
            take: 10,
            select: {
                id: true,
                title: true,
                studentCount: true,
                rating: true,
                reviewCount: true,
                category: true,
            },
        });
    }
    /**
     * Get audit logs with filtering and pagination.
     */
    async getAuditLogs(params) {
        const page = Math.max(1, params.page ?? 1);
        const limit = Math.min(params.limit ?? 20, 100);
        const skip = (page - 1) * limit;
        const where = {};
        if (params.userId)
            where.userId = params.userId;
        if (params.action)
            where.action = params.action;
        if (params.severity)
            where.severity = params.severity;
        if (params.entityType)
            where.entityType = params.entityType;
        if (params.startDate && params.endDate) {
            where.createdAt = { gte: params.startDate, lte: params.endDate };
        }
        const [logs, total] = await Promise.all([
            prismaClient_1.prisma.auditLog.findMany({
                where: where,
                skip,
                take: limit,
                include: {
                    user: {
                        select: {
                            id: true,
                            username: true,
                            email: true,
                            role: true,
                        },
                    },
                },
                orderBy: { createdAt: 'desc' },
            }),
            prismaClient_1.prisma.auditLog.count({ where: where }),
        ]);
        return {
            logs: logs.map(log => ({
                id: log.id,
                action: log.action,
                entity_type: log.entityType,
                entity_id: log.entityId,
                description: log.description,
                severity: log.severity,
                ip_address: log.ipAddress,
                user_agent: log.userAgent,
                created_at: log.createdAt,
                user: log.user
                    ? {
                        id: log.user.id,
                        username: log.user.username,
                        email: log.user.email,
                        role: log.user.role,
                    }
                    : null,
            })),
            pagination: {
                page,
                limit,
                total,
                pages: Math.ceil(total / limit),
            },
        };
    }
    /**
     * Get security events summary.
     */
    async getSecurityEvents(days = 7) {
        const startDate = new Date(Date.now() - days * 24 * 60 * 60 * 1000);
        const [failedLogins, roleChanges, deletions, passwordChanges] = await Promise.all([
            prismaClient_1.prisma.user.count({
                where: {
                    failedLogins: { gt: 0 },
                    lastLoginAt: { gte: startDate },
                },
            }),
            prismaClient_1.prisma.auditLog.count({
                where: {
                    action: 'ROLE_CHANGE',
                    createdAt: { gte: startDate },
                },
            }),
            prismaClient_1.prisma.auditLog.count({
                where: {
                    action: 'DELETE',
                    createdAt: { gte: startDate },
                },
            }),
            prismaClient_1.prisma.auditLog.count({
                where: {
                    action: 'PASSWORD_CHANGE',
                    createdAt: { gte: startDate },
                },
            }),
        ]);
        return {
            failed_login_attempts: failedLogins,
            role_changes: roleChanges,
            account_deletions: deletions,
            password_changes: passwordChanges,
            period_days: days,
        };
    }
}
exports.AnalyticsService = AnalyticsService;
exports.analyticsService = new AnalyticsService();
