import { Request, Response } from 'express'
import logger from '../utils/logger'
import { queryOptimizationService } from '../services/QueryOptimizationService'
import { aiTestService } from '../services/AITestService'

/**
 * GET /api/v1/analytics/performance-trend
 * Get user's performance trend over time for chart visualization.
 */
export const getPerformanceTrend = async (req: Request, res: Response): Promise<void> => {
  try {
    const userId = req.user?.userId
    if (!userId) {
      res.status(401).json({ status: 'error', message: 'Authentication required' })
      return
    }

    const days = req.query.days ? parseInt(req.query.days as string) : 30
    const trend = await queryOptimizationService.getPerformanceTrend(userId, days)

    res.json({ status: 'success', data: trend })
  } catch (error) {
    logger.error(
      '[AnalyticsController] getPerformanceTrend error',
      error instanceof Error ? error : new Error(String(error)),
      { userId: req.user?.userId }
    )
    res.status(500).json({ status: 'error', message: 'Internal server error' })
  }
}

/**
 * GET /api/v1/analytics/weak-areas
 * Get user's weak areas for targeted practice.
 */
export const getWeakAreas = async (req: Request, res: Response): Promise<void> => {
  try {
    const userId = req.user?.userId
    if (!userId) {
      res.status(401).json({ status: 'error', message: 'Authentication required' })
      return
    }

    const weakTopics = await aiTestService.getWeakTopics(userId)

    res.json({ status: 'success', data: { weak_areas: weakTopics } })
  } catch (error) {
    logger.error(
      '[AnalyticsController] getWeakAreas error',
      error instanceof Error ? error : new Error(String(error)),
      { userId: req.user?.userId }
    )
    res.status(500).json({ status: 'error', message: 'Internal server error' })
  }
}
