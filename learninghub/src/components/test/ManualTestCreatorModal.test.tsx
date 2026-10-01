import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import { ManualTestCreatorModal } from './ManualTestCreatorModal'

describe('ManualTestCreatorModal', () => {
  const mockOnClose = vi.fn()
  const mockOnTestCreated = vi.fn()

  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('renders modal with blueprint fields when open', () => {
    render(
      <ManualTestCreatorModal
        isOpen={true}
        onClose={mockOnClose}
        onTestCreated={mockOnTestCreated}
      />
    )

    expect(screen.getByText('Instructor Manual Test Authoring Wizard')).toBeInTheDocument()
    expect(screen.getByText('1. Blueprint & Exam Rules')).toBeInTheDocument()
    expect(screen.getByPlaceholderText(/Advanced Calculus/i)).toBeInTheDocument()
  })

  it('transitions to Questions step when Next is clicked with title', () => {
    render(
      <ManualTestCreatorModal
        isOpen={true}
        onClose={mockOnClose}
        onTestCreated={mockOnTestCreated}
      />
    )

    const titleInput = screen.getByPlaceholderText(/Advanced Calculus/i)
    fireEvent.change(titleInput, { target: { value: 'Physics Wave Optics Test' } })

    const nextBtn = screen.getByText('Next: Add Questions')
    fireEvent.click(nextBtn)

    expect(screen.getByText(/Question 1 Editor/i)).toBeInTheDocument()
    expect(screen.getByText(/Add Question/i)).toBeInTheDocument()
  })
})
