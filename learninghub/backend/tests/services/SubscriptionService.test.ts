import { PrismaClient } from '@prisma/client'
import { SubscriptionService } from '../../src/services/SubscriptionService'
import { mockDeep, mockReset } from 'jest-mock-extended'

jest.mock('../../src/prismaClient', () => ({
  prisma: mockDeep<PrismaClient>(),
}))

jest.mock('../../src/utils/logger', () => ({
  default: {
    warn: jest.fn(),
    error: jest.fn(),
    info: jest.fn(),
    debug: jest.fn(),
    audit: jest.fn(),
  },
}))

const mockPrisma: any = require('../../src/prismaClient').prisma

describe('SubscriptionService', () => {
  let service: SubscriptionService

  beforeEach(() => {
    mockReset(mockPrisma)
    service = new SubscriptionService()
  })

  describe('getTiers', () => {
    it('should return active tiers ordered by price', async () => {
      mockPrisma.subscriptionTier.findMany.mockResolvedValue([
        {
          id: 'free',
          name: 'Free',
          price: 0,
          interval: 'month',
          isActive: true,
          displayName: 'Free',
          description: '',
          currency: 'usd',
          trialDays: 0,
          features: [],
          limits: {},
        },
        {
          id: 'pro',
          name: 'Pro',
          price: 19,
          interval: 'month',
          isActive: true,
          displayName: 'Pro',
          description: '',
          currency: 'usd',
          trialDays: 14,
          features: [],
          limits: {},
        },
      ])

      const result = await service.getTiers()

      expect(result).toHaveLength(2)
      expect(mockPrisma.subscriptionTier.findMany).toHaveBeenCalledWith({
        where: { isActive: true },
        orderBy: { price: 'asc' },
      })
    })
  })

  describe('getUserSubscription', () => {
    it('should return subscription with tier and usage', async () => {
      mockPrisma.subscription.findUnique.mockResolvedValue({
        id: 'sub-1',
        userId: 'user-123',
        tierId: 'pro',
        status: 'ACTIVE',
        tier: { id: 'pro', name: 'Pro', limits: { testsPerDay: 10 } },
        usageLimits: [{ id: 'ul1', testsTaken: 5, aiGenerations: 2, questionsAnswered: 20 }],
      })

      const result = await service.getUserSubscription('user-123')

      expect(result).toBeDefined()
      expect(result?.tier.name).toBe('Pro')
      expect(result?.usageLimits).toHaveLength(1)
      expect(mockPrisma.subscription.findUnique).toHaveBeenCalledWith({
        where: { userId: 'user-123' },
        include: {
          tier: true,
          usageLimits: { orderBy: { period: 'desc' }, take: 1 },
        },
      })
    })

    it('should return null when no subscription', async () => {
      mockPrisma.subscription.findUnique.mockResolvedValue(null)

      const result = await service.getUserSubscription('user-none')

      expect(result).toBeNull()
    })
  })

  describe('createSubscription', () => {
    it('should create subscription without trial for free tier', async () => {
      mockPrisma.subscriptionTier.findUnique.mockResolvedValue({
        id: 'free',
        name: 'Free',
        price: 0,
        interval: 'MONTHLY',
      })
      mockPrisma.$transaction.mockImplementation(async (cb: any) => {
        const tx = {
          subscription: {
            create: jest.fn().mockResolvedValue({ id: 'sub-1', tierId: 'free', status: 'ACTIVE' }),
          },
          usageLimit: { create: jest.fn().mockResolvedValue({ id: 'ul1' }) },
        }
        return cb(tx)
      })

      const result = await service.createSubscription({ userId: 'user-1', tierId: 'free' })

      expect(result).toBeDefined()
      expect(result.status).toBe('ACTIVE')
      expect(mockPrisma.subscriptionTier.findUnique).toHaveBeenCalledWith({
        where: { id: 'free', isActive: true },
      })
    })

    it('should create subscription with trial for paid tier', async () => {
      mockPrisma.subscriptionTier.findUnique.mockResolvedValue({
        id: 'pro',
        name: 'Pro',
        price: 19,
        interval: 'MONTHLY',
      })

      const mockCreate = jest.fn().mockReturnValue(Promise.resolve({ id: 'sub-trial' }))
      mockPrisma.$transaction.mockImplementation(async (cb: any) => {
        const tx = {
          subscription: { create: mockCreate },
          usageLimit: { create: jest.fn().mockResolvedValue({}) },
        }
        return cb(tx)
      })

      await service.createSubscription({ userId: 'user-1', tierId: 'pro', trialDays: 14 })

      expect(mockCreate).toHaveBeenCalled()
      const createArgs = mockCreate.mock.calls[0][0]
      expect(createArgs.data.status).toBe('TRIAL')
      expect(createArgs.data.trialEndsAt).toBeInstanceOf(Date)
    })

    it('should throw for invalid tier', async () => {
      mockPrisma.subscriptionTier.findUnique.mockResolvedValue(null)

      await expect(
        service.createSubscription({ userId: 'user-1', tierId: 'invalid' })
      ).rejects.toThrow('Invalid subscription tier')
    })

    it('should create yearly subscription', async () => {
      mockPrisma.subscriptionTier.findUnique.mockResolvedValue({
        id: 'pro-yearly',
        name: 'Pro Yearly',
        price: 199,
        interval: 'YEARLY',
      })
      mockPrisma.$transaction.mockImplementation(async (cb: any) => {
        const tx = {
          subscription: {
            create: jest.fn().mockImplementation((args: any) => {
              const endDate = args.data.currentPeriodEnd
              const yearFromNow = new Date()
              yearFromNow.setFullYear(yearFromNow.getFullYear() + 1)
              const diff = Math.abs(endDate.getTime() - yearFromNow.getTime())
              expect(diff).toBeLessThan(1000)
              return Promise.resolve({ id: 'sub-yearly' })
            }),
          },
          usageLimit: { create: jest.fn().mockResolvedValue({}) },
        }
        return cb(tx)
      })

      const result = await service.createSubscription({ userId: 'user-1', tierId: 'pro-yearly' })

      expect(result).toBeDefined()
    })
  })

  describe('cancelSubscription', () => {
    it('should cancel subscription and set cancelledAt', async () => {
      mockPrisma.subscription.update.mockResolvedValue({})

      await service.cancelSubscription('user-1')

      expect(mockPrisma.subscription.update).toHaveBeenCalledWith({
        where: { userId: 'user-1' },
        data: {
          status: 'CANCELLED',
          cancelledAt: expect.any(Date),
        },
      })
    })
  })

  describe('hasPremiumAccess', () => {
    it('should return true for active subscription within period', async () => {
      const futureDate = new Date()
      futureDate.setMonth(futureDate.getMonth() + 1)

      mockPrisma.subscription.findUnique.mockResolvedValue({
        id: 'sub-1',
        status: 'ACTIVE',
        trialEndsAt: null,
        currentPeriodEnd: futureDate,
      })

      const result = await service.hasPremiumAccess('user-1')

      expect(result).toBe(true)
    })

    it('should return true for trial within trial period', async () => {
      const futureDate = new Date()
      futureDate.setDate(futureDate.getDate() + 7)

      mockPrisma.subscription.findUnique.mockResolvedValue({
        id: 'sub-2',
        status: 'TRIAL',
        trialEndsAt: futureDate,
        currentPeriodEnd: null,
      })

      const result = await service.hasPremiumAccess('user-1')

      expect(result).toBe(true)
    })

    it('should return false for expired trial', async () => {
      const pastDate = new Date()
      pastDate.setDate(pastDate.getDate() - 1)

      mockPrisma.subscription.findUnique.mockResolvedValue({
        id: 'sub-3',
        status: 'TRIAL',
        trialEndsAt: pastDate,
        currentPeriodEnd: null,
      })

      const result = await service.hasPremiumAccess('user-1')

      expect(result).toBe(false)
    })

    it('should return false for expired period', async () => {
      const pastDate = new Date()
      pastDate.setMonth(pastDate.getMonth() - 1)

      mockPrisma.subscription.findUnique.mockResolvedValue({
        id: 'sub-4',
        status: 'ACTIVE',
        trialEndsAt: null,
        currentPeriodEnd: pastDate,
      })

      const result = await service.hasPremiumAccess('user-1')

      expect(result).toBe(false)
    })

    it('should return false for no subscription', async () => {
      mockPrisma.subscription.findUnique.mockResolvedValue(null)

      const result = await service.hasPremiumAccess('user-no')

      expect(result).toBe(false)
    })

    it('should return false for cancelled status', async () => {
      mockPrisma.subscription.findUnique.mockResolvedValue({
        status: 'CANCELLED',
      })

      const result = await service.hasPremiumAccess('user-1')

      expect(result).toBe(false)
    })
  })

  describe('checkUsageLimit', () => {
    it('should allow free tier user within limits', async () => {
      mockPrisma.subscription.findUnique.mockResolvedValue(null)
      mockPrisma.testResult.count.mockResolvedValue(2)

      const result = await service.checkUsageLimit('user-1', 'testsTaken')

      expect(result.allowed).toBe(true)
      expect(result.current).toBe(2)
      expect(result.limit).toBe(3)
    })

    it('should deny free tier user exceeding limits', async () => {
      mockPrisma.subscription.findUnique.mockResolvedValue(null)
      mockPrisma.testResult.count.mockResolvedValue(3)

      const result = await service.checkUsageLimit('user-1', 'testsTaken')

      expect(result.allowed).toBe(false)
      expect(result.limit).toBe(3)
    })

    it('should return limits for subscribed user', async () => {
      mockPrisma.subscription.findUnique.mockResolvedValue({
        id: 'sub-1',
        status: 'ACTIVE',
        tier: { id: 'pro', limits: { testsTaken: Infinity, aiGenerations: 100 } },
        usageLimits: [{ id: 'ul-1', testsTaken: 5, aiGenerations: 10 }],
      })

      const result = await service.checkUsageLimit('user-1', 'aiGenerations')

      expect(result.allowed).toBe(true)
      expect(result.current).toBe(10)
      expect(result.limit).toBe(100)
    })

    it('should handle unlimited tier with no limit key', async () => {
      mockPrisma.subscription.findUnique.mockResolvedValue({
        id: 'sub-1',
        status: 'ACTIVE',
        tier: { id: 'ultimate', limits: {} },
        usageLimits: [{ id: 'ul-1', testsTaken: 999 }],
      })

      const result = await service.checkUsageLimit('user-1', 'testsTaken')

      expect(result.limit).toBe(Infinity)
      expect(result.allowed).toBe(true)
    })

    it('should deny non-active subscription', async () => {
      mockPrisma.subscription.findUnique.mockResolvedValue({
        id: 'sub-1',
        status: 'CANCELLED',
        tier: { limits: { testsTaken: 10 } },
        usageLimits: [],
      })

      const result = await service.checkUsageLimit('user-1', 'testsTaken')

      expect(result.allowed).toBe(false)
      expect(result.limit).toBe(0)
      expect(result.current).toBe(0)
    })
  })

  describe('incrementUsage', () => {
    it('should increment usage for subscribed user', async () => {
      mockPrisma.subscription.findUnique.mockResolvedValue({
        id: 'sub-1',
        status: 'ACTIVE',
        usageLimits: [{ id: 'ul-1', testsTaken: 5, aiGenerations: 2, questionsAnswered: 20 }],
      })
      mockPrisma.usageLimit.update.mockResolvedValue({})

      await service.incrementUsage('user-1', 'questionsAnswered')

      expect(mockPrisma.usageLimit.update).toHaveBeenCalledWith({
        where: { id: 'ul-1' },
        data: { questionsAnswered: { increment: 1 }, updatedAt: expect.any(Date) },
      })
    })

    it('should be no-op for free tier user (no subscription)', async () => {
      mockPrisma.subscription.findUnique.mockResolvedValue(null)

      await service.incrementUsage('user-1', 'testsTaken')

      expect(mockPrisma.usageLimit.update).not.toHaveBeenCalled()
    })

    it('should be no-op when usage record is missing', async () => {
      mockPrisma.subscription.findUnique.mockResolvedValue({
        id: 'sub-1',
        status: 'ACTIVE',
        usageLimits: [],
      })

      await service.incrementUsage('user-1', 'testsTaken')

      expect(mockPrisma.usageLimit.update).not.toHaveBeenCalled()
    })
  })

  describe('validateCoupon', () => {
    it('should return valid discount for matching coupon', async () => {
      const futureDate = new Date()
      futureDate.setMonth(futureDate.getMonth() + 1)

      mockPrisma.coupon.findUnique.mockResolvedValue({
        code: 'SAVE20',
        isActive: true,
        validFrom: new Date(),
        validUntil: futureDate,
        usedCount: 5,
        maxUses: 100,
        applicableTierIds: ['pro'],
        discountType: 'PERCENTAGE',
        discountValue: 20,
      })

      const result = await service.validateCoupon('SAVE20', 'pro')

      expect(result.valid).toBe(true)
      expect(result.discount).toEqual({ type: 'PERCENTAGE', value: 20 })
    })

    it('should return invalid for non-existent coupon', async () => {
      mockPrisma.coupon.findUnique.mockResolvedValue(null)

      const result = await service.validateCoupon('FAKE')

      expect(result.valid).toBe(false)
      expect(result.message).toBe('Coupon not found')
    })

    it('should return invalid for expired coupon', async () => {
      const pastDate = new Date()
      pastDate.setMonth(pastDate.getMonth() - 1)

      mockPrisma.coupon.findUnique.mockResolvedValue({
        code: 'OLD',
        isActive: true,
        validFrom: new Date('2020-01-01'),
        validUntil: pastDate,
        usedCount: 0,
        maxUses: 100,
        applicableTierIds: [],
      })

      const result = await service.validateCoupon('OLD')

      expect(result.valid).toBe(false)
      expect(result.message).toBe('Coupon has expired')
    })

    it('should return invalid for not-yet-active coupon', async () => {
      const futureDate = new Date()
      futureDate.setMonth(futureDate.getMonth() + 1)

      mockPrisma.coupon.findUnique.mockResolvedValue({
        code: 'FUTURE',
        isActive: true,
        validFrom: futureDate,
        validUntil: new Date('2099-01-01'),
        usedCount: 0,
        maxUses: 100,
        applicableTierIds: [],
      })

      const result = await service.validateCoupon('FUTURE')

      expect(result.valid).toBe(false)
      expect(result.message).toBe('Coupon is not yet active')
    })

    it('should return invalid when max uses reached', async () => {
      mockPrisma.coupon.findUnique.mockResolvedValue({
        code: 'LIMITED',
        isActive: true,
        validFrom: new Date(),
        validUntil: new Date('2099-01-01'),
        usedCount: 100,
        maxUses: 100,
        applicableTierIds: [],
      })

      const result = await service.validateCoupon('LIMITED')

      expect(result.valid).toBe(false)
      expect(result.message).toBe('Coupon has reached maximum uses')
    })

    it('should return invalid for tier mismatch', async () => {
      mockPrisma.coupon.findUnique.mockResolvedValue({
        code: 'TRIALONLY',
        isActive: true,
        validFrom: new Date(),
        validUntil: new Date('2099-01-01'),
        usedCount: 0,
        maxUses: 100,
        applicableTierIds: ['pro'],
        discountType: 'FIXED',
        discountValue: 5,
      })

      const result = await service.validateCoupon('TRIALONLY', 'free')

      expect(result.valid).toBe(false)
      expect(result.message).toBe('Coupon not applicable for this tier')
    })

    it('should allow coupon with no tier restrictions', async () => {
      mockPrisma.coupon.findUnique.mockResolvedValue({
        code: 'UNIVERSAL',
        isActive: true,
        validFrom: new Date(),
        validUntil: new Date('2099-01-01'),
        usedCount: 0,
        maxUses: null,
        applicableTierIds: [],
        discountType: 'FIXED',
        discountValue: 10,
      })

      const result = await service.validateCoupon('UNIVERSAL', 'any')

      expect(result.valid).toBe(true)
      expect(result.discount).toEqual({ type: 'FIXED', value: 10 })
    })
  })

  describe('applyCoupon', () => {
    it('should increment coupon usedCount', async () => {
      mockPrisma.coupon.update.mockResolvedValue({
        code: 'SAVE20',
        usedCount: 6,
      })

      await service.applyCoupon('SAVE20')

      expect(mockPrisma.coupon.update).toHaveBeenCalledWith({
        where: { code: 'SAVE20' },
        data: { usedCount: { increment: 1 } },
      })
    })
  })
})
