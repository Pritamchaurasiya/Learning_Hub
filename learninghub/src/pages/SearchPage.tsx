import React, { useState, useMemo, useEffect, useCallback } from 'react'
import { useSearchParams } from 'react-router-dom'
import {
  Search,
  X,
  History,
  Trash2,
  SlidersHorizontal
} from 'lucide-react'
import Fuse from 'fuse.js'
import AnimatedPage from '../components/AnimatedPage'
import { useStore } from '../stores/useStore'
import { allCourses, phases } from '../data/courses'
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
  const [searchParams, setSearchParams] = useSearchParams()
  const { progress, recentSearches, addRecentSearch } = useStore()

  const [apiCourses, setApiCourses] = useState<any[]>([])
  const [isLoading, setIsLoading] = useState(true)

  const initialQuery = searchParams.get('q') || ''
  const [query, setQuery] = useState(initialQuery)
  const debouncedQuery = useDebounce(query, 300)

  const [difficultyFilter, setDifficultyFilter] = useState<string>('all')
  const [phaseFilter, setPhaseFilter] = useState<string>('all')
  const [durationFilter, setDurationFilter] = useState<string>('all')
  const [sortBy, setSortBy] = useState<SortOption>('relevance')
  const [showFilters, setShowFilters] = useState(false)
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid')

  // Fetch courses from API
  useEffect(() => {
    const fetchCourses = async () => {
      setIsLoading(true)
      try {
        const response = await courseService.getCourses({ 
          search: debouncedQuery,
          difficulty: difficultyFilter !== 'all' ? difficultyFilter : '',
          phase: phaseFilter !== 'all' ? phaseFilter : '',
          duration: durationFilter !== 'all' ? durationFilter : ''
        })
        // Backend data structure might differ, map if needed
        const data = response.data || response as any
        setApiCourses(Array.isArray(data) ? data : [])
      } catch (error) {
        if (import.meta.env.DEV) {
          console.error('Failed to fetch courses:', error);
        }
        setApiCourses([]) // Force fallback
      } finally {
        setIsLoading(false)
      }
    }
    fetchCourses()
  }, [debouncedQuery, difficultyFilter, phaseFilter, durationFilter])

  const fuse = useMemo(() => {
    return new Fuse(allCourses, {
      keys: ['title', 'description', 'tags'],
      threshold: 0.4,
      includeScore: true,
    })
  }, [])

  const filteredCourses = useMemo(() => {
    // If API returned results, use them
    if (apiCourses.length > 0) return apiCourses
    
    // Fallback to local filtering if API returned nothing (e.g. dev mode or empty)
    let results: Course[]

    if (debouncedQuery.trim()) {
      results = fuse.search(debouncedQuery).map(r => r.item)
    } else {
      results = [...allCourses]
    }

    if (difficultyFilter !== 'all') {
      results = results.filter(c => (c.difficulty) === difficultyFilter)
    }

    if (phaseFilter !== 'all') {
      results = results.filter(c => c.phase === phaseFilter)
    }

    if (durationFilter !== 'all') {
      results = results.filter(c => {
        const duration = typeof c.estimatedTime === 'number' ? c.estimatedTime : 0
        if (durationFilter === 'short') return duration < 5
        if (durationFilter === 'medium') return duration >= 5 && duration <= 20
        if (durationFilter === 'long') return duration > 20
        return true
      })
    }

    // Sort
    if (sortBy === 'time-asc') {
      results.sort((a, b) => {
        const ta = typeof a.estimatedTime === 'number' ? a.estimatedTime : 0
        const tb = typeof b.estimatedTime === 'number' ? b.estimatedTime : 0
        return ta - tb
      })
      results.sort((a, b) => a.title.localeCompare(b.title))
    }

    return results
  }, [debouncedQuery, difficultyFilter, phaseFilter, durationFilter, sortBy, fuse, apiCourses])

  const activeFiltersCount = 
    (difficultyFilter !== 'all' ? 1 : 0) + 
    (phaseFilter !== 'all' ? 1 : 0) + 
    (durationFilter !== 'all' ? 1 : 0)

  // Sync debounced query to URL params & recent searches
  useEffect(() => {
    if (debouncedQuery.trim()) {
      setSearchParams({ q: debouncedQuery }, { replace: true })
      if (debouncedQuery.length > 2) {
        addRecentSearch(debouncedQuery)
      }
    } else {
      setSearchParams({}, { replace: true })
    }
  }, [debouncedQuery, setSearchParams, addRecentSearch])

  const handleSearch = useCallback((searchQuery: string) => {
    setQuery(searchQuery)
  }, [])

  const clearFilters = useCallback(() => {
    setDifficultyFilter('all')
    setPhaseFilter('all')
    setSortBy('relevance')
    setQuery('')
  }, [])

  const getPhaseColor = useCallback((course: Course) => {
    const phase = phases.find(p => p.courses.some(c => c.id === course.id))
    return phase?.color || '#3b82f6'
  }, [])

  return (
    <AnimatedPage className="space-y-6">
      {/* Search Header */}
      <div>
        <h1 className="text-2xl md:text-3xl font-bold mb-1">Search Courses</h1>
        <p className="text-sm text-gray-500 dark:text-gray-400">
          Explore our catalog of {allCourses.length} professional courses
        </p>
      </div>

      {/* Search Bar */}
      <div className="flex gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <input
            type="text"
            value={query}
            onChange={(e) => handleSearch(e.target.value)}
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
          </div>

          <div className="flex items-center justify-between pt-2 border-t border-gray-100 dark:border-gray-800">
            <div className="flex items-center gap-2">
              <label className="text-xs font-semibold text-gray-400 uppercase tracking-wider">Sort:</label>
              <select
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value as SortOption)}
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
        <p className="text-xs text-gray-400 dark:text-gray-500 font-medium" aria-live="polite" aria-atomic="true">
          {isLoading ? 'Searching...' : `${filteredCourses.length} course${filteredCourses.length !== 1 ? 's' : ''} found`}
          {!isLoading && debouncedQuery.trim() && <span> for "<span className="text-gray-600 dark:text-gray-300">{debouncedQuery}</span>"</span>}
        </p>

        {isLoading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {[...Array(6)].map((_, i) => (
              <CourseCardSkeleton key={i} />
            ))}
          </div>
        ) : filteredCourses.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {filteredCourses.map((course, idx) => (
              <CourseCard
                key={course.id}
                course={course}
                phaseColor={getPhaseColor(course)}
                index={idx}
                isCompleted={progress.completedCourses.includes(course.id)}
                isBookmarked={progress.bookmarks.includes(course.id)}
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
