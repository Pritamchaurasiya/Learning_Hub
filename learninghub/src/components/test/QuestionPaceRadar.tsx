import { memo, useState, useEffect, useMemo } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Timer, AlertTriangle, Zap, Eye, EyeOff, Flag } from 'lucide-react'

export interface QuestionPaceRadarProps {
  questionId: string
  difficulty?: 'easy' | 'medium' | 'hard' | string | number
  questionType?: string
  marks?: number
  isLocked?: boolean
  onPaceWarning?: (questionId: string, elapsedSeconds: number) => void
  onFlagAndAdvance?: () => void
}

/**
 * Calculates optimal benchmark target time (in seconds) based on question difficulty,
 * type (e.g. coding, subjective, numerical, MSQ), and marks.
 */
export const calculateBenchmarkSeconds = (
  difficulty?: string | number,
  questionType?: string,
  marks?: number
): number => {
  const normType = String(questionType || '').toLowerCase()
  const normDiff = String(difficulty ?? '').toLowerCase()

  // High cognitive complexity questions
  if (normType === 'coding' || normType === 'subjective') {
    return 300 // 5 minutes
  }

  if (normType === 'numerical' || normType === 'nat') {
    if (normDiff === 'hard') return 180
    return 120
  }

  if (normType === 'msq' || normType === 'multiple_select') {
    return 120
  }

  // Weight by marks if provided (e.g., GATE 2-mark questions)
  if (marks && marks >= 2) {
    if (normDiff === 'hard') return 150
    return 120
  }

  // Standard MCQ based on difficulty
  if (normDiff === 'hard') return 120
  if (normDiff === 'medium') return 90
  return 60 // Easy default
}

export const QuestionPaceRadar = memo(function QuestionPaceRadar({
  questionId,
  difficulty,
  questionType,
  marks,
  isLocked = false,
  onPaceWarning,
  onFlagAndAdvance,
}: QuestionPaceRadarProps) {
  const [elapsedSeconds, setElapsedSeconds] = useState(0)
  const [isMinimized, setIsMinimized] = useState(false)

  // Reset timer on question change
  useEffect(() => {
    setElapsedSeconds(0)
  }, [questionId])

  // Timer interval while station is active and unlocked
  useEffect(() => {
    if (isLocked) return

    const interval = setInterval(() => {
      setElapsedSeconds(prev => prev + 1)
    }, 1000)

    return () => clearInterval(interval)
  }, [isLocked, questionId])

  const benchmarkSeconds = useMemo(
    () => calculateBenchmarkSeconds(difficulty, questionType, marks),
    [difficulty, questionType, marks]
  )

  const paceRatio = elapsedSeconds / Math.max(1, benchmarkSeconds)

  // Trigger warning callback once when passing 100% benchmark
  useEffect(() => {
    if (elapsedSeconds === benchmarkSeconds && onPaceWarning) {
      onPaceWarning(questionId, elapsedSeconds)
    }
  }, [elapsedSeconds, benchmarkSeconds, questionId, onPaceWarning])

  const formatTime = (secs: number) => {
    const m = Math.floor(secs / 60)
    const s = secs % 60
    return `${m}:${s < 10 ? '0' : ''}${s}`
  }

  // Visual status
  const statusConfig = useMemo(() => {
    if (paceRatio >= 1.75) {
      return {
        level: 'critical_trap' as const,
        label: 'Critical Sinkhole',
        subtext: 'Time spent is 75%+ over target! Cut losses to protect remaining questions.',
        badgeClass:
          'bg-rose-100 text-rose-900 dark:bg-rose-950/80 dark:text-rose-200 border-rose-400 dark:border-rose-700 shadow-xs shadow-rose-500/20',
        barColor: 'bg-rose-600',
        icon: AlertTriangle,
      }
    }
    if (paceRatio > 1.25) {
      return {
        level: 'trap' as const,
        label: 'Time Trap Alert',
        subtext: 'Exceeded recommended time by 25%. Flag and return later!',
        badgeClass:
          'bg-rose-100 text-rose-800 dark:bg-rose-950/60 dark:text-rose-300 border-rose-300 dark:border-rose-800',
        barColor: 'bg-rose-500',
        icon: AlertTriangle,
      }
    }
    if (paceRatio >= 0.85) {
      return {
        level: 'warning' as const,
        label: 'Approaching Target',
        subtext: 'Wrap up solution or flag for review.',
        badgeClass:
          'bg-amber-100 text-amber-800 dark:bg-amber-950/60 dark:text-amber-300 border-amber-300 dark:border-amber-800',
        barColor: 'bg-amber-500',
        icon: Timer,
      }
    }
    return {
      level: 'optimal' as const,
      label: 'Optimal Pace',
      subtext: 'You are on track with competitive benchmarks.',
      badgeClass:
        'bg-emerald-50 text-emerald-800 dark:bg-emerald-950/40 dark:text-emerald-300 border-emerald-200 dark:border-emerald-800',
      barColor: 'bg-emerald-500',
      icon: Zap,
    }
  }, [paceRatio])

  const StatusIcon = statusConfig.icon

  return (
    <div
      data-testid="question-pace-radar"
      className={`rounded-xl border transition-all text-xs select-none ${statusConfig.badgeClass} p-2 sm:p-2.5`}
    >
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-1.5 font-semibold">
          <StatusIcon
            className={`w-3.5 h-3.5 ${statusConfig.level === 'trap' || statusConfig.level === 'critical_trap' ? 'animate-pulse text-rose-600' : ''}`}
          />
          <span className="font-mono">
            {formatTime(elapsedSeconds)} / {formatTime(benchmarkSeconds)}
          </span>
          <span className="text-[10px] uppercase font-bold tracking-wider hidden sm:inline-block px-1.5 py-0.5 rounded bg-black/5 dark:bg-white/10">
            {statusConfig.label}
          </span>
        </div>

        <button
          type="button"
          onClick={() => setIsMinimized(prev => !prev)}
          className="p-1 rounded hover:bg-black/10 dark:hover:bg-white/10 transition opacity-80 hover:opacity-100"
          title={isMinimized ? 'Expand pace details' : 'Minimize pace details'}
          aria-label={isMinimized ? 'Expand pace details' : 'Minimize pace details'}
        >
          {isMinimized ? <Eye className="w-3 h-3" /> : <EyeOff className="w-3 h-3" />}
        </button>
      </div>

      <AnimatePresence>
        {!isMinimized && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className="mt-1.5 space-y-1 overflow-hidden"
          >
            {/* Progress Bar */}
            <div className="w-full bg-black/10 dark:bg-white/10 h-1.5 rounded-full overflow-hidden">
              <div
                className={`h-full transition-all duration-300 rounded-full ${statusConfig.barColor}`}
                style={{ width: `${Math.min(100, Math.round(paceRatio * 100))}%` }}
              />
            </div>
            <p className="text-[10px] opacity-90 leading-tight">{statusConfig.subtext}</p>
            {statusConfig.level === 'critical_trap' && onFlagAndAdvance && (
              <button
                type="button"
                onClick={onFlagAndAdvance}
                className="mt-1.5 w-full py-1 px-2 rounded-md bg-rose-600 hover:bg-rose-700 active:bg-rose-800 text-white font-bold text-[10px] flex items-center justify-center gap-1.5 transition shadow-xs cursor-pointer"
                title="Flag question and advance to next"
              >
                <Flag className="w-3 h-3 fill-current" />
                <span>Flag & Advance (Cut Loss)</span>
              </button>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
})
