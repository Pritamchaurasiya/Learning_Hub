import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { ExamScratchpadModal } from './ExamScratchpadModal'

describe('ExamScratchpadModal Component', () => {
  beforeEach(() => {
    // Mock HTMLCanvasElement.prototype.getContext
    HTMLCanvasElement.prototype.getContext = vi.fn().mockReturnValue({
      clearRect: vi.fn(),
      beginPath: vi.fn(),
      moveTo: vi.fn(),
      lineTo: vi.fn(),
      stroke: vi.fn(),
      scale: vi.fn(),
    }) as any
  })

  it('renders modal when isOpen is true', () => {
    render(<ExamScratchpadModal isOpen={true} onClose={vi.fn()} />)
    expect(screen.getByText(/Digital Rough Sheet \/ Scratchpad/i)).toBeInTheDocument()
    expect(screen.getByText('Canvas')).toBeInTheDocument()
    expect(screen.getByText('Notes & Formulas')).toBeInTheDocument()
  })

  it('does not render when isOpen is false', () => {
    render(<ExamScratchpadModal isOpen={false} onClose={vi.fn()} />)
    expect(screen.queryByText(/Digital Rough Sheet \/ Scratchpad/i)).not.toBeInTheDocument()
  })

  it('switches between Canvas and Notes & Formulas tabs', async () => {
    const user = userEvent.setup()
    render(<ExamScratchpadModal isOpen={true} onClose={vi.fn()} />)

    // Initially in Canvas tab
    expect(screen.getByText(/Draw or scribble calculations here/i)).toBeInTheDocument()

    // Switch to Notes tab
    const notesTabBtn = screen.getByRole('button', { name: /notes & formulas/i })
    await user.click(notesTabBtn)

    expect(screen.getByPlaceholderText(/Type variables, steps, calculations/i)).toBeInTheDocument()
    expect(screen.getByText(/Standard Constants & Formulas/i)).toBeInTheDocument()
    expect(screen.getByText('c = 2.998 × 10⁸ m/s')).toBeInTheDocument()
  })

  it('inserts standard formula into scratch notes on click', async () => {
    const user = userEvent.setup()
    render(<ExamScratchpadModal isOpen={true} onClose={vi.fn()} />)

    // Switch to Notes tab
    await user.click(screen.getByRole('button', { name: /notes & formulas/i }))

    const textarea = screen.getByPlaceholderText(/Type variables, steps, calculations/i) as HTMLTextAreaElement
    expect(textarea.value).toBe('')

    // Click insert formula button for Planck's constant
    const insertButtons = screen.getAllByTitle(/insert into scratchpad/i)
    await user.click(insertButtons[0]) // First formula

    expect(textarea.value).toContain('c = 2.998 × 10⁸ m/s')
  })

  it('calls onClose when close button is clicked', async () => {
    const user = userEvent.setup()
    const onClose = vi.fn()
    render(<ExamScratchpadModal isOpen={true} onClose={onClose} />)

    const closeBtn = screen.getByRole('button', { name: /close scratchpad/i })
    await user.click(closeBtn)

    expect(onClose).toHaveBeenCalled()
  })
})
