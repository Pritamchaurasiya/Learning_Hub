import { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Cookie, X, Shield } from 'lucide-react'
import { Button } from './ui/Button'
import { initializeGA4 } from '../services/analyticsGA4Service'

export function CookieConsent() {
  const [isVisible, setIsVisible] = useState(false)
  const [showDetails, setShowDetails] = useState(false)

  useEffect(() => {
    // Check if user has already made a choice
    const consent = localStorage.getItem('cookieConsent')
    if (!consent) {
      // Show banner after a short delay
      const timer = setTimeout(() => setIsVisible(true), 1000)
      return () => clearTimeout(timer)
    }
  }, [])

  const handleAccept = () => {
    localStorage.setItem('cookieConsent', 'accepted')
    localStorage.setItem('cookieConsentDate', new Date().toISOString())
    setIsVisible(false)
    // Initialize GA4 after consent
    initializeGA4()
  }

  const handleReject = () => {
    localStorage.setItem('cookieConsent', 'rejected')
    localStorage.setItem('cookieConsentDate', new Date().toISOString())
    setIsVisible(false)
  }

  const handleClose = () => {
    setIsVisible(false)
  }

  if (!isVisible) return null

  return (
    <AnimatePresence>
      {isVisible && (
        <motion.div
          initial={{ y: 100, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          exit={{ y: 100, opacity: 0 }}
          transition={{ type: 'spring', damping: 25, stiffness: 200 }}
          className="fixed bottom-0 left-0 right-0 z-50 p-4 md:p-6"
        >
          <div className="max-w-4xl mx-auto">
            <div className="bg-white dark:bg-gray-900 rounded-2xl shadow-2xl border border-gray-200 dark:border-gray-800 p-6 md:p-8">
              <div className="flex items-start gap-4">
                <div className="p-3 bg-primary-100 dark:bg-primary-900/20 rounded-xl">
                  <Cookie className="w-6 h-6 text-primary-600 dark:text-primary-400" />
                </div>

                <div className="flex-1 min-w-0">
                  <div className="flex items-start justify-between gap-4">
                    <div>
                      <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                        Cookie Preferences
                      </h3>
                      <p className="mt-2 text-sm text-gray-600 dark:text-gray-400 leading-relaxed">
                        We use cookies to enhance your learning experience. Analytics cookies help
                        us understand how you use our platform so we can improve it. You can change
                        your preferences at any time.
                      </p>
                    </div>

                    <button
                      onClick={handleClose}
                      className="p-2 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg transition-colors"
                      aria-label="Close cookie banner"
                    >
                      <X className="w-5 h-5 text-gray-500" />
                    </button>
                  </div>

                  {showDetails && (
                    <motion.div
                      initial={{ height: 0, opacity: 0 }}
                      animate={{ height: 'auto', opacity: 1 }}
                      exit={{ height: 0, opacity: 0 }}
                      className="mt-4 space-y-3"
                    >
                      <div className="flex items-start gap-3 p-3 bg-gray-50 dark:bg-gray-800/50 rounded-xl">
                        <Shield className="w-5 h-5 text-green-500 mt-0.5" />
                        <div>
                          <p className="font-medium text-sm text-gray-900 dark:text-white">
                            Essential Cookies
                          </p>
                          <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                            Required for the platform to function properly. Cannot be disabled.
                          </p>
                        </div>
                      </div>

                      <div className="flex items-start gap-3 p-3 bg-gray-50 dark:bg-gray-800/50 rounded-xl">
                        <svg
                          className="w-5 h-5 text-blue-500 mt-0.5"
                          fill="none"
                          viewBox="0 0 24 24"
                          stroke="currentColor"
                        >
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth={2}
                            d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z"
                          />
                        </svg>
                        <div>
                          <p className="font-medium text-sm text-gray-900 dark:text-white">
                            Analytics Cookies
                          </p>
                          <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                            Help us understand how you use the platform to improve your learning
                            experience.
                          </p>
                        </div>
                      </div>
                    </motion.div>
                  )}

                  <div className="mt-6 flex flex-wrap items-center gap-3">
                    <Button onClick={handleAccept} size="sm">
                      Accept All
                    </Button>
                    <Button variant="secondary" onClick={handleReject} size="sm">
                      Reject Analytics
                    </Button>
                    <Button variant="ghost" onClick={() => setShowDetails(!showDetails)} size="sm">
                      {showDetails ? 'Hide Details' : 'Learn More'}
                    </Button>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  )
}
