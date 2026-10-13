import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { screen, act } from '@testing-library/react'
import { render } from '../../test/test-utils'
import { LivePeerActivityTicker } from './LivePeerActivityTicker'

vi.mock('framer-motion', () => ({
  motion: {
    div: ({ children, ...props }: any) => <div {...props}>{children}</div>,
  },
  AnimatePresence: ({ children }: any) => <>{children}</>,
}))

describe('LivePeerActivityTicker Component', () => {
  beforeEach(() => {
    vi.useFakeTimers()
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  it('renders the active learner count and initial activity event', () => {
    render(<LivePeerActivityTicker />)

    expect(screen.getByText(/1,842 learners active now/i)).toBeInTheDocument()
    expect(screen.getByText('Alex Chen')).toBeInTheDocument()
    expect(screen.getByText('Dynamic Programming Master Diagnostic')).toBeInTheDocument()
    expect(screen.getByText('1v1 Arena Duel')).toBeInTheDocument()
  })

  it('cycles to the next peer event after interval elapses', () => {
    render(<LivePeerActivityTicker />)

    expect(screen.getByText('Alex Chen')).toBeInTheDocument()

    // Advance timer past the 4500ms cycle interval
    act(() => {
      vi.advanceTimersByTime(4500)
    })

    expect(screen.getByText('Priya Sharma')).toBeInTheDocument()
    expect(screen.getByText('14-Day Continuous Streak')).toBeInTheDocument()
  })

  it('renders link to the 1v1 Arena Duel page', () => {
    render(<LivePeerActivityTicker />)

    const duelLink = screen.getByRole('link', { name: /1v1 Arena Duel/i })
    expect(duelLink).toBeInTheDocument()
    expect(duelLink).toHaveAttribute('href', '/arena/duel')
  })
})
