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

// In-memory mock cart for frontend testing since backend /commerce/cart/ is missing
let mockCart: Cart = {
  id: 'cart-123',
  items: [
    {
      id: 'item-1',
      course: {
        id: '2d711bc6-52db-424a-b5e1-884639912063', // Replace with a real active course ID if needed
        title: 'Mastering System Design',
        instructor: { display_name: 'Alex Developer' },
        price: 99.99,
        original_price: 149.99
      },
      quantity: 1,
      added_at: new Date().toISOString()
    }
  ],
  total_items: 1,
  subtotal: 99.99,
  discount: 0,
  total: 99.99,
  currency: 'USD',
  created_at: new Date().toISOString(),
  updated_at: new Date().toISOString()
}

export const cartService = {
  getCart: async (options?: { signal?: AbortSignal }): Promise<CartResponse> => {
    // Check if aborted before returning
    if (options?.signal?.aborted) {
      throw new DOMException('Aborted', 'AbortError')
    }
    // Return mock data
    return Promise.resolve({ status: 'success', data: mockCart })
  },

  addToCart: async (_courseId: string, _quantity: number = 1): Promise<CartResponse> => {
    return Promise.resolve({ status: 'success', data: mockCart })
  },

  updateCartItem: async (_itemId: string, _quantity: number): Promise<CartItemResponse> => {
    return Promise.resolve({ status: 'success', data: mockCart.items[0] })
  },

  removeFromCart: async (itemId: string): Promise<{ status: string }> => {
    mockCart.items = mockCart.items.filter(i => i.id !== itemId)
    return Promise.resolve({ status: 'success' })
  },

  clearCart: async (): Promise<{ status: string }> => {
    mockCart.items = []
    return Promise.resolve({ status: 'success' })
  },

  applyCoupon: async (code: string): Promise<CartResponse> => {
    return fetchApi('/payments/apply-coupon/', {
      method: 'POST',
      body: JSON.stringify({ code }),
    })
  },

  checkout: async (paymentMethod: string): Promise<any> => {
    // The backend `create-order` expects a single course_id
    const courseId = mockCart.items.length > 0 ? mockCart.items[0].course.id : null;
    if (!courseId) {
      throw new Error('Cart is empty');
    }
    
    // Hit the payments backend API
    return fetchApi('/payments/create-order/', {
      method: 'POST',
      body: JSON.stringify({ 
        gateway: paymentMethod,
        course_id: courseId 
      }),
    })
  },
}
