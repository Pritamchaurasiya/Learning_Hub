import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { render, screen, act, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { QuestionPaceRadar, calculateBenchmarkSeconds } from './QuestionPaceRadar'

describe('calculateBenchmarkSeconds', () => {
  it('returns 300s for coding and subjective questions', () => {
    expect(calculateBenchmarkSeconds('medium', 'coding')).toBe(300)
    expect(calculateBenchmarkSeconds('easy', 'subjective')).toBe(300)
  })

  it('returns 180s for hard numerical questions and 120s for standard numerical questions', () => {
    expect(calculateBenchmarkSeconds('hard', 'numerical')).toBe(180)
    expect(calculateBenchmarkSeconds('medium', 'numerical')).toBe(120)
  })

  it('returns 120s for MSQ questions', () => {
    expect(calculateBenchmarkSeconds('easy', 'MSQ')).toBe(120)
  })

  it('calculates benchmark for MCQ according to difficulty', () => {
    expect(calculateBenchmarkSeconds('hard', 'single_choice')).toBe(120)
    expect(calculateBenchmarkSeconds('medium', 'single_choice')).toBe(90)
    expect(calculateBenchmarkSeconds('easy', 'single_choice')).toBe(60)
  })
})

describe('QuestionPaceRadar Component', () => {
  beforeEach(() => {
    vi.useFakeTimers()
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  it('renders pace radar and tracks elapsed time', () => {
    render(
      <QuestionPaceRadar
        questionId="q-1"
        difficulty="easy"
        questionType="single_choice"
      />
    )

    expect(screen.getByTestId('question-pace-radar')).toBeInTheDocument()
    expect(screen.getByText('0:00 / 1:00')).toBeInTheDocument()
    expect(screen.getByText('Optimal Pace')).toBeInTheDocument()

    // Advance 30 seconds
    act(() => {
      vi.advanceTimersByTime(30000)
    })

    expect(screen.getByText('0:30 / 1:00')).toBeInTheDocument()
  })

  it('transitions to warning when approaching benchmark and triggers alert at 100%', () => {
    const onWarning = vi.fn()
    render(
      <QuestionPaceRadar
        questionId="q-1"
        difficulty="easy"
        questionType="single_choice"
        onPaceWarning={onWarning}
      />
    )

    // Advance to 52 seconds (86% of 60s benchmark)
    act(() => {
      vi.advanceTimersByTime(52000)
    })
    expect(screen.getByText('Approaching Target')).toBeInTheDocument()

    // Advance to 60 seconds (100%)
    act(() => {
      vi.advanceTimersByTime(8000)
    })
    expect(onWarning).toHaveBeenCalledWith('q-1', 60)

    // Advance to 80 seconds (> 125% -> Time Trap)
    act(() => {
      vi.advanceTimersByTime(20000)
    })
    expect(screen.getByText('Time Trap Alert')).toBeInTheDocument()
  })

  it('resets timer when questionId changes', () => {
    const { rerender } = render(
      <QuestionPaceRadar
        questionId="q-1"
        difficulty="easy"
        questionType="single_choice"
      />
    )

    act(() => {
      vi.advanceTimersByTime(25000)
    })
    expect(screen.getByText('0:25 / 1:00')).toBeInTheDocument()

    // Switch to question 2
    rerender(
      <QuestionPaceRadar
        questionId="q-2"
        difficulty="medium"
        questionType="single_choice"
      />
    )

    expect(screen.getByText('0:00 / 1:30')).toBeInTheDocument()
  })

  it('toggles minimized details when clicking expand/minimize button', async () => {
    vi.useRealTimers() // switch to real timers for userEvent interaction
    const user = userEvent.setup()

    render(
      <QuestionPaceRadar
        questionId="q-1"
        difficulty="easy"
        questionType="single_choice"
      />
    )

    expect(screen.getByText(/You are on track/i)).toBeInTheDocument()

    const toggleBtn = screen.getByRole('button', { name: /minimize pace details/i })
    await user.click(toggleBtn)

    await waitFor(() => {
      expect(screen.queryByText(/You are on track/i)).not.toBeInTheDocument()
    })
  })

  it('triggers Critical Sinkhole and renders Flag & Advance button when paceRatio >= 1.75', () => {
    const onFlagAndAdvance = vi.fn()
    render(
      <QuestionPaceRadar
        questionId="q-sinkhole"
        difficulty="easy" // 60s benchmark
        questionType="single_choice"
        onFlagAndAdvance={onFlagAndAdvance}
      />
    )

    // Advance 110s (110 / 60 = 1.83x > 1.75x)
    act(() => {
      vi.advanceTimersByTime(110000)
    })

    expect(screen.getByText('Critical Sinkhole')).toBeInTheDocument()
    expect(screen.getByText(/Time spent is 75%\+ over target/i)).toBeInTheDocument()

    const flagBtn = screen.getByRole('button', { name: /Flag & Advance/i })
    expect(flagBtn).toBeInTheDocument()

    act(() => {
      flagBtn.click()
    })
    expect(onFlagAndAdvance).toHaveBeenCalledTimes(1)
  })
})
