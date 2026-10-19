import React, { useState, useContext } from 'react'
import { useNavigate } from 'react-router-dom'
import { motion } from 'framer-motion'
import { QueryClientContext } from '@tanstack/react-query'
import { Code2, CheckCircle, Flame, Trophy, Zap, Star, ArrowUpRight } from 'lucide-react'
import { Card } from './Card'
import type { Problem } from '../../types/dsa'
import { cn } from '../../utils/cn'
import { problemService } from '../../services/problemService'
import { prefetchRoute } from '../../utils/routePrefetchRegistry'

const DIFFICULTY_COLORS = {
  EASY: 'text-emerald-500 bg-emerald-50 dark:bg-emerald-900/20 border-emerald-500/20',
  MEDIUM: 'text-amber-500 bg-amber-50 dark:bg-amber-900/20 border-amber-500/20',
  HARD: 'text-rose-500 bg-rose-50 dark:bg-rose-900/20 border-rose-500/20',
}

const DIFFICULTY_LABELS = {
  EASY: 'Beginner',
  MEDIUM: 'Intermediate',
  HARD: 'Expert',
}

interface ProblemCardProps {
  problem: Problem
  index: number
  isBookmarked?: boolean
  onToggleBookmark?: (problemId: string) => void
}

export const ProblemCard = React.memo(
  ({ problem, index, isBookmarked: initialBookmarked, onToggleBookmark }: ProblemCardProps) => {
    const navigate = useNavigate()
    const queryClient = useContext(QueryClientContext)
    const [bookmarked, setBookmarked] = useState<boolean>(() => {
      if (initialBookmarked !== undefined) return initialBookmarked
      return problemService.getBookmarks?.()?.includes(problem.id) ?? false
    })

    const handleBookmarkClick = (e: React.MouseEvent) => {
      e.stopPropagation()
      const next = problemService.toggleBookmark?.(problem.id) ?? false
      setBookmarked(next)
      if (onToggleBookmark) onToggleBookmark(problem.id)
    }

    const safeTags = problem.tags || []

    return (
      <motion.div
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: Math.min(index * 0.04, 0.4) }}
      >
        <Card
          className="cursor-pointer group border border-gray-100 dark:border-gray-800/80 shadow-sm hover:shadow-xl hover:border-primary-500/30 transition-all duration-300 rounded-3xl overflow-hidden bg-white dark:bg-gray-900/60 backdrop-blur-sm relative content-visibility-auto"
          onClick={() => navigate(`/problem/${problem.slug}`)}
          onPointerEnter={() => prefetchRoute(`/problem/${problem.slug}`, queryClient)}
          onTouchStart={() => prefetchRoute(`/problem/${problem.slug}`, queryClient)}
        >
          <div className="p-6">
            <div className="flex items-start justify-between mb-4">
              <div className="flex items-center gap-3 min-w-0">
                <div
                  className={cn(
                    'w-11 h-11 rounded-2xl flex items-center justify-center shrink-0 transition-transform group-hover:scale-105',
                    problem.user_status === 'SOLVED'
                      ? 'bg-emerald-100 dark:bg-emerald-950/60 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20'
                      : problem.user_status === 'ATTEMPTED'
                        ? 'bg-amber-100 dark:bg-amber-950/60 text-amber-600 dark:text-amber-400 border border-amber-500/20'
                        : 'bg-gray-100 dark:bg-gray-800 text-gray-400 border border-gray-700/30'
                  )}
                >
                  {problem.user_status === 'SOLVED' ? (
                    <CheckCircle className="w-5 h-5" />
                  ) : problem.user_status === 'ATTEMPTED' ? (
                    <Flame className="w-5 h-5 text-amber-500 animate-pulse" />
                  ) : (
                    <Code2 className="w-5 h-5" />
                  )}
                </div>
                <div className="min-w-0">
                  <h3 className="font-bold text-gray-900 dark:text-white line-clamp-1 tracking-tight group-hover:text-primary-500 transition-colors text-base">
                    {problem.title}
                  </h3>
                  <div className="flex items-center gap-2 mt-1">
                    <span
                      className={cn(
                        'text-[10px] font-black uppercase tracking-widest px-2.5 py-0.5 rounded-md border',
                        DIFFICULTY_COLORS[problem.difficulty]
                      )}
                    >
                      {DIFFICULTY_LABELS[problem.difficulty]}
                    </span>
                    {problem.user_status === 'SOLVED' && (
                      <span className="text-[10px] font-bold text-emerald-500 uppercase tracking-wider">
                        • Solved
                      </span>
                    )}
                  </div>
                </div>
              </div>

              <div className="flex items-center gap-1.5 shrink-0 ml-2">
                <button
                  type="button"
                  onClick={handleBookmarkClick}
                  className={cn(
                    'p-2 rounded-xl transition-all',
                    bookmarked
                      ? 'text-amber-400 bg-amber-400/10 hover:bg-amber-400/20'
                      : 'text-gray-400 hover:text-amber-400 hover:bg-gray-100 dark:hover:bg-gray-800'
                  )}
                  aria-label={bookmarked ? 'Remove bookmark' : 'Bookmark problem'}
                  title={bookmarked ? 'Bookmarked' : 'Bookmark this challenge'}
                >
                  <Star className={cn('w-4 h-4', bookmarked && 'fill-current')} />
                </button>
                <div className="w-8 h-8 rounded-xl bg-gray-50 dark:bg-gray-800 flex items-center justify-center text-gray-400 group-hover:bg-primary-500 group-hover:text-white transition-all opacity-0 group-hover:opacity-100 hidden sm:flex">
                  <ArrowUpRight className="w-4 h-4" />
                </div>
              </div>
            </div>

            <p className="text-xs sm:text-sm text-gray-500 dark:text-gray-400 line-clamp-2 mb-5 leading-relaxed font-normal">
              {problem.description}
            </p>

            <div className="flex items-center justify-between pt-4 border-t border-gray-100 dark:border-gray-800/60">
              <div className="flex flex-wrap gap-1.5 min-w-0">
                {safeTags.slice(0, 3).map((tag, tIdx) => (
                  <span
                    key={
                      typeof tag === 'string'
                        ? `${tag}-${tIdx}`
                        : tag.id || tag.name || `tag-${tIdx}`
                    }
                    className="px-2.5 py-1 text-[10px] font-semibold tracking-tight rounded-lg bg-gray-100 dark:bg-gray-800/80 text-gray-600 dark:text-gray-400 border border-gray-200/50 dark:border-gray-700/40 truncate max-w-[120px]"
                  >
                    {typeof tag === 'string' ? tag : tag.name}
                  </span>
                ))}
                {safeTags.length > 3 && (
                  <span className="px-1.5 py-1 text-[10px] font-bold text-gray-400">
                    +{safeTags.length - 3}
                  </span>
                )}
              </div>

              <div className="flex items-center gap-3 text-[11px] font-bold text-gray-400 tracking-wider shrink-0 ml-2">
                <span className="flex items-center gap-1 text-amber-500">
                  <Trophy className="w-3.5 h-3.5" />
                  {problem.points} XP
                </span>
                {problem.acceptance_rate != null && (
                  <span className="flex items-center gap-1 text-primary-500">
                    <Zap className="w-3.5 h-3.5" />
                    {Math.round(problem.acceptance_rate)}%
                  </span>
                )}
              </div>
            </div>
          </div>
        </Card>
      </motion.div>
    )
  }
)

ProblemCard.displayName = 'ProblemCard'
