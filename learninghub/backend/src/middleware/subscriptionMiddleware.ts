import { Request, Response, NextFunction } from 'express'
import { subscriptionService } from '../services/SubscriptionService'
import logger from '../utils/logger'

/**
 * Middleware to require premium subscription.
 */
export const requirePremium = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const userId = req.user?.userId
    if (!userId) {
      res.status(401).json({ status: 'error', message: 'Authentication required' })
      return
    }

    const hasAccess = await subscriptionService.hasPremiumAccess(userId)
    if (!hasAccess) {
      res.status(403).json({
        status: 'error',
        message: 'Premium subscription required',
        code: 'PREMIUM_REQUIRED',
      })
      return
    }

    next()
  } catch (error) {
    logger.error(
      '[requirePremium] error',
      error instanceof Error ? error : new Error(String(error))
    )
    res.status(500).json({ status: 'error', message: 'Internal server error' })
  }
}

/**
 * Middleware to check usage limits.
 * @param limitType - The type of usage limit to check
 */
export const checkUsageLimit = (
  limitType: 'testsTaken' | 'aiGenerations' | 'questionsAnswered'
) => {
  return async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const userId = req.user?.userId
      if (!userId) {
        res.status(401).json({ status: 'error', message: 'Authentication required' })
        return
      }

      const result = await subscriptionService.checkUsageLimit(userId, limitType)

      if (!result.allowed) {
        res.status(429).json({
          status: 'error',
          message: 'Usage limit exceeded. Upgrade your plan for more.',
          code: 'USAGE_LIMIT_EXCEEDED',
          data: {
            current: result.current,
            limit: result.limit,
          },
        })
        return
      }

      // Attach limit info to request for downstream use
      // req.usageLimit = result
      next()
    } catch (error) {
      logger.error(
        '[checkUsageLimit] error',
        error instanceof Error ? error : new Error(String(error))
      )
      res.status(500).json({ status: 'error', message: 'Internal server error' })
    }
  }
}
