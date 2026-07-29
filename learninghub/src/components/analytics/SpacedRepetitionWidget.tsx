import { useState, memo } from 'react'
import { motion } from 'framer-motion'
import {
  RotateCcw,
  Sparkles,
  CheckCircle2,
  Clock,
  ChevronRight,
  Brain,
  HelpCircle,
} from 'lucide-react'
import { Card } from '../ui/Card'
import type { SpacedRepetitionItem } from '../../services/analyticsService'

interface SpacedRepetitionWidgetProps {
  items?: SpacedRepetitionItem[]
  onItemReview?: (itemId: string, qualityRating: number) => void
  className?: string
}

const DEFAULT_REVIEW_ITEMS: SpacedRepetitionItem[] = [
  {
    id: 'sm-1',
    topicName: 'Bayesian Inference & Knowledge Tracing',
    subjectName: 'Adaptive Machine Learning',
    nextReview: new Date().toISOString(),
    intervalDays: 1,
  },
  {
    id: 'sm-2',
    topicName: 'Item Response Theory (2PL Models)',
    subjectName: 'Psychometrics & IRT',
    nextReview: new Date(Date.now() + 86400000).toISOString(),
    intervalDays: 3,
  },
  {
    id: 'sm-3',
    topicName: 'Fisher Information Matrix Calibration',
    subjectName: 'Adaptive Testing',
    nextReview: new Date(Date.now() + 172800000).toISOString(),
    intervalDays: 6,
  },
]

