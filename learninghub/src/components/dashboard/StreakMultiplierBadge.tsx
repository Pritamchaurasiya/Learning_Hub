import { Award, Flame } from 'lucide-react'

interface Props {
  streak: number
  longestStreak?: number
}

export function StreakMultiplierBadge({ streak, longestStreak }: Props) {
  const tone =
    streak >= 30
      ? 'from-cyan-600 to-blue-700'
      : streak >= 14
        ? 'from-amber-500 to-orange-600'
        : streak >= 7
          ? 'from-indigo-500 to-violet-600'
          : 'from-slate-500 to-slate-600'

  return (
    <div className="flex flex-wrap items-center gap-2">
      <div
        className={`inline-flex min-h-7 items-center gap-1.5 rounded-full bg-gradient-to-r px-3 py-1 text-xs font-bold text-white shadow-sm ${tone}`}
        aria-label={streak > 0 ? `${streak} day study streak` : 'No current study streak'}
      >
        <Flame className="h-3.5 w-3.5" aria-hidden="true" />
        <span>{streak > 0 ? `${streak}-day streak` : 'Start a streak today'}</span>
      </div>

      {typeof longestStreak === 'number' && longestStreak > 0 && (
        <div className="inline-flex min-h-7 items-center gap-1.5 rounded-full border border-gray-200 bg-white px-2.5 py-1 text-[11px] font-semibold text-gray-600 dark:border-slate-700 dark:bg-slate-900 dark:text-gray-300">
          <Award className="h-3.5 w-3.5 text-amber-500" aria-hidden="true" />
          <span>Best: {longestStreak} days</span>
        </div>
      )}
    </div>
  )
}
