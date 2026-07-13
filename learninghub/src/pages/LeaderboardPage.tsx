import { useState, useEffect } from 'react'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { useVirtualizer } from '@tanstack/react-virtual'
import { useRef } from 'react'
import { useWebSocket } from '../hooks/useWebSocket'
import { useStore } from '../stores/useStore'
import {
  Trophy,
  Medal,
  TrendingUp,
  Award,
  Crown,
  Star,
  Flame,
  AlertCircle,
  RefreshCw,
} from 'lucide-react'
import { SEO } from '../components/SEO'
import AnimatedPage from '../components/AnimatedPage'
import { Card } from '../components/ui/Card'
import { Button } from '../components/ui/Button'
import { Skeleton } from '../components/ui/Skeleton'
import { leaderboardService, type LeaderboardEntry } from '../services/leaderboardService'
import { motion, AnimatePresence } from 'framer-motion'

export default function LeaderboardPage() {
  const [timeRange, setTimeRange] = useState<'weekly' | 'all'>('all')
  const auth = useStore(state => state.auth)
  const queryClient = useQueryClient()
  const parentRef = useRef<HTMLDivElement>(null)

  // Use Tanstack Query for Leaderboard
  const {
    data: leaderboardData = [],
    isLoading,
    isFetching,
    error,
    refetch,
  } = useQuery({
    queryKey: ['leaderboard', timeRange],
    queryFn: async () => {
      const res = await leaderboardService.getLeaderboard(timeRange, 50)
      return res.data
    },
    staleTime: 60 * 1000,
    retry: 2,
  })

  const rowVirtualizer = useVirtualizer({
    count: leaderboardData.length > 3 ? leaderboardData.length - 3 : 0,
    getScrollElement: () => parentRef.current,
    estimateSize: () => 96, // Approximate height of each row
    overscan: 5,
  })

  // Connect WebSockets for Real-Time global updates
  const { connect, disconnect, on } = useWebSocket()

  useEffect(() => {
    if (auth.isAuthenticated) {
      connect()
      // Listen for global ranking_update emitted by gamificationController
      const cleanup = on('ranking_update', () => {
        // Soft refresh
        void queryClient.invalidateQueries({ queryKey: ['leaderboard'] })
      })

      return () => {
        cleanup()
        disconnect()
      }
    }
  }, [auth.isAuthenticated, connect, disconnect, on, queryClient])

  const getRankIcon = (rank: number) => {
    if (rank === 1) return <Crown className="w-8 h-8 text-yellow-500 drop-shadow-md" />
    if (rank === 2) return <Medal className="w-8 h-8 text-gray-400 drop-shadow-md" />
    if (rank === 3) return <Medal className="w-8 h-8 text-amber-600 drop-shadow-md" />
    return (
      <span className="w-8 h-8 flex items-center justify-center font-black text-gray-400">
        #{rank}
      </span>
    )
  }

  const getRankColor = (rank: number) => {
    if (rank === 1)
      return 'bg-gradient-to-b from-yellow-50 to-white dark:from-yellow-900/20 dark:to-gray-900 border-yellow-300 dark:border-yellow-700'
    if (rank === 2)
      return 'bg-gradient-to-b from-gray-50 to-white dark:from-gray-800/50 dark:to-gray-900 border-gray-300 dark:border-gray-600'
    if (rank === 3)
      return 'bg-gradient-to-b from-amber-50 to-white dark:from-amber-900/20 dark:to-gray-900 border-amber-300 dark:border-amber-800'
    return 'bg-white dark:bg-gray-900 border-gray-100 dark:border-gray-800'
  }

  const currentUser = leaderboardData.find((entry: LeaderboardEntry) => entry.is_current_user)

  return (
    <AnimatedPage className="space-y-8 pb-12 pt-4">
      <SEO
        title="Leaderboard - Global Rankings"
        description="See how you rank among other elite learners"
      />

      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div className="flex items-center gap-4">
          <div className="w-16 h-16 rounded-[1.5rem] bg-gray-900 dark:bg-gray-800 flex items-center justify-center shadow-xl shadow-gray-200 dark:shadow-none">
            <Trophy className="w-8 h-8 text-yellow-500" />
          </div>
          <div>
            <h1 className="text-4xl font-black tracking-tight leading-none text-gray-900 dark:text-white uppercase">
              Global Ranks
            </h1>
            <p className="text-gray-500 font-bold mt-2 text-sm uppercase tracking-widest">
              Compete with elite minds
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 p-1.5 bg-gray-100 dark:bg-gray-800 rounded-xl">
          {(['weekly', 'all'] as const).map(range => (
            <button
              key={range}
              onClick={() => setTimeRange(range)}
              className={`px-6 py-3 rounded-lg text-[10px] font-black uppercase tracking-widest transition-all ${
                timeRange === range
                  ? 'bg-white dark:bg-gray-700 text-primary-600 shadow-sm'
                  : 'text-gray-500 hover:text-gray-700 dark:hover:text-gray-300'
              }`}
            >
              {range === 'all' ? 'All Time' : 'Weekly'}
            </button>
          ))}
        </div>
      </div>

      {/* Error State */}
      <AnimatePresence>
        {error && (
          <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }}>
            <Card className="p-6 border-2 border-rose-200 dark:border-rose-900 bg-rose-50 dark:bg-rose-900/10 rounded-2xl">
              <div className="flex items-center gap-4">
                <AlertCircle className="w-6 h-6 text-rose-500" />
                <div className="flex-1">
                  <p className="font-bold text-rose-700 dark:text-rose-400 uppercase tracking-widest text-xs">
                    {error.message || 'Failed to sync ranking core'}
                  </p>
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  leftIcon={<RefreshCw className={`w-4 h-4 ${isFetching ? 'animate-spin' : ''}`} />}
                  onClick={() => refetch()}
                  disabled={isFetching}
                  className="rounded-xl font-bold uppercase tracking-widest text-[10px] border-rose-200 text-rose-600 hover:bg-rose-100"
                >
                  Retry Sync
                </Button>
              </div>
            </Card>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Loading State */}
      {isLoading ? (
        <div className="space-y-8">
          {/* Podium Skeleton */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 items-end">
            {[2, 1, 3].map(i => (
              <Card
                key={i}
                className={`p-8 text-center rounded-[2rem] ${i === 1 ? 'md:-mt-8' : ''}`}
              >
                <div className="flex justify-center mb-6">
                  <Skeleton className="w-10 h-10 rounded-full" />
                </div>
                <Skeleton className="w-24 h-24 mx-auto mb-6 rounded-[2rem]" />
                <Skeleton className="h-6 w-32 mx-auto mb-3 rounded-lg" />
                <Skeleton className="h-4 w-20 mx-auto mb-4 rounded-md" />
                <Skeleton className="h-5 w-24 mx-auto rounded-lg" />
              </Card>
            ))}
          </div>
          {/* List Skeleton */}
          <Card className="divide-y divide-gray-100 dark:divide-gray-800/50 rounded-[2rem] p-4">
            {[...Array(5)].map((_, i) => (
              // eslint-disable-next-line react/no-array-index-key
              <div key={i} className="flex items-center gap-6 p-4">
                <Skeleton className="w-8 h-8 rounded-lg" />
                <Skeleton className="w-14 h-14 rounded-2xl" />
                <div className="flex-1 space-y-3">
                  <Skeleton className="h-5 w-48 rounded-lg" />
                  <Skeleton className="h-4 w-32 rounded-md" />
                </div>
                <Skeleton className="h-6 w-24 rounded-lg" />
              </div>
            ))}
          </Card>
        </div>
      ) : (
        <>
          {/* Top 3 Podium */}
          {leaderboardData.length >= 3 ? (
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 items-end">
              {/* Podium rendering order: 2, 1, 3 for visual effect */}
              {[1, 0, 2].map(idx => {
                // eslint-disable-next-line security/detect-object-injection
                const entry = leaderboardData[idx]
                if (!entry) return null
                const rank = idx + 1

                // Mobile order: 1st place top, 2nd, 3rd. Desktop order: 2nd, 1st (center), 3rd.
                const mobileOrder = rank === 1 ? 'order-1' : rank === 2 ? 'order-2' : 'order-3'
                const desktopOrder =
                  rank === 1 ? 'md:order-2' : rank === 2 ? 'md:order-1' : 'md:order-3'

                return (
                  <motion.div
                    key={entry.rank}
                    initial={{ opacity: 0, y: 50 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: idx * 0.1 }}
                    className={`${mobileOrder} ${desktopOrder} ${rank === 1 ? 'md:-mt-8 md:z-10' : ''}`}
                  >
                    <Card
                      className={`p-6 md:p-8 text-center rounded-[2.5rem] ${getRankColor(rank)} border-2 shadow-xl hover:-translate-y-2 transition-transform duration-300 relative overflow-hidden group`}
                    >
                      {rank === 1 && (
                        <div className="absolute inset-0 bg-[url('/img/confetti.svg')] bg-cover opacity-10 mix-blend-overlay pointer-events-none" />
                      )}

                      <div className="flex justify-center mb-6 relative z-10">
                        {getRankIcon(rank)}
                      </div>

                      <div
                        className={`w-28 h-28 mx-auto mb-6 rounded-[2rem] flex items-center justify-center text-white text-4xl font-black shadow-2xl relative z-10 ${
                          rank === 1
                            ? 'bg-gradient-to-br from-yellow-400 to-amber-600'
                            : rank === 2
                              ? 'bg-gradient-to-br from-gray-300 to-gray-500'
                              : 'bg-gradient-to-br from-amber-600 to-amber-800'
                        }`}
                      >
                        {(entry.display_name || entry.username).charAt(0).toUpperCase()}
                      </div>

                      <h3 className="font-black text-gray-900 dark:text-white mb-2 text-xl truncate relative z-10">
                        {entry.display_name || entry.username}
                      </h3>

                      <p className="text-[10px] font-black uppercase tracking-widest text-gray-500 dark:text-gray-400 mb-4 relative z-10">
                        Level {entry.level}
                      </p>

                      <div className="inline-flex items-center justify-center gap-2 bg-white/50 dark:bg-black/20 px-4 py-2 rounded-xl backdrop-blur-sm relative z-10">
                        <Star
                          className={`w-5 h-5 fill-current ${rank === 1 ? 'text-yellow-500' : rank === 2 ? 'text-gray-500' : 'text-amber-500'}`}
                        />
                        <span className="font-black tabular-nums text-lg tracking-tight">
                          {entry.xp.toLocaleString()} XP
                        </span>
                      </div>
                    </Card>
                  </motion.div>
                )
              })}
            </div>
          ) : leaderboardData.length === 0 ? (
            <div className="text-center py-20">
              <Trophy className="w-24 h-24 text-gray-200 dark:text-gray-800 mx-auto mb-6" />
              <h3 className="text-2xl font-black uppercase tracking-tight text-gray-900 dark:text-white mb-3">
                No Rank Data Found
              </h3>
              <p className="text-gray-500 font-bold uppercase tracking-widest text-[10px]">
                Initialize learning protocols to establish neural ranking
              </p>
            </div>
          ) : null}

          {/* Current User Stats Bar */}
          {currentUser && (
            <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }}>
              <Card className="p-6 bg-gradient-to-r from-primary-600 to-indigo-700 border-none shadow-2xl rounded-3xl text-white relative overflow-hidden">
                <div className="absolute right-0 top-0 opacity-10 pointer-events-none">
                  <TrendingUp className="w-48 h-48 -mr-10 -mt-10" />
                </div>
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-6 relative z-10">
                  <div className="flex items-center gap-6">
                    <div className="w-16 h-16 rounded-[1.25rem] bg-white/20 flex items-center justify-center text-white font-black text-2xl shadow-inner backdrop-blur-sm">
                      #{currentUser.rank}
                    </div>
                    <div>
                      <h3 className="font-black text-lg uppercase tracking-tight text-white mb-1">
                        Your Current Ranking
                      </h3>
                      <p className="text-[11px] font-black uppercase tracking-widest text-primary-100 flex gap-3">
                        <span>{currentUser.xp.toLocaleString()} XP</span>
                        <span className="w-1 h-1 rounded-full bg-white/50 self-center" />
                        <span>Level {currentUser.level}</span>
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-6 bg-white/10 px-6 py-4 rounded-2xl backdrop-blur-sm">
                    <div className="flex items-center gap-2 text-orange-300">
                      <Flame className="w-6 h-6 animate-pulse" />
                      <div className="flex flex-col">
                        <span className="font-black text-lg leading-none">
                          {currentUser.streak}
                        </span>
                        <span className="text-[9px] font-black uppercase tracking-widest">
                          Day Streak
                        </span>
                      </div>
                    </div>
                  </div>
                </div>
              </Card>
            </motion.div>
          )}

          {/* Leaderboard List */}
          {leaderboardData.length > 3 && (
            <Card className="p-4 rounded-[2.5rem] border-none shadow-xl bg-white dark:bg-gray-900 overflow-hidden">
              <div ref={parentRef} className="overflow-auto w-full h-[60vh] max-h-[500px]">
                <div
                  style={{
                    height: `${rowVirtualizer.getTotalSize()}px`,
                    width: '100%',
                    position: 'relative',
                  }}
                >
                  <AnimatePresence>
                    {rowVirtualizer.getVirtualItems().map(virtualRow => {
                      const entry = leaderboardData[virtualRow.index + 3]
                      if (!entry) return null

                      return (
                        <motion.div
                          key={entry.rank}
                          initial={{ opacity: 0, x: -20 }}
                          animate={{ opacity: 1, x: 0 }}
                          transition={{ delay: virtualRow.index * 0.01 }}
                          style={{
                            position: 'absolute',
                            top: 0,
                            left: 0,
                            width: '100%',
                            height: `${virtualRow.size}px`,
                            transform: `translateY(${virtualRow.start}px)`,
                          }}
                          className={`flex items-center gap-6 p-5 rounded-[2rem] transition-all duration-300 ${
                            entry.is_current_user
                              ? 'bg-primary-50 dark:bg-primary-900/20 border-2 border-primary-500 shadow-md shadow-primary-500/10 scale-[1.02] z-10'
                              : 'bg-transparent hover:bg-gray-50 dark:hover:bg-gray-800/50'
                          }`}
                        >
                          <div className="w-12 text-center font-black text-xl text-gray-400 dark:text-gray-500">
                            #{entry.rank}
                          </div>

                          <div
                            className={`w-14 h-14 rounded-2xl flex items-center justify-center text-white font-black text-xl shadow-md ${
                              entry.is_current_user
                                ? 'bg-primary-500'
                                : 'bg-gradient-to-br from-gray-700 to-gray-900'
                            }`}
                          >
                            {(entry.display_name || entry.username).charAt(0).toUpperCase()}
                          </div>

                          <div className="flex-1 min-w-0">
                            <h4
                              className={`font-black text-lg truncate ${entry.is_current_user ? 'text-primary-600 dark:text-primary-400' : 'text-gray-900 dark:text-white'}`}
                            >
                              {entry.display_name || entry.username}
                            </h4>
                            <p className="text-[10px] font-black uppercase tracking-widest text-gray-500 flex gap-2 items-center mt-1">
                              <span>Lv.{entry.level}</span>
                              <span className="w-1 h-1 rounded-full bg-gray-300 dark:bg-gray-700" />
                              <span>{entry.courses_completed} Complete</span>
                            </p>
                          </div>

                          <div className="flex flex-col sm:flex-row sm:items-center gap-4 sm:gap-8 mr-4">
                            <div className="flex flex-col items-end">
                              <div className="flex items-center gap-1.5 text-yellow-500">
                                <Star className="w-5 h-5 fill-current" />
                                <span className="font-black text-lg tabular-nums tracking-tighter">
                                  {entry.xp.toLocaleString()}
                                </span>
                              </div>
                              <span className="text-[9px] font-black uppercase tracking-widest text-gray-400">
                                Total XP
                              </span>
                            </div>

                            <div className="hidden sm:flex flex-col items-end">
                              <div className="flex items-center gap-1.5 text-orange-500">
                                <Flame className="w-5 h-5" />
                                <span className="font-black text-lg tabular-nums tracking-tighter">
                                  {entry.streak}
                                </span>
                              </div>
                              <span className="text-[9px] font-black uppercase tracking-widest text-gray-400">
                                Streak
                              </span>
                            </div>
                          </div>
                        </motion.div>
                      )
                    })}
                  </AnimatePresence>
                </div>
              </div>
            </Card>
          )}

          {/* Achievements Ribbon */}
          <Card className="p-8 rounded-[2.5rem] border-none shadow-xl bg-gradient-to-br from-gray-900 to-black text-white relative overflow-hidden">
            <div className="absolute top-0 right-0 p-8 opacity-20 pointer-events-none">
              <Award className="w-32 h-32 text-primary-500" />
            </div>
            <div className="flex items-center justify-between mb-8 relative z-10">
              <h3 className="font-black text-lg uppercase tracking-tight flex items-center gap-3">
                <div className="p-2 bg-white/10 rounded-xl">
                  <Award className="w-6 h-6 text-primary-400" />
                </div>
                Milestone Vault
              </h3>
              <Button
                variant="outline"
                className="rounded-xl border-white/20 hover:bg-white/10 text-[10px] font-black uppercase tracking-widest"
              >
                Access All
              </Button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 relative z-10">
              <div className="flex items-center gap-5 p-5 bg-white/5 rounded-2xl border border-white/10 hover:bg-white/10 transition-colors cursor-pointer group">
                <div className="p-3 bg-yellow-500/20 text-yellow-400 rounded-[1.25rem] group-hover:scale-110 transition-transform">
                  <Trophy className="w-8 h-8" />
                </div>
                <div>
                  <p className="font-black text-sm uppercase tracking-tight">Top 10 Global</p>
                  <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mt-1">
                    Acquired Rank
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-5 p-5 bg-white/5 rounded-2xl border border-white/10 hover:bg-white/10 transition-colors cursor-pointer group">
                <div className="p-3 bg-orange-500/20 text-orange-400 rounded-[1.25rem] group-hover:scale-110 transition-transform">
                  <Flame className="w-8 h-8" />
                </div>
                <div>
                  <p className="font-black text-sm uppercase tracking-tight">Thermal Velocity</p>
                  <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mt-1">
                    10+ Day Streak
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-5 p-5 bg-white/5 rounded-2xl border border-white/10 hover:bg-white/10 transition-colors cursor-pointer group">
                <div className="p-3 bg-emerald-500/20 text-emerald-400 rounded-[1.25rem] group-hover:scale-110 transition-transform">
                  <TrendingUp className="w-8 h-8" />
                </div>
                <div>
                  <p className="font-black text-sm uppercase tracking-tight">Ascension Node</p>
                  <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mt-1">
                    Climbed 5 Ranks
                  </p>
                </div>
              </div>
            </div>
          </Card>
        </>
      )}
    </AnimatedPage>
  )
}
