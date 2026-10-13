import { useState, useMemo, useEffect, useCallback } from 'react'
import { useDocumentTitle } from '../hooks/useDocumentTitle'
import { useNavigate, useSearchParams } from 'react-router-dom'
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
  RefreshCw,
  Sparkles,
  X,
  Filter,
  ChevronDown,
  Keyboard,
  Shuffle,
  LayoutGrid,
  List,
  Calendar,
  Star,
  ArrowRight,
  Layers,
} from 'lucide-react'
import { ProblemCard } from '../components/ui/ProblemCard'
import { Pagination } from '../components/ui/Pagination'
import { problemService } from '../services/problemService'
import type { Problem, CuratedTrack } from '../types/dsa'
import { useStore } from '../stores/useStore'
import { cn } from '../utils/cn'

const TOPIC_PILLS = [
  { id: 'ALL', label: 'All Topics' },
  { id: 'Array', label: 'Arrays' },
  { id: 'String', label: 'Strings' },
  { id: 'Hash Table', label: 'Hash Table' },
  { id: 'Dynamic Programming', label: 'Dynamic Programming' },
  { id: 'Tree', label: 'Trees' },
  { id: 'Graph', label: 'Graphs' },
  { id: 'Two Pointers', label: 'Two Pointers' },
  { id: 'Binary Search', label: 'Binary Search' },
  { id: 'Sliding Window', label: 'Sliding Window' },
  { id: 'Stack', label: 'Stacks' },
  { id: 'Sorting', label: 'Sorting' },
  { id: 'Matrix', label: 'Matrices' },
  { id: 'Linked List', label: 'Linked Lists' },
]

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
  useDocumentTitle('DSA Practice | Engineering Mastery')
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  void searchParams.get('contest')
  const addToast = useStore(state => state.addToast)

  // Filters & Views
  const [searchQuery, setSearchQuery] = useState('')
  const [selectedDifficulty, setSelectedDifficulty] = useState<'ALL' | 'EASY' | 'MEDIUM' | 'HARD'>(
    'ALL'
  )
  const [selectedStatus, setSelectedStatus] = useState<
    'ALL' | 'SOLVED' | 'ATTEMPTED' | 'UNATTEMPTED'
  >('ALL')
  const [selectedTopic, setSelectedTopic] = useState('ALL')
  const [selectedTrack, setSelectedTrack] = useState('all')
  const [sortBy, setSortBy] = useState<
    'default' | 'difficulty-asc' | 'difficulty-desc' | 'acceptance' | 'points'
  >('default')
  const [viewMode, setViewMode] = useState<'grid' | 'table'>('grid')
  const [onlyBookmarked, setOnlyBookmarked] = useState(false)
  const [bookmarkedIds, setBookmarkedIds] = useState<string[]>(
    () => problemService.getBookmarks?.() ?? []
  )
  const bookmarkedSet = useMemo(() => new Set(bookmarkedIds), [bookmarkedIds])
  const [currentPage, setCurrentPage] = useState(1)
  const ITEMS_PER_PAGE = 24
  const [isPickingRandom, setIsPickingRandom] = useState(false)
  const [showFilters, setShowFilters] = useState(false)
  const [showKeyboardShortcuts, setShowKeyboardShortcuts] = useState(false)

  // Curated Tracks
  const tracks: CuratedTrack[] = useMemo(() => problemService.getCuratedTracks?.() ?? [], [])

  // Native keyboard shortcuts listener (? toggles shortcuts, Esc closes, R picks random)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      const activeTag = (document.activeElement?.tagName || '').toUpperCase()
      const isInput =
        activeTag === 'INPUT' ||
        activeTag === 'TEXTAREA' ||
        (document.activeElement as HTMLElement)?.isContentEditable
      if (isInput) return

      if (e.key === '?' && !e.ctrlKey && !e.metaKey) {
        e.preventDefault()
        setShowKeyboardShortcuts(prev => !prev)
      } else if (e.key === 'Escape') {
        setShowKeyboardShortcuts(false)
        setShowFilters(false)
      }
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [])

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

  // Fetch Daily Challenge
  const { data: dailyChallengeData } = useQuery({
    queryKey: ['dsaDailyChallenge'],
    queryFn: () =>
      problemService.getDailyChallenge ? problemService.getDailyChallenge() : Promise.resolve(null),
    staleTime: 30 * 60 * 1000,
  })

  // Fetch Problems
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
        return Array.isArray(res.data) ? res.data : (res.data.results ?? [])
      }),
    staleTime: 5 * 60 * 1000,
  })

  // Bookmark sync handler
  const handleToggleBookmark = useCallback((_problemId: string) => {
    setBookmarkedIds(problemService.getBookmarks?.() ?? [])
  }, [])

  // Pick One (Random Problem)
  const handlePickRandom = useCallback(async () => {
    setIsPickingRandom(true)
    addToast({ message: '🎲 Selecting a high-impact challenge for you...', type: 'info' })
    try {
      const slug = problemService.getRandomProblemSlug
        ? await problemService.getRandomProblemSlug(
            undefined,
            selectedDifficulty !== 'ALL' ? selectedDifficulty : undefined,
            selectedTopic !== 'ALL' ? selectedTopic : undefined,
            selectedTrack !== 'all' ? selectedTrack : undefined
          )
        : 'two-sum'
      setTimeout(() => {
        setIsPickingRandom(false)
        navigate(`/problem/${slug}`)
      }, 400)
    } catch {
      setIsPickingRandom(false)
      navigate('/problem/two-sum')
    }
  }, [selectedDifficulty, selectedTopic, selectedTrack, addToast, navigate])

  // Filtered and Sorted Problems
  const filteredProblems = useMemo(() => {
    if (!problemsData) return []
    let list = problemsData.filter((problem: Problem) => {
      // Search query
      if (searchQuery) {
        const query = searchQuery.toLowerCase()
        const matchesTitle = problem.title.toLowerCase().includes(query)
        const matchesTags = (problem.tags || []).some(tag => {
          const tName = typeof tag === 'string' ? tag : tag.name
          return tName.toLowerCase().includes(query)
        })
        if (!matchesTitle && !matchesTags) return false
      }

      // Difficulty
      if (selectedDifficulty !== 'ALL' && problem.difficulty !== selectedDifficulty) return false

      // Status
      if (selectedStatus !== 'ALL') {
        const status = problem.user_status ?? 'UNATTEMPTED'
        if (status !== selectedStatus) return false
      }

      // Topic tag
      if (selectedTopic !== 'ALL') {
        const hasTopic = (problem.tags || []).some(t => {
          const tName = typeof t === 'string' ? t : t.name
          return tName.toLowerCase() === selectedTopic.toLowerCase()
        })
        if (!hasTopic) return false
      }

      // Curated Track
      if (selectedTrack !== 'all') {
        const track = tracks.find(t => t.slug === selectedTrack)
        if (track && !track.problemSlugs.includes(problem.slug)) return false
      }

      // Bookmarked only
      if (onlyBookmarked && !bookmarkedSet.has(problem.id)) {
        return false
      }

      return true
    })

    // Sorting
    if (sortBy === 'difficulty-asc') {
      const diffOrder = { EASY: 1, MEDIUM: 2, HARD: 3 }
      list = [...list].sort(
        (a, b) => (diffOrder[a.difficulty] || 2) - (diffOrder[b.difficulty] || 2)
      )
    } else if (sortBy === 'difficulty-desc') {
      const diffOrder = { EASY: 1, MEDIUM: 2, HARD: 3 }
      list = [...list].sort(
        (a, b) => (diffOrder[b.difficulty] || 2) - (diffOrder[a.difficulty] || 2)
      )
    } else if (sortBy === 'acceptance') {
      list = [...list].sort((a, b) => (b.acceptance_rate ?? 0) - (a.acceptance_rate ?? 0))
    } else if (sortBy === 'points') {
      list = [...list].sort((a, b) => b.points - a.points)
    }

    return list
  }, [
    problemsData,
    searchQuery,
    selectedDifficulty,
    selectedStatus,
    selectedTopic,
    selectedTrack,
    tracks,
    onlyBookmarked,
    bookmarkedSet,
    sortBy,
  ])

  useEffect(() => {
    setCurrentPage(1)
  }, [
    searchQuery,
    selectedDifficulty,
    selectedStatus,
    selectedTopic,
    selectedTrack,
    onlyBookmarked,
    sortBy,
  ])

  const totalPages = Math.ceil(filteredProblems.length / ITEMS_PER_PAGE)
  const paginatedProblems = useMemo(() => {
    const start = (currentPage - 1) * ITEMS_PER_PAGE
    return filteredProblems.slice(start, start + ITEMS_PER_PAGE)
  }, [filteredProblems, currentPage])

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
          <div className="w-14 h-14 shrink-0 rounded-[1.5rem] bg-gradient-to-tr from-primary-600 to-indigo-600 flex items-center justify-center shadow-xl shadow-primary-500/20 text-white">
            <Code2 className="w-7 h-7" />
          </div>
          <div>
            <h1 className="text-3xl font-black tracking-tight leading-none text-gray-900 dark:text-white">
              DSA Practice
            </h1>
            <p className="text-gray-500 dark:text-gray-400 font-medium mt-2">
              Enterprise algorithmic training designed to surpass LeetCode
            </p>
          </div>
        </div>
        <div className="flex flex-wrap items-center gap-3">
          <Button
            variant="outline"
            onClick={handlePickRandom}
            isLoading={isPickingRandom}
            leftIcon={<Shuffle className="w-4 h-4 text-emerald-500" />}
            className="border-emerald-500/30 hover:border-emerald-500 text-emerald-600 dark:text-emerald-400 hover:bg-emerald-500/10 font-bold"
            title="Pick a random challenge based on current filters"
          >
            Pick One
          </Button>
          <Button
            variant="primary"
            onClick={() => navigate('/visualizer')}
            leftIcon={<Sparkles className="w-4 h-4" />}
            className="bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-700 hover:to-purple-700 text-white shadow-lg shadow-indigo-500/25 font-bold"
          >
            Visualizer Studio
          </Button>
          <Button
            variant="outline"
            onClick={() => navigate('/contest')}
            leftIcon={<Trophy className="w-4 h-4 text-amber-500" />}
          >
            Compete
          </Button>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setShowKeyboardShortcuts(true)}
            leftIcon={<Keyboard className="w-4 h-4" />}
            className="hidden sm:inline-flex"
            aria-label="Keyboard shortcuts"
          >
            Shortcuts (?)
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

      {/* Daily Challenge Hero Banner */}
      {dailyChallengeData?.problem && (
        <motion.div
          initial={{ opacity: 0, y: 15 }}
          animate={{ opacity: 1, y: 0 }}
          className="relative overflow-hidden rounded-3xl bg-gradient-to-r from-gray-900 via-indigo-950 to-gray-900 border border-indigo-500/30 p-6 sm:p-7 shadow-2xl text-white group"
        >
          <div className="absolute top-0 right-0 p-8 opacity-10 group-hover:opacity-20 transition-opacity">
            <Flame className="w-36 h-36 text-amber-500" />
          </div>
          <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
            <div className="space-y-2 max-w-2xl">
              <div className="flex items-center gap-2.5">
                <span className="flex items-center gap-1.5 px-3 py-1 rounded-full bg-amber-500/20 text-amber-300 border border-amber-500/30 text-xs font-bold uppercase tracking-wider">
                  <Flame className="w-3.5 h-3.5 fill-current" /> Daily Challenge
                </span>
                <span className="text-xs text-gray-400 font-medium flex items-center gap-1">
                  <Calendar className="w-3.5 h-3.5" /> {dailyChallengeData.dateString}
                </span>
                <span className="text-xs font-bold text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded-full border border-emerald-500/20">
                  +{dailyChallengeData.streakBonusXp} Bonus XP
                </span>
              </div>
              <h2 className="text-2xl sm:text-3xl font-black tracking-tight text-white group-hover:text-amber-300 transition-colors">
                {dailyChallengeData.problem.title}
              </h2>
              <p className="text-xs sm:text-sm text-gray-300 font-medium line-clamp-2 leading-relaxed">
                {dailyChallengeData.problem.description}
              </p>
              <div className="flex flex-wrap items-center gap-2 pt-1">
                <span
                  className={cn(
                    'text-[10px] font-black uppercase tracking-widest px-2.5 py-0.5 rounded-md border',
                    dailyChallengeData.problem.difficulty === 'EASY'
                      ? 'text-emerald-400 bg-emerald-500/10 border-emerald-500/30'
                      : dailyChallengeData.problem.difficulty === 'MEDIUM'
                        ? 'text-amber-400 bg-amber-500/10 border-amber-500/30'
                        : 'text-rose-400 bg-rose-500/10 border-rose-500/30'
                  )}
                >
                  {dailyChallengeData.problem.difficulty}
                </span>
                {(dailyChallengeData.problem.tags || []).slice(0, 3).map((t, idx) => (
                  <span
                    key={idx}
                    className="text-[10px] px-2 py-0.5 rounded-md bg-white/10 text-gray-300"
                  >
                    {typeof t === 'string' ? t : t.name}
                  </span>
                ))}
              </div>
            </div>
            <div className="shrink-0 flex items-center gap-3">
              <Button
                variant="primary"
                onClick={() => navigate(`/problem/${dailyChallengeData.problem.slug}`)}
                className="bg-amber-500 hover:bg-amber-400 text-gray-950 font-black shadow-lg shadow-amber-500/25 px-6 h-12 text-sm gap-2"
              >
                Solve Challenge <ArrowRight className="w-4 h-4" />
              </Button>
            </div>
          </div>
        </motion.div>
      )}

      {/* Curated Study Tracks Selector */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <span className="text-xs font-black uppercase tracking-widest text-gray-400 flex items-center gap-1.5">
            <Layers className="w-3.5 h-3.5 text-primary-500" /> Curated Tracks & Roadmaps
          </span>
          <span className="text-xs text-gray-400 font-medium">
            Showing {filteredProblems.length} challenges
          </span>
        </div>
        <div className="flex flex-wrap gap-2">
          {tracks.map(track => {
            const isActive = selectedTrack === track.slug
            return (
              <button
                key={track.id}
                onClick={() => setSelectedTrack(track.slug)}
                className={cn(
                  'px-3.5 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-2 border',
                  isActive
                    ? 'bg-primary-600 text-white border-primary-500 shadow-md shadow-primary-500/25 scale-[1.02]'
                    : 'bg-white dark:bg-gray-900 text-gray-700 dark:text-gray-300 border-gray-200 dark:border-gray-800 hover:border-primary-500/40'
                )}
              >
                <span className="w-2 h-2 rounded-full" style={{ backgroundColor: track.color }} />
                <span>{track.title}</span>
                <span
                  className={cn(
                    'text-[10px] px-1.5 py-0.2 rounded-md font-mono',
                    isActive
                      ? 'bg-white/20 text-white'
                      : 'bg-gray-100 dark:bg-gray-800 text-gray-400'
                  )}
                >
                  {track.problemSlugs.length}
                </span>
              </button>
            )
          })}
        </div>
      </div>

      {/* Topic Tags Horizontal Pill Bar */}
      <div className="overflow-x-auto pb-1 custom-scrollbar">
        <div className="flex items-center gap-1.5 min-w-max">
          {TOPIC_PILLS.map(topic => {
            const isActive = selectedTopic === topic.id
            return (
              <button
                key={topic.id}
                onClick={() => setSelectedTopic(topic.id)}
                className={cn(
                  'px-3 py-1.5 rounded-lg text-xs font-semibold transition-all',
                  isActive
                    ? 'bg-gray-900 dark:bg-white text-white dark:text-gray-900 font-bold shadow-sm'
                    : 'bg-gray-100 dark:bg-gray-800/80 text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white hover:bg-gray-200 dark:hover:bg-gray-700'
                )}
              >
                {topic.label}
              </button>
            )
          })}
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Left Column: Filter Controls + Problem Results */}
        <div className="lg:col-span-2 space-y-6">
          {/* Filters Bar */}
          <Card className="p-4 border-none shadow-sm bg-white dark:bg-gray-900/50 backdrop-blur-md sticky top-16 z-20 space-y-3">
            <div className="flex flex-col sm:flex-row gap-3">
              <div className="flex-1">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                  <input
                    type="text"
                    placeholder="Filter by title or tags..."
                    value={searchQuery}
                    onChange={e => setSearchQuery(e.target.value)}
                    className="w-full pl-10 pr-4 py-2.5 bg-gray-50 dark:bg-gray-800 border-none rounded-xl text-sm focus:ring-2 focus:ring-primary-500/50 outline-none text-gray-900 dark:text-white"
                  />
                  {searchQuery && (
                    <button
                      onClick={() => setSearchQuery('')}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-200"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  )}
                </div>
              </div>
              <div className="flex flex-wrap items-center gap-2">
                <button
                  type="button"
                  onClick={() => setShowFilters(!showFilters)}
                  className="sm:hidden flex items-center gap-2 px-3 py-2 bg-gray-50 dark:bg-gray-800 border-none rounded-xl text-sm font-medium text-gray-700 dark:text-gray-300"
                  aria-label="Toggle filters"
                >
                  <Filter className="w-4 h-4" />
                  <span>Filters</span>
                  <ChevronDown
                    className={cn('w-4 h-4 transition-transform', showFilters && 'rotate-180')}
                  />
                </button>
                <div
                  className={cn(
                    'flex flex-wrap items-center gap-2',
                    showFilters ? 'flex w-full sm:w-auto' : 'hidden sm:flex'
                  )}
                >
                  <select
                    value={selectedDifficulty}
                    onChange={e => setSelectedDifficulty(e.target.value as any)}
                    className="bg-gray-50 dark:bg-gray-800 border-none rounded-xl px-3 py-2 text-xs font-bold uppercase tracking-wider text-gray-600 dark:text-gray-300 focus:ring-2 focus:ring-primary-500/50 outline-none cursor-pointer"
                  >
                    <option value="ALL">All Levels</option>
                    <option value="EASY">Beginner</option>
                    <option value="MEDIUM">Intermediate</option>
                    <option value="HARD">Expert</option>
                  </select>
                  <select
                    value={selectedStatus}
                    onChange={e => setSelectedStatus(e.target.value as any)}
                    className="bg-gray-50 dark:bg-gray-800 border-none rounded-xl px-3 py-2 text-xs font-bold uppercase tracking-wider text-gray-600 dark:text-gray-300 focus:ring-2 focus:ring-primary-500/50 outline-none cursor-pointer"
                  >
                    <option value="ALL">All Status</option>
                    <option value="SOLVED">Solved</option>
                    <option value="ATTEMPTED">Attempted</option>
                  </select>
                  <select
                    value={sortBy}
                    onChange={e => setSortBy(e.target.value as any)}
                    className="bg-gray-50 dark:bg-gray-800 border-none rounded-xl px-3 py-2 text-xs font-bold uppercase tracking-wider text-gray-600 dark:text-gray-300 focus:ring-2 focus:ring-primary-500/50 outline-none cursor-pointer"
                  >
                    <option value="default">Sort: Default</option>
                    <option value="difficulty-asc">Difficulty: Easy first</option>
                    <option value="difficulty-desc">Difficulty: Hard first</option>
                    <option value="acceptance">Acceptance Rate</option>
                    <option value="points">XP / Points</option>
                  </select>
                  <button
                    onClick={() => setOnlyBookmarked(!onlyBookmarked)}
                    className={cn(
                      'p-2 rounded-xl transition-all border',
                      onlyBookmarked
                        ? 'bg-amber-500/20 text-amber-400 border-amber-500/40 shadow-sm'
                        : 'bg-gray-50 dark:bg-gray-800 text-gray-400 border-transparent hover:text-amber-400'
                    )}
                    title={onlyBookmarked ? 'Show all problems' : 'Show bookmarked only'}
                    aria-label="Filter bookmarked"
                  >
                    <Star className={cn('w-4 h-4', onlyBookmarked && 'fill-current')} />
                  </button>
                  {/* Grid vs Table Toggle */}
                  <div className="flex items-center bg-gray-50 dark:bg-gray-800 p-0.5 rounded-xl border border-gray-200 dark:border-gray-700">
                    <button
                      onClick={() => setViewMode('grid')}
                      className={cn(
                        'p-1.5 rounded-lg transition-colors',
                        viewMode === 'grid'
                          ? 'bg-white dark:bg-gray-700 text-gray-900 dark:text-white shadow-sm'
                          : 'text-gray-400 hover:text-gray-200'
                      )}
                      title="Card Grid View"
                      aria-label="Grid view"
                    >
                      <LayoutGrid className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => setViewMode('table')}
                      className={cn(
                        'p-1.5 rounded-lg transition-colors',
                        viewMode === 'table'
                          ? 'bg-white dark:bg-gray-700 text-gray-900 dark:text-white shadow-sm'
                          : 'text-gray-400 hover:text-gray-200'
                      )}
                      title="Compact Table View"
                      aria-label="Table view"
                    >
                      <List className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </Card>

          {/* Results Display */}
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
                    Try adjusting your topic tags, difficulty filters, or search terms.
                  </p>
                  {(searchQuery ||
                    selectedDifficulty !== 'ALL' ||
                    selectedStatus !== 'ALL' ||
                    selectedTopic !== 'ALL' ||
                    selectedTrack !== 'all' ||
                    onlyBookmarked) && (
                    <Button
                      variant="ghost"
                      className="mt-6 font-bold"
                      onClick={() => {
                        setSearchQuery('')
                        setSelectedDifficulty('ALL')
                        setSelectedStatus('ALL')
                        setSelectedTopic('ALL')
                        setSelectedTrack('all')
                        setOnlyBookmarked(false)
                      }}
                    >
                      Clear All Filters
                    </Button>
                  )}
                </Card>
              </motion.div>
            ) : viewMode === 'table' ? (
              /* LeetCode Compact Table View */
              <motion.div
                key="table-results"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="overflow-hidden rounded-2xl border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 shadow-sm"
              >
                <div className="overflow-x-auto">
                  <table className="min-w-[620px] w-full text-left text-sm border-collapse">
                    <thead>
                      <tr className="border-b border-gray-200 dark:border-gray-800 bg-gray-50/70 dark:bg-gray-800/40 text-[11px] font-black uppercase tracking-wider text-gray-400">
                        <th className="py-3 px-4 w-12 text-center">Status</th>
                        <th className="py-3 px-4">Title</th>
                        <th className="py-3 px-4">Difficulty</th>
                        <th className="py-3 px-4">Acceptance</th>
                        <th className="py-3 px-4">XP</th>
                        <th className="py-3 px-4 text-right">Action</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100 dark:divide-gray-800/60 font-medium">
                      {paginatedProblems.map(p => {
                        const isSolved = p.user_status === 'SOLVED'
                        const isAttempted = p.user_status === 'ATTEMPTED'
                        const isBookmarked = bookmarkedSet.has(p.id)
                        return (
                          <tr
                            key={p.id}
                            onClick={() => navigate(`/problem/${p.slug}`)}
                            className="hover:bg-gray-50 dark:hover:bg-gray-800/50 cursor-pointer transition-colors group"
                          >
                            <td className="py-3.5 px-4 text-center">
                              {isSolved ? (
                                <CheckCircle className="w-4 h-4 text-emerald-500 inline-block" />
                              ) : isAttempted ? (
                                <Flame className="w-4 h-4 text-amber-500 inline-block" />
                              ) : (
                                <span className="w-2 h-2 rounded-full bg-gray-300 dark:bg-gray-700 inline-block" />
                              )}
                            </td>
                            <td className="py-3.5 px-4">
                              <div className="flex items-center gap-2">
                                <span className="font-bold text-gray-900 dark:text-white group-hover:text-primary-500 transition-colors">
                                  {p.title}
                                </span>
                                {isBookmarked && (
                                  <Star className="w-3.5 h-3.5 fill-amber-400 text-amber-400 shrink-0" />
                                )}
                              </div>
                              <div className="flex flex-wrap gap-1 mt-1">
                                {(p.tags || []).slice(0, 2).map((t, tIdx) => (
                                  <span
                                    key={tIdx}
                                    className="text-[9px] px-1.5 py-0.2 rounded bg-gray-100 dark:bg-gray-800 text-gray-400"
                                  >
                                    {typeof t === 'string' ? t : t.name}
                                  </span>
                                ))}
                              </div>
                            </td>
                            <td className="py-3.5 px-4">
                              <span
                                className={cn(
                                  'text-[10px] font-black uppercase tracking-wider px-2 py-0.5 rounded',
                                  p.difficulty === 'EASY'
                                    ? 'text-emerald-500 bg-emerald-50 dark:bg-emerald-950/40'
                                    : p.difficulty === 'MEDIUM'
                                      ? 'text-amber-500 bg-amber-50 dark:bg-amber-950/40'
                                      : 'text-rose-500 bg-rose-50 dark:bg-rose-950/40'
                                )}
                              >
                                {p.difficulty}
                              </span>
                            </td>
                            <td className="py-3.5 px-4 text-xs font-mono text-gray-500">
                              {p.acceptance_rate != null
                                ? `${Math.round(p.acceptance_rate)}%`
                                : '—'}
                            </td>
                            <td className="py-3.5 px-4 text-xs font-bold text-amber-500">
                              {p.points} XP
                            </td>
                            <td className="py-3.5 px-4 text-right">
                              <span className="text-xs font-bold text-primary-500 group-hover:underline">
                                Solve →
                              </span>
                            </td>
                          </tr>
                        )
                      })}
                    </tbody>
                  </table>
                </div>
              </motion.div>
            ) : (
              /* Card Grid View */
              <motion.div
                key="grid-results"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="grid grid-cols-1 md:grid-cols-2 gap-4"
              >
                {paginatedProblems.map((p: Problem, idx: number) => (
                  <ProblemCard
                    key={p.id}
                    problem={p}
                    index={idx}
                    isBookmarked={bookmarkedSet.has(p.id)}
                    onToggleBookmark={handleToggleBookmark}
                  />
                ))}
              </motion.div>
            )}
          </AnimatePresence>

          {totalPages > 1 && (
            <div className="mt-8 flex justify-center">
              <Pagination
                currentPage={currentPage}
                totalPages={totalPages}
                onPageChange={setCurrentPage}
              />
            </div>
          )}
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
                        <p className="text-xs font-black uppercase tracking-tight text-gray-800 dark:text-gray-200">
                          {s.label}
                        </p>
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
              <Button
                onClick={() => navigate('/contest')}
                className="w-full bg-white hover:bg-gray-100 text-gray-900 border-none font-black transition-colors"
              >
                Register Event
              </Button>
            </div>
          </Card>
        </div>
      </div>

      {/* Keyboard Shortcuts Modal */}
      <AnimatePresence>
        {showKeyboardShortcuts && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center p-4"
          >
            <div
              className="absolute inset-0 bg-black/50"
              onClick={() => setShowKeyboardShortcuts(false)}
            />
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="bg-white dark:bg-gray-900 rounded-2xl shadow-2xl w-full max-w-md overflow-hidden relative z-10"
            >
              <div className="flex items-center justify-between p-4 border-b border-gray-200 dark:border-gray-700">
                <h3 className="text-lg font-bold text-gray-900 dark:text-white">
                  Keyboard Shortcuts
                </h3>
                <button
                  onClick={() => setShowKeyboardShortcuts(false)}
                  className="p-2 text-gray-400 hover:text-white transition-colors"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
              <div className="p-4 space-y-3">
                <div className="grid grid-cols-2 gap-3 text-sm">
                  <div className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-800 rounded-lg">
                    <kbd className="px-2 py-1 bg-gray-100 dark:bg-gray-800 rounded text-xs font-mono">
                      ?
                    </kbd>
                    <span className="text-gray-600 dark:text-gray-400">Toggle shortcuts</span>
                  </div>
                  <div className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-800 rounded-lg">
                    <kbd className="px-2 py-1 bg-gray-100 dark:bg-gray-800 rounded text-xs font-mono">
                      ⌘K
                    </kbd>
                    <span className="text-gray-600 dark:text-gray-400">Command palette</span>
                  </div>
                  <div className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-800 rounded-lg">
                    <kbd className="px-2 py-1 bg-gray-100 dark:bg-gray-800 rounded text-xs font-mono">
                      ⌘S
                    </kbd>
                    <span className="text-gray-600 dark:text-gray-400">Save draft</span>
                  </div>
                  <div className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-800 rounded-lg">
                    <kbd className="px-2 py-1 bg-gray-100 dark:bg-gray-800 rounded text-xs font-mono">
                      ⌘Enter
                    </kbd>
                    <span className="text-gray-600 dark:text-gray-400">Run code</span>
                  </div>
                  <div className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-800 rounded-lg">
                    <kbd className="px-2 py-1 bg-gray-100 dark:bg-gray-800 rounded text-xs font-mono">
                      Esc
                    </kbd>
                    <span className="text-gray-600 dark:text-gray-400">Close modal</span>
                  </div>
                </div>
                <div className="text-center pt-4">
                  <button
                    onClick={() => setShowKeyboardShortcuts(false)}
                    className="px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition-colors font-bold"
                  >
                    Got it
                  </button>
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </AnimatedPage>
  )
}
