import { describe, it, expect, vi } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import { SocraticReviewModal } from './SocraticReviewModal'

describe('SocraticReviewModal Component', () => {
  const defaultProps = {
    isOpen: true,
    onClose: vi.fn(),
    questionText: 'What is the runtime of Mergesort on n elements?',
    selectedOptionText: 'O(n^2)',
    correctOptionText: 'O(n log n)',
    topic: 'Sorting Algorithms',
  }

  it('renders diagnostic thought process step first', () => {
    render(<SocraticReviewModal {...defaultProps} />)

    expect(screen.getByText('Socratic AI Mistake Diagnosis')).toBeInTheDocument()
    expect(screen.getByText(/Targeting Topic: Sorting Algorithms/i)).toBeInTheDocument()
    expect(screen.getByText('Diagnostic: What was your thought process?')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Analyze My Reasoning' })).toBeDisabled()
  })

  it('does not render when isOpen is false', () => {
    const { container } = render(
      <SocraticReviewModal {...defaultProps} isOpen={false} />
    )
    expect(container.firstChild).toBeNull()
  })

  it('submits student reasoning and progressively unlocks hints and mastery check', () => {
    render(<SocraticReviewModal {...defaultProps} />)

    // Type reasoning and submit
    const textarea = screen.getByPlaceholderText(/I thought that because the tree branches/i)
    fireEvent.change(textarea, { target: { value: 'I assumed nested loops' } })

    const analyzeBtn = screen.getByRole('button', { name: 'Analyze My Reasoning' })
    expect(analyzeBtn).not.toBeDisabled()
    fireEvent.click(analyzeBtn)

    // Hint 1 is now visible
    expect(screen.getByText(/Concept Anchor & Core Theorem/i)).toBeInTheDocument()

    // Unlock Hint 2
    const revealNextBtn = screen.getByRole('button', { name: /Reveal Next Deeper Hint/i })
    fireEvent.click(revealNextBtn)
    expect(screen.getByText(/Edge Case & Counterexample Analysis/i)).toBeInTheDocument()

    // Unlock Hint 3
    const revealThirdBtn = screen.getByRole('button', { name: /Reveal Next Deeper Hint/i })
    fireEvent.click(revealThirdBtn)
    expect(screen.getByText(/Step-by-Step Mathematical Derivation/i)).toBeInTheDocument()

    // Answer concept mastery verification question
    const correctOpt = screen.getByRole('button', { name: 'T(n) = Theta(n^(log_b a))' })
    fireEvent.click(correctOpt)

    expect(
      screen.getByText(/Misconception Resolved! Full mastery points awarded./i)
    ).toBeInTheDocument()
  })

  it('calls onClose when close button is clicked', () => {
    const onClose = vi.fn()
    render(<SocraticReviewModal {...defaultProps} onClose={onClose} />)

    const closeReviewBtn = screen.getByRole('button', { name: 'Close Review' })
    fireEvent.click(closeReviewBtn)

    expect(onClose).toHaveBeenCalled()
  })
})
