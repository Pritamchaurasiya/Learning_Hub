import { useState, useMemo } from 'react'
import { useDocumentTitle } from '../hooks/useDocumentTitle'
import { useNavigate } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import { useQuery } from '@tanstack/react-query'
import AnimatedPage from '../components/AnimatedPage'
import { SEO } from '../components/SEO'
import { Button } from '../components/ui/Button'
import { Card } from '../components/ui/Card'
import { Skeleton } from '../components/ui/Skeleton'
import {
  Search,
  Code2,
  Trophy,
  CheckCircle,
  TrendingUp,
  AlertCircle,
  Flame,
  LayoutDashboard,
  RefreshCw,
  Sparkles,
} from 'lucide-react'
import { ProblemCard } from '../components/ui/ProblemCard'
import { problemService } from '../services/problemService'
import type { Problem } from '../types/dsa'

function PracticeStatCard({
  icon: Icon,
  label,
  value,
  subtext,
  color,
  delay = 0,
}: {
  icon: React.ElementType
  label: string
  value: string | number
  subtext?: string
  color: string
  delay?: number
}) {
  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ delay }}
    >
      <Card className="p-5 border-none shadow-sm bg-white dark:bg-gray-900 h-full flex flex-col justify-center relative overflow-hidden group">
        <div className="absolute inset-0 bg-gradient-to-br from-transparent to-black/5 opacity-0 group-hover:opacity-100 transition-opacity" />
        <div className="flex items-center gap-4 relative z-10">
          <div
            className="w-12 h-12 shrink-0 rounded-2xl flex items-center justify-center shadow-inner"
            style={{ backgroundColor: `${color}10` }}
          >
            <Icon className="w-6 h-6" style={{ color }} />
          </div>
          <div>
            <p className="text-2xl font-black tabular-nums tracking-tighter">{value}</p>
            <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest line-clamp-1">
              {label}
            </p>
            {subtext && (
              <p className="text-[10px] text-gray-500 font-medium mt-0.5 line-clamp-1">{subtext}</p>
            )}
          </div>
        </div>
      </Card>
    </motion.div>
  )
}

function PracticeStatCardSkeleton() {
  return (
    <Card className="p-5 border-none shadow-sm bg-white dark:bg-gray-900 h-full flex flex-col justify-center">
      <div className="flex items-center gap-4">
        <Skeleton className="w-12 h-12 rounded-2xl shrink-0" />
        <div className="space-y-2 w-full">
          <Skeleton className="h-6 w-16" />
          <Skeleton className="h-3 w-24" />
        </div>
      </div>
    </Card>
  )
}

