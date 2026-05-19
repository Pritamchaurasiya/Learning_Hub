import { Request, Response } from 'express'
import { prisma } from '../prismaClient'
import logger from '../utils/logger'

export const createOrder = async (req: Request, res: Response): Promise<void> => {
  try {
    const userId = req.user?.userId
    if (!userId) {
      res.status(401).json({ status: 'error', message: 'Authentication required' })
      return
    }

    const { course_id, gateway: _gateway } = req.body
    if (!course_id) {
      res.status(400).json({ status: 'error', message: 'Course ID is required' })
      return
    }

    // Verify course exists and is published
    const course = await prisma.course.findUnique({
      where: { id: course_id },
      select: { id: true, title: true, price: true, isPublished: true },
    })

    if (!course) {
      res.status(404).json({ status: 'error', message: 'Course not found' })
      return
    }

    if (!course.isPublished) {
      res.status(400).json({ status: 'error', message: 'Course is not available for purchase' })
      return
    }

    if (!course.price || Number(course.price) <= 0) {
      res.status(400).json({ status: 'error', message: 'This course is free' })
      return
    }

    // Check if already enrolled
    const existingEnrollment = await prisma.userProgress.findUnique({
      where: { idx_unique_user_course: { userId, courseId: course_id } },
    })

    if (existingEnrollment) {
      res.status(400).json({ status: 'error', message: 'Already enrolled in this course' })
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
      successUrl: `${process.env.FRONTEND_URL || 'http://localhost:5173'}/payment/success?session_id={CHECKOUT_SESSION_ID}`,
      cancelUrl: `${process.env.FRONTEND_URL || 'http://localhost:5173'}/payment/cancel`,
    })

    res.status(201).json({
      status: 'success',
      data: {
        payment_url: session.url,
        session_id: session.id,
        order_id: session.id,
        status: 'pending',
      },
    })
  } catch (error) {
    logger.error(
      '[PaymentsController] createOrder error',
      error instanceof Error ? error : new Error(String(error))
    )
    res.status(500).json({ status: 'error', message: 'Payment initiation failed' })
  }
}

export const handleWebhook = async (req: Request, res: Response): Promise<void> => {
  try {
    const sig = req.headers['stripe-signature'] as string
    const { PaymentService } = await import('../services/PaymentService')

    const event = await PaymentService.handleWebhook(req.body as string, sig)

    // PaymentService.handleWebhook only validates and returns the event.
    // Actual payment processing (enrollment) is handled inside the webhook handler
    // in PaymentService to avoid double-processing.
    if ((event as any).type === 'checkout.session.completed') {
      const session = (event as any).data.object
      await PaymentService.processSuccessfulPayment(session)
    }

    res.json({ received: true })
  } catch (error) {
    logger.error(
      '[PaymentsController] webhook error',
      error instanceof Error ? error : new Error(String(error))
    )
    res.status(400).json({ status: 'error', message: 'Webhook handling failed' })
  }
}

export const applyCoupon = async (req: Request, res: Response): Promise<void> => {
  try {
    const { code } = req.body
    if (!code) {
      res.status(400).json({ status: 'error', message: 'Coupon code is required' })
      return
    }

    // Coupon model not yet in schema — return not-found for now
    // TODO: Add Coupon model to Prisma schema and implement real coupon logic
    res.status(404).json({
      status: 'error',
      message: 'Coupon not found or expired',
    })
  } catch (error) {
    logger.error(
      '[PaymentsController] applyCoupon error',
      error instanceof Error ? error : new Error(String(error))
    )
    res.status(500).json({ status: 'error', message: 'Internal server error' })
  }
}
