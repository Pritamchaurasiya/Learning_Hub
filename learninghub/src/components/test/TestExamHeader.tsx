import type { FC } from 'react'
import {
  Trophy,
  Sparkles,
  Timer,
  AlertTriangle,
  RotateCcw,
  WifiOff,
  CheckCircle,
} from 'lucide-react'
import { IRTThetaGauge } from './IRTThetaGauge'
import { ProgressBar } from '../ui/ProgressBar'
import { Button } from '../ui/Button'

export interface TestExamHeaderProps {
  title?: string
  assessmentMode?: string
  adaptiveTheta?: number
  adaptiveSem?: number
  timeRemaining: number
  tabSwitchCount?: number
  autosaveStatus?: 'idle' | 'saving' | 'saved' | 'retrying' | 'offline' | string
  lastAutosavedAt?: string | null
  isOnline?: boolean
  isSubmitting?: boolean
  currentQuestionIndex: number
  totalQuestions: number
  onSubmitClick: () => void
}

export const TestExamHeader: FC<TestExamHeaderProps> = ({
  title = 'Test',
  assessmentMode,
  adaptiveTheta = 0,
  adaptiveSem = 0.5,
  timeRemaining,
  tabSwitchCount = 0,
  autosaveStatus = 'idle',
  lastAutosavedAt,
  isOnline = true,
  isSubmitting = false,
  currentQuestionIndex,
  totalQuestions,
  onSubmitClick,
}) => {
  const minutes = Math.floor(timeRemaining / 60)
  const seconds = String(timeRemaining % 60).padStart(2, '0')
  const progressPercent = totalQuestions > 0 ? ((currentQuestionIndex + 1) / totalQuestions) * 100 : 0

  return (
    <div
      data-testid="test-exam-header"
      className="bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 sticky top-0 z-10"
    >
      <div className="max-w-4xl mx-auto px-4 py-4">
        <div className="flex items-center justify-between">
          <h1
            data-testid="exam-header-title"
            className="text-lg font-semibold text-gray-900 dark:text-white truncate"
          >
            {title}
          </h1>
          <div className="flex items-center gap-4">
            {assessmentMode === 'adaptive' && (
              <div className="hidden sm:block" data-testid="adaptive-gauge-wrapper">
                <IRTThetaGauge theta={adaptiveTheta} sem={adaptiveSem} />
              </div>
            )}
            {assessmentMode === 'contest' && (
              <div
                data-testid="contest-mode-badge"
                className="hidden sm:flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-amber-50 text-amber-700 dark:bg-amber-950/40 dark:text-amber-300 border border-amber-300 dark:border-amber-800 text-xs font-bold shadow-sm"
              >
                <Trophy className="w-3.5 h-3.5 text-amber-500" />
                <span>Contest Arena</span>
              </div>
            )}
            {assessmentMode === 'practice' && (
              <div
                data-testid="practice-mode-badge"
                className="hidden sm:flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-indigo-50 text-indigo-700 dark:bg-indigo-950/40 dark:text-indigo-300 border border-indigo-300 dark:border-indigo-800 text-xs font-bold shadow-sm"
              >
                <Sparkles className="w-3.5 h-3.5 text-indigo-500" />
                <span>Practice Mode</span>
              </div>
            )}
            <div
              role="timer"
              aria-live="polite"
              aria-atomic="true"
              aria-label={`Time remaining ${minutes} minutes ${seconds} seconds`}
              data-testid="exam-countdown-timer"
              className={`flex items-center gap-2 px-3 py-1.5 rounded-full text-sm font-semibold border transition-colors ${
                timeRemaining < 60
                  ? 'bg-red-50 text-red-700 border-red-200 dark:bg-red-950/40 dark:text-red-400 dark:border-red-800 animate-pulse'
                  : 'bg-gray-100 text-gray-700 border-gray-200 dark:bg-gray-800 dark:text-gray-300 dark:border-gray-700'
              }`}
            >
              <Timer className="w-4 h-4" aria-hidden="true" />
              <span className="font-mono font-medium" aria-hidden="true">
                {minutes}:{seconds}
              </span>
            </div>
            {tabSwitchCount > 0 && (
              <div
                data-testid="tab-switch-warning"
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-300 text-xs font-semibold"
                title="Number of tab / window switch events detected"
              >
                <AlertTriangle className="w-3.5 h-3.5 text-amber-600 dark:text-amber-400" />
                <span>Switches: {tabSwitchCount}</span>
              </div>
            )}
            <div
              data-testid="autosave-status-badge"
              className="text-xs hidden sm:flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-gray-100 dark:bg-gray-800/80 border border-gray-200 dark:border-gray-700"
            >
              {autosaveStatus === 'saving' ? (
                <span className="flex items-center gap-1.5 text-blue-600 dark:text-blue-400 font-medium">
                  <span className="w-2 h-2 rounded-full bg-blue-500 animate-ping" />
                  Saving...
                </span>
              ) : autosaveStatus === 'retrying' ? (
                <span className="flex items-center gap-1.5 text-amber-600 dark:text-amber-400 font-medium">
                  <RotateCcw className="w-3.5 h-3.5 animate-spin" />
                  Retrying...
                </span>
              ) : !isOnline || autosaveStatus === 'offline' ? (
                <span className="flex items-center gap-1.5 text-amber-600 dark:text-amber-400 font-medium">
                  <WifiOff className="w-3.5 h-3.5" />
                  Offline (Saved locally)
                </span>
              ) : (
                <span className="flex items-center gap-1.5 text-emerald-600 dark:text-emerald-400 font-medium">
                  <CheckCircle className="w-3.5 h-3.5" />
                  {lastAutosavedAt
                    ? `Saved ${new Date(lastAutosavedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })}`
                    : 'Autosave Active'}
                </span>
              )}
            </div>
            <Button
              data-testid="header-submit-btn"
              onClick={onSubmitClick}
              variant="primary"
              size="sm"
              disabled={isSubmitting}
            >
              {isSubmitting ? 'Submitting...' : 'Submit'}
            </Button>
          </div>
        </div>

        <div className="mt-3 flex items-center justify-between text-[11px] text-gray-400">
          <span className="hidden md:inline font-mono">
            Shortcuts:{' '}
            <kbd className="px-1.5 py-0.5 rounded bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 font-sans">
              ←
            </kbd>{' '}
            <kbd className="px-1.5 py-0.5 rounded bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 font-sans">
              →
            </kbd>{' '}
            Navigate •{' '}
            <kbd className="px-1.5 py-0.5 rounded bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 font-sans">
              1-4
            </kbd>{' '}
            Answer •{' '}
            <kbd className="px-1.5 py-0.5 rounded bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 font-sans">
              F
            </kbd>{' '}
            Flag
          </span>
          <span data-testid="question-counter" className="font-medium ml-auto">
            Question {currentQuestionIndex + 1} of {totalQuestions}
          </span>
        </div>

        <div className="mt-2" aria-live="polite">
          <ProgressBar
            progress={progressPercent}
            className="h-2"
            label={`Question ${currentQuestionIndex + 1} of ${totalQuestions}, ${Math.round(progressPercent)}% complete, ${minutes} minutes remaining`}
          />
        </div>
      </div>
    </div>
  )
}
