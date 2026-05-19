import { memo } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { WifiOff, Wifi, AlertCircle } from 'lucide-react'
import { useNetworkStatus } from '../hooks/useNetworkStatus'

export const NetworkStatus = memo(() => {
  const { isOffline, wasOffline } = useNetworkStatus()

  return (
    <AnimatePresence>
      {isOffline && (
        <motion.div
          initial={{ y: -50, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          exit={{ y: -50, opacity: 0 }}
          transition={{ type: 'spring', stiffness: 500, damping: 30 }}
          className="fixed top-0 left-0 right-0 z-[100] bg-red-500 text-white px-4 py-3 shadow-lg"
          role="alert"
          aria-live="assertive"
        >
          <div className="flex items-center justify-center gap-3 max-w-4xl mx-auto">
            <WifiOff className="w-5 h-5 shrink-0" />
            <div className="flex items-center gap-2">
              <span className="font-semibold text-sm">You are offline</span>
              <span className="text-red-200 text-sm hidden sm:inline">
                Some features may be unavailable
              </span>
            </div>
            <AlertCircle className="w-5 h-5 shrink-0 sm:ml-auto" />
          </div>
        </motion.div>
      )}

      {wasOffline && !isOffline && (
        <motion.div
          initial={{ y: -50, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          exit={{ y: -50, opacity: 0 }}
          transition={{ type: 'spring', stiffness: 500, damping: 30 }}
          className="fixed top-0 left-0 right-0 z-[100] bg-emerald-500 text-white px-4 py-3 shadow-lg"
          role="status"
          aria-live="polite"
        >
          <div className="flex items-center justify-center gap-3 max-w-4xl mx-auto">
            <Wifi className="w-5 h-5 shrink-0" />
            <span className="font-semibold text-sm">Back online</span>
            <span className="text-emerald-200 text-sm hidden sm:inline">
              All features are now available
            </span>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  )
})

export default NetworkStatus
