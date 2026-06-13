import { useRegisterSW } from 'virtual:pwa-register/react'
import { Download, X } from 'lucide-react'
import { motion, AnimatePresence } from 'framer-motion'

export default function ReloadPrompt() {
  const {
    offlineReady: [offlineReady, setOfflineReady],
    needRefresh: [needRefresh, setNeedRefresh],
    updateServiceWorker,
  } = useRegisterSW({
    onRegistered(r: ServiceWorkerRegistration | undefined) {
      // Automatically check for updates every hour
      if (r) {
        setInterval(
          () => {
            r.update()
          },
          60 * 60 * 1000
        )
      }
    },
    onRegisterError(error: unknown) {
      console.error('SW registration error', error)
    },
  })

  const close = () => {
    setOfflineReady(false)
    setNeedRefresh(false)
  }

  return (
    <AnimatePresence>
      {(offlineReady || needRefresh) && (
        <motion.div
          initial={{ opacity: 0, y: 50, scale: 0.95 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: 20, scale: 0.95 }}
          className="fixed bottom-6 right-6 z-[100] max-w-sm w-[calc(100%-3rem)] bg-white dark:bg-gray-800 rounded-2xl shadow-2xl border border-gray-100 dark:border-gray-700 p-5 flex flex-col gap-4"
        >
          <div className="flex items-start justify-between">
            <div className="flex gap-3">
              <div className="w-10 h-10 rounded-full bg-primary-100 dark:bg-primary-900/30 text-primary-600 dark:text-primary-400 flex items-center justify-center shrink-0">
                <Download className="w-5 h-5" />
              </div>
              <div>
                <h3 className="font-semibold text-gray-900 dark:text-white">
                  {offlineReady ? 'App ready for offline' : 'New version available'}
                </h3>
                <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
                  {offlineReady
                    ? 'LearningHub is now cached and works without internet.'
                    : 'A new update is ready. Refresh to get the latest features.'}
                </p>
              </div>
            </div>
            <button
              onClick={close}
              className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 p-1"
              aria-label="Close"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          <div className="flex gap-3 mt-1">
            {needRefresh && (
              <button
                className="flex-1 bg-primary-600 hover:bg-primary-700 text-white font-medium py-2 px-4 rounded-xl transition-colors text-sm"
                onClick={() => updateServiceWorker(true)}
              >
                Update Now
              </button>
            )}
            <button
              className="flex-1 bg-gray-100 hover:bg-gray-200 dark:bg-gray-700 dark:hover:bg-gray-600 text-gray-900 dark:text-white font-medium py-2 px-4 rounded-xl transition-colors text-sm"
              onClick={close}
            >
              Close
            </button>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  )
}
