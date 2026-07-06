/**
 * User Analytics Controller
 *
 * Endpoints for per-user analytics and recommendations.
 */

import { Request, Response } from 'express'
import { userAnalyticsService } from '../services/UserAnalyticsService'
import { recommendationService } from '../services/RecommendationService'
import { growthEngineService } from '../services/GrowthEngineService'
import { topicPerformanceService } from '../services/TopicPerformanceService'
import logger from '../utils/logger'
import { sendSuccess, sendInternalError, sendUnauthorized } from '../utils/responseHelper'

/**
 * GET /api/v1/analytics/me
 * Get comprehensive dashboard analytics for the authenticated user.
 */
export const getMyAnalytics = async (req: Request, res: Response) => {
  try {
    const userId = req.user?.userId
    if (!userId) {
      sendUnauthorized(res)
      return
    }

    const days = Math.min(Math.max(parseInt(req.query.days as string) || 30, 1), 365)
    const analytics = await userAnalyticsService.getDashboardAnalytics(userId, days)

    sendSuccess(res, analytics)
  } catch (error) {
    logger.error(
      '[UserAnalyticsController] getMyAnalytics failed',
      error instanceof Error ? error : new Error(String(error))
    )
    sendInternalError(res, 'Failed to fetch analytics')
  }
}

/**
 * GET /api/v1/analytics/me/accuracy-trend
 * Get accuracy trend over time.
 */
export const getAccuracyTrend = async (req: Request, res: Response) => {
  try {
    const userId = req.user?.userId
    if (!userId) {
      sendUnauthorized(res)
      return
    }

    const days = Math.min(Math.max(parseInt(req.query.days as string) || 30, 1), 365)
    const trend = await userAnalyticsService.getAccuracyTrend(userId, days)

    sendSuccess(res, trend)
  } catch (error) {
    logger.error(
      '[UserAnalyticsController] getAccuracyTrend failed',
      error instanceof Error ? error : new Error(String(error))
    )
    sendInternalError(res, 'Failed to fetch accuracy trend')
  }
}

/**
 * GET /api/v1/analytics/me/topic-mastery
 * Get full topic mastery map.
 */
export const getTopicMastery = async (req: Request, res: Response) => {
  try {
    const userId = req.user?.userId
    if (!userId) {
      sendUnauthorized(res)
      return
    }

    const mastery = await topicPerformanceService.getTopicMasteryMap(userId)
    sendSuccess(res, mastery)
  } catch (error) {
    logger.error(
      '[UserAnalyticsController] getTopicMastery failed',
      error instanceof Error ? error : new Error(String(error))
    )
    sendInternalError(res, 'Failed to fetch topic mastery')
  }
}

/**
 * GET /api/v1/analytics/me/growth
 * Get growth metrics comparing current period to previous.
 */
export const getGrowthMetrics = async (req: Request, res: Response) => {
  try {
    const userId = req.user?.userId
    if (!userId) {
      sendUnauthorized(res)
      return
    }

    const days = Math.min(Math.max(parseInt(req.query.days as string) || 30, 1), 365)
    const growth = await userAnalyticsService.getGrowthMetrics(userId, days)

    sendSuccess(res, growth)
  } catch (error) {
    logger.error(
      '[UserAnalyticsController] getGrowthMetrics failed',
      error instanceof Error ? error : new Error(String(error))
    )
    sendInternalError(res, 'Failed to fetch growth metrics')
  }
}

/**
 * GET /api/v1/recommendations
 * Get study recommendations for the authenticated user.
 */
export const getRecommendations = async (req: Request, res: Response) => {
  try {
    const userId = req.user?.userId
    if (!userId) {
      sendUnauthorized(res)
      return
    }

    const limit = Math.min(Math.max(parseInt(req.query.limit as string) || 10, 1), 50)
    const recommendations = await recommendationService.getStudyRecommendations(userId, limit)

    sendSuccess(res, recommendations)
  } catch (error) {
    logger.error(
      '[UserAnalyticsController] getRecommendations failed',
      error instanceof Error ? error : new Error(String(error))
    )
    sendInternalError(res, 'Failed to fetch recommendations')
  }
}

/**
 * GET /api/v1/recommendations/next-test
 * Get recommended tests for the user.
 */
export const getNextTestRecommendation = async (req: Request, res: Response) => {
  try {
    const userId = req.user?.userId
    if (!userId) {
      sendUnauthorized(res)
      return
    }

    const limit = Math.min(Math.max(parseInt(req.query.limit as string) || 5, 1), 20)
    const recommendations = await recommendationService.getNextTestRecommendation(userId, limit)

    sendSuccess(res, recommendations)
  } catch (error) {
    logger.error(
      '[UserAnalyticsController] getNextTestRecommendation failed',
      error instanceof Error ? error : new Error(String(error))
    )
    sendInternalError(res, 'Failed to fetch test recommendations')
  }
}

/**
 * GET /api/v1/recommendations/roadmap
 * Get improvement roadmap for the user.
 */
export const getImprovementRoadmap = async (req: Request, res: Response) => {
  try {
    const userId = req.user?.userId
    if (!userId) {
      sendUnauthorized(res)
      return
    }

    const weeks = Math.min(Math.max(parseInt(req.query.weeks as string) || 4, 1), 12)
    const roadmap = await recommendationService.getImprovementRoadmap(userId, weeks)

    sendSuccess(res, roadmap)
  } catch (error) {
    logger.error(
      '[UserAnalyticsController] getImprovementRoadmap failed',
      error instanceof Error ? error : new Error(String(error))
    )
    sendInternalError(res, 'Failed to generate roadmap')
  }
}

/**
 * GET /api/v1/recommendations/spaced-repetition
 * Get spaced repetition recommendations.
 */
export const getSpacedRepetition = async (req: Request, res: Response) => {
  try {
    const userId = req.user?.userId
    if (!userId) {
      sendUnauthorized(res)
      return
    }

    const limit = Math.min(Math.max(parseInt(req.query.limit as string) || 5, 1), 20)
    const recommendations = await recommendationService.getSpacedRepetitionRecommendations(
      userId,
      limit
    )

    sendSuccess(res, recommendations)
  } catch (error) {
    logger.error(
      '[UserAnalyticsController] getSpacedRepetition failed',
      error instanceof Error ? error : new Error(String(error))
    )
    sendInternalError(res, 'Failed to fetch review schedule')
  }
}

/**
 * GET /api/v1/growth/level
 * Get level progress for the authenticated user.
 */
export const getLevelProgress = async (req: Request, res: Response) => {
  try {
    const userId = req.user?.userId
    if (!userId) {
      sendUnauthorized(res)
      return
    }

    const progress = await growthEngineService.getLevelProgress(userId)
    sendSuccess(res, progress)
  } catch (error) {
    logger.error(
      '[UserAnalyticsController] getLevelProgress failed',
      error instanceof Error ? error : new Error(String(error))
    )
    sendInternalError(res, 'Failed to fetch level progress')
  }
}
