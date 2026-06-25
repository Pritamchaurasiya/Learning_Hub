import request from 'supertest'
import express, { Router } from 'express'
import { prisma } from '../../src/prismaClient'

jest.mock('../../src/utils/logger', () => ({
  __esModule: true,
  default: {
    info: jest.fn(),
    error: jest.fn(),
    warn: jest.fn(),
    audit: jest.fn(),
    debug: jest.fn(),
  },
}))

jest.mock('../../src/services/CacheService', () => ({
  cacheService: {
    get: jest.fn().mockResolvedValue(null),
    set: jest.fn().mockResolvedValue(true),
    delete: jest.fn().mockResolvedValue(true),
  },
}))

import {
  getTiers,
  getMySubscription,
  createSubscription,
  cancelSubscription,
  validateCoupon,
} from '../../src/controllers/subscriptionsController'

function makeApp(userId = 'user-123') {
  const app = express()
  app.use(express.json())
  app.use((req: any, _res: any, next: any) => {
    req.user = { userId, email: 'test@test.com', role: 'STUDENT' }
    next()
  })
  const r = Router()
  r.get('/subscriptions/tiers', getTiers)
  r.get('/subscriptions/me', getMySubscription)
  r.post('/subscriptions/create', createSubscription)
  r.post('/subscriptions/cancel', cancelSubscription)
  r.post('/subscriptions/coupon/validate', validateCoupon)
  app.use('/api/v1', r)
  return app
}

// ─── Shared fixtures ──────────────────────────────────────────────────────────
const TIER_FREE = {
  id: 'free',
  name: 'Free',
  displayName: 'Free',
  description: 'Basic access',
  price: 0,
  currency: 'usd',
  interval: 'MONTHLY',
  trialDays: 0,
  features: [],
  limits: { testsPerDay: 3, aiGenerations: 2, questionsPerDay: 50 },
}

const TIER_PRO = {
  id: 'pro',
  name: 'Pro',
  displayName: 'Pro',
  description: 'Full access',
  price: 19,
  currency: 'usd',
  interval: 'MONTHLY',
  trialDays: 14,
  features: [],
  limits: { testsPerDay: 50, aiGenerations: 100, questionsPerDay: 500 },
}

// ─── GET /subscriptions/tiers ─────────────────────────────────────────────────
describe('GET /subscriptions/tiers', () => {
  it('returns 200 with tiers list', async () => {
    ;(prisma.subscriptionTier.findMany as jest.Mock).mockResolvedValue([TIER_FREE, TIER_PRO])

    const res = await request(makeApp()).get('/api/v1/subscriptions/tiers')
    expect(res.status).toBe(200)
    expect(res.body.data.tiers).toHaveLength(2)
    expect(res.body.data.tiers[0].name).toBe('Free')
    expect(res.body.data.tiers[1].name).toBe('Pro')
  })

  it('returns 500 on DB error', async () => {
    ;(prisma.subscriptionTier.findMany as jest.Mock).mockRejectedValue(new Error('DB down'))

    const res = await request(makeApp()).get('/api/v1/subscriptions/tiers')
    expect(res.status).toBe(500)
  })
})

// ─── GET /subscriptions/me ────────────────────────────────────────────────────
describe('GET /subscriptions/me', () => {
  it('returns 200 with active subscription', async () => {
    ;(prisma.subscription.findUnique as jest.Mock).mockResolvedValue({
      id: 'sub-1',
      userId: 'user-123',
      tierId: 'pro',
      status: 'ACTIVE',
      trialEndsAt: null,
      currentPeriodEnd: new Date('2099-01-01'),
      tier: TIER_PRO,
      usageLimits: [
        { id: 'ul-1', testsTaken: 5, aiGenerations: 10, questionsAnswered: 20, period: new Date() },
      ],
    })

    const res = await request(makeApp()).get('/api/v1/subscriptions/me')
    expect(res.status).toBe(200)
    expect(res.body.data.active).toBe(true)
    expect(res.body.data.tier).toBe('Pro')
    expect(res.body.data.usage).toBeDefined()
  })

  it('returns 200 with free tier when no subscription', async () => {
    ;(prisma.subscription.findUnique as jest.Mock).mockResolvedValue(null)

    const res = await request(makeApp()).get('/api/v1/subscriptions/me')
    expect(res.status).toBe(200)
    expect(res.body.data.active).toBe(false)
    expect(res.body.data.tier).toBe('free')
    expect(res.body.data.limits.tests_per_day).toBe(3)
  })

  it('returns 401 when unauthenticated', async () => {
    const appWithoutUser = express()
    appWithoutUser.use(express.json())
    const r = Router()
    r.get('/subscriptions/me', getMySubscription)
    appWithoutUser.use('/api/v1', r)

    const res = await request(appWithoutUser).get('/api/v1/subscriptions/me')
    expect(res.status).toBe(401)
  })

  it('returns 500 on DB error', async () => {
    ;(prisma.subscription.findUnique as jest.Mock).mockRejectedValue(new Error('DB down'))

    const res = await request(makeApp()).get('/api/v1/subscriptions/me')
    expect(res.status).toBe(500)
  })
})

