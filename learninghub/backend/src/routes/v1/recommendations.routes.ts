/**
 * Recommendation Routes
 *
 * Smart study recommendations, spaced repetition,
 * and improvement roadmaps.
 */

import { Router } from 'express'
import { authenticate } from '../../middleware/authMiddleware'
import { asyncHandler } from '../../middleware/asyncHandler'
import {
  getRecommendations,
  getNextTestRecommendation,
  getImprovementRoadmap,
  getSpacedRepetition,
} from '../../controllers/userAnalyticsController'

const router = Router()

// All routes require authentication
router.use(authenticate)

// Study recommendations (prioritized topic suggestions)
router.get('/', asyncHandler(getRecommendations))

// Next test recommendation (best tests for weak areas)
router.get('/next-test', asyncHandler(getNextTestRecommendation))

// Improvement roadmap (week-by-week plan)
router.get('/roadmap', asyncHandler(getImprovementRoadmap))

// Spaced repetition schedule (topics due for review)
router.get('/spaced-repetition', asyncHandler(getSpacedRepetition))

export default router
