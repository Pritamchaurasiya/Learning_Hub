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

export default router