export const SpacedRepetitionWidget = memo(function SpacedRepetitionWidget({
  items,
  onItemReview,
  className = '',
}: SpacedRepetitionWidgetProps) {
  const activeItems = items && items.length > 0 ? items : DEFAULT_REVIEW_ITEMS
  const [currentIndex, setCurrentIndex] = useState(0)
  const [isFlipped, setIsFlipped] = useState(false)
  const [completedIds, setCompletedIds] = useState<string[]>([])

  const currentItem = activeItems[currentIndex]
  const isFinished = completedIds.length >= activeItems.length

  const handleRating = (rating: number) => {
    if (!currentItem) return
    setIsFlipped(false)
    setCompletedIds(prev => [...prev, currentItem.id])
    if (onItemReview) {
      onItemReview(currentItem.id, rating)
    }
    setTimeout(() => {
      if (currentIndex + 1 < activeItems.length) {
        setCurrentIndex(prev => prev + 1)
      }
    }, 200)
  }

  return (
    <Card className={`p-6 border-none shadow-xl bg-white dark:bg-gray-900 ${className}`}>
      {/* Widget Header */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-2.5">
          <div className="w-9 h-9 rounded-xl bg-indigo-50 dark:bg-indigo-950/50 flex items-center justify-center border border-indigo-100 dark:border-indigo-800/40">
            <Sparkles className="w-5 h-5 text-indigo-600 dark:text-indigo-400" />
          </div>
          <div>
            <h4 className="text-sm font-black tracking-wide uppercase text-gray-900 dark:text-white">
              SM-2 Spaced Flashcards
            </h4>
            <p className="text-[11px] font-medium text-gray-400">
              Optimal memory retention reviews
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 text-xs font-bold text-gray-500 bg-gray-50 dark:bg-gray-800 px-3 py-1.5 rounded-xl">
          <Clock className="w-3.5 h-3.5 text-indigo-500" />
          <span>
            {completedIds.length} / {activeItems.length} Reviewed
          </span>
        </div>
      </div>

      {/* Card Content Area */}
      {isFinished ? (
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          className="flex flex-col items-center justify-center p-8 text-center bg-indigo-50/50 dark:bg-indigo-950/20 rounded-2xl border border-indigo-100/50 dark:border-indigo-900/30"
        >
          <div className="w-14 h-14 rounded-2xl bg-indigo-500 text-white flex items-center justify-center shadow-lg shadow-indigo-500/30 mb-4">
            <CheckCircle2 className="w-8 h-8" />
          </div>
          <h5 className="text-base font-black text-gray-900 dark:text-white">
            Daily Spaced Queue Completed!
          </h5>
          <p className="text-xs font-medium text-gray-500 dark:text-gray-400 mt-1 max-w-xs">
            Your SuperMemo SM-2 memory retention index has been updated. Next decay review in 24h.
          </p>
          <button
            onClick={() => {
              setCompletedIds([])
              setCurrentIndex(0)
              setIsFlipped(false)
            }}
            className="mt-5 flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-black bg-white dark:bg-gray-800 text-indigo-600 dark:text-indigo-400 shadow-md hover:shadow-lg transition-all"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            Review Queue Again
          </button>
        </motion.div>
      ) : currentItem ? (
        <div className="space-y-5">
          {/* Flashcard 3D Frame */}
          <div className="perspective-1000 w-full min-h-[180px]">
            <motion.div
              onClick={() => setIsFlipped(!isFlipped)}
              animate={{ rotateY: isFlipped ? 180 : 0 }}
              transition={{ duration: 0.4, ease: 'easeOut' }}
              style={{ transformStyle: 'preserve-3d' }}
              className="w-full min-h-[180px] cursor-pointer rounded-2xl bg-gradient-to-br from-gray-50 to-gray-100 dark:from-gray-800/80 dark:to-gray-800 p-6 border border-gray-200/60 dark:border-gray-700/60 shadow-inner flex flex-col justify-between relative overflow-hidden"
            >
              {!isFlipped ? (
                // Front Side
                <div className="flex flex-col justify-between h-full space-y-4">
                  <div className="flex items-center justify-between">
                    <span className="px-2.5 py-1 rounded-lg text-[10px] font-black uppercase tracking-wider bg-indigo-100 dark:bg-indigo-900/50 text-indigo-600 dark:text-indigo-300">
                      {currentItem.subjectName}
                    </span>
                    <span className="text-[10px] font-bold text-gray-400 flex items-center gap-1">
                      <HelpCircle className="w-3 h-3 text-indigo-400" />
                      Click to flip answer
                    </span>
                  </div>

                  <div>
                    <h5 className="text-lg font-black text-gray-900 dark:text-white tracking-tight">
                      {currentItem.topicName}
                    </h5>
                    <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                      SM-2 Scheduled Review (Interval: {currentItem.intervalDays}d)
                    </p>
                  </div>

                  <div className="flex items-center justify-between text-[11px] font-bold text-indigo-600 dark:text-indigo-400 pt-2 border-t border-gray-200/50 dark:border-gray-700/40">
                    <span>Recall Concept Definition</span>
                    <ChevronRight className="w-4 h-4" />
                  </div>
                </div>
              ) : (
                // Back Side
                <div
                  style={{ transform: 'rotateY(180deg)' }}
                  className="flex flex-col justify-between h-full space-y-4"
                >
                  <div className="flex items-center justify-between">
                    <span className="px-2.5 py-1 rounded-lg text-[10px] font-black uppercase tracking-wider bg-emerald-100 dark:bg-emerald-900/50 text-emerald-600 dark:text-emerald-300 flex items-center gap-1">
                      <Brain className="w-3 h-3" />
                      Answer & Concept
                    </span>
                    <span className="text-[10px] font-bold text-gray-400">Rate your recall</span>
                  </div>

                  <div>
                    <p className="text-sm font-bold text-gray-800 dark:text-gray-200 leading-relaxed">
                      Core formulas and items for {currentItem.topicName} are verified with an ease
                      factor of 2.5 and scheduled memory decay protection.
                    </p>
                  </div>

                  <div className="text-[10px] font-semibold text-gray-400">
                    Select rating below to update SM-2 schedule
                  </div>
                </div>
              )}
            </motion.div>
          </div>

          {/* Rating Buttons */}
          <div className="grid grid-cols-4 gap-2 pt-1">
            <button
              onClick={() => handleRating(0)}
              className="py-2.5 px-2 rounded-xl text-[11px] font-black bg-rose-50 dark:bg-rose-950/40 text-rose-600 dark:text-rose-400 border border-rose-100 dark:border-rose-800/40 hover:bg-rose-100 transition-all"
            >
              Again (0)
            </button>
            <button
              onClick={() => handleRating(3)}
              className="py-2.5 px-2 rounded-xl text-[11px] font-black bg-amber-50 dark:bg-amber-950/40 text-amber-600 dark:text-amber-400 border border-amber-100 dark:border-amber-800/40 hover:bg-amber-100 transition-all"
            >
              Hard (3)
            </button>
            <button
              onClick={() => handleRating(4)}
              className="py-2.5 px-2 rounded-xl text-[11px] font-black bg-blue-50 dark:bg-blue-950/40 text-blue-600 dark:text-blue-400 border border-blue-100 dark:border-blue-800/40 hover:bg-blue-100 transition-all"
            >
              Good (4)
            </button>
            <button
              onClick={() => handleRating(5)}
              className="py-2.5 px-2 rounded-xl text-[11px] font-black bg-emerald-50 dark:bg-emerald-950/40 text-emerald-600 dark:text-emerald-400 border border-emerald-100 dark:border-emerald-800/40 hover:bg-emerald-100 transition-all"
            >
              Easy (5)
            </button>
          </div>
        </div>
      ) : null}
    </Card>
  )
})

export default SpacedRepetitionWidget
