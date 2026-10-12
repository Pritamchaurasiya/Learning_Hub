import type { ReactNode } from 'react'
import { describe, it, expect, vi } from 'vitest'
import { screen } from '@testing-library/react'
import { render } from '../../test/test-utils'
import { SpeedTrendWidget } from './SpeedTrendWidget'

// Mock recharts
vi.mock('recharts', () => {
  return {
    ResponsiveContainer: ({ children }: { children: ReactNode }) => (
      <div data-testid="responsive-container">{children}</div>
    ),
    AreaChart: ({ children }: { children: ReactNode }) => (
      <div data-testid="area-chart">{children}</div>
    ),
    Area: () => null,
    XAxis: () => null,
    YAxis: () => null,
    CartesianGrid: () => null,
    Tooltip: () => null,
  }
})

describe('SpeedTrendWidget', () => {
  const mockSpeedData = [
    { date: 'Mon', avgTimePerQuestion: 52, questionsAnswered: 30 },
    { date: 'Tue', avgTimePerQuestion: 48, questionsAnswered: 45 },
    { date: 'Wed', avgTimePerQuestion: 45, questionsAnswered: 30 },
    { date: 'Thu', avgTimePerQuestion: 41, questionsAnswered: 50 },
    { date: 'Fri', avgTimePerQuestion: 38, questionsAnswered: 40 },
    { date: 'Sat', avgTimePerQuestion: 36, questionsAnswered: 30 },
    { date: 'Sun', avgTimePerQuestion: 35, questionsAnswered: 45 },
  ]

  it('renders the speed trend widget with title and improvement percentage', () => {
    render(<SpeedTrendWidget data={mockSpeedData} />)

    expect(screen.getByTestId('speed-trend-widget')).toBeInTheDocument()
    expect(screen.getByText('Solving Speed')).toBeInTheDocument()
    // Improvement: (52-35)/52 ≈ 32.7% → -33%
    expect(screen.getByText(/-33%/)).toBeInTheDocument()
  })

  it('renders total questions answered summary', () => {
    render(<SpeedTrendWidget data={mockSpeedData} />)

    // Total: 30+45+30+50+40+30+45 = 270
    expect(screen.getByText('270 questions answered this week')).toBeInTheDocument()
  })

  it('renders latest speed value', () => {
    render(<SpeedTrendWidget data={mockSpeedData} />)

    expect(screen.getByText('35s latest')).toBeInTheDocument()
  })

  it('renders the area chart component', () => {
    render(<SpeedTrendWidget data={mockSpeedData} />)
    expect(screen.getByTestId('area-chart')).toBeInTheDocument()
  })

  it('renders nothing when given empty data', () => {
    const { container } = render(<SpeedTrendWidget data={[]} />)
    expect(container.firstChild).toBeNull()
  })
})
