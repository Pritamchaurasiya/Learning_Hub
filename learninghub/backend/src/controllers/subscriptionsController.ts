import { Request, Response } from 'express'
import logger from '../utils/logger'
import { subscriptionService } from '../services/SubscriptionService'
import {
  sendSuccess,
  sendCreated,
  sendUnauthorized,
  sendNotFound,
  sendValidationError,
  sendInternalError,
} from '../utils/responseHelper'

/**
 * GET /api/v1/subscriptions/tiers
 * Get all available subscription tiers.
 */
export const getTiers = async (_req: Request, res: Response): Promise<void> => {
  try {
    const tiers = await subscriptionService.getTiers()

    sendSuccess(res, {
      tiers: tiers.map(t => ({
        id: t.id,
        name: t.name,
        display_name: t.displayName,
        description: t.description,
        price: Number(t.price),
        currency: t.currency,
        interval: t.interval,
        trial_days: t.trialDays,
        features: t.features,
        limits: t.limits,
      })),
    })
  } catch (error) {
    logger.error(
      '[Subscriptions] getTiers error',
      error instanceof Error ? error : new Error(String(error))
    )
    sendInternalError(res, 'Internal server error')
  }
}

/**
 * GET /api/v1/subscriptions/me
 * Get current user's subscription.
 */
export const getMySubscription = async (req: Request, res: Response): Promise<void> => {
  try {
    const userId = req.user?.userId
    if (!userId) {
      sendUnauthorized(res, 'Authentication required')
      return
    }

    const subscription = await subscriptionService.getUserSubscription(userId)

    if (!subscription) {
      sendSuccess(res, {
        active: false,
        tier: 'free',
        limits: {
          tests_per_day: 3,
          ai_generations_per_day: 2,
          questions_per_day: 50,
        },
      })
      return
    }

    sendSuccess(res, {
      active: subscription.status === 'ACTIVE' || subscription.status === 'TRIAL',
      tier: subscription.tier.name,
      display_name: subscription.tier.displayName,
      status: subscription.status,
      price: Number(subscription.tier.price),
      interval: subscription.tier.interval,
      trial_ends_at: subscription.trialEndsAt,
      current_period_end: subscription.currentPeriodEnd,
      limits: subscription.tier.limits,
      usage: subscription.usageLimits[0] ?? null,
    })
  } catch (error) {
    logger.error(
      '[Subscriptions] getMySubscription error',
      error instanceof Error ? error : new Error(String(error))
    )
    sendInternalError(res, 'Internal server error')
  }
}

/**
 * POST /api/v1/subscriptions/create
 * Create a new subscription.
 */
export const createSubscription = async (req: Request, res: Response): Promise<void> => {
  try {
    const userId = req.user?.userId
    if (!userId) {
      sendUnauthorized(res, 'Authentication required')
      return
    }

    const { tier_id, coupon_code } = req.body

    if (!tier_id) {
      sendValidationError(res, 'tier_id is required')
      return
    }

    // Validate coupon if provided
    if (coupon_code) {
      const couponResult = await subscriptionService.validateCoupon(coupon_code, tier_id)
      if (!couponResult.valid) {
        sendValidationError(res, couponResult.message ?? 'Invalid coupon')
        return
      }
    }

    const tier = await subscriptionService.getTiers()
    const selectedTier = tier.find(t => t.id === tier_id)
    if (!selectedTier) {
      sendNotFound(res, 'Tier not found')
      return
    }

    if (Number(selectedTier.price) === 0) {
      // Free tier, just create it directly
      const subscription = await subscriptionService.createSubscription({
        userId,
        tierId: tier_id,
        trialDays: selectedTier.trialDays,
      })

      if (coupon_code) {
        await subscriptionService.applyCoupon(coupon_code)
      }

      sendCreated(res, {
        id: subscription.id,
        tier: subscription.tier.name,
        status: subscription.status,
        checkoutUrl: null
      }, 'Subscription created')
      return
    }

    // Call PaymentService to create a Stripe checkout session for paid tiers
    const FRONTEND_URL = process.env.FRONTEND_URL || 'http://localhost:5173'
    
    // Lazy-load PaymentService to avoid circular dependency
    const { PaymentService } = require('../services/PaymentService')
    
    let checkoutUrl = null
    try {
      const session = await PaymentService.createSubscriptionCheckoutSession({
        userId,
        tierId: tier_id,
        amount: Number(selectedTier.price),
        currency: selectedTier.currency || 'usd',
        tierName: selectedTier.name,
        successUrl: `${FRONTEND_URL}/payment/success?session_id={CHECKOUT_SESSION_ID}`,
        cancelUrl: `${FRONTEND_URL}/pricing?canceled=true`,
      })
      checkoutUrl = session.url

      sendCreated(
        res,
        {
          checkoutUrl,
          tier: selectedTier.name,
          status: 'PENDING_CHECKOUT',
        },
        'Checkout session created'
      )
    } catch (err) {
      logger.error(`Stripe not configured or failed: ${err}`)
      sendInternalError(res, 'Payment gateway not configured or unavailable.')
      return
    }
  } catch (error) {
    logger.error(
      '[Subscriptions] createSubscription error',
      error instanceof Error ? error : new Error(String(error))
    )
    sendInternalError(res, error instanceof Error ? error.message : 'Internal server error')
  }
}

/**
 * POST /api/v1/subscriptions/cancel
 * Cancel current subscription.
 */
export const cancelSubscription = async (req: Request, res: Response): Promise<void> => {
  try {
    const userId = req.user?.userId
    if (!userId) {
      sendUnauthorized(res, 'Authentication required')
      return
    }

    await subscriptionService.cancelSubscription(userId)

    sendSuccess(res, null, 'Subscription cancelled')
  } catch (error) {
    logger.error(
      '[Subscriptions] cancelSubscription error',
      error instanceof Error ? error : new Error(String(error))
    )
    sendInternalError(res, 'Internal server error')
  }
}

/**
 * POST /api/v1/subscriptions/coupon/validate
 * Validate a coupon code.
 */
export const validateCoupon = async (req: Request, res: Response): Promise<void> => {
  try {
    const { code, tier_id } = req.body

    if (!code) {
      sendValidationError(res, 'Coupon code is required')
      return
    }

    const result = await subscriptionService.validateCoupon(code, tier_id)

    sendSuccess(res, result)
  } catch (error) {
    logger.error(
      '[Subscriptions] validateCoupon error',
      error instanceof Error ? error : new Error(String(error))
    )
    sendInternalError(res, 'Internal server error')
  }
}
