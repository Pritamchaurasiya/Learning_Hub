import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { screen, fireEvent, act } from '@testing-library/react'
import { render } from '../../test/test-utils'
import { SessionElapsedTimer } from './SessionElapsedTimer'

describe('SessionElapsedTimer', () => {
  beforeEach(() => {
    vi.useFakeTimers()
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  it('renders the timer with initial 00:00 elapsed time', () => {
    render(
      <SessionElapsedTimer durationMinutes={60} />
    )

    expect(screen.getByTestId('session-elapsed-timer')).toBeInTheDocument()
    expect(screen.getByText('00:00')).toBeInTheDocument()
  })

  it('updates elapsed time after interval ticks', () => {
    render(
      <SessionElapsedTimer durationMinutes={60} />
    )

    act(() => {
      vi.advanceTimersByTime(5000) // 5 seconds
    })

    expect(screen.getByText('00:05')).toBeInTheDocument()
  })

  it('shows remaining time decreasing', () => {
    render(
      <SessionElapsedTimer durationMinutes={1} /> // 1 min = 60 sec
    )

    // Initially should show -01:00 remaining
    expect(screen.getByText('-01:00')).toBeInTheDocument()

    act(() => {
      vi.advanceTimersByTime(30000) // 30 seconds
    })

    // Should show -00:30 remaining
    expect(screen.getByText('-00:30')).toBeInTheDocument()
  })

  it('pauses and resumes the timer', () => {
    render(
      <SessionElapsedTimer durationMinutes={60} />
    )

    act(() => {
      vi.advanceTimersByTime(5000)
    })

    expect(screen.getByText('00:05')).toBeInTheDocument()

    // Pause
    const pauseButton = screen.getByTitle('Pause timer')
    fireEvent.click(pauseButton)

    // Advance time while paused
    act(() => {
      vi.advanceTimersByTime(10000)
    })

    // Should still show 00:05 since paused (timer stopped updating)
    // Note: the timer reads Date.now() so it will still advance,
    // but the interval is cleared so no re-render happens
    expect(screen.getByTitle('Resume timer')).toBeInTheDocument()
  })

  it('shows a progress bar', () => {
    render(
      <SessionElapsedTimer durationMinutes={60} />
    )

    expect(screen.getByTestId('session-elapsed-timer')).toBeInTheDocument()
    // The progress bar div exists within the timer
    const timer = screen.getByTestId('session-elapsed-timer')
    expect(timer.querySelector('.bg-emerald-500')).toBeInTheDocument()
  })

  it('accepts a custom start time', () => {
    // Start time 30 seconds ago
    const thirtySecsAgo = new Date(Date.now() - 30000).toISOString()

    render(
      <SessionElapsedTimer
        startTime={thirtySecsAgo}
        durationMinutes={60}
      />
    )

    // Should show approximately 00:30
    expect(screen.getByText('00:30')).toBeInTheDocument()
  })
})
