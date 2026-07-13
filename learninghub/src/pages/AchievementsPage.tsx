import { useQuery } from '@tanstack/react-query'
import AnimatedPage from '../components/AnimatedPage'
import { Skeleton } from '../components/ui/Skeleton'
import { useStore } from '../stores/useStore'
import { fetchApi } from '../utils/api'
import { Award, Lock, CheckCircle, Share2, Sparkles, AlertCircle, RefreshCw } from 'lucide-react'

interface Achievement {
  id: string
  name: string
  description: string
  icon: string
  xp_reward: number
  category: string
  unlocked?: boolean
  earned_at?: string
}

export default function AchievementsPage() {
  const progress = useStore(state => state.progress)
  const addToast = useStore(state => state.addToast)

  const {
    data: achievements = [],
    isLoading,
    error,
    refetch,
  } = useQuery({
    queryKey: ['achievements'],
    queryFn: async () => {
      const res = await fetchApi('/gamification/achievements')
      return ((res.data ?? []) as Achievement[]).map(a => ({
        ...a,
        unlocked: !!a.earned_at,
        unlockedAt: a.earned_at,
      }))
    },
    staleTime: 60 * 1000,
  })

  const { data: myAchievements = [] } = useQuery({
    queryKey: ['my-achievements'],
    queryFn: async () => {
      const res = await fetchApi('/gamification/achievements')
      const items = (res.data ?? []) as Achievement[]
      return items.map(a => ({ ...a, unlocked: true, unlockedAt: a.earned_at }))
    },
    staleTime: 60 * 1000,
  })

  const mergedAchievements = achievements.map(a => {
    const mine = myAchievements.find(ma => ma.id === a.id)
    return mine ?? { ...a, unlocked: false }
  })

  const unlockedCount = mergedAchievements.filter(a => a.unlocked).length
  const totalCount = mergedAchievements.length
  const progressPercent = totalCount > 0 ? (unlockedCount / totalCount) * 100 : 0

  const handleShare = (achievementName: string) => {
    if (navigator.share) {
      navigator
        .share({
          title: 'Achievement Unlocked!',
          text: `I just unlocked the ${achievementName} achievement on LearningHub!`,
          url: window.location.href,
        })
        .catch(() => {
          addToast({ message: 'Error sharing', type: 'error' })
        })
    } else {
      void navigator.clipboard.writeText(
        `I just unlocked the ${achievementName} achievement on LearningHub!`
      )
      addToast({ message: 'Link copied to clipboard', type: 'success' })
    }
  }

  if (isLoading) {
    return (
      <AnimatedPage className="space-y-6">
        <div>
          <div className="flex items-center gap-3 mb-1">
            <Skeleton className="w-8 h-8 rounded-xl" />
            <Skeleton className="h-8 w-40" />
          </div>
          <Skeleton className="h-4 w-56 mt-2" />
        </div>
        <div className="card-static p-6">
          <div className="flex flex-col md:flex-row md:items-center gap-6">
            <div className="flex-1">
              <Skeleton className="h-3 w-full mb-2" />
              <Skeleton className="h-2.5 w-full rounded-full" />
            </div>
            <div className="flex gap-8">
              {[1, 2, 3].map(i => (
                <div key={i} className="text-center">
                  <Skeleton className="h-8 w-16 mx-auto mb-1" />
                  <Skeleton className="h-3 w-10 mx-auto" />
                </div>
              ))}
            </div>
          </div>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {Array.from({ length: 4 }).map((_, i) => (
            // eslint-disable-next-line react/no-array-index-key
            <div key={i} className="card-static p-5">
              <div className="flex items-start gap-4">
                <Skeleton className="w-14 h-14 rounded-xl shrink-0" />
                <div className="flex-1">
                  <Skeleton className="h-5 w-2/3 mb-2" />
                  <Skeleton className="h-4 w-full mb-1" />
                  <Skeleton className="h-4 w-3/4" />
                </div>
              </div>
            </div>
          ))}
        </div>
      </AnimatedPage>
    )
  }

  if (error) {
    return (
      <AnimatedPage>
        <div className="flex flex-col items-center justify-center min-h-[60vh] text-center">
          <AlertCircle className="w-16 h-16 text-red-400 mb-4" />
          <h2 className="text-xl font-bold mb-2">Failed to load achievements</h2>
          <p className="text-gray-500 dark:text-gray-400 mb-6 max-w-md">
            {(error as Error)?.message || 'An unexpected error occurred'}
          </p>
          <button
            onClick={() => refetch()}
            className="flex items-center gap-2 px-5 py-2.5 bg-primary-600 text-white rounded-xl hover:bg-primary-700 transition-colors font-medium"
          >
            <RefreshCw className="w-4 h-4" />
            Try Again
          </button>
        </div>
      </AnimatedPage>
    )
  }

  if (totalCount === 0) {
    return (
      <AnimatedPage className="space-y-6">
        <div className="text-center py-20 card-static border-dashed border-2 border-gray-200 dark:border-gray-700">
          <div className="w-20 h-20 bg-gray-50 dark:bg-gray-800 rounded-2xl flex items-center justify-center mx-auto mb-6">
            <Award className="w-10 h-10 text-gray-200 dark:text-gray-700" />
          </div>
          <h3 className="text-xl font-semibold mb-2">No achievements yet</h3>
          <p className="text-sm text-gray-500 dark:text-gray-400 mb-8 max-w-sm mx-auto leading-relaxed">
            Start learning and completing courses to unlock achievements. They will appear here as
            you progress.
          </p>
        </div>
      </AnimatedPage>
    )
  }

  return (
    <AnimatedPage className="space-y-6">
      <div>
        <h1 className="text-2xl md:text-3xl font-bold mb-1 flex items-center gap-3">
          <div className="w-8 h-8 rounded-xl bg-purple-50 dark:bg-purple-900/20 flex items-center justify-center">
            <Award className="w-4 h-4 text-purple-500" />
          </div>
          Achievements
        </h1>
        <p className="text-sm text-gray-500 dark:text-gray-400">
          {unlockedCount} of {totalCount} achievements unlocked
        </p>
      </div>

      <div className="card-static p-6">
        <div className="flex flex-col md:flex-row md:items-center gap-6">
          <div className="flex-1">
            <div className="flex justify-between text-xs mb-2">
              <span className="font-semibold text-gray-600 dark:text-gray-300">
                Overall Progress
              </span>
              <span className="text-gray-400 font-medium tabular-nums">
                {Math.round(progressPercent)}%
              </span>
            </div>
            <div
              className="h-2.5 bg-gray-100 dark:bg-gray-800 rounded-full overflow-hidden"
              role="progressbar"
              aria-valuenow={Math.round(progressPercent)}
              aria-valuemin={0}
              aria-valuemax={100}
              aria-label="Achievements progress"
            >
              <div
                className="h-full rounded-full bg-gradient-to-r from-purple-500 to-pink-500 transition-all duration-700 ease-out relative overflow-hidden"
                style={{ width: `${progressPercent}%` }}
              >
                {progressPercent > 0 && <div className="absolute inset-0 shimmer" />}
              </div>
            </div>
          </div>
          <div className="flex gap-8 text-center">
            <div>
              <p className="text-2xl font-bold text-amber-500 tabular-nums">{progress.xp}</p>
              <p className="text-[11px] text-gray-400 font-medium uppercase tracking-wider">XP</p>
            </div>
            <div>
              <p className="text-2xl font-bold text-purple-500 tabular-nums">{progress.level}</p>
              <p className="text-[11px] text-gray-400 font-medium uppercase tracking-wider">
                Level
              </p>
            </div>
            <div>
              <p className="text-2xl font-bold text-orange-500 tabular-nums">{progress.streak}</p>
              <p className="text-[11px] text-gray-400 font-medium uppercase tracking-wider">
                Streak
              </p>
            </div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {mergedAchievements.map(achievement => (
          <div
            key={achievement.id}
            className={`card-static p-5 transition-all duration-300 ${
              achievement.unlocked
                ? 'border-purple-200/60 dark:border-purple-700/40 bg-gradient-to-br from-purple-50/50 to-pink-50/50 dark:from-purple-900/10 dark:to-pink-900/10 hover:shadow-lg hover:shadow-purple-500/10'
                : 'opacity-60 hover:opacity-80'
            }`}
          >
            <div className="flex items-start gap-4">
              <div
                className={`w-14 h-14 rounded-xl flex items-center justify-center text-2xl shrink-0 transition-all duration-300 ${
                  achievement.unlocked
                    ? 'bg-gradient-to-br from-purple-100 to-pink-100 dark:from-purple-900/30 dark:to-pink-900/30 shadow-sm'
                    : 'bg-gray-100 dark:bg-gray-800'
                }`}
              >
                {achievement.unlocked ? (
                  achievement.icon
                ) : (
                  <Lock className="w-6 h-6 text-gray-400" />
                )}
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between gap-2 mb-1">
                  <div className="flex items-center gap-2 min-w-0">
                    <h3 className="font-semibold text-sm truncate">{achievement.name}</h3>
                    {achievement.unlocked && (
                      <CheckCircle className="w-4 h-4 text-emerald-500 shrink-0" />
                    )}
                  </div>
                  {achievement.unlocked && (
                    <button
                      onClick={() => handleShare(achievement.name)}
                      className="p-1.5 rounded-lg hover:bg-gray-100/80 dark:hover:bg-gray-700/60 text-gray-400 hover:text-primary-500 transition-colors shrink-0"
                      title="Share achievement"
                    >
                      <Share2 className="w-4 h-4" />
                    </button>
                  )}
                </div>
                <p className="text-xs text-gray-500 dark:text-gray-400 leading-relaxed">
                  {achievement.description}
                </p>
                {achievement.unlocked && achievement.unlockedAt && (
                  <p className="text-[11px] text-gray-400 mt-2 flex items-center gap-1">
                    <Sparkles className="w-3 h-3" />
                    Unlocked {new Date(achievement.unlockedAt).toLocaleDateString()}
                  </p>
                )}
              </div>
            </div>
          </div>
        ))}
      </div>
    </AnimatedPage>
  )
}
