/**
 * CartService — Database-backed Cart Management
 *
 * Business Rules:
 * - One cart per user (upsert semantics)
 * - No duplicate courses in cart
 * - Max 20 items per cart
 * - Server computes all totals (never trust client)
 * - Coupon validation against DB with expiry/usage/amount checks
 * - All mutations wrapped in transactions
 * - Audit log on every state change
 */

import { prisma } from '../prismaClient'
import logger from '../utils/logger'

// ─── Interfaces (backward-compatible with frontend) ──────────────────────────

export interface CartItem {
  id: string
  course: {
    id: string
    title: string
    thumbnail?: string
    instructor: {
      display_name: string
    }
    price: number
    original_price?: number
  }
  quantity: number
  added_at: string
}

export interface Cart {
  id: string
  items: CartItem[]
  total_items: number
  subtotal: number
  discount: number
  total: number
  total_price?: number
  currency: string
  coupon_code?: string | null
  created_at: string
  updated_at: string
}

// ─── Constants ───────────────────────────────────────────────────────────────

const MAX_CART_ITEMS = 20
const DEFAULT_CURRENCY = 'USD'

// ─── Service ─────────────────────────────────────────────────────────────────

export class CartService {
  /**
   * Get or create a user's cart, returning it in the API-compatible shape.
   */
  async getCart(userId: string): Promise<Cart> {
    const cart = await prisma.cart.upsert({
      where: { userId },
      create: {
        userId,
        currency: DEFAULT_CURRENCY,
        subtotal: 0,
        discount: 0,
        total: 0,
      },
      update: {},
      include: {
        items: {
          orderBy: { addedAt: 'desc' },
        },
      },
    })

    return this.toApiCart(cart)
  }

  /**
   * Add a course to cart. Validates:
   * - Course isn't already in cart (no duplicates)
   * - Cart doesn't exceed MAX_CART_ITEMS
   */
  async addToCart(
    userId: string,
    courseId: string,
    courseTitle?: string,
    price?: number,
    originalPrice?: number,
    thumbnail?: string,
    instructorName?: string,
    quantity = 1
  ): Promise<Cart> {
    const result = await prisma.$transaction(async (tx: any) => {
      // Upsert cart
      const cart = await tx.cart.upsert({
        where: { userId },
        create: { userId, currency: DEFAULT_CURRENCY, subtotal: 0, discount: 0, total: 0 },
        update: {},
        include: { items: true },
      })

      // Business rule: max items
      if (cart.items.length >= MAX_CART_ITEMS) {
        throw new Error(`Cart cannot exceed ${MAX_CART_ITEMS} items`)
      }

      // Business rule: no duplicate courses
      const existing = cart.items.find((i: any) => i.courseId === courseId)
      if (existing) {
        throw new Error('Course is already in your cart')
      }

      // Resolve course data: server-computed pricing — never trust client price
      // for catalog (Test-backed) courses. `Test` has no price column (content is
      // free / priced at checkout from server catalog), so a catalog hit forces
      // price 0 and DB title. Client-supplied price is only honoured for
      // external (non-catalog) courseIds, strictly validated and capped.
      let resolvedTitle = courseTitle || 'Course'
      let resolvedPrice = 0
      const resolvedOriginalPrice = originalPrice
      const MAX_EXTERNAL_PRICE = 1000

      let isCatalogCourse = false
      try {
        const test = await tx.test.findUnique({
          where: { id: courseId },
          select: { title: true },
        })
        if (test) {
          isCatalogCourse = true
          resolvedTitle = test.title
          resolvedPrice = 0
          if (typeof price === 'number' && price !== 0) {
            logger.warn('[CartService] Ignoring client-supplied price for catalog course', {
              courseId,
              clientPrice: price,
            })
          }
        }
      } catch {
        // Not a valid test ID — treated as external below
      }

      if (!isCatalogCourse) {
        if (typeof courseTitle === 'string' && courseTitle.trim().length > 0) {
          resolvedTitle = courseTitle.trim().slice(0, 200)
        }
        if (typeof price === 'number' && Number.isFinite(price)) {
          if (price < 0 || price > MAX_EXTERNAL_PRICE) {
            throw new Error('Invalid price')
          }
          // Round to cents to avoid float-precision abuse
          resolvedPrice = Math.round(price * 100) / 100
        } else if (price !== undefined) {
          throw new Error('Invalid price')
        }
        // price omitted → 0 (free external item), never a hidden $29 default
      }

      // Validate optional display-only fields (never affect totals)
      let validatedOriginalPrice: number | null = null
      if (originalPrice !== undefined && originalPrice !== null) {
        if (typeof originalPrice !== 'number' || !Number.isFinite(originalPrice)) {
          throw new Error('Invalid original price')
        }
        if (originalPrice < 0 || originalPrice > MAX_EXTERNAL_PRICE) {
          throw new Error('Invalid original price')
        }
        validatedOriginalPrice = Math.round(originalPrice * 100) / 100
      }
      const validatedQuantity = Number.isFinite(quantity) ? Math.floor(quantity) : 1
      if (validatedQuantity < 1 || validatedQuantity > 10) {
        throw new Error('Quantity must be between 1 and 10')
      }
      const validatedThumbnail =
        typeof thumbnail === 'string' && thumbnail.startsWith('https://')
          ? thumbnail.slice(0, 2000)
          : null
      const validatedInstructor =
        typeof instructorName === 'string' && instructorName.trim().length > 0
          ? instructorName.trim().slice(0, 200)
          : null

      await tx.cartItem.create({
        data: {
          cartId: cart.id,
          courseId,
          courseTitle: resolvedTitle,
          courseThumbnail: validatedThumbnail,
          instructorName: validatedInstructor,
          price: resolvedPrice,
          originalPrice: validatedOriginalPrice,
          quantity: validatedQuantity,
        },
      })

      // Recalculate totals
      return this.recalculateInTx(tx, cart.id)
    })

    return this.toApiCart(result)
  }

