import { useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Trophy, Sparkles, Zap, CheckCircle, ArrowRight } from 'lucide-react'
import { useStore } from '../../stores/useStore'
import { calculateLevelProgress } from '../../utils/number'
import { Button } from '../ui/Button'

export function LevelUpCelebrationModal() {
  const levelUpState = useStore(state => state.levelUpState)
  const closeLevelUpModal = useStore(state => state.closeLevelUpModal)

  useEffect(() => {
    if (!levelUpState?.isOpen) return
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.preventDefault()
        closeLevelUpModal()
      }
    }
    document.addEventListener('keydown', handleKeyDown)
    return () => document.removeEventListener('keydown', handleKeyDown)
  }, [levelUpState, closeLevelUpModal])

  if (!levelUpState?.isOpen) return null

  const { previousLevel, newLevel, xpGained } = levelUpState
  const newLevelDetails = calculateLevelProgress(newLevel * newLevel * 100)

  return (
    <AnimatePresence>
      <div
        className="fixed inset-0 z-50 flex items-center justify-center p-4 overflow-y-auto"
        role="dialog"
        aria-modal="true"
        aria-labelledby="levelup-title"
      >
        {/* Backdrop */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={closeLevelUpModal}
          className="fixed inset-0 bg-black/70 backdrop-blur-md transition-opacity"
        />

        {/* Modal Window */}
        <motion.div
          initial={{ opacity: 0, scale: 0.8, y: 24 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.8, y: 24 }}
          transition={{ type: 'spring', damping: 20, stiffness: 300 }}
          className="relative w-full max-w-md bg-white dark:bg-slate-900 rounded-3xl shadow-2xl border-2 border-purple-300 dark:border-purple-600 overflow-hidden z-10 text-center p-6 sm:p-8 space-y-6"
        >
          {/* Confetti / Particle Stars Background Animation */}
          <div className="absolute inset-0 pointer-events-none overflow-hidden opacity-30 dark:opacity-20">
            {[...Array(12)].map((_, i) => (
              <motion.div
                key={i}
                initial={{
                  x: '50%',
                  y: '50%',
                  scale: 0,
                  opacity: 1,
                }}
                animate={{
                  x: `${(Math.sin(i * 30) * 160 + 50).toFixed(0)}%`,
                  y: `${(Math.cos(i * 30) * 160 + 50).toFixed(0)}%`,
                  scale: [0, 1.2, 0.8],
                  opacity: [0, 1, 0.4],
                }}
                transition={{
                  duration: 2.5,
                  repeat: Infinity,
                  repeatType: 'reverse',
                  delay: i * 0.1,
                }}
                className="absolute w-3 h-3 rounded-full bg-gradient-to-r from-amber-400 to-purple-500"
              />
            ))}
          </div>

          {/* Glowing Trophy Header */}
          <div className="relative mx-auto w-24 h-24 rounded-3xl bg-gradient-to-br from-purple-500 to-indigo-600 p-1 shadow-lg shadow-purple-500/30 flex items-center justify-center">
            <div className="w-full h-full rounded-[22px] bg-white dark:bg-slate-900 flex items-center justify-center text-5xl select-none">
              {newLevelDetails.badgeIcon}
            </div>
            <motion.div
              animate={{ rotate: 360 }}
              transition={{ duration: 10, repeat: Infinity, ease: 'linear' }}
              className="absolute -top-2 -right-2 text-amber-400"
            >
              <Sparkles className="w-7 h-7" />
            </motion.div>
          </div>

          {/* Heading */}
          <div className="space-y-1.5 relative z-10">
            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-black uppercase tracking-widest bg-amber-100 dark:bg-amber-950/60 text-amber-700 dark:text-amber-300 border border-amber-300/60 dark:border-amber-700/50">
              <Zap className="w-3.5 h-3.5 fill-current" />
              Cognitive Breakthrough
            </span>
            <h2
              id="levelup-title"
              className="text-2xl sm:text-3xl font-extrabold text-gray-900 dark:text-white"
            >
              LEVEL UP!
            </h2>
            <p className="text-sm text-gray-600 dark:text-gray-300">
              You advanced to{' '}
              <span className="font-bold text-purple-600 dark:text-purple-400">
                Level {newLevel}: {newLevelDetails.title}
              </span>
            </p>
          </div>

          {/* Level Transition Pill */}
          <div className="flex items-center justify-center gap-4 p-3 rounded-2xl bg-gray-50 dark:bg-slate-800/60 border border-gray-100 dark:border-slate-800">
            <div className="text-center">
              <span className="text-[10px] font-semibold text-gray-400 uppercase tracking-wider block">
                From
              </span>
              <span className="text-base font-bold text-gray-500 dark:text-gray-400">
                Lv.{previousLevel}
              </span>
            </div>
            <ArrowRight className="w-5 h-5 text-purple-500 animate-pulse" />
            <div className="text-center">
              <span className="text-[10px] font-bold text-purple-600 dark:text-purple-400 uppercase tracking-wider block">
                To
              </span>
              <span className="text-lg font-black text-purple-600 dark:text-purple-400">
                Lv.{newLevel}
              </span>
            </div>
            {xpGained > 0 && (
              <div className="ml-2 pl-3 border-l border-gray-200 dark:border-slate-700 text-center">
                <span className="text-[10px] font-semibold text-gray-400 uppercase tracking-wider block">
                  Reward
                </span>
                <span className="text-xs font-bold text-amber-600 dark:text-amber-400">
                  +{xpGained} XP
                </span>
              </div>
            )}
          </div>

          {/* Unlocked Capabilities */}
          <div className="text-left space-y-2">
            <h4 className="text-xs font-bold uppercase tracking-wider text-gray-500 dark:text-gray-400 flex items-center gap-1">
              <Trophy className="w-3.5 h-3.5 text-amber-500" />
              New Tier Capabilities Unlocked:
            </h4>
            <div className="space-y-1.5">
              {newLevelDetails.unlockedPerks.map((perk, i) => (
                <div
                  key={i}
                  className="flex items-center gap-2 p-2 rounded-xl bg-purple-50/50 dark:bg-purple-950/20 text-xs font-medium text-purple-900 dark:text-purple-200"
                >
                  <CheckCircle className="w-4 h-4 text-emerald-500 shrink-0" />
                  <span>{perk}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Action CTA */}
          <div className="pt-2">
            <Button
              variant="primary"
              size="lg"
              className="w-full shadow-lg shadow-purple-500/25"
              onClick={closeLevelUpModal}
            >
              Claim & Continue Learning
            </Button>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  )
}
