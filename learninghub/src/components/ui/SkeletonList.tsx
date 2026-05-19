import React from 'react'
import { SkeletonCard } from './SkeletonCard'

interface SkeletonListProps {
  count?: number
  className?: string
  columns?: 1 | 2 | 3 | 4
}

/**
 * SkeletonList - Grid of skeleton cards for loading state
 *
 * Features:
 * - Configurable column count (responsive)
 * - Configurable card count
 * - Screen reader accessible
 * - Reduces layout shift
 *
 * Usage:
 * <SkeletonList count={6} columns={3} />
 */
export const SkeletonList = React.memo(function SkeletonList({
  count = 6,
  className = '',
  columns = 3,
}: SkeletonListProps) {
  const gridClasses = {
    1: 'grid-cols-1',
    2: 'grid-cols-1 md:grid-cols-2',
    3: 'grid-cols-1 md:grid-cols-2 lg:grid-cols-3',
    4: 'grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4',
  }

  return (
    <div
      // eslint-disable-next-line security/detect-object-injection
      className={`grid ${gridClasses[columns]} gap-6 ${className}`}
      role="status"
      aria-label={`Loading ${count} items`}
      aria-busy="true"
    >
      {Array.from({ length: count }).map((_, index) => (
        // eslint-disable-next-line react/no-array-index-key
        <SkeletonCard key={index} />
      ))}
    </div>
  )
})

export default SkeletonList
