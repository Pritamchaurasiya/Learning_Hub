import { describe, it, expect, vi, beforeEach } from 'vitest'
import { screen, fireEvent } from '@testing-library/react'
import { render } from '../../test/test-utils'
import { ProUpsellBanner } from './ProUpsellBanner'
import { useStore } from '../../stores/useStore'

const mockNavigate = vi.fn()
vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual('react-router-dom')
  return {
    ...actual,
    useNavigate: () => mockNavigate,
  }
})

describe('ProUpsellBanner', () => {
  beforeEach(() => {
    localStorage.clear()
    vi.clearAllMocks()
    useStore.setState({
      auth: {
        isAuthenticated: false,
        user: null,
        isHydrated: true,
      },
    })
  })

  it('renders upsell banner for non-pro user', () => {
    render(<ProUpsellBanner />)

    expect(screen.getByTestId('pro-upsell-banner')).toBeInTheDocument()
    expect(screen.getByText(/Scholar Pro Flash Offer/i)).toBeInTheDocument()
    expect(screen.getByText('$19')).toBeInTheDocument()
  })

  it('does not render if user is already Pro', () => {
    useStore.setState({
      auth: {
        isAuthenticated: true,
        user: { id: '1', email: 'test@example.com', name: 'Pro User', isPro: true } as any,
        isHydrated: true,
      },
    })

    const { container } = render(<ProUpsellBanner />)
    expect(container.firstChild).toBeNull()
  })

  it('redirects to login when unauthenticated user clicks upgrade', () => {
    render(<ProUpsellBanner />)

    const upgradeBtn = screen.getByRole('button', { name: /Claim 40% Off & Upgrade/i })
    fireEvent.click(upgradeBtn)

    expect(mockNavigate).toHaveBeenCalledWith('/auth?mode=login')
  })

  it('dismisses banner and stores snooze timestamp in localStorage', () => {
    const { container } = render(<ProUpsellBanner />)

    const dismissBtn = screen.getByRole('button', { name: /Dismiss banner/i })
    fireEvent.click(dismissBtn)

    expect(localStorage.getItem('lh_pro_upsell_snooze_until')).toBeTruthy()
    expect(container.firstChild).toBeNull()
  })
})
