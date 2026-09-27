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
    const res = await fetchApi('/subscriptions/tiers')
    if (!res.data?.tiers) {
      throw new Error('Failed to load subscription tiers')
    }
    return res.data.tiers
  },

  getMySubscription: async (): Promise<UserSubscription | null> => {
    const res = await fetchApi('/subscriptions/me')
    return res.data?.subscription ?? null
  },

  createCheckoutSession: async (tierId: string): Promise<string> => {
    const res = await fetchApi('/subscriptions/create', {
      method: 'POST',
      body: JSON.stringify({ tierId }),
    })

    if (!res.data?.checkoutUrl) {
      throw new Error('Failed to create checkout session')
    }

    return res.data.checkoutUrl
  },

  cancelSubscription: async (): Promise<boolean> => {
    const res = await fetchApi('/subscriptions/cancel', {
      method: 'POST',
    })
    return res.status === 'success'
  },
}
