import { Router } from 'express'
import {
  getDuelProfile,
  enqueueDuel,
  leaveDuelQueue,
  getActiveDuel,
  getDuelMatchById,
  updateDuelProgress,
  submitDuelSolution,
  getDuelLeaderboard,
} from '../../controllers/duelController'
import { authenticate, optionalAuth } from '../../middleware/authMiddleware'
import { createRateLimiter } from '../../middleware/rateLimiter'

const router = Router()

const duelLimiter = createRateLimiter({
  windowMs: 60 * 1000,
  max: 60,
  keyPrefix: 'duel-api',
})

// Public / optional auth
router.get('/leaderboard', optionalAuth, getDuelLeaderboard)

// Authenticated Duel Player Endpoints
router.use(authenticate)
router.use(duelLimiter)

router.get('/profile', getDuelProfile)
router.get('/active', getActiveDuel)
router.post('/queue', enqueueDuel)
router.post('/leave-queue', leaveDuelQueue)
router.get('/match/:id', getDuelMatchById)
router.post('/match/:id/progress', updateDuelProgress)
router.post('/match/:id/submit', submitDuelSolution)

export default router
