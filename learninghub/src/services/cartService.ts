import { fetchApi } from '../utils/api'

export interface CartItem {
  id: string
  course: {
    id: string
    title: string
    thumbnail?: string
    instructor?: {
      display_name?: string
    }
    price: number
    original_price?: number
  }
  quantity: number
  added_at: string
}

export interface Cart {
  id: string
  items: CartItem[]
  total_items: number
  subtotal: number
  discount: number
  total: number
  currency: string
  coupon_code?: string | null
  created_at: string
  updated_at: string
}

export interface CartResponse {
  status: string
  data: Cart
  message?: string
}

export interface CheckoutResponse {
  status: string
  data: {
    order_id: string
    amount: number
    currency: string
    gateway: string
    status: string
    idempotent_replay?: boolean
    course_id?: string
    razorpay_order_id?: string
    stripe_client_secret?: string
  }
  message?: string
}

export const cartService = {
  getCart: async (options?: { signal?: AbortSignal }): Promise<CartResponse> => {
    return fetchApi('/commerce/cart', { signal: options?.signal }) as Promise<CartResponse>
  },

  addToCart: async (
    courseId: string,
    quantity: number = 1,
    metadata?: { title?: string; price?: number; thumbnail?: string; instructorName?: string }
  ): Promise<CartResponse> => {
    return fetchApi('/commerce/cart/add', {
      method: 'POST',
      body: JSON.stringify({
        course_id: courseId,
        quantity,
        course_title: metadata?.title,
        price: metadata?.price,
        thumbnail: metadata?.thumbnail,
        instructor_name: metadata?.instructorName,
      }),
    }) as Promise<CartResponse>
  },

  updateCartItem: async (itemId: string, quantity: number): Promise<CartResponse> => {
    return fetchApi(`/commerce/cart/items/${itemId}`, {
      method: 'PUT',
      body: JSON.stringify({ quantity }),
    }) as Promise<CartResponse>
  },

  removeFromCart: async (itemId: string): Promise<CartResponse> => {
    return fetchApi(`/commerce/cart/items/${itemId}`, {
      method: 'DELETE',
    }) as Promise<CartResponse>
  },

  clearCart: async (): Promise<{ status: string }> => {
    return fetchApi('/commerce/cart/clear', {
      method: 'POST',
    })
  },

  applyCoupon: async (code: string): Promise<CartResponse> => {
    return fetchApi('/commerce/cart/apply-coupon', {
      method: 'POST',
      body: JSON.stringify({ code }),
    }) as Promise<CartResponse>
  },

  checkout: async (
    gateway: string = 'razorpay',
    courseId?: string,
    idempotencyKey?: string
  ): Promise<CheckoutResponse> => {
    return fetchApi('/commerce/cart/checkout', {
      method: 'POST',
      body: JSON.stringify({
        gateway,
        course_id: courseId,
        idempotency_key: idempotencyKey,
      }),
    }) as Promise<CheckoutResponse>
  },
}
