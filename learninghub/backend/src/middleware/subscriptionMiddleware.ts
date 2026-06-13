import { Request, Response, NextFunction } from 'express'
import { subscriptionService } from '../services/SubscriptionService'
import { sendError } from '../utils/responseHelper'
import logger from '../utils/logger'

export const requirePremium = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const userId = req.user?.userId
    if (!userId) {
      sendError(res, 'Authentication required', 401, 'NO_TOKEN')
      return
    }

    const hasAccess = await subscriptionService.hasPremiumAccess(userId)
    if (!hasAccess) {
      sendError(res, 'Premium subscription required', 403, 'PREMIUM_REQUIRED')
      return
    }

    next()
  } catch (error) {
    logger.error(
      '[requirePremium] error',
      error instanceof Error ? error : new Error(String(error))
    )
    sendError(res, 'Internal server error', 500, 'INTERNAL_ERROR')
  }
}

export const checkUsageLimit = (
  limitType: 'testsTaken' | 'aiGenerations' | 'questionsAnswered'
) => {
  return async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const userId = req.user?.userId
      if (!userId) {
        sendError(res, 'Authentication required', 401, 'NO_TOKEN')
        return
      }

      const result = await subscriptionService.checkUsageLimit(userId, limitType)

      if (!result.allowed) {
        sendError(
          res,
          'Usage limit exceeded. Upgrade your plan for more.',
          429,
          'USAGE_LIMIT_EXCEEDED'
        )
        return
      }

      next()
    } catch (error) {
      logger.error(
        '[checkUsageLimit] error',
        error instanceof Error ? error : new Error(String(error))
      )
      sendError(res, 'Internal server error', 500, 'INTERNAL_ERROR')
    }
  }
}
