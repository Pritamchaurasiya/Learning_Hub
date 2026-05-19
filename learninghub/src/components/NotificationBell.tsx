import { useState, useRef, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Bell } from 'lucide-react'
import { useStore } from '../stores/useStore'
import { useOnClickOutside } from '../hooks/useOnClickOutside'
import { NotificationPanel } from './NotificationPanel'

export function NotificationBell() {
  const [isOpen, setIsOpen] = useState(false)
  const [hasInitialFetch, setHasInitialFetch] = useState(false)
  const { unreadCount, fetchNotifications } = useStore()
  const bellRef = useRef<HTMLButtonElement>(null)
  const panelRef = useRef<HTMLDivElement>(null)

  useOnClickOutside(panelRef, () => setIsOpen(false), bellRef)

  // Fetch notifications on first open
  useEffect(() => {
    if (isOpen && !hasInitialFetch) {
      void fetchNotifications()
      setHasInitialFetch(true)
    }
  }, [isOpen, hasInitialFetch, fetchNotifications])

  const handleToggle = () => {
    setIsOpen(!isOpen)
  }

  return (
    <div className="relative">
      <button
        ref={bellRef}
        onClick={handleToggle}
        className="relative p-2 rounded-xl hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
        aria-label={`Notifications ${unreadCount > 0 ? `(${unreadCount} unread)` : ''}`}
        aria-expanded={isOpen}
        aria-haspopup="true"
      >
        <Bell className="w-5 h-5 text-gray-600 dark:text-gray-400" />

        {/* Unread badge */}
        <AnimatePresence>
          {unreadCount > 0 && (
            <motion.span
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              exit={{ scale: 0 }}
              className="absolute top-1 right-1 w-4 h-4 bg-red-500 rounded-full flex items-center justify-center text-[10px] font-medium text-white"
            >
              {unreadCount > 9 ? '9+' : unreadCount}
            </motion.span>
          )}
        </AnimatePresence>
      </button>

      {/* Notification Panel */}
      <AnimatePresence>
        {isOpen && (
          <motion.div
            ref={panelRef}
            initial={{ opacity: 0, y: 10, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 10, scale: 0.95 }}
            transition={{ duration: 0.2 }}
            className="absolute right-0 mt-2 w-80 sm:w-96 z-50"
          >
            <NotificationPanel onClose={() => setIsOpen(false)} />
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}