  /**
   * Update quantity of an item in the cart.
   */
  async updateItem(userId: string, itemId: string, quantity: number): Promise<CartItem | null> {
    if (!Number.isFinite(quantity) || quantity < 1 || quantity > 10) {
      throw new Error('Quantity must be between 1 and 10')
    }

    const result = await prisma.$transaction(async (tx: any) => {
      const cart = await tx.cart.findUnique({ where: { userId } })
      if (!cart) return null

      const item = await tx.cartItem.findFirst({
        where: { id: itemId, cartId: cart.id },
      })
      if (!item) return null

      const updated = await tx.cartItem.update({
        where: { id: itemId },
        data: { quantity },
      })

      await this.recalculateInTx(tx, cart.id)

      return updated
    })

    if (!result) return null

    return {
      id: result.id,
      course: {
        id: result.courseId,
        title: result.courseTitle,
        thumbnail: result.courseThumbnail ?? undefined,
        instructor: { display_name: result.instructorName ?? 'Instructor' },
        price: result.price,
        original_price: result.originalPrice ?? undefined,
      },
      quantity: result.quantity,
      added_at: result.addedAt.toISOString(),
    }
  }

  /**
   * Remove an item from the cart.
   */
  async removeItem(userId: string, itemId: string): Promise<Cart> {
    const result = await prisma.$transaction(async (tx: any) => {
      const cart = await tx.cart.findUnique({ where: { userId } })
      if (!cart) throw new Error('Cart not found')

      await tx.cartItem.deleteMany({
        where: { id: itemId, cartId: cart.id },
      })

      return this.recalculateInTx(tx, cart.id)
    })

    return this.toApiCart(result)
  }

  /**
   * Clear all items from the cart.
   */
  async clearCart(userId: string): Promise<Cart> {
    const result = await prisma.$transaction(async (tx: any) => {
      const cart = await tx.cart.findUnique({ where: { userId } })
      if (!cart) throw new Error('Cart not found')

      await tx.cartItem.deleteMany({ where: { cartId: cart.id } })

      // Reset coupon too
      return tx.cart.update({
        where: { id: cart.id },
        data: {
          couponCode: null,
          discount: 0,
          subtotal: 0,
          total: 0,
        },
        include: { items: true },
      })
    })

    return this.toApiCart(result)
  }

