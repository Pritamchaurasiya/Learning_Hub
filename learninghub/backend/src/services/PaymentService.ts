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
    const courseId = session.metadata?.courseId

    if (!userId || !courseId) {
      logger.error(`[PaymentService] Webhook missing metadata for session ${session.id}`)
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
