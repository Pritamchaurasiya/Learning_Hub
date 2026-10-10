import { describe, it, expect, vi } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import { TestNavigationControls } from './TestNavigationControls'

describe('TestNavigationControls', () => {
  const defaultProps = {
    currentIndex: 2,
    totalQuestions: 10,
    hasSelectedAnswer: true,
    onPreviousQuestion: vi.fn(),
    onNextQuestion: vi.fn(),
    onAdaptiveStep: vi.fn(),
  }

  it('renders standard previous and next navigation buttons', () => {
    const onPrev = vi.fn()
    const onNext = vi.fn()
    render(
      <TestNavigationControls
        {...defaultProps}
        onPreviousQuestion={onPrev}
        onNextQuestion={onNext}
      />
    )

    const prevBtn = screen.getByTestId('prev-question-btn')
    const nextBtn = screen.getByTestId('next-question-btn')

    expect(prevBtn).toBeEnabled()
    expect(nextBtn).toBeEnabled()

    fireEvent.click(prevBtn)
    expect(onPrev).toHaveBeenCalledTimes(1)

    fireEvent.click(nextBtn)
    expect(onNext).toHaveBeenCalledTimes(1)
  })

  it('disables previous button on the first question', () => {
    render(<TestNavigationControls {...defaultProps} currentIndex={0} />)
    expect(screen.getByTestId('prev-question-btn')).toBeDisabled()
    expect(screen.getByTestId('next-question-btn')).toBeEnabled()
  })

  it('disables next button on the last question', () => {
    render(<TestNavigationControls {...defaultProps} currentIndex={9} totalQuestions={10} />)
    expect(screen.getByTestId('prev-question-btn')).toBeEnabled()
    expect(screen.getByTestId('next-question-btn')).toBeDisabled()
  })

  it('renders adaptive CAT controls with Fisher Information banner in adaptive mode', () => {
    const onAdaptiveStep = vi.fn()
    render(
      <TestNavigationControls
        {...defaultProps}
        assessmentMode="adaptive"
        hasSelectedAnswer={true}
        onAdaptiveStep={onAdaptiveStep}
      />
    )

    expect(screen.getByTestId('adaptive-nav-controls')).toBeInTheDocument()
    expect(
      screen.getByText(/Ability estimated via Bayesian EAP; next item maximizes Fisher Information/i)
    ).toBeInTheDocument()

    const stepBtn = screen.getByTestId('adaptive-step-btn')
    expect(stepBtn).toBeEnabled()
    fireEvent.click(stepBtn)
    expect(onAdaptiveStep).toHaveBeenCalledTimes(1)
  })

  it('disables adaptive button when no answer is selected', () => {
    render(
      <TestNavigationControls
        {...defaultProps}
        assessmentMode="adaptive"
        hasSelectedAnswer={false}
      />
    )

    const stepBtn = screen.getByTestId('adaptive-step-btn')
    expect(stepBtn).toBeDisabled()
  })

  it('renders loading state when adaptive step is in flight', () => {
    render(
      <TestNavigationControls
        {...defaultProps}
        assessmentMode="adaptive"
        hasSelectedAnswer={true}
        adaptiveStepLoading={true}
      />
    )

    const stepBtn = screen.getByTestId('adaptive-step-btn')
    expect(stepBtn).toBeDisabled()
    expect(screen.getByText('Evaluating θ...')).toBeInTheDocument()
  })
})
