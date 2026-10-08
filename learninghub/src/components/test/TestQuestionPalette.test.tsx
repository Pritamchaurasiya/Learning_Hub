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

    expect(screen.getByText('1')).toBeInTheDocument()
    expect(screen.getByText('2')).toBeInTheDocument()
    expect(screen.getByText('3')).toBeInTheDocument()
    expect(screen.getByText('4')).toBeInTheDocument()

    expect(screen.getByText(/Answered \(2\)/)).toBeInTheDocument()
    expect(screen.getByText(/Flagged \(2\)/)).toBeInTheDocument()
    expect(screen.getByText(/Unanswered \(2\)/)).toBeInTheDocument()
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

    fireEvent.click(screen.getByText('3'))
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

    const currentButton = screen.getByText('2')
    expect(currentButton).toHaveAttribute('aria-current', 'true')
  })
})
