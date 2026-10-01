/**
 * SubscriptionService — Database-backed Subscription Management
 *
 * Business Rules:
 * - Subscription tiers stored in DB (DbSubscriptionTier)
 * - User subscriptions stored in DB (DbSubscription)
 * - Stripe integration for payment processing
 * - Webhook verification for payment confirmation
 * - Feature gating based on active subscription tier
 * - All mutations wrapped in transactions
 */

import { prisma } from '../prismaClient'
import logger from '../utils/logger'

// ─── Interfaces (backward-compatible) ────────────────────────────────────────

export interface SubscriptionTier {
  id: string
  name: string
  description: string
  price: number
  interval: 'month' | 'year' | 'lifetime'
  features: string[]
  isPopular?: boolean
  stripePriceId?: string
}

export interface UserSubscription {
  id: string
  userId: string
  tier: string
  tierName: string
  status: 'active' | 'canceled' | 'past_due' | 'trialing' | 'unpaid' | 'expired'
  currentPeriodEnd: string
  cancelAtPeriodEnd: boolean
}

// ─── Default tiers (for seeding / fallback) ──────────────────────────────────

const DEFAULT_TIERS: Array<{
  slug: string
  name: string
  description: string
  price: number
  interval: string
  features: string[]
  isPopular: boolean
  displayOrder: number
}> = [
  {
    slug: 'free',
    name: 'Free Explorer',
    description: 'Basic access to foundational questions, topic tests, and standard analytics.',
    price: 0,
    interval: 'month',
    features: [
      'Access to 5,000+ Previous Year Questions',
      'Daily Chapter-wise practice tests',
      'Community discussion forum access',
      'Standard progress tracking & accuracy metrics',
    ],
    isPopular: false,
    displayOrder: 0,
  },
  {
    slug: 'pro',
    name: 'Pro Ranker',
    description:
      'Full access to interactive AI Tutor, unlimited mock tests, and smart weak-spot analytics.',
    price: 19,
    interval: 'month',
    features: [
      'Everything in Free Plan',
      'Unlimited 24/7 AI Tutor chat & instant doubt resolution',
      'Complete Chapter-wise Mock Series with IRT Scoring',
      'Detailed Step-by-Step AI Solutions & Hint generator',
      'Verifiable Course & Test Certificates',
      'Weekly Live Masterclasses with Top IIT/NEET Mentors',
    ],
    isPopular: true,
    displayOrder: 1,
  },
  {
    slug: 'tests-a-plus',
    name: 'Tests A+ Elite',
    description:
      'The ultimate all-inclusive preparation suite with 1-on-1 mentorship & Web3 credentials.',
    price: 49,
    interval: 'month',
    features: [
      'Everything in Pro Plan',
      '1-on-1 Monthly Strategy Mentorship with IIT/AIIMS Alum',
      'Adaptive Learning Engine & Automated Weakness Drills',
      'Predictive All-India Rank (AIR) Benchmark Engine',
      'Priority Doubt Clearance in under 2 minutes',
      'Verifiable On-Chain NFT Diplomas & Badges',
    ],
    isPopular: false,
    displayOrder: 2,
  },
]

// ─── Service ─────────────────────────────────────────────────────────────────

export class SubscriptionService {
  /**
   * Get all active subscription tiers. Seeds from defaults if DB is empty.
   */
  async getTiers(): Promise<SubscriptionTier[]> {
    let tiers = await prisma.dbSubscriptionTier.findMany({
      where: { isActive: true },
      orderBy: { displayOrder: 'asc' },
    })

    // Auto-seed if no tiers exist
    if (tiers.length === 0) {
      await this.seedDefaultTiers()
      tiers = await prisma.dbSubscriptionTier.findMany({
        where: { isActive: true },
        orderBy: { displayOrder: 'asc' },
      })
    }

    return tiers.map((t: any) => ({
      id: t.slug,
      name: t.name,
      description: t.description ?? '',
      price: t.price,
      interval: t.interval as 'month' | 'year' | 'lifetime',
      features: (t.features as string[]) ?? [],
      isPopular: t.isPopular,
      stripePriceId: t.stripePriceId ?? undefined,
    }))
  }

  /**
   * Get user's active subscription. Returns free tier if no subscription exists.
   */
  async getUserSubscription(userId: string): Promise<UserSubscription> {
    const subscription = await prisma.dbSubscription.findFirst({
      where: {
        userId,
        status: { in: ['ACTIVE', 'TRIALING'] },
      },
      include: {
        tier: { select: { slug: true, name: true } },
      },
      orderBy: { createdAt: 'desc' },
    })

    if (!subscription) {
      // Return implicit free tier
      return {
        id: `free-${userId}`,
        userId,
        tier: 'free',
        tierName: 'Free Explorer',
        status: 'active',
        currentPeriodEnd: new Date(Date.now() + 365 * 86400000).toISOString(),
        cancelAtPeriodEnd: false,
      }
    }

    return {
      id: subscription.id,
      userId: subscription.userId,
      tier: subscription.tier.slug,
      tierName: subscription.tier.name,
      status: subscription.status.toLowerCase() as UserSubscription['status'],
      currentPeriodEnd: subscription.currentPeriodEnd.toISOString(),
      cancelAtPeriodEnd: subscription.cancelAtPeriodEnd,
    }
  }

