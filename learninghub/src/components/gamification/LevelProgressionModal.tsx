import { useEffect, useRef } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  Trophy,
  Zap,
  Flame,
  X,
  Lock,
  CheckCircle2,
  Sparkles,
  ArrowRight,
  ShieldCheck,
  TrendingUp,
} from 'lucide-react'
import {
  calculateLevelProgress,
  calculateStreakBonus,
  LEVEL_TIERS,
  formatXP,
} from '../../utils/number'
import { Button } from '../ui/Button'

interface Props {
  isOpen: boolean
  onClose: () => void
  currentXp: number
  streak?: number
}

export function LevelProgressionModal({ isOpen, onClose, currentXp, streak = 0 }: Props) {
  const modalRef = useRef<HTMLDivElement>(null)
  const progressDetails = calculateLevelProgress(currentXp)
  const streakBonus = calculateStreakBonus(streak)

  // Escape key handler & focus management
  useEffect(() => {
    if (!isOpen) return
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.preventDefault()
        onClose()
      }
    }
    document.addEventListener('keydown', handleKeyDown)
    modalRef.current?.focus()
    return () => document.removeEventListener('keydown', handleKeyDown)
  }, [isOpen, onClose])

  if (!isOpen) return null

  return (
    <AnimatePresence>
      <div
        className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6 overflow-y-auto"
        role="dialog"
        aria-modal="true"
        aria-labelledby="progression-modal-title"
      >
        {/* Backdrop */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={onClose}
          className="fixed inset-0 bg-black/60 backdrop-blur-md transition-opacity"
        />

        {/* Modal Window */}
        <motion.div
          ref={modalRef}
          tabIndex={-1}
          initial={{ opacity: 0, scale: 0.94, y: 16 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.94, y: 16 }}
          transition={{ duration: 0.22, ease: 'easeOut' }}
          className="relative w-full max-w-2xl bg-white dark:bg-slate-900 rounded-3xl shadow-2xl border border-gray-100 dark:border-slate-800 overflow-hidden z-10 my-8 focus:outline-none"
        >
          {/* Top Decorative Gradient Accent */}
          <div className={`h-2.5 w-full bg-gradient-to-r ${progressDetails.color}`} />

          {/* Header */}
          <div className="flex items-center justify-between p-6 pb-4 border-b border-gray-100 dark:border-slate-800/80">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-2xl bg-purple-50 dark:bg-purple-950/40 border border-purple-200/50 dark:border-purple-800/40 flex items-center justify-center text-purple-600 dark:text-purple-400">
                <Trophy className="w-5 h-5" />
              </div>
              <div>
                <h2
                  id="progression-modal-title"
                  className="text-lg sm:text-xl font-bold text-gray-900 dark:text-white flex items-center gap-2"
                >
                  Cognitive Mastery Matrix
                </h2>
                <p className="text-xs text-gray-500 dark:text-gray-400">
                  Canonical Quadratic XP Progression & Platform Tier Perks
                </p>
              </div>
            </div>

            <button
              onClick={onClose}
              className="p-2 rounded-xl text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 hover:bg-gray-100 dark:hover:bg-slate-800 transition-colors"
              aria-label="Close modal"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          <div className="p-6 space-y-6 max-h-[75vh] overflow-y-auto">
            {/* Current Level Status Hero Card */}
            <div className="p-5 rounded-2xl bg-gradient-to-br from-slate-50 to-purple-50/30 dark:from-slate-800/60 dark:to-purple-950/20 border border-purple-100/70 dark:border-purple-900/30">
              <div className="flex flex-col sm:flex-row items-center sm:items-start gap-4">
                {/* Level Icon Avatar */}
                <div className="relative">
                  <div className="w-20 h-20 rounded-2xl bg-white dark:bg-slate-800 shadow-md border-2 border-purple-300 dark:border-purple-700 flex items-center justify-center text-4xl select-none">
                    {progressDetails.badgeIcon}
                  </div>
                  <span className="absolute -bottom-2 -right-2 px-2 py-0.5 rounded-full text-[11px] font-black bg-gradient-to-r from-purple-600 to-indigo-600 text-white shadow-sm border border-white dark:border-slate-800">
                    Lv.{progressDetails.level}
                  </span>
                </div>

                {/* Level & Title Stats */}
                <div className="flex-1 text-center sm:text-left space-y-2 w-full">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1">
                    <div>
                      <h3 className="text-lg font-bold text-gray-900 dark:text-white">
                        {progressDetails.title}
                      </h3>
                      <p className="text-xs text-gray-500 dark:text-gray-400">
                        Tier Level {progressDetails.level} Scholar
                      </p>
                    </div>

                    <div className="flex items-center justify-center sm:justify-end gap-2 text-xs">
                      <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-amber-50 dark:bg-amber-950/40 text-amber-700 dark:text-amber-300 border border-amber-200/50 dark:border-amber-800/40 font-semibold">
                        <Zap className="w-3.5 h-3.5 text-amber-500" />
                        {formatXP(currentXp)} Lifetime XP
                      </span>

                      {streak > 0 && (
                        <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-orange-50 dark:bg-orange-950/40 text-orange-700 dark:text-orange-300 border border-orange-200/50 dark:border-orange-800/40 font-semibold">
                          <Flame className="w-3.5 h-3.5 text-orange-500" />
                          {streak}d ({streakBonus.toFixed(1)}x)
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Progress Bar & Thresholds */}
                  <div className="space-y-1.5 pt-1">
                    <div className="flex justify-between text-xs font-medium text-gray-600 dark:text-gray-300">
                      <span>
                        Current Progress: {progressDetails.xpInCurrentLevel} /{' '}
                        {progressDetails.xpRequiredForNextLevel} XP
                      </span>
                      <span className="font-bold text-purple-600 dark:text-purple-400">
                        {progressDetails.progressPercentage}%
                      </span>
                    </div>

                    <div
                      className="h-3 w-full bg-gray-200 dark:bg-slate-700 rounded-full overflow-hidden"
                      role="progressbar"
                      aria-valuenow={progressDetails.progressPercentage}
                      aria-valuemin={0}
                      aria-valuemax={100}
                      aria-label="Level progress"
                    >
                      <motion.div
                        initial={{ width: 0 }}
                        animate={{ width: `${progressDetails.progressPercentage}%` }}
                        transition={{ duration: 0.8, ease: 'easeOut' }}
                        className={`h-full rounded-full bg-gradient-to-r ${progressDetails.color}`}
                      />
                    </div>

                    <div className="flex justify-between text-[11px] text-gray-400 dark:text-gray-500">
                      <span>Base Lv.{progressDetails.level} ({progressDetails.currentLevelBaseXp} XP)</span>
                      <span>Next Lv.{progressDetails.level + 1} ({progressDetails.nextLevelThresholdXp} XP)</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Currently Active Perks */}
            <div className="space-y-3">
              <h4 className="text-xs font-bold uppercase tracking-wider text-gray-500 dark:text-gray-400 flex items-center gap-1.5">
                <ShieldCheck className="w-4 h-4 text-emerald-500" />
                Active Tier Perks Unlocked (Level {progressDetails.level})
              </h4>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
                {progressDetails.unlockedPerks.map((perk, i) => (
                  <div
                    key={i}
                    className="p-3 rounded-xl bg-emerald-50/60 dark:bg-emerald-950/20 border border-emerald-200/60 dark:border-emerald-800/40 flex items-start gap-2"
                  >
                    <CheckCircle2 className="w-4 h-4 text-emerald-600 dark:text-emerald-400 shrink-0 mt-0.5" />
                    <span className="text-xs font-medium text-emerald-900 dark:text-emerald-200">
                      {perk}
                    </span>
                  </div>
                ))}
              </div>
            </div>

            {/* Next Tier Perks Preview */}
            <div className="space-y-3">
              <h4 className="text-xs font-bold uppercase tracking-wider text-gray-500 dark:text-gray-400 flex items-center gap-1.5">
                <Sparkles className="w-4 h-4 text-purple-500" />
                Unlocks at Next Level (Level {progressDetails.level + 1})
              </h4>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
                {progressDetails.nextLevelPerks.map((perk, i) => (
                  <div
                    key={i}
                    className="p-3 rounded-xl bg-purple-50/40 dark:bg-purple-950/20 border border-purple-200/50 dark:border-purple-800/30 flex items-start gap-2"
                  >
                    <ArrowRight className="w-4 h-4 text-purple-500 shrink-0 mt-0.5" />
                    <span className="text-xs font-medium text-purple-900 dark:text-purple-200">
                      {perk}
                    </span>
                  </div>
                ))}
              </div>
            </div>

            {/* Progression Tiers Roadmap */}
            <div className="space-y-3">
              <h4 className="text-xs font-bold uppercase tracking-wider text-gray-500 dark:text-gray-400 flex items-center gap-1.5">
                <TrendingUp className="w-4 h-4 text-blue-500" />
                Mastery Tiers Roadmap
              </h4>
              <div className="space-y-2">
                {LEVEL_TIERS.map(tier => {
                  const isCurrent = tier.minLevel === progressDetails.level
                  const isUnlocked = progressDetails.level >= tier.minLevel
                  const minXp = tier.minLevel === 1 ? 0 : tier.minLevel * tier.minLevel * 100

                  return (
                    <div
                      key={tier.minLevel}
                      className={`p-3 rounded-xl border transition-all flex items-center justify-between gap-3 ${
                        isCurrent
                          ? 'bg-purple-50 dark:bg-purple-950/30 border-purple-300 dark:border-purple-700 shadow-sm'
                          : isUnlocked
                            ? 'bg-gray-50/60 dark:bg-slate-800/40 border-gray-200/60 dark:border-slate-800'
                            : 'bg-gray-50/30 dark:bg-slate-900/40 border-dashed border-gray-200 dark:border-slate-800 opacity-60'
                      }`}
                    >
                      <div className="flex items-center gap-3">
                        <span className="text-2xl select-none">{tier.badgeIcon}</span>
                        <div>
                          <div className="flex items-center gap-2">
                            <span className="text-xs font-bold text-gray-900 dark:text-white">
                              {tier.title}
                            </span>
                            {isCurrent && (
                              <span className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-purple-600 text-white uppercase tracking-wider">
                                Current
                              </span>
                            )}
                          </div>
                          <span className="text-[11px] text-gray-500 dark:text-gray-400">
                            Level {tier.minLevel}+ • Requires {minXp} XP
                          </span>
                        </div>
                      </div>

                      <div className="flex items-center gap-2">
                        {isUnlocked ? (
                          <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-emerald-600 dark:text-emerald-400">
                            <CheckCircle2 className="w-3.5 h-3.5" />
                            Unlocked
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-gray-400 dark:text-gray-500">
                            <Lock className="w-3.5 h-3.5" />
                            Locked
                          </span>
                        )}
                      </div>
                    </div>
                  )
                })}
              </div>
            </div>
          </div>

          {/* Modal Footer */}
          <div className="p-4 px-6 border-t border-gray-100 dark:border-slate-800 bg-gray-50/50 dark:bg-slate-900/50 flex justify-end">
            <Button variant="primary" onClick={onClose}>
              Got It
            </Button>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  )
}
