import { fetchApi } from '../utils/api'

export interface StripeCheckoutResponse {
  session_id: string
  url: string
}

export interface StripeSubscription {
  id: string
  status: string
  current_period_start: number
  current_period_end: number
  cancel_at_period_end: boolean
  canceled_at: number | null
  price_id: string | null
}

export interface StripePaymentMethod {
  id: string
  type: string
  card?: {
    brand: string
    last4: string
    exp_month: number
    exp_year: number
  }
}

export interface StripePrice {
  id: string
  nickname: string | null
  unit_amount: number
  currency: string
  recurring: { interval: string; interval_count: number } | null
  lookup_key: string | null
}

export const stripeService = {
  // Create checkout session
  createCheckoutSession: async (params: {
    mode: 'payment' | 'subscription'
    items: Array<{ price_id?: string; price_data?: any; quantity: number }>
    success_url: string
    cancel_url: string
    idempotency_key?: string
  }): Promise<StripeCheckoutResponse> => {
    const response = await fetchApi('/stripe/checkout', {
      method: 'POST',
      body: JSON.stringify(params),
    })
    return response.data
  },

  // Create checkout session for course purchase
  createCourseCheckout: async (params: {
    courseId: string
    successUrl: string
    cancelUrl: string
    idempotencyKey?: string
  }): Promise<StripeCheckoutResponse> => {
    const response = await fetchApi('/stripe/checkout', {
      method: 'POST',
      body: JSON.stringify({
        mode: 'payment',
        items: [{ price_data: { currency: 'usd', product_data: { name: 'Course' }, unit_amount: 0 }, quantity: 1 }],
        course_id: params.courseId,
        success_url: params.successUrl,
        cancel_url: params.cancelUrl,
        idempotency_key: params.idempotencyKey,
      }),
    })
    return response.data
  },

  // Create subscription checkout
  createSubscriptionCheckout: async (params: {
    priceId: string
    successUrl: string
    cancelUrl: string
    trialDays?: number
  }): Promise<StripeCheckoutResponse> => {
    const response = await fetchApi('/stripe/checkout', {
      method: 'POST',
      body: JSON.stringify({
        mode: 'subscription',
        items: [{ price_id: params.priceId, quantity: 1 }],
        trial_days: params.trialDays,
        success_url: params.successUrl,
        cancel_url: params.cancelUrl,
      }),
    })
    return response.data
  },

  // Get user subscriptions
  getSubscriptions: async (): Promise<{ subscriptions: StripeSubscription[] }> => {
    const response = await fetchApi('/stripe/subscriptions')
    return response.data
  },

  // Get subscription details
  getSubscription: async (subscriptionId: string): Promise<StripeSubscription> => {
    const response = await fetchApi(`/stripe/subscriptions/${subscriptionId}`)
    return response.data
  },

  // Manage subscription
  manageSubscription: async (
    subscriptionId: string,
    action: {
      action: 'cancel' | 'cancel_at_period_end' | 'resume' | 'upgrade' | 'downgrade'
      priceId?: string
    }
  ) => {
    const response = await fetchApi(`/stripe/subscriptions/${subscriptionId}`, {
      method: 'PATCH',
      body: JSON.stringify(action),
    })
    return response.data
  },

  // Billing Portal
  createBillingPortalSession: async (returnUrl: string): Promise<{ url: string }> => {
    const response = await fetchApi('/stripe/billing-portal', {
      method: 'POST',
      body: JSON.stringify({ return_url: returnUrl }),
    })
    return response.data
  },

  // Payment Methods
  getPaymentMethods: async (): Promise<{ payment_methods: StripePaymentMethod[] }> => {
    const response = await fetchApi('/stripe/payment-methods')
    return response.data
  },

  removePaymentMethod: async (paymentMethodId: string): Promise<{ removed: boolean }> => {
    const response = await fetchApi(`/stripe/payment-methods/${paymentMethodId}`, {
      method: 'DELETE',
    })
    return response.data
  },

  // Prices
  getPrices: async (lookupKeys?: string[]): Promise<{ data: StripePrice[]; meta: { count: number } }> => {
    const query = lookupKeys?.length ? `?lookup_keys=${lookupKeys.join(',')}` : ''
    const response = await fetchApi(`/stripe/prices${query}`)
    return response.data
  },
}

export default stripeService