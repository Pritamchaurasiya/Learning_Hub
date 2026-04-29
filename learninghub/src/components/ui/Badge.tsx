import { type ReactNode } from 'react'
import { cn } from '../../utils/cn'

type BadgeVariant = 'default' | 'success' | 'warning' | 'danger' | 'info'

const variantClasses: Record<BadgeVariant, string> = {
  default: 'bg-gray-100 text-gray-700 dark:bg-gray-700 dark:text-gray-300',
  success: 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400',
  warning: 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400',
  danger: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400',
  info: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400'
}

interface BadgeProps {
  children: ReactNode
  variant?: BadgeVariant
  size?: 'sm' | 'md'
  className?: string
}

export function Badge({ children, variant = 'default', size = 'sm', className }: BadgeProps) {
  return (
    <span
      className={cn(
        'inline-flex items-center font-medium rounded-full',
        size === 'sm' ? 'px-2 py-0.5 text-xs' : 'px-2.5 py-1 text-sm',
        variantClasses[variant],
        className
      )}
    >
      {children}
    </span>
  )
}

interface StatusBadgeProps {
  status: 'online' | 'offline' | 'away' | 'busy'
  showLabel?: boolean
}

export function StatusBadge({ status, showLabel = false }: StatusBadgeProps) {
  const statusConfig = {
    online: { color: 'bg-green-500', label: 'Online' },
    offline: { color: 'bg-gray-400', label: 'Offline' },
    away: { color: 'bg-amber-500', label: 'Away' },
    busy: { color: 'bg-red-500', label: 'Busy' }
  }

  const { color, label } = statusConfig[status]

  return (
    <div className="flex items-center gap-1.5">
      <span className={cn('w-2 h-2 rounded-full', color)} />
      {showLabel && <span className="text-sm text-gray-600 dark:text-gray-400">{label}</span>}
    </div>
  )
}