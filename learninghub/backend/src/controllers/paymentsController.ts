import { Request, Response } from 'express'
import { prisma } from '../prismaClient'
import logger from '../utils/logger'
import {
  sendSuccess,
  sendCreated,
  sendUnauthorized,
  sendNotFound,
  sendValidationError,
  sendInternalError,
} from '../utils/responseHelper'

export const createOrder = async (req: Request, res: Response): Promise<void> => {
  try {
    const userId = req.user?.userId
    if (!userId) {
      sendUnauthorized(res, 'Authentication required')
      return
    }

    const { course_id, gateway: _gateway } = req.body
    if (!course_id) {
      sendValidationError(res, 'Course ID is required')
      return
    }

    // Verify course exists and is published
    const course = await prisma.course.findUnique({
      where: { id: course_id },
      select: { id: true, title: true, price: true, isPublished: true },
    })

    if (!course) {
      sendNotFound(res, 'Course not found')
      return
    }

    if (!course.isPublished) {
      sendValidationError(res, 'Course is not available for purchase')
      return
    }

    if (!course.price || Number(course.price) <= 0) {
      sendValidationError(res, 'This course is free')
      return
    }

    // Check if already enrolled
    const existingEnrollment = await prisma.userProgress.findUnique({
      where: { idx_unique_user_course: { userId, courseId: course_id } },
    })

    if (existingEnrollment) {
      sendValidationError(res, 'Already enrolled in this course')
      return
    }

    // Create payment session through Stripe service
    const { PaymentService } = await import('../services/PaymentService')
    const session = await PaymentService.createCheckoutSession({
      userId,
      courseId: course_id,
      amount: Number(course.price),
      currency: 'usd',
      courseTitle: course.title,
      successUrl: `${process.env.FRONTEND_URL ?? 'http://localhost:5173'}/payment/success?session_id={CHECKOUT_SESSION_ID}`,
      cancelUrl: `${process.env.FRONTEND_URL ?? 'http://localhost:5173'}/payment/cancel`,
    })

    sendCreated(res, {
      payment_url: session.url,
      session_id: session.id,
      order_id: session.id,
      status: 'pending',
    })
  } catch (error) {
    logger.error(
      '[PaymentsController] createOrder error',
      error instanceof Error ? error : new Error(String(error))
    )
    sendInternalError(res, 'Payment initiation failed')
  }
}

export const verifySession = async (req: Request, res: Response): Promise<void> => {
  try {
    const { session_id } = req.body
    if (!session_id || typeof session_id !== 'string') {
      sendValidationError(res, 'Session ID is required')
      return
    }

    const { PaymentService } = await import('../services/PaymentService')
    const session = await PaymentService.verifyCheckoutSession(session_id)

    if (session.payment_status === 'paid') {
      // If payment is paid, we ensure enrollment is finalized.
      // Often the webhook handles it, but this is a synchronous fallback to prevent race conditions.
      await PaymentService.processSuccessfulPayment(session as any)
      sendSuccess(res, { status: 'paid', courseId: session.metadata?.courseId })
    } else {
      sendSuccess(res, { status: session.payment_status })
    }
  } catch (error) {
    logger.error(
      '[PaymentsController] verifySession error',
      error instanceof Error ? error : new Error(String(error))
    )
    sendInternalError(res, 'Verification failed')
  }
}

export const handleWebhook = async (req: Request, res: Response): Promise<void> => {
  try {
    const sig = req.headers['stripe-signature'] as string
    if (!sig) {
      sendValidationError(res, 'Missing stripe-signature header')
      return
    }

    const { PaymentService } = await import('../services/PaymentService')

    const rawBody = Buffer.isBuffer(req.body) ? req.body.toString('utf8') : JSON.stringify(req.body)
    const event = await PaymentService.handleWebhook(rawBody, sig)

    // PaymentService.handleWebhook only validates and returns the event.
    // Actual payment processing (enrollment) is handled inside the webhook handler
    // in PaymentService to avoid double-processing.
    if ((event as { type: string }).type === 'checkout.session.completed') {
      const session = (event as { data: { object: unknown } }).data.object as {
        id: string
        metadata?: Record<string, string> | null
      }
      await PaymentService.processSuccessfulPayment(session)
    }

    sendSuccess(res, { received: true })
  } catch (error) {
    logger.error(
      '[PaymentsController] webhook error',
      error instanceof Error ? error : new Error(String(error))
    )
    sendValidationError(res, 'Webhook handling failed')
  }
}

export const applyCoupon = async (req: Request, res: Response): Promise<void> => {
  try {
    const { code } = req.body
    if (!code || typeof code !== 'string') {
      sendValidationError(res, 'Coupon code is required')
      return
    }

    const coupon = await prisma.coupon.findUnique({
      where: { code: code.trim().toUpperCase() },
    })

    if (!coupon?.isActive) {
      sendNotFound(res, 'Coupon not found or expired')
      return
    }

    const now = new Date()
    if (now < coupon.validFrom || now > coupon.validUntil) {
      sendNotFound(res, 'Coupon not found or expired')
      return
    }

    if (coupon.maxUses !== null && coupon.usedCount >= coupon.maxUses) {
      sendNotFound(res, 'Coupon has reached maximum uses')
      return
    }

    sendSuccess(res, {
      code: coupon.code,
      discountType: coupon.discountType,
      discountValue: coupon.discountValue,
      description: coupon.description,
    })
  } catch (error) {
    logger.error(
      '[PaymentsController] applyCoupon error',
      error instanceof Error ? error : new Error(String(error))
    )
    sendInternalError(res, 'Internal server error')
  }
}
