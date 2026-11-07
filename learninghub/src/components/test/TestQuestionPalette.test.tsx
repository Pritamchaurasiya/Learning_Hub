import { describe, it, expect, vi } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import { TestQuestionPalette } from './TestQuestionPalette'

const mockQuestions = [
  { id: 'q1' },
  { id: 'q2' },
  { id: 'q3' },
  { id: 'q4' },
]

describe('TestQuestionPalette Component', () => {
  it('renders all question numbers and status summary', () => {
    render(
      <TestQuestionPalette
        questions={mockQuestions}
        currentIndex={0}
        answers={{ q1: 'optA', q2: 'optB' }}
        flaggedQuestions={['q2', 'q3']}
        onSelectQuestion={vi.fn()}
      />
    )

    // Palette buttons by test id
    expect(screen.getByTestId('palette-question-1')).toBeInTheDocument()
    expect(screen.getByTestId('palette-question-2')).toBeInTheDocument()
    expect(screen.getByTestId('palette-question-3')).toBeInTheDocument()
    expect(screen.getByTestId('palette-question-4')).toBeInTheDocument()

    // 5-state NTA status labels
    expect(screen.getByText('Answered')).toBeInTheDocument()
    expect(screen.getByText('Not Answered')).toBeInTheDocument()
    expect(screen.getByText('Not Visited')).toBeInTheDocument()
    expect(screen.getByText('Marked for Review')).toBeInTheDocument()
  })

  it('calls onSelectQuestion when a question button is clicked', () => {
    const onSelect = vi.fn()
    render(
      <TestQuestionPalette
        questions={mockQuestions}
        currentIndex={0}
        answers={{}}
        flaggedQuestions={[]}
        onSelectQuestion={onSelect}
      />
    )

    fireEvent.click(screen.getByTestId('palette-question-3'))
    expect(onSelect).toHaveBeenCalledWith(2)
  })

  it('marks the current active question button with aria-current="true"', () => {
    render(
      <TestQuestionPalette
        questions={mockQuestions}
        currentIndex={1}
        answers={{}}
        flaggedQuestions={[]}
        onSelectQuestion={vi.fn()}
      />
    )

    const currentBtn = screen.getByTestId('palette-question-2')
    expect(currentBtn).toHaveAttribute('aria-current', 'true')
  })

  it('preserves underlying candidate state color while applying active ring when current', () => {
    render(
      <TestQuestionPalette
        questions={mockQuestions}
        currentIndex={0}
        answers={{ q1: 'optA' }}
        flaggedQuestions={['q2']}
        onSelectQuestion={vi.fn()}
      />
    )

    const currentAnsweredBtn = screen.getByTestId('palette-question-1')
    expect(currentAnsweredBtn).toHaveAttribute('aria-current', 'true')
    // Should preserve emerald background from answered state and have active focus ring
    expect(currentAnsweredBtn.className).toContain('bg-emerald-600')
    expect(currentAnsweredBtn.className).toContain('ring-blue-500')
  })
})
