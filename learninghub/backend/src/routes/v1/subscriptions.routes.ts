import { Router } from 'express'
import { authenticate } from '../../middleware/authMiddleware'
import { validate } from '../../middleware/validationMiddleware'
import { createRateLimiter } from '../../middleware/rateLimiter'
import {
  getTiers,
  getMySubscription,
  createSubscription,
  cancelSubscription,
  validateCoupon,
} from '../../controllers/subscriptionsController'
import { createSubscriptionSchema, validateCouponSchema } from '../../validations/schemas'

const router = Router()

const subscriptionLimiter = createRateLimiter({
  windowMs: 60 * 1000,
  max: 10,
  keyPrefix: 'subscription',
})

router.get('/tiers', getTiers)
router.get('/me', authenticate, getMySubscription)
router.post(
  '/create',
  authenticate,
  subscriptionLimiter,
  validate(createSubscriptionSchema),
  createSubscription
)
router.post('/cancel', authenticate, subscriptionLimiter, cancelSubscription)
router.post(
  '/coupon/validate',
  authenticate,
  subscriptionLimiter,
  validate(validateCouponSchema),
  validateCoupon
)

export default router
