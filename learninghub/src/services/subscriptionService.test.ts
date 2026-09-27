import { describe, it, expect, vi, beforeEach } from 'vitest'
import { subscriptionService } from './subscriptionService'

vi.mock('../utils/api', () => ({
  fetchApi: vi.fn(),
}))

describe('subscriptionService', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('getTiers', () => {
    it('should fetch tiers from API when successful', async () => {
      const { fetchApi } = await import('../utils/api')
      const mockTiers = [
        {
          id: 'free',
          name: 'Free',
          description: 'Basic access',
          price: 0,
          interval: 'month',
          features: [],
        },
        {
          id: 'pro',
          name: 'Pro',
          description: 'Full access',
          price: 19,
          interval: 'month',
          features: [],
        },
      ]

      vi.mocked(fetchApi).mockResolvedValue({
        status: 'success',
        data: { tiers: mockTiers },
      })

      const result = await subscriptionService.getTiers()

      expect(fetchApi).toHaveBeenCalledWith('/subscriptions/tiers')
      expect(result).toEqual(mockTiers)
    })

    it('should throw an error when API fails', async () => {
      const { fetchApi } = await import('../utils/api')
      vi.mocked(fetchApi).mockRejectedValue(new Error('API error'))

      await expect(subscriptionService.getTiers()).rejects.toThrow('API error')
    })
  })

  describe('getMySubscription', () => {
    it('should fetch user subscription when authenticated', async () => {
      const { fetchApi } = await import('../utils/api')
      const mockSubscription = {
        id: 'sub-1',
        userId: 'user-123',
        tier: 'pro',
        status: 'active',
        currentPeriodEnd: '2024-12-31T00:00:00Z',
        cancelAtPeriodEnd: false,
      }

      vi.mocked(fetchApi).mockResolvedValue({
        status: 'success',
        data: { subscription: mockSubscription },
      })

      const result = await subscriptionService.getMySubscription()

      expect(fetchApi).toHaveBeenCalledWith('/subscriptions/me')
      expect(result).toEqual(mockSubscription)
    })

    it('should return null when no subscription', async () => {
      const { fetchApi } = await import('../utils/api')
      vi.mocked(fetchApi).mockResolvedValue({
        status: 'success',
        data: { subscription: null },
      })

      const result = await subscriptionService.getMySubscription()

      expect(result).toBeNull()
    })

    it('should handle API errors and throw', async () => {
      const { fetchApi } = await import('../utils/api')
      vi.mocked(fetchApi).mockRejectedValue(new Error('API error'))

      await expect(subscriptionService.getMySubscription()).rejects.toThrow('API error')
    })
  })

  describe('createCheckoutSession', () => {
    it('should create checkout session and return checkoutUrl', async () => {
      const { fetchApi } = await import('../utils/api')
      vi.mocked(fetchApi).mockResolvedValue({
        status: 'success',
        data: { checkoutUrl: 'https://checkout.stripe.com/session-123' },
      })

      const result = await subscriptionService.createCheckoutSession('pro')

      expect(fetchApi).toHaveBeenCalledWith('/subscriptions/create', {
        method: 'POST',
        body: JSON.stringify({ tierId: 'pro' }),
      })
      expect(result).toBe('https://checkout.stripe.com/session-123')
    })

    it('should throw error when checkoutUrl is not returned', async () => {
      const { fetchApi } = await import('../utils/api')
      vi.mocked(fetchApi).mockResolvedValue({
        status: 'success',
        data: {},
      })

      await expect(subscriptionService.createCheckoutSession('pro')).rejects.toThrow('Failed to create checkout session')
    })

    it('should handle API errors', async () => {
      const { fetchApi } = await import('../utils/api')
      vi.mocked(fetchApi).mockRejectedValue(new Error('API error'))

      await expect(subscriptionService.createCheckoutSession('pro')).rejects.toThrow('API error')
    })
  })

  describe('cancelSubscription', () => {
    it('should cancel subscription successfully', async () => {
      const { fetchApi } = await import('../utils/api')
      vi.mocked(fetchApi).mockResolvedValue({
        status: 'success',
      })

      const result = await subscriptionService.cancelSubscription()

      expect(fetchApi).toHaveBeenCalledWith('/subscriptions/cancel', {
        method: 'POST',
      })
      expect(result).toBe(true)
    })

    it('should return false when cancellation fails', async () => {
      const { fetchApi } = await import('../utils/api')
      vi.mocked(fetchApi).mockResolvedValue({
        status: 'error',
      })

      const result = await subscriptionService.cancelSubscription()

      expect(result).toBe(false)
    })

    it('should handle API errors', async () => {
      const { fetchApi } = await import('../utils/api')
      vi.mocked(fetchApi).mockRejectedValue(new Error('API error'))

      await expect(subscriptionService.cancelSubscription()).rejects.toThrow('API error')
    })
  })
})
