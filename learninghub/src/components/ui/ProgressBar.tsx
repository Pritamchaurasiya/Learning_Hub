import { memo } from 'react'
import { cn } from '../../utils/cn'

interface ProgressBarProps {
  progress: number
  className?: string
  label?: string
}

export const ProgressBar = memo(({ progress, className, label }: ProgressBarProps) => {
  const clampedProgress = Math.max(0, Math.min(100, progress))
  return (
    <div
      className={cn('w-full bg-gray-200 rounded-full overflow-hidden', className)}
      role="progressbar"
      aria-valuenow={Math.round(clampedProgress)}
      aria-valuemin={0}
      aria-valuemax={100}
      aria-label={label || `Progress ${Math.round(clampedProgress)}%`}
      aria-live="polite"
      aria-atomic="true"
    >
      <div
        className="bg-primary-600 h-full rounded-full transition-all duration-300"
        style={{ width: `${clampedProgress}%` }}
      />
    </div>
  )
})
