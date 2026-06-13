import { useState, useCallback } from 'react'
import { useQuery } from '@tanstack/react-query'
import { useDocumentTitle } from '../hooks/useDocumentTitle'
import { useNavigate } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import AnimatedPage from '../components/AnimatedPage'
import {
  Trophy,
  Timer,
  Users,
  Play,
  CheckCircle,
  Clock,
  Star,
  Award,
  Medal,
  Target,
  Zap,
  ArrowRight,
  Calendar,
  AlertCircle,
  RefreshCw,
} from 'lucide-react'
import { useStore } from '../stores/useStore'
import { Button } from '../components/ui/Button'
import { Card } from '../components/ui/Card'
import { Skeleton } from '../components/ui/Skeleton'
import { contestService, type Contest } from '../services/contestService'

export default function ContestPage() {
  useDocumentTitle('Contests')
  const navigate = useNavigate()
  const addToast = useStore(state => state.addToast)
  const [activeTab, setActiveTab] = useState<'active' | 'upcoming' | 'results'>('active')

  // Use React Query for contests
  const {
    data: apiContests = [],
    isLoading: isContestsLoading,
    error: contestsError,
    refetch: refetchContests,
  } = useQuery({
    queryKey: ['contests'],
    queryFn: async () => {
      const res = await contestService.getContests()
      return res.data || []
    },
    staleTime: 5 * 60 * 1000,
  })

  // Use React Query for contest results
  const { data: contestResults = [], isLoading: isResultsLoading } = useQuery({
    queryKey: ['contests', 'results', 'global'],
    queryFn: async () => {
      const res = await contestService.getContestResults('global')
      return res.data || []
    },
    staleTime: 5 * 60 * 1000,
  })

  const isLoading = isContestsLoading || isResultsLoading

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60)
    const secs = seconds % 60
    return `${mins}:${secs.toString().padStart(2, '0')}`
  }

  const contests = apiContests.filter((c: Contest) => {
    if (activeTab === 'active') return c.status === 'active' || c.status === 'completed'
    if (activeTab === 'upcoming') return c.status === 'upcoming'
    return false
  })

  const getDifficultyColor = (difficulty?: string) => {
    switch (difficulty?.toLowerCase()) {
      case 'easy':
        return 'text-emerald-600 bg-emerald-50 dark:bg-emerald-900/20 ring-emerald-500/20'
      case 'medium':
        return 'text-amber-600 bg-amber-50 dark:bg-amber-900/20 ring-amber-500/20'
      case 'hard':
        return 'text-orange-600 bg-orange-50 dark:bg-orange-900/20 ring-orange-500/20'
      case 'expert':
        return 'text-rose-600 bg-rose-50 dark:bg-rose-900/20 ring-rose-500/20'
      default:
        return 'text-gray-600 bg-gray-50 ring-gray-500/20'
    }
  }

  const getStatusColor = (status: string) => {
    switch (status.toLowerCase()) {
      case 'active':
        return 'text-emerald-600 bg-emerald-50 dark:bg-emerald-900/20 ring-emerald-500/20'
      case 'upcoming':
        return 'text-blue-600 bg-blue-50 dark:bg-blue-900/20 ring-blue-500/20'
      case 'completed':
        return 'text-gray-600 bg-gray-50 ring-gray-500/20'
      default:
        return 'text-gray-600 bg-gray-50 ring-gray-500/20'
    }
  }

  const formatDuration = (minutes?: number) => {
    if (!minutes) return 'N/A'
    if (minutes >= 60) {
      const hours = Math.floor(minutes / 60)
      const mins = minutes % 60
      return mins > 0 ? `${hours}h ${mins}m` : `${hours}h`
    }
    return `${minutes}m`
  }

  const formatDate = (dateStr: string) => {
    try {
      return new Date(dateStr).toLocaleDateString('en-US', {
        weekday: 'short',
        month: 'short',
        day: 'numeric',
        hour: 'numeric',
        minute: '2-digit',
      })
    } catch {
      return dateStr
    }
  }

  const handleParticipate = useCallback(
    (contest: Contest) => {
      if (contest.status === 'upcoming') {
        addToast({ message: `Contest starts at ${formatDate(contest.start_time)}`, type: 'info' })
      } else if (contest.status === 'active') {
        void contestService.participate(contest.contest_id)
        navigate(`/problems?contest=${contest.contest_id}`)
      } else {
        navigate(`/problems?contest=${contest.contest_id}`)
      }
    },
    [addToast, navigate]
  )

  if (isLoading) {
    return (
      <AnimatedPage className="max-w-5xl mx-auto space-y-8 pb-12 pt-4">
        <Skeleton className="h-10 w-48 mb-6" />
        <div className="flex gap-2">
          <Skeleton className="h-10 w-24" />
          <Skeleton className="h-10 w-24" />
          <Skeleton className="h-10 w-24" />
        </div>
        <div className="grid gap-6 md:grid-cols-2">
          {[1, 2, 3, 4].map(i => (
            <Skeleton key={i} className="h-64 rounded-[2rem]" />
          ))}
        </div>
      </AnimatedPage>
    )
  }

  if (contestsError) {
    return (
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        className="flex flex-col items-center justify-center min-h-[60vh] space-y-8 text-center px-6"
      >
        <div className="w-32 h-32 rounded-[2.5rem] bg-rose-50 dark:bg-rose-900/10 flex items-center justify-center shadow-inner shadow-rose-500/20">
          <AlertCircle className="w-16 h-16 text-rose-500" />
        </div>
        <div className="space-y-3">
          <h2 className="text-3xl font-black text-gray-900 dark:text-white uppercase tracking-tight">
            Arena Offline
          </h2>
          <p className="text-[10px] font-bold text-gray-500 uppercase tracking-widest max-w-md mx-auto">
            Failed to connect to the contest matrix. Our engineers are working to restore the
            connection.
          </p>
        </div>
        <div className="flex gap-4">
          <Button
            variant="outline"
            onClick={() => refetchContests()}
            className="px-8 py-4 rounded-xl border-2 font-black uppercase tracking-widest text-[10px]"
            leftIcon={<RefreshCw className="w-4 h-4" />}
          >
            Re-Sync Arena
          </Button>
          <Button
            variant="primary"
            onClick={() => navigate('/problems')}
            className="px-8 py-4 rounded-xl font-black uppercase tracking-widest text-[10px] shadow-lg shadow-primary-500/30"
            leftIcon={<Zap className="w-4 h-4" />}
          >
            Practice DSA
          </Button>
        </div>
      </motion.div>
    )
  }

  return (
    <AnimatedPage className="max-w-5xl mx-auto space-y-8 pb-12 pt-4">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 bg-gradient-to-br from-gray-900 to-black p-8 rounded-[2.5rem] shadow-2xl relative overflow-hidden text-white">
        <div className="absolute top-0 right-0 p-8 opacity-20 pointer-events-none mix-blend-overlay">
          <Trophy className="w-48 h-48 text-yellow-500" />
        </div>
        <div className="relative z-10 flex items-center gap-6">
          <div className="w-16 h-16 rounded-[1.25rem] bg-white/10 flex items-center justify-center backdrop-blur-sm border border-white/20">
            <Trophy className="w-8 h-8 text-yellow-400" />
          </div>
          <div>
            <h1 className="text-4xl font-black tracking-tight uppercase leading-none">
              Combat Arena
            </h1>
            <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mt-2 flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
              Global server online
            </p>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-2 p-1.5 bg-gray-100 dark:bg-gray-800 rounded-2xl w-max">
        {(['active', 'upcoming', 'results'] as const).map(tab => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            className={`px-6 py-3 font-black uppercase tracking-widest text-[10px] rounded-xl transition-all ${
              activeTab === tab
                ? 'bg-white dark:bg-gray-700 text-primary-600 shadow-sm'
                : 'text-gray-500 hover:text-gray-900 dark:hover:text-white'
            }`}
          >
            {tab === 'results' ? 'My Results' : tab}
          </button>
        ))}
      </div>

      {/* Content */}
      <AnimatePresence mode="wait">
        <motion.div
          key={activeTab}
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -10 }}
          transition={{ duration: 0.2 }}
        >
          {activeTab === 'results' ? (
            <div className="space-y-6">
              <Card className="p-8 rounded-[2.5rem] border-none shadow-xl bg-white dark:bg-gray-900">
                <h2 className="text-[10px] font-black uppercase tracking-[0.2em] text-gray-400 mb-8 flex items-center gap-3">
                  <div className="p-2 bg-gray-100 dark:bg-gray-800 rounded-lg">
                    <Medal className="w-4 h-4 text-primary-500" />
                  </div>
                  Combat History
                </h2>

                <div className="space-y-4">
                  {contestResults.length === 0 ? (
                    <div className="text-center py-16 bg-gray-50 dark:bg-gray-800/50 rounded-[2rem] border border-dashed border-gray-200 dark:border-gray-700">
                      <Medal className="w-16 h-16 mx-auto mb-4 text-gray-300 dark:text-gray-600" />
                      <h3 className="font-black text-xl uppercase tracking-tight text-gray-900 dark:text-white mb-2">
                        No Records Found
                      </h3>
                      <p className="text-[10px] font-bold text-gray-500 uppercase tracking-widest">
                        Engage in contests to establish your legacy
                      </p>
                    </div>
                  ) : (
                    contestResults.map((result: any, i: number) => {
                      const contest = apiContests.find(
                        (c: Contest) => c.contest_id === result.contestId
                      )
                      return (
                        <motion.div
                          initial={{ opacity: 0, x: -20 }}
                          animate={{ opacity: 1, x: 0 }}
                          transition={{ delay: i * 0.05 }}
                          key={result.contestId}
                          className="flex flex-col md:flex-row md:items-center justify-between p-6 bg-gray-50 dark:bg-gray-800/50 rounded-[1.5rem] hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors border border-transparent hover:border-gray-200 dark:hover:border-gray-700 gap-6"
                        >
                          <div className="flex-1 min-w-0">
                            <h3 className="font-black text-lg text-gray-900 dark:text-white truncate">
                              {contest?.title ?? `Operation #${result.contestId}`}
                            </h3>
                            <div className="flex flex-wrap items-center gap-4 mt-3">
                              <span className="flex items-center gap-1.5 text-[10px] font-black uppercase tracking-widest text-primary-600 bg-primary-50 dark:bg-primary-900/30 px-3 py-1.5 rounded-lg">
                                <Award className="w-4 h-4" />
                                Rank #{result.rank}
                              </span>
                              <span className="flex items-center gap-1.5 text-[10px] font-black uppercase tracking-widest text-emerald-600 bg-emerald-50 dark:bg-emerald-900/30 px-3 py-1.5 rounded-lg">
                                <Zap className="w-4 h-4" />
                                {result.score} pts
                              </span>
                              <span className="flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-widest text-gray-500">
                                <CheckCircle className="w-4 h-4" />
                                {result.solved}/{contest?.problem_count ?? '?'} Solved
                              </span>
                              <span className="flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-widest text-gray-500">
                                <Clock className="w-4 h-4" />
                                {formatTime(result.time)}
                              </span>
                            </div>
                          </div>
                          <Button
                            variant="outline"
                            className="shrink-0 rounded-xl font-black uppercase tracking-widest text-[10px] border-2"
                            rightIcon={<ArrowRight className="w-4 h-4" />}
                          >
                            Review Matrix
                          </Button>
                        </motion.div>
                      )
                    })
                  )}
                </div>
              </Card>
            </div>
          ) : (
            <div className="grid gap-6 md:grid-cols-2">
              {contests.map((contest: Contest, i: number) => (
                <motion.div
                  initial={{ opacity: 0, scale: 0.95 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{ delay: i * 0.1 }}
                  key={contest.contest_id}
                >
                  <Card className="p-8 rounded-[2.5rem] border-none shadow-xl bg-white dark:bg-gray-900 h-full flex flex-col group hover:-translate-y-1 transition-transform duration-300">
                    <div className="flex items-start justify-between mb-6">
                      <div
                        className={`px-4 py-1.5 rounded-xl text-[10px] font-black uppercase tracking-widest ring-1 ${getDifficultyColor(contest.difficulty)}`}
                      >
                        {contest.difficulty ?? 'All Levels'}
                      </div>
                      <div
                        className={`px-4 py-1.5 rounded-xl text-[10px] font-black uppercase tracking-widest ring-1 flex items-center gap-2 ${getStatusColor(contest.status)}`}
                      >
                        {contest.status === 'active' && (
                          <span className="w-1.5 h-1.5 rounded-full bg-current animate-pulse" />
                        )}
                        {contest.status}
                      </div>
                    </div>

                    <h3 className="text-2xl font-black text-gray-900 dark:text-white mb-3 tracking-tight group-hover:text-primary-600 transition-colors">
                      {contest.title}
                    </h3>
                    <p className="text-sm text-gray-500 font-medium mb-8 flex-1 leading-relaxed">
                      {contest.description}
                    </p>

                    <div className="grid grid-cols-2 gap-4 text-[10px] font-black uppercase tracking-widest text-gray-500 mb-8 bg-gray-50 dark:bg-gray-800/50 p-4 rounded-[1.5rem]">
                      <div className="flex items-center gap-2">
                        <Timer className="w-4 h-4 text-gray-400" />
                        {formatDuration(contest.duration)}
                      </div>
                      <div className="flex items-center gap-2">
                        <Target className="w-4 h-4 text-gray-400" />
                        {contest.problem_count} Tasks
                      </div>
                      <div className="flex items-center gap-2">
                        <Users className="w-4 h-4 text-gray-400" />
                        {contest.participants} Units
                      </div>
                      {contest.prize && (
                        <div className="flex items-center gap-2 text-amber-500">
                          <Star className="w-4 h-4" />
                          {contest.prize}
                        </div>
                      )}
                    </div>

                    {contest.status === 'upcoming' && contest.start_time && (
                      <div className="flex items-center justify-center gap-3 text-[10px] font-black uppercase tracking-widest text-gray-500 mb-6 bg-blue-50 dark:bg-blue-900/20 py-3 rounded-xl text-blue-600">
                        <Calendar className="w-4 h-4" />
                        T-Minus: {formatDate(contest.start_time)}
                      </div>
                    )}

                    <Button
                      onClick={() => handleParticipate(contest)}
                      className={`w-full py-5 rounded-[1.25rem] font-black uppercase tracking-widest text-[10px] shadow-lg transition-transform hover:scale-[1.02] ${
                        contest.status === 'active'
                          ? 'bg-primary-600 hover:bg-primary-700 shadow-primary-500/30 text-white'
                          : 'bg-gray-100 text-gray-700 hover:bg-gray-200 dark:bg-gray-800 dark:text-gray-200 shadow-none'
                      }`}
                      leftIcon={
                        contest.status === 'active' ? (
                          <Play className="w-4 h-4" />
                        ) : (
                          <Calendar className="w-4 h-4" />
                        )
                      }
                    >
                      {contest.status === 'active'
                        ? 'Initiate Combat'
                        : contest.status === 'upcoming'
                          ? 'Set Reminder'
                          : 'Review Analytics'}
                    </Button>
                  </Card>
                </motion.div>
              ))}
            </div>
          )}

          {activeTab !== 'results' && contests.length === 0 && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="p-12 text-center bg-gray-50 dark:bg-gray-800/30 rounded-[2.5rem] border border-dashed border-gray-200 dark:border-gray-700"
            >
              <div className="w-24 h-24 bg-gray-100 dark:bg-gray-800 rounded-[1.5rem] flex items-center justify-center mx-auto mb-6">
                <Trophy className="w-10 h-10 text-gray-400" />
              </div>
              <h3 className="text-2xl font-black uppercase tracking-tight text-gray-900 dark:text-white mb-2">
                Sector Clear
              </h3>
              <p className="text-[10px] font-bold uppercase tracking-widest text-gray-500 max-w-md mx-auto">
                {activeTab === 'upcoming'
                  ? 'No incoming challenges detected in this sector. Maintain readiness.'
                  : 'No active combat scenarios. Switch to upcoming matrix.'}
              </p>
            </motion.div>
          )}

          <Card className="p-8 rounded-[2.5rem] border-none shadow-xl bg-white dark:bg-gray-900 mt-8">
            <h2 className="text-[10px] font-black uppercase tracking-[0.2em] text-gray-400 mb-6 flex items-center gap-3">
              <div className="p-2 bg-yellow-50 dark:bg-yellow-900/20 rounded-lg">
                <Star className="w-4 h-4 text-yellow-500" />
              </div>
              Global Elite Top 5
            </h2>
            <div className="space-y-3">
              {contests.length > 0 ? (
                <p className="text-[10px] font-bold text-gray-500 uppercase tracking-widest text-center py-8 bg-gray-50 dark:bg-gray-800/50 rounded-2xl">
                  Select an active arena to analyze its leaderboard
                </p>
              ) : (
                <p className="text-[10px] font-bold text-gray-500 uppercase tracking-widest text-center py-8 bg-gray-50 dark:bg-gray-800/50 rounded-2xl">
                  Insufficient data for elite ranking calculation
                </p>
              )}
            </div>
          </Card>
        </motion.div>
      </AnimatePresence>
    </AnimatedPage>
  )
}
