import { Router } from 'express'
import {
  getCart,
  addToCart,
  updateCartItem,
  removeFromCart,
  clearCart,
  applyCoupon,
  createOrder,
} from '../../controllers/cartController'
import { authenticate } from '../../middleware/authMiddleware'
import { validate } from '../../middleware/validationMiddleware'
import {
  addToCartSchema,
  updateCartItemSchema,
  removeCartItemSchema,
  applyCouponSchema,
  createOrderSchema,
} from '../../validations/schemas'

const router = Router()

// All cart operations require authentication (no guest carts)
router.get('/', authenticate, getCart)
router.post('/add', authenticate, validate(addToCartSchema), addToCart)
router.put('/items/:id', authenticate, validate(updateCartItemSchema), updateCartItem)
router.delete('/items/:id', authenticate, validate(removeCartItemSchema), removeFromCart)
router.post('/clear', authenticate, clearCart)
router.post('/apply-coupon', authenticate, validate(applyCouponSchema), applyCoupon)
router.post('/coupons', authenticate, validate(applyCouponSchema), applyCoupon)
router.post('/orders', authenticate, validate(createOrderSchema), createOrder)
router.post('/checkout', authenticate, validate(createOrderSchema), createOrder)

export default router