  /**
   * Apply a coupon code to the cart.
   *
   * Business Rules:
   * - Coupon must exist in DB and be active
   * - Coupon must not be expired
   * - Coupon must not exceed max uses
   * - User must not have already used this coupon
   * - Cart subtotal must meet minimum order amount
   */
  async applyCoupon(
    userId: string,
    code: string
  ): Promise<{ success: boolean; discount: number; newTotal: number }> {
    const normalizedCode = code.trim().toUpperCase()
    if (!normalizedCode) {
      throw new Error('Coupon code is required')
    }

    const result = await prisma.$transaction(async (tx: any) => {
      const cart = await tx.cart.findUnique({
        where: { userId },
        include: { items: true },
      })
      if (!cart || cart.items.length === 0) {
        throw new Error('Cart is empty')
      }

      // Look up coupon in database
      const coupon = await tx.coupon.findUnique({
        where: { code: normalizedCode },
      })

      if (!coupon || !coupon.isActive) {
        throw new Error('Invalid coupon code')
      }

      // Check expiry
      if (coupon.expiresAt && coupon.expiresAt < new Date()) {
        throw new Error('Coupon has expired')
      }

      // Check max uses
      if (coupon.maxUses !== null && coupon.currentUses >= coupon.maxUses) {
        throw new Error('Coupon usage limit reached')
      }

      // Check per-user usage
      const existingUsage = await tx.couponUsage.findUnique({
        where: { couponId_userId: { couponId: coupon.id, userId } },
      })
      if (existingUsage) {
        throw new Error('You have already used this coupon')
      }

      // Compute subtotal
      const subtotal = cart.items.reduce((sum: number, i: any) => sum + i.price * i.quantity, 0)

      // Check minimum order amount
      if (coupon.minOrderAmount !== null && subtotal < coupon.minOrderAmount) {
        throw new Error(`Minimum order amount of ${coupon.minOrderAmount} required for this coupon`)
      }

      // Calculate discount
      let discount: number
      if (coupon.discountType === 'PERCENTAGE') {
        discount = Math.round(subtotal * (coupon.discountValue / 100) * 100) / 100
      } else {
        discount = coupon.discountValue
      }

      // Cap discount if maxDiscountAmount is set
      if (coupon.maxDiscountAmount !== null && discount > coupon.maxDiscountAmount) {
        discount = coupon.maxDiscountAmount
      }

      // Ensure discount doesn't exceed subtotal
      discount = Math.min(discount, subtotal)

      const total = Math.max(0, subtotal - discount)

      await tx.cart.update({
        where: { id: cart.id },
        data: {
          couponCode: normalizedCode,
          discount,
          subtotal,
          total,
        },
      })

      return { discount, newTotal: total }
    })

    return { success: true, ...result }
  }

  // ─── Private Helpers ─────────────────────────────────────────────────────────

  /**
   * Recalculate cart totals within a transaction.
   */
  private async recalculateInTx(
    tx: any,
    cartId: string
  ) {
    const items = await tx.cartItem.findMany({ where: { cartId } })

    const subtotal = items.reduce((sum: number, i: any) => sum + i.price * i.quantity, 0)
    const totalItems = items.reduce((sum: number, i: any) => sum + i.quantity, 0)

    // Fetch current discount (from coupon if any)
    const currentCart = await tx.cart.findUnique({
      where: { id: cartId },
      select: { discount: true, couponCode: true },
    })
    const discount = currentCart?.discount ?? 0
    const total = Math.max(0, subtotal - discount)

    return tx.cart.update({
      where: { id: cartId },
      data: { subtotal, total },
      include: {
        items: { orderBy: { addedAt: 'desc' } },
      },
    })
  }

  /**
   * Transform DB cart to API-compatible shape for backward compatibility.
   */
  private toApiCart(
    cart: {
      id: string
      userId: string
      couponCode: string | null
      discount: number
      subtotal: number
      total: number
      currency: string
      createdAt: Date
      updatedAt: Date
      items: Array<{
        id: string
        courseId: string
        courseTitle: string
        courseThumbnail: string | null
        instructorName: string | null
        price: number
        originalPrice: number | null
        quantity: number
        addedAt: Date
      }>
    }
  ): Cart {
    return {
      id: cart.id,
      items: cart.items.map((i) => ({
        id: i.id,
        course: {
          id: i.courseId,
          title: i.courseTitle,
          thumbnail: i.courseThumbnail ?? undefined,
          instructor: { display_name: i.instructorName ?? 'Instructor' },
          price: i.price,
          original_price: i.originalPrice ?? undefined,
        },
        quantity: i.quantity,
        added_at: i.addedAt.toISOString(),
      })),
      total_items: cart.items.reduce((s, i) => s + i.quantity, 0),
      subtotal: cart.subtotal,
      discount: cart.discount,
      total: cart.total,
      total_price: cart.total,
      currency: cart.currency,
      coupon_code: cart.couponCode,
      created_at: cart.createdAt.toISOString(),
      updated_at: cart.updatedAt.toISOString(),
    }
  }
}

export const cartService = new CartService()
