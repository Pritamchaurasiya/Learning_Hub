import { render, screen, waitFor, fireEvent } from '@testing-library/react'
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { BrowserRouter } from 'react-router-dom'
import { HelmetProvider } from 'react-helmet-async'
import { RevisionPage } from './RevisionPage'
import { revisionService } from '../services/revisionService'

const mockAddToast = vi.fn()
vi.mock('../components/ui/Toast', () => ({
  useToast: () => ({
    addToast: mockAddToast,
  }),
}))

const mockPlayRewardChime = vi.fn()
vi.mock('../utils/soundEffects', () => ({
  playRewardChime: (...args: unknown[]) => mockPlayRewardChime(...args),
}))

const mockTriggerHaptic = vi.fn()
vi.mock('../utils/haptics', () => ({
  triggerHaptic: (...args: unknown[]) => mockTriggerHaptic(...args),
}))


const MOCK_CARDS = [
  {
    id: 'srs-demo-1',
    card_type: 'MISTAKE' as const,
    front: 'Why does 0/1 Knapsack require dynamic programming rather than a greedy choice property?',
    back: 'Items cannot be divided. Making a locally optimal choice can prevent reaching the global maximum.',
    explanation: 'DP[i][w] = max(DP[i-1][w], DP[i-1][w-wt[i]] + val[i]).',
    topic: 'Dynamic Programming',
    subject: 'Algorithms',
    difficulty: 0.8,
    interval_days: 1,
    ease_factor: 2.5,
    repetitions: 1,
    lapses: 1,
    stability: 1.2,
    last_quality: 3,
    retention_probability: 0.88,
    last_reviewed_at: new Date(Date.now() - 3600 * 1000).toISOString(),
    next_review_at: new Date(Date.now() - 3600 * 1000).toISOString(),
    created_at: new Date().toISOString(),
  },
  {
    id: 'srs-demo-2',
    card_type: 'FORMULA' as const,
    front: "State Bayes' Theorem formula for probability updating given evidence.",
    back: 'P(A|B) = \\frac{P(B|A) \\cdot P(A)}{P(B)}',
    explanation: 'Bayes Theorem formula',
    topic: 'Probability & Statistics',
    subject: 'Mathematics',
    difficulty: -0.2,
    interval_days: 6,
    ease_factor: 2.6,
    repetitions: 2,
    lapses: 0,
    stability: 5.5,
    last_quality: 5,
    retention_probability: 0.94,
    last_reviewed_at: new Date(Date.now() - 86400 * 1000).toISOString(),
    next_review_at: new Date(Date.now() - 3600 * 1000).toISOString(),
    created_at: new Date().toISOString(),
  },
]

describe('RevisionPage', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    vi.spyOn(revisionService, 'getDailyDeck').mockImplementation(async (_topic, cardType) => {
      const filtered = cardType
        ? MOCK_CARDS.filter(c => c.card_type === cardType)
        : MOCK_CARDS
      return {
        cards: filtered,
        stats: {
          total_cards: MOCK_CARDS.length,
          total_due: filtered.length,
          mastered_count: 1,
          learning_count: 1,
          new_count: 0,
          average_retention: 0.91,
        },
      }
    })
    vi.spyOn(revisionService, 'getRetentionStats').mockResolvedValue({
      total_cards: 42,
      mastered_count: 10,
      mastery_rate: 0.24,
      average_retention: 0.92,
      due_today: 4,
      forecast_7d: [4, 6, 2, 5, 3, 1, 4],
      topic_breakdown: [
        {
          topic: 'Dynamic Programming',
          total_cards: 10,
          mastered_cards: 4,
          mastery_percentage: 40,
          average_retention: 0.88,
        },
      ],
    })
  })

  it('renders page header, filters, and loads cards', async () => {
    render(
      <HelmetProvider>
        <BrowserRouter>
          <RevisionPage />
        </BrowserRouter>
      </HelmetProvider>
    )

    expect(screen.getByText('Spaced Revision Hub')).toBeInTheDocument()
    expect(screen.getByText('Due for Review')).toBeInTheDocument()
    expect(screen.getByText('All Cards')).toBeInTheDocument()
    expect(screen.getByText('Key Formulas')).toBeInTheDocument()

    // Wait for card to appear
    await waitFor(() => {
      expect(screen.getByText(/Knapsack/i)).toBeInTheDocument()
    })
  })

  it('allows switching filter tabs', async () => {
    render(
      <HelmetProvider>
        <BrowserRouter>
          <RevisionPage />
        </BrowserRouter>
      </HelmetProvider>
    )

    const formulasTab = screen.getByText('Key Formulas')
    fireEvent.click(formulasTab)

    await waitFor(() => {
      expect(screen.getByText(/Bayes' Theorem/i)).toBeInTheDocument()
    })
  })

  it('opens custom card modal on Create Card button click', async () => {
    render(
      <HelmetProvider>
        <BrowserRouter>
          <RevisionPage />
        </BrowserRouter>
      </HelmetProvider>
    )

    const createBtn = screen.getByRole('button', { name: /Create Card/i })
    fireEvent.click(createBtn)

    expect(screen.getByText('Create Flashcard')).toBeInTheDocument()
    expect(screen.getByPlaceholderText(/State the master theorem recurrence/i)).toBeInTheDocument()
  })

  it('triggers audio and haptic feedback when a card is reviewed', async () => {
    vi.spyOn(revisionService, 'submitReview').mockResolvedValue({
      card: {
        ...MOCK_CARDS[0],
        interval_days: 2,
        repetitions: 2,
      },
    })

    render(
      <HelmetProvider>
        <BrowserRouter>
          <RevisionPage />
        </BrowserRouter>
      </HelmetProvider>
    )

    await waitFor(() => {
      expect(screen.getByText(/Knapsack/i)).toBeInTheDocument()
    })

    // Flip card by pressing space
    fireEvent.keyDown(window, { code: 'Space' })

    // Grade as Good (4)
    const goodBtn = await screen.findByRole('button', { name: /Good/i })
    fireEvent.click(goodBtn)

    await waitFor(() => {
      expect(mockPlayRewardChime).toHaveBeenCalledWith('xp-gain')
      expect(mockTriggerHaptic).toHaveBeenCalledWith('success')
    })
  })
})
