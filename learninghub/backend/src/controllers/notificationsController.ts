import { Request, Response } from 'express'
import { notificationService } from '../services/NotificationService'
import logger from '../utils/logger'

export const getNotifications = async (req: Request, res: Response): Promise<void> => {
  try {
    const userId = (req as any).user?.userId
    if (!userId) {
      res.status(401).json({ status: 'error', message: 'Authentication required' })
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

    res.json({
      status: 'success',
      data: result.notifications,
      pagination: {
        page,
        limit,
        total: result.total,
        pages: Math.ceil(result.total / limit),
      },
      meta: {
        unreadCount: result.unreadCount,
      },
    })
  } catch (error) {
    logger.error(
      '[NotificationsController] getNotifications error',
      error instanceof Error ? error : new Error(String(error))
    )
    res.status(500).json({ status: 'error', message: 'Internal server error' })
  }
}

export const getUnreadCount = async (req: Request, res: Response): Promise<void> => {
  try {
    const userId = (req as any).user?.userId
    if (!userId) {
      res.status(401).json({ status: 'error', message: 'Authentication required' })
      return
    }

    const count = await notificationService.getUnreadCount(userId)

    res.json({
      status: 'success',
      data: { count },
    })
  } catch (error) {
    logger.error(
      '[NotificationsController] getUnreadCount error',
      error instanceof Error ? error : new Error(String(error))
    )
    res.status(500).json({ status: 'error', message: 'Internal server error' })
  }
}

export const markAsRead = async (req: Request, res: Response): Promise<void> => {
  try {
    const userId = (req as any).user?.userId
    if (!userId) {
      res.status(401).json({ status: 'error', message: 'Authentication required' })
      return
    }

    const id = req.params.id as string

    const notification = await notificationService.markAsRead(id, userId)

    res.json({
      status: 'success',
      data: notification,
    })
  } catch (error) {
    logger.error(
      '[NotificationsController] markAsRead error',
      error instanceof Error ? error : new Error(String(error))
    )
    res.status(404).json({ status: 'error', message: 'Notification not found' })
  }
}

export const markAllAsRead = async (req: Request, res: Response): Promise<void> => {
  try {
    const userId = (req as any).user?.userId
    if (!userId) {
      res.status(401).json({ status: 'error', message: 'Authentication required' })
      return
    }

    const result = await notificationService.markAllAsRead(userId)

    res.json({
      status: 'success',
      data: result,
    })
  } catch (error) {
    logger.error(
      '[NotificationsController] markAllAsRead error',
      error instanceof Error ? error : new Error(String(error))
    )
    res.status(500).json({ status: 'error', message: 'Internal server error' })
  }
}

export const deleteNotification = async (req: Request, res: Response): Promise<void> => {
  try {
    const userId = (req as any).user?.userId
    if (!userId) {
      res.status(401).json({ status: 'error', message: 'Authentication required' })
      return
    }

    const id = req.params.id as string

    await notificationService.deleteNotification(id, userId)

    res.json({
      status: 'success',
      message: 'Notification deleted',
    })
  } catch (error) {
    logger.error(
      '[NotificationsController] deleteNotification error',
      error instanceof Error ? error : new Error(String(error))
    )
    res.status(404).json({ status: 'error', message: 'Notification not found' })
  }
}
