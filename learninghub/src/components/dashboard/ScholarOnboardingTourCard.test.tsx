import { describe, it, expect, vi, beforeEach } from 'vitest'
import { screen, fireEvent } from '@testing-library/react'
import { render } from '../../test/test-utils'
import { ScholarOnboardingTourCard } from './ScholarOnboardingTourCard'

describe('ScholarOnboardingTourCard', () => {
  beforeEach(() => {
    localStorage.clear()
    vi.clearAllMocks()
  })

  it('renders onboarding tour card with default user name', () => {
    const handleLaunch = vi.fn()
    render(<ScholarOnboardingTourCard onLaunchAITest={handleLaunch} />)

    expect(screen.getByTestId('scholar-onboarding-tour-card')).toBeInTheDocument()
    expect(screen.getByText(/Welcome, Scholar! Complete your orientation sprint/i)).toBeInTheDocument()
    expect(screen.getByText('Launch First Adaptive AI Assessment')).toBeInTheDocument()
  })

  it('renders personalized user name when provided', () => {
    const handleLaunch = vi.fn()
    render(<ScholarOnboardingTourCard onLaunchAITest={handleLaunch} userName="Alex" />)

    expect(screen.getByText(/Welcome, Alex! Complete your orientation sprint/i)).toBeInTheDocument()
  })

  it('triggers onLaunchAITest when clicking action button', () => {
    const handleLaunch = vi.fn()
    render(<ScholarOnboardingTourCard onLaunchAITest={handleLaunch} />)

    const cta = screen.getByRole('button', { name: /Launch First AI Test/i })
    fireEvent.click(cta)

    expect(handleLaunch).toHaveBeenCalledTimes(1)
  })

  it('dismisses card and persists preference to localStorage', () => {
    const handleLaunch = vi.fn()
    const { container } = render(<ScholarOnboardingTourCard onLaunchAITest={handleLaunch} />)

    const dismissButton = screen.getByRole('button', { name: /Dismiss orientation guide/i })
    fireEvent.click(dismissButton)

    expect(localStorage.getItem('scholar_onboarding_dismissed')).toBe('true')
    expect(container.firstChild).toBeNull()
  })
})
