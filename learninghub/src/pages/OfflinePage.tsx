import { memo, useState, useEffect } from 'react'
import { motion } from 'framer-motion'
import { WifiOff, RefreshCw, Clock, BookOpen, Database, CheckCircle2 } from 'lucide-react'
import { Button } from '../components/ui/Button'
import { Card } from '../components/ui/Card'
import AnimatedPage from '../components/AnimatedPage'
import { SEO } from '../components/SEO'
import { offlineSyncService, PendingSyncItem } from '../services/offlineSyncService'

const OfflinePage = memo(() => {
  const [isOnline, setIsOnline] = useState(offlineSyncService.isOnline())
  const [pendingItems, setPendingItems] = useState<PendingSyncItem[]>([])
  const [isSyncing, setIsSyncing] = useState(false)

  useEffect(() => {
    const loadItems = () => {
      void offlineSyncService.getPendingItems().then(setPendingItems)
    }

    loadItems()
    const unsubscribe = offlineSyncService.subscribe(onlineStatus => {
      setIsOnline(onlineStatus)
      loadItems()
    })

    return unsubscribe
  }, [])

  const handleRetry = async () => {
    if (navigator.onLine) {
      setIsSyncing(true)
      await offlineSyncService.flushQueue()
      setIsSyncing(false)
      window.location.reload()
    } else {
      window.location.reload()
    }
  }

  // Get cached courses from localStorage (if any)
  const cachedCourses = (() => {
    try {
      const cached = localStorage.getItem('cached_courses')
      return cached ? JSON.parse(cached).slice(0, 3) : []
    } catch {
      return []
    }
  })()

  return (
    <AnimatedPage className="min-h-[80vh] flex items-center justify-center p-4">
      <SEO title="You are offline" noindex={true} />

      <Card className="w-full max-w-lg p-8 sm:p-12 text-center border-none shadow-2xl rounded-[2.5rem]">
        <motion.div
          initial={{ scale: 0.8, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ type: 'spring', stiffness: 200, damping: 20 }}
          className="w-24 h-24 bg-gray-100 dark:bg-gray-800 rounded-[2rem] flex items-center justify-center mx-auto mb-8"
        >
          <WifiOff className="w-12 h-12 text-gray-500 dark:text-gray-400" />
        </motion.div>

        <motion.div
          initial={{ y: 20, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ delay: 0.1 }}
        >
          <h1 className="text-3xl sm:text-4xl font-black mb-4 tracking-tight">You are offline</h1>
          <p className="text-gray-500 dark:text-gray-400 text-lg mb-8 leading-relaxed">
            No internet connection detected. Check your network and try again.
          </p>
        </motion.div>

        <motion.div
          initial={{ y: 20, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ delay: 0.2 }}
          className="flex flex-col sm:flex-row gap-4 justify-center"
        >
          <Button
            onClick={handleRetry}
            disabled={isSyncing}
            className="py-4 px-8 rounded-2xl font-bold shadow-xl"
          >
            <RefreshCw className={`w-5 h-5 mr-2 ${isSyncing ? 'animate-spin' : ''}`} />
            {isSyncing ? 'Syncing Queue...' : 'Retry Connection'}
          </Button>
          <Button
            variant="outline"
            onClick={() => window.history.back()}
            className="py-4 px-8 rounded-2xl font-bold border-2"
          >
            Go Back
          </Button>
        </motion.div>

        {/* Cached Content Section */}
        {cachedCourses.length > 0 && (
          <motion.div
            initial={{ y: 20, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            transition={{ delay: 0.3 }}
            className="mt-10 pt-8 border-t border-gray-100 dark:border-gray-800"
          >
            <div className="flex items-center justify-center gap-2 mb-4">
              <Clock className="w-4 h-4 text-gray-400" />
              <span className="text-sm font-medium text-gray-500">Available offline</span>
            </div>

            <div className="space-y-3">
              {cachedCourses.map((course: { id: string; title: string }, index: number) => (
                <motion.div
                  key={course.id}
                  initial={{ x: -20, opacity: 0 }}
                  animate={{ x: 0, opacity: 1 }}
                  transition={{ delay: 0.3 + index * 0.1 }}
                  className="flex items-center gap-3 p-4 bg-gray-50 dark:bg-gray-800/50 rounded-2xl"
                >
                  <div className="w-10 h-10 bg-primary-100 dark:bg-primary-900/30 rounded-xl flex items-center justify-center">
                    <BookOpen className="w-5 h-5 text-primary-600 dark:text-primary-400" />
                  </div>
                  <div className="flex-1 text-left">
                    <p className="font-medium text-sm text-gray-900 dark:text-white truncate">
                      {course.title}
                    </p>
                    <p className="text-xs text-gray-500">Cached content available</p>
                  </div>
                </motion.div>
              ))}
            </div>
          </motion.div>
        )}

        {/* Pending Sync Queue Section */}
        {pendingItems.length > 0 && (
          <motion.div
            initial={{ y: 20, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            transition={{ delay: 0.25 }}
            className="mt-8 p-6 bg-primary-50/50 dark:bg-primary-950/20 rounded-[1.75rem] border border-primary-100 dark:border-primary-900/40 text-left"
          >
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <Database className="w-4 h-4 text-primary-600 dark:text-primary-400" />
                <span className="text-xs font-black uppercase tracking-widest text-primary-700 dark:text-primary-300">
                  Offline Sync Queue ({pendingItems.length})
                </span>
              </div>
              <span className="text-[10px] font-bold text-gray-500 uppercase tracking-wider">
                {isOnline ? 'Online - Auto Syncing' : 'Waiting for connection'}
              </span>
            </div>

            <div className="space-y-2">
              {pendingItems.slice(0, 3).map(item => (
                <div
                  key={item.id}
                  className="flex items-center justify-between p-3 rounded-xl bg-white dark:bg-gray-900 shadow-sm border border-gray-100 dark:border-gray-800"
                >
                  <div className="flex items-center gap-2.5">
                    <CheckCircle2 className="w-4 h-4 text-emerald-500" />
                    <span className="text-xs font-bold text-gray-800 dark:text-gray-200">
                      {item.type.replace('_', ' ')}
                    </span>
                  </div>
                  <span className="text-[10px] font-mono text-gray-400">
                    {new Date(item.createdAt).toLocaleTimeString()}
                  </span>
                </div>
              ))}
              {pendingItems.length > 3 && (
                <p className="text-[10px] font-bold text-center text-gray-400 uppercase tracking-widest pt-1">
                  + {pendingItems.length - 3} more items pending sync
                </p>
              )}
            </div>
          </motion.div>
        )}

        {/* Tips for offline use */}
        <motion.div
          initial={{ y: 20, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ delay: 0.4 }}
          className="mt-8 p-4 bg-amber-50 dark:bg-amber-900/20 rounded-2xl text-left"
        >
          <p className="text-sm text-amber-800 dark:text-amber-400">
            <strong>Tip:</strong> Bookmark courses and lessons to access them offline. Your progress
            is saved locally in IndexedDB and will auto-sync when you reconnect.
          </p>
        </motion.div>
      </Card>
    </AnimatedPage>
  )
})

export default OfflinePage
