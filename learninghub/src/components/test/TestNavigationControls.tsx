import type { FC } from 'react'
import {
  ChevronLeft,
  ChevronRight,
  Activity,
  RefreshCw,
  BookmarkCheck,
  Bookmark,
  CheckCircle2,
  RotateCcw,
} from 'lucide-react'
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
  // Official CBT controls
  onSaveAndNext?: () => void
  onSaveAndMarkForReview?: () => void
  onMarkForReviewAndNext?: () => void
  onClearResponse?: () => void
  isCurrentAnswered?: boolean
  isCurrentFlagged?: boolean
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
  onSaveAndNext,
  onSaveAndMarkForReview,
  onMarkForReviewAndNext,
  onClearResponse,
  isCurrentAnswered = false,
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

  const hasCbtActions = Boolean(onSaveAndNext || onSaveAndMarkForReview || onMarkForReviewAndNext)

  if (hasCbtActions) {
    return (
      <div
        data-testid="cbt-exam-nav-controls"
        className="mt-8 pt-4 border-t border-gray-200 dark:border-gray-800 flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3"
      >
        {/* Left Side: Previous, Clear Response, Mark for Review & Next */}
        <div className="flex flex-wrap items-center gap-2">
          <Button
            data-testid="prev-question-btn"
            onClick={onPreviousQuestion}
            disabled={currentIndex === 0}
            variant="outline"
            size="sm"
            className="flex items-center gap-1 min-h-[40px] text-xs font-medium"
            aria-label="Previous Question"
          >
            <ChevronLeft className="w-4 h-4" />
            <span>Previous</span>
          </Button>

          {onClearResponse && (
            <Button
              type="button"
              onClick={onClearResponse}
              disabled={!isCurrentAnswered && !hasSelectedAnswer}
              variant="outline"
              size="sm"
              className="flex items-center gap-1.5 min-h-[40px] text-xs font-medium text-rose-600 dark:text-rose-400 border-rose-200 dark:border-rose-900/50 hover:bg-rose-50 dark:hover:bg-rose-950/30 disabled:opacity-40"
              title="Clear selected option for this question"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              <span>Clear Response</span>
            </Button>
          )}

          {onMarkForReviewAndNext && (
            <Button
              type="button"
              onClick={onMarkForReviewAndNext}
              disabled={totalQuestions <= 0 || currentIndex === totalQuestions - 1}
              variant="outline"
              size="sm"
              className="flex items-center gap-1.5 min-h-[40px] text-xs font-semibold text-amber-700 dark:text-amber-300 border-amber-300 dark:border-amber-700 bg-amber-50/60 dark:bg-amber-950/30 hover:bg-amber-100"
              title="Mark for review and proceed to next question"
            >
              <Bookmark className="w-3.5 h-3.5" />
              <span>Mark for Review & Next</span>
            </Button>
          )}
        </div>

        {/* Right Side: Save & Mark for Review, Save & Next, Next */}
        <div className="flex flex-wrap items-center gap-2 justify-end">
          {onSaveAndMarkForReview && (
            <Button
              type="button"
              onClick={onSaveAndMarkForReview}
              variant="secondary"
              size="sm"
              className="flex items-center gap-1.5 min-h-[40px] text-xs font-semibold text-purple-700 dark:text-purple-300 bg-purple-50 dark:bg-purple-950/40 border border-purple-300 dark:border-purple-800 hover:bg-purple-100 dark:hover:bg-purple-900/50"
              title="Save answer and mark for review"
            >
              <BookmarkCheck className="w-3.5 h-3.5 text-purple-600" />
              <span>Save & Mark for Review</span>
            </Button>
          )}

          {onSaveAndNext && (
            <Button
              type="button"
              onClick={onSaveAndNext}
              variant="primary"
              size="sm"
              className="flex items-center gap-1.5 min-h-[40px] text-xs font-bold bg-blue-600 hover:bg-blue-700 text-white shadow-xs"
              title="Save answer and navigate to next question"
            >
              <CheckCircle2 className="w-3.5 h-3.5" />
              <span>Save & Next</span>
              <ChevronRight className="w-4 h-4" />
            </Button>
          )}

          {!onSaveAndNext && (
            <Button
              data-testid="next-question-btn"
              onClick={onNextQuestion}
              disabled={totalQuestions <= 0 || currentIndex === totalQuestions - 1}
              variant="outline"
              size="sm"
              className="flex items-center gap-1 min-h-[40px] text-xs font-medium"
              aria-label="Next Question"
            >
              <span>Next</span>
              <ChevronRight className="w-4 h-4" />
            </Button>
          )}
        </div>
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
        <span>
          Previous<span className="hidden sm:inline"> Question</span>
        </span>
      </Button>
      <Button
        data-testid="next-question-btn"
        onClick={onNextQuestion}
        disabled={totalQuestions <= 0 || currentIndex === totalQuestions - 1}
        variant="outline"
        className="flex items-center gap-1.5 px-3 sm:px-4 min-h-[44px] text-xs sm:text-sm"
        aria-label="Navigate to next question"
      >
        <span>
          Next<span className="hidden sm:inline"> Question</span>
        </span>
        <ChevronRight className="w-4 h-4 shrink-0" />
      </Button>
    </div>
  )
}
