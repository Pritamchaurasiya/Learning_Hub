import { describe, it, expect, vi } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import { TestSubmitModal } from './TestSubmitModal'

describe('TestSubmitModal Component', () => {
  it('does not render when isOpen is false', () => {
    const { container } = render(
      <TestSubmitModal
        isOpen={false}
        onClose={vi.fn()}
        onSubmit={vi.fn()}
        isSubmitting={false}
        attemptedCount={5}
        unansweredCount={5}
        flaggedCount={2}
        timeRemaining={600}
      />
    )
    expect(container).toBeEmptyDOMElement()
  })

  it('renders confirmation details, counts, and time when open', () => {
    render(
      <TestSubmitModal
        isOpen={true}
        onClose={vi.fn()}
        onSubmit={vi.fn()}
        isSubmitting={false}
        attemptedCount={8}
        unansweredCount={2}
        flaggedCount={3}
        timeRemaining={450} // 7m 30s
      />
    )

    expect(screen.getByText('Confirm Submission')).toBeInTheDocument()
    expect(screen.getByText('8')).toBeInTheDocument()
    expect(screen.getByText('Attempted')).toBeInTheDocument()
    expect(screen.getByText('2')).toBeInTheDocument()
    expect(screen.getByText('Unanswered')).toBeInTheDocument()
    expect(screen.getByText('3')).toBeInTheDocument()
    expect(screen.getByText('Flagged')).toBeInTheDocument()
    expect(screen.getByText('7m 30s')).toBeInTheDocument()
  })

  it('triggers onClose when Return to Test or close button is clicked', () => {
    const onClose = vi.fn()
    render(
      <TestSubmitModal
        isOpen={true}
        onClose={onClose}
        onSubmit={vi.fn()}
        isSubmitting={false}
        attemptedCount={8}
        unansweredCount={2}
        flaggedCount={3}
        timeRemaining={450}
      />
    )

    fireEvent.click(screen.getByText('Return to Test'))
    expect(onClose).toHaveBeenCalledTimes(1)

    fireEvent.click(screen.getByLabelText('Close submit confirmation dialog'))
    expect(onClose).toHaveBeenCalledTimes(2)
  })

  it('triggers onSubmit when Confirm Submit is clicked', () => {
    const onSubmit = vi.fn()
    render(
      <TestSubmitModal
        isOpen={true}
        onClose={vi.fn()}
        onSubmit={onSubmit}
        isSubmitting={false}
        attemptedCount={8}
        unansweredCount={2}
        flaggedCount={3}
        timeRemaining={450}
      />
    )

    fireEvent.click(screen.getByText('Confirm Submit'))
    expect(onSubmit).toHaveBeenCalledTimes(1)
  })

  it('disables buttons when isSubmitting is true', () => {
    render(
      <TestSubmitModal
        isOpen={true}
        onClose={vi.fn()}
        onSubmit={vi.fn()}
        isSubmitting={true}
        attemptedCount={8}
        unansweredCount={2}
        flaggedCount={3}
        timeRemaining={450}
      />
    )

    expect(screen.getByText('Submitting...')).toBeDisabled()
    expect(screen.getByText('Return to Test')).toBeDisabled()
  })
})
