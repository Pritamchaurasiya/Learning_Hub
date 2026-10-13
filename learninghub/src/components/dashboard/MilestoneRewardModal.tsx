import React, { useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Trophy, Sparkles, ShieldCheck, Zap, Gift, X, Check } from 'lucide-react'
import { playRewardChime } from '../../utils/soundEffects'

export interface MilestoneRewardModalProps {
  isOpen: boolean
  onClose: () => void
  currentLevel: number
  bonusXp?: number
}

export const MilestoneRewardModal: React.FC<MilestoneRewardModalProps> = ({
  isOpen,
  onClose,
  currentLevel,
  bonusXp = 250,
}) => {
  useEffect(() => {
    if (isOpen) {
      playRewardChime('milestone')
    }
  }, [isOpen])

  return (
    <AnimatePresence>
      {isOpen && (
        <div
          data-testid="milestone-reward-modal"
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md"
        >
          {/* Backdrop dismissal */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="absolute inset-0"
          />

          {/* Modal Container */}
          <motion.div
            initial={{ scale: 0.88, opacity: 0, y: 20 }}
            animate={{ scale: 1, opacity: 1, y: 0 }}
            exit={{ scale: 0.9, opacity: 0, y: 20 }}
            transition={{ type: 'spring', damping: 25, stiffness: 350 }}
            className="relative w-full max-w-lg p-6 sm:p-8 rounded-3xl bg-gradient-to-b from-slate-900/95 via-slate-900/90 to-indigo-950/90 border border-amber-500/30 shadow-2xl shadow-amber-500/20 backdrop-blur-2xl text-center overflow-hidden z-10"
          >
            {/* Ambient Radial Highlights */}
            <div className="absolute top-0 left-1/2 -translate-x-1/2 w-64 h-64 bg-amber-500/15 rounded-full blur-3xl pointer-events-none -z-10" />
            <div className="absolute bottom-0 right-10 w-48 h-48 bg-purple-500/15 rounded-full blur-3xl pointer-events-none -z-10" />

            {/* Close Button */}
            <button
              type="button"
              onClick={onClose}
              className="absolute top-4 right-4 p-2 rounded-xl text-gray-400 hover:text-white hover:bg-white/10 transition-colors"
              aria-label="Close milestone modal"
            >
              <X className="w-5 h-5" />
            </button>

            {/* Floating Confetti Sparkles */}
            <div className="flex justify-center mb-4">
              <motion.div
                initial={{ rotate: -20, scale: 0 }}
                animate={{ rotate: 0, scale: 1 }}
                transition={{ type: 'spring', delay: 0.1 }}
                className="relative w-20 h-20 rounded-3xl bg-gradient-to-tr from-amber-500 via-rose-500 to-purple-600 flex items-center justify-center text-white shadow-xl shadow-amber-500/30 ring-4 ring-amber-400/20"
              >
                <Trophy className="w-10 h-10 text-amber-200" />
                <motion.div
                  animate={{ rotate: 360 }}
                  transition={{ repeat: Infinity, duration: 8, ease: 'linear' }}
                  className="absolute -top-2 -right-2 text-amber-300"
                >
                  <Sparkles className="w-6 h-6" />
                </motion.div>
              </motion.div>
            </div>

            {/* Badge & Title */}
            <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-amber-500/10 border border-amber-500/30 text-amber-400 text-xs font-black uppercase tracking-wider mb-2">
              <Gift className="w-3.5 h-3.5" />
              <span>Level {currentLevel} Milestone Unlocked</span>
            </div>

            <h2 className="text-2xl sm:text-3xl font-black text-white tracking-tight mb-2">
              Scholar Prestige Rewards
            </h2>
            <p className="text-xs sm:text-sm text-gray-300 mb-6">
              Congratulations! Your cognitive mastery has reached a new tier. All perks have been
              credited to your account.
            </p>

            {/* Perks Cards Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-left mb-6">
              {/* Perk 1: Double XP */}
              <div className="p-3.5 rounded-2xl bg-white/5 border border-white/10 flex items-start gap-3">
                <div className="p-2 rounded-xl bg-amber-500/20 text-amber-400 shrink-0">
                  <Zap className="w-4 h-4" />
                </div>
                <div>
                  <h4 className="text-xs font-bold text-white">2.0x Double XP</h4>
                  <p className="text-[11px] text-gray-400">Active for next 24 hours</p>
                </div>
              </div>

              {/* Perk 2: Bonus XP */}
              <div className="p-3.5 rounded-2xl bg-white/5 border border-white/10 flex items-start gap-3">
                <div className="p-2 rounded-xl bg-purple-500/20 text-purple-400 shrink-0">
                  <Sparkles className="w-4 h-4" />
                </div>
                <div>
                  <h4 className="text-xs font-bold text-white">+{bonusXp} Scholar XP</h4>
                  <p className="text-[11px] text-gray-400">Credited to wallet</p>
                </div>
              </div>

              {/* Perk 3: Streak Shield */}
              <div className="p-3.5 rounded-2xl bg-white/5 border border-white/10 flex items-start gap-3">
                <div className="p-2 rounded-xl bg-emerald-500/20 text-emerald-400 shrink-0">
                  <ShieldCheck className="w-4 h-4" />
                </div>
                <div>
                  <h4 className="text-xs font-bold text-white">1-Week Streak Shield</h4>
                  <p className="text-[11px] text-gray-400">Zero loss-aversion risk</p>
                </div>
              </div>

              {/* Perk 4: Distinction Badge */}
              <div className="p-3.5 rounded-2xl bg-white/5 border border-white/10 flex items-start gap-3">
                <div className="p-2 rounded-xl bg-indigo-500/20 text-indigo-400 shrink-0">
                  <Trophy className="w-4 h-4" />
                </div>
                <div>
                  <h4 className="text-xs font-bold text-white">Level {currentLevel} Distinction</h4>
                  <p className="text-[11px] text-gray-400">Public leaderboard status</p>
                </div>
              </div>
            </div>

            {/* Equip & Action Button */}
            <button
              type="button"
              onClick={onClose}
              className="w-full py-3.5 px-6 rounded-2xl bg-gradient-to-r from-amber-500 via-rose-500 to-purple-600 hover:from-amber-600 hover:to-purple-700 text-white font-black text-sm shadow-xl shadow-amber-500/25 transition-all flex items-center justify-center gap-2 hover:scale-[1.02] active:scale-98"
            >
              <Check className="w-4 h-4" />
              <span>Equip Rewards & Continue</span>
            </button>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  )
}
