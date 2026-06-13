import { PaymentService } from '../../src/services/PaymentService'
import { prisma } from '../../src/prismaClient'

const mockPrisma = prisma as any

// Mock logger
jest.mock('../../src/utils/logger', () => {
  const mockLogger = {
    warn: jest.fn(),
    error: jest.fn(),
    info: jest.fn(),
    debug: jest.fn(),
    audit: jest.fn(),
  }
  return {
    ...mockLogger,
    default: mockLogger,
  }
})

let stripeConstructorShouldThrow = false

// Mock stripe
const mockStripeInstance = {
  checkout: {
    sessions: {
      create: jest.fn().mockResolvedValue({ id: 'mock_session_id', url: 'mock_url' }),
    },
  },
  webhooks: {
    constructEvent: jest.fn(),
  },
}

jest.mock('stripe', () => {
  const StripeConstructor = jest.fn().mockImplementation(() => {
    if (stripeConstructorShouldThrow) {
      throw new Error('Stripe package not installed mock error')
    }
    return mockStripeInstance
  })
  // Attach webhooks helper to the mock factory (just like stripe package has constructEvent on instance and webhooks namespace on the package)
  return Object.assign(StripeConstructor, {
    webhooks: mockStripeInstance.webhooks,
  })
}, { virtual: true })

describe('PaymentService', () => {
  const originalEnv = process.env

  beforeEach(() => {
    jest.clearAllMocks()
    process.env = { ...originalEnv }
  })

  afterEach(() => {
    process.env = originalEnv
  })

  describe('createCheckoutSession', () => {
    const validParams = {
      userId: 'user-1',
      courseId: 'course-1',
      amount: 99.99,
      currency: 'usd',
      courseTitle: 'Test Course',
      successUrl: 'https://example.com/success',
      cancelUrl: 'https://example.com/cancel',
    }

    it('should throw error when Stripe is not configured', async () => {
      delete process.env.STRIPE_SECRET_KEY

      await expect(PaymentService.createCheckoutSession(validParams)).rejects.toThrow(
        'Payment gateway not configured'
      )
    })

    it('should throw error when Stripe package is not installed', async () => {
      process.env.STRIPE_SECRET_KEY = 'sk_test_123'
      stripeConstructorShouldThrow = true

      try {
        await expect(PaymentService.createCheckoutSession(validParams)).rejects.toThrow(
          'Payment gateway not configured'
        )
      } finally {
        stripeConstructorShouldThrow = false
      }
    })
  })

  describe('handleWebhook', () => {
    const body = 'webhook_body'
    const signature = 'webhook_signature'

    it('should throw error when Stripe is not configured', async () => {
      delete process.env.STRIPE_SECRET_KEY

      await expect(PaymentService.handleWebhook(body, signature)).rejects.toThrow(
        'Stripe not configured'
      )
    })

    it('should throw error when webhook secret is not configured', async () => {
      process.env.STRIPE_SECRET_KEY = 'sk_test_123'
      delete process.env.STRIPE_WEBHOOK_SECRET

      await expect(PaymentService.handleWebhook(body, signature)).rejects.toThrow(
        'STRIPE_WEBHOOK_SECRET environment variable is required'
      )
    })
  })

  describe('processSuccessfulPayment', () => {
    it('should enroll user in course after successful payment', async () => {
      const session = {
        id: 'cs_test_123',
        metadata: {
          userId: 'user-1',
          courseId: 'course-1',
        },
      }

      mockPrisma.userProgress.upsert.mockResolvedValue({})

      await PaymentService.processSuccessfulPayment(session)

      expect(mockPrisma.userProgress.upsert).toHaveBeenCalledWith(
        expect.objectContaining({
          where: {
            idx_unique_user_course: {
              userId: session.metadata.userId,
              courseId: session.metadata.courseId,
            },
          },
          create: {
            userId: session.metadata.userId,
            courseId: session.metadata.courseId,
            progress: 0,
            status: 'IN_PROGRESS',
          },
          update: {
            status: 'IN_PROGRESS',
          },
        })
      )
    })

    it('should handle missing metadata gracefully', async () => {
      const session = {
        id: 'cs_test_123',
        metadata: null,
      }

      await PaymentService.processSuccessfulPayment(session)

      expect(mockPrisma.userProgress.upsert).not.toHaveBeenCalled()
    })

    it('should handle missing userId in metadata', async () => {
      const session = {
        id: 'cs_test_123',
        metadata: {
          courseId: 'course-1',
        },
      }

      await PaymentService.processSuccessfulPayment(session)

      expect(mockPrisma.userProgress.upsert).not.toHaveBeenCalled()
    })

    it('should handle missing courseId in metadata', async () => {
      const session = {
        id: 'cs_test_123',
        metadata: {
          userId: 'user-1',
        },
      }

      await PaymentService.processSuccessfulPayment(session)

      expect(mockPrisma.userProgress.upsert).not.toHaveBeenCalled()
    })

    it('should upsert to avoid duplicate enrollments', async () => {
      const session = {
        id: 'cs_test_123',
        metadata: {
          userId: 'user-1',
          courseId: 'course-1',
        },
      }

      mockPrisma.userProgress.upsert.mockResolvedValue({})

      // Call twice to simulate duplicate webhook
      await PaymentService.processSuccessfulPayment(session)
      await PaymentService.processSuccessfulPayment(session)

      expect(mockPrisma.userProgress.upsert).toHaveBeenCalledTimes(2)
      // Upsert ensures no duplicate enrollment
    })

    it('should handle database errors gracefully', async () => {
      const session = {
        id: 'cs_test_123',
        metadata: {
          userId: 'user-1',
          courseId: 'course-1',
        },
      }

      mockPrisma.userProgress.upsert.mockRejectedValue(new Error('Database error'))

      await expect(PaymentService.processSuccessfulPayment(session)).rejects.toThrow(
        'Database error'
      )
    })
  })
})
