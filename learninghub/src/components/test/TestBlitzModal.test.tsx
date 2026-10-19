import { render, screen, fireEvent, act } from '@testing-library/react'
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { TestBlitzModal } from './TestBlitzModal'

describe('TestBlitzModal Component', () => {
  beforeEach(() => {
    vi.useFakeTimers()
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  it('renders nothing when isOpen is false', () => {
    const { container } = render(<TestBlitzModal isOpen={false} onClose={vi.fn()} />)
    expect(container).toBeEmptyDOMElement()
  })

  it('renders 60-Second Speed Blitz header and first question when open', () => {
    render(<TestBlitzModal isOpen={true} onClose={vi.fn()} />)

    expect(screen.getByText('60-Second Speed Blitz')).toBeInTheDocument()
    expect(screen.getByText('60s')).toBeInTheDocument()
    expect(
      screen.getByText(/Which data structure removes the oldest item first/i)
    ).toBeInTheDocument()
  })

  it('handles option click and updates score for correct answer', () => {
    render(<TestBlitzModal isOpen={true} onClose={vi.fn()} />)

    // Option 'Queue' is correct for FIFO
    const queueBtn = screen.getByText('Queue')
    fireEvent.click(queueBtn)

    // Score and streak should increase
    expect(screen.getByText('10')).toBeInTheDocument()
    expect(screen.getByText(/🔥 Streak: 1x/)).toBeInTheDocument()

    // Advance timers past auto-advance delay (550ms)
    act(() => {
      vi.advanceTimersByTime(600)
    })

    expect(screen.getByText(/Time complexity of binary search/i)).toBeInTheDocument()
  })

  it('calls onClose when close button is clicked', () => {
    const onClose = vi.fn()
    render(<TestBlitzModal isOpen={true} onClose={onClose} />)

    const closeBtn = screen.getByRole('button', { name: 'Close' })
    fireEvent.click(closeBtn)

    expect(onClose).toHaveBeenCalledTimes(1)
  })

  it('shows game over summary when time runs out', () => {
    render(<TestBlitzModal isOpen={true} onClose={vi.fn()} />)

    // Advance 60 seconds
    act(() => {
      vi.advanceTimersByTime(60000)
    })

    expect(screen.getByText('Blitz Completed!')).toBeInTheDocument()
    expect(screen.getByText('Play Again')).toBeInTheDocument()
  })
})
