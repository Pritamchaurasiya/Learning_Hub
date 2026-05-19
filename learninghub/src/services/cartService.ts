import { fetchApi } from '../utils/api'

export interface CartItem {
  id: string
  course: {
    id: string
    title: string
    thumbnail?: string
    instructor: {
      display_name: string
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
  created_at: string
  updated_at: string
}

export interface CartResponse {
  status: string
  data: Cart
}

export interface CartItemResponse {
  status: string
  data: CartItem
}

// Default empty cart for when backend doesn't support cart yet
const emptyCart: Cart = {
  id: 'cart-empty',
  items: [],
  total_items: 0,
  subtotal: 0,
  discount: 0,
  total: 0,
  currency: 'USD',
  created_at: new Date().toISOString(),
  updated_at: new Date().toISOString(),
}

export const cartService = {
  getCart: async (options?: { signal?: AbortSignal }): Promise<CartResponse> => {
    try {
      // Try to fetch from backend cart endpoint
      const res = await fetchApi('/commerce/cart/', { signal: options?.signal })
      return res as CartResponse
    } catch {
      // Backend cart not implemented - return empty cart
      return { status: 'success', data: emptyCart }
    }
  },

  addToCart: async (courseId: string, quantity: number = 1): Promise<CartResponse> => {
    try {
      return (await fetchApi('/commerce/cart/add/', {
        method: 'POST',
        body: JSON.stringify({ course_id: courseId, quantity }),
      })) as CartResponse
    } catch {
      throw new Error('Cart functionality not available. Please try direct enrollment.')
    }
  },

  updateCartItem: async (itemId: string, quantity: number): Promise<CartItemResponse> => {
    return fetchApi(`/commerce/cart/items/${itemId}/`, {
      method: 'PUT',
      body: JSON.stringify({ quantity }),
    }) as Promise<CartItemResponse>
  },

  removeFromCart: async (itemId: string): Promise<{ status: string }> => {
    return fetchApi(`/commerce/cart/items/${itemId}/`, {
      method: 'DELETE',
    })
  },

  clearCart: async (): Promise<{ status: string }> => {
    return fetchApi('/commerce/cart/clear/', {
      method: 'POST',
    })
  },

  applyCoupon: async (code: string): Promise<CartResponse> => {
    return fetchApi('/payments/apply-coupon/', {
      method: 'POST',
      body: JSON.stringify({ code }),
    })
  },

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  checkout: async (paymentMethod: string, courseId?: string): Promise<any> => {
    // If cart is not implemented, use direct course enrollment
    if (courseId) {
      return fetchApi('/payments/create-order/', {
        method: 'POST',
        body: JSON.stringify({
          gateway: paymentMethod,
          course_id: courseId,
        }),
      })
    }

    // Try to get cart and use first item
    const cart = await cartService.getCart()
    const firstItem = cart.data.items[0]
    if (!firstItem) {
      throw new Error('Cart is empty')
    }

    return fetchApi('/payments/create-order/', {
      method: 'POST',
      body: JSON.stringify({
        gateway: paymentMethod,
        course_id: firstItem.course.id,
      }),
    })
  },
}
