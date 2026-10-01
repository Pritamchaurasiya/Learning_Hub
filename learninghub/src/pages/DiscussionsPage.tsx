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
  Send,
  CornerDownRight,
} from 'lucide-react'
import { SEO } from '../components/SEO'
import { Button } from '../components/ui/Button'
import { Card } from '../components/ui/Card'
import { Skeleton } from '../components/ui/Skeleton'
import { Modal } from '../components/ui/Modal'
import AnimatedPage from '../components/AnimatedPage'
import { motion } from 'framer-motion'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { discussionService, type Discussion, type DiscussionReply } from '../services/discussionService'
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

  // Thread Creation State & Mutation
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false)
  const [newTitle, setNewTitle] = useState('')
  const [newCategory, setNewCategory] = useState('Computer Science')
  const [newTags, setNewTags] = useState('')
  const [newContent, setNewContent] = useState('')

  const createThreadMutation = useMutation({
    mutationFn: async () => {
      if (!newTitle.trim() || !newContent.trim()) {
        throw new Error('Title and discussion content are required.')
      }
      const tags = newTags
        .split(',')
        .map(t => t.trim())
        .filter(Boolean)
      if (!tags.length && newCategory !== 'All') {
        tags.push(newCategory.toLowerCase().replace(/\s+/g, '-'))
      }
      return discussionService.createDiscussion({
        title: newTitle.trim(),
        content: newContent.trim(),
        tags: tags.length ? tags : ['general'],
      })
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['discussions'] })
      addToast({ message: 'Discussion thread created successfully!', type: 'success' })
      setIsCreateModalOpen(false)
      setNewTitle('')
      setNewContent('')
      setNewTags('')
    },
    onError: (err: unknown) => {
      addToast({
        message: err instanceof Error ? err.message : 'Failed to create discussion thread.',
        type: 'error',
      })
    },
  })

  // Thread Detail & Reply State & Queries
  const [selectedThread, setSelectedThread] = useState<Discussion | null>(null)
  const [replyContent, setReplyContent] = useState('')

  const {
    data: threadReplies = [],
    isLoading: isRepliesLoading,
    refetch: refetchReplies,
  } = useQuery({
    queryKey: ['discussionReplies', selectedThread?.id],
    queryFn: async () => {
      if (!selectedThread) return []
      const res = await discussionService.getReplies(selectedThread.id)
      return (res.data ?? []) as DiscussionReply[]
    },
    enabled: !!selectedThread,
  })

  const createReplyMutation = useMutation({
    mutationFn: async () => {
      if (!selectedThread || !replyContent.trim()) return
      return discussionService.createReply(selectedThread.id, {
        content: replyContent.trim(),
      })
    },
    onSuccess: () => {
      refetchReplies()
      queryClient.invalidateQueries({ queryKey: ['discussions'] })
      addToast({ message: 'Reply posted successfully!', type: 'success' })
      setReplyContent('')
    },
    onError: () => {
      addToast({ message: 'Failed to post reply. Please try again.', type: 'error' })
    },
  })

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

            <Button
              onClick={() => setIsCreateModalOpen(true)}
              className="rounded-[1.25rem] font-black uppercase tracking-widest text-[10px] py-4 px-8 shadow-xl shadow-primary-500/30 border-none bg-primary-600 hover:bg-primary-500 text-white"
            >
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
                // eslint-disable-next-line @typescript-eslint/no-explicit-any
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
                <Card
                  onClick={() => setSelectedThread(discussion)}
                  className="p-6 md:p-8 cursor-pointer overflow-hidden group hover:shadow-2xl transition-shadow duration-500 border-none rounded-[2rem] bg-white dark:bg-gray-900 relative"
                >
                  <div className="absolute top-0 right-0 p-8 opacity-0 group-hover:opacity-5 transition-opacity duration-500 pointer-events-none transform translate-x-4 -translate-y-4">
                    <MessageSquare className="w-48 h-48" />
                  </div>
                  <div className="flex gap-6 relative z-10">
                    {/* Author Avatar */}
                    <div className="w-14 h-14 rounded-[1.25rem] bg-gradient-to-br from-primary-400 to-indigo-600 flex items-center justify-center text-white font-black text-xl shadow-lg shadow-primary-500/20 flex-shrink-0 hidden sm:flex">
                      {(discussion.author?.display_name || discussion.author?.username || '?')
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
                          aria-label={
                            discussion.is_bookmarked
                              ? `Remove bookmark for ${discussion.title}`
                              : `Bookmark discussion ${discussion.title}`
                          }
                          aria-pressed={Boolean(discussion.is_bookmarked)}
                          className={`p-3 rounded-xl transition-all border ${
                            discussion.is_bookmarked
                              ? 'bg-primary-50 border-primary-200 text-primary-600 dark:bg-primary-900/20 dark:border-primary-900/50 dark:text-primary-400'
                              : 'bg-gray-50 border-gray-100 text-gray-400 dark:bg-gray-800 dark:border-gray-700 hover:bg-gray-100 dark:hover:bg-gray-700'
                          }`}
                        >
                          <Bookmark
                            aria-hidden="true"
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
                            {discussion.author?.display_name ||
                              discussion.author?.username ||
                              'Anonymous'}
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
                          aria-label={
                            discussion.user_vote === 1
                              ? `Remove upvote for ${discussion.title}`
                              : `Upvote ${discussion.title}`
                          }
                          aria-pressed={discussion.user_vote === 1}
                          className={`flex items-center gap-2 transition-colors ${discussion.user_vote === 1 ? 'text-emerald-500' : 'hover:text-gray-700 dark:hover:text-gray-200'}`}
                        >
                          <ThumbsUp
                            aria-hidden="true"
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

      {/* Initialize Thread Modal */}
      <Modal
        isOpen={isCreateModalOpen}
        onClose={() => setIsCreateModalOpen(false)}
        title="Initialize Discussion Thread"
        description="Share a problem, ask an algorithm question, or start a study discussion."
        size="lg"
      >
        <div className="space-y-4 py-2">
          <div>
            <label className="block text-xs font-black uppercase tracking-widest text-gray-700 dark:text-gray-300 mb-2">
              Thread Title *
            </label>
            <input
              type="text"
              placeholder="e.g., Optimal Approach for Dynamic Programming on Trees"
              value={newTitle}
              onChange={e => setNewTitle(e.target.value)}
              className="w-full px-4 py-3 rounded-xl border-2 border-gray-100 dark:border-gray-800 bg-gray-50 dark:bg-gray-800 text-gray-900 dark:text-white focus:border-primary-500 font-medium outline-none text-sm"
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-black uppercase tracking-widest text-gray-700 dark:text-gray-300 mb-2">
                Category
              </label>
              <select
                value={newCategory}
                onChange={e => setNewCategory(e.target.value)}
                className="w-full px-4 py-3 rounded-xl border-2 border-gray-100 dark:border-gray-800 bg-gray-50 dark:bg-gray-800 text-gray-900 dark:text-white focus:border-primary-500 font-medium outline-none text-sm"
              >
                {categories.filter(c => c !== 'All').map(cat => (
                  <option key={cat} value={cat}>
                    {cat}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-black uppercase tracking-widest text-gray-700 dark:text-gray-300 mb-2">
                Tags (comma-separated)
              </label>
              <input
                type="text"
                placeholder="trees, dp, recursion"
                value={newTags}
                onChange={e => setNewTags(e.target.value)}
                className="w-full px-4 py-3 rounded-xl border-2 border-gray-100 dark:border-gray-800 bg-gray-50 dark:bg-gray-800 text-gray-900 dark:text-white focus:border-primary-500 font-medium outline-none text-sm"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-black uppercase tracking-widest text-gray-700 dark:text-gray-300 mb-2">
              Discussion Content *
            </label>
            <textarea
              rows={5}
              placeholder="Describe your question or insight in detail. Include code snippets or test cases if relevant..."
              value={newContent}
              onChange={e => setNewContent(e.target.value)}
              className="w-full px-4 py-3 rounded-xl border-2 border-gray-100 dark:border-gray-800 bg-gray-50 dark:bg-gray-800 text-gray-900 dark:text-white focus:border-primary-500 font-medium outline-none text-sm resize-y"
            />
          </div>

          <div className="flex justify-end gap-3 pt-4 border-t border-gray-100 dark:border-gray-800">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setIsCreateModalOpen(false)}
            >
              Cancel
            </Button>
            <Button
              size="sm"
              disabled={createThreadMutation.isPending || !newTitle.trim() || !newContent.trim()}
              onClick={() => createThreadMutation.mutate()}
              className="bg-primary-600 hover:bg-primary-500 text-white font-bold"
            >
              {createThreadMutation.isPending ? 'Publishing...' : 'Publish Thread'}
            </Button>
          </div>
        </div>
      </Modal>

      {/* Discussion Thread Drilldown & Replies Modal */}
      <Modal
        isOpen={!!selectedThread}
        onClose={() => {
          setSelectedThread(null)
          setReplyContent('')
        }}
        title={selectedThread?.title || 'Discussion Thread'}
        size="xl"
      >
        {selectedThread && (
          <div className="space-y-6 py-2 max-h-[70vh] overflow-y-auto pr-2">
            {/* Thread Details Card */}
            <div className="p-5 rounded-2xl bg-gray-50 dark:bg-gray-800/60 border border-gray-100 dark:border-gray-800 space-y-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-primary-500/20 text-primary-500 font-bold flex items-center justify-center text-sm">
                  {(selectedThread.author?.display_name || selectedThread.author?.username || 'U')
                    .charAt(0)
                    .toUpperCase()}
                </div>
                <div>
                  <p className="text-sm font-bold text-gray-900 dark:text-white">
                    {selectedThread.author?.display_name || selectedThread.author?.username || 'Anonymous'}
                  </p>
                  <p className="text-xs text-gray-400">
                    Posted {formatTime(selectedThread.created_at)}
                  </p>
                </div>
              </div>

              <p className="text-sm text-gray-700 dark:text-gray-200 leading-relaxed whitespace-pre-wrap">
                {selectedThread.content}
              </p>

              <div className="flex flex-wrap gap-2 pt-2">
                {selectedThread.tags?.map(tag => (
                  <span
                    key={tag}
                    className="px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider rounded-lg bg-gray-200/50 dark:bg-gray-700 text-gray-600 dark:text-gray-300"
                  >
                    #{tag}
                  </span>
                ))}
              </div>
            </div>

            {/* Replies List */}
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <h4 className="text-xs font-black uppercase tracking-widest text-gray-500 flex items-center gap-2">
                  <CornerDownRight className="w-4 h-4" />
                  Community Replies ({threadReplies.length})
                </h4>
              </div>

              {isRepliesLoading ? (
                <div className="space-y-3">
                  <Skeleton className="h-20 w-full rounded-2xl" />
                  <Skeleton className="h-20 w-full rounded-2xl" />
                </div>
              ) : threadReplies.length === 0 ? (
                <div className="text-center py-8 rounded-2xl bg-gray-50 dark:bg-gray-800/40 text-gray-400 text-xs">
                  No replies yet. Share your insights to help solve this problem!
                </div>
              ) : (
                <div className="space-y-3">
                  {threadReplies.map((reply: DiscussionReply) => (
                    <div
                      key={reply.id}
                      className="p-4 rounded-xl bg-white dark:bg-gray-800 border border-gray-100 dark:border-gray-700 space-y-2 shadow-sm"
                    >
                      <div className="flex items-center justify-between text-xs text-gray-500">
                        <span className="font-bold text-gray-800 dark:text-gray-200">
                          {reply.author?.display_name || reply.author?.username || 'Peer Learner'}
                        </span>
                        <span>{formatTime(reply.created_at)}</span>
                      </div>
                      <p className="text-xs text-gray-700 dark:text-gray-300 leading-relaxed whitespace-pre-wrap">
                        {reply.content}
                      </p>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Post Reply Section */}
            <div className="space-y-3 pt-4 border-t border-gray-100 dark:border-gray-800">
              <label className="block text-xs font-black uppercase tracking-widest text-gray-700 dark:text-gray-300">
                Write a Reply
              </label>
              <textarea
                rows={3}
                placeholder="Type your response or advice..."
                value={replyContent}
                onChange={e => setReplyContent(e.target.value)}
                className="w-full px-4 py-3 rounded-xl border-2 border-gray-100 dark:border-gray-800 bg-gray-50 dark:bg-gray-800 text-gray-900 dark:text-white focus:border-primary-500 font-medium outline-none text-xs resize-y"
              />
              <div className="flex justify-end">
                <Button
                  size="sm"
                  disabled={createReplyMutation.isPending || !replyContent.trim()}
                  onClick={() => createReplyMutation.mutate()}
                  className="bg-primary-600 hover:bg-primary-500 text-white font-bold gap-2 text-xs"
                >
                  <Send className="w-3.5 h-3.5" />
                  {createReplyMutation.isPending ? 'Posting...' : 'Post Reply'}
                </Button>
              </div>
            </div>
          </div>
        )}
      </Modal>
    </AnimatedPage>
  )
}
