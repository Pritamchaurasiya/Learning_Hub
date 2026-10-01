import { Router } from 'express'
import {
  getTiers,
  getMySubscription,
  createCheckout,
  cancelSubscription,
} from '../../controllers/subscriptionsController'
import { authenticate } from '../../middleware/authMiddleware'

const router = Router()

router.get('/tiers', getTiers)
router.get('/me', authenticate, getMySubscription)
router.post('/create', authenticate, createCheckout)
router.post('/cancel', authenticate, cancelSubscription)

export default router
