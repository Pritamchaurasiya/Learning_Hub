import React, { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  Compass,
  CheckCircle2,
  Sparkles,
  ArrowRight,
  Gift,
  X,
  ChevronDown,
  ChevronUp,
} from 'lucide-react'
import { playRewardChime } from '../../utils/soundEffects'

interface ScholarOnboardingTourCardProps {
  onLaunchAITest: () => void
  userName?: string
}

export const ScholarOnboardingTourCard: React.FC<ScholarOnboardingTourCardProps> = ({
  onLaunchAITest,
  userName = 'Scholar',
}) => {
  const [isDismissed, setIsDismissed] = useState(false)
  const [isCollapsed, setIsCollapsed] = useState(false)

  useEffect(() => {
    const saved = localStorage.getItem('scholar_onboarding_dismissed')
    if (saved === 'true') {
      setIsDismissed(true)
    }
  }, [])

  const handleDismiss = () => {
    setIsDismissed(true)
    localStorage.setItem('scholar_onboarding_dismissed', 'true')
  }

  const handleLaunchStep = () => {
    playRewardChime('quest-complete')
    onLaunchAITest()
  }

  if (isDismissed) return null

  const steps = [
    {
      id: 1,
      title: 'Neural Account Initialized',
      description: 'Profile telemetry calibrated & enrolled in Arena League',
      status: 'completed',
    },
    {
      id: 2,
      title: 'Command Bento Grid Explored',
      description: 'Cognitive radar, study charts, and ROI tools unlocked',
      status: 'completed',
    },
    {
      id: 3,
      title: 'Launch First Adaptive AI Assessment',
      description: 'Run diagnostic to pinpoint algorithmic & system weak spots',
      status: 'active',
    },
  ]

  const completedSteps = steps.filter(s => s.status === 'completed').length
  const progressPercent = Math.round((completedSteps / steps.length) * 100)

  return (
    <div
      data-testid="scholar-onboarding-tour-card"
      className="bg-gradient-to-r from-slate-900/90 via-indigo-950/40 to-slate-900/90 border border-indigo-500/30 rounded-3xl p-5 sm:p-6 shadow-xl backdrop-blur-2xl relative overflow-hidden"
    >
      <div className="absolute top-0 right-0 w-64 h-64 bg-indigo-500/10 rounded-full blur-3xl pointer-events-none" />

      {/* Header Bar */}
      <div className="flex items-center justify-between gap-4 relative z-10">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-2xl bg-indigo-500/10 border border-indigo-500/20 flex items-center justify-center text-indigo-400 shrink-0 shadow-inner">
            <Compass className="w-5 h-5 animate-spin-slow" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="text-[11px] font-mono uppercase tracking-wider text-indigo-400 font-extrabold flex items-center gap-1">
                <Sparkles className="w-3.5 h-3.5 text-amber-300" /> Fast-Track Orientation
              </span>
              <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-indigo-500/10 text-indigo-300 border border-indigo-500/30">
                {progressPercent}% Complete
              </span>
            </div>
            <h2 className="text-base sm:text-lg font-bold text-white mt-0.5">
              Welcome, {userName}! Complete your orientation sprint
            </h2>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => setIsCollapsed(!isCollapsed)}
            className="p-2 rounded-xl bg-slate-800/80 hover:bg-slate-700 text-slate-400 hover:text-white transition-colors"
            title={isCollapsed ? 'Expand orientation guide' : 'Collapse orientation guide'}
          >
            {isCollapsed ? <ChevronDown className="w-4 h-4" /> : <ChevronUp className="w-4 h-4" />}
          </button>
          <button
            type="button"
            onClick={handleDismiss}
            className="p-2 rounded-xl bg-slate-800/80 hover:bg-slate-700 text-slate-400 hover:text-white transition-colors"
            title="Dismiss orientation guide"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Collapsible Content */}
      <AnimatePresence>
        {!isCollapsed && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className="mt-4 pt-4 border-t border-slate-800/80 space-y-4 relative z-10"
          >
            {/* Progress Bar */}
            <div className="space-y-1.5">
              <div className="flex justify-between items-center text-xs">
                <span className="text-slate-400 font-medium">Endowed Progress: 2 of 3 steps verified</span>
                <span className="font-mono text-indigo-400 font-bold">{progressPercent}%</span>
              </div>
              <div className="h-2 w-full bg-slate-800 rounded-full overflow-hidden p-0.5">
                <div
                  className="h-full bg-gradient-to-r from-indigo-500 via-purple-500 to-pink-500 rounded-full transition-all duration-500"
                  style={{ width: `${progressPercent}%` }}
                />
              </div>
            </div>

            {/* Steps Grid */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
              {steps.map(step => {
                const isCompleted = step.status === 'completed'
                return (
                  <div
                    key={step.id}
                    className={`p-3.5 rounded-2xl border transition-all ${
                      isCompleted
                        ? 'bg-slate-950/60 border-emerald-500/20 text-slate-300'
                        : 'bg-indigo-950/20 border-indigo-500/40 text-white ring-1 ring-indigo-500/20'
                    }`}
                  >
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-[10px] font-mono uppercase text-slate-400">Step 0{step.id}</span>
                      {isCompleted ? (
                        <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                      ) : (
                        <span className="w-2 h-2 rounded-full bg-indigo-400 animate-ping" />
                      )}
                    </div>
                    <div className="text-xs font-bold truncate">{step.title}</div>
                    <div className="text-[11px] text-slate-400 mt-1 leading-relaxed line-clamp-2">
                      {step.description}
                    </div>
                  </div>
                )
              })}
            </div>

            {/* Action Bar with Psychological Completion Incentive */}
            <div className="p-3.5 rounded-2xl bg-slate-950/80 border border-slate-800 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div className="flex items-center gap-2.5 text-xs text-amber-300">
                <Gift className="w-4 h-4 shrink-0" />
                <span>
                  Complete Step 3 to claim your <strong>+250 XP Welcome Chest</strong> & 1-Week Streak Shield!
                </span>
              </div>

              <button
                type="button"
                onClick={handleLaunchStep}
                className="px-4 py-2 rounded-xl text-xs font-bold bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-500 hover:to-purple-500 text-white shadow-md shadow-indigo-600/25 flex items-center justify-center gap-2 transition-all hover:scale-102 active:scale-98 shrink-0"
              >
                <span>Launch First AI Test</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}
export default ScholarOnboardingTourCard
