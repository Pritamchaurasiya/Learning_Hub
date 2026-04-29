import { useState, useEffect, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import { Search, BookOpen, Clock, Star, Users, TrendingUp, ChevronRight, AlertCircle, RefreshCw } from 'lucide-react'
import { SEO } from '../components/SEO'
import { Button } from '../components/ui/Button'
import { Input } from '../components/ui/Input'
import { Card } from '../components/ui/Card'
import { libraryService, type Course } from '../services/libraryService'

const categories = ['All', 'Web Development', 'Data Science', 'Computer Science', 'Cloud Computing', 'Mobile Development']
const levels = ['All', 'Beginner', 'Intermediate', 'Advanced']

export default function LibraryPage() {
  const navigate = useNavigate()
  const [searchQuery, setSearchQuery] = useState('')
  const [selectedCategory, setSelectedCategory] = useState('All')
  const [selectedLevel, setSelectedLevel] = useState('All')
  const [sortBy, setSortBy] = useState<'rating' | 'students' | 'duration' | 'trending'>('rating')
  const [courses, setCourses] = useState<Course[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const fetchCourses = useCallback(async () => {
    try {
      setIsLoading(true)
      setError(null)
      
      let response;
      if (sortBy === 'trending') {
        response = await libraryService.getTrendingCourses()
      } else {
        const ordering = sortBy === 'rating' ? '-average_rating' : 
                        sortBy === 'students' ? '-enrollment_count' : 'duration'
        
        response = await libraryService.getCourses({
          category: selectedCategory === 'All' ? undefined : selectedCategory,
          difficulty: selectedLevel === 'All' ? undefined : selectedLevel,
          search: searchQuery || undefined,
          ordering
        })
      }
      
      setCourses(response.data)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load courses')
      console.error('[LibraryPage] Failed to fetch courses:', err)
    } finally {
      setIsLoading(false)
    }
  }, [selectedCategory, selectedLevel, searchQuery, sortBy])

  useEffect(() => {
    const controller = new AbortController()
    fetchCourses().then(() => { 
      if (controller.signal.aborted) return 
    })
    return () => controller.abort()
  }, [fetchCourses])

  return (
    <>
      <SEO
        title="Course Library - LearningHub"
        description="Browse our comprehensive library of courses"
        keywords="courses, library, learning, education"
      />
      
      <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-2">
              Course Library
            </h1>
            <p className="text-gray-600 dark:text-gray-400">
              {isLoading ? 'Loading courses...' : `Explore ${courses.length}+ courses across various categories`}
            </p>
          </div>
          <div className="flex gap-2">
            <Button 
              variant={sortBy === 'trending' ? 'primary' : 'outline'} 
              leftIcon={<TrendingUp className="w-4 h-4" />}
              onClick={() => setSortBy('trending')}
              disabled={isLoading}
            >
              Trending
            </Button>
            <Button 
              variant={sortBy === 'rating' ? 'primary' : 'outline'} 
              leftIcon={<Star className="w-4 h-4" />}
              onClick={() => setSortBy('rating')}
              disabled={isLoading}
            >
              Top Rated
            </Button>
          </div>
        </div>

        {/* Error State */}
        {error && (
          <Card className="p-6 border-red-200 dark:border-red-900 bg-red-50 dark:bg-red-900/10">
            <div className="flex items-center gap-3">
              <AlertCircle className="w-5 h-5 text-red-500" />
              <div className="flex-1">
                <p className="text-red-700 dark:text-red-400">{error}</p>
              </div>
              <Button 
                variant="outline" 
                size="sm" 
                leftIcon={<RefreshCw className="w-4 h-4" />}
                onClick={fetchCourses}
              >
                Retry
              </Button>
            </div>
          </Card>
        )}

        {/* Search and Filters */}
        <Card className="p-4">
          <div className="flex flex-col lg:flex-row gap-4">
            {/* Search */}
            <div className="flex-1">
              <Input
                placeholder="Search courses..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                leftIcon={<Search className="w-4 h-4" />}
                fullWidth
              />
            </div>

            {/* Category Filter */}
            <div className="flex gap-2 flex-wrap">
              {categories.map(category => (
                <button
                  key={category}
                  onClick={() => setSelectedCategory(category)}
                  className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${
                    selectedCategory === category
                      ? 'bg-primary-600 text-white'
                      : 'bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-700'
                  }`}
                >
                  {category}
                </button>
              ))}
            </div>

            {/* Level Filter */}
            <div className="flex gap-2 flex-wrap">
              {levels.map(level => (
                <button
                  key={level}
                  onClick={() => setSelectedLevel(level)}
                  className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${
                    selectedLevel === level
                      ? 'bg-primary-600 text-white'
                      : 'bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-700'
                  }`}
                >
                  {level}
                </button>
              ))}
            </div>

            {/* Sort */}
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value as any)}
              className="px-4 py-2 rounded-lg bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300 border-0 focus:ring-2 focus:ring-primary-500"
            >
              <option value="rating">Sort by Rating</option>
              <option value="students">Sort by Students</option>
              <option value="duration">Sort by Duration</option>
              <option value="trending">Trending</option>
            </select>
          </div>
        </Card>

        {/* Loading State */}
        {isLoading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {[...Array(6)].map((_, i) => (
              <Card key={i} className="overflow-hidden">
                <div className="aspect-video bg-gray-200 dark:bg-gray-700 animate-pulse" />
                <div className="p-4 space-y-3">
                  <div className="flex gap-2">
                    <div className="h-5 w-16 bg-gray-200 dark:bg-gray-700 rounded-full animate-pulse" />
                    <div className="h-5 w-20 bg-gray-200 dark:bg-gray-700 rounded-full animate-pulse" />
                  </div>
                  <div className="h-5 bg-gray-200 dark:bg-gray-700 rounded animate-pulse" />
                  <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded animate-pulse w-3/4" />
                  <div className="flex gap-4 pt-2">
                    <div className="h-4 w-12 bg-gray-200 dark:bg-gray-700 rounded animate-pulse" />
                    <div className="h-4 w-16 bg-gray-200 dark:bg-gray-700 rounded animate-pulse" />
                    <div className="h-4 w-14 bg-gray-200 dark:bg-gray-700 rounded animate-pulse" />
                  </div>
                </div>
              </Card>
            ))}
          </div>
        ) : (
          <>
            {/* Course Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {courses.map(course => (
                <Card
                  key={course.id}
                  hover
                  className="overflow-hidden cursor-pointer focus:outline-none focus:ring-2 focus:ring-primary-500"
                  onClick={() => navigate(`/course/${course.slug}`)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' || e.key === ' ') {
                      e.preventDefault()
                      navigate(`/course/${course.slug}`)
                    }
                  }}
                  tabIndex={0}
                  role="button"
                  aria-label={`View course: ${course.title}`}
                >
                  {/* Course Thumbnail */}
                  <div className="aspect-video bg-gradient-to-br from-primary-500 to-purple-600 flex items-center justify-center">
                    {course.thumbnail ? (
                      <img 
                        src={course.thumbnail} 
                        alt={course.title}
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <BookOpen className="w-16 h-16 text-white/80" />
                    )}
                  </div>

                  {/* Course Content */}
                  <div className="p-4 space-y-3">
                    <div className="flex items-center gap-2">
                      <span className="px-2 py-1 text-xs font-medium rounded-full bg-primary-50 dark:bg-primary-900/20 text-primary-600 dark:text-primary-400">
                        {course.category?.name || 'General'}
                      </span>
                      <span className="px-2 py-1 text-xs font-medium rounded-full bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400">
                        {course.level}
                      </span>
                      {course.is_free && (
                        <span className="px-2 py-1 text-xs font-medium rounded-full bg-green-100 dark:bg-green-900/20 text-green-600 dark:text-green-400">
                          Free
                        </span>
                      )}
                    </div>

                    <h3 className="font-semibold text-gray-900 dark:text-white line-clamp-2">
                      {course.title}
                    </h3>

                    <p className="text-sm text-gray-600 dark:text-gray-400 line-clamp-2">
                      {course.short_description || course.description}
                    </p>

                    <div className="flex items-center gap-4 text-sm text-gray-500 dark:text-gray-400">
                      <div className="flex items-center gap-1">
                        <Star className="w-4 h-4 fill-yellow-400 text-yellow-400" />
                        <span className="font-medium">{course.average_rating?.toFixed(1) || '0.0'}</span>
                        <span className="text-xs text-gray-400">({course.review_count || 0})</span>
                      </div>
                      <div className="flex items-center gap-1">
                        <Users className="w-4 h-4" />
                        <span>{(course.enrollment_count || 0).toLocaleString()}</span>
                      </div>
                      <div className="flex items-center gap-1">
                        <Clock className="w-4 h-4" />
                        <span>{course.duration}</span>
                      </div>
                    </div>

                    <div className="flex items-center justify-between pt-3 border-t border-gray-200 dark:border-gray-700">
                      <span className="text-sm text-gray-600 dark:text-gray-400">
                        {course.instructor?.display_name || course.instructor?.username || 'Unknown'}
                      </span>
                      <div className="flex items-center gap-2">
                        {!course.is_free && (
                          <span className="text-sm font-medium text-primary-600 dark:text-primary-400">
                            ${course.price}
                          </span>
                        )}
                        <ChevronRight className="w-5 h-5 text-gray-400" />
                      </div>
                    </div>
                  </div>
                </Card>
              ))}
            </div>

            {/* No Results */}
            {courses.length === 0 && !error && (
              <div className="text-center py-12">
                <BookOpen className="w-16 h-16 text-gray-300 dark:text-gray-600 mx-auto mb-4" />
                <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">
                  No courses found
                </h3>
                <p className="text-gray-600 dark:text-gray-400">
                  Try adjusting your search or filters
                </p>
              </div>
            )}
          </>
        )}
      </div>
    </>
  )
}
