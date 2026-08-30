/**
 * User Analytics Controller
 *
 * Endpoints for per-user analytics and recommendations.
 */

import { Request, Response } from 'express'
import { prisma } from '../prismaClient'
import { userAnalyticsService } from '../services/UserAnalyticsService'
import { recommendationService } from '../services/RecommendationService'
import { growthEngineService } from '../services/GrowthEngineService'
import { topicPerformanceService } from '../services/TopicPerformanceService'
import { asyncHandler } from '../utils/errorHandler'
import { sendSuccess } from '../utils/responseHelper'

/**
 * GET /api/v1/analytics/me
 * Get comprehensive dashboard analytics for the authenticated user.
 */
export const getMyAnalytics = asyncHandler(async (req: Request, res: Response) => {
  const userId = req.user!.userId
  const days = Math.min(Math.max(parseInt(req.query.days as string) || 30, 1), 365)
  const analytics = await userAnalyticsService.getDashboardAnalytics(userId, days)

  sendSuccess(res, analytics)
})

/**
 * GET /api/v1/analytics/me/accuracy-trend
 * Get accuracy trend over time.
 */
export const getAccuracyTrend = asyncHandler(async (req: Request, res: Response) => {
  const userId = req.user!.userId

  const userPref = await prisma.userExamPreference.findUnique({
    where: { userId },
    select: { examId: true },
  })
  const targetExamId = userPref?.examId ?? undefined

  const days = Math.min(Math.max(parseInt(req.query.days as string) || 30, 1), 365)
  const trend = await userAnalyticsService.getAccuracyTrend(userId, days, targetExamId)

  sendSuccess(res, trend)
})

/**
 * GET /api/v1/analytics/me/topic-mastery
 * Get full topic mastery map.
 */
export const getTopicMastery = asyncHandler(async (req: Request, res: Response) => {
  const userId = req.user!.userId
  const mastery = await topicPerformanceService.getTopicMasteryMap(userId)
  sendSuccess(res, mastery)
})

/**
 * GET /api/v1/analytics/me/growth
 * Get growth metrics comparing current period to previous.
 */
export const getGrowthMetrics = asyncHandler(async (req: Request, res: Response) => {
  const userId = req.user!.userId

  const userPref = await prisma.userExamPreference.findUnique({
    where: { userId },
    select: { examId: true },
  })
  const targetExamId = userPref?.examId ?? undefined

  const days = Math.min(Math.max(parseInt(req.query.days as string) || 30, 1), 365)
  const growth = await userAnalyticsService.getGrowthMetrics(userId, days, targetExamId)

  sendSuccess(res, growth)
})

/**
 * GET /api/v1/recommendations
 * Get study recommendations for the authenticated user.
 */
export const getRecommendations = asyncHandler(async (req: Request, res: Response) => {
  const userId = req.user!.userId
  const limit = Math.min(Math.max(parseInt(req.query.limit as string) || 10, 1), 50)
  const recommendations = await recommendationService.getStudyRecommendations(userId, limit)

  sendSuccess(res, recommendations)
})

/**
 * GET /api/v1/recommendations/next-test
 * Get recommended tests for the user.
 */
export const getNextTestRecommendation = asyncHandler(async (req: Request, res: Response) => {
  const userId = req.user!.userId
  const limit = Math.min(Math.max(parseInt(req.query.limit as string) || 5, 1), 20)
  const recommendations = await recommendationService.getNextTestRecommendation(userId, limit)

  sendSuccess(res, recommendations)
})

/**
 * GET /api/v1/recommendations/roadmap
 * Get improvement roadmap for the user.
 */
export const getImprovementRoadmap = asyncHandler(async (req: Request, res: Response) => {
  const userId = req.user!.userId
  const weeks = Math.min(Math.max(parseInt(req.query.weeks as string) || 4, 1), 12)
  const roadmap = await recommendationService.getImprovementRoadmap(userId, weeks)

  sendSuccess(res, roadmap)
})

/**
 * GET /api/v1/recommendations/spaced-repetition
 * Get spaced repetition recommendations.
 */
export const getSpacedRepetition = asyncHandler(async (req: Request, res: Response) => {
  const userId = req.user!.userId
  const limit = Math.min(Math.max(parseInt(req.query.limit as string) || 5, 1), 20)
  const recommendations = await recommendationService.getSpacedRepetitionRecommendations(
    userId,
    limit
  )

  sendSuccess(res, recommendations)
})

/**
 * GET /api/v1/growth/level
 * Get level progress for the authenticated user.
 */
export const getLevelProgress = asyncHandler(async (req: Request, res: Response) => {
  const userId = req.user!.userId
  const progress = await growthEngineService.getLevelProgress(userId)
  sendSuccess(res, progress)
})
