import { describe, it, expect, vi, beforeEach } from 'vitest'
import { cartService } from './cartService'
import { fetchApi } from '../utils/api'

vi.mock('../utils/api', () => ({
  fetchApi: vi.fn(),
}))

describe('cartService', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('getCart calls /commerce/cart', async () => {
    const mockCart = {
      status: 'success',
      data: {
        id: 'cart-1',
        items: [],
        total_items: 0,
        subtotal: 0,
        discount: 0,
        total: 0,
        currency: 'USD',
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      },
    }
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    ;(fetchApi as any).mockResolvedValue(mockCart)

    const result = await cartService.getCart()
    expect(fetchApi).toHaveBeenCalledWith('/commerce/cart', { signal: undefined })
    expect(result).toEqual(mockCart)
  })

  it('addToCart sends course_id and metadata', async () => {
    const mockResponse = { status: 'success', data: { id: 'cart-1' } }
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    ;(fetchApi as any).mockResolvedValue(mockResponse)

    const result = await cartService.addToCart('course-101', 1, {
      title: 'Distributed Systems',
      price: 49,
      thumbnail: 'https://cdn.example.com/thumb.jpg',
      instructorName: 'Dr. Smith',
    })

    expect(fetchApi).toHaveBeenCalledWith('/commerce/cart/add', {
      method: 'POST',
      body: JSON.stringify({
        course_id: 'course-101',
        quantity: 1,
        course_title: 'Distributed Systems',
        price: 49,
        thumbnail: 'https://cdn.example.com/thumb.jpg',
        instructor_name: 'Dr. Smith',
      }),
    })
    expect(result).toEqual(mockResponse)
  })

  it('updateCartItem calls PUT on item endpoint', async () => {
    const mockResponse = { status: 'success', data: { id: 'cart-1' } }
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    ;(fetchApi as any).mockResolvedValue(mockResponse)

    const result = await cartService.updateCartItem('item-1', 2)
    expect(fetchApi).toHaveBeenCalledWith('/commerce/cart/items/item-1', {
      method: 'PUT',
      body: JSON.stringify({ quantity: 2 }),
    })
    expect(result).toEqual(mockResponse)
  })

  it('removeFromCart calls DELETE on item endpoint', async () => {
    const mockResponse = { status: 'success', message: 'Item removed' }
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    ;(fetchApi as any).mockResolvedValue(mockResponse)

    const result = await cartService.removeFromCart('item-1')
    expect(fetchApi).toHaveBeenCalledWith('/commerce/cart/items/item-1', {
      method: 'DELETE',
    })
    expect(result).toEqual(mockResponse)
  })

  it('clearCart calls POST on clear endpoint', async () => {
    const mockResponse = { status: 'success', message: 'Cart cleared' }
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    ;(fetchApi as any).mockResolvedValue(mockResponse)

    const result = await cartService.clearCart()
    expect(fetchApi).toHaveBeenCalledWith('/commerce/cart/clear', {
      method: 'POST',
    })
    expect(result).toEqual(mockResponse)
  })

  it('applyCoupon calls POST on apply-coupon endpoint', async () => {
    const mockResponse = { status: 'success', message: 'Coupon applied' }
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    ;(fetchApi as any).mockResolvedValue(mockResponse)

    const result = await cartService.applyCoupon('LEARN50')
    expect(fetchApi).toHaveBeenCalledWith('/commerce/cart/apply-coupon', {
      method: 'POST',
      body: JSON.stringify({ code: 'LEARN50' }),
    })
    expect(result).toEqual(mockResponse)
  })

  it('checkout calls checkout endpoint with gateway and options', async () => {
    const mockResponse = { status: 'success', data: { order_id: 'ord-123' } }
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    ;(fetchApi as any).mockResolvedValue(mockResponse)

    const result = await cartService.checkout('stripe', 'course-101', 'idemp-key-1')
    expect(fetchApi).toHaveBeenCalledWith('/commerce/cart/checkout', {
      method: 'POST',
      body: JSON.stringify({
        gateway: 'stripe',
        course_id: 'course-101',
        idempotency_key: 'idemp-key-1',
      }),
    })
    expect(result).toEqual(mockResponse)
  })
})
