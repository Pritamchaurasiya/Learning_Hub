import { useState, useMemo } from 'react'
import { useDocumentTitle } from '../hooks/useDocumentTitle'
import {
  MessageSquare,
  ThumbsUp,
  Bookmark,
  Search,
  Plus,
  Clock,
  User,
  Hash,
  AlertTriangle,
  Flame,
  TrendingUp,
} from 'lucide-react'
import { SEO } from '../components/SEO'
import { Button } from '../components/ui/Button'
import { Card } from '../components/ui/Card'
import { Skeleton } from '../components/ui/Skeleton'
import AnimatedPage from '../components/AnimatedPage'
import { motion } from 'framer-motion'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { discussionService, type Discussion } from '../services/discussionService'
import { useStore } from '../stores/useStore'
import { useDebounce } from '../hooks/useDebounce'

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
  const [searchQuery, setSearchQuery] = useState('')
  const debouncedSearch = useDebounce(searchQuery, 300)
  const [selectedCategory, setSelectedCategory] = useState('All')
  const [sortBy, setSortBy] = useState<'recent' | 'popular' | 'most-replies'>('recent')
  const addToast = useStore(state => state.addToast)
  const queryClient = useQueryClient()

  const ordering = useMemo(() => {
    if (sortBy === 'popular') return '-like_count'
    if (sortBy === 'most-replies') return '-reply_count'
    return '-created_at'
  }, [sortBy])

  const {
    data: discussions = [],
    isLoading,
    error,
    refetch,
  } = useQuery({
    queryKey: ['discussions', { search: debouncedSearch, ordering }],
    queryFn: async () => {
      const res = await discussionService.getDiscussions({
        search: debouncedSearch || undefined,
        ordering,
      })
      return res.data || []
    },
    staleTime: 5 * 60 * 1000,
  })

  const filteredDiscussions = useMemo(() => {
    if (selectedCategory === 'All') return discussions
    return discussions.filter(
      d =>
        (d.course?.title?.toLowerCase().includes(selectedCategory.toLowerCase()) ?? false) ||
        (d.tags?.some(tag => tag.toLowerCase().includes(selectedCategory.toLowerCase())) ?? false)
    )
  }, [discussions, selectedCategory])

  const voteMutation = useMutation({
    mutationFn: async ({ id, value }: { id: string; value: 1 | -1 | 0 }) => {
      return discussionService.voteDiscussion(id, value)
    },
    onMutate: async ({ id, value }) => {
      await queryClient.cancelQueries({
        queryKey: ['discussions', { search: debouncedSearch, ordering }],
      })
      const previous = queryClient.getQueryData<Discussion[]>([
        'discussions',
        { search: debouncedSearch, ordering },
      ])

      queryClient.setQueryData(
        ['discussions', { search: debouncedSearch, ordering }],
        (old: Discussion[] | undefined) => {
          if (!old) return []
          return old.map(d => {
            if (d.id === id) {
              let newLikeCount = d.like_count
              if (d.user_vote === 1) newLikeCount--
              if (d.user_vote === -1) newLikeCount++
              if (value === 1) newLikeCount++
              if (value === -1) newLikeCount--
              return { ...d, user_vote: value, like_count: newLikeCount }
            }
            return d
          })
        }
      )

      return { previous }
    },
    onError: (_err, _vars, context) => {
      if (context?.previous) {
        queryClient.setQueryData(
          ['discussions', { search: debouncedSearch, ordering }],
          context.previous
        )
      }
      addToast({ message: 'Vote transmission failed', type: 'error' })
    },
  })

  // Bookmark toggling is local for now as per original code
  const toggleBookmarkMutation = useMutation({
    mutationFn: async (id: string) => {
      return id
    },
    onMutate: async id => {
      await queryClient.cancelQueries({
        queryKey: ['discussions', { search: debouncedSearch, ordering }],
      })
      queryClient.setQueryData(
        ['discussions', { search: debouncedSearch, ordering }],
        (old: Discussion[] | undefined) => {
          if (!old) return []
          return old.map(d => (d.id === id ? { ...d, is_bookmarked: !d.is_bookmarked } : d))
        }
      )
    },
  })

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
    <AnimatedPage className="pb-12 pt-4">
      <SEO
        title="Discussions - LearningHub"
        description="Join discussions with other learners"
        keywords="discussions, forum, community"
      />

      <div className="max-w-6xl mx-auto space-y-10">
        {/* Header */}
        <section className="relative overflow-hidden rounded-[2.5rem] bg-gray-900 text-white p-8 md:p-12 shadow-2xl">
          <div className="absolute top-0 right-0 p-12 opacity-5 pointer-events-none">
            <MessageSquare className="w-64 h-64 rotate-12 text-primary-500" />
          </div>

          <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-8">
            <div className="space-y-4">
              <div className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-primary-500/20 text-primary-400 text-[10px] font-black uppercase tracking-widest border border-primary-500/30">
                <Flame className="w-4 h-4" /> Community Hub
              </div>
              <h1 className="text-4xl md:text-5xl font-black tracking-tighter leading-none">
                Discussions
              </h1>
              <p className="text-gray-400 max-w-lg font-medium text-lg leading-relaxed">
                Exchange knowledge, debug algorithms, and collaborate with peers across the network.
              </p>
            </div>

            <Button className="rounded-[1.25rem] font-black uppercase tracking-widest text-[10px] py-4 px-8 shadow-xl shadow-primary-500/30 border-none bg-primary-600 hover:bg-primary-500 text-white">
              <Plus className="w-4 h-4 mr-2" />
              Initialize Thread
            </Button>
          </div>
        </section>

        {/* Search and Filters */}
        <Card className="p-4 md:p-6 rounded-[2rem] shadow-xl border-none bg-white dark:bg-gray-900 relative z-20">
          <div className="flex flex-col lg:flex-row gap-4">
            <div className="flex-1 relative">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
              <input
                type="text"
                placeholder="Search database..."
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                className="w-full pl-12 pr-4 py-4 border-2 border-gray-100 dark:border-gray-800 rounded-2xl bg-gray-50 dark:bg-gray-800/50 text-gray-900 dark:text-white focus:ring-4 focus:ring-primary-500/20 focus:border-primary-500 transition-all font-medium placeholder:text-gray-400 outline-none"
              />
            </div>
            <div className="flex gap-2 overflow-x-auto pb-2 lg:pb-0 scrollbar-none flex-nowrap lg:flex-wrap items-center">
              {categories.map(category => (
                <button
                  key={category}
                  onClick={() => setSelectedCategory(category)}
                  className={`px-5 py-3 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all whitespace-nowrap ${
                    selectedCategory === category
                      ? 'bg-primary-600 text-white shadow-md shadow-primary-500/20'
                      : 'bg-gray-50 dark:bg-gray-800 text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700'
                  }`}
                >
                  {category}
                </button>
              ))}
            </div>
            <div className="relative shrink-0">
              <TrendingUp className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" />
              <select
                value={sortBy}
                onChange={e => setSortBy(e.target.value as any)}
                className="appearance-none pl-12 pr-8 py-4 border-2 border-gray-100 dark:border-gray-800 rounded-2xl bg-gray-50 dark:bg-gray-800/50 text-gray-900 dark:text-white focus:ring-4 focus:ring-primary-500/20 focus:border-primary-500 font-black text-[10px] uppercase tracking-widest cursor-pointer outline-none w-full lg:w-auto"
              >
                <option value="recent">Chronological</option>
                <option value="popular">Top Rated</option>
                <option value="most-replies">High Activity</option>
              </select>
            </div>
          </div>
        </Card>

        {/* Loading State */}
        {isLoading && (
          <div className="space-y-6">
            {[1, 2, 3].map(i => (
              <Card
                key={i}
                className="p-8 rounded-[2rem] border-none shadow-md bg-white dark:bg-gray-900"
              >
                <div className="flex gap-6">
                  <Skeleton className="w-14 h-14 rounded-[1.25rem] hidden sm:block" />
                  <div className="flex-1 space-y-4">
                    <Skeleton className="h-6 w-3/4" />
                    <Skeleton className="h-4 w-full" />
                    <Skeleton className="h-4 w-5/6" />
                    <div className="flex gap-3 pt-2">
                      <Skeleton className="h-8 w-24 rounded-xl" />
                      <Skeleton className="h-8 w-32 rounded-xl" />
                    </div>
                  </div>
                </div>
              </Card>
            ))}
          </div>
        )}

        {/* Error State */}
        {error && !isLoading && (
          <Card className="p-16 text-center border-none shadow-xl rounded-[2.5rem] bg-white dark:bg-gray-900">
            <div className="w-24 h-24 rounded-[1.5rem] bg-rose-50 dark:bg-rose-900/20 flex items-center justify-center mx-auto mb-6 shadow-inner">
              <AlertTriangle className="w-10 h-10 text-rose-500" />
            </div>
            <h2 className="text-2xl font-black text-gray-900 dark:text-white mb-2 uppercase tracking-tight">
              Connection Severed
            </h2>
            <p className="text-[10px] font-bold text-gray-500 uppercase tracking-widest mb-8">
              Failed to download threads from the network.
            </p>
            <Button
              onClick={() => refetch()}
              className="px-8 py-4 rounded-xl font-black uppercase tracking-widest text-[10px]"
            >
              Retry Connection
            </Button>
          </Card>
        )}

        {/* Discussions List */}
        {!isLoading && !error && (
          <div className="space-y-6">
            {filteredDiscussions.map(discussion => (
              <motion.div
                key={discussion.id}
                whileHover={{ y: -4 }}
                transition={{ type: 'spring', stiffness: 300, damping: 20 }}
              >
                <Card className="p-6 md:p-8 cursor-pointer overflow-hidden group hover:shadow-2xl transition-shadow duration-500 border-none rounded-[2rem] bg-white dark:bg-gray-900 relative">
                  <div className="absolute top-0 right-0 p-8 opacity-0 group-hover:opacity-5 transition-opacity duration-500 pointer-events-none transform translate-x-4 -translate-y-4">
                    <MessageSquare className="w-48 h-48" />
                  </div>
                  <div className="flex gap-6 relative z-10">
                    {/* Author Avatar */}
                    <div className="w-14 h-14 rounded-[1.25rem] bg-gradient-to-br from-primary-400 to-indigo-600 flex items-center justify-center text-white font-black text-xl shadow-lg shadow-primary-500/20 flex-shrink-0 hidden sm:flex">
                      {(discussion.author.display_name || discussion.author.username || '?')
                        .charAt(0)
                        .toUpperCase()}
                    </div>

                    {/* Content */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-start justify-between gap-4 mb-3">
                        <div className="flex-1">
                          <div className="flex items-center gap-3 mb-2 flex-wrap">
                            {discussion.is_pinned && (
                              <span className="px-3 py-1 text-[9px] font-black uppercase tracking-widest bg-yellow-50 dark:bg-yellow-900/20 text-yellow-600 dark:text-yellow-400 rounded-xl border border-yellow-200 dark:border-yellow-900/50">
                                Pinned
                              </span>
                            )}
                            <h3 className="text-xl font-black text-gray-900 dark:text-white tracking-tight leading-tight group-hover:text-primary-600 transition-colors">
                              {discussion.title}
                            </h3>
                          </div>
                          <p className="text-sm font-medium text-gray-500 dark:text-gray-400 line-clamp-2 leading-relaxed">
                            {discussion.content}
                          </p>
                        </div>
                        <button
                          onClick={e => {
                            e.stopPropagation()
                            toggleBookmarkMutation.mutate(discussion.id)
                          }}
                          className={`p-3 rounded-xl transition-all border ${
                            discussion.is_bookmarked
                              ? 'bg-primary-50 border-primary-200 text-primary-600 dark:bg-primary-900/20 dark:border-primary-900/50 dark:text-primary-400'
                              : 'bg-gray-50 border-gray-100 text-gray-400 dark:bg-gray-800 dark:border-gray-700 hover:bg-gray-100 dark:hover:bg-gray-700'
                          }`}
                        >
                          <Bookmark
                            className={`w-5 h-5 ${discussion.is_bookmarked ? 'fill-current' : ''}`}
                          />
                        </button>
                      </div>

                      {/* Tags */}
                      <div className="flex flex-wrap gap-2 mb-6">
                        {discussion.tags.map(tag => (
                          <span
                            key={tag}
                            className="px-3 py-1.5 text-[9px] font-black uppercase tracking-widest bg-gray-50 dark:bg-gray-800 text-gray-500 dark:text-gray-400 rounded-lg border border-gray-100 dark:border-gray-700 flex items-center gap-1.5"
                          >
                            <Hash className="w-3 h-3 text-gray-400" />
                            {tag}
                          </span>
                        ))}
                      </div>

                      {/* Meta */}
                      <div className="flex flex-wrap items-center gap-x-6 gap-y-3 text-[10px] font-black uppercase tracking-widest text-gray-400 bg-gray-50 dark:bg-gray-800/50 p-4 rounded-[1.25rem]">
                        <div className="flex items-center gap-2">
                          <User className="w-4 h-4" />
                          <span>
                            {discussion.author.display_name || discussion.author.username}
                          </span>
                        </div>
                        <div className="flex items-center gap-2">
                          <Clock className="w-4 h-4" />
                          <span>{formatTime(discussion.created_at)}</span>
                        </div>
                        <div className="flex items-center gap-2 text-primary-600 dark:text-primary-400 bg-primary-50 dark:bg-primary-900/20 px-3 py-1.5 rounded-lg">
                          <MessageSquare className="w-4 h-4" />
                          <span>{discussion.reply_count} Replies</span>
                        </div>
                        <button
                          onClick={(e: React.MouseEvent) => {
                            e.stopPropagation()
                            voteMutation.mutate({
                              id: discussion.id,
                              value: discussion.user_vote === 1 ? 0 : 1,
                            })
                          }}
                          className={`flex items-center gap-2 transition-colors ${discussion.user_vote === 1 ? 'text-emerald-500' : 'hover:text-gray-700 dark:hover:text-gray-200'}`}
                        >
                          <ThumbsUp
                            className={`w-4 h-4 ${discussion.user_vote === 1 ? 'fill-current' : ''}`}
                          />
                          <span>{discussion.like_count}</span>
                        </button>
                      </div>
                    </div>
                  </div>
                </Card>
              </motion.div>
            ))}
          </div>
        )}

        {/* No Discussions */}
        {!isLoading && !error && filteredDiscussions.length === 0 && (
          <Card className="text-center py-20 bg-gray-50 dark:bg-gray-900 border-none shadow-inner rounded-[2.5rem]">
            <div className="w-24 h-24 rounded-[1.5rem] bg-white dark:bg-gray-800 flex items-center justify-center mx-auto mb-6 shadow-sm border border-gray-100 dark:border-gray-700">
              <MessageSquare className="w-10 h-10 text-gray-300 dark:text-gray-600" />
            </div>
            <h3 className="text-xl font-black text-gray-900 dark:text-white mb-2 uppercase tracking-tight">
              No Threads Found
            </h3>
            <p className="text-[10px] font-bold text-gray-500 uppercase tracking-widest">
              Modify search parameters or initialize a new thread.
            </p>
          </Card>
        )}
      </div>
    </AnimatedPage>
  )
}
