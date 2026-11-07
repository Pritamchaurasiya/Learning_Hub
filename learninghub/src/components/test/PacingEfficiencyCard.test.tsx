import { render, screen, fireEvent } from '@testing-library/react'
import { describe, it, expect, vi } from 'vitest'
import { PacingEfficiencyCard } from './PacingEfficiencyCard'

describe('PacingEfficiencyCard', () => {
  it('renders pacing efficiency card with calculated metrics', () => {
    const questionResults = [
      {
        question_id: 'q-1',
        topic: 'Algebra',
        difficulty: 'easy',
        question_type: 'mcq',
        time_spent: 45, // Target: 60s -> Time banked: 15s
        is_correct: true,
      },
      {
        question_id: 'q-2',
        topic: 'Calculus',
        difficulty: 'hard',
        question_type: 'mcq',
        time_spent: 240, // Target: 120s -> Trap: 120s lost
        is_correct: false,
      },
      {
        question_id: 'q-3',
        topic: 'Geometry',
        difficulty: 'medium',
        question_type: 'mcq',
        time_spent: 80, // Target: 90s -> Optimal
        is_correct: true,
      },
    ]

    render(
      <PacingEfficiencyCard
        questionResults={questionResults}
        totalTimeTaken={365}
      />
    )

    expect(screen.getByText('Pacing Efficiency & Time Trap Diagnostic')).toBeInTheDocument()
    expect(screen.getByText(/Time Banked \(Speed Wins\)/i)).toBeInTheDocument()
    expect(screen.getByText(/Time Lost in Traps/i)).toBeInTheDocument()
    expect(screen.getByText(/Average Pace \/ Question/i)).toBeInTheDocument()
  })

  it('identifies time traps and allows expanding drilldown', () => {
    const onJumpToQuestion = vi.fn()
    const questionResults = [
      {
        question_id: 'q-trap-1',
        topic: 'Thermodynamics',
        difficulty: 'medium',
        question_type: 'mcq',
        time_spent: 220, // Target 90s, > 1.4x and incorrect -> Trap
        is_correct: false,
      },
      {
        question_id: 'q-optimal-2',
        topic: 'Optics',
        difficulty: 'easy',
        question_type: 'mcq',
        time_spent: 50,
        is_correct: true,
      },
    ]

    render(
      <PacingEfficiencyCard
        questionResults={questionResults}
        totalTimeTaken={270}
        onJumpToQuestion={onJumpToQuestion}
      />
    )

    // Drilldown toggle button should be visible
    const toggleButton = screen.getByRole('button', {
      name: /Inspect 1 Identified Time Trap Question/i,
    })
    expect(toggleButton).toBeInTheDocument()

    // Expand drilldown
    fireEvent.click(toggleButton)

    // Should reveal trap details for Q1
    expect(screen.getByText('Thermodynamics')).toBeInTheDocument()
    expect(screen.getByText(/Spent 3m 40s/i)).toBeInTheDocument()

    // Click Review button
    const reviewBtn = screen.getByRole('button', { name: /Review/i })
    fireEvent.click(reviewBtn)
    expect(onJumpToQuestion).toHaveBeenCalledWith(0)
  })

  it('returns null when no question results are provided', () => {
    const { container } = render(<PacingEfficiencyCard questionResults={[]} />)
    expect(container.firstChild).toBeNull()
  })
})

