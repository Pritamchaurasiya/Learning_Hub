/**
 * NotificationService — Unit Tests
 * Tests the notification service
 */
jest.mock('../../src/config/database', () => ({
  prisma: {
    notification: {
      create: jest.fn(),
      findMany: jest.fn(),
      findUnique: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
      count: jest.fn(),
      updateMany: jest.fn(),
    },
    user: {
      findUnique: jest.fn(),
    },
  },
}))

jest.mock('../../src/services/CacheService', () => ({
  cacheService: {
    generateKey: jest.fn().mockReturnValue('mock-key'),
    invalidatePattern: jest.fn().mockResolvedValue(true),
    delete: jest.fn().mockResolvedValue(true),
  },
}))

jest.mock('../../src/utils/logger', () => ({
  info: jest.fn(),
  warn: jest.fn(),
  error: jest.fn(),
  debug: jest.fn(),
}))

import { prisma } from '../../src/config/database'
import { NotificationService } from '../../src/services/NotificationService'

describe('NotificationService', () => {
  let notificationService: NotificationService

  beforeEach(() => {
    jest.clearAllMocks()
    notificationService = new NotificationService()
  })

  describe('create', () => {
    it('should create a notification', async () => {
      const mockNotification = {
        id: 'notif-1',
        userId: 'user-1',
        type: 'INFO',
        title: 'Test',
        message: 'Test message',
        actionUrl: null,
        isRead: false,
        createdAt: new Date(),
      }
      ;(prisma.notification.create as jest.Mock).mockResolvedValue(mockNotification)

      const result = await notificationService.create({
        userId: 'user-1',
        type: 'INFO',
        title: 'Test',
        message: 'Test message',
      })

      expect(result).toEqual(mockNotification)
      expect(prisma.notification.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            userId: 'user-1',
            type: 'INFO',
            title: 'Test',
            message: 'Test message',
          }),
        })
      )
    })

    it('should handle missing userId gracefully (passes to Prisma)', async () => {
      const mockNotification = {
        id: 'notif-1',
        userId: 'user-1', // Prisma returns this from mock
        type: 'INFO',
        title: 'Test',
        message: 'Test message',
        actionUrl: null,
        isRead: false,
        createdAt: new Date(),
      }
      ;(prisma.notification.create as jest.Mock).mockResolvedValue(mockNotification)

      const result = await notificationService.create({
        type: 'INFO',
        title: 'Test',
        message: 'Test message',
      } as any)

      expect(result).toEqual(mockNotification)
    })
  })

  describe('getUserNotifications', () => {
    it('should return paginated notifications', async () => {
      const mockNotifications = [
        { id: 'notif-1', userId: 'user-1', type: 'INFO', title: 'Test 1', isRead: false },
        { id: 'notif-2', userId: 'user-1', type: 'SUCCESS', title: 'Test 2', isRead: false },
      ]
      ;(prisma.notification.findMany as jest.Mock).mockResolvedValue(mockNotifications)
      ;(prisma.notification.count as jest.Mock).mockResolvedValue(2)

      const result = await notificationService.getUserNotifications('user-1', { page: 1, limit: 10 })

      expect(result.notifications).toEqual(mockNotifications)
      expect(result.total).toBe(2)
    })
  })

  describe('markAsRead', () => {
    it('should mark notification as read', async () => {
      const mockNotification = { id: 'notif-1', isRead: true }
      ;(prisma.notification.update as jest.Mock).mockResolvedValue(mockNotification)

      const result = await notificationService.markAsRead('notif-1')

      expect(result.isRead).toBe(true)
      expect(prisma.notification.update).toHaveBeenCalledWith({
        where: { id: 'notif-1' },
        data: { isRead: true },
      })
    })
  })

  describe('markAllAsRead', () => {
    it('should mark all user notifications as read', async () => {
      ;(prisma.notification.updateMany as jest.Mock).mockResolvedValue({ count: 5 })

      const result = await notificationService.markAllAsRead('user-1')

      expect(result.count).toBe(5)
      expect(prisma.notification.updateMany).toHaveBeenCalledWith({
        where: { userId: 'user-1', isRead: false },
        data: { isRead: true },
      })
    })
  })

  describe('deleteNotification', () => {
    it('should delete notification', async () => {
      const mockNotification = { id: 'notif-1', userId: 'user-1' }
      ;(prisma.notification.findUnique as jest.Mock).mockResolvedValue(mockNotification)
      ;(prisma.notification.delete as jest.Mock).mockResolvedValue({ id: 'notif-1' })

      await notificationService.deleteNotification('notif-1', 'user-1')

      expect(prisma.notification.delete).toHaveBeenCalledWith({ where: { id: 'notif-1' } })
    })
  })

  describe('getUnreadCount', () => {
    it('should return unread count', async () => {
      ;(prisma.notification.count as jest.Mock).mockResolvedValue(3)

      const result = await notificationService.getUnreadCount('user-1')

      expect(result).toBe(3)
      expect(prisma.notification.count).toHaveBeenCalledWith({
        where: { userId: 'user-1', isRead: false },
      })
    })
  })
})