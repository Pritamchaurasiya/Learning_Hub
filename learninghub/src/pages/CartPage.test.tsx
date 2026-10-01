import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, waitFor } from '../test/test-utils'
import CartPage from './CartPage'
import { cartService } from '../services/cartService'

vi.mock('../services/cartService', () => ({
  cartService: {
    getCart: vi.fn(),
    removeFromCart: vi.fn(),
    clearCart: vi.fn(),
    applyCoupon: vi.fn(),
    checkout: vi.fn(),
  },
}))

const mockCartData = {
  status: 'success',
  data: {
    id: 'cart-test-1',
    items: [
      {
        id: 'item-1',
        course: {
          id: 'course-101',
          title: 'Advanced Distributed Systems',
          price: 49,
          original_price: 99,
          instructor: { display_name: 'Dr. Jane Doe' },
        },
        quantity: 1,
        added_at: new Date().toISOString(),
      },
    ],
    total_items: 1,
    subtotal: 49,
    discount: 0,
    total: 49,
    currency: 'USD',
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  },
}

describe('CartPage Component', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('renders loading state initially', () => {
    vi.mocked(cartService.getCart).mockReturnValue(new Promise(() => {}))
    render(<CartPage />)
    expect(document.querySelector('.animate-spin')).toBeInTheDocument()
  })

  it('renders empty cart state when cart has no items', async () => {
    vi.mocked(cartService.getCart).mockResolvedValue({
      status: 'success',
      data: {
        id: 'cart-empty',
        items: [],
        total_items: 0,
        subtotal: 0,
        discount: 0,
        total: 0,
        currency: 'USD',
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      },
    })

    render(<CartPage />)

    await waitFor(() => {
      expect(screen.getByText(/Your cart is waiting for knowledge/i)).toBeInTheDocument()
      expect(screen.getByText(/Explore Course Catalog/i)).toBeInTheDocument()
    })
  })

  it('renders items, order summary, and checkout button when cart has items', async () => {
    vi.mocked(cartService.getCart).mockResolvedValue(mockCartData as any)

    render(<CartPage />)

    await waitFor(() => {
      expect(screen.getByText('Advanced Distributed Systems')).toBeInTheDocument()
      expect(screen.getByText('By Dr. Jane Doe')).toBeInTheDocument()
      expect(screen.getByText(/Order Summary/i)).toBeInTheDocument()
      expect(screen.getByRole('button', { name: /Complete Checkout/i })).toBeInTheDocument()
      expect(screen.getByRole('button', { name: /Apply/i })).toBeInTheDocument()
    })
  })
})
