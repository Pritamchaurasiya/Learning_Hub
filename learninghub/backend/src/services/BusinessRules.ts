/**
 * BusinessRules — Centralized business rule validation module.
 *
 * ALL business invariants are defined here, making them:
 * - Discoverable (single source of truth)
 * - Testable (pure functions)
 * - Reusable across services and controllers
 *
 * Rules throw descriptive errors when violated.
 */

import { prisma } from '../prismaClient'

// ─── Constants ───────────────────────────────────────────────────────────────

export const CART_MAX_ITEMS = 20
export const CART_MAX_QUANTITY_PER_ITEM = 1 // Courses are digital goods — quantity 1 only
export const ORDER_EXPIRY_MINUTES = 30
export const PASSWORD_MIN_LENGTH = 8
export const PASSWORD_MAX_LENGTH = 128
export const MAX_CONCURRENT_SESSIONS = 5
export const COUPON_CODE_MAX_LENGTH = 50
export const IDEMPOTENCY_KEY_MAX_LENGTH = 128

// ─── Cart Rules ──────────────────────────────────────────────────────────────

export async function assertCartNotFull(userId: string): Promise<void> {
  const cart = await prisma.cart.findUnique({
    where: { userId },
    include: { items: { select: { id: true } } },
  })
  if (cart && cart.items.length >= CART_MAX_ITEMS) {
    throw new BusinessRuleError(
      `Cart cannot exceed ${CART_MAX_ITEMS} items`,
      'CART_LIMIT_EXCEEDED'
    )
  }
}

export async function assertCourseNotInCart(userId: string, courseId: string): Promise<void> {
  const cartItem = await prisma.cartItem.findFirst({
    where: {
      cart: { userId },
      courseId,
    },
  })
  if (cartItem) {
    throw new BusinessRuleError(
      'This course is already in your cart',
      'DUPLICATE_CART_ITEM'
    )
  }
}

export async function assertNotAlreadyEnrolled(userId: string, courseId: string): Promise<void> {
  const enrollment = await prisma.enrollment.findUnique({
    where: { userId_courseId: { userId, courseId } },
  })
  if (enrollment && enrollment.status === 'ACTIVE') {
    throw new BusinessRuleError(
      'You are already enrolled in this course',
      'ALREADY_ENROLLED'
    )
  }
}

// ─── Coupon Rules ────────────────────────────────────────────────────────────

export async function assertCouponValid(
  code: string,
  userId: string,
  orderAmount: number
): Promise<{
  couponId: string
  discountType: string
  discountValue: number
  maxDiscountAmount: number | null
}> {
  const coupon = await prisma.coupon.findUnique({
    where: { code: code.trim().toUpperCase() },
  })

  if (!coupon || !coupon.isActive) {
    throw new BusinessRuleError('Invalid coupon code', 'INVALID_COUPON')
  }

  if (coupon.expiresAt && coupon.expiresAt < new Date()) {
    throw new BusinessRuleError('This coupon has expired', 'COUPON_EXPIRED')
  }

  if (coupon.maxUses !== null && coupon.currentUses >= coupon.maxUses) {
    throw new BusinessRuleError('This coupon has reached its usage limit', 'COUPON_LIMIT_REACHED')
  }

  const existingUsage = await prisma.couponUsage.findUnique({
    where: { couponId_userId: { couponId: coupon.id, userId } },
  })
  if (existingUsage) {
    throw new BusinessRuleError('You have already used this coupon', 'COUPON_ALREADY_USED')
  }

  if (coupon.minOrderAmount !== null && orderAmount < coupon.minOrderAmount) {
    throw new BusinessRuleError(
      `Minimum order amount of ${coupon.minOrderAmount} required`,
      'COUPON_MIN_AMOUNT_NOT_MET'
    )
  }

  return {
    couponId: coupon.id,
    discountType: coupon.discountType,
    discountValue: coupon.discountValue,
    maxDiscountAmount: coupon.maxDiscountAmount,
  }
}

// ─── Certificate Rules ───────────────────────────────────────────────────────

export async function assertCertificateEligible(
  userId: string,
  courseId: string
): Promise<{ testTitle: string; testResultId: string | null }> {
  // Check for completed and passed test
  const result = await prisma.testResult.findFirst({
    where: {
      userId,
      testId: courseId,
      status: 'COMPLETED',
      passed: true,
    },
    select: { id: true, test: { select: { title: true } } },
  })

  if (result) {
    return { testTitle: result.test.title, testResultId: result.id }
  }

  // Check enrollment completion as fallback
  const enrollment = await prisma.enrollment
    .findUnique({
      where: { userId_courseId: { userId, courseId } },
    })
    .catch(() => null)

  if (enrollment?.completedAt) {
    return { testTitle: 'Course Completion', testResultId: null }
  }

  throw new BusinessRuleError(
    'You must complete and pass the course/test before a certificate can be issued',
    'CERTIFICATE_NOT_ELIGIBLE'
  )
}

export async function assertCertificateNotDuplicate(
  userId: string,
  courseId: string
): Promise<void> {
  const existing = await prisma.certificate.findFirst({
    where: { userId, courseId, isRevoked: false },
  })
  if (existing) {
    throw new BusinessRuleError(
      'A certificate has already been issued for this course',
      'CERTIFICATE_DUPLICATE'
    )
  }
}

// ─── Test Rules ──────────────────────────────────────────────────────────────

export async function assertMaxAttemptsNotExceeded(
  userId: string,
  testId: string
): Promise<number> {
  const test = await prisma.test.findUnique({
    where: { id: testId },
    select: { maxAttempts: true },
  })

  if (!test) {
    throw new BusinessRuleError('Test not found', 'TEST_NOT_FOUND')
  }

  if (test.maxAttempts === null || test.maxAttempts <= 0) {
    // Unlimited attempts
    const count = await prisma.testResult.count({
      where: { userId, testId },
    })
    return count + 1
  }

  const attemptCount = await prisma.testResult.count({
    where: { userId, testId },
  })

  if (attemptCount >= test.maxAttempts) {
    throw new BusinessRuleError(
      `Maximum ${test.maxAttempts} attempts allowed for this test`,
      'MAX_ATTEMPTS_EXCEEDED'
    )
  }

  return attemptCount + 1
}

// ─── Subscription Rules ──────────────────────────────────────────────────────

export async function assertSubscriptionFeatureAccess(
  userId: string,
  requiredTier: 'free' | 'pro' | 'tests-a-plus'
): Promise<void> {
  const tierOrder: Record<string, number> = {
    free: 0,
    pro: 1,
    'tests-a-plus': 2,
  }

  const subscription = await prisma.dbSubscription.findFirst({
    where: {
      userId,
      status: { in: ['ACTIVE', 'TRIALING'] },
    },
    include: { tier: { select: { slug: true } } },
  })

  const userTierLevel = subscription ? (tierOrder[subscription.tier.slug] ?? 0) : 0
  const requiredTierLevel = tierOrder[requiredTier] ?? 0

  if (userTierLevel < requiredTierLevel) {
    throw new BusinessRuleError(
      `This feature requires a ${requiredTier} subscription`,
      'SUBSCRIPTION_REQUIRED'
    )
  }
}

// ─── Error Class ─────────────────────────────────────────────────────────────

export class BusinessRuleError extends Error {
  public readonly code: string

  constructor(message: string, code: string) {
    super(message)
    this.name = 'BusinessRuleError'
    this.code = code
  }
}
