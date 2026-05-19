import { type ReactNode } from 'react'
import { cn } from '../../utils/cn'
import { extractInitials } from '../../utils/string'

type AvatarSize = 'xs' | 'sm' | 'md' | 'lg' | 'xl'

const sizeClasses: Record<AvatarSize, string> = {
  xs: 'w-6 h-6 text-xs',
  sm: 'w-8 h-8 text-sm',
  md: 'w-10 h-10 text-base',
  lg: 'w-12 h-12 text-lg',
  xl: 'w-16 h-16 text-xl',
}

interface AvatarProps {
  src?: string
  alt?: string
  name?: string
  size?: AvatarSize
  className?: string
}

export function Avatar({ src, alt, name, size = 'md', className }: AvatarProps) {
  const initials = name ? extractInitials(name) : '?'

  if (src) {
    return (
      <img
        src={src}
        alt={alt ?? name}
        // eslint-disable-next-line security/detect-object-injection
        className={cn('rounded-full object-cover', sizeClasses[size], className)}
      />
    )
  }

  return (
    <div
      className={cn(
        'rounded-full bg-gradient-to-br from-primary-500 to-purple-500 flex items-center justify-center text-white font-semibold',
        // eslint-disable-next-line security/detect-object-injection
        sizeClasses[size],
        className
      )}
      role="img"
      aria-label={alt ?? name}
    >
      {initials}
    </div>
  )
}

interface AvatarGroupProps {
  children: ReactNode
  max?: number
  size?: AvatarSize
}

export function AvatarGroup({ children, max = 4, size = 'md' }: AvatarGroupProps) {
  const childArray = Array.isArray(children) ? children : [children]
  const visible = childArray.slice(0, max)
  const remaining = childArray.length - max

  return (
    <div className="flex -space-x-2">
      {visible}
      {remaining > 0 && (
        <div
          className={cn(
            'rounded-full bg-gray-200 dark:bg-gray-700 flex items-center justify-center text-gray-600 dark:text-gray-300 font-medium',
            // eslint-disable-next-line security/detect-object-injection
            sizeClasses[size],
            'ring-2 ring-white dark:ring-gray-800'
          )}
        >
          +{remaining}
        </div>
      )}
    </div>
  )
}
