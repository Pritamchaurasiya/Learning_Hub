import { memo } from 'react'
import { motion } from 'framer-motion'
import { Sparkles, Eye, Wind, HelpCircle, ArrowRight } from 'lucide-react'
import { Button } from '../ui/Button'
import { ThrottlingAction, CognitiveStateEvaluation } from '../../types/neuroAdaptive'

export interface BiofeedbackAlertBannerProps {
  action: ThrottlingAction
  intervention?: CognitiveStateEvaluation['suggestedIntervention']
  onApplyIntervention?: () => void
  onDismiss?: () => void
}

export const BiofeedbackAlertBanner = memo(function BiofeedbackAlertBanner({
  action,
  intervention,
  onApplyIntervention,
  onDismiss,
}: BiofeedbackAlertBannerProps) {
  if (action === 'MAINTAIN_CURRENT_PACE' && !intervention) {
    return null
  }

  const getInterventionIcon = () => {
    switch (intervention?.type) {
      case 'EYE_RESET_20_20_20':
        return <Eye className="w-5 h-5 text-rose-500" />
      case 'BREATHWORK_20_SEC':
        return <Wind className="w-5 h-5 text-cyan-500" />
      case 'SocraticScaffold':
        return <HelpCircle className="w-5 h-5 text-amber-500" />
      default:
        return <Sparkles className="w-5 h-5 text-indigo-500" />
    }
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: -8 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -8 }}
      role="alert"
      className="p-4 rounded-2xl bg-gradient-to-r from-indigo-500/10 via-purple-500/10 to-pink-500/10 border border-indigo-500/20 backdrop-blur-md flex flex-col sm:flex-row items-center justify-between gap-4 mb-6 shadow-sm"
    >
      <div className="flex items-center gap-3">
        <div className="p-2.5 rounded-xl bg-white dark:bg-gray-800 shadow-sm border border-gray-100 dark:border-gray-700 shrink-0">
          {getInterventionIcon()}
        </div>
        <div>
          <h4 className="text-sm font-bold text-gray-900 dark:text-white flex items-center gap-2">
            Biofeedback Study Optimizer
            {intervention?.durationSec && (
              <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-indigo-100 text-indigo-800 dark:bg-indigo-900/40 dark:text-indigo-300">
                {intervention.durationSec}s Intervention
              </span>
            )}
          </h4>
          <p className="text-xs text-gray-600 dark:text-gray-400 mt-0.5">
            {intervention?.message || 'Cognitive pacing optimal. Maintain your current cadence.'}
          </p>
        </div>
      </div>

      <div className="flex items-center gap-2 shrink-0">
        {onApplyIntervention && intervention && (
          <Button
            size="sm"
            variant="primary"
            onClick={onApplyIntervention}
            className="text-xs bg-indigo-600 hover:bg-indigo-700 text-white flex items-center gap-1 shadow-sm"
          >
            <span>Start Intervention</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </Button>
        )}
        {onDismiss && (
          <Button
            size="sm"
            variant="outline"
            onClick={onDismiss}
            className="text-xs text-gray-500 hover:text-gray-700 dark:text-gray-400 border-gray-200 dark:border-gray-700"
          >
            Dismiss
          </Button>
        )}
      </div>
    </motion.div>
  )
})
