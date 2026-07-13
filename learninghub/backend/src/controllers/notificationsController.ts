import { Request, Response } from 'express'
import { notificationService } from '../services/NotificationService'
import { asyncHandler } from '../utils/errorHandler'
import { sendSuccess, sendNotFound } from '../utils/responseHelper'

export const getNotifications = asyncHandler(async (req: Request, res: Response): Promise<void> => {
  const userId = req.user!.userId

  const page = parseInt((req.query.page as string) || '1', 10)
  const limit = parseInt((req.query.limit as string) || '20', 10)
  const isRead =
    req.query.isRead === 'true' ? true : req.query.isRead === 'false' ? false : undefined
  const type = req.query.type as string | undefined

  const result = await notificationService.getUserNotifications(userId, page, limit, {
    isRead,
    type,
  })

  sendSuccess(res, result.notifications, undefined, 200, {
    unreadCount: result.unreadCount,
    pagination: {
      page,
      limit,
      total: result.total,
      pages: Math.ceil(result.total / limit),
    },
  })
})

export const getUnreadCount = asyncHandler(async (req: Request, res: Response): Promise<void> => {
  const userId = req.user!.userId
  const count = await notificationService.getUnreadCount(userId)
  sendSuccess(res, { count })
})

export const markAsRead = asyncHandler(async (req: Request, res: Response): Promise<void> => {
  const userId = req.user!.userId
  const id = req.params.id as string

  try {
    const notification = await notificationService.markAsRead(id, userId)
    sendSuccess(res, notification)
  } catch {
    sendNotFound(res, 'Notification not found')
  }
})

export const markAllAsRead = asyncHandler(async (req: Request, res: Response): Promise<void> => {
  const userId = req.user!.userId
  const result = await notificationService.markAllAsRead(userId)
  sendSuccess(res, result)
})

export const deleteNotification = asyncHandler(
  async (req: Request, res: Response): Promise<void> => {
    const userId = req.user!.userId
    const id = req.params.id as string

    try {
      await notificationService.deleteNotification(id, userId)
      sendSuccess(res, null, 'Notification deleted')
    } catch {
      sendNotFound(res, 'Notification not found')
    }
  }
)
