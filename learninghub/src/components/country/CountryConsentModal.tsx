import React from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Compass, ShieldCheck, Globe2, X, Sparkles, MapPin } from 'lucide-react'
import { useCountry } from '../../hooks/useCountry'

export const CountryConsentModal: React.FC = () => {
  const {
    isPermissionModalOpen,
    requestGeolocationPermission,
    denyGeolocationPermission,
    openCountrySelector,
    closePermissionModal,
  } = useCountry()

  if (!isPermissionModalOpen) return null

  return (
    <AnimatePresence>
      <div
        className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm"
        role="dialog"
        aria-modal="true"
        aria-labelledby="geo-consent-title"
      >
        <motion.div
          initial={{ opacity: 0, scale: 0.95, y: 15 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 15 }}
          transition={{ duration: 0.25, ease: 'easeOut' }}
          className="relative w-full max-w-md bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-2xl overflow-hidden p-6 text-slate-900 dark:text-slate-100"
        >
          {/* Close button */}
          <button
            onClick={closePermissionModal}
            className="absolute top-4 right-4 p-1.5 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
            aria-label="Close dialog"
          >
            <X className="w-5 h-5" />
          </button>

          {/* Header Icon */}
          <div className="flex items-center gap-3 mb-4">
            <div className="w-12 h-12 rounded-xl bg-gradient-to-tr from-blue-600 to-indigo-500 flex items-center justify-center text-white shadow-lg shadow-blue-500/25">
              <Compass className="w-6 h-6 animate-pulse" />
            </div>
            <div>
              <div className="flex items-center gap-1.5 text-xs font-semibold text-blue-600 dark:text-blue-400 uppercase tracking-wider">
                <Sparkles className="w-3.5 h-3.5" />
                <span>Personalization</span>
              </div>
              <h2
                id="geo-consent-title"
                className="text-lg font-bold text-slate-900 dark:text-white"
              >
                Personalize Your Exams
              </h2>
            </div>
          </div>

          {/* Description */}
          <p className="text-sm text-slate-600 dark:text-slate-300 leading-relaxed mb-4">
            LearningHub shows competitive and university entrance exams tailored to your region (e.g.,{' '}
            <strong className="text-slate-900 dark:text-white">JEE, NEET, & UPSC</strong> in India,{' '}
            <strong className="text-slate-900 dark:text-white">SAT & ACT</strong> in the US, or{' '}
            <strong className="text-slate-900 dark:text-white">A-Levels</strong> in the UK).
          </p>

          {/* Privacy badge */}
          <div className="flex items-start gap-2.5 p-3 rounded-xl bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800/60 mb-6">
            <ShieldCheck className="w-5 h-5 text-emerald-600 dark:text-emerald-400 flex-shrink-0 mt-0.5" />
            <div className="text-xs text-emerald-800 dark:text-emerald-200 leading-relaxed">
              <strong>Privacy Guaranteed:</strong> We only detect your country code. We never track, log, or store your exact GPS coordinates.
            </div>
          </div>

          {/* Actions */}
          <div className="flex flex-col gap-2.5">
            <button
              onClick={() => void requestGeolocationPermission()}
              className="w-full flex items-center justify-center gap-2 px-4 py-3 bg-blue-600 hover:bg-blue-700 text-white font-medium rounded-xl shadow-md shadow-blue-500/20 active:scale-[0.99] transition-all"
            >
              <MapPin className="w-4 h-4" />
              <span>Allow Location Detection</span>
            </button>

            <button
              onClick={() => {
                closePermissionModal()
                openCountrySelector()
              }}
              className="w-full flex items-center justify-center gap-2 px-4 py-2.5 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700/80 text-slate-700 dark:text-slate-200 font-medium rounded-xl transition-colors"
            >
              <Globe2 className="w-4 h-4" />
              <span>Choose Country Manually</span>
            </button>

            <button
              onClick={denyGeolocationPermission}
              className="text-xs text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 py-1 transition-colors text-center"
            >
              Skip for now (use default)
            </button>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  )
}
