import { Router } from 'express'
import { authenticate, authorizeAdmin } from '../../middleware/authMiddleware'
import { redisCacheMiddleware as cacheMiddleware } from '../../middleware/redisCacheMiddleware'
import { validate } from '../../middleware/validationMiddleware'
import { createRateLimiter } from '../../middleware/rateLimiter'
import {
  getLeaderboard,
  getAchievements,
  updateDailyGoal,
  getDsaStats,
  awardXp,
  checkBadges,
} from '../../controllers/gamificationController'
import { updateDailyGoalSchema } from '../../validations/schemas'

const router = Router()

const xpRateLimiter = createRateLimiter({
  windowMs: 60 * 1000,
  max: 10,
  keyPrefix: 'xp-award',
})

router.get('/leaderboard', cacheMiddleware(300), getLeaderboard)
router.get('/achievements', authenticate, getAchievements)
router.post('/check', authenticate, checkBadges)
router.put('/daily-goal', authenticate, validate(updateDailyGoalSchema), updateDailyGoal)
router.get('/dsa-stats', authenticate, getDsaStats)
router.patch('/award-xp', authenticate, authorizeAdmin, xpRateLimiter, awardXp)

export default router
