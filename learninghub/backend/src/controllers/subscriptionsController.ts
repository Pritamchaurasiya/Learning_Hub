import { Request, Response } from 'express'
import logger from '../utils/logger'
import { subscriptionService } from '../services/SubscriptionService'

/**
 * GET /api/v1/subscriptions/tiers
 * Get all available subscription tiers.
 */
export const getTiers = async (_req: Request, res: Response): Promise<void> => {
  try {
    const tiers = await subscriptionService.getTiers()

    res.json({
      status: 'success',
      data: {
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
      },
    })
  } catch (error) {
    logger.error(
      '[Subscriptions] getTiers error',
      error instanceof Error ? error : new Error(String(error))
    )
    res.status(500).json({ status: 'error', message: 'Internal server error' })
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
      res.status(401).json({ status: 'error', message: 'Authentication required' })
      return
    }

    const subscription = await subscriptionService.getUserSubscription(userId)

    if (!subscription) {
      res.json({
        status: 'success',
        data: {
          active: false,
          tier: 'free',
          limits: {
            tests_per_day: 3,
            ai_generations_per_day: 2,
            questions_per_day: 50,
          },
        },
      })
      return
    }

    res.json({
      status: 'success',
      data: {
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
      },
    })
  } catch (error) {
    logger.error(
      '[Subscriptions] getMySubscription error',
      error instanceof Error ? error : new Error(String(error))
    )
    res.status(500).json({ status: 'error', message: 'Internal server error' })
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
      res.status(401).json({ status: 'error', message: 'Authentication required' })
      return
    }

    const { tier_id, coupon_code } = req.body

    if (!tier_id) {
      res.status(400).json({ status: 'error', message: 'tier_id is required' })
      return
    }

    // Validate coupon if provided
    if (coupon_code) {
      const couponResult = await subscriptionService.validateCoupon(coupon_code, tier_id)
      if (!couponResult.valid) {
        res.status(400).json({ status: 'error', message: couponResult.message })
        return
      }
    }

    const tier = await subscriptionService.getTiers()
    const selectedTier = tier.find(t => t.id === tier_id)
    if (!selectedTier) {
      res.status(404).json({ status: 'error', message: 'Tier not found' })
      return
    }

    // For now, create a free trial subscription
    // In production, this would redirect to Stripe checkout
    const subscription = await subscriptionService.createSubscription({
      userId,
      tierId: tier_id,
      trialDays: selectedTier.trialDays,
    })

    if (coupon_code) {
      await subscriptionService.applyCoupon(coupon_code)
    }

    res.status(201).json({
      status: 'success',
      message: 'Subscription created',
      data: {
        id: subscription.id,
        tier: subscription.tier.name,
        status: subscription.status,
        trial_ends_at: subscription.trialEndsAt,
      },
    })
  } catch (error) {
    logger.error(
      '[Subscriptions] createSubscription error',
      error instanceof Error ? error : new Error(String(error))
    )
    res.status(500).json({
      status: 'error',
      message: error instanceof Error ? error.message : 'Internal server error',
    })
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
      res.status(401).json({ status: 'error', message: 'Authentication required' })
      return
    }

    await subscriptionService.cancelSubscription(userId)

    res.json({ status: 'success', message: 'Subscription cancelled' })
  } catch (error) {
    logger.error(
      '[Subscriptions] cancelSubscription error',
      error instanceof Error ? error : new Error(String(error))
    )
    res.status(500).json({ status: 'error', message: 'Internal server error' })
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
      res.status(400).json({ status: 'error', message: 'Coupon code is required' })
      return
    }

    const result = await subscriptionService.validateCoupon(code, tier_id)

    res.json({ status: 'success', data: result })
  } catch (error) {
    logger.error(
      '[Subscriptions] validateCoupon error',
      error instanceof Error ? error : new Error(String(error))
    )
    res.status(500).json({ status: 'error', message: 'Internal server error' })
  }
}
