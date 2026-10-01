import { Router, Request, Response } from 'express'
import { authenticate, optionalAuth } from '../../middleware/authMiddleware'
import { asyncHandler } from '../../utils/errorHandler'
import { SearchController } from '../../controllers/searchController'
import { createRateLimiter } from '../../middleware/rateLimiter'

const router = Router()

const searchRateLimiter = createRateLimiter({
  windowMs: 60 * 1000, // 1 minute
  max: 30, // 30 requests per minute
  keyPrefix: 'search',
})

// All search routes
router.get(
  '/',
  optionalAuth,
  searchRateLimiter,
  asyncHandler(async (req: Request, res: Response) => {
    await SearchController.search(req, res)
  })
)

router.get(
  '/personalized',
  authenticate,
  searchRateLimiter,
  asyncHandler(async (req: Request, res: Response) => {
    await SearchController.personalizedSearch(req, res)
  })
)

router.get(
  '/suggestions',
  optionalAuth,
  searchRateLimiter,
  asyncHandler(async (req: Request, res: Response) => {
    await SearchController.getSuggestions(req, res)
  })
)

router.get(
  '/trending',
  optionalAuth,
  searchRateLimiter,
  asyncHandler(async (req: Request, res: Response) => {
    await SearchController.getTrending(req, res)
  })
)

router.post(
  '/click',
  authenticate,
  searchRateLimiter,
  asyncHandler(async (req: Request, res: Response) => {
    await SearchController.recordClick(req, res)
  })
)

router.get(
  '/suggestions/user',
  authenticate,
  searchRateLimiter,
  asyncHandler(async (req: Request, res: Response) => {
    await SearchController.getUserSuggestions(req, res)
  })
)

export default router