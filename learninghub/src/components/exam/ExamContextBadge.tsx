import React, { useState } from 'react'
import { motion } from 'framer-motion'
import { ChevronDown } from 'lucide-react'
import { useLearningContextStore } from '../../stores/useLearningContextStore'
import { ExamSelectorModal } from './ExamSelectorModal'

interface ExamContextBadgeProps {
  className?: string
  compact?: boolean
}

export const ExamContextBadge: React.FC<ExamContextBadgeProps> = ({
  className = '',
  compact = false,
}) => {
  const [isModalOpen, setIsModalOpen] = useState(false)
  const activeExam = useLearningContextStore(s => s.activeExam)
  const activeCountry = useLearningContextStore(s => s.activeCountry)
  const subjectIds = useLearningContextStore(s => s.subjectIds)
  const isConfigured = useLearningContextStore(s => s.isConfigured)

  const flagEmoji = activeCountry?.flagEmoji || '🎯'
  const examName = activeExam?.name || 'Select Target Exam'

  return (
    <>
      <motion.button
        type="button"
        whileHover={{ scale: 1.02 }}
        whileTap={{ scale: 0.98 }}
        onClick={() => setIsModalOpen(true)}
        aria-haspopup="dialog"
        aria-expanded={isModalOpen}
        aria-label={`Target Exam: ${examName}. Click to change.`}
        className={`inline-flex items-center gap-2 px-3 py-1.5 rounded-xl border text-xs font-semibold transition-all duration-200 select-none shadow-sm ${
          isConfigured
            ? 'bg-primary-50/70 hover:bg-primary-100/80 dark:bg-primary-950/40 dark:hover:bg-primary-900/50 border-primary-200/80 dark:border-primary-800/60 text-primary-900 dark:text-primary-100'
            : 'bg-amber-50/80 hover:bg-amber-100 dark:bg-amber-950/30 dark:hover:bg-amber-900/40 border-amber-300 dark:border-amber-700/60 text-amber-900 dark:text-amber-200 animate-pulse'
        } ${className}`}
      >
        <span className="text-sm shrink-0 leading-none">{isConfigured ? flagEmoji : '🎯'}</span>

        <div className="flex flex-col text-left">
          <div className="flex items-center gap-1.5">
            <span className="font-bold tracking-tight truncate max-w-[130px] sm:max-w-[180px]">
              {examName}
            </span>
            <ChevronDown className="w-3.5 h-3.5 text-slate-400 group-hover:text-slate-600 dark:text-slate-500 shrink-0" />
          </div>

          {!compact && isConfigured && subjectIds.length > 0 && (
            <span className="text-[10px] font-medium text-primary-600/80 dark:text-primary-400/80 leading-none">
              {subjectIds.length} {subjectIds.length === 1 ? 'subject' : 'subjects'} active
            </span>
          )}
        </div>
      </motion.button>

      <ExamSelectorModal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} />
    </>
  )
}
