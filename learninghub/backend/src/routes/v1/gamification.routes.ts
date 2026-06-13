import { Router } from 'express'
import { authenticate } from '../../middleware/authMiddleware'
import { cacheMiddleware } from '../../middleware/cacheMiddleware'
import { validate } from '../../middleware/validationMiddleware'
import {
  getLeaderboard,
  getAchievements,
  updateDailyGoal,
  getDsaStats,
  awardXp,
} from '../../controllers/gamificationController'
import { updateDailyGoalSchema } from '../../validations/schemas'

const router = Router()

router.get('/leaderboard', cacheMiddleware(300), getLeaderboard)
router.get('/achievements', authenticate, getAchievements)
router.put('/daily-goal', authenticate, validate(updateDailyGoalSchema), updateDailyGoal)
router.get('/dsa-stats', authenticate, getDsaStats)
router.patch('/award-xp', authenticate, awardXp)

export default router
