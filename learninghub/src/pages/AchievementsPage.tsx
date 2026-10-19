import { useState } from 'react'
import { Link } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { motion, AnimatePresence } from 'framer-motion'
import AnimatedPage from '../components/AnimatedPage'
import { SEO } from '../components/SEO'
import { Skeleton } from '../components/ui/Skeleton'
import { useStore } from '../stores/useStore'
import { fetchApi } from '../utils/api'
import { playRewardChime } from '../utils/soundEffects'
import {
  Award,
  Lock,
  CheckCircle,
  Share2,
  Sparkles,
  AlertCircle,
  RefreshCw,
  Zap,
  Flame,
  Shield,
  Crown,
  ChevronRight,
  Filter,
} from 'lucide-react'
import { LevelProgressionModal } from '../components/gamification/LevelProgressionModal'

interface Achievement {
  id: string
  name: string
  description: string
  icon: string
  xp_reward: number
  category: string
  unlocked?: boolean
  earned_at?: string
  unlockedAt?: string
}

type CategoryFilter = 'ALL' | 'dsa' | 'streak' | 'frontier' | 'other'

export default function AchievementsPage() {
  const [progressionModalOpen, setProgressionModalOpen] = useState(false)
  const [selectedCategory, setSelectedCategory] = useState<CategoryFilter>('ALL')
  const progress = useStore(state => state.progress)
  const addToast = useStore(state => state.addToast)

  const {
    data: mergedAchievements = [],
    isLoading,
    error,
    refetch,
  } = useQuery({
    queryKey: ['achievements'],
    queryFn: async () => {
      const res = await fetchApi('/gamification/achievements')
      const items = (res.data ?? []) as Achievement[]
      return items.map(a => ({
        ...a,
        unlocked: !!a.earned_at || !!a.unlocked,
        unlockedAt: a.earned_at,
      }))
    },
    staleTime: 60 * 1000,
  })

  const unlockedCount = mergedAchievements.filter(a => a.unlocked).length
  const totalCount = mergedAchievements.length
  const progressPercent = totalCount > 0 ? (unlockedCount / totalCount) * 100 : 0

  const handleShare = (achievementName: string) => {
    playRewardChime('quest-complete')
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

  // Filtered achievements
  const filteredAchievements = mergedAchievements.filter(a => {
    if (selectedCategory === 'ALL') return true
    if (selectedCategory === 'dsa') return a.category === 'dsa'
    if (selectedCategory === 'streak') return a.category === 'streak'
    if (selectedCategory === 'frontier') return a.category === 'frontier' || a.category === 'ai'
    return a.category !== 'dsa' && a.category !== 'streak' && a.category !== 'frontier'
  })

  const getRarityBadge = (xp: number) => {
    if (xp >= 200) {
      return {
        label: 'Legendary',
        badgeClass: 'bg-amber-500/10 text-amber-400 border-amber-500/30',
        glowClass: 'shadow-amber-500/20',
      }
    }
    if (xp >= 100) {
      return {
        label: 'Epic',
        badgeClass: 'bg-purple-500/10 text-purple-400 border-purple-500/30',
        glowClass: 'shadow-purple-500/20',
      }
    }
    if (xp >= 50) {
      return {
        label: 'Rare',
        badgeClass: 'bg-blue-500/10 text-blue-400 border-blue-500/30',
        glowClass: 'shadow-blue-500/20',
      }
    }
    return {
      label: 'Standard',
      badgeClass: 'bg-slate-500/10 text-slate-400 border-slate-500/30',
      glowClass: 'shadow-slate-500/10',
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
            <div className="flex gap-4 sm:gap-8">
              {[1, 2, 3].map(i => (
                <div key={`achieve-stat-${i}`} className="text-center">
                  <Skeleton className="h-8 w-16 mx-auto mb-1" />
                  <Skeleton className="h-3 w-10 mx-auto" />
                </div>
              ))}
            </div>
          </div>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={`achieve-card-${i}`} className="card-static p-5">
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
        <SEO
          title="Achievements & Prestige - LearningHub"
          description="View unlocked learning badges, cognitive mastery tiers, and XP milestones."
        />
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
    <AnimatedPage className="space-y-6 max-w-7xl mx-auto pb-12">
      <SEO
        title="Achievements & Prestige - LearningHub"
        description="View unlocked learning badges, cognitive mastery tiers, and XP milestones."
      />
      {/* Top Header Banner */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-purple-500/10 text-purple-400 border border-purple-500/20 flex items-center gap-1">
              <Crown className="w-3.5 h-3.5" /> Prestige & Cognitive Hall
            </span>
            <span className="text-xs text-slate-400 font-mono">Proof of Mastery</span>
          </div>
          <h1 className="text-2xl md:text-3xl font-black mb-1 flex items-center gap-3 tracking-tight text-slate-900 dark:text-white">
            <div className="w-9 h-9 rounded-xl bg-purple-500/10 border border-purple-500/20 flex items-center justify-center shadow-inner">
              <Award className="w-5 h-5 text-purple-500" />
            </div>
            Achievements
          </h1>
          <p className="text-sm text-gray-500 dark:text-gray-400">
            {unlockedCount} of {totalCount} achievements unlocked
          </p>
        </div>

        {/* Scholar Pro 2x Multiplier Pill */}
        <Link
          to="/pricing"
          className="group flex items-center gap-3 px-4 py-2.5 rounded-2xl bg-gradient-to-r from-amber-500/10 via-purple-500/10 to-blue-500/10 border border-amber-500/30 hover:border-amber-400/60 transition-all shadow-lg hover:shadow-amber-500/10"
        >
          <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-amber-400 to-orange-500 flex items-center justify-center text-slate-950 font-black shadow-md group-hover:scale-105 transition-transform">
            <Zap className="w-4 h-4 fill-current" />
          </div>
          <div>
            <div className="flex items-center gap-1.5 text-xs font-extrabold text-amber-400">
              <span>Scholar Pro 2x Multiplier</span>
              <ChevronRight className="w-3.5 h-3.5 group-hover:translate-x-0.5 transition-transform" />
            </div>
            <div className="text-[11px] text-slate-400">Upgrade to double all milestone XP</div>
          </div>
        </Link>
      </div>

      {/* Progress & Stats Bento Card */}
      <div className="card-static p-6 bg-slate-900/60 backdrop-blur-xl border border-slate-800 rounded-3xl shadow-xl relative overflow-hidden">
        <div className="absolute -right-16 -top-16 w-48 h-48 bg-purple-500/10 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute -left-16 -bottom-16 w-48 h-48 bg-blue-500/10 rounded-full blur-3xl pointer-events-none" />

        <div className="flex flex-col md:flex-row md:items-center gap-6 relative z-10">
          <div className="flex-1">
            <div className="flex justify-between items-center text-xs mb-2">
              <span className="font-bold text-gray-700 dark:text-gray-300 flex items-center gap-1.5">
                <Sparkles className="w-3.5 h-3.5 text-purple-400" />
                Overall Progress
              </span>
              <span className="text-purple-400 font-extrabold tabular-nums text-sm">
                {Math.round(progressPercent)}%
              </span>
            </div>
            <div
              className="h-3 bg-gray-100 dark:bg-slate-800/80 rounded-full overflow-hidden p-0.5 border border-slate-700/50"
              role="progressbar"
              aria-valuenow={Math.round(progressPercent)}
              aria-valuemin={0}
              aria-valuemax={100}
              aria-label="Achievements progress"
            >
              <div
                className="h-full rounded-full bg-gradient-to-r from-purple-500 via-pink-500 to-amber-400 transition-all duration-700 ease-out relative overflow-hidden shadow-md shadow-purple-500/30"
                style={{ width: `${progressPercent}%` }}
              >
                {progressPercent > 0 && <div className="absolute inset-0 shimmer opacity-60" />}
              </div>
            </div>
            <div className="flex items-center justify-between text-[11px] text-slate-400 mt-2 font-medium">
              <span>{unlockedCount} Completed</span>
              <span>{totalCount - unlockedCount} Remaining to decrypt</span>
            </div>
          </div>

          <div className="flex gap-6 sm:gap-8 text-center divide-x divide-slate-800/80 pl-2">
            <button
              onClick={() => setProgressionModalOpen(true)}
              className="text-center group p-1.5 -m-1.5 rounded-2xl hover:bg-amber-500/10 transition-all"
              title="Click to view Cognitive Level & Progression Matrix"
            >
              <p className="text-2xl sm:text-3xl font-black text-amber-400 tabular-nums group-hover:scale-105 transition-transform flex items-center justify-center gap-1">
                {progress.xp}
              </p>
              <p className="text-[11px] text-slate-400 font-bold uppercase tracking-wider">XP</p>
            </button>

            <button
              onClick={() => setProgressionModalOpen(true)}
              className="text-center group p-1.5 -m-1.5 pl-6 sm:pl-8 rounded-2xl hover:bg-purple-500/10 transition-all"
              title="Click to view Cognitive Level & Progression Matrix"
            >
              <p className="text-2xl sm:text-3xl font-black text-purple-400 tabular-nums group-hover:scale-105 transition-transform flex items-center justify-center gap-1">
                {progress.level}
              </p>
              <p className="text-[11px] text-slate-400 font-bold uppercase tracking-wider">Level</p>
            </button>

            <div className="pl-6 sm:pl-8">
              <p className="text-2xl sm:text-3xl font-black text-orange-400 tabular-nums flex items-center justify-center gap-1">
                <Flame className="w-5 h-5 text-orange-500 fill-orange-500" />
                {progress.streak}
              </p>
              <p className="text-[11px] text-slate-400 font-bold uppercase tracking-wider">
                Streak
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Filter Tabs */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-slate-900/60 p-3 rounded-2xl border border-slate-800">
        <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar">
          <div className="p-1.5 text-slate-500">
            <Filter className="w-4 h-4" />
          </div>
          {(
            [
              { key: 'ALL', label: 'All Quests' },
              { key: 'dsa', label: 'Algorithms & DSA' },
              { key: 'streak', label: 'Consistency & Streaks' },
              { key: 'frontier', label: 'Frontier AI & Systems' },
            ] as const
          ).map(tab => (
            <button
              key={tab.key}
              type="button"
              onClick={() => setSelectedCategory(tab.key)}
              className={`px-3 py-1.5 rounded-xl text-xs font-semibold whitespace-nowrap transition-all ${
                selectedCategory === tab.key
                  ? 'bg-purple-600 text-white shadow-md shadow-purple-600/25'
                  : 'bg-slate-950 text-slate-400 hover:text-white border border-slate-800'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        <div className="flex items-center gap-2 text-xs text-slate-400 pl-2">
          <Shield className="w-3.5 h-3.5 text-emerald-400" />
          <span>
            Streak Loss Shield: <strong>Armed</strong>
          </span>
        </div>
      </div>

      {/* Main Achievements Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <AnimatePresence>
          {filteredAchievements.map(achievement => {
            const rarity = getRarityBadge(achievement.xp_reward)
            return (
              <motion.div
                key={achievement.id}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.95 }}
                className={`card-static p-5 rounded-2xl transition-all duration-300 relative overflow-hidden border ${
                  achievement.unlocked
                    ? 'border-purple-500/30 dark:border-purple-500/25 bg-gradient-to-br from-purple-50/60 to-pink-50/60 dark:from-purple-950/20 dark:to-slate-900/80 shadow-md hover:shadow-xl hover:shadow-purple-500/10'
                    : 'border-slate-800 bg-slate-900/40 opacity-70 hover:opacity-95'
                }`}
              >
                <div className="flex items-start gap-4">
                  {/* Icon Frame */}
                  <div
                    className={`w-14 h-14 rounded-2xl flex items-center justify-center text-2xl shrink-0 transition-all duration-300 shadow-md ${
                      achievement.unlocked
                        ? 'bg-gradient-to-br from-purple-500/20 to-pink-500/20 border border-purple-500/30 text-white'
                        : 'bg-slate-800/80 border border-slate-700/50 text-slate-500'
                    }`}
                  >
                    {achievement.unlocked ? (
                      achievement.icon
                    ) : (
                      <Lock className="w-6 h-6 text-slate-400" />
                    )}
                  </div>

                  {/* Body Content */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between gap-2 mb-1">
                      <div className="flex items-center gap-2 min-w-0">
                        <h3 className="font-bold text-sm truncate text-slate-900 dark:text-white">
                          {achievement.name}
                        </h3>
                        {achievement.unlocked && (
                          <CheckCircle className="w-4 h-4 text-emerald-400 shrink-0" />
                        )}
                        <span
                          className={`px-2 py-0.5 rounded-full text-[10px] font-bold border ${rarity.badgeClass}`}
                        >
                          {rarity.label}
                        </span>
                      </div>

                      {achievement.unlocked && (
                        <button
                          onClick={() => handleShare(achievement.name)}
                          className="p-1.5 rounded-xl hover:bg-purple-500/10 text-slate-400 hover:text-purple-400 transition-colors shrink-0 border border-transparent hover:border-purple-500/20"
                          title="Share achievement"
                        >
                          <Share2 className="w-4 h-4" />
                        </button>
                      )}
                    </div>

                    <p className="text-xs text-gray-500 dark:text-gray-400 leading-relaxed">
                      {achievement.description}
                    </p>

                    <div className="flex items-center justify-between mt-3 pt-2 border-t border-slate-800/50 text-[11px]">
                      <div className="flex items-center gap-1.5 font-bold text-amber-400">
                        <Sparkles className="w-3 h-3" />
                        <span>+{achievement.xp_reward} XP Reward</span>
                      </div>

                      {achievement.unlocked && achievement.unlockedAt && (
                        <span className="text-slate-400 flex items-center gap-1">
                          <CheckCircle className="w-3 h-3 text-emerald-400" />
                          Unlocked {new Date(achievement.unlockedAt).toLocaleDateString()}
                        </span>
                      )}

                      {!achievement.unlocked && (
                        <span className="text-slate-500 font-mono text-[10px] uppercase">
                          Progress Encrypted
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              </motion.div>
            )
          })}
        </AnimatePresence>

        {/* Classified Mystery Achievement Card (Psychological Curiosity Hook) */}
        <div className="p-5 rounded-2xl border border-dashed border-purple-500/30 bg-purple-950/10 backdrop-blur-sm relative overflow-hidden flex items-start gap-4">
          <div className="w-14 h-14 rounded-2xl bg-purple-500/10 border border-purple-500/20 flex items-center justify-center text-purple-400 shrink-0 animate-pulse">
            <Lock className="w-6 h-6" />
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-1">
              <h3 className="font-bold text-sm text-purple-300">
                Classified Neural Singularity Quest
              </h3>
              <span className="px-2 py-0.5 rounded-full text-[10px] font-extrabold bg-pink-500/10 text-pink-400 border border-pink-500/30">
                Mythic ???
              </span>
            </div>
            <p className="text-xs text-slate-400 leading-relaxed">
              Maintain an unbroken 14-day study streak to decrypt this secret milestone and claim
              +500 XP bonus loot.
            </p>
            <div className="mt-3 flex items-center justify-between text-[11px] font-mono text-purple-400">
              <span>Decryption: {progress.streak} / 14 Days</span>
              <span className="font-bold text-pink-400">+500 Bonus XP</span>
            </div>
          </div>
        </div>
      </div>

      <LevelProgressionModal
        isOpen={progressionModalOpen}
        onClose={() => setProgressionModalOpen(false)}
        currentXp={progress.xp}
        streak={progress.streak}
      />
    </AnimatedPage>
  )
}
