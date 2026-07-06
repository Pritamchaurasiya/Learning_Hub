/**
 * Platform Health Controller
 *
 * Admin-only endpoints for platform health monitoring.
 */

import { Request, Response } from 'express'
import { platformHealthService } from '../services/PlatformHealthService'
import logger from '../utils/logger'
import { sendSuccess, sendInternalError } from '../utils/responseHelper'

/**
 * GET /api/v1/admin/platform-health
 * Get comprehensive platform health metrics (admin only).
 */
export const getPlatformHealth = async (req: Request, res: Response) => {
  try {
    const health = await platformHealthService.getHealth()
    sendSuccess(res, health)
  } catch (error) {
    logger.error(
      '[PlatformHealthController] getPlatformHealth failed',
      error instanceof Error ? error : new Error(String(error))
    )
    sendInternalError(res, 'Failed to fetch platform health')
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
    sendSuccess(res, users)
  } catch (error) {
    logger.error(
      '[PlatformHealthController] getChurnRiskUsers failed',
      error instanceof Error ? error : new Error(String(error))
    )
    sendInternalError(res, 'Failed to fetch churn risk data')
  }
}
