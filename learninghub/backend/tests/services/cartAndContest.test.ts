import { cartService } from '../../src/services/CartService'
import { contestService } from '../../src/services/ContestService'
import { prisma } from '../../src/prismaClient'

describe('CartService & ContestService', () => {
  describe('CartService', () => {
    let inMemoryCart: any
    let inMemoryItems: any[]

    beforeEach(() => {
      inMemoryItems = [
        {
          id: 'item-test-1',
          cartId: 'cart-1',
          courseId: 'crs-python-basics',
          courseTitle: 'Python Basics',
          courseThumbnail: null,
          instructorName: 'Guido',
          price: 30,
          originalPrice: 60,
          quantity: 1,
          addedAt: new Date(),
        },
      ]

      inMemoryCart = {
        id: 'cart-1',
        userId: 'user-cart-1',
        currency: 'USD',
        subtotal: 30,
        discount: 0,
        total: 30,
        couponCode: null,
        createdAt: new Date(),
        updatedAt: new Date(),
        items: inMemoryItems,
      }

      ;(prisma.cart.upsert as jest.Mock).mockImplementation(async () => ({
        ...inMemoryCart,
        items: inMemoryItems,
      }))

      ;(prisma.cart.findUnique as jest.Mock).mockImplementation(async () => ({
        ...inMemoryCart,
        items: inMemoryItems,
      }))

      ;(prisma.cart.update as jest.Mock).mockImplementation(async (args: any) => {
        Object.assign(inMemoryCart, args.data)
        return { ...inMemoryCart, items: inMemoryItems }
      })

      ;(prisma.cartItem.findFirst as jest.Mock).mockImplementation(async (args: any) => {
        return inMemoryItems.find(i => i.id === args.where?.id) || null
      })

      ;(prisma.cartItem.findMany as jest.Mock).mockImplementation(async () => {
        return inMemoryItems
      })

      ;(prisma.cartItem.create as jest.Mock).mockImplementation(async (args: any) => {
        const newItem = {
          id: 'item-test-' + (inMemoryItems.length + 1),
          ...args.data,
          addedAt: new Date(),
        }
        inMemoryItems.push(newItem)
        return newItem
      })

      ;(prisma.cartItem.update as jest.Mock).mockImplementation(async (args: any) => {
        const item = inMemoryItems.find(i => i.id === args.where?.id)
        if (item) Object.assign(item, args.data)
        return item
      })

      ;(prisma.cartItem.deleteMany as jest.Mock).mockImplementation(async (args: any) => {
        const idx = inMemoryItems.findIndex(i => i.id === args.where?.id)
        if (idx !== -1) inMemoryItems.splice(idx, 1)
        return { count: 1 }
      })
    })

    it('should get default cart for new user', async () => {
      const cart = await cartService.getCart('user-cart-1')
      expect(cart).toBeDefined()
      expect(cart.items.length).toBeGreaterThan(0)
      expect(cart.total).toBe(cart.subtotal - cart.discount)
    })

    it('should add item to cart and recalculate totals', async () => {
      const cart = await cartService.addToCart('user-cart-1', 'crs-python-advanced', 'Python Advanced', 49.99, 99.99, undefined, undefined, 2)
      expect(cart.items.some(i => i.course.id === 'crs-python-advanced')).toBe(true)
      expect(cart.total).toBeGreaterThan(0)
    })

    it('should update cart item quantity', async () => {
      const cart = await cartService.getCart('user-cart-1')
      const firstItemId = cart.items[0].id
      const updatedItem = await cartService.updateItem('user-cart-1', firstItemId, 5)
      expect(updatedItem).toBeDefined()
      expect(updatedItem?.quantity).toBe(5)
    })

    it('should remove item from cart', async () => {
      const cart = await cartService.getCart('user-cart-1')
      const countBefore = cart.items.length
      const firstItemId = cart.items[0].id
      const updatedCart = await cartService.removeItem('user-cart-1', firstItemId)
      expect(updatedCart.items.length).toBe(countBefore - 1)
    })
  })

  describe('ContestService', () => {
    it('should list all contests', async () => {
      const contests = await contestService.getContests()
      expect(Array.isArray(contests)).toBe(true)
      expect(contests.length).toBeGreaterThanOrEqual(3)
    })

    it('should get contest by id', async () => {
      const contest = await contestService.getContestById('contest-2026-w1')
      expect(contest).toBeDefined()
      expect(contest?.title).toContain('Weekly Grand Algorithm Arena')
    })

    it('should return null for non-existent contest id', async () => {
      const contest = await contestService.getContestById('non-existent-contest')
      expect(contest).toBeNull()
    })

    it('should get contest leaderboard', async () => {
      const leaderboard = await contestService.getLeaderboard('contest-2026-w1')
      expect(Array.isArray(leaderboard)).toBe(true)
      expect(leaderboard.length).toBeGreaterThan(0)
      expect(leaderboard[0].rank).toBe(1)
    })

    it('should register user for contest', async () => {
      const result = await contestService.register('contest-2026-w2', 'user-contest-1')
      expect(result.success).toBe(true)
      expect(result.contest.is_registered).toBe(true)
    })
  })
})
