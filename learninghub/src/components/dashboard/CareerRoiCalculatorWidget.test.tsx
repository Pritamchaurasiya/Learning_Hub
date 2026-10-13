import { describe, it, expect, vi } from 'vitest'
import { screen, fireEvent } from '@testing-library/react'
import { render } from '../../test/test-utils'
import { CareerRoiCalculatorWidget } from './CareerRoiCalculatorWidget'

const mockNavigate = vi.fn()
vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual('react-router-dom')
  return {
    ...actual,
    useNavigate: () => mockNavigate,
  }
})

describe('CareerRoiCalculatorWidget', () => {
  it('renders the career ROI calculator widget with default role', () => {
    render(<CareerRoiCalculatorWidget />)

    expect(screen.getByTestId('career-roi-calculator-widget')).toBeInTheDocument()
    expect(screen.getByText('Career ROI & Placement Value Calculator')).toBeInTheDocument()
    expect(screen.getByText('$148,000')).toBeInTheDocument()
    expect(screen.getByText('+38% Uplift')).toBeInTheDocument()
    expect(screen.getByText('3.2x Faster Placement')).toBeInTheDocument()
  })

  it('switches role benchmarks when clicking role pills', () => {
    render(<CareerRoiCalculatorWidget />)

    const staffButton = screen.getByRole('button', { name: /Staff Systems Architect/i })
    fireEvent.click(staffButton)

    expect(screen.getByText('$195,000')).toBeInTheDocument()
    expect(screen.getByText('+56% Uplift')).toBeInTheDocument()
    expect(screen.getByText('4.1x Faster Placement')).toBeInTheDocument()
    expect(screen.getByText('Distributed Consensus')).toBeInTheDocument()
  })

  it('navigates to assessment tests when clicking accelerate CTA', () => {
    render(<CareerRoiCalculatorWidget />)

    const ctaButton = screen.getByRole('button', { name: /Accelerate Readiness/i })
    fireEvent.click(ctaButton)

    expect(mockNavigate).toHaveBeenCalledWith('/tests-a')
  })
})
