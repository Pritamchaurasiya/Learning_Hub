/**
 * Platform Health Controller
 *
 * Admin-only endpoints for platform health monitoring.
 */

import { Request, Response } from 'express'
import { platformHealthService } from '../services/PlatformHealthService'
import { asyncHandler } from '../utils/errorHandler'
import { sendSuccess } from '../utils/responseHelper'

/**
 * GET /api/v1/admin/platform-health
 * Get comprehensive platform health metrics (admin only).
 */
export const getPlatformHealth = asyncHandler(async (req: Request, res: Response) => {
  const health = await platformHealthService.getHealth()
  sendSuccess(res, health)
})

/**
 * GET /api/v1/admin/churn-risk
 * Get users at risk of churning (admin only).
 */
export const getChurnRiskUsers = asyncHandler(async (req: Request, res: Response) => {
  const limit = Math.min(Math.max(parseInt(req.query.limit as string) || 20, 1), 100)
  const users = await platformHealthService.getChurnRiskUsers(limit)
  sendSuccess(res, users)
})
