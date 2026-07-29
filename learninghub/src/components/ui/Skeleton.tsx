import { memo, HTMLAttributes } from 'react'

interface SkeletonProps extends HTMLAttributes<HTMLDivElement> {
  className?: string
  variant?: 'text' | 'circular' | 'rectangular'
  width?: string | number
  height?: string | number
  lines?: number
  viewMode?: 'grid' | 'list'
}

export const Skeleton = memo(
  ({ className = '', variant = 'text', width, height, lines = 1, ...props }: SkeletonProps) => {
    const baseClass =
      'animate-pulse bg-gray-200 dark:bg-gray-700/60 rounded-md overflow-hidden relative'

    const getStyle = () => {
      const style: React.CSSProperties = {}
      if (width) style.width = width
      if (height) style.height = height
      return style
    }

    if (variant === 'circular') {
      return (
        <div
          {...props}
          className={`${baseClass} rounded-full ${className}`}
          style={{ width: width || '40px', height: height || '40px', ...getStyle() }}
          aria-hidden="true"
        />
      )
    }

    if (variant === 'rectangular') {
      return (
        <div
          {...props}
          className={`${baseClass} rounded-xl ${className}`}
          style={{ width: width || '100%', height: height || '100px', ...getStyle() }}
          aria-hidden="true"
        />
      )
    }

    if (lines > 1) {
      return (
        <div
          {...props}
          className={`space-y-3 ${className}`}
          style={{ width: width || '100%' }}
          aria-hidden="true"
        >
          {Array.from({ length: lines }).map((_, i) => (
            <div
              key={i}
              className={`${baseClass} rounded h-4 w-full`}
              style={{ width: i === lines - 1 ? '75%' : '100%' }}
            />
          ))}
        </div>
      )
    }

    return (
      <div
        {...props}
        className={`${baseClass} rounded h-4 ${className}`}
        style={getStyle()}
        aria-hidden="true"
      />
    )
  }
)

Skeleton.displayName = 'Skeleton'

export const StatCardSkeleton = memo(({ className = '', ...props }: SkeletonProps) => (
  <div
    {...props}
    className={`p-6 rounded-2xl bg-white dark:bg-gray-800 border border-gray-100 dark:border-gray-700/60 shadow-sm space-y-4 ${className}`}
  >
    <div className="flex items-center justify-between">
      <Skeleton width="40%" height={16} />
      <Skeleton variant="circular" width={40} height={40} />
    </div>
    <Skeleton width="60%" height={32} />
    <Skeleton width="80%" height={14} />
  </div>
))
StatCardSkeleton.displayName = 'StatCardSkeleton'

export const CourseCardSkeleton = memo(({ className = '', ...props }: SkeletonProps) => (
  <div
    {...props}
    className={`rounded-2xl bg-white dark:bg-gray-800 border border-gray-100 dark:border-gray-700/60 overflow-hidden shadow-sm space-y-4 p-4 ${className}`}
  >
    <Skeleton variant="rectangular" height={160} />
    <Skeleton width="75%" height={20} />
    <Skeleton lines={2} />
    <div className="flex items-center justify-between pt-2">
      <Skeleton width="30%" height={16} />
      <Skeleton width="25%" height={28} className="rounded-lg" />
    </div>
  </div>
))
CourseCardSkeleton.displayName = 'CourseCardSkeleton'

export const TableSkeleton = memo(
  ({ rows = 5, className = '', ...props }: SkeletonProps & { rows?: number }) => (
    <div {...props} className={`space-y-3 ${className}`}>
      {Array.from({ length: rows }).map((_, i) => (
        <div
          key={i}
          className="flex items-center gap-4 p-4 rounded-xl bg-gray-50 dark:bg-gray-800/50"
        >
          <Skeleton variant="circular" width={36} height={36} />
          <div className="flex-1 space-y-2">
            <Skeleton width="40%" height={16} />
            <Skeleton width="25%" height={12} />
          </div>
          <Skeleton width={80} height={24} className="rounded-lg" />
        </div>
      ))}
    </div>
  )
)
TableSkeleton.displayName = 'TableSkeleton'

export const FormSkeleton = memo(
  ({ fields = 4, className = '', ...props }: SkeletonProps & { fields?: number }) => (
    <div {...props} className={`space-y-4 ${className}`}>
      {Array.from({ length: fields }).map((_, i) => (
        <div key={i} className="space-y-2">
          <Skeleton width="30%" height={16} />
          <Skeleton variant="rectangular" height={40} className="h-10" />
        </div>
      ))}
      <Skeleton variant="rectangular" height={44} className="h-10 rounded-xl mt-4" />
    </div>
  )
)
FormSkeleton.displayName = 'FormSkeleton'

export const ProfileSkeleton = memo(({ className = '', ...props }: SkeletonProps) => (
  <div
    {...props}
    className={`grid grid-cols-1 md:grid-cols-3 gap-6 p-6 rounded-2xl bg-white dark:bg-gray-800 border border-gray-100 dark:border-gray-700/60 ${className}`}
  >
    <div className="flex items-center gap-4">
      <Skeleton variant="circular" width={64} height={64} className="rounded-full" />
      <div className="space-y-2 flex-1">
        <Skeleton width="60%" height={22} />
        <Skeleton width="80%" height={14} />
      </div>
    </div>
    <div className="md:col-span-2 space-y-4">
      <Skeleton width="100%" height={20} />
      <Skeleton lines={3} />
    </div>
  </div>
))
ProfileSkeleton.displayName = 'ProfileSkeleton'

export const ListSkeleton = memo(
  ({ items = 5, className = '', ...props }: SkeletonProps & { items?: number }) => (
    <div {...props} className={`space-y-3 ${className}`}>
      {Array.from({ length: items }).map((_, i) => (
        <div key={i} className="p-4 rounded-xl bg-gray-50 dark:bg-gray-800/50 space-y-2">
          <Skeleton width="60%" height={16} />
          <Skeleton width="40%" height={12} />
        </div>
      ))}
    </div>
  )
)
ListSkeleton.displayName = 'ListSkeleton'

export const PageSkeleton = memo(({ className = '', ...props }: SkeletonProps) => (
  <div {...props} className={`space-y-8 p-6 max-w-7xl mx-auto ${className}`}>
    <div className="space-y-2">
      <Skeleton width="35%" height={32} />
      <Skeleton width="55%" height={16} />
    </div>
    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
      <StatCardSkeleton />
      <StatCardSkeleton />
      <StatCardSkeleton />
    </div>
    <TableSkeleton rows={4} />
  </div>
))
PageSkeleton.displayName = 'PageSkeleton'

export default Skeleton
