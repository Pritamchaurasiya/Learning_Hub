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
        { id: 'free', name: 'Free', description: 'Basic access', price: 0, interval: 'month', features: [] },
        { id: 'pro', name: 'Pro', description: 'Full access', price: 19, interval: 'month', features: [] },
      ]

      vi.mocked(fetchApi).mockResolvedValue({
        status: 'success',
        data: { tiers: mockTiers },
      })

      const result = await subscriptionService.getTiers()

      expect(fetchApi).toHaveBeenCalledWith('/subscriptions/tiers')
      expect(result).toEqual(mockTiers)
    })

    it('should return fallback tiers when API fails', async () => {
      const { fetchApi } = await import('../utils/api')
      vi.mocked(fetchApi).mockRejectedValue(new Error('API error'))

      const result = await subscriptionService.getTiers()

      expect(result).toHaveLength(3)
      expect(result[0]).toMatchObject({ id: 'free', name: 'Free', price: 0 })
      expect(result[1]).toMatchObject({ id: 'pro', name: 'Pro', price: 19, isPopular: true })
      expect(result[2]).toMatchObject({ id: 'tests-a-plus', name: 'Tests A+ Elite', price: 49 })
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

    it('should return null when API fails', async () => {
      const { fetchApi } = await import('../utils/api')
      vi.mocked(fetchApi).mockRejectedValue(new Error('API error'))

      const result = await subscriptionService.getMySubscription()

      expect(result).toBeNull()
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

    it('should return mock checkoutUrl when Stripe is not configured', async () => {
      const { fetchApi } = await import('../utils/api')
      vi.mocked(fetchApi).mockResolvedValue({
        status: 'success',
        data: {},
      })

      const result = await subscriptionService.createCheckoutSession('pro')

      expect(result).toMatch(/^\/payment-success\?session_id=mock_\d+$/)
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
