import { describe, it, expect, vi } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import { TestExamHeader } from './TestExamHeader'

describe('TestExamHeader', () => {
  const defaultProps = {
    title: 'JEE Advanced Physics Paper 1',
    timeRemaining: 3600,
    currentQuestionIndex: 4,
    totalQuestions: 20,
    onSubmitClick: vi.fn(),
  }

  it('renders test title, formatted timer, and question count', () => {
    render(<TestExamHeader {...defaultProps} />)

    expect(screen.getByTestId('exam-header-title')).toHaveTextContent('JEE Advanced Physics Paper 1')
    expect(screen.getByTestId('exam-countdown-timer')).toHaveTextContent('60:00')
    expect(screen.getByTestId('question-counter')).toHaveTextContent('Question 5 of 20')
  })

  it('triggers onSubmitClick when submit button is clicked', () => {
    const onSubmitClick = vi.fn()
    render(<TestExamHeader {...defaultProps} onSubmitClick={onSubmitClick} />)

    const submitBtn = screen.getByTestId('header-submit-btn')
    fireEvent.click(submitBtn)
    expect(onSubmitClick).toHaveBeenCalledTimes(1)
  })

  it('renders adaptive theta gauge when assessmentMode is adaptive', () => {
    render(
      <TestExamHeader
        {...defaultProps}
        assessmentMode="adaptive"
        adaptiveTheta={1.25}
        adaptiveSem={0.32}
      />
    )

    expect(screen.getByTestId('adaptive-gauge-wrapper')).toBeInTheDocument()
  })

  it('renders contest arena badge for contest mode', () => {
    render(<TestExamHeader {...defaultProps} assessmentMode="contest" />)
    expect(screen.getByTestId('contest-mode-badge')).toBeInTheDocument()
    expect(screen.getByText('Contest Arena')).toBeInTheDocument()
  })

  it('renders practice mode badge for practice mode', () => {
    render(<TestExamHeader {...defaultProps} assessmentMode="practice" />)
    expect(screen.getByTestId('practice-mode-badge')).toBeInTheDocument()
    expect(screen.getByText('Practice Mode')).toBeInTheDocument()
  })

  it('adds pulse animation styling when remaining time is less than 60 seconds', () => {
    render(<TestExamHeader {...defaultProps} timeRemaining={45} />)
    const timer = screen.getByTestId('exam-countdown-timer')
    expect(timer.className).toContain('animate-pulse')
    expect(timer).toHaveTextContent('0:45')
  })

  it('displays tab switch detection warning when count is positive', () => {
    render(<TestExamHeader {...defaultProps} tabSwitchCount={3} />)
    const warning = screen.getByTestId('tab-switch-warning')
    expect(warning).toHaveTextContent('Switches: 3')
  })

  it('renders offline saved indicator when user is offline', () => {
    render(<TestExamHeader {...defaultProps} isOnline={false} />)
    const autosave = screen.getByTestId('autosave-status-badge')
    expect(autosave).toHaveTextContent('Offline (Saved locally)')
  })
})
