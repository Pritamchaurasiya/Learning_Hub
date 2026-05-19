import { memo } from 'react'
import { motion } from 'framer-motion'
import { WifiOff, RefreshCw, Clock, BookOpen } from 'lucide-react'
import { Button } from '../components/ui/Button'
import { Card } from '../components/ui/Card'
import AnimatedPage from '../components/AnimatedPage'
import { SEO } from '../components/SEO'

const OfflinePage = memo(() => {
  const handleRetry = () => {
    window.location.reload()
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
      <SEO title="You are offline" noindex />

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
          <Button onClick={handleRetry} className="py-4 px-8 rounded-2xl font-bold shadow-xl">
            <RefreshCw className="w-5 h-5 mr-2" />
            Retry Connection
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

        {/* Tips for offline use */}
        <motion.div
          initial={{ y: 20, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ delay: 0.4 }}
          className="mt-8 p-4 bg-amber-50 dark:bg-amber-900/20 rounded-2xl text-left"
        >
          <p className="text-sm text-amber-800 dark:text-amber-400">
            <strong>Tip:</strong> Bookmark courses and lessons to access them offline. Your progress
            is saved locally and will sync when you reconnect.
          </p>
        </motion.div>
      </Card>
    </AnimatedPage>
  )
})

export default OfflinePage
