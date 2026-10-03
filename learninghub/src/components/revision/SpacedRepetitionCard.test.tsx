import { render, screen, fireEvent } from '@testing-library/react'
import { describe, it, expect, vi } from 'vitest'
import { SpacedRepetitionCard } from './SpacedRepetitionCard'
import type { SpacedCard } from '../../types/revision'

const mockCard: SpacedCard = {
  id: 'card-1',
  card_type: 'MISTAKE',
  front: 'What is memoization in DP?',
  back: 'Top-down caching of overlapping subproblems',
  explanation: 'Prevents redundant exponential recomputation',
  topic: 'Dynamic Programming',
  subject: 'DSA',
  difficulty: 0.5,
  interval_days: 1,
  ease_factor: 2.5,
  repetitions: 1,
  lapses: 0,
  stability: 1.5,
  last_quality: 4,
  retention_probability: 0.92,
  last_reviewed_at: new Date().toISOString(),
  next_review_at: new Date().toISOString(),
  created_at: new Date().toISOString(),
}

describe('SpacedRepetitionCard', () => {
  it('renders front face with question prompt, topic, and retention badge', () => {
    render(<SpacedRepetitionCard card={mockCard} onReview={vi.fn()} />)

    expect(screen.getByText(/What is memoization in DP\?/i)).toBeInTheDocument()
    expect(screen.getByText('Dynamic Programming')).toBeInTheDocument()
    expect(screen.getByText(/92% Retention/i)).toBeInTheDocument()
  })

  it('flips to back face and reveals answer upon click', () => {
    render(<SpacedRepetitionCard card={mockCard} onReview={vi.fn()} />)

    const cardButton = screen.getByRole('button', { name: /Card front showing question/i })
    fireEvent.click(cardButton)

    // Back face contains target answer
    expect(screen.getByText(/Top-down caching of overlapping subproblems/i)).toBeInTheDocument()
    expect(screen.getByText(/Prevents redundant exponential recomputation/i)).toBeInTheDocument()

    // Grading buttons are displayed
    expect(screen.getByText('Again')).toBeInTheDocument()
    expect(screen.getByText('Hard')).toBeInTheDocument()
    expect(screen.getByText('Good')).toBeInTheDocument()
    expect(screen.getByText('Easy')).toBeInTheDocument()
  })

  it('calls onReview with appropriate grade when grade button is clicked', () => {
    const handleReview = vi.fn()
    render(<SpacedRepetitionCard card={mockCard} onReview={handleReview} />)

    const cardButton = screen.getByRole('button', { name: /Card front showing question/i })
    fireEvent.click(cardButton)

    const goodBtn = screen.getByText('Good').closest('button')!
    fireEvent.click(goodBtn)

    expect(handleReview).toHaveBeenCalledWith(4)
  })
})
