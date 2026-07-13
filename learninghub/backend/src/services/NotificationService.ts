import { NotificationType as PrismaNotificationType } from '@prisma/client'
import { prisma } from '../config/database'
import logger from '../utils/logger'
import { Server as SocketIOServer } from 'socket.io'

export enum NotificationType {
  ACHIEVEMENT = 'ACHIEVEMENT',
  COURSE_COMPLETE = 'COURSE_COMPLETE',
  STREAK = 'STREAK',
  REMINDER = 'REMINDER',
  CONTEST_START = 'CONTEST_START',
  CONTEST_RESULT = 'CONTEST_RESULT',
  SUBSCRIPTION = 'SUBSCRIPTION',
  SYSTEM = 'SYSTEM',
  TEST_RESULT = 'TEST_RESULT',
  LEVEL_UP = 'LEVEL_UP',
}

export interface CreateNotificationData {
  userId: string
  type: NotificationType | string
  title: string
  message: string
  actionUrl?: string
}

export class NotificationService {
  private io: SocketIOServer | null = null

  setSocketIO(io: SocketIOServer): void {
    this.io = io
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  async create(data: CreateNotificationData): Promise<any> {
    try {
      const notification = await prisma.notification.create({
        data: {
          userId: data.userId,
          type: data.type as PrismaNotificationType,
          title: data.title,
          message: data.message,
          actionUrl: data.actionUrl,
        },
      })

      if (this.io) {
        this.io.to(data.userId).emit('notification', {
          id: notification.id,
          type: notification.type,
          title: notification.title,
          message: notification.message,
          actionUrl: notification.actionUrl,
          createdAt: notification.createdAt,
        })
      }

      return notification
    } catch (error) {
      logger.error(
        '[NotificationService] create error',
        error instanceof Error ? error : new Error(String(error)),
        { userId: data.userId }
      )
      throw error
    }
  }

  async getUserNotifications(
    userId: string,
    page: number = 1,
    limit: number = 20,
    filter?: { isRead?: boolean; type?: string }
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
  ): Promise<{ notifications: any[]; total: number; unreadCount: number }> {
    const skip = (page - 1) * limit

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const where: any = { userId }
    if (filter?.isRead !== undefined) where.isRead = filter.isRead
    if (filter?.type) where.type = filter.type.toUpperCase()

    const [notifications, total, unreadCount] = await Promise.all([
      prisma.notification.findMany({
        where,
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
      }),
      prisma.notification.count({ where }),
      prisma.notification.count({ where: { userId, isRead: false } }),
    ])

    return { notifications, total, unreadCount }
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  async markAsRead(notificationId: string, userId: string): Promise<any> {
    const notification = await prisma.notification.findUnique({
      where: { id: notificationId },
    })

    if (notification?.userId !== userId) {
      throw new Error('Notification not found')
    }

    return prisma.notification.update({
      where: { id: notificationId },
      data: { isRead: true },
    })
  }

  async markAllAsRead(userId: string): Promise<{ count: number }> {
    const result = await prisma.notification.updateMany({
      where: { userId, isRead: false },
      data: { isRead: true },
    })

    return { count: result.count }
  }

  async deleteNotification(notificationId: string, userId: string): Promise<void> {
    const notification = await prisma.notification.findUnique({
      where: { id: notificationId },
    })

    if (notification?.userId !== userId) {
      throw new Error('Notification not found')
    }

    await prisma.notification.delete({
      where: { id: notificationId },
    })
  }

  async getUnreadCount(userId: string): Promise<number> {
    return prisma.notification.count({
      where: { userId, isRead: false },
    })
  }

  async deleteOldNotifications(daysOld: number = 30): Promise<{ count: number }> {
    const cutoffDate = new Date()
    cutoffDate.setDate(cutoffDate.getDate() - daysOld)

    const result = await prisma.notification.deleteMany({
      where: {
        createdAt: { lt: cutoffDate },
        isRead: true,
      },
    })

    return { count: result.count }
  }

  // Convenience methods for common notification types
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  async sendAchievementNotification(userId: string, achievementName: string): Promise<any> {
    return this.create({
      userId,
      type: NotificationType.ACHIEVEMENT,
      title: '🏆 Achievement Unlocked!',
      message: `Congratulations! You've unlocked: ${achievementName}`,
      actionUrl: '/achievements',
    })
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  async sendCourseCompleteNotification(userId: string, courseTitle: string): Promise<any> {
    return this.create({
      userId,
      type: NotificationType.COURSE_COMPLETE,
      title: '🎓 Course Completed!',
      message: `You've completed: ${courseTitle}`,
      actionUrl: '/courses',
    })
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  async sendStreakNotification(userId: string, streakCount: number): Promise<any> {
    return this.create({
      userId,
      type: NotificationType.STREAK,
      title: '🔥 Streak Alert!',
      message: `You're on a ${streakCount}-day streak! Keep it up!`,
      actionUrl: '/dashboard',
    })
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  async sendContestStartNotification(userId: string, contestTitle: string): Promise<any> {
    return this.create({
      userId,
      type: NotificationType.CONTEST_START,
      title: '⚡ Contest Starting!',
      message: `The contest "${contestTitle}" is about to begin!`,
      actionUrl: '/contests',
    })
  }

  async sendContestResultNotification(
    userId: string,
    contestTitle: string,
    rank: number
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
  ): Promise<any> {
    return this.create({
      userId,
      type: NotificationType.CONTEST_RESULT,
      title: '📊 Contest Results',
      message: `You ranked #${rank} in "${contestTitle}"!`,
      actionUrl: '/contests',
    })
  }

  async sendTestResultNotification(
    userId: string,
    testTitle: string,
    score: number,
    passed: boolean
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
  ): Promise<any> {
    return this.create({
      userId,
      type: NotificationType.TEST_RESULT,
      title: passed ? '✅ Test Passed!' : '📝 Test Complete',
      message: `You scored ${score}% on "${testTitle}"`,
      actionUrl: '/tests',
    })
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  async sendLevelUpNotification(userId: string, newLevel: number): Promise<any> {
    return this.create({
      userId,
      type: NotificationType.LEVEL_UP,
      title: '⬆️ Level Up!',
      message: `Congratulations! You've reached level ${newLevel}!`,
      actionUrl: '/profile',
    })
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  async sendSubscriptionNotification(userId: string, tierName: string): Promise<any> {
    return this.create({
      userId,
      type: NotificationType.SUBSCRIPTION,
      title: '💎 Subscription Active',
      message: `Your ${tierName} subscription is now active. Enjoy premium features!`,
      actionUrl: '/subscription',
    })
  }
}

export const notificationService = new NotificationService()
export default notificationService
