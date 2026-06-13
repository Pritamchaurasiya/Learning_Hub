import { Router } from 'express'
import {
  getCart,
  addToCart,
  updateCartItem,
  removeFromCart,
  clearCart,
} from '../../controllers/cartController'
import { authenticate } from '../../middleware/authMiddleware'
import { validate } from '../../middleware/validationMiddleware'
import { createRateLimiter } from '../../middleware/rateLimiter'
import { addToCartSchema, updateCartItemSchema } from '../../validations/schemas'

const router = Router()

const cartLimiter = createRateLimiter({
  windowMs: 60 * 1000,
  max: 30,
  keyPrefix: 'cart',
})

// Protect all cart routes
router.use(authenticate)

router.get('/', getCart)
router.post('/add', cartLimiter, validate(addToCartSchema), addToCart)
router.put('/items/:id', cartLimiter, validate(updateCartItemSchema), updateCartItem)
router.delete('/items/:id', cartLimiter, removeFromCart)
router.post('/clear', cartLimiter, clearCart)

export default router