// ─── POST /subscriptions/create ───────────────────────────────────────────────
describe('POST /subscriptions/create', () => {
  afterEach(() => {
    jest.resetModules()
  })

  it('creates free tier subscription → 201', async () => {
    ;(prisma.subscriptionTier.findMany as jest.Mock).mockResolvedValue([TIER_FREE, TIER_PRO])
    ;(prisma.subscriptionTier.findUnique as jest.Mock).mockResolvedValue(TIER_FREE)
    ;(prisma.$transaction as jest.Mock).mockImplementation(async (cb: any) => {
      const tx = {
        subscription: {
          create: jest
            .fn()
            .mockResolvedValue({ id: 'sub-free', status: 'ACTIVE', tier: TIER_FREE }),
        },
        usageLimit: { create: jest.fn().mockResolvedValue({}) },
      }
      return cb(tx)
    })
    ;(prisma.coupon.update as jest.Mock).mockResolvedValue({})

    const res = await request(makeApp())
      .post('/api/v1/subscriptions/create')
      .send({ tier_id: 'free' })
    expect(res.status).toBe(201)
    expect(res.body.data.id).toBe('sub-free')
  })

  it('requires tier_id', async () => {
    ;(prisma.subscriptionTier.findMany as jest.Mock).mockResolvedValue([TIER_FREE, TIER_PRO])

    const res = await request(makeApp()).post('/api/v1/subscriptions/create').send({})
    expect(res.status).toBe(400)
  })

  it('cancels when coupon is invalid', async () => {
    ;(prisma.subscriptionTier.findMany as jest.Mock).mockResolvedValue([TIER_FREE, TIER_PRO])
    ;(prisma.coupon.findUnique as jest.Mock).mockResolvedValue(null)

    const res = await request(makeApp())
      .post('/api/v1/subscriptions/create')
      .send({ tier_id: 'free', coupon_code: 'FAKE' })
    expect(res.status).toBe(400)
  })

  it('returns 404 when tier not found', async () => {
    ;(prisma.subscriptionTier.findMany as jest.Mock).mockResolvedValue([])

    const res = await request(makeApp())
      .post('/api/v1/subscriptions/create')
      .send({ tier_id: 'nonexistent' })
    expect(res.status).toBe(404)
  })

  it('creates checkout session for paid tier', async () => {
    ;(prisma.subscriptionTier.findMany as jest.Mock).mockResolvedValue([TIER_FREE, TIER_PRO])
    ;(prisma.subscriptionTier.findUnique as jest.Mock).mockResolvedValue(TIER_PRO)

    jest.mock('../../src/services/PaymentService', () => ({
      PaymentService: {
        createSubscriptionCheckoutSession: jest.fn().mockResolvedValue({
          url: 'https://checkout.stripe.com/session-123',
        }),
      },
    }))

    const res = await request(makeApp())
      .post('/api/v1/subscriptions/create')
      .send({ tier_id: 'pro' })
    expect(res.status).toBe(201)
    expect(res.body.data.checkoutUrl).toBe('https://checkout.stripe.com/session-123')
  })
})

// ─── POST /subscriptions/cancel ───────────────────────────────────────────────
describe('POST /subscriptions/cancel', () => {
  it('cancels subscription → 200', async () => {
    ;(prisma.subscription.update as jest.Mock).mockResolvedValue({
      id: 'sub-1',
      status: 'CANCELLED',
      cancelledAt: new Date(),
    })

    const res = await request(makeApp()).post('/api/v1/subscriptions/cancel')
    expect(res.status).toBe(200)
    expect(res.body.message).toBe('Subscription cancelled')
  })

  it('requires authentication', async () => {
    const appWithoutUser = express()
    appWithoutUser.use(express.json())
    const r = Router()
    r.post('/subscriptions/cancel', cancelSubscription)
    appWithoutUser.use('/api/v1', r)

    const res = await request(appWithoutUser).post('/api/v1/subscriptions/cancel')
    expect(res.status).toBe(401)
  })

  it('returns 500 on error', async () => {
    ;(prisma.subscription.update as jest.Mock).mockRejectedValue(new Error('DB down'))

    const res = await request(makeApp()).post('/api/v1/subscriptions/cancel')
    expect(res.status).toBe(500)
  })
})

// ─── POST /subscriptions/coupon/validate ─────────────────────────────────────
describe('POST /subscriptions/coupon/validate', () => {
  it('returns 400 when code is missing', async () => {
    const res = await request(makeApp()).post('/api/v1/subscriptions/coupon/validate').send({})
    expect(res.status).toBe(400)
  })

  it('returns 200 with valid coupon', async () => {
    const futureDate = new Date()
    futureDate.setMonth(futureDate.getMonth() + 1)
    ;(prisma.coupon.findUnique as jest.Mock).mockResolvedValue({
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

    const res = await request(makeApp())
      .post('/api/v1/subscriptions/coupon/validate')
      .send({ code: 'SAVE20', tier_id: 'pro' })
    expect(res.status).toBe(200)
    expect(res.body.data.valid).toBe(true)
    expect(res.body.data.discount.value).toBe(20)
  })

  it('returns 200 for invalid coupon', async () => {
    ;(prisma.coupon.findUnique as jest.Mock).mockResolvedValue(null)

    const res = await request(makeApp())
      .post('/api/v1/subscriptions/coupon/validate')
      .send({ code: 'FAKE' })
    expect(res.status).toBe(200)
    expect(res.body.data.valid).toBe(false)
    expect(res.body.data.message).toBe('Coupon not found')
  })
})