export default function ProblemsPage() {
  useDocumentTitle('DSA Practice')
  const navigate = useNavigate()

  // Filters
  const [searchQuery, setSearchQuery] = useState('')
  const [selectedDifficulty, setSelectedDifficulty] = useState<'ALL' | 'EASY' | 'MEDIUM' | 'HARD'>(
    'ALL'
  )
  const [selectedStatus, setSelectedStatus] = useState<
    'ALL' | 'SOLVED' | 'ATTEMPTED' | 'UNATTEMPTED'
  >('ALL')

  // Fetch DSA Stats
  const {
    data: statsData,
    isLoading: isStatsLoading,
    isError: isStatsError,
  } = useQuery({
    queryKey: ['dsaStats'],
    queryFn: () => problemService.getDsaStats().then(res => res.data),
    staleTime: 5 * 60 * 1000,
  })

  // Fetch Problems (Client-side filtering for smooth UX, but could be server-side)
  const {
    data: problemsData,
    isLoading: isProblemsLoading,
    isError: isProblemsError,
    error: problemsError,
    refetch: refetchProblems,
  } = useQuery({
    queryKey: ['problems'],
    queryFn: () =>
      problemService.getProblems().then(res => {
        // Handle both paginated and unpaginated responses based on backend implementation
        return Array.isArray(res.data) ? res.data : (res.data.results ?? [])
      }),
    staleTime: 5 * 60 * 1000,
  })

  const filteredProblems = useMemo(() => {
    if (!problemsData) return []
    return problemsData.filter((problem: Problem) => {
      if (searchQuery) {
        const query = searchQuery.toLowerCase()
        const matchesSearch =
          problem.title.toLowerCase().includes(query) ||
          problem.tags?.some(tag => tag.name.toLowerCase().includes(query))
        if (!matchesSearch) return false
      }
      if (selectedDifficulty !== 'ALL' && problem.difficulty !== selectedDifficulty) return false
      if (selectedStatus !== 'ALL') {
        const status = problem.user_status ?? 'UNATTEMPTED'
        if (status !== selectedStatus) return false
      }
      return true
    })
  }, [problemsData, searchQuery, selectedDifficulty, selectedStatus])

  const progress = useMemo(() => {
    if (!statsData) return null
    return {
      easy: statsData.total_easy > 0 ? (statsData.easy_solved / statsData.total_easy) * 100 : 0,
      medium:
        statsData.total_medium > 0 ? (statsData.medium_solved / statsData.total_medium) * 100 : 0,
      hard: statsData.total_hard > 0 ? (statsData.hard_solved / statsData.total_hard) * 100 : 0,
    }
  }, [statsData])

  return (
    <AnimatedPage className="space-y-8 pb-12">
      <SEO title="DSA Practice - Engineering Mastery" />

      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div className="flex items-center gap-4">
          <div className="w-14 h-14 shrink-0 rounded-[1.5rem] bg-primary-600 flex items-center justify-center shadow-xl shadow-primary-500/20">
            <Code2 className="w-7 h-7 text-white" />
          </div>
          <div>
            <h1 className="text-3xl font-black tracking-tight leading-none">DSA Practice</h1>
            <p className="text-gray-500 font-medium mt-2">
              Scale your algorithmic thinking with hands-on challenges
            </p>
          </div>
        </div>
        <div className="flex gap-3">
          <Button
            variant="outline"
            onClick={() => navigate('/analytics')}
            leftIcon={<LayoutDashboard className="w-4 h-4" />}
          >
            Analytics
          </Button>
          <Button
            onClick={() => navigate('/contest')}
            className="shadow-lg shadow-primary-500/20"
            leftIcon={<Trophy className="w-4 h-4" />}
          >
            Compete
          </Button>
        </div>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {isStatsLoading || isStatsError ? (
          <>
            <PracticeStatCardSkeleton />
            <PracticeStatCardSkeleton />
            <PracticeStatCardSkeleton />
            <PracticeStatCardSkeleton />
          </>
        ) : statsData ? (
          <>
            <PracticeStatCard
              icon={CheckCircle}
              label="Problems Solved"
              value={statsData.solved_problems}
              subtext={`${statsData.total_problems} Total Challenges`}
              color="#10b981"
              delay={0.1}
            />
            <PracticeStatCard
              icon={TrendingUp}
              label="Accuracy Rate"
              value={`${Math.round(statsData.acceptance_rate)}%`}
              color="#3b82f6"
              delay={0.2}
            />
            <PracticeStatCard
              icon={Flame}
              label="Logic Streak"
              value={`${statsData.current_streak} Days`}
              subtext={`Record: ${statsData.longest_streak}`}
              color="#f59e0b"
              delay={0.3}
            />
            <PracticeStatCard
              icon={Trophy}
              label="Global Rank"
              value={`#${statsData.rank}`}
              color="#8b5cf6"
              delay={0.4}
            />
          </>
        ) : null}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Left Column: List */}
        <div className="lg:col-span-2 space-y-6">
          {/* Filters */}
          <Card className="p-4 border-none shadow-sm bg-white dark:bg-gray-900/50 backdrop-blur-md sticky top-16 z-20">
            <div className="flex flex-col sm:flex-row gap-4">
              <div className="flex-1">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                  <input
                    type="text"
                    placeholder="Filter by title or tags..."
                    value={searchQuery}
                    onChange={e => setSearchQuery(e.target.value)}
                    className="w-full pl-10 pr-4 py-2.5 bg-gray-50 dark:bg-gray-800 border-none rounded-xl text-sm focus:ring-2 focus:ring-primary-500/50 outline-none"
                  />
                </div>
              </div>
              <div className="flex gap-2">
                <select
                  value={selectedDifficulty}
                  // eslint-disable-next-line @typescript-eslint/no-explicit-any
                  onChange={e => setSelectedDifficulty(e.target.value as any)}
                  className="bg-gray-50 dark:bg-gray-800 border-none rounded-xl px-4 py-2.5 text-xs font-bold uppercase tracking-widest text-gray-500 focus:ring-2 focus:ring-primary-500/50 outline-none cursor-pointer"
                >
                  <option value="ALL">Difficulty</option>
                  <option value="EASY">Beginner</option>
                  <option value="MEDIUM">Intermediate</option>
                  <option value="HARD">Expert</option>
                </select>
                <select
                  value={selectedStatus}
                  // eslint-disable-next-line @typescript-eslint/no-explicit-any
                  onChange={e => setSelectedStatus(e.target.value as any)}
                  className="bg-gray-50 dark:bg-gray-800 border-none rounded-xl px-4 py-2.5 text-xs font-bold uppercase tracking-widest text-gray-500 focus:ring-2 focus:ring-primary-500/50 outline-none cursor-pointer"
                >
                  <option value="ALL">Status</option>
                  <option value="SOLVED">Solved</option>
                  <option value="ATTEMPTED">Attempted</option>
                </select>
              </div>
            </div>
          </Card>

          {/* Results Grid */}
          <AnimatePresence mode="wait">
            {isProblemsLoading ? (
              <motion.div
                key="loading"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="grid grid-cols-1 md:grid-cols-2 gap-4"
              >
                {[1, 2, 3, 4, 5, 6].map(i => (
                  <Skeleton key={i} className="h-40 rounded-2xl w-full" />
                ))}
              </motion.div>
            ) : isProblemsError ? (
              <motion.div key="error" initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
                <Card className="p-12 text-center border-none shadow-sm flex flex-col items-center justify-center">
                  <div className="w-16 h-16 rounded-full bg-rose-100 dark:bg-rose-900/30 flex items-center justify-center mb-4">
                    <AlertCircle className="w-8 h-8 text-rose-500" />
                  </div>
                  <h3 className="font-black text-xl mb-2">Neural Link Disrupted</h3>
                  <p className="text-gray-500 text-sm mb-6 max-w-md mx-auto">
                    {problemsError instanceof Error
                      ? problemsError.message
                      : 'Failed to synchronize with problem database.'}
                  </p>
                  <Button
                    onClick={() => refetchProblems()}
                    variant="outline"
                    leftIcon={<RefreshCw className="w-4 h-4" />}
                  >
                    Re-establish Connection
                  </Button>
                </Card>
              </motion.div>
            ) : filteredProblems.length === 0 ? (
              <motion.div key="empty" initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
                <Card className="p-12 text-center border-none shadow-sm flex flex-col items-center justify-center min-h-[300px]">
                  <div className="w-20 h-20 bg-gray-100 dark:bg-gray-800 rounded-full flex items-center justify-center mb-4">
                    <Search className="w-8 h-8 text-gray-400" />
                  </div>
                  <h3 className="font-black text-xl text-gray-800 dark:text-gray-100 mb-2">
                    No Problems Found
                  </h3>
                  <p className="text-gray-500 font-medium text-sm">
                    Try adjusting your filters or search query to find more challenges.
                  </p>
                  {(searchQuery || selectedDifficulty !== 'ALL' || selectedStatus !== 'ALL') && (
                    <Button
                      variant="ghost"
                      className="mt-6"
                      onClick={() => {
                        setSearchQuery('')
                        setSelectedDifficulty('ALL')
                        setSelectedStatus('ALL')
                      }}
                    >
                      Clear All Filters
                    </Button>
                  )}
                </Card>
              </motion.div>
            ) : (
              <motion.div
                key="results"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="grid grid-cols-1 md:grid-cols-2 gap-4"
              >
                {filteredProblems.map((p: Problem, idx: number) => (
                  <ProblemCard key={p.id} problem={p} index={idx} />
                ))}
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* Right Column: Mastery & Goals */}
        <div className="space-y-6">
          {progress ? (
            <Card className="p-6 space-y-6 border-none shadow-xl bg-white dark:bg-gray-900 sticky top-16">
              <h3 className="font-black text-xs uppercase tracking-[0.2em] text-gray-400">
                Mastery Distribution
              </h3>
              <div className="space-y-6">
                {[
                  {
                    label: 'Beginner',
                    val: progress.easy,
                    color: 'bg-emerald-500',
                    solved: statsData?.easy_solved,
                    total: statsData?.total_easy,
                  },
                  {
                    label: 'Intermediate',
                    val: progress.medium,
                    color: 'bg-amber-500',
                    solved: statsData?.medium_solved,
                    total: statsData?.total_medium,
                  },
                  {
                    label: 'Expert',
                    val: progress.hard,
                    color: 'bg-rose-500',
                    solved: statsData?.hard_solved,
                    total: statsData?.total_hard,
                  },
                ].map(s => (
                  <div key={s.label} className="space-y-2">
                    <div className="flex justify-between items-end">
                      <div>
                        <p className="text-xs font-black uppercase tracking-tight">{s.label}</p>
                        <p className="text-[10px] font-bold text-gray-400">
                          {s.solved} of {s.total} Solved
                        </p>
                      </div>
                      <span className="text-xs font-black tabular-nums text-primary-500">
                        {Math.round(s.val)}%
                      </span>
                    </div>
                    <div className="h-1.5 bg-gray-100 dark:bg-gray-800 rounded-full overflow-hidden">
                      <motion.div
                        initial={{ width: 0 }}
                        animate={{ width: `${s.val}%` }}
                        className={`h-full ${s.color}`}
                      />
                    </div>
                  </div>
                ))}
              </div>
            </Card>
          ) : isStatsLoading ? (
            <Skeleton className="h-[300px] w-full rounded-2xl" />
          ) : null}

          <Card className="p-6 bg-gradient-to-br from-gray-900 to-black text-white border-none shadow-2xl overflow-hidden relative group">
            <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:rotate-12 transition-transform duration-500">
              <Trophy className="w-24 h-24" />
            </div>
            <div className="relative z-10 space-y-4">
              <div className="flex items-center gap-2">
                <Sparkles className="w-5 h-5 text-amber-400" />
                <span className="text-[10px] font-black uppercase tracking-widest text-amber-400">
                  Pro Challenge
                </span>
              </div>
              <h3 className="font-black text-xl leading-tight">Weekly System Design Arena</h3>
              <p className="text-sm text-gray-400 leading-relaxed font-medium">
                Compete with top engineers in a real-time system design simulation. Starts in 14
                hours.
              </p>
              <Button className="w-full bg-white hover:bg-gray-100 text-gray-900 border-none font-black transition-colors">
                Register Event
              </Button>
            </div>
          </Card>
        </div>
      </div>
    </AnimatedPage>
  )
}
