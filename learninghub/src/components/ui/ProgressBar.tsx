import { memo } from 'react'
import { cn } from '../../utils/cn'

interface ProgressBarProps {
  progress: number
  className?: string
}

export const ProgressBar = memo(({ progress, className }: ProgressBarProps) => {
  return (
    <div className={cn('w-full bg-gray-200 rounded-full overflow-hidden', className)}>
      <div
        className="bg-primary-600 h-full rounded-full transition-all duration-300"
        style={{ width: `${Math.max(0, Math.min(100, progress))}%` }}
      />
    </div>
  )
})
