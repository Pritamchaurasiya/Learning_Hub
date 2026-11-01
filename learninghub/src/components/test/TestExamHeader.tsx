import { useState, useEffect, type FC } from 'react'
import {
  Trophy,
  Sparkles,
  Timer,
  AlertTriangle,
  RotateCcw,
  WifiOff,
  CheckCircle,
  FileText,
  Info,
  Calculator,
  PenTool,
  Languages,
  ZoomIn,
  ZoomOut,
  Maximize2,
  Minimize2,
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
  // CBT Examination Utilities
  examLanguage?: 'en' | 'hi'
  onLanguageChange?: (lang: 'en' | 'hi') => void
  onOpenQuestionPaper?: () => void
  onOpenInstructions?: () => void
  onOpenCalculator?: () => void
  onOpenScratchpad?: () => void
  fontSize?: 'sm' | 'md' | 'lg'
  onChangeFontSize?: (size: 'sm' | 'md' | 'lg') => void
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
  examLanguage = 'en',
  onLanguageChange,
  onOpenQuestionPaper,
  onOpenInstructions,
  onOpenCalculator,
  onOpenScratchpad,
  fontSize = 'md',
  onChangeFontSize,
}) => {
  const [isFullscreen, setIsFullscreen] = useState(false)

  useEffect(() => {
    const handleFsChange = () => {
      setIsFullscreen(Boolean(document.fullscreenElement))
    }
    document.addEventListener('fullscreenchange', handleFsChange)
    return () => document.removeEventListener('fullscreenchange', handleFsChange)
  }, [])
  const minutes = Math.floor(timeRemaining / 60)
  const seconds = String(timeRemaining % 60).padStart(2, '0')
  const progressPercent = totalQuestions > 0 ? ((currentQuestionIndex + 1) / totalQuestions) * 100 : 0

  return (
    <div
      data-testid="test-exam-header"
      className="bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 sticky top-0 z-20 shadow-xs"
    >
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-3">
        {/* Main Row: Title, Mode Badges, Timer, Autosave, Submit */}
        <div className="flex items-center justify-between gap-3 min-w-0">
          <div className="min-w-0 flex-1">
            <h1
              data-testid="exam-header-title"
              className="text-base sm:text-lg font-bold text-gray-900 dark:text-white truncate flex items-center gap-2"
            >
              <span>{title}</span>
            </h1>
          </div>

          <div className="flex items-center gap-2 sm:gap-3 shrink-0">
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
              aria-live="off"
              aria-atomic="true"
              aria-label={`Time remaining ${minutes} minutes ${seconds} seconds`}
              data-testid="exam-countdown-timer"
              className={`flex items-center gap-1.5 sm:gap-2 px-2.5 sm:px-3 py-1.5 rounded-full text-xs sm:text-sm font-semibold border transition-colors ${
                timeRemaining < 60
                  ? 'bg-red-50 text-red-700 border-red-200 dark:bg-red-950/40 dark:text-red-400 dark:border-red-800 animate-pulse'
                  : 'bg-gray-100 text-gray-700 border-gray-200 dark:bg-gray-800 dark:text-gray-300 dark:border-gray-700'
              }`}
            >
              <Timer className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-primary-500" aria-hidden="true" />
              <span className="font-mono font-bold" aria-hidden="true">
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
              className="text-xs hidden md:flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-gray-100 dark:bg-gray-800/80 border border-gray-200 dark:border-gray-700"
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
              className="font-bold bg-emerald-600 hover:bg-emerald-700 text-white shadow-xs"
            >
              {isSubmitting ? 'Submitting...' : 'Submit Test'}
            </Button>
          </div>
        </div>

        {/* CBT Utility Toolbar: Bilingual Toggle, Question Paper, Instructions, Calculator, Scratchpad, Font Zoom */}
        <div className="mt-2.5 pt-2 border-t border-gray-100 dark:border-gray-700/60 flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-2 text-xs">
          {/* Left tools: Bilingual Selector & Exam Utilities */}
          <div className="flex items-center gap-1.5 sm:gap-2 overflow-x-auto pb-1 max-w-full scrollbar-thin scrollbar-thumb-gray-200 dark:scrollbar-thumb-gray-700 shrink-0">
            {/* Language Toggle */}
            {onLanguageChange && (
              <div className="flex items-center bg-gray-100 dark:bg-gray-700/70 p-0.5 rounded-lg border border-gray-200 dark:border-gray-600">
                <button
                  type="button"
                  onClick={() => onLanguageChange('en')}
                  className={`px-2 py-1 rounded-md text-[11px] font-bold transition-all flex items-center gap-1 ${
                    examLanguage === 'en'
                      ? 'bg-blue-600 text-white shadow-xs'
                      : 'text-gray-600 dark:text-gray-300 hover:text-gray-900'
                  }`}
                  title="View test in English"
                >
                  <Languages className="w-3 h-3" />
                  <span>English</span>
                </button>
                <button
                  type="button"
                  onClick={() => onLanguageChange('hi')}
                  className={`px-2 py-1 rounded-md text-[11px] font-bold transition-all flex items-center gap-1 ${
                    examLanguage === 'hi'
                      ? 'bg-blue-600 text-white shadow-xs'
                      : 'text-gray-600 dark:text-gray-300 hover:text-gray-900'
                  }`}
                  title="प्रश्न पत्र हिन्दी में देखें"
                >
                  <Languages className="w-3 h-3" />
                  <span>हिन्दी</span>
                </button>
              </div>
            )}

            {/* Question Paper View */}
            {onOpenQuestionPaper && (
              <button
                type="button"
                onClick={onOpenQuestionPaper}
                className="px-2.5 py-1 rounded-lg bg-gray-50 hover:bg-gray-100 dark:bg-gray-700/50 dark:hover:bg-gray-700 text-gray-700 dark:text-gray-200 font-medium border border-gray-200 dark:border-gray-600 transition flex items-center gap-1.5 text-[11px]"
                title="View Full Question Paper"
              >
                <FileText className="w-3.5 h-3.5 text-blue-500" />
                <span className="hidden sm:inline">Question Paper</span>
                <span className="sm:hidden">Paper</span>
              </button>
            )}

            {/* Official Instructions */}
            {onOpenInstructions && (
              <button
                type="button"
                onClick={onOpenInstructions}
                className="px-2.5 py-1 rounded-lg bg-gray-50 hover:bg-gray-100 dark:bg-gray-700/50 dark:hover:bg-gray-700 text-gray-700 dark:text-gray-200 font-medium border border-gray-200 dark:border-gray-600 transition flex items-center gap-1.5 text-[11px]"
                title="View Official NTA CBT Exam Instructions"
              >
                <Info className="w-3.5 h-3.5 text-purple-500" />
                <span className="hidden sm:inline">Instructions</span>
                <span className="sm:hidden">Rules</span>
              </button>
            )}

            {/* Virtual Scientific Calculator */}
            {onOpenCalculator && (
              <button
                type="button"
                onClick={onOpenCalculator}
                className="px-2.5 py-1 rounded-lg bg-gray-50 hover:bg-gray-100 dark:bg-gray-700/50 dark:hover:bg-gray-700 text-gray-700 dark:text-gray-200 font-medium border border-gray-200 dark:border-gray-600 transition flex items-center gap-1.5 text-[11px]"
                title="Open GATE / Engineering Scientific Calculator"
              >
                <Calculator className="w-3.5 h-3.5 text-emerald-500" />
                <span className="hidden sm:inline">Calculator</span>
                <span className="sm:hidden">Calc</span>
              </button>
            )}

            {/* Digital Scratchpad */}
            {onOpenScratchpad && (
              <button
                type="button"
                onClick={onOpenScratchpad}
                className="px-2.5 py-1 rounded-lg bg-gray-50 hover:bg-gray-100 dark:bg-gray-700/50 dark:hover:bg-gray-700 text-gray-700 dark:text-gray-200 font-medium border border-gray-200 dark:border-gray-600 transition flex items-center gap-1.5 text-[11px]"
                title="Open Digital Rough Sheet / Scratchpad"
              >
                <PenTool className="w-3.5 h-3.5 text-amber-500" />
                <span className="hidden sm:inline">Scratchpad</span>
                <span className="sm:hidden">Rough</span>
              </button>
            )}

                        {/* Official Fullscreen CBT Kiosk Toggle */}
            <button
              type="button"
              onClick={() => {
                if (!document.fullscreenElement) {
                  document.documentElement.requestFullscreen().catch(() => {})
                } else {
                  document.exitFullscreen().catch(() => {})
                }
              }}
              className="px-2.5 py-1 rounded-lg bg-gray-50 hover:bg-gray-100 dark:bg-gray-700/50 dark:hover:bg-gray-700 text-gray-700 dark:text-gray-200 font-medium border border-gray-200 dark:border-gray-600 transition flex items-center gap-1.5 text-[11px]"
              title={isFullscreen ? 'Exit Fullscreen Mode' : 'Enter Official Fullscreen CBT Mode'}
            >
              {isFullscreen ? (
                <>
                  <Minimize2 className="w-3.5 h-3.5 text-blue-500" />
                  <span className="hidden sm:inline">Exit Fullscreen</span>
                </>
              ) : (
                <>
                  <Maximize2 className="w-3.5 h-3.5 text-blue-500" />
                  <span className="hidden sm:inline">Fullscreen CBT</span>
                  <span className="sm:hidden">Full</span>
                </>
              )}
            </button>

            {/* Font Zoom Controls */}
            {onChangeFontSize && (
              <div className="hidden sm:flex items-center bg-gray-100 dark:bg-gray-700/70 rounded-lg p-0.5 border border-gray-200 dark:border-gray-600">
                <button
                  type="button"
                  onClick={() => onChangeFontSize('sm')}
                  className={`px-1.5 py-0.5 rounded text-[10px] font-bold ${
                    fontSize === 'sm' ? 'bg-white dark:bg-gray-800 text-blue-600 shadow-xs' : 'text-gray-500'
                  }`}
                  title="Smaller font"
                >
                  <ZoomOut className="w-3 h-3 inline mr-0.5" />
                  A-
                </button>
                <button
                  type="button"
                  onClick={() => onChangeFontSize('md')}
                  className={`px-1.5 py-0.5 rounded text-[10px] font-bold ${
                    fontSize === 'md' ? 'bg-white dark:bg-gray-800 text-blue-600 shadow-xs' : 'text-gray-500'
                  }`}
                  title="Standard font"
                >
                  A
                </button>
                <button
                  type="button"
                  onClick={() => onChangeFontSize('lg')}
                  className={`px-1.5 py-0.5 rounded text-[10px] font-bold ${
                    fontSize === 'lg' ? 'bg-white dark:bg-gray-800 text-blue-600 shadow-xs' : 'text-gray-500'
                  }`}
                  title="Larger font"
                >
                  <ZoomIn className="w-3 h-3 inline mr-0.5" />
                  A+
                </button>
              </div>
            )}
          </div>

          {/* Right side: Keyboard hints & Question counter */}
          <div className="flex items-center justify-between sm:justify-end gap-3 text-gray-500 dark:text-gray-400 shrink-0 pt-1 sm:pt-0 border-t sm:border-t-0 border-gray-100 dark:border-gray-800">
            <span className="hidden lg:inline font-mono text-[11px]">
              Shortcuts:{' '}
              <kbd className="px-1.5 py-0.5 rounded bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 font-sans">
                ←
              </kbd>{' '}
              <kbd className="px-1.5 py-0.5 rounded bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 font-sans">
                →
              </kbd>{' '}
              Nav •{' '}
              <kbd className="px-1.5 py-0.5 rounded bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 font-sans">
                1-4
              </kbd>{' '}
              Ans •{' '}
              <kbd className="px-1.5 py-0.5 rounded bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 font-sans">
                F
              </kbd>{' '}
              Flag
            </span>
            <span data-testid="question-counter" className="font-bold text-gray-700 dark:text-gray-300 ml-auto sm:ml-0 text-xs sm:text-sm">
              Question {currentQuestionIndex + 1} of {totalQuestions}
            </span>
          </div>
        </div>

        <div className="mt-2" aria-live="polite">
          <ProgressBar
            progress={progressPercent}
            className="h-1.5"
            label={`Question ${currentQuestionIndex + 1} of ${totalQuestions}, ${Math.round(progressPercent)}% complete, ${minutes} minutes remaining`}
          />
        </div>
      </div>
    </div>
  )
}
