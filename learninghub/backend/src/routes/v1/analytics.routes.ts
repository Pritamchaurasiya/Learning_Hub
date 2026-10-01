import { Router } from 'express'
import { authenticate } from '../../middleware/authMiddleware'
import { validate } from '../../middleware/validationMiddleware'
import { getLearningActivitySchema, getPerformanceTrendSchema } from '../../validations/schemas'
import {
  getLearnerDashboardStats,
  getLearningActivity,
  getPerformanceTrend,
  getWeakAreas,
} from '../../controllers/analyticsController'
import {
  getRecommendations,
  getSpacedRepetition,
} from '../../controllers/userAnalyticsController'

const router = Router()

router.get('/dashboard', authenticate, getLearnerDashboardStats)
router.get(
  '/learning-activity',
  authenticate,
  validate(getLearningActivitySchema),
  getLearningActivity
)
router.get(
  '/performance-trend',
  authenticate,
  validate(getPerformanceTrendSchema),
  getPerformanceTrend
)
router.get('/weak-areas', authenticate, getWeakAreas)
router.get('/recommendations', authenticate, getRecommendations)
router.get('/spaced-repetition', authenticate, getSpacedRepetition)

export default router
