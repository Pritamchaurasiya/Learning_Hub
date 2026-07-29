import React, { useState, useMemo, useEffect, useCallback, useDeferredValue } from 'react'
import { useDocumentTitle } from '../hooks/useDocumentTitle'
import { useSearchParams } from 'react-router-dom'
import {
  Search,
  X,
  History,
  Trash2,
  SlidersHorizontal,
  LayoutGrid,
  List,
  Sparkles,
  Bot,
} from 'lucide-react'
import { useQuery } from '@tanstack/react-query'
import AnimatedPage from '../components/AnimatedPage'

import { useStore } from '../stores/useStore'

import { useDebounce } from '../hooks/useDebounce'
import { courseService } from '../services/courseService'
import { CourseCard } from '../components/ui/CourseCard'
import { CourseCardSkeleton } from '../components/ui/Skeleton'
import { ErrorState } from '../components/ui/ErrorState'
import { Card } from '../components/ui/Card'
import { Button } from '../components/ui/Button'
import { aiTutorService } from '../services/aiTutorService'
import ReactMarkdown from 'react-markdown'

const difficultyOptions = ['all', 'easy', 'medium', 'hard', 'expert'] as const
const phaseOptions = ['all', 'beginner', 'intermediate', 'advanced', 'expert'] as const
const durationOptions = ['all', 'short', 'medium', 'long'] as const

type SortOption = 'relevance' | 'time-asc' | 'time-desc' | 'name'

