import { Router } from 'express'
import { authenticate } from '../../middleware/authMiddleware'
import {
  getLearnerDashboardStats,
  getLearningActivity,
  getPerformanceTrend,
  getWeakAreas,
} from '../../controllers/analyticsController'

const router = Router()

router.get('/dashboard', authenticate, getLearnerDashboardStats)
router.get('/learning-activity', authenticate, getLearningActivity)
router.get('/performance-trend', authenticate, getPerformanceTrend)
router.get('/weak-areas', authenticate, getWeakAreas)

export default router
