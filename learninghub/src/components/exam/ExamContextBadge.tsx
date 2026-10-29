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
        whileHover={{ scale: 1.03, y: -1 }}
        whileTap={{ scale: 0.97 }}
        onClick={() => setIsModalOpen(true)}
        aria-haspopup="dialog"
        aria-expanded={isModalOpen}
        aria-label={`Target Exam: ${examName}. Click to calibrate.`}
        className={`group relative inline-flex items-center gap-2 px-3 py-1.5 rounded-2xl border text-xs font-semibold transition-all duration-300 select-none shadow-sm backdrop-blur-xl ${
          isConfigured
            ? 'bg-gradient-to-r from-indigo-500/10 via-purple-500/10 to-indigo-500/5 hover:from-indigo-500/20 hover:to-purple-500/15 dark:from-indigo-950/50 dark:via-purple-950/30 dark:to-slate-900/50 border-indigo-200/70 dark:border-indigo-800/60 text-slate-900 dark:text-slate-100 shadow-indigo-500/5'
            : 'bg-gradient-to-r from-amber-500/15 via-orange-500/15 to-amber-500/10 border-amber-300 dark:border-amber-700/70 text-amber-950 dark:text-amber-200 shadow-amber-500/10 animate-pulse'
        } ${className}`}
      >
        {/* Glowing Indicator Beacon */}
        <span className="relative flex h-2 w-2 shrink-0">
          <span
            className={`animate-ping absolute inline-flex h-full w-full rounded-full opacity-75 ${
              isConfigured ? 'bg-emerald-400' : 'bg-amber-400'
            }`}
          />
          <span
            className={`relative inline-flex rounded-full h-2 w-2 ${
              isConfigured ? 'bg-emerald-500' : 'bg-amber-500'
            }`}
          />
        </span>

        <span className="text-sm shrink-0 leading-none select-none">{flagEmoji}</span>

        <div className="flex flex-col text-left">
          <div className="flex items-center gap-1">
            <span className="font-extrabold tracking-tight truncate max-w-[120px] sm:max-w-[170px] text-xs">
              {examName}
            </span>
            <ChevronDown className="w-3.5 h-3.5 text-slate-400 group-hover:text-indigo-500 dark:group-hover:text-indigo-400 group-hover:translate-y-0.5 transition-all shrink-0" />
          </div>

          {!compact && isConfigured && (
            <span className="text-[10px] font-bold text-indigo-600/90 dark:text-indigo-400/90 leading-none tracking-tight">
              {subjectIds.length > 0 ? `${subjectIds.length} Subjects Active` : 'Target Calibrated'}
            </span>
          )}
        </div>
      </motion.button>

      <ExamSelectorModal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} />
    </>
  )
}

