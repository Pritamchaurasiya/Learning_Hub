import { useState, useMemo, useEffect } from 'react'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { motion, AnimatePresence } from 'framer-motion'
import {
  Trophy,
  Medal,
  Award,
  Zap,
  Clock,
  RefreshCw,
  Search,
  Radio,
  CheckCircle2,
  ArrowUpRight,
  Shield,
  Sparkles,
} from 'lucide-react'
import { Card } from '../ui/Card'
import { Button } from '../ui/Button'
import { Skeleton } from '../ui/Skeleton'
import { useStore } from '../../stores/useStore'
import { useWebSocket } from '../../hooks/useWebSocket'
import {
  contestService,
  type Contest,
  type ContestLeaderboardEntry,
} from '../../services/contestService'

interface ContestLeaderboardProps {
  selectedContest: Contest | null
  allContests: Contest[]
  onSelectContest: (contestId: string) => void
  onNavigateToCombat?: (contestId: string) => void
}

export default function ContestLeaderboard({
  selectedContest,
  allContests,
  onSelectContest,
  onNavigateToCombat,
}: ContestLeaderboardProps) {
  const currentUser = useStore(state => state.auth?.user)
  const queryClient = useQueryClient()
  const [searchQuery, setSearchQuery] = useState('')
  const [rankFilter, setRankFilter] = useState<'all' | 'top10' | 'top50'>('all')
  const [isLiveSync, setIsLiveSync] = useState(true)
  const [lastUpdated, setLastUpdated] = useState<string>(() =>
    new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })
  )

  const contestId = selectedContest?.contest_id ?? ''
  const { isConnected, connect, disconnect, on, joinRoom, leaveRoom } = useWebSocket()

  // Connect WebSocket stream for instantaneous leaderboard telemetry
  useEffect(() => {
    if (!isLiveSync || !contestId || selectedContest?.status !== 'active') {
      return
    }

    connect()
    const roomId = `contest-${contestId}`
    joinRoom(roomId)

    const handleLeaderboardUpdate = (
      payload: { leaderboard?: ContestLeaderboardEntry[] } | ContestLeaderboardEntry[]
    ) => {
      const incomingList = Array.isArray(payload) ? payload : payload?.leaderboard
      if (incomingList && incomingList.length > 0) {
        queryClient.setQueryData(['contests', 'leaderboard', contestId], incomingList)
        setLastUpdated(
          new Date().toLocaleTimeString([], {
            hour: '2-digit',
            minute: '2-digit',
            second: '2-digit',
          })
        )
      } else {
        void refetch()
      }
    }

    const unsubLeaderboard = on('contest_leaderboard_update', handleLeaderboardUpdate)
    const unsubRanking = on('ranking_update', () => {
      void refetch()
    })

    return () => {
      leaveRoom(roomId)
      unsubLeaderboard()
      unsubRanking()
      disconnect()
    }
  }, [
    isLiveSync,
    contestId,
    selectedContest?.status,
    connect,
    disconnect,
    joinRoom,
    leaveRoom,
    on,
    queryClient,
  ])

  // Fetch leaderboard data
  const {
    data: leaderboard = [],
    isLoading,
    isFetching,
    error,
    refetch,
  } = useQuery<ContestLeaderboardEntry[]>({
    queryKey: ['contests', 'leaderboard', contestId],
    queryFn: async () => {
      if (!contestId) return []
      const res = await contestService.getLeaderboard(contestId)
      setLastUpdated(
        new Date().toLocaleTimeString([], {
          hour: '2-digit',
          minute: '2-digit',
          second: '2-digit',
        })
      )
      return res.data || []
    },
    enabled: Boolean(contestId),
    refetchInterval:
      isLiveSync && selectedContest?.status === 'active' && !isConnected ? 10000 : false,
    staleTime: 5000,
  })

  // Format finish/penalty time safely
  const formatFinishTime = (time: string | null) => {
    if (!time) return '--:--'
    try {
      if (!isNaN(Number(time))) {
        const secs = Number(time)
        const mins = Math.floor(secs / 60)
        const remSecs = secs % 60
        return `${mins}m ${remSecs.toString().padStart(2, '0')}s`
      }
      const d = new Date(time)
      if (!isNaN(d.getTime())) {
        return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
      }
      return time
    } catch {
      return time
    }
  }

  // Filtered leaderboard entries
  const filteredEntries = useMemo(() => {
    let list = [...leaderboard]

    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase().trim()
      list = list.filter(entry => entry.user.toLowerCase().includes(q))
    }

    if (rankFilter === 'top10') {
      list = list.filter(entry => entry.rank <= 10)
    } else if (rankFilter === 'top50') {
      list = list.filter(entry => entry.rank <= 50)
    }

    return list
  }, [leaderboard, searchQuery, rankFilter])

  // Top 3 entries for podium
  const topThree = useMemo(() => {
    if (leaderboard.length < 3) return []
    const first = leaderboard.find(e => e.rank === 1) || leaderboard[0]
    const second = leaderboard.find(e => e.rank === 2) || leaderboard[1]
    const third = leaderboard.find(e => e.rank === 3) || leaderboard[2]
    return [second, first, third] // 2nd, 1st, 3rd podium order
  }, [leaderboard])

  const handleManualRefresh = () => {
    void refetch()
  }

  return (
    <Card className="p-6 md:p-8 rounded-[2.5rem] border-none shadow-2xl bg-white dark:bg-gray-900 overflow-hidden relative">
      {/* Ambient background glow */}
      <div className="absolute top-0 right-1/4 w-96 h-96 bg-primary-500/5 rounded-full blur-3xl pointer-events-none" />

      {/* Header and Controls */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 pb-6 border-b border-gray-100 dark:border-gray-800">
        <div>
          <div className="flex items-center gap-3 mb-2">
            <div className="p-2.5 bg-amber-50 dark:bg-amber-900/20 text-amber-500 rounded-xl shadow-inner">
              <Trophy className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-xl font-black text-gray-900 dark:text-white flex items-center gap-2">
                Combat Telemetry & Leaderboard
                <Sparkles className="w-4 h-4 text-amber-500" />
              </h2>
              <p className="text-xs font-medium text-gray-500 dark:text-gray-400">
                Real-time multi-agent ranking & algorithmic execution matrix
              </p>
            </div>
          </div>
        </div>

        {/* Live sync badge & controls */}
        <div className="flex flex-wrap items-center gap-3">
          <button
            type="button"
            onClick={() => setIsLiveSync(prev => !prev)}
            aria-label="Toggle Live Sync"
            className={`flex items-center gap-2 px-3 py-1.5 rounded-xl text-xs font-semibold transition-all ${
              isLiveSync
                ? 'bg-emerald-50 dark:bg-emerald-950/40 text-emerald-600 dark:text-emerald-400 ring-1 ring-emerald-500/30'
                : 'bg-gray-100 dark:bg-gray-800 text-gray-500 hover:text-gray-700 dark:hover:text-gray-300'
            }`}
          >
            <Radio
              className={`w-3.5 h-3.5 ${isLiveSync ? 'animate-pulse text-emerald-500' : 'text-gray-400'}`}
            />
            <span>{isLiveSync ? 'Live Stream Active' : 'Live Sync Paused'}</span>
          </button>

          <Button
            variant="outline"
            size="sm"
            onClick={handleManualRefresh}
            disabled={isFetching}
            aria-label="Refresh Leaderboard"
            className="rounded-xl border-gray-200 dark:border-gray-700 text-xs font-semibold px-3 py-1.5"
            leftIcon={
              <RefreshCw
                className={`w-3.5 h-3.5 text-primary-500 ${isFetching ? 'animate-spin' : ''}`}
              />
            }
          >
            {isFetching ? 'Syncing...' : 'Sync Now'}
          </Button>

          <span className="text-xs font-mono text-gray-500 dark:text-gray-400 hidden sm:inline-block">
            Synced: {lastUpdated}
          </span>
        </div>
      </div>

      {/* Contest selector pills if multiple contests exist */}
      {allContests.length > 0 && (
        <div className="py-4 border-b border-gray-100 dark:border-gray-800 flex items-center gap-2 overflow-x-auto no-scrollbar">
          <span className="text-xs font-bold text-gray-500 dark:text-gray-400 shrink-0 mr-1 flex items-center gap-1.5">
            <Shield className="w-3.5 h-3.5" />
            Arena:
          </span>
          {allContests.map(c => {
            const isSelected = c.contest_id === contestId
            return (
              <button
                key={c.contest_id}
                type="button"
                onClick={() => onSelectContest(c.contest_id)}
                className={`px-3.5 py-1.5 rounded-xl text-xs font-semibold shrink-0 transition-all ${
                  isSelected
                    ? 'bg-primary-600 text-white shadow-md shadow-primary-500/20'
                    : 'bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-700'
                }`}
              >
                {c.title}
                {c.status === 'active' && (
                  <span className="ml-1.5 inline-block w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                )}
              </button>
            )
          })}
        </div>
      )}

      {/* Top 3 Podium (Shown when entries >= 3 and no search active) */}
      {!searchQuery && topThree.length === 3 && !isLoading && (
        <div className="pt-8 pb-4">
          <h3 className="text-center text-xs font-bold uppercase tracking-wider text-gray-400 mb-6">
            Sector Vanguard • Top 3 Champions
          </h3>

          <div className="grid grid-cols-3 gap-3 md:gap-6 max-w-2xl mx-auto items-end pt-4">
            {/* Rank 2 (Silver) */}
            {topThree[0] && (
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.1 }}
                className="flex flex-col items-center"
              >
                <div className="w-12 h-12 md:w-16 md:h-16 rounded-2xl bg-gradient-to-br from-slate-200 to-slate-400 dark:from-slate-700 dark:to-slate-800 flex items-center justify-center shadow-lg ring-2 ring-slate-300 dark:ring-slate-600 mb-3 relative">
                  <Medal className="w-6 h-6 md:w-8 md:h-8 text-slate-600 dark:text-slate-200" />
                  <span className="absolute -top-2 -right-2 w-6 h-6 rounded-full bg-slate-500 text-white text-xs font-black flex items-center justify-center shadow">
                    2
                  </span>
                </div>
                <div className="text-center w-full px-2 py-3 bg-slate-50 dark:bg-slate-800/40 rounded-2xl border border-slate-200 dark:border-slate-700/60">
                  <p className="font-bold text-xs md:text-sm text-gray-900 dark:text-white truncate">
                    {topThree[0].user}
                  </p>
                  <p className="text-xs font-bold text-slate-700 dark:text-slate-300 mt-1 flex items-center justify-center gap-1">
                    <Zap className="w-3 h-3 text-amber-500" />
                    {topThree[0].score} pts
                  </p>
                  <span className="text-xs text-gray-500 dark:text-gray-400 mt-0.5 block">
                    {topThree[0].problems_solved} solved
                  </span>
                </div>
              </motion.div>
            )}

            {/* Rank 1 (Gold) */}
            {topThree[1] && (
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                className="flex flex-col items-center -mt-4"
              >
                <div className="w-16 h-16 md:w-20 md:h-20 rounded-2xl bg-gradient-to-br from-amber-300 via-amber-400 to-yellow-500 flex items-center justify-center shadow-xl ring-4 ring-amber-300/40 mb-3 relative shadow-amber-500/20">
                  <Trophy className="w-8 h-8 md:w-10 md:h-10 text-white drop-shadow" />
                  <span className="absolute -top-2.5 -right-2.5 w-7 h-7 rounded-full bg-amber-500 text-white text-xs font-black flex items-center justify-center shadow-lg ring-2 ring-white dark:ring-gray-900">
                    1
                  </span>
                </div>
                <div className="text-center w-full px-2 py-4 bg-gradient-to-b from-amber-500/10 to-transparent dark:from-amber-900/20 rounded-2xl border border-amber-300/60 dark:border-amber-600/40">
                  <p className="font-black text-sm md:text-base text-gray-900 dark:text-white truncate">
                    {topThree[1].user}
                  </p>
                  <p className="text-xs font-black text-amber-600 dark:text-amber-400 mt-1 flex items-center justify-center gap-1">
                    <Zap className="w-3.5 h-3.5 text-amber-500" />
                    {topThree[1].score} pts
                  </p>
                  <span className="text-xs text-amber-600 dark:text-amber-400 mt-0.5 block font-medium">
                    {topThree[1].problems_solved} solved
                  </span>
                </div>
              </motion.div>
            )}

            {/* Rank 3 (Bronze) */}
            {topThree[2] && (
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.2 }}
                className="flex flex-col items-center"
              >
                <div className="w-12 h-12 md:w-16 md:h-16 rounded-2xl bg-gradient-to-br from-amber-600 to-amber-800 flex items-center justify-center shadow-lg ring-2 ring-amber-600/40 mb-3 relative">
                  <Award className="w-6 h-6 md:w-8 md:h-8 text-amber-200" />
                  <span className="absolute -top-2 -right-2 w-6 h-6 rounded-full bg-amber-700 text-white text-xs font-black flex items-center justify-center shadow">
                    3
                  </span>
                </div>
                <div className="text-center w-full px-2 py-3 bg-amber-900/5 dark:bg-amber-900/10 rounded-2xl border border-amber-800/30 dark:border-amber-700/30">
                  <p className="font-bold text-xs md:text-sm text-gray-900 dark:text-white truncate">
                    {topThree[2].user}
                  </p>
                  <p className="text-xs font-bold text-amber-700 dark:text-amber-400 mt-1 flex items-center justify-center gap-1">
                    <Zap className="w-3 h-3 text-amber-500" />
                    {topThree[2].score} pts
                  </p>
                  <span className="text-xs text-gray-500 dark:text-gray-400 mt-0.5 block">
                    {topThree[2].problems_solved} solved
                  </span>
                </div>
              </motion.div>
            )}
          </div>
        </div>
      )}

      {/* Filter and Search Bar */}
      <div className="mt-8 flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-4">
        <div className="relative flex-1 max-w-sm">
          <Search className="w-4 h-4 text-gray-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="Search gladiator..."
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            className="w-full pl-10 pr-4 py-2.5 rounded-xl bg-gray-50 dark:bg-gray-800/70 border border-gray-200 dark:border-gray-700 text-xs font-semibold text-gray-900 dark:text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-primary-500/30 focus:border-primary-500 transition-all"
          />
        </div>

        <div className="flex items-center gap-2">
          {(['all', 'top10', 'top50'] as const).map(f => (
            <button
              key={f}
              type="button"
              onClick={() => setRankFilter(f)}
              className={`px-3 py-1.5 rounded-xl text-xs font-semibold tracking-wide transition-all ${
                rankFilter === f
                  ? 'bg-gray-900 dark:bg-white text-white dark:text-gray-900 shadow-sm'
                  : 'bg-gray-100 dark:bg-gray-800 text-gray-500 hover:text-gray-900 dark:hover:text-white'
              }`}
            >
              {f === 'all' ? 'All Competitors' : f.toUpperCase()}
            </button>
          ))}
        </div>
      </div>

      {/* Main Table / List */}
      <div className="mt-6">
        {isLoading ? (
          <div className="space-y-3">
            {[1, 2, 3, 4, 5].map(i => (
              <Skeleton key={i} className="h-16 rounded-2xl w-full" />
            ))}
          </div>
        ) : error ? (
          <div className="text-center py-12 bg-rose-50 dark:bg-rose-950/20 rounded-2xl border border-rose-200 dark:border-rose-800 p-6">
            <p className="text-xs font-black uppercase tracking-wider text-rose-600 dark:text-rose-400 mb-3">
              Failed to load combat leaderboard telemetry
            </p>
            <Button
              variant="outline"
              size="sm"
              onClick={handleManualRefresh}
              className="rounded-xl border-rose-300 text-rose-600 font-semibold text-xs"
            >
              Retry Sync
            </Button>
          </div>
        ) : filteredEntries.length === 0 ? (
          <div className="text-center py-16 bg-gray-50 dark:bg-gray-800/40 rounded-2xl border border-dashed border-gray-200 dark:border-gray-700">
            <Trophy className="w-12 h-12 mx-auto text-gray-300 dark:text-gray-600 mb-3" />
            <h4 className="font-bold text-sm text-gray-900 dark:text-white mb-1">
              {searchQuery ? 'No gladiators match search' : 'No Combat Records Found'}
            </h4>
            <p className="text-xs text-gray-500 dark:text-gray-400 max-w-sm mx-auto">
              {searchQuery
                ? 'Try a different username search query'
                : 'Be the first contender to submit code and claim the throne!'}
            </p>
            {selectedContest?.status === 'active' && onNavigateToCombat && (
              <Button
                variant="primary"
                size="sm"
                onClick={() => onNavigateToCombat(selectedContest.contest_id)}
                className="mt-4 rounded-xl font-bold text-xs tracking-wide shadow-md shadow-primary-500/20"
                rightIcon={<ArrowUpRight className="w-3.5 h-3.5" />}
              >
                Launch Solution Now
              </Button>
            )}
          </div>
        ) : (
          <div className="space-y-2.5">
            {/* Table Header */}
            <div className="grid grid-cols-12 gap-3 px-4 py-2 text-xs font-bold uppercase tracking-wider text-gray-400">
              <span className="col-span-2 sm:col-span-1">Rank</span>
              <span className="col-span-5 sm:col-span-5">Gladiator</span>
              <span className="col-span-2 sm:col-span-2 text-right">Points</span>
              <span className="col-span-3 sm:col-span-2 text-center">Tasks Solved</span>
              <span className="hidden sm:block sm:col-span-2 text-right">Time</span>
            </div>

            {/* Competitor Rows */}
            <AnimatePresence>
              {filteredEntries.map(entry => {
                const isCurrentUser =
                  currentUser?.username != null &&
                  entry.user.toLowerCase() === currentUser.username.toLowerCase()
                const isTop1 = entry.rank === 1
                const isTop2 = entry.rank === 2
                const isTop3 = entry.rank === 3

                return (
                  <motion.div
                    key={`${entry.rank}-${entry.user}`}
                    initial={{ opacity: 0, y: 6 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -6 }}
                    className={`grid grid-cols-12 gap-3 items-center px-4 py-3.5 rounded-2xl transition-all border ${
                      isCurrentUser
                        ? 'bg-primary-50/60 dark:bg-primary-950/30 border-primary-500/40 ring-1 ring-primary-500/30'
                        : isTop1
                          ? 'bg-amber-50/40 dark:bg-amber-950/20 border-amber-300/40 dark:border-amber-700/30'
                          : 'bg-gray-50/70 dark:bg-gray-800/40 border-transparent hover:border-gray-200 dark:hover:border-gray-700'
                    }`}
                  >
                    {/* Rank */}
                    <div className="col-span-2 sm:col-span-1 flex items-center">
                      {isTop1 ? (
                        <span className="w-7 h-7 rounded-lg bg-amber-500 text-white font-black text-xs flex items-center justify-center shadow-sm">
                          1
                        </span>
                      ) : isTop2 ? (
                        <span className="w-7 h-7 rounded-lg bg-slate-400 text-white font-black text-xs flex items-center justify-center shadow-sm">
                          2
                        </span>
                      ) : isTop3 ? (
                        <span className="w-7 h-7 rounded-lg bg-amber-700 text-white font-black text-xs flex items-center justify-center shadow-sm">
                          3
                        </span>
                      ) : (
                        <span className="w-7 h-7 rounded-lg bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300 font-black text-xs flex items-center justify-center">
                          {entry.rank}
                        </span>
                      )}
                    </div>

                    {/* Competitor / Gladiator */}
                    <div className="col-span-5 sm:col-span-5 flex items-center gap-2.5 min-w-0">
                      <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-primary-500 to-indigo-600 text-white font-black text-xs flex items-center justify-center shrink-0 uppercase shadow-sm">
                        {entry.user.slice(0, 2)}
                      </div>
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-1.5 flex-wrap">
                          <span className="font-black text-xs sm:text-sm text-gray-900 dark:text-white truncate">
                            {entry.user}
                          </span>
                          {isCurrentUser && (
                            <span className="px-1.5 py-0.5 rounded text-xs font-bold uppercase tracking-wider bg-primary-600 text-white">
                              YOU
                            </span>
                          )}
                        </div>
                      </div>
                    </div>

                    {/* Score / Points */}
                    <div className="col-span-2 sm:col-span-2 text-right">
                      <span className="inline-flex items-center gap-1 text-xs sm:text-sm font-black text-amber-600 dark:text-amber-400">
                        <Zap className="w-3.5 h-3.5 fill-amber-500 text-amber-500" />
                        {entry.score}
                      </span>
                    </div>

                    {/* Problems Solved */}
                    <div className="col-span-3 sm:col-span-2 flex items-center justify-center gap-1">
                      <span className="inline-flex items-center gap-1 text-xs font-bold text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/40 px-2 py-1 rounded-lg">
                        <CheckCircle2 className="w-3 h-3" />
                        {entry.problems_solved}{' '}
                        {selectedContest?.problem_count
                          ? `/ ${selectedContest.problem_count}`
                          : ''}
                      </span>
                    </div>

                    {/* Time */}
                    <div className="hidden sm:flex sm:col-span-2 items-center justify-end text-xs font-mono text-gray-500 dark:text-gray-400 gap-1">
                      <Clock className="w-3.5 h-3.5 text-gray-400" />
                      {formatFinishTime(entry.finish_time)}
                    </div>
                  </motion.div>
                )
              })}
            </AnimatePresence>
          </div>
        )}
      </div>

      {/* Footer combat callout if active contest */}
      {selectedContest?.status === 'active' && onNavigateToCombat && (
        <div className="mt-8 pt-6 border-t border-gray-100 dark:border-gray-800 flex flex-col sm:flex-row items-center justify-between gap-4 bg-gray-50/50 dark:bg-gray-800/30 p-4 rounded-2xl">
          <div className="text-center sm:text-left">
            <p className="text-xs font-bold text-gray-900 dark:text-white">
              Arena Operation in Progress: {selectedContest.title}
            </p>
            <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
              Every solved problem shifts your rank instantaneously in the global matrix
            </p>
          </div>
          <Button
            variant="primary"
            onClick={() => onNavigateToCombat(selectedContest.contest_id)}
            className="rounded-xl px-5 py-2.5 font-bold text-xs shadow-lg shadow-primary-500/25 shrink-0"
            rightIcon={<ArrowUpRight className="w-4 h-4" />}
          >
            Enter Combat Arena
          </Button>
        </div>
      )}
    </Card>
  )
}
