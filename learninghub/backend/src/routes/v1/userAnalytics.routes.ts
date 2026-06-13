/**
 * User Analytics & Recommendations Routes
 *
 * Per-user analytics, topic mastery, study recommendations,
 * and growth/level tracking.
 */

import { Router } from 'express'
import { authenticate } from '../../middleware/authMiddleware'
import { asyncHandler } from '../../middleware/asyncHandler'
import {
  getMyAnalytics,
  getAccuracyTrend,
  getTopicMastery,
  getGrowthMetrics,
  getRecommendations,
  getNextTestRecommendation,
  getImprovementRoadmap,
  getSpacedRepetition,
  getLevelProgress,
} from '../../controllers/userAnalyticsController'

const router = Router()

// All routes require authentication
router.use(authenticate)

// ─── User Analytics ──────────────────────────────────────────────────────────

// Comprehensive dashboard analytics
router.get('/me', asyncHandler(getMyAnalytics))

// Accuracy trend over time
router.get('/me/accuracy-trend', asyncHandler(getAccuracyTrend))

// Topic mastery map (all topics with strength levels)
router.get('/me/topic-mastery', asyncHandler(getTopicMastery))

// Growth metrics (comparing current vs previous period)
router.get('/me/growth', asyncHandler(getGrowthMetrics))

// Level progress (XP, current level, progress to next)
router.get('/me/level', asyncHandler(getLevelProgress))

export default router
