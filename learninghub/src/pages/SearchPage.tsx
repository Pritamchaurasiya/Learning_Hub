import React, { useState, useMemo, useEffect, useCallback, useDeferredValue } from 'react'
import { useDocumentTitle } from '../hooks/useDocumentTitle'
import { useSearchParams } from 'react-router-dom'
import { Search, X, History, Trash2, SlidersHorizontal, LayoutGrid, List } from 'lucide-react'
import AnimatedPage from '../components/AnimatedPage'
import { reportError } from '../components/ErrorBoundary'
import { useStore } from '../stores/useStore'
import type { Course } from '../types'
import { useDebounce } from '../hooks/useDebounce'
import { courseService } from '../services/courseService'
import { CourseCard } from '../components/ui/CourseCard'
import { CourseCardSkeleton } from '../components/ui/Skeleton'

const difficultyOptions = ['all', 'easy', 'medium', 'hard', 'expert'] as const
const phaseOptions = ['all', 'beginner', 'intermediate', 'advanced', 'singularity'] as const
const durationOptions = ['all', 'short', 'medium', 'long'] as const

type SortOption = 'relevance' | 'time-asc' | 'time-desc' | 'name'

const SearchPage = React.memo(function SearchPage() {
  useDocumentTitle('Search Courses')
  const [searchParams, setSearchParams] = useSearchParams()
  const { progress, recentSearches, addRecentSearch } = useStore()

  const [apiCourses, setApiCourses] = useState<Course[]>([])
  const [isLoading, setIsLoading] = useState(true)

  const initialQuery = searchParams.get('q') ?? ''
  const [query, setQuery] = useState(initialQuery)
  const debouncedQuery = useDebounce(query, 300)
  // useDeferredValue is used below for filtered results to keep the UI responsive during filtering

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

  // Fetch courses from API with backend search
  useEffect(() => {
    const controller = new AbortController()
    const fetchCourses = async () => {
      if (controller.signal.aborted) return
      setIsLoading(true)
      try {
        // Prepare query params for backend search
        const params: Record<string, string> = {}

        // eslint-disable-next-line @typescript-eslint/prefer-optional-chain
        if (debouncedQuery && debouncedQuery.trim()) {
          params.q = debouncedQuery.trim()
        }

        if (difficultyFilter !== 'all') {
          params.difficulty = difficultyFilter
        }

        if (phaseFilter !== 'all') {
          params.phase = phaseFilter
        }

        if (durationFilter !== 'all') {
          params.duration = durationFilter
        }

        // Add sort parameter if specified
        if (sortBy !== 'relevance') {
          params.sort = sortBy
        }

        // Use courseService which now includes caching
        const response = await courseService.getCourses(params)

        if (controller.signal.aborted) return

        // Backend returns paginated data with proper structure
        const data = response.data || []
        setApiCourses(Array.isArray(data) ? (data as unknown as Course[]) : [])
      } catch (error) {
        if (controller.signal.aborted) return

        // Log error for monitoring
        if (import.meta.env.DEV) {
          console.error('Failed to fetch courses:', error)
        }

        // Don't clear courses on error - keep existing results
        // This prevents UX disruption on temporary failures
        reportError(error instanceof Error ? error : new Error(String(error)), undefined, {
          context: 'search_fetch',
        })
      } finally {
        if (!controller.signal.aborted) setIsLoading(false)
      }
    }

    void fetchCourses()
    return () => controller.abort()
  }, [debouncedQuery, difficultyFilter, phaseFilter, durationFilter, sortBy])

  const filteredCourses = useMemo(() => {
    // If API returned results, use them
    const results = [...apiCourses]

    // Sort
    if (sortBy === 'time-asc') {
      results.sort((a, b) => {
        const ta = typeof a.estimatedTime === 'number' ? a.estimatedTime : 0
        const tb = typeof b.estimatedTime === 'number' ? b.estimatedTime : 0
        return ta - tb
      })
    } else if (sortBy === 'time-desc') {
      results.sort((a, b) => {
        const ta = typeof a.estimatedTime === 'number' ? a.estimatedTime : 0
        const tb = typeof b.estimatedTime === 'number' ? b.estimatedTime : 0
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

  // Sync debounced query and filters to URL params & recent searches
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

  const getPhaseColor = useCallback((course: { phase?: string }) => {
    switch (course.phase?.toLowerCase()) {
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
    <AnimatedPage className="space-y-6">
      {/* Search Header */}
      <div>
        <h1 className="text-2xl md:text-3xl font-bold mb-1">Search Courses</h1>
        <p className="text-sm text-gray-500 dark:text-gray-400">
          Explore our catalog of professional courses
        </p>
      </div>

      {/* Search Bar */}
      <div className="flex gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <input
            type="text"
            value={query}
            onChange={e => handleSearch(e.target.value)}
            placeholder="Search by title, description, or tags..."
            className="input-field pl-10 pr-10 text-sm"
            autoFocus
          />
          {query && (
            <button
              onClick={() => setQuery('')}
              className="absolute right-3 top-1/2 -translate-y-1/2 p-1 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
            >
              <X className="w-4 h-4 text-gray-400" />
            </button>
          )}
        </div>
        <button
          onClick={() => setShowFilters(!showFilters)}
          className={`btn-secondary flex items-center gap-2 relative text-sm ${showFilters ? 'ring-2 ring-primary-500/30 border-primary-400' : ''}`}
        >
          <SlidersHorizontal className="w-4 h-4" />
          <span className="hidden sm:inline">Filters</span>
          {activeFiltersCount > 0 && (
            <span className="absolute -top-1.5 -right-1.5 w-5 h-5 bg-primary-600 text-white text-[10px] flex items-center justify-center rounded-full font-bold shadow-sm">
              {activeFiltersCount}
            </span>
          )}
        </button>
      </div>

      {/* Filters */}
      {showFilters && (
        <div className="card-static p-5 space-y-5 animate-scale-in">
          <div className="flex flex-col md:flex-row gap-6">
            <div className="flex-1">
              <label className="block text-xs font-semibold text-gray-400 dark:text-gray-500 uppercase tracking-wider mb-2.5">
                Difficulty
              </label>
              <div className="flex flex-wrap gap-2">
                {difficultyOptions.map(opt => (
                  <button
                    key={opt}
                    onClick={() => setDifficultyFilter(opt)}
                    className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all duration-200 min-h-[36px] min-w-[44px] focus:outline-none focus-visible:ring-2 focus-visible:ring-primary-500 focus-visible:ring-offset-2 dark:focus-visible:ring-offset-gray-900 ${
                      difficultyFilter === opt
                        ? 'bg-primary-600 text-white shadow-sm shadow-primary-500/20'
                        : 'bg-gray-50 dark:bg-gray-800 text-gray-500 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700'
                    }`}
                    aria-pressed={difficultyFilter === opt}
                  >
                    {opt === 'all' ? 'All' : opt.charAt(0).toUpperCase() + opt.slice(1)}
                  </button>
                ))}
              </div>
            </div>
            <div className="flex-1">
              <label className="block text-xs font-semibold text-gray-400 dark:text-gray-500 uppercase tracking-wider mb-2.5">
                Phase
              </label>
              <div className="flex flex-wrap gap-2">
                {phaseOptions.map(opt => (
                  <button
                    key={opt}
                    onClick={() => setPhaseFilter(opt)}
                    className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all duration-200 min-h-[36px] min-w-[44px] focus:outline-none focus-visible:ring-2 focus-visible:ring-primary-500 focus-visible:ring-offset-2 dark:focus-visible:ring-offset-gray-900 ${
                      phaseFilter === opt
                        ? 'bg-primary-600 text-white shadow-sm shadow-primary-500/20'
                        : 'bg-gray-50 dark:bg-gray-800 text-gray-500 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700'
                    }`}
                    aria-pressed={phaseFilter === opt}
                  >
                    {opt === 'all' ? 'All' : opt.charAt(0).toUpperCase() + opt.slice(1)}
                  </button>
                ))}
              </div>
            </div>
            <div className="flex-1">
              <label className="block text-xs font-semibold text-gray-400 dark:text-gray-500 uppercase tracking-wider mb-2.5">
                Duration
              </label>
              <div className="flex flex-wrap gap-2">
                {durationOptions.map(opt => (
                  <button
                    key={opt}
                    onClick={() => setDurationFilter(opt)}
                    className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all duration-200 min-h-[36px] min-w-[44px] focus:outline-none focus-visible:ring-2 focus-visible:ring-primary-500 focus-visible:ring-offset-2 dark:focus-visible:ring-offset-gray-900 ${
                      durationFilter === opt
                        ? 'bg-primary-600 text-white shadow-sm shadow-primary-500/20'
                        : 'bg-gray-50 dark:bg-gray-800 text-gray-500 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700'
                    }`}
                    aria-pressed={durationFilter === opt}
                  >
                    {opt === 'all'
                      ? 'All'
                      : opt === 'short'
                        ? '< 5h'
                        : opt === 'medium'
                          ? '5-20h'
                          : '> 20h'}
                  </button>
                ))}
              </div>
            </div>
          </div>

          <div className="flex items-center justify-between pt-2 border-t border-gray-100 dark:border-gray-800">
            <div className="flex items-center gap-2">
              <label className="text-xs font-semibold text-gray-400 uppercase tracking-wider">
                Sort:
              </label>
              <select
                value={sortBy}
                onChange={e => setSortBy(e.target.value as SortOption)}
                className="text-xs bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg px-2 py-1.5 text-gray-600 dark:text-gray-300 focus:outline-none focus:ring-2 focus:ring-primary-500/30"
              >
                <option value="relevance">Relevance</option>
                <option value="name">Name (A-Z)</option>
                <option value="time-asc">Duration (Short first)</option>
                <option value="time-desc">Duration (Long first)</option>
              </select>
            </div>
            <button
              onClick={clearFilters}
              className="flex items-center gap-1.5 text-xs text-gray-400 hover:text-red-500 transition-colors px-2 py-1.5 rounded-lg hover:bg-red-50 dark:hover:bg-red-900/10"
            >
              <Trash2 className="w-3.5 h-3.5" />
              Clear all
            </button>
          </div>
        </div>
      )}

      {/* Recent Searches */}
      {!query && recentSearches.length > 0 && (
        <div className="card-static p-4">
          <h3 className="text-xs font-semibold text-gray-400 dark:text-gray-500 uppercase tracking-wider mb-3 flex items-center gap-2">
            <History className="w-3.5 h-3.5" /> Recent Searches
          </h3>
          <div className="flex flex-wrap gap-2">
            {recentSearches.slice(0, 5).map((search, i) => (
              <button
                // eslint-disable-next-line react/no-array-index-key
                key={`${search}-${i}`}
                onClick={() => handleSearch(search)}
                className="px-3 py-1.5 rounded-lg text-xs font-medium bg-gray-50 dark:bg-gray-800 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors text-gray-600 dark:text-gray-400"
              >
                {search}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Results Section */}
      <div className="space-y-4">
        {/* Results Header with View Toggle */}
        <div className="flex items-center justify-between">
          <p
            className="text-xs text-gray-400 dark:text-gray-500 font-medium"
            aria-live="polite"
            aria-atomic="true"
          >
            {isLoading
              ? 'Searching...'
              : `${deferredFilteredCourses.length} course${deferredFilteredCourses.length !== 1 ? 's' : ''} found`}
            {!isLoading && debouncedQuery.trim() && (
              <span>
                {' '}
                for &quot;<span className="text-gray-600 dark:text-gray-300">{debouncedQuery}</span>
                &quot;
              </span>
            )}
          </p>

          {/* Grid/List View Toggle */}
          <div className="flex items-center gap-1 bg-gray-100 dark:bg-gray-800 rounded-xl p-1">
            <button
              onClick={() => setViewMode('grid')}
              className={`p-2 rounded-lg transition-all ${
                viewMode === 'grid'
                  ? 'bg-white dark:bg-gray-700 shadow-sm text-primary-600'
                  : 'text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200'
              }`}
              title="Grid view"
            >
              <LayoutGrid className="w-4 h-4" />
            </button>
            <button
              onClick={() => setViewMode('list')}
              className={`p-2 rounded-lg transition-all ${
                viewMode === 'list'
                  ? 'bg-white dark:bg-gray-700 shadow-sm text-primary-600'
                  : 'text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200'
              }`}
              title="List view"
            >
              <List className="w-4 h-4" />
            </button>
          </div>
        </div>

        {isLoading ? (
          <div
            className={
              viewMode === 'grid'
                ? 'grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4'
                : 'space-y-4'
            }
          >
            {[...Array(6)].map((_, i) => (
              // eslint-disable-next-line react/no-array-index-key
              <CourseCardSkeleton key={i} viewMode={viewMode} />
            ))}
          </div>
        ) : deferredFilteredCourses.length > 0 ? (
          <div
            className={
              viewMode === 'grid'
                ? 'grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4'
                : 'space-y-4'
            }
          >
            {deferredFilteredCourses.map((course: Course, idx: number) => (
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
          <div className="text-center py-16">
            <div className="w-16 h-16 bg-gray-100 dark:bg-gray-800 rounded-2xl flex items-center justify-center mx-auto mb-5">
              <Search className="w-8 h-8 text-gray-300 dark:text-gray-600" />
            </div>
            <h3 className="text-lg font-semibold mb-2">No courses found</h3>
            <p className="text-sm text-gray-500 dark:text-gray-400 mb-6">
              Try adjusting your search or filters
            </p>
            <button onClick={clearFilters} className="btn-secondary text-sm">
              Clear all filters
            </button>
          </div>
        )}
      </div>
    </AnimatedPage>
  )
})

export default SearchPage
