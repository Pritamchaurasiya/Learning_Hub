import { useState, useEffect, useCallback } from 'react'
import { useDocumentTitle } from '../hooks/useDocumentTitle'
import { MessageSquare, ThumbsUp, Bookmark, Search, Plus, Clock, User, Hash } from 'lucide-react'
import { SEO } from '../components/SEO'
import { Button } from '../components/ui/Button'
import { Card } from '../components/ui/Card'
import { Input } from '../components/ui/Input'
import { discussionService, type Discussion } from '../services/discussionService'
import { useStore } from '../stores/useStore'

const categories = [
  'All',
  'Web Development',
  'Data Science',
  'Computer Science',
  'Mobile Development',
  'Cloud Computing',
]

export default function DiscussionsPage() {
  useDocumentTitle('Discussions')
  const [discussions, setDiscussions] = useState<Discussion[]>([])
  const [searchQuery, setSearchQuery] = useState('')
  const [selectedCategory, setSelectedCategory] = useState('All')
  const [sortBy, setSortBy] = useState<'recent' | 'popular' | 'most-replies'>('recent')
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const { addToast } = useStore()

  const fetchDiscussions = useCallback(
    async (signal?: AbortSignal) => {
      try {
        setIsLoading(true)
        setError(null)

        // Map sort to ordering param
        let ordering = '-created_at'
        if (sortBy === 'popular') ordering = '-like_count'
        if (sortBy === 'most-replies') ordering = '-reply_count'

        const res = await discussionService.getDiscussions({
          search: searchQuery || undefined,
          ordering,
          signal,
        })
        if (!signal?.aborted) {
          setDiscussions(res.data)
        }
      } catch (err) {
        if (!(err instanceof DOMException && err.name === 'AbortError')) {
          setError(err instanceof Error ? err.message : 'Failed to load discussions')
          if (import.meta.env.DEV) {
            console.error('[DiscussionsPage] Failed to fetch discussions:', err)
          }
        }
      } finally {
        if (!signal?.aborted) {
          setIsLoading(false)
        }
      }
    },
    [searchQuery, sortBy]
  )

  useEffect(() => {
    const controller = new AbortController()
    void fetchDiscussions(controller.signal)
    return () => controller.abort()
  }, [fetchDiscussions])

  const filteredDiscussions =
    selectedCategory === 'All'
      ? discussions
      : discussions.filter(
          d =>
            (d.course?.title?.toLowerCase().includes(selectedCategory.toLowerCase()) ?? false) ||
            (d.tags?.some(tag => tag.toLowerCase().includes(selectedCategory.toLowerCase())) ??
              false)
        )

  const toggleBookmark = async (id: string) => {
    try {
      // For now, just update local state as bookmark API is not in the service
      setDiscussions(prev =>
        prev.map(d => (d.id === id ? { ...d, is_bookmarked: !d.is_bookmarked } : d))
      )
    } catch (err) {
      if (import.meta.env.DEV) {
        console.error('[DiscussionsPage] Failed to toggle bookmark:', err)
      }
    }
  }

  // Vote on discussion
  const handleVote = useCallback(
    async (id: string, value: 1 | -1 | 0) => {
      try {
        const res = await discussionService.voteDiscussion(id, value)
        setDiscussions(prev =>
          prev.map(d =>
            d.id === id ? { ...d, like_count: res.like_count, user_vote: res.user_vote } : d
          )
        )
      } catch (err) {
        addToast({ message: 'Failed to vote on discussion', type: 'error' })
        if (import.meta.env.DEV) {
          console.error('[DiscussionsPage] Failed to vote:', err)
        }
      }
    },
    [addToast]
  )

  const formatTime = (timestamp: string) => {
    const date = new Date(timestamp)
    const now = new Date()
    const diffMs = now.getTime() - date.getTime()
    const diffMins = Math.floor(diffMs / 60000)
    const diffHours = Math.floor(diffMs / 3600000)
    const diffDays = Math.floor(diffMs / 86400000)

    if (diffMins < 1) return 'Just now'
    if (diffMins < 60) return `${diffMins}m ago`
    if (diffHours < 24) return `${diffHours}h ago`
    if (diffDays < 7) return `${diffDays}d ago`
    return date.toLocaleDateString()
  }

  return (
    <>
      <SEO
        title="Discussions - LearningHub"
        description="Join discussions with other learners"
        keywords="discussions, forum, community"
      />

      <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-2">Discussions</h1>
            <p className="text-gray-600 dark:text-gray-400">Connect with the community</p>
          </div>
          <Button leftIcon={<Plus className="w-4 h-4" />}>New Discussion</Button>
        </div>

        {/* Search and Filters */}
        <Card className="p-4">
          <div className="flex flex-col lg:flex-row gap-4">
            <div className="flex-1">
              <Input
                placeholder="Search discussions..."
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                leftIcon={<Search className="w-4 h-4" />}
                fullWidth
              />
            </div>
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
            <select
              value={sortBy}
              // eslint-disable-next-line @typescript-eslint/no-explicit-any
              onChange={e => setSortBy(e.target.value as any)}
              className="px-4 py-2 rounded-lg bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300 border-0 focus:ring-2 focus:ring-primary-500"
            >
              <option value="recent">Most Recent</option>
              <option value="popular">Most Popular</option>
              <option value="most-replies">Most Replies</option>
            </select>
          </div>
        </Card>

        {/* Loading State */}
        {isLoading && (
          <div className="space-y-4">
            {[1, 2, 3].map(i => (
              <Card key={i} className="p-6">
                <div className="flex gap-4">
                  <div className="w-12 h-12 rounded-full bg-gray-200 dark:bg-gray-700 animate-pulse flex-shrink-0 hidden sm:block" />
                  <div className="flex-1 space-y-3">
                    <div className="h-5 w-3/4 bg-gray-200 dark:bg-gray-700 rounded animate-pulse" />
                    <div className="h-4 w-full bg-gray-200 dark:bg-gray-700 rounded animate-pulse" />
                    <div className="h-4 w-5/6 bg-gray-200 dark:bg-gray-700 rounded animate-pulse" />
                    <div className="flex flex-wrap gap-2 pt-1">
                      <div className="h-6 w-16 bg-gray-200 dark:bg-gray-700 rounded animate-pulse" />
                      <div className="h-6 w-20 bg-gray-200 dark:bg-gray-700 rounded animate-pulse" />
                    </div>
                    <div className="flex flex-wrap gap-3 pt-2">
                      <div className="h-4 w-20 bg-gray-200 dark:bg-gray-700 rounded animate-pulse" />
                      <div className="h-4 w-16 bg-gray-200 dark:bg-gray-700 rounded animate-pulse" />
                      <div className="h-4 w-24 bg-gray-200 dark:bg-gray-700 rounded animate-pulse" />
                    </div>
                  </div>
                </div>
              </Card>
            ))}
          </div>
        )}

        {/* Error State */}
        {error && !isLoading && (
          <div className="text-center py-8 text-red-500">
            <p>{error}</p>
          </div>
        )}

        {/* Discussions List */}
        <div className="space-y-4">
          {filteredDiscussions.map(discussion => (
            <Card key={discussion.id} hover className="p-6 cursor-pointer">
              <div className="flex gap-4">
                {/* Author Avatar */}
                <div className="w-12 h-12 rounded-full bg-gradient-to-br from-primary-400 to-primary-600 flex items-center justify-center text-white font-bold flex-shrink-0 hidden sm:block">
                  {(discussion.author.display_name || discussion.author.username || '?').charAt(0)}
                </div>

                {/* Content */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-start justify-between gap-2 mb-2">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        {discussion.is_pinned && (
                          <span className="px-2 py-0.5 text-xs font-medium bg-yellow-100 dark:bg-yellow-900/20 text-yellow-600 dark:text-yellow-400 rounded">
                            Pinned
                          </span>
                        )}
                        <h3 className="font-semibold text-gray-900 dark:text-white">
                          {discussion.title}
                        </h3>
                      </div>
                      <p className="text-sm text-gray-600 dark:text-gray-400 line-clamp-2">
                        {discussion.content}
                      </p>
                    </div>
                    <Button
                      variant="ghost"
                      size="sm"
                      leftIcon={
                        <Bookmark
                          className={`w-4 h-4 ${discussion.is_bookmarked ? 'fill-current text-primary-600' : ''}`}
                        />
                      }
                      onClick={(e: React.MouseEvent) => {
                        e.stopPropagation()
                        void toggleBookmark(discussion.id)
                      }}
                    />
                  </div>

                  {/* Tags */}
                  <div className="flex flex-wrap gap-2 mb-3">
                    {discussion.tags.map(tag => (
                      <span
                        key={tag}
                        className="px-2 py-1 text-xs font-medium bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400 rounded flex items-center gap-1"
                      >
                        <Hash className="w-3 h-3" />
                        {tag}
                      </span>
                    ))}
                  </div>

                  {/* Meta */}
                  <div className="flex flex-wrap items-center gap-x-4 gap-y-2 text-sm text-gray-500 dark:text-gray-400">
                    <div className="flex items-center gap-1">
                      <User className="w-4 h-4" />
                      <span>{discussion.author.display_name || discussion.author.username}</span>
                    </div>
                    <div className="flex items-center gap-1">
                      <Clock className="w-4 h-4" />
                      <span>{formatTime(discussion.created_at)}</span>
                    </div>
                    <div className="flex items-center gap-1">
                      <MessageSquare className="w-4 h-4" />
                      <span>{discussion.reply_count} replies</span>
                    </div>
                    <button
                      onClick={(e: React.MouseEvent) => {
                        e.stopPropagation()
                        void handleVote(discussion.id, discussion.user_vote === 1 ? 0 : 1)
                      }}
                      className={`flex items-center gap-1 hover:text-primary-600 transition-colors ${discussion.user_vote === 1 ? 'text-primary-600' : ''}`}
                    >
                      <ThumbsUp className="w-4 h-4" />
                      <span>{discussion.like_count}</span>
                    </button>
                    <div className="flex items-center gap-1">
                      <span>{discussion.view_count} views</span>
                    </div>
                  </div>
                </div>
              </div>
            </Card>
          ))}
        </div>

        {/* No Discussions */}
        {filteredDiscussions.length === 0 && (
          <div className="text-center py-12">
            <MessageSquare className="w-16 h-16 text-gray-300 dark:text-gray-600 mx-auto mb-4" />
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">
              No discussions found
            </h3>
            <p className="text-gray-600 dark:text-gray-400">Try adjusting your search or filters</p>
          </div>
        )}
      </div>
    </>
  )
}
