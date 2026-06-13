import { Request, Response } from 'express'
import { notificationService } from '../services/NotificationService'
import logger from '../utils/logger'
import {
  sendSuccess,
  sendUnauthorized,
  sendNotFound,
  sendInternalError,
} from '../utils/responseHelper'

export const getNotifications = async (req: Request, res: Response): Promise<void> => {
  try {
    const userId = req.user?.userId
    if (!userId) {
      sendUnauthorized(res)
      return
    }

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
  } catch (error) {
    logger.error(
      '[NotificationsController] getNotifications error',
      error instanceof Error ? error : new Error(String(error))
    )
    sendInternalError(res)
  }
}

export const getUnreadCount = async (req: Request, res: Response): Promise<void> => {
  try {
    const userId = req.user?.userId
    if (!userId) {
      sendUnauthorized(res)
      return
    }

    const count = await notificationService.getUnreadCount(userId)

    sendSuccess(res, { count })
  } catch (error) {
    logger.error(
      '[NotificationsController] getUnreadCount error',
      error instanceof Error ? error : new Error(String(error))
    )
    sendInternalError(res)
  }
}

export const markAsRead = async (req: Request, res: Response): Promise<void> => {
  try {
    const userId = req.user?.userId
    if (!userId) {
      sendUnauthorized(res)
      return
    }

    const id = req.params.id as string

    const notification = await notificationService.markAsRead(id, userId)

    sendSuccess(res, notification)
  } catch (error) {
    logger.error(
      '[NotificationsController] markAsRead error',
      error instanceof Error ? error : new Error(String(error))
    )
    sendNotFound(res, 'Notification not found')
  }
}

export const markAllAsRead = async (req: Request, res: Response): Promise<void> => {
  try {
    const userId = req.user?.userId
    if (!userId) {
      sendUnauthorized(res)
      return
    }

    const result = await notificationService.markAllAsRead(userId)

    sendSuccess(res, result)
  } catch (error) {
    logger.error(
      '[NotificationsController] markAllAsRead error',
      error instanceof Error ? error : new Error(String(error))
    )
    sendInternalError(res)
  }
}

export const deleteNotification = async (req: Request, res: Response): Promise<void> => {
  try {
    const userId = req.user?.userId
    if (!userId) {
      sendUnauthorized(res)
      return
    }

    const id = req.params.id as string

    await notificationService.deleteNotification(id, userId)

    sendSuccess(res, null, 'Notification deleted')
  } catch (error) {
    logger.error(
      '[NotificationsController] deleteNotification error',
      error instanceof Error ? error : new Error(String(error))
    )
    sendNotFound(res, 'Notification not found')
  }
}
