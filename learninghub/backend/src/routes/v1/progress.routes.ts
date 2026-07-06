import { Router } from 'express'
import { authenticate } from '../../middleware/authMiddleware'
import { validate } from '../../middleware/validationMiddleware'
import { createRateLimiter } from '../../middleware/rateLimiter'
import { completeCourse, toggleBookmark, updateStreak } from '../../controllers/progressController'
import { completeCourseSchema, bookmarkSchema } from '../../validations/schemas'

const router = Router()

const progressLimiter = createRateLimiter({
  windowMs: 60 * 1000,
  max: 30,
  keyPrefix: 'progress',
})

router.post(
  '/complete-course',
  authenticate,
  progressLimiter,
  validate(completeCourseSchema),
  completeCourse
)
router.post('/bookmark', authenticate, progressLimiter, validate(bookmarkSchema), toggleBookmark)
router.post('/update-streak', authenticate, progressLimiter, updateStreak)

export default router
