import React from 'react'
import { useNavigate } from 'react-router-dom'
import { motion } from 'framer-motion'
import { BookOpen, Clock } from 'lucide-react'
import { cn } from '../../utils/cn'

export interface Course {
  id: string
  title: string
  description: string
  duration?: string
  estimatedTime?: number | string
  level?: string
  difficulty?: string
  phase?: string
}

interface CourseCardProps {
  course: Course
  phaseColor?: string
  index?: number
  isCompleted?: boolean
  isBookmarked?: boolean
  className?: string
  viewMode?: 'grid' | 'list'
}

export const CourseCard = React.memo(
  ({
    course,
    phaseColor = '#3b82f6',
    index = 0,
    isCompleted = false,
    isBookmarked = false,
    className,
    viewMode = 'grid',
  }: CourseCardProps) => {
    const navigate = useNavigate()

    const handleKeyDown = (e: React.KeyboardEvent) => {
      if (e.key === 'Enter' || e.key === ' ') {
        e.preventDefault()
        navigate(`/course/${course.id}`)
      }
    }

    const duration =
      course.duration ?? (course.estimatedTime ? `${course.estimatedTime} min` : 'N/A')
    const level = course.level ?? course.difficulty ?? 'All Levels'

    return (
      <motion.div
        className={cn(
          'card p-5 cursor-pointer group focus:outline-none focus-visible:ring-2 focus-visible:ring-primary-500 border border-gray-100 dark:border-gray-800 flex h-full',
          viewMode === 'list' ? 'flex-row gap-6 items-center' : 'flex-col',
          className
        )}
        aria-label={`View ${course.title} course - ${level} difficulty, ${duration} duration`}
        role="button"
        tabIndex={0}
        onKeyDown={handleKeyDown}
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: index * 0.05 + 0.5 }}
        whileHover={{
          y: -8,
          borderColor: `${phaseColor}40`,
          boxShadow: `0 20px 40px ${phaseColor}10`,
        }}
        onClick={() => navigate(`/course/${course.id}`)}
      >
        <div
          className={cn(
            viewMode === 'list' ? 'hidden sm:flex' : 'flex',
            'items-start justify-between mb-4 w-full'
          )}
        >
          <motion.div
            className="w-10 h-10 rounded-xl flex items-center justify-center shadow-sm shrink-0"
            style={{ backgroundColor: `${phaseColor}10` }}
            whileHover={{ scale: 1.1, rotate: 10 }}
          >
            <BookOpen className="w-5 h-5" style={{ color: phaseColor }} />
          </motion.div>

          <div className="flex gap-1.5 items-center">
            {isCompleted && (
              <span
                className="w-6 h-6 rounded-full bg-green-100 dark:bg-green-900/30 flex items-center justify-center"
                title="Completed"
              >
                <svg
                  className="w-3.5 h-3.5 text-green-500"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="3"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <polyline points="20 6 9 17 4 12" />
                </svg>
              </span>
            )}
            {isBookmarked && (
              <span className="text-primary-500 text-sm" title="Bookmarked">
                🔖
              </span>
            )}
          </div>
        </div>

        <div className={cn('flex flex-col flex-1', viewMode === 'list' ? 'justify-center' : '')}>
          <h3 className="font-bold text-base mb-2 group-hover:text-primary-600 dark:group-hover:text-primary-400 transition-colors line-clamp-1 tracking-tight">
            {course.title}
          </h3>
          <p
            className={cn(
              'text-sm text-gray-500 dark:text-gray-400 line-clamp-2 leading-relaxed',
              viewMode === 'list' ? 'mb-2' : 'mb-6'
            )}
          >
            {course.description}
          </p>

          <div
            className={cn(
              'flex items-center justify-between',
              viewMode === 'list'
                ? 'mt-2'
                : 'mt-auto pt-4 border-t border-gray-50 dark:border-gray-800/50'
            )}
          >
            <div className="flex items-center gap-3">
              <div className="flex items-center gap-1.5 text-gray-400">
                <Clock className="w-3.5 h-3.5" />
                <span className="text-xs">{duration}</span>
              </div>
              <span
                className="px-2.5 py-1 rounded-lg text-[11px] font-semibold uppercase tracking-wide shrink-0"
                style={{ backgroundColor: `${phaseColor}10`, color: phaseColor }}
              >
                {level}
              </span>
            </div>
          </div>
        </div>
      </motion.div>
    )
  }
)

CourseCard.displayName = 'CourseCard'