const SearchPage = React.memo(function SearchPage() {
  useDocumentTitle('Search Hub')
  const [searchParams, setSearchParams] = useSearchParams()
  const progress = useStore(state => state.progress)
  const recentSearches = useStore(state => state.recentSearches)
  const addRecentSearch = useStore(state => state.addRecentSearch)

  const initialQuery = searchParams.get('q') ?? ''
  const [query, setQuery] = useState(initialQuery)
  const debouncedQuery = useDebounce(query, 300)

  const [difficultyFilter, setDifficultyFilter] = useState<string>(
    searchParams.get('difficulty') ?? 'all'
  )
  const [phaseFilter, setPhaseFilter] = useState<string>(searchParams.get('phase') ?? 'all')
  const [durationFilter, setDurationFilter] = useState<string>(
    searchParams.get('duration') ?? 'all'
  )
  const [sortBy, setSortBy] = useState<SortOption>(
    (searchParams.get('sort') as SortOption) || 'relevance'
  )
  const [showFilters, setShowFilters] = useState(false)
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid')

  const [aiAnswer, setAiAnswer] = useState<string | null>(null)
  const [isAiLoading, setIsAiLoading] = useState(false)

  const fetchAiAnswer = useCallback(async (q: string) => {
    if (!q || q.length < 3) return
    setIsAiLoading(true)
    setAiAnswer(null)
    try {
      const res = await aiTutorService.explainConcept(q)
      if (res.status === 'success') {
        setAiAnswer(res.data.explanation)
      } else {
        setAiAnswer("Sorry, I couldn't generate an answer right now. Please try again later.")
      }
    } catch {
      setAiAnswer('An error occurred while generating the answer. Please try again.')
    } finally {
      setIsAiLoading(false)
    }
  }, [])

  const {
    data: apiCourses = [],
    isLoading,
    isError,
    refetch,
  } = useQuery({
    queryKey: ['search', debouncedQuery, difficultyFilter, phaseFilter, durationFilter, sortBy],
    queryFn: async () => {
      const params: Record<string, string> = {}
      if (debouncedQuery?.trim()) params.q = debouncedQuery.trim()
      if (difficultyFilter !== 'all') params.difficulty = difficultyFilter
      if (phaseFilter !== 'all') params.phase = phaseFilter
      if (durationFilter !== 'all') params.duration = durationFilter
      if (sortBy !== 'relevance') params.sort = sortBy

      const response = await courseService.getCourses(params)
      return Array.isArray(response.data) ? response.data : []
    },
    staleTime: 5 * 60 * 1000,
  })

  const filteredCourses = useMemo(() => {
    const results = [...apiCourses]

    if (sortBy === 'time-asc') {
      results.sort((a, b) => {
        const ta = typeof a.duration === 'string' ? parseInt(a.duration) || 0 : 0
        const tb = typeof b.duration === 'string' ? parseInt(b.duration) || 0 : 0
        return ta - tb
      })
    } else if (sortBy === 'time-desc') {
      results.sort((a, b) => {
        const ta = typeof a.duration === 'string' ? parseInt(a.duration) || 0 : 0
        const tb = typeof b.duration === 'string' ? parseInt(b.duration) || 0 : 0
        return tb - ta
      })
    } else if (sortBy === 'name') {
      results.sort((a, b) => a.title.localeCompare(b.title))
    }

    return results
  }, [sortBy, apiCourses])

  const deferredFilteredCourses = useDeferredValue(filteredCourses)

  const activeFiltersCount =
    (difficultyFilter !== 'all' ? 1 : 0) +
    (phaseFilter !== 'all' ? 1 : 0) +
    (durationFilter !== 'all' ? 1 : 0)

  useEffect(() => {
    const params: Record<string, string> = {}

    if (debouncedQuery.trim()) {
      params.q = debouncedQuery
      if (debouncedQuery.length > 2) {
        addRecentSearch(debouncedQuery)
      }
    }
    if (difficultyFilter !== 'all') params.difficulty = difficultyFilter
    if (phaseFilter !== 'all') params.phase = phaseFilter
    if (durationFilter !== 'all') params.duration = durationFilter
    if (sortBy !== 'relevance') params.sort = sortBy

    setSearchParams(params, { replace: true })
  }, [
    debouncedQuery,
    difficultyFilter,
    phaseFilter,
    durationFilter,
    sortBy,
    setSearchParams,
    addRecentSearch,
    query,
  ])

  const handleSearch = useCallback((searchQuery: string) => {
    setQuery(searchQuery)
  }, [])

  const clearFilters = useCallback(() => {
    setDifficultyFilter('all')
    setPhaseFilter('all')
    setDurationFilter('all')
    setSortBy('relevance')
    setQuery('')
  }, [])

  const getPhaseColor = useCallback((course: { phase?: string; level?: string }) => {
    const phase = (course.phase ?? course.level ?? '').toLowerCase()
    switch (phase) {
      case 'beginner':
        return '#22c55e'
      case 'intermediate':
        return '#3b82f6'
      case 'advanced':
        return '#8b5cf6'
      default:
        return '#3b82f6'
    }
  }, [])

  return (
    <AnimatedPage className="max-w-[1400px] mx-auto space-y-8 pb-12 pt-4 px-2">
      {/* Search Header Container */}
      <Card className="p-6 md:p-8 rounded-[2.5rem] border-none shadow-xl bg-white dark:bg-gray-900 flex flex-col gap-6">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="flex items-center gap-4">
            <div className="w-16 h-16 rounded-[1.25rem] bg-gray-900 dark:bg-white flex items-center justify-center shadow-xl">
              <Search className="w-8 h-8 text-white dark:text-gray-900" />
            </div>
            <div>
              <h1 className="text-3xl font-black text-gray-900 dark:text-white uppercase tracking-tight">
                Global Search
              </h1>
              <p className="text-[10px] font-bold text-gray-500 uppercase tracking-widest mt-1">
                Scan knowledge base
              </p>
            </div>
          </div>

          <Button
            onClick={() => setShowFilters(!showFilters)}
            variant={showFilters ? 'primary' : 'outline'}
            className={`rounded-xl font-black uppercase tracking-widest text-[10px] px-6 py-4 shadow-sm border-2 flex items-center gap-2 ${showFilters ? 'shadow-primary-500/20' : ''}`}
          >
            <SlidersHorizontal className="w-4 h-4" />
            Filters{' '}
            {activeFiltersCount > 0 && (
              <span className="ml-1 px-2 py-0.5 bg-white/20 rounded-md">{activeFiltersCount}</span>
            )}
          </Button>
        </div>

        {/* Big Search Bar */}
        <div className="relative group">
          <div className="absolute inset-y-0 left-6 flex items-center pointer-events-none">
            <Search className="w-6 h-6 text-gray-400 group-focus-within:text-primary-500 transition-colors" />
          </div>
          <input
            type="text"
            value={query}
            onChange={e => handleSearch(e.target.value)}
            onKeyDown={e => {
              if (e.key === 'Enter') {
                void fetchAiAnswer(query)
              }
            }}
            placeholder="ENTER SEARCH QUERY..."
            aria-label="Search courses"
            className="w-full bg-gray-50 dark:bg-gray-800/50 border-2 border-gray-100 dark:border-gray-800 rounded-[1.5rem] py-6 pl-12 pr-12 sm:pl-16 sm:pr-32 text-lg font-black tracking-widest text-gray-900 dark:text-white placeholder:text-gray-300 dark:placeholder:text-gray-600 focus:outline-none focus:border-primary-500 focus:ring-4 focus:ring-primary-500/20 transition-all shadow-inner uppercase"
            autoFocus
          />
          <div className="absolute inset-y-0 right-3 sm:right-6 flex items-center gap-1 sm:gap-2">
            {query && (
              <button
                onClick={() => setQuery('')}
                className="w-8 h-8 min-w-[44px] sm:min-w-8 rounded-full bg-gray-200 dark:bg-gray-700 hover:bg-gray-300 dark:hover:bg-gray-600 flex items-center justify-center transition-colors"
                aria-label="Clear search query"
              >
                <X className="w-4 h-4 text-gray-600 dark:text-gray-300" />
              </button>
            )}
            <button
              onClick={() => fetchAiAnswer(query)}
              disabled={isAiLoading || !query}
              className="min-h-[44px] min-w-[44px] sm:min-h-auto sm:min-w-auto px-2 sm:px-4 bg-indigo-500/10 hover:bg-indigo-500/20 text-indigo-600 dark:text-indigo-400 rounded-xl font-bold text-[10px] uppercase tracking-widest flex items-center justify-center gap-2 transition-colors disabled:opacity-50"
            >
              <Sparkles className="w-4 h-4" />
              <span className="hidden sm:inline">Ask AI</span>
            </button>
          </div>
        </div>
      </Card>

      {/* Expandable Filters */}
      {showFilters && (
        <Card className="p-8 rounded-[2rem] border-none shadow-xl bg-white dark:bg-gray-900 animate-in slide-in-from-top-4 fade-in duration-300">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            <div className="space-y-4">
              <label className="text-[10px] font-black text-gray-400 uppercase tracking-[0.2em]">
                Difficulty
              </label>
              <div className="flex flex-wrap gap-2">
                {difficultyOptions.map(opt => (
                  <button
                    key={opt}
                    onClick={() => setDifficultyFilter(opt)}
                    aria-pressed={difficultyFilter === opt}
                    className={`px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${
                      difficultyFilter === opt
                        ? 'bg-primary-600 text-white shadow-lg shadow-primary-500/20'
                        : 'bg-gray-50 dark:bg-gray-800 text-gray-500 hover:bg-gray-100 dark:hover:bg-gray-700'
                    }`}
                  >
                    {opt}
                  </button>
                ))}
              </div>
            </div>
            <div className="space-y-4">
              <label className="text-[10px] font-black text-gray-400 uppercase tracking-[0.2em]">
                Phase
              </label>
              <div className="flex flex-wrap gap-2">
                {phaseOptions.map(opt => (
                  <button
                    key={opt}
                    onClick={() => setPhaseFilter(opt)}
                    aria-pressed={phaseFilter === opt}
                    className={`px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${
                      phaseFilter === opt
                        ? 'bg-primary-600 text-white shadow-lg shadow-primary-500/20'
                        : 'bg-gray-50 dark:bg-gray-800 text-gray-500 hover:bg-gray-100 dark:hover:bg-gray-700'
                    }`}
                  >
                    {opt}
                  </button>
                ))}
              </div>
            </div>
            <div className="space-y-4">
              <label className="text-[10px] font-black text-gray-400 uppercase tracking-[0.2em]">
                Duration
              </label>
              <div className="flex flex-wrap gap-2">
                {durationOptions.map(opt => (
                  <button
                    key={opt}
                    onClick={() => setDurationFilter(opt)}
                    aria-pressed={durationFilter === opt}
                    className={`px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${
                      durationFilter === opt
                        ? 'bg-primary-600 text-white shadow-lg shadow-primary-500/20'
                        : 'bg-gray-50 dark:bg-gray-800 text-gray-500 hover:bg-gray-100 dark:hover:bg-gray-700'
                    }`}
                  >
                    {opt === 'all'
                      ? 'ALL'
                      : opt === 'short'
                        ? '< 5H'
                        : opt === 'medium'
                          ? '5-20H'
                          : '> 20H'}
                  </button>
                ))}
              </div>
            </div>
          </div>

          <div className="flex items-center justify-between pt-8 mt-8 border-t border-gray-100 dark:border-gray-800">
            <div className="flex items-center gap-4">
              <label
                htmlFor="sort-select"
                className="text-[10px] font-black text-gray-400 uppercase tracking-[0.2em]"
              >
                Sort By
              </label>
              <select
                id="sort-select"
                value={sortBy}
                onChange={e => setSortBy(e.target.value as SortOption)}
                className="bg-gray-50 dark:bg-gray-800 border-none rounded-xl px-4 py-2 text-[10px] font-black uppercase tracking-widest text-gray-900 dark:text-white focus:ring-2 focus:ring-primary-500/50 outline-none cursor-pointer"
              >
                <option value="relevance">Relevance</option>
                <option value="name">Alpha (A-Z)</option>
                <option value="time-asc">Duration (Fast)</option>
                <option value="time-desc">Duration (Long)</option>
              </select>
            </div>
            <Button
              variant="outline"
              onClick={clearFilters}
              className="text-[10px] font-black uppercase tracking-widest rounded-xl text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-900/20 border-rose-100 dark:border-rose-900/30"
            >
              <Trash2 className="w-3.5 h-3.5 mr-2" /> Reset
            </Button>
          </div>
        </Card>
      )}

      {/* Recent Searches */}
      {!query && recentSearches.length > 0 && (
        <div className="flex items-center gap-3 overflow-x-auto pb-2 scrollbar-hide">
          <div className="flex items-center gap-2 text-gray-400 shrink-0">
            <History className="w-4 h-4" />
            <span className="text-[10px] font-black uppercase tracking-widest">Recent:</span>
          </div>
          {recentSearches.slice(0, 5).map((search, i) => (
            <button
              // eslint-disable-next-line react/no-array-index-key
              key={`${search}-${i}`}
              onClick={() => handleSearch(search)}
              className="px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest bg-white dark:bg-gray-900 text-gray-600 dark:text-gray-400 hover:bg-primary-50 dark:hover:bg-primary-900/20 hover:text-primary-600 transition-colors shadow-sm shrink-0 whitespace-nowrap border border-gray-100 dark:border-gray-800"
            >
              {search}
            </button>
          ))}
        </div>
      )}

      {/* AI Answer Section */}
      {(isAiLoading || aiAnswer) && (
        <Card className="p-6 md:p-8 rounded-[2rem] border-2 border-indigo-500/20 shadow-xl shadow-indigo-500/10 bg-gradient-to-br from-indigo-50/50 to-white dark:from-indigo-950/20 dark:to-gray-900 relative overflow-hidden animate-in fade-in slide-in-from-bottom-4">
          <div className="absolute top-0 right-0 p-8 opacity-[0.03] dark:opacity-[0.05] pointer-events-none">
            <Bot className="w-48 h-48" />
          </div>
          <div className="relative z-10">
            <div className="flex items-center gap-3 mb-6">
              <div className="w-10 h-10 rounded-xl bg-indigo-500 flex items-center justify-center shadow-lg shadow-indigo-500/30">
                <Sparkles className="w-5 h-5 text-white" />
              </div>
              <h2 className="text-xl font-black uppercase tracking-tight text-gray-900 dark:text-white">
                AI Knowledge Engine
              </h2>
            </div>

            {isAiLoading ? (
              <div className="flex items-center gap-3 text-indigo-500">
                <div className="flex gap-1">
                  <div className="w-2 h-2 rounded-full bg-indigo-500 animate-bounce [animation-delay:-0.3s]" />
                  <div className="w-2 h-2 rounded-full bg-indigo-500 animate-bounce [animation-delay:-0.15s]" />
                  <div className="w-2 h-2 rounded-full bg-indigo-500 animate-bounce" />
                </div>
                <span className="text-sm font-bold uppercase tracking-widest">
                  Synthesizing answer...
                </span>
              </div>
            ) : (
              <div className="prose prose-indigo dark:prose-invert max-w-none text-gray-700 dark:text-gray-300">
                <ReactMarkdown>{aiAnswer ?? ''}</ReactMarkdown>
              </div>
            )}
          </div>
        </Card>
      )}

      {/* Results Header */}
      <div className="flex items-center justify-between">
        <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest">
          {debouncedQuery.trim()
            ? `FOUND ${deferredFilteredCourses.length} RESULT${deferredFilteredCourses.length !== 1 ? 'S' : ''} [${debouncedQuery}]`
            : `FOUND ${deferredFilteredCourses.length} RESULT${deferredFilteredCourses.length !== 1 ? 'S' : ''}`}
        </p>
        <div className="flex items-center gap-2 bg-white dark:bg-gray-900 p-1.5 rounded-xl shadow-sm border border-gray-100 dark:border-gray-800">
          <button
            onClick={() => setViewMode('grid')}
            className={`p-2 rounded-lg transition-all ${viewMode === 'grid' ? 'bg-gray-100 dark:bg-gray-800 text-primary-600' : 'text-gray-400 hover:text-gray-600 dark:hover:text-gray-300'}`}
          >
            <LayoutGrid className="w-4 h-4" />
          </button>
          <button
            onClick={() => setViewMode('list')}
            className={`p-2 rounded-lg transition-all ${viewMode === 'list' ? 'bg-gray-100 dark:bg-gray-800 text-primary-600' : 'text-gray-400 hover:text-gray-600 dark:hover:text-gray-300'}`}
          >
            <List className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Results Grid */}
      {isLoading ? (
        <div
          className={
            viewMode === 'grid'
              ? 'grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6'
              : 'space-y-4'
          }
        >
          {[...Array(6)].map((_, i) => (
            // eslint-disable-next-line react/no-array-index-key
            <CourseCardSkeleton key={i} viewMode={viewMode} />
          ))}
        </div>
      ) : isError ? (
        <Card className="p-12 border-none shadow-xl bg-white dark:bg-gray-900 rounded-[2.5rem]">
          <ErrorState
            title="Search Failed"
            message="Something went wrong while searching courses. Please try again."
            onRetry={() => void refetch()}
          />
        </Card>
      ) : deferredFilteredCourses.length > 0 ? (
        <div
          className={
            viewMode === 'grid'
              ? 'grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6'
              : 'space-y-4'
          }
        >
          {deferredFilteredCourses.map((course, idx) => (
            <CourseCard
              key={course.id}
              course={course}
              phaseColor={getPhaseColor(course)}
              index={idx}
              isCompleted={progress.completedCourses.includes(course.id)}
              isBookmarked={progress.bookmarks.includes(course.id)}
              viewMode={viewMode}
            />
          ))}
        </div>
      ) : (
        <Card className="p-6 sm:p-20 text-center border-none shadow-xl bg-white dark:bg-gray-900 rounded-[2.5rem]">
          <div className="w-24 h-24 bg-gray-50 dark:bg-gray-800 rounded-[2rem] flex items-center justify-center mx-auto mb-8 shadow-inner">
            <Search className="w-10 h-10 text-gray-300 dark:text-gray-600" />
          </div>
          <h3 className="text-2xl font-black uppercase tracking-tight mb-3">No Matches Found</h3>
          <p className="text-sm font-medium text-gray-500 mb-8 max-w-sm mx-auto">
            Try broadening your search parameters or removing specific constraints.
          </p>
          <Button
            onClick={clearFilters}
            className="rounded-xl font-black uppercase tracking-widest text-[10px] px-8 py-4 shadow-lg shadow-primary-500/20"
          >
            Reset All Filters
          </Button>
        </Card>
      )}
    </AnimatedPage>
  )
})

export default SearchPage
