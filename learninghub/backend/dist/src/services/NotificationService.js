"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.notificationService = exports.NotificationService = exports.NotificationType = void 0;
const database_1 = require("../config/database");
const logger_1 = __importDefault(require("../utils/logger"));
var NotificationType;
(function (NotificationType) {
    NotificationType["ACHIEVEMENT"] = "achievement";
    NotificationType["COURSE_COMPLETE"] = "course_complete";
    NotificationType["STREAK"] = "streak";
    NotificationType["REMINDER"] = "reminder";
    NotificationType["CONTEST_START"] = "contest_start";
    NotificationType["CONTEST_RESULT"] = "contest_result";
    NotificationType["SUBSCRIPTION"] = "subscription";
    NotificationType["SYSTEM"] = "system";
    NotificationType["TEST_RESULT"] = "test_result";
    NotificationType["LEVEL_UP"] = "level_up";
})(NotificationType || (exports.NotificationType = NotificationType = {}));
class NotificationService {
    io = null;
    setSocketIO(io) {
        this.io = io;
    }
    async create(data) {
        try {
            const notification = await database_1.prisma.notification.create({
                data: {
                    userId: data.userId,
                    type: data.type,
                    title: data.title,
                    message: data.message,
                    actionUrl: data.actionUrl,
                },
            });
            if (this.io) {
                this.io.to(data.userId).emit('notification', {
                    id: notification.id,
                    type: notification.type,
                    title: notification.title,
                    message: notification.message,
                    actionUrl: notification.actionUrl,
                    createdAt: notification.createdAt,
                });
            }
            return notification;
        }
        catch (error) {
            logger_1.default.error('[NotificationService] create error', error instanceof Error ? error : new Error(String(error)), { userId: data.userId });
            throw error;
        }
    }
    async getUserNotifications(userId, page = 1, limit = 20, filter) {
        const skip = (page - 1) * limit;
        const where = { userId };
        if (filter?.isRead !== undefined)
            where.isRead = filter.isRead;
        if (filter?.type)
            where.type = filter.type;
        const [notifications, total, unreadCount] = await Promise.all([
            database_1.prisma.notification.findMany({
                where,
                skip,
                take: limit,
                orderBy: { createdAt: 'desc' },
            }),
            database_1.prisma.notification.count({ where }),
            database_1.prisma.notification.count({ where: { userId, isRead: false } }),
        ]);
        return { notifications, total, unreadCount };
    }
    async markAsRead(notificationId, userId) {
        const notification = await database_1.prisma.notification.findUnique({
            where: { id: notificationId },
        });
        if (notification?.userId !== userId) {
            throw new Error('Notification not found');
        }
        return database_1.prisma.notification.update({
            where: { id: notificationId },
            data: { isRead: true },
        });
    }
    async markAllAsRead(userId) {
        const result = await database_1.prisma.notification.updateMany({
            where: { userId, isRead: false },
            data: { isRead: true },
        });
        return { count: result.count };
    }
    async deleteNotification(notificationId, userId) {
        const notification = await database_1.prisma.notification.findUnique({
            where: { id: notificationId },
        });
        if (notification?.userId !== userId) {
            throw new Error('Notification not found');
        }
        await database_1.prisma.notification.delete({
            where: { id: notificationId },
        });
    }
    async getUnreadCount(userId) {
        return database_1.prisma.notification.count({
            where: { userId, isRead: false },
        });
    }
    async deleteOldNotifications(daysOld = 30) {
        const cutoffDate = new Date();
        cutoffDate.setDate(cutoffDate.getDate() - daysOld);
        const result = await database_1.prisma.notification.deleteMany({
            where: {
                createdAt: { lt: cutoffDate },
                isRead: true,
            },
        });
        return { count: result.count };
    }
    // Convenience methods for common notification types
    async sendAchievementNotification(userId, achievementName) {
        return this.create({
            userId,
            type: NotificationType.ACHIEVEMENT,
            title: '🏆 Achievement Unlocked!',
            message: `Congratulations! You've unlocked: ${achievementName}`,
            actionUrl: '/achievements',
        });
    }
    async sendCourseCompleteNotification(userId, courseTitle) {
        return this.create({
            userId,
            type: NotificationType.COURSE_COMPLETE,
            title: '🎓 Course Completed!',
            message: `You've completed: ${courseTitle}`,
            actionUrl: '/courses',
        });
    }
    async sendStreakNotification(userId, streakCount) {
        return this.create({
            userId,
            type: NotificationType.STREAK,
            title: '🔥 Streak Alert!',
            message: `You're on a ${streakCount}-day streak! Keep it up!`,
            actionUrl: '/dashboard',
        });
    }
    async sendContestStartNotification(userId, contestTitle) {
        return this.create({
            userId,
            type: NotificationType.CONTEST_START,
            title: '⚡ Contest Starting!',
            message: `The contest "${contestTitle}" is about to begin!`,
            actionUrl: '/contests',
        });
    }
    async sendContestResultNotification(userId, contestTitle, rank) {
        return this.create({
            userId,
            type: NotificationType.CONTEST_RESULT,
            title: '📊 Contest Results',
            message: `You ranked #${rank} in "${contestTitle}"!`,
            actionUrl: '/contests',
        });
    }
    async sendTestResultNotification(userId, testTitle, score, passed) {
        return this.create({
            userId,
            type: NotificationType.TEST_RESULT,
            title: passed ? '✅ Test Passed!' : '📝 Test Complete',
            message: `You scored ${score}% on "${testTitle}"`,
            actionUrl: '/tests',
        });
    }
    async sendLevelUpNotification(userId, newLevel) {
        return this.create({
            userId,
            type: NotificationType.LEVEL_UP,
            title: '⬆️ Level Up!',
            message: `Congratulations! You've reached level ${newLevel}!`,
            actionUrl: '/profile',
        });
    }
    async sendSubscriptionNotification(userId, tierName) {
        return this.create({
            userId,
            type: NotificationType.SUBSCRIPTION,
            title: '💎 Subscription Active',
            message: `Your ${tierName} subscription is now active. Enjoy premium features!`,
            actionUrl: '/subscription',
        });
    }
}
exports.NotificationService = NotificationService;
exports.notificationService = new NotificationService();
exports.default = exports.notificationService;
