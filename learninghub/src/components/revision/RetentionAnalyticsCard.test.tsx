import { render, screen } from '@testing-library/react'
import { describe, it, expect } from 'vitest'
import { RetentionAnalyticsCard } from './RetentionAnalyticsCard'
import type { RetentionStats } from '../../types/revision'

const mockStats: RetentionStats = {
  total_cards: 10,
  mastered_count: 4,
  mastery_rate: 0.4,
  average_retention: 0.91,
  due_today: 2,
  forecast_7d: [2, 1, 0, 1, 0, 1, 0],
  topic_breakdown: [
    {
      topic: 'Dynamic Programming',
      total_cards: 5,
      mastered_cards: 2,
      mastery_percentage: 40,
      average_retention: 0.88,
    },
    {
      topic: 'Probability & Statistics',
      total_cards: 3,
      mastered_cards: 1,
      mastery_percentage: 33,
      average_retention: 0.94,
    },
  ],
}

describe('RetentionAnalyticsCard', () => {
  it('renders overall retention metric, SM-2+ badge, and counters without NaN', () => {
    render(<RetentionAnalyticsCard stats={mockStats} />)

    expect(screen.getByText('Memory Retention Engine')).toBeInTheDocument()
    expect(screen.getByText('SM-2+')).toBeInTheDocument()
    expect(screen.getByText('91%')).toBeInTheDocument()
    expect(screen.getByText('10')).toBeInTheDocument()
    expect(screen.queryByText(/NaN/i)).not.toBeInTheDocument()
  })

  it('renders topic retention breakdown with proper card counts and percentages', () => {
    render(<RetentionAnalyticsCard stats={mockStats} />)

    expect(screen.getByText('Dynamic Programming')).toBeInTheDocument()
    expect(screen.getByText(/2\/5 cards · 88% retention/i)).toBeInTheDocument()

    expect(screen.getByText('Probability & Statistics')).toBeInTheDocument()
    expect(screen.getByText(/1\/3 cards · 94% retention/i)).toBeInTheDocument()
  })

  it('safely handles legacy backend topic shapes without crashing or displaying NaN', () => {
    const legacyStats: any = {
      ...mockStats,
      topic_breakdown: [
        {
          topic: 'Complexity Theory',
          retention: 0.85,
          card_count: 2,
        },
      ],
    }

    render(<RetentionAnalyticsCard stats={legacyStats} />)

    expect(screen.getByText('Complexity Theory')).toBeInTheDocument()
    expect(screen.getByText(/0\/2 cards · 85% retention/i)).toBeInTheDocument()
    expect(screen.queryByText(/NaN/i)).not.toBeInTheDocument()
  })
})

