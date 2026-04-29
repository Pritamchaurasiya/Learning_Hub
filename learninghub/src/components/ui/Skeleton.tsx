interface SkeletonProps {
  className?: string
  ariaLabel?: string
}

export function Skeleton({ className = '', ariaLabel = 'Loading...' }: SkeletonProps) {
  return (
    <div 
      className={`animate-pulse bg-gray-200 dark:bg-gray-700 rounded-md ${className}`}
      role="status"
      aria-label={ariaLabel}
      aria-live="polite"
    />
  )
}

export function CourseCardSkeleton() {
  return (
    <div className="card p-5 space-y-4">
      <div className="flex justify-between">
        <Skeleton className="w-10 h-10 rounded-lg" />
        <Skeleton className="w-6 h-6 rounded-full" />
      </div>
      <Skeleton className="h-6 w-3/4" />
      <div className="space-y-2">
        <Skeleton className="h-4 w-full" />
        <Skeleton className="h-4 w-5/6" />
      </div>
      <div className="flex justify-between items-center pt-2">
        <Skeleton className="h-4 w-16" />
        <Skeleton className="h-5 w-20 rounded-full" />
      </div>
    </div>
  )
}

export function StatCardSkeleton() {
  return (
    <div className="card p-6 flex items-center gap-4">
      <Skeleton className="w-12 h-12 rounded-xl" />
      <div className="space-y-2 flex-1">
        <Skeleton className="h-6 w-12" />
        <Skeleton className="h-4 w-24" />
      </div>
    </div>
  )
}
