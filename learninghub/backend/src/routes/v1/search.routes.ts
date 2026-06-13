import { Router } from 'express'
import { authenticate } from '../../middleware/authMiddleware'
import { validate } from '../../middleware/validationMiddleware'
import { createRateLimiter } from '../../middleware/rateLimiter'
import { cacheMiddleware } from '../../middleware/cacheMiddleware'
import { searchContent } from '../../controllers/searchController'
import { searchSchema } from '../../validations/schemas'

const router = Router()

const searchLimiter = createRateLimiter({
  windowMs: 60 * 1000,
  max: 60,
  keyPrefix: 'search',
})

router.get('/', authenticate, searchLimiter, validate(searchSchema), searchContent)
router.get('/suggestions', authenticate, searchLimiter, validate(searchSchema), searchContent)
router.get('/trending', cacheMiddleware(600), searchContent)

export default router
