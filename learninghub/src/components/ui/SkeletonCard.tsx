import React from 'react'

interface SkeletonCardProps {
  className?: string
}

/**
 * SkeletonCard - Loading placeholder for course cards
 * Improves perceived performance with animated pulse
 *
 * Usage:
 * <SkeletonCard /> - Single card skeleton
 */
export const SkeletonCard = React.memo(function SkeletonCard({
  className = '',
}: SkeletonCardProps) {
  return (
    <div
      className={`bg-white dark:bg-gray-800 rounded-xl overflow-hidden shadow-sm ${className}`}
      role="status"
      aria-label="Loading course card"
    >
      {/* Image skeleton */}
      <div className="aspect-video bg-gray-200 dark:bg-gray-700 animate-pulse" />

      {/* Content skeleton */}
      <div className="p-4 space-y-3">
        {/* Title skeleton */}
        <div className="h-5 bg-gray-200 dark:bg-gray-700 rounded animate-pulse w-3/4" />

        {/* Description skeleton */}
        <div className="space-y-2">
          <div className="h-3 bg-gray-200 dark:bg-gray-700 rounded animate-pulse" />
          <div className="h-3 bg-gray-200 dark:bg-gray-700 rounded animate-pulse w-5/6" />
        </div>

        {/* Footer skeleton */}
        <div className="flex items-center justify-between pt-2">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-full bg-gray-200 dark:bg-gray-700 animate-pulse" />
            <div className="h-3 w-20 bg-gray-200 dark:bg-gray-700 rounded animate-pulse" />
          </div>
          <div className="h-4 w-16 bg-gray-200 dark:bg-gray-700 rounded animate-pulse" />
        </div>
      </div>
    </div>
  )
})

export default SkeletonCard
