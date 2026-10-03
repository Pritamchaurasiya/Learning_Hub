import React, { useState, useEffect, useCallback } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  RotateCw,
  Sparkles,
  Brain,
  AlertCircle,
  Bookmark,
  Clock,
  Zap,
} from 'lucide-react'
import type { SpacedCard, ReviewGrade } from '../../types/revision'
import { revisionService } from '../../services/revisionService'
import { MathRenderer } from '../MathRenderer'

interface SpacedRepetitionCardProps {
  card: SpacedCard
  onReview: (grade: ReviewGrade) => void
  isSubmitting?: boolean
  className?: string
}

export const SpacedRepetitionCard: React.FC<SpacedRepetitionCardProps> = ({
  card,
  onReview,
  isSubmitting = false,
  className = '',
}) => {
  const [isFlipped, setIsFlipped] = useState(false)
  const previews = revisionService.calculateReviewPreviews(card)

  // Reset flip state when card changes
  useEffect(() => {
    setIsFlipped(false)
  }, [card.id])

  const handleFlip = useCallback(() => {
    setIsFlipped(prev => !prev)
  }, [])

  // Keyboard shortcut listener
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Don't trigger if user is typing in an input
      if (['INPUT', 'TEXTAREA'].includes((e.target as HTMLElement).tagName)) {
        return
      }

      if (e.code === 'Space') {
        e.preventDefault()
        handleFlip()
      } else if (isFlipped && !isSubmitting) {
        if (e.key === '1') onReview(1)
        else if (e.key === '2') onReview(2)
        else if (e.key === '3') onReview(4) // Good
        else if (e.key === '4') onReview(5) // Easy
      }
    }

    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [handleFlip, isFlipped, isSubmitting, onReview])

  const getCardTypeBadge = () => {
    switch (card.card_type) {
      case 'MISTAKE':
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-bold bg-rose-500/10 text-rose-600 dark:text-rose-400 border border-rose-500/20">
            <AlertCircle className="w-3.5 h-3.5" /> Mistake Remediation
          </span>
        )
      case 'FORMULA':
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-bold bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20">
            <Zap className="w-3.5 h-3.5" /> Key Formula
          </span>
        )
      case 'CONCEPT':
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-bold bg-purple-500/10 text-purple-600 dark:text-purple-400 border border-purple-500/20">
            <Brain className="w-3.5 h-3.5" /> Core Concept
          </span>
        )
      default:
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-bold bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 border border-indigo-500/20">
            <Bookmark className="w-3.5 h-3.5" /> Question Recall
          </span>
        )
    }
  }

  const retentionPct = Math.round((card.retention_probability ?? 1.0) * 100)

  return (
    <div className={`w-full max-w-2xl mx-auto select-none ${className}`}>
      {/* 3D Flip Card Container */}
      <div
        className="relative min-h-[360px] md:min-h-[400px] w-full rounded-3xl cursor-pointer perspective-1000 group"
        onClick={handleFlip}
        role="button"
        tabIndex={0}
        aria-label={isFlipped ? 'Card back showing answer' : 'Card front showing question'}
        onKeyDown={e => {
          if (e.key === 'Enter') handleFlip()
        }}
      >
        <motion.div
          className="relative w-full h-full min-h-[360px] md:min-h-[400px] rounded-3xl transition-transform duration-500 transform-style-3d shadow-xl"
          animate={{ rotateY: isFlipped ? 180 : 0 }}
          transition={{ duration: 0.5, ease: 'easeInOut' }}
        >
          {/* FRONT FACE */}
          <div
            className={`absolute inset-0 w-full h-full min-h-[360px] md:min-h-[400px] p-6 md:p-8 rounded-3xl backface-hidden flex flex-col justify-between
              bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 shadow-lg ${
                isFlipped ? 'pointer-events-none' : ''
              }`}
          >
            {/* Top Bar */}
            <div className="flex items-center justify-between gap-3">
              <div className="flex items-center gap-2 flex-wrap">
                {getCardTypeBadge()}
                <span className="text-xs font-semibold px-2.5 py-1 rounded-full bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-300">
                  {card.topic}
                </span>
              </div>

              {/* Retention Strength Metric */}
              <div
                className="flex items-center gap-1.5 text-xs font-bold px-2.5 py-1 rounded-full bg-emerald-500/10 text-emerald-600 dark:text-emerald-400"
                title="Predicted memory retention level based on forgetting curve decay"
              >
                <Sparkles className="w-3.5 h-3.5" />
                <span>{retentionPct}% Retention</span>
              </div>
            </div>

            {/* Prompt Body */}
            <div className="py-6 my-auto text-center">
              <div className="text-lg md:text-xl font-bold text-gray-900 dark:text-white leading-relaxed">
                <MathRenderer text={card.front} />
              </div>
            </div>

            {/* Card Footer Cue */}
            <div className="flex items-center justify-between text-xs text-gray-400 pt-4 border-t border-gray-100 dark:border-gray-800/60">
              <div className="flex items-center gap-1.5">
                <Clock className="w-3.5 h-3.5 text-indigo-500" />
                <span>Interval: {card.interval_days}d · Reps: {card.repetitions}</span>
              </div>
              <div className="flex items-center gap-1 text-indigo-500 font-bold group-hover:underline">
                <RotateCw className="w-3.5 h-3.5" />
                <span>Click or Space to Flip</span>
              </div>
            </div>
          </div>

          {/* BACK FACE */}
          <div
            className={`absolute inset-0 w-full h-full min-h-[360px] md:min-h-[400px] p-6 md:p-8 rounded-3xl backface-hidden rotate-y-180 flex flex-col justify-between
              bg-gradient-to-br from-indigo-50/50 via-white to-purple-50/30 dark:from-gray-900 dark:via-gray-900 dark:to-indigo-950/20 border-2 border-indigo-500/30 shadow-2xl ${
                !isFlipped ? 'pointer-events-none' : ''
              }`}
          >
            {/* Header */}
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="text-xs uppercase tracking-wider font-extrabold text-indigo-600 dark:text-indigo-400">
                  Target Answer & Derivation
                </span>
              </div>
              <button
                type="button"
                onClick={e => {
                  e.stopPropagation()
                  handleFlip()
                }}
                className="text-xs text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 flex items-center gap-1 font-semibold"
              >
                <RotateCw className="w-3.5 h-3.5" /> Flip Back
              </button>
            </div>

            {/* Answer Content */}
            <div className="py-4 my-auto space-y-4 max-h-[220px] overflow-y-auto pr-2 custom-scrollbar">
              <div className="text-base md:text-lg font-bold text-gray-900 dark:text-white leading-relaxed">
                <MathRenderer text={card.back} />
              </div>

              {card.explanation && (
                <div className="p-3.5 rounded-2xl bg-white/70 dark:bg-gray-800/60 border border-indigo-100 dark:border-indigo-900/40 text-xs md:text-sm text-gray-600 dark:text-gray-300 leading-relaxed">
                  <div className="font-semibold text-indigo-600 dark:text-indigo-400 mb-1 flex items-center gap-1.5">
                    <Brain className="w-3.5 h-3.5" /> Scaffolding & Context
                  </div>
                  <MathRenderer text={card.explanation} />
                </div>
              )}
            </div>

            {/* Review Action Prompt */}
            <div className="text-center text-xs font-semibold text-gray-400">
              Rate your active recall difficulty below
            </div>
          </div>
        </motion.div>
      </div>

      {/* Review Grading Control Bar (Visible when flipped) */}
      <AnimatePresence>
        {isFlipped && (
          <motion.div
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 10 }}
            className="mt-6 p-4 rounded-3xl bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 shadow-xl"
          >
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
              {previews.map(preview => (
                <button
                  key={preview.grade}
                  disabled={isSubmitting}
                  onClick={() => onReview(preview.grade)}
                  className={`flex flex-col items-center justify-center p-3 rounded-2xl border transition-all duration-200 active:scale-95 disabled:opacity-50 ${preview.color}`}
                >
                  <span className="text-sm font-extrabold flex items-center gap-1">
                    {preview.label}
                  </span>
                  <span className="text-[11px] font-bold opacity-75 mt-0.5">
                    +{preview.sublabel}
                  </span>
                  <span className="text-[9px] font-mono opacity-50 mt-1 uppercase tracking-wider">
                    Key [{preview.grade === 4 ? '3' : preview.grade === 5 ? '4' : preview.grade}]
                  </span>
                </button>
              ))}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}
