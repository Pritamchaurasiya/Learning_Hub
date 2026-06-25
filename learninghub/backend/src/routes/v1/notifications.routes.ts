import { Router } from 'express'
import { authenticate } from '../../middleware/authMiddleware'
import { validate } from '../../middleware/validationMiddleware'
import { createRateLimiter } from '../../middleware/rateLimiter'
import {
  getNotifications,
  getUnreadCount,
  markAsRead,
  markAllAsRead,
  deleteNotification,
} from '../../controllers/notificationsController'
import { markNotificationReadSchema } from '../../validations/schemas'

const router = Router()

const notifLimiter = createRateLimiter({
  windowMs: 60 * 1000,
  max: 60,
  keyPrefix: 'notifications',
})

router.get('/', authenticate, getNotifications)
router.get('/unread-count', authenticate, getUnreadCount)
router.patch(
  '/:id/read',
  authenticate,
  notifLimiter,
  validate(markNotificationReadSchema),
  markAsRead
)
router.post('/mark-all-read', authenticate, notifLimiter, markAllAsRead)
router.delete('/:id', authenticate, notifLimiter, deleteNotification)

export default router
