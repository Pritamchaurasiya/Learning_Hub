import { Request, Response } from 'express'
import { subscriptionService } from '../services/SubscriptionService'
import { asyncHandler } from '../utils/errorHandler'
import { sendSuccess, sendError } from '../utils/responseHelper'

export const getTiers = asyncHandler(async (_req: Request, res: Response) => {
  const tiers = await subscriptionService.getTiers()
  sendSuccess(res, { tiers })
})

export const getMySubscription = asyncHandler(async (req: Request, res: Response) => {
  const userId = req.user?.userId
  if (!userId) {
    sendError(res, 'Authentication required', 401, 'NO_TOKEN')
    return
  }
  const subscription = await subscriptionService.getUserSubscription(userId)
  sendSuccess(res, { subscription })
})

export const createCheckout = asyncHandler(async (req: Request, res: Response) => {
  const userId = req.user?.userId
  if (!userId) {
    sendError(res, 'Authentication required', 401, 'NO_TOKEN')
    return
  }

  const tierId = req.body?.tierId
  if (!tierId || typeof tierId !== 'string') {
    sendError(res, 'tierId is required', 400, 'INVALID_INPUT')
    return
  }

  try {
    const result = await subscriptionService.createCheckout(userId, tierId)
    sendSuccess(res, result, 'Checkout initiated')
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Checkout failed'
    if (
      message.includes('already have') ||
      message.includes('Invalid or inactive')
    ) {
      sendError(res, message, 400, 'SUBSCRIPTION_RULE_VIOLATION')
      return
    }
    throw err
  }
})

export const cancelSubscription = asyncHandler(async (req: Request, res: Response) => {
  const userId = req.user?.userId
  if (!userId) {
    sendError(res, 'Authentication required', 401, 'NO_TOKEN')
    return
  }
  const result = await subscriptionService.cancelSubscription(userId)
  sendSuccess(res, { canceled: result }, 'Subscription cancellation processed')
})
