/**
 * Payment Service - Stripe Integration
 * Handles checkout sessions, webhooks, and enrollment.
 * NOTE: Stripe and the Payment model are optional — the service degrades gracefully
 * when STRIPE_SECRET_KEY is not configured.
 */

import { prisma } from '../prismaClient'
import logger from '../utils/logger'

// Lazy-load Stripe to avoid crashing when the package isn't installed
async function getStripe() {
  try {
    const key = process.env.STRIPE_SECRET_KEY
    if (!key) return null

    const Stripe = require('stripe')
    return new Stripe(key, { apiVersion: '2024-12-18.acacia' })
  } catch {
    return null
  }
}

interface CheckoutSessionParams {
  userId: string
  courseId: string
  amount: number
  currency: string
  courseTitle: string
  successUrl: string
  cancelUrl: string
}

export class PaymentService {
  static async createCheckoutSession(params: CheckoutSessionParams) {
    const stripe = await getStripe()
    if (!stripe) {
      throw new Error('Payment gateway not configured. Please set STRIPE_SECRET_KEY.')
    }

    const session = await stripe.checkout.sessions.create({
      payment_method_types: ['card'],
      line_items: [
        {
          price_data: {
            currency: params.currency,
            product_data: {
              name: params.courseTitle,
              metadata: {
                courseId: params.courseId,
                userId: params.userId,
              },
            },
            unit_amount: Math.round(params.amount * 100),
          },
          quantity: 1,
        },
      ],
      mode: 'payment',
      success_url: params.successUrl,
      cancel_url: params.cancelUrl,
      metadata: {
        userId: params.userId,
        courseId: params.courseId,
      },
    })

    // Log payment intent (Payment model not yet in schema — use ActivityLog as fallback)
    try {
      await prisma.activityLog.create({
        data: {
          userId: params.userId,
          activityType: 'COURSE_ENROLL',
          entityType: 'Payment',
          entityId: session.id,
          metadata: {
            courseId: params.courseId,
            amount: params.amount,
            currency: params.currency,
            gateway: 'stripe',
            status: 'pending',
          },
        },
      })
    } catch (e) {
      logger.warn(`[PaymentService] Could not log payment activity: ${String(e)}`)
    }

    return { id: session.id as string, url: session.url as string }
  }

  static async createSubscriptionCheckoutSession(params: {
    userId: string
    tierId: string
    amount: number
    currency: string
    tierName: string
    successUrl: string
    cancelUrl: string
  }) {
    const stripe = await getStripe()
    if (!stripe) {
      throw new Error('Payment gateway not configured. Please set STRIPE_SECRET_KEY.')
    }

    const session = await stripe.checkout.sessions.create({
      payment_method_types: ['card'],
      line_items: [
        {
          price_data: {
            currency: params.currency,
            product_data: {
              name: params.tierName,
              metadata: {
                tierId: params.tierId,
                userId: params.userId,
              },
            },
            unit_amount: Math.round(params.amount * 100),
            recurring: {
              interval: 'month',
            },
          },
          quantity: 1,
        },
      ],
      mode: 'subscription',
      success_url: params.successUrl,
      cancel_url: params.cancelUrl,
      metadata: {
        userId: params.userId,
        tierId: params.tierId,
        type: 'subscription',
      },
    })

    return { id: session.id as string, url: session.url as string }
  }

  static async verifyCheckoutSession(sessionId: string) {
    const stripe = await getStripe()
    if (!stripe) {
      throw new Error('Payment gateway not configured. Please set STRIPE_SECRET_KEY.')
    }
    const session = await stripe.checkout.sessions.retrieve(sessionId)
    return session
  }

  static async handleWebhook(body: string, sig: string) {
    const stripe = await getStripe()
    if (!stripe) throw new Error('Stripe not configured')
    const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET
    if (!webhookSecret) {
      throw new Error(
        'STRIPE_WEBHOOK_SECRET environment variable is required for webhook verification'
      )
    }
    return stripe.webhooks.constructEvent(body, sig, webhookSecret)
  }

  static async processSuccessfulPayment(session: {
    id: string
    metadata?: Record<string, string> | null
  }) {
    const userId = session.metadata?.userId
    const type = session.metadata?.type || 'course'

    if (!userId) {
      logger.error(`[PaymentService] Webhook missing userId for session ${session.id}`)
      return
    }

    if (type === 'subscription') {
      const tierId = session.metadata?.tierId
      if (!tierId) {
        logger.error(`[PaymentService] Webhook missing tierId for subscription ${session.id}`)
        return
      }

      // We need to fetch the tier to know interval/trial
      const tier = await prisma.subscriptionTier.findUnique({ where: { id: tierId } })
      if (!tier) return

      const now = new Date()
      const currentPeriodEnd = new Date(now)
      if (tier.interval === 'YEARLY') {
        currentPeriodEnd.setFullYear(currentPeriodEnd.getFullYear() + 1)
      } else if (tier.interval === 'MONTHLY') {
        currentPeriodEnd.setMonth(currentPeriodEnd.getMonth() + 1)
      }

      // Fulfill subscription
      await prisma.$transaction(async tx => {
        // Upsert subscription
        const sub = await tx.subscription.upsert({
          where: { userId },
          create: {
            userId,
            tierId,
            status: 'ACTIVE',
            stripeSubscriptionId: session.id, // Replace with actual sub id if retrieving from full event
            currentPeriodStart: now,
            currentPeriodEnd,
          },
          update: {
            tierId,
            status: 'ACTIVE',
            stripeSubscriptionId: session.id,
            currentPeriodStart: now,
            currentPeriodEnd,
          },
        })

        // Reset usage limit for new period
        await tx.usageLimit.create({
          data: {
            subscriptionId: sub.id,
            period: now,
            testsTaken: 0,
            aiGenerations: 0,
            questionsAnswered: 0,
          },
        })
      })

      logger.info(
        `[PaymentService] User ${userId} subscribed to tier ${tierId} via payment ${session.id}`
      )
      return
    }

    // Default to Course Enrollment
    const courseId = session.metadata?.courseId
    if (!courseId) {
      logger.error(`[PaymentService] Webhook missing courseId for session ${session.id}`)
      return
    }

    // Enroll user in course (upsert to avoid duplicate)
    await prisma.userProgress.upsert({
      where: { idx_unique_user_course: { userId, courseId } },
      create: { userId, courseId, progress: 0, status: 'IN_PROGRESS' },
      update: { status: 'IN_PROGRESS' },
    })

    logger.info(
      `[PaymentService] User ${userId} enrolled in course ${courseId} via payment ${session.id}`
    )
  }
}
