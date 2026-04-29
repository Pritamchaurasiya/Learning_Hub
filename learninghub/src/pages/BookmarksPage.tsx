import { useState, useEffect, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import AnimatedPage from '../components/AnimatedPage'
import {
  Bookmark,
  BookOpen,
  Clock,
  Trash2,
  Search,
  Loader2,
  AlertCircle,
  RefreshCw
} from 'lucide-react'
import { useStore } from '../stores/useStore'
import { userService } from '../services/userService'

export interface BookmarkedCourse {
  id: string
  title: string
  description: string
  duration: string
  level: string
  progress_percent: number
  thumbnail?: string
  instructor?: string
  bookmark_id: string
  bookmarked_at: string
  notes?: string
}

export default function BookmarksPage() {
  const navigate = useNavigate()
  const { addToast } = useStore()
  
  const [bookmarks, setBookmarks] = useState<BookmarkedCourse[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const fetchBookmarks = useCallback(async (signal?: AbortSignal) => {
    try {
      setIsLoading(true)
      setError(null)
      const res = await userService.getBookmarks({ signal })
      if (!signal?.aborted) {
        setBookmarks(res.data || [])
      }
    } catch (err) {
      if (!(err instanceof DOMException && err.name === 'AbortError')) {
        setError(err instanceof Error ? err.message : 'Failed to load bookmarks')
        if (import.meta.env.DEV) {
          console.error('[BookmarksPage] Failed to fetch bookmarks:', err);
        }
      }
    } finally {
      if (!signal?.aborted) {
        setIsLoading(false)
      }
    }
  }, [])

  useEffect(() => {
    const controller = new AbortController()
    fetchBookmarks(controller.signal)
    return () => controller.abort()
  }, [fetchBookmarks])

  const handleRemoveBookmark = async (courseId: string) => {
    try {
      await userService.removeBookmark(courseId)
      addToast({ message: 'Bookmark removed successfully', type: 'success' })
      fetchBookmarks()
    } catch (err) {
      if (import.meta.env.DEV) {
        console.error('[BookmarksPage] Failed to remove bookmark:', err);
      }
      addToast({ message: 'Failed to remove bookmark', type: 'error' })
    }
  }

  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh]">
        <Loader2 className="w-12 h-12 animate-spin text-primary-600" />
        <p className="mt-4 text-gray-500">Loading bookmarks...</p>
      </div>
    )
  }

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] text-center">
        <AlertCircle className="w-12 h-12 text-red-500 mb-4" />
        <p className="text-lg text-gray-700 dark:text-gray-300 mb-4">{error}</p>
        <button
          onClick={() => fetchBookmarks()}
          className="flex items-center gap-2 px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition-colors"
        >
          <RefreshCw className="w-4 h-4" />
          Retry
        </button>
      </div>
    )
  }

  return (
    <AnimatedPage className="space-y-6">
      <div>
        <h1 className="text-2xl md:text-3xl font-bold mb-1 flex items-center gap-3">
          <div className="w-8 h-8 rounded-xl bg-primary-50 dark:bg-primary-900/20 flex items-center justify-center">
            <Bookmark className="w-4.5 h-4.5 text-primary-500" />
          </div>
          Bookmarks
        </h1>
        <p className="text-sm text-gray-500 dark:text-gray-400">
          {bookmarks.length} course{bookmarks.length !== 1 ? 's' : ''} saved for later
        </p>
      </div>

      {bookmarks.length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {bookmarks.map(course => {
            const isCompleted = course.progress_percent === 100

            return (
              <div key={course.id} className="card p-5 group">
                <div className="flex items-start justify-between mb-3">
                  <div
                    className="w-10 h-10 rounded-xl flex items-center justify-center cursor-pointer transition-transform duration-300 group-hover:scale-110 bg-primary-50 dark:bg-primary-900/20"
                    onClick={() => navigate(`/course/${course.id}`)}
                  >
                    <BookOpen className="w-5 h-5 text-primary-600" />
                  </div>
                  <div className="flex items-center gap-1">
                    {isCompleted && (
                      <span className="w-6 h-6 rounded-full bg-green-100 dark:bg-green-900/30 flex items-center justify-center" title="Completed">
                        <svg className="w-3.5 h-3.5 text-green-500" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
                          <polyline points="20 6 9 17 4 12" />
                        </svg>
                      </span>
                    )}
                    <button
                      onClick={(e) => {
                        e.stopPropagation()
                        handleRemoveBookmark(course.id)
                      }}
                      className="p-2 rounded-xl hover:bg-red-50 dark:hover:bg-red-900/10 text-gray-400 hover:text-red-500 transition-all duration-200"
                      title="Remove bookmark"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
                <div 
                  className="cursor-pointer focus:outline-none focus:ring-2 focus:ring-primary-500 rounded-xl"
                  role="button"
                  tabIndex={0}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' || e.key === ' ') {
                      e.preventDefault();
                      navigate(`/course/${course.id}`);
                    }
                  }}
                  onClick={() => navigate(`/course/${course.id}`)}
                  aria-label={`View bookmarked course: ${course.title}`}
                >
                  <h3 className="font-semibold text-base mb-2 group-hover:text-primary-600 dark:group-hover:text-primary-400 transition-colors line-clamp-1">
                    {course.title}
                  </h3>
                  <p className="text-sm text-gray-500 dark:text-gray-400 line-clamp-2 mb-4 leading-relaxed">
                    {course.description}
                  </p>
                  <div className="flex items-center justify-between text-sm">
                    <div className="flex items-center gap-1.5 text-gray-400">
                      <Clock className="w-3.5 h-3.5" />
                      <span className="text-xs">{course.duration}</span>
                    </div>
                    <span className="px-2.5 py-1 rounded-lg text-[11px] font-semibold uppercase tracking-wide bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400">
                      {course.level}
                    </span>
                  </div>
                </div>
              </div>
            )
          })}
        </div>
      ) : (
        <div className="text-center py-20 card-static border-dashed border-2 border-gray-200 dark:border-gray-700">
          <div className="w-20 h-20 bg-gray-50 dark:bg-gray-800 rounded-2xl flex items-center justify-center mx-auto mb-6">
            <Bookmark className="w-10 h-10 text-gray-200 dark:text-gray-700" />
          </div>
          <h3 className="text-xl font-semibold mb-2">Your bookmark shelf is empty</h3>
          <p className="text-sm text-gray-500 dark:text-gray-400 mb-8 max-w-sm mx-auto leading-relaxed">
            Save courses you're interested in and they'll appear here for quick access.
          </p>
          <button
            onClick={() => navigate('/search')}
            className="btn-primary flex items-center gap-2 mx-auto text-sm"
          >
            <Search className="w-4 h-4" />
            Explore Courses
          </button>
        </div>
      )}
    </AnimatedPage>
  )
}
