import { useEffect, useState, useCallback } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { CheckCircle, XCircle, AlertCircle, Info, X, Loader2 } from 'lucide-react'
import { useStore } from '../../stores/useStore'
import type { Toast as ToastType } from '../../types'

// Extended toast type with action support
interface ToastProps {
  toast: ToastType & {
    action?: {
      label: string
      onClick: () => void
    }
    onDismiss?: () => void
  }
}

export function Toast({ toast }: ToastProps) {
  const { removeToast } = useStore()
  const [progress, setProgress] = useState(100)
  const [isPaused, setIsPaused] = useState(false)

  const duration = toast.duration ?? 5000

  const handleDismiss = useCallback(() => {
    toast.onDismiss?.()
    removeToast(toast.id)
  }, [toast, removeToast])

  // Icons configuration
  const icons = {
    success: <CheckCircle className="w-5 h-5 text-emerald-500" aria-hidden="true" />,
    error: <XCircle className="w-5 h-5 text-red-500" aria-hidden="true" />,
    warning: <AlertCircle className="w-5 h-5 text-amber-500" aria-hidden="true" />,
    info: <Info className="w-5 h-5 text-blue-500" aria-hidden="true" />,
    loading: <Loader2 className="w-5 h-5 text-primary-500 animate-spin" aria-hidden="true" />,
  }

  // Background colors
  const bgColors = {
    success: 'bg-white/95 dark:bg-gray-800/95 border-emerald-200/60 dark:border-emerald-700/40',
    error: 'bg-white/95 dark:bg-gray-800/95 border-red-200/60 dark:border-red-700/40',
    warning: 'bg-white/95 dark:bg-gray-800/95 border-amber-200/60 dark:border-amber-700/40',
    info: 'bg-white/95 dark:bg-gray-800/95 border-blue-200/60 dark:border-blue-700/40',
    loading: 'bg-white/95 dark:bg-gray-800/95 border-primary-200/60 dark:border-primary-700/40',
  }

  // Progress bar colors
  const progressColors = {
    success: 'bg-emerald-500',
    error: 'bg-red-500',
    warning: 'bg-amber-500',
    info: 'bg-blue-500',
    loading: 'bg-primary-500',
  }

  // Auto-dismiss with progress animation
  useEffect(() => {
    if (toast.type === 'loading' || isPaused) return

    const startTime = Date.now()
    const endTime = startTime + duration

    const updateProgress = () => {
      const now = Date.now()
      const remaining = Math.max(0, endTime - now)
      const newProgress = (remaining / duration) * 100
      setProgress(newProgress)

      if (remaining > 0) {
        requestAnimationFrame(updateProgress)
      } else {
        handleDismiss()
      }
    }

    const animationFrame = requestAnimationFrame(updateProgress)
    return () => cancelAnimationFrame(animationFrame)
  }, [duration, isPaused, toast.id, toast.type, handleDismiss])

  const handleActionClick = () => {
    toast.action?.onClick()
    handleDismiss()
  }

  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 50, scale: 0.9 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      exit={{ opacity: 0, x: 100, scale: 0.9 }}
      transition={{ type: 'spring', stiffness: 400, damping: 30 }}
      onMouseEnter={() => setIsPaused(true)}
      onMouseLeave={() => setIsPaused(false)}
      className={`
        flex flex-col rounded-xl border backdrop-blur-xl overflow-hidden
        shadow-xl shadow-black/5 dark:shadow-black/20
        ${bgColors[toast.type]}
      `}
      role="alert"
    >
      <div className="flex items-start gap-3 p-4">
        {/* Icon */}
        <div className="shrink-0 mt-0.5">{icons[toast.type]}</div>

        {/* Content */}
        <div className="flex-1 min-w-0">
          <p className="text-sm font-medium text-gray-800 dark:text-gray-200">{toast.message}</p>

          {/* Action button */}
          {toast.action && (
            <button
              onClick={handleActionClick}
              className="mt-2 text-xs font-medium text-primary-600 hover:text-primary-700 dark:text-primary-400 dark:hover:text-primary-300 transition-colors"
            >
              {toast.action.label}
            </button>
          )}
        </div>

        {/* Dismiss button */}
        <button
          onClick={handleDismiss}
          className="shrink-0 p-1.5 rounded-lg hover:bg-gray-100/80 dark:hover:bg-gray-700/60 transition-colors"
          aria-label="Dismiss notification"
        >
          <X className="w-4 h-4 text-gray-400" />
        </button>
      </div>

      {/* Progress bar (hidden for loading toasts) */}
      {toast.type !== 'loading' && (
        <div className="h-1 w-full bg-gray-100 dark:bg-gray-700">
          <motion.div
            className={`h-full ${progressColors[toast.type]}`}
            style={{ width: `${progress}%` }}
            transition={{ duration: 0.1 }}
          />
        </div>
      )}
    </motion.div>
  )
}

// Position configuration
const positions = {
  'top-left': 'top-4 left-4',
  'top-center': 'top-4 left-1/2 -translate-x-1/2',
  'top-right': 'top-4 right-4',
  'bottom-left': 'bottom-4 left-4',
  'bottom-center': 'bottom-4 left-1/2 -translate-x-1/2',
  'bottom-right': 'bottom-4 right-4',
}

interface ToastContainerProps {
  position?: keyof typeof positions
  maxToasts?: number
}

export function ToastContainer({ position = 'bottom-right', maxToasts = 5 }: ToastContainerProps) {
  const { toasts } = useStore()

  // Limit toasts and reverse order for stack effect
  const visibleToasts = toasts.slice(-maxToasts).reverse()

  if (visibleToasts.length === 0) return null

  // Safely get position class with fallback
  // eslint-disable-next-line security/detect-object-injection
  const positionClass = positions[position] ?? positions['bottom-right']

  return (
    <div
      className={`
        fixed z-[100] flex flex-col gap-3 w-full max-w-sm pointer-events-none
        p-4 sm:p-0
        ${positionClass}
      `}
      aria-live="polite"
      aria-label="Notifications"
    >
      <AnimatePresence mode="popLayout">
        {visibleToasts.map(toast => (
          <div key={toast.id} className="pointer-events-auto">
            <Toast toast={toast} />
          </div>
        ))}
      </AnimatePresence>
    </div>
  )
}
