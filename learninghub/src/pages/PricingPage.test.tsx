import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, waitFor } from '../test/test-utils'
import PricingPage from './PricingPage'
import { subscriptionService } from '../services/subscriptionService'

vi.mock('../services/subscriptionService', () => ({
  subscriptionService: {
    getTiers: vi.fn(),
    createCheckoutSession: vi.fn(),
  },
}))

const mockTiers = [
  {
    id: 'free',
    name: 'Free Starter',
    price: 0,
    interval: 'month',
    features: ['Access to basic tests', 'Community discussions'],
    popular: false,
  },
  {
    id: 'pro',
    name: 'Pro Learner',
    price: 29,
    interval: 'month',
    features: ['Unlimited tests & quizzes', 'AI Tutor 24/7', 'Verified Certificates'],
    popular: true,
  },
]

describe('PricingPage', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('renders loading state initially', () => {
    vi.mocked(subscriptionService.getTiers).mockReturnValue(new Promise(() => {}))
    render(<PricingPage />)
    expect(document.querySelector('.animate-spin')).toBeInTheDocument()
  })

  it('renders error state on fetch failure', async () => {
    vi.mocked(subscriptionService.getTiers).mockRejectedValue(new Error('Network error'))
    render(<PricingPage />)

    await waitFor(() => {
      expect(screen.getByText(/Unable to Load Plans/i)).toBeInTheDocument()
    })
  })

  it('renders pricing tiers and features successfully', async () => {
    vi.mocked(subscriptionService.getTiers).mockResolvedValue(mockTiers as any)
    render(<PricingPage />)

    await waitFor(() => {
      expect(screen.getByText('Free Starter')).toBeInTheDocument()
      expect(screen.getByText('Pro Learner')).toBeInTheDocument()
      expect(screen.getByText('Access to basic tests')).toBeInTheDocument()
      expect(screen.getByText('Unlimited tests & quizzes')).toBeInTheDocument()
    })
  })
})
