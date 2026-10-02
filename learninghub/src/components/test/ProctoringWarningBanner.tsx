import React from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { ShieldCheck, AlertTriangle, X } from 'lucide-react'
import type { ProctoringViolation } from '../../hooks/useProctoring'

interface ProctoringWarningBannerProps {
  isWarningVisible: boolean
  lastViolation: ProctoringViolation | null
  onDismiss: () => void
  violationCount: number
}

export const ProctoringWarningBanner: React.FC<ProctoringWarningBannerProps> = ({
  isWarningVisible,
  lastViolation,
  onDismiss,
  violationCount,
}) => {
  return (
    <div className="fixed top-20 right-4 z-40 max-w-sm w-full pointer-events-none">
      <div className="flex flex-col items-end gap-2">
        {/* Subtle persistent HUD badge */}
        <div className="pointer-events-auto inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-slate-900/90 dark:bg-slate-900/95 border border-slate-700/70 text-slate-200 text-xs shadow-lg backdrop-blur-md">
          <span className="relative flex h-2 w-2">
            <span className={`animate-ping absolute inline-flex h-full w-full rounded-full ${violationCount > 0 ? 'bg-amber-400' : 'bg-emerald-400'} opacity-75`} />
            <span className={`relative inline-flex rounded-full h-2 w-2 ${violationCount > 0 ? 'bg-amber-500' : 'bg-emerald-500'}`} />
          </span>
          <ShieldCheck className="w-3.5 h-3.5 text-cyan-400" />
          <span className="font-medium tracking-tight">Integrity Shield</span>
          {violationCount > 0 && (
            <span className="px-1.5 py-0.5 rounded-md bg-amber-500/20 text-amber-300 font-mono text-[10px]">
              {violationCount} event{violationCount > 1 ? 's' : ''}
            </span>
          )}
        </div>

        {/* Dynamic warning notification when violation occurs */}
        <AnimatePresence>
          {isWarningVisible && lastViolation && (
            <motion.div
              initial={{ opacity: 0, y: -10, scale: 0.95 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: -10, scale: 0.95 }}
              className="pointer-events-auto w-full p-4 rounded-xl bg-slate-900 border border-amber-500/50 shadow-2xl text-white backdrop-blur-lg"
            >
              <div className="flex items-start gap-3">
                <div className="p-2 rounded-lg bg-amber-500/20 text-amber-400 shrink-0">
                  <AlertTriangle className="w-5 h-5" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between">
                    <h4 className="text-xs font-bold text-amber-300 uppercase tracking-wider">
                      Integrity Warning
                    </h4>
                    <button
                      type="button"
                      onClick={onDismiss}
                      className="p-1 -mr-1 -mt-1 text-slate-400 hover:text-white rounded-lg transition-colors"
                      aria-label="Dismiss warning"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  </div>
                  <p className="text-xs text-slate-300 mt-1 leading-relaxed">
                    {lastViolation.details ||
                      `Out-of-focus event (${lastViolation.type}) detected. Assessment policies require maintaining active window focus.`}
                  </p>
                  <div className="mt-3 flex items-center justify-between">
                    <span className="text-[10px] text-slate-400 font-mono">
                      Logged to session proof
                    </span>
                    <button
                      type="button"
                      onClick={onDismiss}
                      className="px-2.5 py-1 rounded bg-amber-500 hover:bg-amber-600 text-slate-950 font-bold text-xs transition-colors"
                    >
                      Acknowledge
                    </button>
                  </div>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  )
}