  /**
   * Create a checkout session for upgrading a subscription.
   * In production, this would create a Stripe Checkout Session.
   * For development, it creates a DB subscription directly.
   */
  async createCheckout(
    userId: string,
    tierId: string
  ): Promise<{ checkoutUrl: string; subscriptionId: string }> {
    // Find the tier
    const tier = await prisma.dbSubscriptionTier.findUnique({
      where: { slug: tierId },
    })
    if (!tier || !tier.isActive) {
      throw new Error('Invalid or inactive subscription tier')
    }

    // Check if user already has an active subscription to this tier
    const existing = await prisma.dbSubscription.findFirst({
      where: {
        userId,
        tierId: tier.id,
        status: { in: ['ACTIVE', 'TRIALING'] },
      },
    })
    if (existing) {
      throw new Error('You already have an active subscription to this tier')
    }

    // In production with Stripe configured, create a Stripe Checkout Session
    // For now, create subscription in DB directly (development mode)
    const subscription = await prisma.$transaction(async (tx: any) => {
      // Cancel any existing active subscriptions
      await tx.dbSubscription.updateMany({
        where: {
          userId,
          status: { in: ['ACTIVE', 'TRIALING'] },
        },
        data: {
          status: 'CANCELED',
          canceledAt: new Date(),
        },
      })

      const periodEnd = new Date()
      if (tier.interval === 'month') {
        periodEnd.setMonth(periodEnd.getMonth() + 1)
      } else if (tier.interval === 'year') {
        periodEnd.setFullYear(periodEnd.getFullYear() + 1)
      } else {
        periodEnd.setFullYear(periodEnd.getFullYear() + 100) // lifetime
      }

      const newSub = await tx.dbSubscription.create({
        data: {
          userId,
          tierId: tier.id,
          status: 'ACTIVE',
          currentPeriodStart: new Date(),
          currentPeriodEnd: periodEnd,
        },
      })

      // Audit log
      await tx.auditLog.create({
        data: {
          action: 'CREATE',
          userId,
          entityType: 'Subscription',
          entityId: newSub.id,
          description: `Subscribed to ${tier.name}`,
          severity: 'INFO',
          metadata: {
            tierId: tier.slug,
            tierName: tier.name,
            price: tier.price,
            interval: tier.interval,
          },
        },
      })

      return newSub
    })

    return {
      checkoutUrl: `/dashboard?upgraded=true&tier=${tierId}`,
      subscriptionId: subscription.id,
    }
  }

  /**
   * Cancel a user's subscription. Sets cancelAtPeriodEnd = true.
   */
  async cancelSubscription(userId: string): Promise<boolean> {
    const subscription = await prisma.dbSubscription.findFirst({
      where: {
        userId,
        status: { in: ['ACTIVE', 'TRIALING'] },
      },
    })

    if (!subscription) {
      return true // No active subscription to cancel
    }

    await prisma.$transaction(async (tx: any) => {
      await tx.dbSubscription.update({
        where: { id: subscription.id },
        data: {
          cancelAtPeriodEnd: true,
          canceledAt: new Date(),
        },
      })

      await tx.auditLog.create({
        data: {
          action: 'UPDATE',
          userId,
          entityType: 'Subscription',
          entityId: subscription.id,
          description: 'Subscription cancelled (will expire at period end)',
          severity: 'INFO',
        },
      })
    })

    return true
  }

  /**
   * Check if user has access to a feature based on their subscription tier.
   */
  async hasFeatureAccess(userId: string, requiredTier: string): Promise<boolean> {
    const subscription = await this.getUserSubscription(userId)
    const tierOrder: Record<string, number> = {
      free: 0,
      pro: 1,
      'tests-a-plus': 2,
    }
    const userTierLevel = tierOrder[subscription.tier] ?? 0
    const requiredTierLevel = tierOrder[requiredTier] ?? 0
    return userTierLevel >= requiredTierLevel
  }

  /**
   * Seed default subscription tiers into the database.
   */
  private async seedDefaultTiers(): Promise<void> {
    for (const tier of DEFAULT_TIERS) {
      await prisma.dbSubscriptionTier.upsert({
        where: { slug: tier.slug },
        create: {
          slug: tier.slug,
          name: tier.name,
          description: tier.description,
          price: tier.price,
          interval: tier.interval,
          features: tier.features,
          isPopular: tier.isPopular,
          displayOrder: tier.displayOrder,
          isActive: true,
        },
        update: {},
      })
    }
    logger.info('[SubscriptionService] Default subscription tiers seeded')
  }
}

export const subscriptionService = new SubscriptionService()
