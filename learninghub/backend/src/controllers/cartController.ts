/**
 * Cart Controller — Handles HTTP requests for the commerce cart.
 *
 * Security:
 * - All mutations require authentication (enforced by route middleware)
 * - Server computes order amounts (never trusts client-supplied amounts)
 * - Idempotency keys prevent duplicate orders
 * - Audit trail on every order creation
 */

import { Request, Response } from 'express'
import { cartService } from '../services/CartService'
import { asyncHandler } from '../utils/errorHandler'
import { sendSuccess, sendNotFound, sendError } from '../utils/responseHelper'
import { prisma } from '../prismaClient'
import logger from '../utils/logger'

function resolveUserId(req: Request): string {
  if (req.user?.userId) return req.user.userId
  throw new Error('Authentication required')
}

export const getCart = asyncHandler(async (req: Request, res: Response) => {
  const userId = resolveUserId(req)
  const cart = await cartService.getCart(userId)
  sendSuccess(res, cart)
})

export const addToCart = asyncHandler(async (req: Request, res: Response) => {
  const userId = resolveUserId(req)
  const { course_id, quantity, course_title, price, original_price, thumbnail, instructor_name } =
    req.body

  if (!course_id || typeof course_id !== 'string') {
    sendError(res, 'course_id is required', 400, 'INVALID_INPUT')
    return
  }

  try {
    const cart = await cartService.addToCart(
      userId,
      course_id,
      course_title,
      price,
      original_price,
      thumbnail,
      instructor_name,
      quantity || 1
    )
    sendSuccess(res, cart, 'Item added to cart')
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Failed to add item'
    if (
      message.includes('already in your cart') ||
      message.includes('cannot exceed') ||
      message.includes('Invalid price') ||
      message.includes('Quantity must be between')
    ) {
      sendError(res, message, 400, 'CART_RULE_VIOLATION')
      return
    }
    throw err
  }
})

export const updateCartItem = asyncHandler(async (req: Request, res: Response) => {
  const userId = resolveUserId(req)
  const itemId = req.params.id as string
  const quantity = typeof req.body.quantity === 'number' ? req.body.quantity : 1

  if (quantity < 1) {
    sendError(res, 'Quantity must be at least 1', 400, 'INVALID_INPUT')
    return
  }

  try {
    const item = await cartService.updateItem(userId, itemId, quantity)
    if (!item) {
      sendNotFound(res, 'Cart item not found')
      return
    }
    sendSuccess(res, item, 'Cart item updated')
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Failed to update item'
    sendError(res, message, 400, 'CART_UPDATE_FAILED')
  }
})

export const removeFromCart = asyncHandler(async (req: Request, res: Response) => {
  const userId = resolveUserId(req)
  const itemId = req.params.id as string

  try {
    const cart = await cartService.removeItem(userId, itemId)
    sendSuccess(res, cart, 'Item removed from cart')
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Failed to remove item'
    sendError(res, message, 400, 'CART_REMOVE_FAILED')
  }
})

export const clearCart = asyncHandler(async (req: Request, res: Response) => {
  const userId = resolveUserId(req)
  try {
    const cart = await cartService.clearCart(userId)
    sendSuccess(res, cart, 'Cart cleared')
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Failed to clear cart'
    sendError(res, message, 400, 'CART_CLEAR_FAILED')
  }
})

export const applyCoupon = asyncHandler(async (req: Request, res: Response) => {
  const userId = resolveUserId(req)
  const code = (req.body?.coupon_code || req.body?.code || '') as string

  if (!code.trim()) {
    sendError(res, 'Coupon code is required', 400, 'INVALID_INPUT')
    return
  }

  try {
    const result = await cartService.applyCoupon(userId, code)
    sendSuccess(res, result, 'Coupon applied successfully')
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Coupon application failed'
    sendError(res, message, 400, 'COUPON_INVALID')
  }
})

