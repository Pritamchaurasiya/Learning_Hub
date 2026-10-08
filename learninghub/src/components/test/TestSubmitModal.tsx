import { memo } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { CheckCircle, X } from 'lucide-react'
import { Button } from '../ui/Button'

export interface TestSubmitModalProps {
  isOpen: boolean
  onClose: () => void
  onSubmit: () => void
  isSubmitting: boolean
  attemptedCount: number
  unansweredCount: number
  flaggedCount: number
  timeRemaining: number
}

export const TestSubmitModal = memo(function TestSubmitModal({
  isOpen,
  onClose,
  onSubmit,
  isSubmitting,
  attemptedCount,
  unansweredCount,
  flaggedCount,
  timeRemaining,
}: TestSubmitModalProps) {
  if (!isOpen) return null

  const minutesRemaining = Math.floor(timeRemaining / 60)
  const secondsRemaining = String(timeRemaining % 60).padStart(2, '0')

  return (
    <AnimatePresence>
      <div
        className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm"
        role="dialog"
        aria-modal="true"
        aria-labelledby="submit-modal-title"
      >
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          exit={{ opacity: 0, scale: 0.95 }}
          className="w-full max-w-md bg-white dark:bg-gray-800 rounded-2xl p-6 shadow-2xl border border-gray-200 dark:border-gray-700 space-y-6"
        >
          <div className="flex items-center justify-between border-b border-gray-100 dark:border-gray-700 pb-4">
            <h3
              id="submit-modal-title"
              className="text-xl font-bold text-gray-900 dark:text-white flex items-center gap-2"
            >
              <CheckCircle className="w-6 h-6 text-blue-600" /> Confirm Submission
            </h3>
            <button
              onClick={onClose}
              aria-label="Close submit confirmation dialog"
              className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 p-2 -m-2 min-w-[44px] min-h-[44px] flex items-center justify-center rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <X className="w-5 h-5" aria-hidden="true" />
            </button>
          </div>

          <p className="text-sm text-gray-600 dark:text-gray-400">
            Are you sure you want to submit your test? Once submitted, your answers will be
            graded deterministically.
          </p>

          <div className="grid grid-cols-3 gap-3">
            <div className="p-3 rounded-xl bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800/50 text-center">
              <span className="block text-2xl font-bold text-emerald-600 dark:text-emerald-400">
                {attemptedCount}
              </span>
              <span className="text-xs text-gray-500 dark:text-gray-400">Attempted</span>
            </div>
            <div className="p-3 rounded-xl bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 text-center">
              <span className="block text-2xl font-bold text-gray-700 dark:text-gray-300">
                {unansweredCount}
              </span>
              <span className="text-xs text-gray-500 dark:text-gray-400">Unanswered</span>
            </div>
            <div className="p-3 rounded-xl bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-800/50 text-center">
              <span className="block text-2xl font-bold text-amber-600 dark:text-amber-400">
                {flaggedCount}
              </span>
              <span className="text-xs text-gray-500 dark:text-gray-400">Flagged</span>
            </div>
          </div>

          <div className="flex items-center justify-between text-xs text-gray-500 bg-gray-50 dark:bg-gray-800/60 p-3 rounded-lg">
            <span>Time Remaining:</span>
            <span className="font-mono font-bold text-gray-800 dark:text-gray-200">
              {minutesRemaining}m {secondsRemaining}s
            </span>
          </div>

          <div className="flex gap-3 pt-2">
            <Button
              variant="outline"
              onClick={onClose}
              className="flex-1"
              disabled={isSubmitting}
            >
              Return to Test
            </Button>
            <Button
              variant="primary"
              onClick={onSubmit}
              className="flex-1 bg-blue-600 hover:bg-blue-700 text-white"
              disabled={isSubmitting}
            >
              {isSubmitting ? 'Submitting...' : 'Confirm Submit'}
            </Button>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  )
})
