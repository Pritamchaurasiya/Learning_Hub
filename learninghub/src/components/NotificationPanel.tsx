import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  Check,
  Trash2,
  Bell,
  BookOpen,
  Trophy,
  Users,
  DollarSign,
  Settings,
  CheckCheck,
} from 'lucide-react'
import { useStore } from '../stores/useStore'
import { Button } from './ui/Button'

const icons = {
  course_update: BookOpen,
  achievement: Trophy,
  social: Users,
  system: Settings,
  payment: DollarSign,
}

const colors = {
  course_update: 'text-blue-500 bg-blue-100 dark:bg-blue-900/30',
  achievement: 'text-amber-500 bg-amber-100 dark:bg-amber-900/30',
  social: 'text-purple-500 bg-purple-100 dark:bg-purple-900/30',
  system: 'text-gray-500 bg-gray-100 dark:bg-gray-800',
  payment: 'text-emerald-500 bg-emerald-100 dark:bg-emerald-900/30',
}

interface NotificationPanelProps {
  onClose: () => void
}

export function NotificationPanel({ onClose }: NotificationPanelProps) {
  const [filter, setFilter] = useState<'all' | 'unread'>('all')
  const { notifications, markNotificationAsRead, markAllNotificationsAsRead, clearNotifications } =
    useStore()

  const filteredNotifications =
    filter === 'unread' ? notifications.filter(n => !n.isRead) : notifications

  const unreadCount = notifications.filter(n => !n.isRead).length

  const handleMarkAsRead = (id: string) => {
    markNotificationAsRead(id)
  }

  const handleMarkAllAsRead = () => {
    markAllNotificationsAsRead()
  }

  const handleClearAll = () => {
    clearNotifications()
  }

  const formatTime = (date: string) => {
    const now = new Date()
    const notifDate = new Date(date)
    const diff = now.getTime() - notifDate.getTime()
    const minutes = Math.floor(diff / 60000)
    const hours = Math.floor(diff / 3600000)
    const days = Math.floor(diff / 86400000)

    if (minutes < 1) return 'Just now'
    if (minutes < 60) return `${minutes}m ago`
    if (hours < 24) return `${hours}h ago`
    if (days < 7) return `${days}d ago`
    return notifDate.toLocaleDateString()
  }

  return (
    <div className="bg-white dark:bg-gray-900 rounded-2xl shadow-2xl border border-gray-200 dark:border-gray-800 overflow-hidden">
      {/* Header */}
      <div className="p-4 border-b border-gray-200 dark:border-gray-800">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Bell className="w-5 h-5 text-gray-600 dark:text-gray-400" />
            <h3 className="font-semibold text-gray-900 dark:text-white">Notifications</h3>
            {unreadCount > 0 && (
              <span className="px-2 py-0.5 text-xs font-medium bg-red-100 dark:bg-red-900/30 text-red-600 dark:text-red-400 rounded-full">
                {unreadCount}
              </span>
            )}
          </div>
          <div className="flex items-center gap-1">
            {unreadCount > 0 && (
              <button
                onClick={handleMarkAllAsRead}
                className="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
                title="Mark all as read"
              >
                <CheckCheck className="w-4 h-4 text-gray-500" />
              </button>
            )}
            <button
              onClick={handleClearAll}
              className="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
              title="Clear all"
            >
              <Trash2 className="w-4 h-4 text-gray-500" />
            </button>
          </div>
        </div>

        {/* Filter tabs */}
        <div className="flex gap-2 mt-3">
          <button
            onClick={() => setFilter('all')}
            className={`px-3 py-1 text-sm rounded-full transition-colors ${
              filter === 'all'
                ? 'bg-primary-100 dark:bg-primary-900/30 text-primary-700 dark:text-primary-400'
                : 'text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800'
            }`}
          >
            All
          </button>
          <button
            onClick={() => setFilter('unread')}
            className={`px-3 py-1 text-sm rounded-full transition-colors ${
              filter === 'unread'
                ? 'bg-primary-100 dark:bg-primary-900/30 text-primary-700 dark:text-primary-400'
                : 'text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800'
            }`}
          >
            Unread
          </button>
        </div>
      </div>

      {/* Notification list */}
      <div className="max-h-80 overflow-y-auto">
        {filteredNotifications.length === 0 ? (
          <div className="p-8 text-center">
            <Bell className="w-12 h-12 mx-auto text-gray-300 dark:text-gray-600 mb-3" />
            <p className="text-gray-500 dark:text-gray-400">
              {filter === 'unread' ? 'No unread notifications' : 'No notifications yet'}
            </p>
          </div>
        ) : (
          <AnimatePresence>
            {filteredNotifications.map(notification => {
              const Icon = icons[notification.type]
              return (
                <motion.div
                  key={notification.id}
                  initial={{ opacity: 0, y: -10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, x: -100 }}
                  className={`p-4 border-b border-gray-100 dark:border-gray-800 hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors ${
                    !notification.isRead ? 'bg-blue-50/50 dark:bg-blue-900/10' : ''
                  }`}
                >
                  <div className="flex gap-3">
                    <div className={`p-2 rounded-lg shrink-0 ${colors[notification.type]}`}>
                      <Icon className="w-4 h-4" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-gray-900 dark:text-white">
                        {notification.title}
                      </p>
                      <p className="text-sm text-gray-600 dark:text-gray-400 mt-0.5">
                        {notification.message}
                      </p>
                      <p className="text-xs text-gray-400 dark:text-gray-500 mt-1">
                        {formatTime(notification.createdAt)}
                      </p>
                    </div>
                    {!notification.isRead && (
                      <button
                        onClick={() => handleMarkAsRead(notification.id)}
                        className="shrink-0 p-1 rounded hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors"
                        title="Mark as read"
                      >
                        <Check className="w-4 h-4 text-gray-400" />
                      </button>
                    )}
                  </div>
                </motion.div>
              )
            })}
          </AnimatePresence>
        )}
      </div>

      {/* Footer */}
      <div className="p-3 border-t border-gray-200 dark:border-gray-800 bg-gray-50 dark:bg-gray-800/50">
        <Button
          variant="ghost"
          fullWidth
          onClick={() => {
            onClose()
            // Navigate to full notifications page
            window.location.href = '/notifications'
          }}
        >
          View all notifications
        </Button>
      </div>
    </div>
  )
}