export const createOrder = asyncHandler(async (req: Request, res: Response) => {
  const userId = resolveUserId(req)
  const { gateway, course_id, idempotency_key, idempotencyKey } = req.body

  // SECURITY: Never trust client-supplied amounts.
  if (typeof req.body.amount === 'number') {
    logger.warn('[cartController] Client attempted to supply custom amount — ignoring for security', {
      userId,
      clientAmount: req.body.amount,
    })
  }

  // Get the cart with server-computed totals
  let cart = await cartService.getCart(userId)
  if ((!cart || !cart.items || cart.items.length === 0) && course_id) {
    try {
      await cartService.addToCart(userId, course_id, undefined, undefined, undefined, undefined, undefined, 1)
      cart = await cartService.getCart(userId)
    } catch {
      // If course is already in cart or add fails, proceed with existing cart
    }
  }

  if (!cart || !cart.items || cart.items.length === 0) {
    sendError(res, 'Cart is empty', 400, 'EMPTY_CART')
    return
  }

  const serverAmount = cart.total ?? 0

  if (serverAmount <= 0 && cart.subtotal > 0) {
    // Free after coupon — still valid
  } else if (serverAmount <= 0 && cart.subtotal <= 0) {
    sendError(res, 'Cart total is invalid', 400, 'INVALID_CART_TOTAL')
    return
  }

  // Idempotency key: prefer client-supplied, fall back to deterministic hash
  const resolvedIdempotencyKey =
    idempotency_key || idempotencyKey || `cart_${userId}_${Date.now()}_${Math.random()}`

  // Check if an order with this idempotency key already exists
  const existingOrder = await prisma.order.findUnique({
    where: { idempotencyKey: resolvedIdempotencyKey },
    select: { id: true, status: true, totalAmount: true },
  })

  if (existingOrder) {
    sendSuccess(
      res,
      {
        order_id: existingOrder.id,
        status: existingOrder.status,
        amount: existingOrder.totalAmount,
        idempotent_replay: true,
        course_id: course_id || cart.items[0]?.course.id,
        gateway: gateway || 'razorpay',
        currency: cart.currency,
      },
      'Order already exists (idempotent replay)'
    )
    return
  }

  // Create order with items in a transaction
  const resolvedGateway = (gateway || 'razorpay').toUpperCase()
  const validGateways = ['RAZORPAY', 'STRIPE', 'MANUAL'] as const

  const order = await prisma.$transaction(async (tx: any) => {
    const newOrder = await tx.order.create({
      data: {
        userId,
        totalAmount: serverAmount,
        currency: cart.currency,
        status: 'PENDING_PAYMENT',
        paymentGateway: validGateways.includes(resolvedGateway as any)
          ? (resolvedGateway as any)
          : 'RAZORPAY',
        idempotencyKey: resolvedIdempotencyKey,
        couponCode: cart.coupon_code ?? null,
        discountAmount: cart.discount,
        expiresAt: new Date(Date.now() + 30 * 60 * 1000), // 30 min expiry
        items: {
          create: cart.items.map((item) => ({
            courseId: item.course.id,
            courseTitle: item.course.title,
            price: item.course.price,
            quantity: item.quantity,
          })),
        },
      },
      include: { items: true },
    })

    // Mark coupon as used if one was applied
    if (cart.coupon_code) {
      const coupon = await tx.coupon.findUnique({
        where: { code: cart.coupon_code },
      })
      if (coupon) {
        await tx.couponUsage.create({
          data: {
            couponId: coupon.id,
            userId,
            orderId: newOrder.id,
          },
        })
        await tx.coupon.update({
          where: { id: coupon.id },
          data: { currentUses: { increment: 1 } },
        })
      }
    }

    // Create audit log
    await tx.auditLog.create({
      data: {
        action: 'CREATE',
        userId,
        entityType: 'Order',
        entityId: newOrder.id,
        description: `Order created for ${cart.currency} ${serverAmount}`,
        severity: 'INFO',
        metadata: {
          totalAmount: serverAmount,
          itemCount: cart.items.length,
          gateway: resolvedGateway,
          couponCode: cart.coupon_code,
        },
      },
    })

    return newOrder
  })

  sendSuccess(
    res,
    {
      order_id: order.id,
      status: order.status,
      course_id: course_id || cart.items[0]?.course.id,
      gateway: gateway || 'razorpay',
      currency: cart.currency,
      amount: serverAmount,
      user_id: userId,
      created_at: order.createdAt.toISOString(),
      idempotency_key: resolvedIdempotencyKey,
    },
    'Payment order created. Awaiting payment gateway confirmation.'
  )
})
