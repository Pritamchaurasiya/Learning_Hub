import { memo } from 'react'
import { motion } from 'framer-motion'
import { Sparkles, Zap, AlertTriangle, ShieldAlert } from 'lucide-react'
import { CognitiveState } from '../../types/neuroAdaptive'

export interface FlowStateGaugeProps {
  flowScore: number
  fatigueScore: number
  cognitiveLoad: number
  state: CognitiveState
}

export const FlowStateGauge = memo(function FlowStateGauge({
  flowScore,
  fatigueScore,
  cognitiveLoad,
  state,
}: FlowStateGaugeProps) {
  const getBadgeDetails = () => {
    switch (state) {
      case 'OPTIMAL_FLOW':
        return {
          label: 'Peak Flow State',
          color: 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/30',
          icon: <Sparkles className="w-4 h-4 text-emerald-500 animate-spin" />,
        }
      case 'PRODUCTIVE_EFFORT':
        return {
          label: 'Productive Effort',
          color: 'bg-blue-500/10 text-blue-600 dark:text-blue-400 border-blue-500/30',
          icon: <Zap className="w-4 h-4 text-blue-500" />,
        }
      case 'COGNITIVE_STRAIN':
        return {
          label: 'Cognitive Strain',
          color: 'bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/30',
          icon: <AlertTriangle className="w-4 h-4 text-amber-500" />,
        }
      case 'FATIGUE_OVERLOAD':
        return {
          label: 'Fatigue Overload',
          color: 'bg-rose-500/10 text-rose-600 dark:text-rose-400 border-rose-500/30',
          icon: <ShieldAlert className="w-4 h-4 text-rose-500" />,
        }
    }
  }

  const badge = getBadgeDetails()
  const strokeDashoffset = 283 - (283 * Math.min(100, Math.max(0, flowScore))) / 100

  return (
    <div
      role="region"
      aria-label="Flow State Gauge"
      className="p-6 rounded-2xl bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 shadow-sm flex flex-col items-center text-center"
    >
      <div className="flex items-center justify-between w-full mb-4">
        <h3 className="text-sm font-bold text-gray-700 dark:text-gray-300">
          Neuro-Adaptive Flow Index
        </h3>
        <span
          className={`px-2.5 py-1 rounded-full text-xs font-semibold border flex items-center gap-1.5 ${badge.color}`}
        >
          {badge.icon}
          {badge.label}
        </span>
      </div>

      <div className="relative w-40 h-40 my-2 flex items-center justify-center">
        <svg className="w-full h-full -rotate-90 transform" viewBox="0 0 100 100">
          <circle
            cx="50"
            cy="50"
            r="45"
            className="stroke-gray-100 dark:stroke-gray-800"
            strokeWidth="8"
            fill="transparent"
          />
          <motion.circle
            cx="50"
            cy="50"
            r="45"
            className="stroke-indigo-600 dark:stroke-indigo-400"
            strokeWidth="8"
            strokeDasharray={283}
            strokeDashoffset={strokeDashoffset}
            strokeLinecap="round"
            fill="transparent"
            initial={{ strokeDashoffset: 283 }}
            animate={{ strokeDashoffset }}
            transition={{ duration: 0.8, ease: 'easeOut' }}
          />
        </svg>

        <div className="absolute flex flex-col items-center">
          <span className="text-3xl font-extrabold text-gray-900 dark:text-white">
            {flowScore}
          </span>
          <span className="text-[11px] font-medium text-gray-500 dark:text-gray-400">
            Flow Score
          </span>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3 w-full mt-4 pt-4 border-t border-gray-100 dark:border-gray-800 text-left">
        <div className="p-2.5 rounded-xl bg-gray-50 dark:bg-gray-800/60">
          <span className="text-[11px] text-gray-500 dark:text-gray-400 block">
            Cognitive Strain
          </span>
          <span className="text-sm font-bold text-gray-800 dark:text-gray-200">
            {cognitiveLoad} / 100
          </span>
        </div>
        <div className="p-2.5 rounded-xl bg-gray-50 dark:bg-gray-800/60">
          <span className="text-[11px] text-gray-500 dark:text-gray-400 block">
            Mental Fatigue
          </span>
          <span className="text-sm font-bold text-gray-800 dark:text-gray-200">
            {fatigueScore} / 100
          </span>
        </div>
      </div>
    </div>
  )
})
