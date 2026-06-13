import { fetchApi } from '../utils/api'

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
  status: 'active' | 'canceled' | 'past_due' | 'trialing' | 'unpaid'
  currentPeriodEnd: string
  cancelAtPeriodEnd: boolean
}

export const subscriptionService = {
  getTiers: async (): Promise<SubscriptionTier[]> => {
    try {
      const res = await fetchApi('/subscriptions/tiers')
      return res.data?.tiers || []
    } catch {
      // Fallback tiers if backend is missing/failing
      return [
        {
          id: 'free',
          name: 'Free',
          description: 'Basic access to foundational courses.',
          price: 0,
          interval: 'month',
          features: ['Access to free courses', 'Community forum access', 'Basic progress tracking'],
        },
        {
          id: 'pro',
          name: 'Pro',
          description: 'Full access to premium courses & AI tools.',
          price: 19,
          interval: 'month',
          isPopular: true,
          features: [
            'All Free features',
            'Unlimited AI Chatbot',
            'Certificate of completion',
            'Live classes access',
          ],
        },
        {
          id: 'tests-a-plus',
          name: 'Tests A+ Elite',
          description: 'Complete mock tests, adaptive learning & analytics.',
          price: 49,
          interval: 'month',
          features: [
            'All Pro features',
            'Unlimited Mock Tests',
            'Adaptive Learning Engine',
            'In-depth Performance Analytics',
            'Priority Mentorship',
          ],
        },
      ]
    }
  },

  getMySubscription: async (): Promise<UserSubscription | null> => {
    try {
      const res = await fetchApi('/subscriptions/me')
      return res.data?.subscription || null
    } catch {
      return null
    }
  },

  createCheckoutSession: async (tierId: string): Promise<string> => {
    const res = await fetchApi('/subscriptions/create', {
      method: 'POST',
      body: JSON.stringify({ tierId }),
    })
    
    if (res.data?.checkoutUrl) {
      return res.data.checkoutUrl
    }
    
    // If Stripe is not configured or fails, we return a mock success flow
    return `/payment-success?session_id=mock_${Date.now()}`
  },

  cancelSubscription: async (): Promise<boolean> => {
    const res = await fetchApi('/subscriptions/cancel', {
      method: 'POST',
    })
    return res.status === 'success'
  },
}
