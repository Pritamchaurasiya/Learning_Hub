import { Router } from 'express'
import { authenticate } from '../../middleware/authMiddleware'
import { validate } from '../../middleware/validationMiddleware'
import { createRateLimiter } from '../../middleware/rateLimiter'
import { getBookmarks, createBookmark, deleteBookmark } from '../../controllers/bookmarksController'
import { createBookmarkSchema } from '../../validations/schemas'

const router = Router()

const bookmarkLimiter = createRateLimiter({
  windowMs: 60 * 1000,
  max: 30,
  keyPrefix: 'bookmark',
})

router.get('/', authenticate, getBookmarks)
router.post('/', authenticate, bookmarkLimiter, validate(createBookmarkSchema), createBookmark)
router.delete('/:courseId', authenticate, bookmarkLimiter, deleteBookmark)

export default router
