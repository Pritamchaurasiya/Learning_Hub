import type { FC } from 'react'
import { ChevronLeft, ChevronRight, Activity, RefreshCw } from 'lucide-react'
import { Button } from '../ui/Button'

export interface TestNavigationControlsProps {
  assessmentMode?: string
  currentIndex: number
  totalQuestions: number
  hasSelectedAnswer?: boolean
  adaptiveStepLoading?: boolean
  onPreviousQuestion: () => void
  onNextQuestion: () => void
  onAdaptiveStep: () => void
}

export const TestNavigationControls: FC<TestNavigationControlsProps> = ({
  assessmentMode,
  currentIndex,
  totalQuestions,
  hasSelectedAnswer = false,
  adaptiveStepLoading = false,
  onPreviousQuestion,
  onNextQuestion,
  onAdaptiveStep,
}) => {
  if (assessmentMode === 'adaptive') {
    return (
      <div
        data-testid="adaptive-nav-controls"
        className="flex flex-col sm:flex-row items-center justify-between mt-8 p-4 rounded-2xl bg-purple-50/50 dark:bg-purple-950/30 border border-purple-200 dark:border-purple-800/50 gap-4"
      >
        <div className="flex items-center gap-2 text-xs font-semibold text-purple-700 dark:text-purple-300">
          <Activity className="w-4 h-4 text-purple-500 animate-pulse" />
          <span>
            CAT Algorithm Active: Ability estimated via Bayesian EAP; next item maximizes Fisher
            Information.
          </span>
        </div>
        <Button
          data-testid="adaptive-step-btn"
          onClick={onAdaptiveStep}
          disabled={adaptiveStepLoading || !hasSelectedAnswer}
          variant="primary"
          className="bg-purple-600 hover:bg-purple-700 text-white flex items-center gap-2 shadow-md w-full sm:w-auto justify-center"
        >
          {adaptiveStepLoading ? (
            <>
              <RefreshCw className="w-4 h-4 animate-spin" />
              <span>Evaluating θ...</span>
            </>
          ) : (
            <>
              <span>Confirm & Next Adaptive Item</span>
              <ChevronRight className="w-4 h-4" />
            </>
          )}
        </Button>
      </div>
    )
  }

  return (
    <div
      data-testid="standard-nav-controls"
      className="flex items-center justify-between gap-3 mt-8 pt-4 border-t border-gray-100 dark:border-gray-800"
    >
      <Button
        data-testid="prev-question-btn"
        onClick={onPreviousQuestion}
        disabled={currentIndex === 0}
        variant="outline"
        className="flex items-center gap-1.5 px-3 sm:px-4 min-h-[44px] text-xs sm:text-sm"
        aria-label="Navigate to previous question"
      >
        <ChevronLeft className="w-4 h-4 shrink-0" />
        <span>Previous<span className="hidden sm:inline"> Question</span></span>
      </Button>
      <Button
        data-testid="next-question-btn"
        onClick={onNextQuestion}
        disabled={totalQuestions <= 0 || currentIndex === totalQuestions - 1}
        variant="outline"
        className="flex items-center gap-1.5 px-3 sm:px-4 min-h-[44px] text-xs sm:text-sm"
        aria-label="Navigate to next question"
      >
        <span>Next<span className="hidden sm:inline"> Question</span></span>
        <ChevronRight className="w-4 h-4 shrink-0" />
      </Button>
    </div>
  )
}
