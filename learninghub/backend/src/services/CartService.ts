import { AppError } from '../middleware/errorHandler'
import { prisma } from '../config'

export class CartService {
  /**
   * Retrieves or creates a cart for the user
   */
  static async getCart(userId: string) {
    let cart = await prisma.cart.findUnique({
      where: { userId },
      include: {
        items: {
          include: {
            course: {
              select: {
                id: true,
                title: true,
                thumbnail: true,
                price: true,
                instructor: {
                  select: { username: true }, // or display_name if available in your user schema
                },
              },
            },
          },
        },
      },
    })

    cart ??= await prisma.cart.create({
      data: { userId },
      include: {
        items: {
          include: {
            course: {
              select: {
                id: true,
                title: true,
                thumbnail: true,
                price: true,
                instructor: { select: { username: true } },
              },
            },
          },
        },
      },
    })

    return cart
  }

  /**
   * Recalculates cart totals
   */
  private static async recalculateCart(cartId: string) {
    const cart = await prisma.cart.findUnique({
      where: { id: cartId },
      include: {
        items: {
          include: { course: true },
        },
      },
    })

    if (!cart) throw new AppError('Cart not found', 404)

    let subtotal = 0
    let totalItems = 0

    for (const item of cart.items) {
      const price = item.course.price ? item.course.price.toNumber() : 0
      subtotal += price * item.quantity
      totalItems += item.quantity
    }

    // Optionally apply discount logic here based on cart.discount
    const discount = cart.discount.toNumber()
    const total = Math.max(0, subtotal - discount)

    return await prisma.cart.update({
      where: { id: cartId },
      data: {
        subtotal,
        total,
        totalItems,
      },
      include: {
        items: {
          include: {
            course: {
              select: {
                id: true,
                title: true,
                thumbnail: true,
                price: true,
                instructor: { select: { username: true } },
              },
            },
          },
        },
      },
    })
  }

  /**
   * Adds a course to the user's cart
   */
  static async addToCart(userId: string, courseId: string, _quantity: number = 1) {
    const course = await prisma.course.findUnique({ where: { id: courseId } })
    if (!course) {
      throw new AppError('Course not found', 404)
    }

    // 1. Ensure user has not already bought this course
    const enrollment = await prisma.userProgress.findFirst({
      where: { userId, courseId },
    })
    if (enrollment) {
      throw new AppError('You are already enrolled in this course', 400)
    }

    // 2. Get or create cart
    const cart = await this.getCart(userId)

    // 3. Add or update item
    const existingItem = await prisma.cartItem.findUnique({
      where: {
        cartId_courseId: { cartId: cart.id, courseId },
      },
    })

    if (existingItem) {
      // Typically for courses, quantity is just 1. We'll cap it at 1 for digital products.
      // But if physical or other needs, we could increment. For EdTech, usually max 1.
      throw new AppError('Course is already in your cart', 400)
    } else {
      await prisma.cartItem.create({
        data: {
          cartId: cart.id,
          courseId,
          quantity: 1, // Fix to 1 for courses
          priceAtAdd: course.price ?? 0,
        },
      })
    }

    return await this.recalculateCart(cart.id)
  }

  /**
   * Removes an item from the cart
   */
  static async removeItem(userId: string, itemId: string) {
    const cart = await prisma.cart.findUnique({ where: { userId } })
    if (!cart) throw new AppError('Cart not found', 404)

    const item = await prisma.cartItem.findFirst({
      where: { id: itemId, cartId: cart.id },
    })

    if (!item) throw new AppError('Item not found in cart', 404)

    await prisma.cartItem.delete({
      where: { id: itemId },
    })

    return await this.recalculateCart(cart.id)
  }

  /**
   * Clears the entire cart
   */
  static async clearCart(userId: string) {
    const cart = await prisma.cart.findUnique({ where: { userId } })
    if (!cart) throw new AppError('Cart not found', 404)

    await prisma.cartItem.deleteMany({
      where: { cartId: cart.id },
    })

    return await this.recalculateCart(cart.id)
  }

  /**
   * Updates cart item quantity (Not usually applicable for single-purchase courses, but implemented for flexibility)
   */
  static async updateItemQuantity(userId: string, itemId: string, quantity: number) {
    const cart = await prisma.cart.findUnique({ where: { userId } })
    if (!cart) throw new AppError('Cart not found', 404)

    if (quantity < 1) {
      return await this.removeItem(userId, itemId)
    }

    const item = await prisma.cartItem.findFirst({
      where: { id: itemId, cartId: cart.id },
    })

    if (!item) throw new AppError('Item not found in cart', 404)

    await prisma.cartItem.update({
      where: { id: itemId },
      data: { quantity },
    })

    return await this.recalculateCart(cart.id)
  }
}
