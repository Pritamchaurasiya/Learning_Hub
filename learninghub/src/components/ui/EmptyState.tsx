import { ReactNode } from 'react'
import { LucideIcon } from 'lucide-react'
import { Link } from 'react-router-dom'
import { Button as UIButton } from './Button'

interface EmptyStateProps {
  icon?: LucideIcon
  title: string
  description?: string
  actionLabel?: string
  actionHref?: string
  onAction?: () => void
  secondaryAction?: { label: string; href?: string; onClick?: () => void }
  className?: string
  illustration?: ReactNode
}

export function EmptyState({
  icon: Icon,
  title,
  description,
  actionLabel,
  actionHref,
  onAction,
  secondaryAction,
  className = '',
  illustration,
}: EmptyStateProps) {
  return (
    <div
      className={`flex flex-col items-center justify-center p-8 md:p-12 text-center ${className}`}
      role="status"
    >
      {illustration ?? (
        <div className="w-20 h-20 bg-gray-100 dark:bg-gray-800/60 rounded-2xl flex items-center justify-center mb-6">
          {Icon && <Icon className="w-10 h-10 text-gray-400 dark:text-gray-500" />}
        </div>
      )}

      <h3 className="text-lg md:text-xl font-semibold text-gray-900 dark:text-gray-100 mb-2">
        {title}
      </h3>

      {description && (
        <p className="text-gray-500 dark:text-gray-400 max-w-md mb-6 text-sm md:text-base">
          {description}
        </p>
      )}

      <div className="flex flex-col sm:flex-row items-center gap-3">
        {actionLabel && actionHref && (
          <Link
            to={actionHref}
            className="inline-flex items-center justify-center gap-2 rounded-lg font-medium transition-all duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 dark:focus-visible:ring-offset-gray-900 disabled:pointer-events-none disabled:opacity-50 disabled:cursor-not-allowed active:scale-[0.98] min-h-[44px] min-w-[44px] h-11 px-4 text-sm bg-primary-600 text-white hover:bg-primary-700 focus-visible:ring-primary-500 shadow-lg shadow-primary-500/25 hover:shadow-primary-500/40"
          >
            {actionLabel}
          </Link>
        )}
        {actionLabel && onAction && !actionHref && (
          <UIButton onClick={onAction} variant="primary" size="md">
            {actionLabel}
          </UIButton>
        )}
        {secondaryAction && (
          <Link
            to={secondaryAction.href ?? '#'}
            className="inline-flex items-center justify-center gap-2 rounded-lg font-medium transition-all duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 dark:focus-visible:ring-offset-gray-900 disabled:pointer-events-none disabled:opacity-50 disabled:cursor-not-allowed active:scale-[0.98] min-h-[44px] min-w-[44px] h-11 px-4 text-sm border-2 border-gray-200 dark:border-gray-700 hover:border-primary-500 hover:text-primary-600 dark:hover:border-primary-400 dark:hover:text-primary-400 focus-visible:ring-primary-500"
            onClick={secondaryAction.onClick}
          >
            {secondaryAction.label}
          </Link>
        )}
      </div>
    </div>
  )
}
