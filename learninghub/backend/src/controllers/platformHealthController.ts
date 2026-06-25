/**
 * Platform Health Controller
 *
 * Admin-only endpoints for platform health monitoring.
 */

import { Request, Response } from 'express'
import { platformHealthService } from '../services/PlatformHealthService'
import logger from '../utils/logger'

/**
 * GET /api/v1/admin/platform-health
 * Get comprehensive platform health metrics (admin only).
 */
export const getPlatformHealth = async (req: Request, res: Response) => {
  try {
    const health = await platformHealthService.getHealth()
    res.json({ status: 'success', data: health })
  } catch (error) {
    logger.error(
      '[PlatformHealthController] getPlatformHealth failed',
      error instanceof Error ? error : new Error(String(error))
    )
    res.status(500).json({ status: 'error', message: 'Failed to fetch platform health' })
  }
}

/**
 * GET /api/v1/admin/churn-risk
 * Get users at risk of churning (admin only).
 */
export const getChurnRiskUsers = async (req: Request, res: Response) => {
  try {
    const limit = Math.min(Math.max(parseInt(req.query.limit as string) || 20, 1), 100)
    const users = await platformHealthService.getChurnRiskUsers(limit)
    res.json({ status: 'success', data: users })
  } catch (error) {
    logger.error(
      '[PlatformHealthController] getChurnRiskUsers failed',
      error instanceof Error ? error : new Error(String(error))
    )
    res.status(500).json({ status: 'error', message: 'Failed to fetch churn risk data' })
  }
}
