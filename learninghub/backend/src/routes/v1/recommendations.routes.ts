/**
 * Recommendation Routes
 *
 * Smart study recommendations, spaced repetition,
 * and improvement roadmaps.
 */

import { Router } from 'express'
import { authenticate } from '../../middleware/authMiddleware'
import { validate } from '../../middleware/validationMiddleware'
import {
  getRecommendationsSchema,
  getNextTestRecommendationSchema,
  getImprovementRoadmapSchema,
  getSpacedRepetitionSchema,
} from '../../validations/schemas'
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
router.get('/', validate(getRecommendationsSchema), getRecommendations)

// Next test recommendation (best tests for weak areas)
router.get('/next-test', validate(getNextTestRecommendationSchema), getNextTestRecommendation)

// Improvement roadmap (week-by-week plan)
router.get('/roadmap', validate(getImprovementRoadmapSchema), getImprovementRoadmap)

// Spaced repetition schedule (topics due for review)
router.get('/spaced-repetition', validate(getSpacedRepetitionSchema), getSpacedRepetition)

export default router
