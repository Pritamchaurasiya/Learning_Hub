import { AlertCircle, RefreshCw, Home } from 'lucide-react'
import { Button } from './Button'

interface ErrorStateProps {
  title?: string
  message?: string
  error?: Error | null
  onRetry?: () => void
  onGoHome?: () => void
  showRetry?: boolean
  showHome?: boolean
  className?: string
}

export function ErrorState({
  title = 'Something went wrong',
  message = 'We encountered an error while loading this content. Please try again.',
  error,
  onRetry,
  onGoHome,
  showRetry = true,
  showHome = true,
  className = '',
}: ErrorStateProps) {
  return (
    <div className={`flex flex-col items-center justify-center p-6 text-center ${className}`}>
      <div className="w-16 h-16 bg-red-50 dark:bg-red-900/10 rounded-full flex items-center justify-center mb-4">
        <AlertCircle className="w-8 h-8 text-red-500" />
      </div>

      <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-2">{title}</h3>

      <p className="text-gray-600 dark:text-gray-400 max-w-md mb-4">{message}</p>

      {error && import.meta.env.DEV && (
        <div className="bg-gray-50 dark:bg-gray-800 rounded-lg p-3 mb-4 max-w-md overflow-auto">
          <code className="text-xs text-red-500 font-mono">{error.message}</code>
        </div>
      )}

      <div className="flex gap-3">
        {showRetry && onRetry && (
          <Button onClick={onRetry} variant="primary" className="flex items-center gap-2">
            <RefreshCw className="w-4 h-4" />
            Try Again
          </Button>
        )}

        {showHome && onGoHome && (
          <Button onClick={onGoHome} variant="secondary" className="flex items-center gap-2">
            <Home className="w-4 h-4" />
            Go Home
          </Button>
        )}
      </div>
    </div>
  )
}
