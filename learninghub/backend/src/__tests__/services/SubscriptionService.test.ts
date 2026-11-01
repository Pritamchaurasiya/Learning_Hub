import { SubscriptionService } from '../../services/SubscriptionService'
import { prisma } from '../../prismaClient'

jest.mock('../../prismaClient', () => ({
  prisma: {
    dbSubscriptionTier: {
      findMany: jest.fn(),
      findUnique: jest.fn(),
      upsert: jest.fn(),
    },
    dbSubscription: {
      findFirst: jest.fn(),
      findUnique: jest.fn(),
      updateMany: jest.fn(),
      update: jest.fn(),
      create: jest.fn(),
    },
    auditLog: {
      create: jest.fn(),
    },
    $transaction: jest.fn(),
  },
}))

jest.mock('../../utils/logger', () => ({
  info: jest.fn(),
  warn: jest.fn(),
  error: jest.fn(),
  debug: jest.fn(),
}))

const createMockTier = (overrides: any = {}) => ({
  slug: 'free',
  name: 'Free Explorer',
  description: 'Basic access',
  price: 0,
  interval: 'month',
  features: ['feat1'],
  isPopular: false,
  displayOrder: 0,
  isActive: true,
  stripePriceId: null,
  ...overrides,
})

describe('SubscriptionService', () => {
  let service: SubscriptionService

  beforeEach(() => {
    service = new SubscriptionService()
    jest.clearAllMocks()
  })

  describe('getTiers', () => {
    it('returns active tiers from database ordered by displayOrder', async () => {
      const mockTiers = [
        createMockTier({ slug: 'free', name: 'Free Explorer', displayOrder: 0, isPopular: false, stripePriceId: null }),
        createMockTier({ slug: 'pro', name: 'Pro Ranker', price: 19, displayOrder: 1, isPopular: true, stripePriceId: 'price_pro' }),
        createMockTier({ slug: 'tests-a-plus', name: 'Tests A+ Elite', price: 49, displayOrder: 2, isPopular: false, stripePriceId: 'price_elite' }),
      ]
      ;(prisma.dbSubscriptionTier.findMany as jest.Mock).mockResolvedValue(mockTiers)

      const result = await service.getTiers()

      expect(result).toHaveLength(3)
      expect(result[0].id).toBe('free')
      expect(result[1].id).toBe('pro')
      expect(result[2].id).toBe('tests-a-plus')
      expect(result[0].price).toBe(0)
      expect(result[1].price).toBe(19)
      expect(result[2].price).toBe(49)
      expect(result[1].isPopular).toBe(true)
      expect(result[1].stripePriceId).toBe('price_pro')
    })

    it('filters out inactive tiers', async () => {
      const mockTiers = [
        createMockTier({ slug: 'free', displayOrder: 0 }),
        createMockTier({ slug: 'pro', displayOrder: 1 }),
        createMockTier({ slug: 'old', displayOrder: 2, isActive: false }),
      ]
      // Mock findMany to filter by isActive: true
      ;(prisma.dbSubscriptionTier.findMany as jest.Mock).mockImplementation((options: any) => {
        const filtered = mockTiers.filter(t => t.isActive !== false)
        if (options?.where?.isActive === true) {
          return Promise.resolve(filtered.filter(t => t.isActive === true))
        }
        return Promise.resolve(filtered)
      })

      const result = await service.getTiers()

      expect(result).toHaveLength(2)
      expect(result.find(t => t.id === 'old')).toBeUndefined()
    })

    it('seeds default tiers when database is empty', async () => {
      ;(prisma.dbSubscriptionTier.findMany as jest.Mock)
        .mockResolvedValueOnce([])
        .mockResolvedValueOnce([
          createMockTier({ slug: 'free', displayOrder: 0 }),
          createMockTier({ slug: 'pro', displayOrder: 1 }),
        ])
      ;(prisma.dbSubscriptionTier.upsert as jest.Mock).mockResolvedValue({})

      const result = await service.getTiers()

      expect(prisma.dbSubscriptionTier.upsert).toHaveBeenCalledTimes(3)
      expect(result).toHaveLength(2)
    })

    it('orders tiers by displayOrder', async () => {
      const mockTiers = [
        createMockTier({ slug: 'pro', displayOrder: 1 }),
        createMockTier({ slug: 'free', displayOrder: 0 }),
        createMockTier({ slug: 'tests-a-plus', displayOrder: 2 }),
      ]
      // Mock to return tiers sorted by displayOrder
      ;(prisma.dbSubscriptionTier.findMany as jest.Mock).mockImplementation((options: any) => {
        const sorted = [...mockTiers].sort((a, b) => a.displayOrder - b.displayOrder)
        return Promise.resolve(sorted)
      })

      const result = await service.getTiers()

      expect(result[0].id).toBe('free')
      expect(result[1].id).toBe('pro')
      expect(result[2].id).toBe('tests-a-plus')
    })

    it('handles null description and features gracefully', async () => {
      const mockTiers = [
        createMockTier({ slug: 'free', description: null, features: null }),
      ]
      ;(prisma.dbSubscriptionTier.findMany as jest.Mock).mockResolvedValue(mockTiers)

      const result = await service.getTiers()

      expect(result[0].description).toBe('')
      expect(result[0].features).toEqual([])
    })
  })

  describe('getUserSubscription', () => {
    it('returns active subscription with tier details', async () => {
      const mockSubscription = {
        id: 'sub-1',
        userId: 'user-1',
        tierId: 'tier-pro',
        status: 'ACTIVE',
        currentPeriodEnd: new Date('2025-12-31'),
        cancelAtPeriodEnd: false,
        tier: { slug: 'pro', name: 'Pro Ranker' },
      }
      ;(prisma.dbSubscription.findFirst as jest.Mock).mockResolvedValue(mockSubscription)

      const result = await service.getUserSubscription('user-1')

      expect(result).toEqual({
        id: 'sub-1',
        userId: 'user-1',
        tier: 'pro',
        tierName: 'Pro Ranker',
        status: 'active',
        currentPeriodEnd: mockSubscription.currentPeriodEnd.toISOString(),
        cancelAtPeriodEnd: false,
      })
    })

    it('returns free tier when no active subscription exists', async () => {
      ;(prisma.dbSubscription.findFirst as jest.Mock).mockResolvedValue(null)

      const result = await service.getUserSubscription('user-1')

      expect(result).toEqual({
        id: 'free-user-1',
        userId: 'user-1',
        tier: 'free',
        tierName: 'Free Explorer',
        status: 'active',
        currentPeriodEnd: expect.any(String),
        cancelAtPeriodEnd: false,
      })
      // Check that currentPeriodEnd is about 1 year in the future
      const endDate = new Date(result.currentPeriodEnd)
      const expectedDate = new Date(Date.now() + 365 * 86400000)
      expect(Math.abs(endDate.getTime() - expectedDate.getTime())).toBeLessThan(10000)
    })

    it('handles TRIALING status correctly', async () => {
      const mockSubscription = {
        id: 'sub-1',
        userId: 'user-1',
        tierId: 'tier-pro',
        status: 'TRIALING',
        currentPeriodEnd: new Date('2025-06-30'),
        cancelAtPeriodEnd: false,
        tier: { slug: 'pro', name: 'Pro Ranker' },
      }
      ;(prisma.dbSubscription.findFirst as jest.Mock).mockResolvedValue(mockSubscription)

      const result = await service.getUserSubscription('user-1')

      expect(result.status).toBe('trialing')
    })

    it('orders by createdAt desc to get latest subscription', async () => {
      ;(prisma.dbSubscription.findFirst as jest.Mock).mockResolvedValue({
        id: 'sub-latest',
        userId: 'user-1',
        tierId: 'tier-pro',
        status: 'ACTIVE',
        currentPeriodEnd: new Date('2025-12-31'),
        cancelAtPeriodEnd: false,
        tier: { slug: 'pro', name: 'Pro Ranker' },
      })

      await service.getUserSubscription('user-1')

      expect(prisma.dbSubscription.findFirst).toHaveBeenCalledWith(expect.objectContaining({
        orderBy: { createdAt: 'desc' },
      }))
    })
  })

  describe('createCheckout', () => {
    it('creates subscription for valid tier', async () => {
      const mockTier = {
        id: 'tier-pro',
        slug: 'pro',
        name: 'Pro Ranker',
        price: 19,
        interval: 'month',
        isActive: true,
      }
      const mockNewSub = {
        id: 'sub-new',
        userId: 'user-1',
        tierId: 'tier-pro',
        status: 'ACTIVE',
        currentPeriodStart: new Date(),
        currentPeriodEnd: new Date(Date.now() + 30 * 86400000),
      }
      ;(prisma.dbSubscriptionTier.findUnique as jest.Mock).mockResolvedValue(mockTier)
      ;(prisma.dbSubscription.findFirst as jest.Mock).mockResolvedValue(null)
      ;(prisma.$transaction as jest.Mock).mockImplementation(async (cb: any) => cb(prisma))
      ;(prisma.dbSubscription.updateMany as jest.Mock).mockResolvedValue({ count: 0 })
      ;(prisma.dbSubscription.create as jest.Mock).mockResolvedValue(mockNewSub)
      ;(prisma.auditLog.create as jest.Mock).mockResolvedValue({})

      const result = await service.createCheckout('user-1', 'pro')

      expect(result).toEqual({
        checkoutUrl: '/dashboard?upgraded=true&tier=pro',
        subscriptionId: 'sub-new',
      })
      expect(prisma.dbSubscriptionTier.findUnique).toHaveBeenCalledWith({ where: { slug: 'pro' } })
    })

    it('throws error for invalid tier', async () => {
      ;(prisma.dbSubscriptionTier.findUnique as jest.Mock).mockResolvedValue(null)

      await expect(service.createCheckout('user-1', 'invalid-tier')).rejects.toThrow('Invalid or inactive subscription tier')
    })

    it('throws error for inactive tier', async () => {
      ;(prisma.dbSubscriptionTier.findUnique as jest.Mock).mockResolvedValue({
        id: 'tier-old',
        slug: 'old',
        name: 'Old',
        isActive: false,
      })

      await expect(service.createCheckout('user-1', 'old')).rejects.toThrow('Invalid or inactive subscription tier')
    })

    it('throws error if user already has active subscription to tier', async () => {
      const mockTier = { id: 'tier-pro', slug: 'pro', name: 'Pro', isActive: true }
      ;(prisma.dbSubscriptionTier.findUnique as jest.Mock).mockResolvedValue(mockTier)
      ;(prisma.dbSubscription.findFirst as jest.Mock).mockResolvedValue({
        id: 'sub-existing',
        userId: 'user-1',
        tierId: 'tier-pro',
        status: 'ACTIVE',
      })

      await expect(service.createCheckout('user-1', 'pro')).rejects.toThrow('You already have an active subscription to this tier')
    })

    it('calculates period end correctly for monthly tier', async () => {
      const mockTier = { id: 'tier-pro', slug: 'pro', name: 'Pro', price: 19, interval: 'month', isActive: true }
      const mockNewSub = { id: 'sub-new', currentPeriodEnd: new Date() }
      ;(prisma.dbSubscriptionTier.findUnique as jest.Mock).mockResolvedValue(mockTier)
      ;(prisma.dbSubscription.findFirst as jest.Mock).mockResolvedValue(null)
      ;(prisma.$transaction as jest.Mock).mockImplementation(async (cb: any) => cb(prisma))
      ;(prisma.dbSubscription.updateMany as jest.Mock).mockResolvedValue({ count: 0 })
      ;(prisma.dbSubscription.create as jest.Mock).mockImplementation(async (args: any) => {
        expect(args.data.currentPeriodEnd).toBeDefined()
        const end = new Date(args.data.currentPeriodEnd)
        const expected = new Date()
        expected.setMonth(expected.getMonth() + 1)
        expect(Math.abs(end.getTime() - expected.getTime())).toBeLessThan(5000)
        return mockNewSub
      })
      ;(prisma.dbSubscription.updateMany as jest.Mock).mockResolvedValue({ count: 0 })
      ;(prisma.auditLog.create as jest.Mock).mockResolvedValue({})

      await service.createCheckout('user-1', 'pro')
    })

    it('calculates period end correctly for yearly tier', async () => {
      const mockTier = { id: 'tier-pro', slug: 'pro', name: 'Pro', price: 199, interval: 'year', isActive: true }
      const mockNewSub = { id: 'sub-new', currentPeriodEnd: new Date() }
      ;(prisma.dbSubscriptionTier.findUnique as jest.Mock).mockResolvedValue(mockTier)
      ;(prisma.dbSubscription.findFirst as jest.Mock).mockResolvedValue(null)
      ;(prisma.$transaction as jest.Mock).mockImplementation(async (cb: any) => cb(prisma))
      ;(prisma.dbSubscription.updateMany as jest.Mock).mockResolvedValue({ count: 0 })
      ;(prisma.dbSubscription.create as jest.Mock).mockImplementation(async (args: any) => {
        const end = new Date(args.data.currentPeriodEnd)
        const expected = new Date()
        expected.setFullYear(expected.getFullYear() + 1)
        expect(Math.abs(end.getTime() - expected.getTime())).toBeLessThan(5000)
        return mockNewSub
      })
      ;(prisma.dbSubscription.updateMany as jest.Mock).mockResolvedValue({ count: 0 })
      ;(prisma.auditLog.create as jest.Mock).mockResolvedValue({})

      await service.createCheckout('user-1', 'pro')
    })

    it('calculates period end correctly for lifetime tier', async () => {
      const mockTier = { id: 'tier-lifetime', slug: 'lifetime', name: 'Lifetime', price: 999, interval: 'lifetime', isActive: true }
      const mockNewSub = { id: 'sub-new', currentPeriodEnd: new Date() }
      ;(prisma.dbSubscriptionTier.findUnique as jest.Mock).mockResolvedValue(mockTier)
      ;(prisma.dbSubscription.findFirst as jest.Mock).mockResolvedValue(null)
      ;(prisma.$transaction as jest.Mock).mockImplementation(async (cb: any) => cb(prisma))
      ;(prisma.dbSubscription.updateMany as jest.Mock).mockResolvedValue({ count: 0 })
      ;(prisma.dbSubscription.create as jest.Mock).mockImplementation(async (args: any) => {
        const end = new Date(args.data.currentPeriodEnd)
        const expected = new Date()
        expected.setFullYear(expected.getFullYear() + 100)
        expect(Math.abs(end.getTime() - expected.getTime())).toBeLessThan(5000)
        return mockNewSub
      })
      ;(prisma.dbSubscription.updateMany as jest.Mock).mockResolvedValue({ count: 0 })
      ;(prisma.auditLog.create as jest.Mock).mockResolvedValue({})

      await service.createCheckout('user-1', 'lifetime')
    })

    it('cancels existing active subscriptions in transaction', async () => {
      const mockTier = { id: 'tier-pro', slug: 'pro', name: 'Pro', price: 19, interval: 'month', isActive: true }
      ;(prisma.dbSubscriptionTier.findUnique as jest.Mock).mockResolvedValue(mockTier)
      ;(prisma.dbSubscription.findFirst as jest.Mock).mockResolvedValue(null)
      ;(prisma.$transaction as jest.Mock).mockImplementation(async (cb: any) => cb(prisma))
      ;(prisma.dbSubscription.updateMany as jest.Mock).mockResolvedValue({ count: 1 })
      ;(prisma.dbSubscription.create as jest.Mock).mockResolvedValue({ id: 'sub-new' })
      ;(prisma.auditLog.create as jest.Mock).mockResolvedValue({})

      await service.createCheckout('user-1', 'pro')

      expect(prisma.dbSubscription.updateMany).toHaveBeenCalledWith(expect.objectContaining({
        where: expect.objectContaining({
          userId: 'user-1',
          status: { in: ['ACTIVE', 'TRIALING'] },
        }),
        data: expect.objectContaining({
          status: 'CANCELED',
          canceledAt: expect.any(Date),
        }),
      }))
    })

    it('creates audit log on successful checkout', async () => {
      const mockTier = { id: 'tier-pro', slug: 'pro', name: 'Pro Ranker', price: 19, interval: 'month', isActive: true }
      ;(prisma.dbSubscriptionTier.findUnique as jest.Mock).mockResolvedValue(mockTier)
      ;(prisma.dbSubscription.findFirst as jest.Mock).mockResolvedValue(null)
      ;(prisma.$transaction as jest.Mock).mockImplementation(async (cb: any) => cb(prisma))
      ;(prisma.dbSubscription.updateMany as jest.Mock).mockResolvedValue({ count: 0 })
      ;(prisma.dbSubscription.create as jest.Mock).mockResolvedValue({ id: 'sub-new' })
      ;(prisma.auditLog.create as jest.Mock).mockResolvedValue({})

      await service.createCheckout('user-1', 'pro')

      expect(prisma.auditLog.create).toHaveBeenCalledWith(expect.objectContaining({
        data: expect.objectContaining({
          action: 'CREATE',
          userId: 'user-1',
          entityType: 'Subscription',
          entityId: 'sub-new',
          description: 'Subscribed to Pro Ranker',
          severity: 'INFO',
          metadata: expect.objectContaining({
            tierId: 'pro',
            tierName: 'Pro Ranker',
            price: 19,
            interval: 'month',
          }),
        }),
      }))
    })
  })

  describe('cancelSubscription', () => {
    it('cancels active subscription and sets cancelAtPeriodEnd', async () => {
      const mockSubscription = { id: 'sub-1', userId: 'user-1', status: 'ACTIVE' }
      ;(prisma.dbSubscription.findFirst as jest.Mock).mockResolvedValue(mockSubscription)
      ;(prisma.$transaction as jest.Mock).mockImplementation(async (cb: any) => cb(prisma))
      ;(prisma.dbSubscription.update as jest.Mock).mockResolvedValue({})
      ;(prisma.auditLog.create as jest.Mock).mockResolvedValue({})

      const result = await service.cancelSubscription('user-1')

      expect(result).toBe(true)
      expect(prisma.dbSubscription.update).toHaveBeenCalledWith(expect.objectContaining({
        where: { id: 'sub-1' },
        data: expect.objectContaining({
          cancelAtPeriodEnd: true,
          canceledAt: expect.any(Date),
        }),
      }))
    })

    it('creates audit log on cancellation', async () => {
      const mockSubscription = { id: 'sub-1', userId: 'user-1', status: 'ACTIVE' }
      ;(prisma.dbSubscription.findFirst as jest.Mock).mockResolvedValue(mockSubscription)
      ;(prisma.$transaction as jest.Mock).mockImplementation(async (cb: any) => cb(prisma))
      ;(prisma.dbSubscription.update as jest.Mock).mockResolvedValue({})
      ;(prisma.auditLog.create as jest.Mock).mockResolvedValue({})

      await service.cancelSubscription('user-1')

      expect(prisma.auditLog.create).toHaveBeenCalledWith(expect.objectContaining({
        data: expect.objectContaining({
          action: 'UPDATE',
          userId: 'user-1',
          entityType: 'Subscription',
          entityId: 'sub-1',
          description: 'Subscription cancelled (will expire at period end)',
          severity: 'INFO',
        }),
      }))
    })

    it('returns true when no active subscription to cancel', async () => {
      ;(prisma.dbSubscription.findFirst as jest.Mock).mockResolvedValue(null)

      const result = await service.cancelSubscription('user-1')

      expect(result).toBe(true)
    })

    it('handles TRIALING status subscription', async () => {
      const mockSubscription = { id: 'sub-1', userId: 'user-1', status: 'TRIALING' }
      ;(prisma.dbSubscription.findFirst as jest.Mock).mockResolvedValue(mockSubscription)
      ;(prisma.$transaction as jest.Mock).mockImplementation(async (cb: any) => cb(prisma))
      ;(prisma.dbSubscription.update as jest.Mock).mockResolvedValue({})
      ;(prisma.auditLog.create as jest.Mock).mockResolvedValue({})

      const result = await service.cancelSubscription('user-1')

      expect(result).toBe(true)
    })
  })

  describe('hasFeatureAccess', () => {
    it('returns true when user tier meets required tier', async () => {
      const mockSubscription = { id: 'sub-1', userId: 'user-1', tierId: 'tier-pro', status: 'ACTIVE', currentPeriodEnd: new Date('2025-12-31'), cancelAtPeriodEnd: false, tier: { slug: 'pro', name: 'Pro Ranker' } }
      ;(prisma.dbSubscription.findFirst as jest.Mock).mockResolvedValue(mockSubscription)

      const result = await service.hasFeatureAccess('user-1', 'pro')
      expect(result).toBe(true)

      const result2 = await service.hasFeatureAccess('user-1', 'free')
      expect(result2).toBe(true)
    })

    it('returns false when user tier below required tier', async () => {
      const mockSubscription = { id: 'sub-1', userId: 'user-1', tierId: 'tier-free', status: 'ACTIVE', currentPeriodEnd: new Date('2025-12-31'), cancelAtPeriodEnd: false, tier: { slug: 'free', name: 'Free Explorer' } }
      ;(prisma.dbSubscription.findFirst as jest.Mock).mockResolvedValue(mockSubscription)

      const result = await service.hasFeatureAccess('user-1', 'pro')
      expect(result).toBe(false)

      const result2 = await service.hasFeatureAccess('user-1', 'tests-a-plus')
      expect(result2).toBe(false)
    })

    it('uses tier hierarchy correctly', async () => {
      const mockSubscription = { id: 'sub-1', userId: 'user-1', tierId: 'tier-pro', status: 'ACTIVE', currentPeriodEnd: new Date('2025-12-31'), cancelAtPeriodEnd: false, tier: { slug: 'pro', name: 'Pro Ranker' } }
      ;(prisma.dbSubscription.findFirst as jest.Mock).mockResolvedValue(mockSubscription)

      // Pro (level 1) should have access to free (level 0)
      expect(await service.hasFeatureAccess('user-1', 'free')).toBe(true)
      // Pro (level 1) should have access to pro (level 1)
      expect(await service.hasFeatureAccess('user-1', 'pro')).toBe(true)
      // Pro (level 1) should NOT have access to tests-a-plus (level 2)
      expect(await service.hasFeatureAccess('user-1', 'tests-a-plus')).toBe(false)
    })

    it('handles free tier user correctly', async () => {
      ;(prisma.dbSubscription.findFirst as jest.Mock).mockResolvedValue(null) // Returns free tier

      expect(await service.hasFeatureAccess('user-1', 'free')).toBe(true)
      expect(await service.hasFeatureAccess('user-1', 'pro')).toBe(false)
      expect(await service.hasFeatureAccess('user-1', 'tests-a-plus')).toBe(false)
    })

    it('handles unknown required tier gracefully', async () => {
      const mockSubscription = { id: 'sub-1', userId: 'user-1', tierId: 'tier-pro', status: 'ACTIVE', currentPeriodEnd: new Date('2025-12-31'), cancelAtPeriodEnd: false, tier: { slug: 'pro', name: 'Pro Ranker' } }
      ;(prisma.dbSubscription.findFirst as jest.Mock).mockResolvedValue(mockSubscription)

      // Unknown tier defaults to level 0, so pro (level 1) >= unknown (level 0)
      expect(await service.hasFeatureAccess('user-1', 'unknown-tier')).toBe(true)
    })
  })

  describe('seedDefaultTiers', () => {
    it('seeds all three default tiers', async () => {
      ;(prisma.dbSubscriptionTier.upsert as jest.Mock).mockResolvedValue({})

      // Access private method via any cast
      await (service as any).seedDefaultTiers()

      expect(prisma.dbSubscriptionTier.upsert).toHaveBeenCalledTimes(3)

      // Check first tier (free)
      expect(prisma.dbSubscriptionTier.upsert).toHaveBeenCalledWith(expect.objectContaining({
        where: { slug: 'free' },
        create: expect.objectContaining({
          slug: 'free',
          name: 'Free Explorer',
          price: 0,
          interval: 'month',
          isPopular: false,
          displayOrder: 0,
          isActive: true,
        }),
      }))

      // Check second tier (pro)
      expect(prisma.dbSubscriptionTier.upsert).toHaveBeenCalledWith(expect.objectContaining({
        where: { slug: 'pro' },
        create: expect.objectContaining({
          slug: 'pro',
          name: 'Pro Ranker',
          price: 19,
          isPopular: true,
          displayOrder: 1,
        }),
      }))

      // Check third tier (tests-a-plus)
      expect(prisma.dbSubscriptionTier.upsert).toHaveBeenCalledWith(expect.objectContaining({
        where: { slug: 'tests-a-plus' },
        create: expect.objectContaining({
          slug: 'tests-a-plus',
          name: 'Tests A+ Elite',
          price: 49,
          displayOrder: 2,
        }),
      }))
    })
  })

  describe('tier hierarchy', () => {
    const mockTiers = [
      createMockTier({ slug: 'free', displayOrder: 0, isPopular: false }),
      createMockTier({ slug: 'pro', displayOrder: 1, isPopular: true }),
      createMockTier({ slug: 'tests-a-plus', displayOrder: 2, isPopular: false }),
    ]

    beforeEach(() => {
      ;(prisma.dbSubscriptionTier.findMany as jest.Mock).mockResolvedValue(mockTiers)
    })

    it('maintains correct tier order: free < pro < tests-a-plus', async () => {
      const tiers = await service.getTiers()

      const freeIndex = tiers.findIndex(t => t.id === 'free')
      const proIndex = tiers.findIndex(t => t.id === 'pro')
      const eliteIndex = tiers.findIndex(t => t.id === 'tests-a-plus')

      expect(freeIndex).toBeLessThan(proIndex)
      expect(proIndex).toBeLessThan(eliteIndex)
    })

    it('pro tier is marked as popular', async () => {
      const tiers = await service.getTiers()
      const pro = tiers.find(t => t.id === 'pro')
      expect(pro?.isPopular).toBe(true)
    })

    it('free and elite tiers are not popular', async () => {
      const tiers = await service.getTiers()
      const free = tiers.find(t => t.id === 'free')
      const elite = tiers.find(t => t.id === 'tests-a-plus')
      expect(free?.isPopular).toBe(false)
      expect(elite?.isPopular).toBe(false)
    })
  })
})