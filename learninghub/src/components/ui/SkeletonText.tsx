import React from 'react'

interface SkeletonTextProps {
  lines?: number
  className?: string
  lastLineWidth?: string
}

/**
 * SkeletonText - Loading placeholder for text content
 *
 * Usage:
 * <SkeletonText lines={3} /> - 3 lines of skeleton text
 * <SkeletonText lines={2} lastLineWidth="w-2/3" /> - Last line shorter
 */
export const SkeletonText = React.memo(function SkeletonText({
  lines = 3,
  className = '',
  lastLineWidth = 'w-3/4',
}: SkeletonTextProps) {
  return (
    <div className={`space-y-2 ${className}`} role="status" aria-label="Loading text content">
      {Array.from({ length: lines }).map((_, index) => {
        const isLastLine = index === lines - 1
        const widthClass = isLastLine ? lastLineWidth : 'w-full'

        return (
          <div
            // eslint-disable-next-line react/no-array-index-key
            key={index}
            className={`h-4 bg-gray-200 dark:bg-gray-700 rounded animate-pulse ${widthClass}`}
          />
        )
      })}
    </div>
  )
})

export default SkeletonText
