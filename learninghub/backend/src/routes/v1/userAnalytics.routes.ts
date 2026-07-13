/**
 * User Analytics & Recommendations Routes
 *
 * Per-user analytics, topic mastery, study recommendations,
 * and growth/level tracking.
 */

import { Router } from 'express'
import { authenticate } from '../../middleware/authMiddleware'
import { validate } from '../../middleware/validationMiddleware'
import {
  getMyAnalyticsSchema,
  getAccuracyTrendSchema,
  getGrowthMetricsSchema,
} from '../../validations/schemas'
import {
  getMyAnalytics,
  getAccuracyTrend,
  getTopicMastery,
  getGrowthMetrics,
  getLevelProgress,
} from '../../controllers/userAnalyticsController'

const router = Router()

// All routes require authentication
router.use(authenticate)

// ─── User Analytics ──────────────────────────────────────────────────────────

// Comprehensive dashboard analytics
router.get('/me', validate(getMyAnalyticsSchema), getMyAnalytics)

// Accuracy trend over time
router.get('/me/accuracy-trend', validate(getAccuracyTrendSchema), getAccuracyTrend)

// Topic mastery map (all topics with strength levels)
router.get('/me/topic-mastery', getTopicMastery)

// Growth metrics (comparing current vs previous period)
router.get('/me/growth', validate(getGrowthMetricsSchema), getGrowthMetrics)

// Level progress (XP, current level, progress to next)
router.get('/me/level', getLevelProgress)

export default router
