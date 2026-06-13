import { Router } from 'express'
import { authenticate } from '../../middleware/authMiddleware'
import { validate } from '../../middleware/validationMiddleware'
import { createRateLimiter } from '../../middleware/rateLimiter'
import { createOrder, applyCoupon, verifySession } from '../../controllers/paymentsController'
import {
  createOrderSchema,
  verifySessionSchema,
  applyCouponSchema,
} from '../../validations/schemas'

const router = Router()

const paymentLimiter = createRateLimiter({
  windowMs: 60 * 1000,
  max: 10,
  keyPrefix: 'payment',
  message: 'Too many payment requests. Please try again later.',
})

router.post('/orders', authenticate, paymentLimiter, validate(createOrderSchema), createOrder)
router.post('/verify-session', authenticate, paymentLimiter, validate(verifySessionSchema), verifySession)
router.post('/coupons', authenticate, paymentLimiter, validate(applyCouponSchema), applyCoupon)

export default router
