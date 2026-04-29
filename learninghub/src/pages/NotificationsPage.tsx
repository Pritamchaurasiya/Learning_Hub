import { useState, useEffect, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import { Bell, Check, Trash2, Clock, BookOpen, Trophy, MessageSquare, CheckCheck, AlertCircle, RefreshCw } from 'lucide-react'
import { SEO } from '../components/SEO'
import { Button } from '../components/ui/Button'
import { Card } from '../components/ui/Card'
import { notificationsService, type Notification } from '../services/notificationsService'

const notificationIcons = {
  course_update: BookOpen,
  achievement: Trophy,
  social: MessageSquare,
  reminder: Clock,
  system: Bell,
  payment: Bell
}

const notificationColors = {
  course_update: 'bg-blue-100 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400',
  achievement: 'bg-yellow-100 dark:bg-yellow-900/20 text-yellow-600 dark:text-yellow-400',
  social: 'bg-green-100 dark:bg-green-900/20 text-green-600 dark:text-green-400',
  reminder: 'bg-orange-100 dark:bg-orange-900/20 text-orange-600 dark:text-orange-400',
  system: 'bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400',
  payment: 'bg-purple-100 dark:bg-purple-900/20 text-purple-600 dark:text-purple-400'
}

export default function NotificationsPage() {
  const navigate = useNavigate()
  const [notifications, setNotifications] = useState<Notification[]>([])
  const [filter, setFilter] = useState<'all' | 'unread' | 'read'>('all')
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const fetchNotifications = useCallback(async () => {
    try {
      setIsLoading(true)
      setError(null)
      const response = await notificationsService.getNotifications()
      setNotifications(response.data)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load notifications')
      if (import.meta.env.DEV) {
        console.error('[NotificationsPage] Failed to fetch notifications:', err);
      }
    } finally {
      setIsLoading(false)
    }
  }, [])

  useEffect(() => {
    const controller = new AbortController()
    fetchNotifications().then(() => { 
      if (controller.signal.aborted) return 
    })
    return () => controller.abort()
  }, [fetchNotifications])

  // Subscribe to real-time notifications
  useEffect(() => {
    const unsubscribe = notificationsService.subscribeToNotifications((newNotification) => {
      setNotifications(prev => [newNotification, ...prev])
    })
    return unsubscribe
  }, [])

  const filteredNotifications = notifications.filter(notification => {
    if (filter === 'all') return true
    if (filter === 'unread') return !notification.isRead
    if (filter === 'read') return notification.isRead
    return true
  })

  const unreadCount = notifications.filter(n => !n.isRead).length

  const markAsRead = async (id: string) => {
    try {
      await notificationsService.markAsRead(id)
      setNotifications(prev =>
        prev.map(n => n.id === id ? { ...n, isRead: true } : n)
      )
    } catch (err) {
      if (import.meta.env.DEV) {
        console.error('[NotificationsPage] Failed to mark as read:', err);
      }
    }
  }

  const markAllAsRead = async () => {
    try {
      await notificationsService.markAllAsRead()
      setNotifications(prev =>
        prev.map(n => ({ ...n, isRead: true }))
      )
    } catch (err) {
      if (import.meta.env.DEV) {
        console.error('[NotificationsPage] Failed to mark all as read:', err);
      }
    }
  }

  const deleteNotification = async (id: string) => {
    try {
      await notificationsService.deleteNotification(id)
      setNotifications(prev => prev.filter(n => n.id !== id))
    } catch (err) {
      if (import.meta.env.DEV) {
        console.error('[NotificationsPage] Failed to delete notification:', err);
      }
    }
  }

  const clearAll = async () => {
    try {
      await notificationsService.clearAll()
      setNotifications([])
    } catch (err) {
      if (import.meta.env.DEV) {
        console.error('[NotificationsPage] Failed to clear all notifications:', err);
      }
    }
  }

  const formatTime = (timestamp: string) => {
    const date = new Date(timestamp)
    const now = new Date()
    const diffMs = now.getTime() - date.getTime()
    const diffMins = Math.floor(diffMs / 60000)
    const diffHours = Math.floor(diffMs / 3600000)
    const diffDays = Math.floor(diffMs / 86400000)

    if (diffMins < 1) return 'Just now'
    if (diffMins < 60) return `${diffMins}m ago`
    if (diffHours < 24) return `${diffHours}h ago`
    if (diffDays < 7) return `${diffDays}d ago`
    return date.toLocaleDateString()
  }

  const handleAction = (notification: Notification) => {
    if (notification.metadata?.link) {
      navigate(notification.metadata.link)
    } else if (notification.metadata?.courseId) {
      navigate(`/course/${notification.metadata.courseId}`)
    }
  }

  return (
    <>
      <SEO
        title="Notifications - LearningHub"
        description="View your notifications and updates"
        keywords="notifications, updates, alerts"
      />

      <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="relative">
              <Bell className="w-8 h-8 text-primary-600" />
              {unreadCount > 0 && !isLoading && (
                <span className="absolute -top-1 -right-1 w-5 h-5 bg-red-500 text-white text-xs rounded-full flex items-center justify-center">
                  {unreadCount}
                </span>
              )}
            </div>
            <div>
              <h1 className="text-3xl font-bold text-gray-900 dark:text-white">
                Notifications
              </h1>
              <p className="text-gray-600 dark:text-gray-400">
                {isLoading ? 'Loading...' : `${unreadCount} unread notification${unreadCount !== 1 ? 's' : ''}`}
              </p>
            </div>
          </div>

          <div className="flex gap-2">
            {unreadCount > 0 && !isLoading && (
              <Button
                variant="outline"
                leftIcon={<CheckCheck className="w-4 h-4" />}
                onClick={markAllAsRead}
                disabled={isLoading}
              >
                Mark All Read
              </Button>
            )}
            {notifications.length > 0 && !isLoading && (
              <Button
                variant="outline"
                leftIcon={<Trash2 className="w-4 h-4" />}
                onClick={clearAll}
                disabled={isLoading}
              >
                Clear All
              </Button>
            )}
          </div>
        </div>

        {/* Error State */}
        {error && (
          <Card className="p-6 border-red-200 dark:border-red-900 bg-red-50 dark:bg-red-900/10">
            <div className="flex items-center gap-3">
              <AlertCircle className="w-5 h-5 text-red-500" />
              <div className="flex-1">
                <p className="text-red-700 dark:text-red-400">{error}</p>
              </div>
              <Button 
                variant="outline" 
                size="sm" 
                leftIcon={<RefreshCw className="w-4 h-4" />}
                onClick={fetchNotifications}
              >
                Retry
              </Button>
            </div>
          </Card>
        )}

        {/* Filter */}
        <Card className="p-4">
          <div className="flex gap-2">
            <button
              onClick={() => setFilter('all')}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${
                filter === 'all'
                  ? 'bg-primary-600 text-white'
                  : 'bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-700'
              }`}
            >
              All ({notifications.length})
            </button>
            <button
              onClick={() => setFilter('unread')}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${
                filter === 'unread'
                  ? 'bg-primary-600 text-white'
                  : 'bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-700'
              }`}
            >
              Unread ({unreadCount})
            </button>
            <button
              onClick={() => setFilter('read')}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${
                filter === 'read'
                  ? 'bg-primary-600 text-white'
                  : 'bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-700'
              }`}
            >
              Read ({notifications.length - unreadCount})
            </button>
          </div>
        </Card>

        {/* Loading State */}
        {isLoading ? (
          <div className="space-y-3">
            {[...Array(5)].map((_, i) => (
              <Card key={i} className="p-4">
                <div className="flex gap-4">
                  <div className="w-12 h-12 rounded-full bg-gray-200 dark:bg-gray-700 animate-pulse flex-shrink-0" />
                  <div className="flex-1 space-y-2">
                    <div className="h-5 bg-gray-200 dark:bg-gray-700 rounded animate-pulse w-1/3" />
                    <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded animate-pulse w-3/4" />
                    <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded animate-pulse w-1/4" />
                  </div>
                </div>
              </Card>
            ))}
          </div>
        ) : (
          <>
            {/* Notifications List */}
            <div className="space-y-3">
              {filteredNotifications.map(notification => {
                const Icon = notificationIcons[notification.type] || Bell
                const colorClass = notificationColors[notification.type] || notificationColors.system

                return (
                  <Card
                    key={notification.id}
                    className={`p-4 transition-all cursor-pointer ${!notification.isRead ? 'bg-primary-50 dark:bg-primary-900/10 border-primary-200 dark:border-primary-800' : ''}`}
                    onClick={() => handleAction(notification)}
                  >
                    <div className="flex gap-4">
                      {/* Icon */}
                      <div className={`w-12 h-12 rounded-full flex items-center justify-center flex-shrink-0 ${colorClass}`}>
                        <Icon className="w-6 h-6" />
                      </div>

                      {/* Content */}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-start justify-between gap-2">
                          <div className="flex-1">
                            <h3 className={`font-semibold ${!notification.isRead ? 'text-gray-900 dark:text-white' : 'text-gray-700 dark:text-gray-300'}`}>
                              {notification.title}
                            </h3>
                            <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                              {notification.message}
                            </p>
                          </div>
                          <div className="flex items-center gap-2 flex-shrink-0">
                            {!notification.isRead && (
                              <Button
                                variant="ghost"
                                size="sm"
                                leftIcon={<Check className="w-4 h-4" />}
                                onClick={(e) => {
                                  e.stopPropagation()
                                  markAsRead(notification.id)
                                }}
                                aria-label="Mark as read"
                              />
                            )}
                            <Button
                              variant="ghost"
                              size="sm"
                              leftIcon={<Trash2 className="w-4 h-4" />}
                              onClick={(e) => {
                                e.stopPropagation()
                                deleteNotification(notification.id)
                              }}
                              aria-label="Delete notification"
                            />
                          </div>
                        </div>

                        <div className="flex items-center gap-4 mt-3">
                          <div className="flex items-center gap-1 text-sm text-gray-500 dark:text-gray-400">
                            <Clock className="w-4 h-4" />
                            {formatTime(notification.createdAt)}
                          </div>
                          {(notification.metadata?.link || notification.metadata?.courseId) && (
                            <Button
                              variant="link"
                              size="sm"
                              className="p-0 h-auto text-primary-600 dark:text-primary-400"
                            >
                              View →
                            </Button>
                          )}
                        </div>
                      </div>
                    </div>
                  </Card>
                )
              })}
            </div>

            {/* No Notifications */}
            {filteredNotifications.length === 0 && !error && (
              <div className="text-center py-12">
                <Bell className="w-16 h-16 text-gray-300 dark:text-gray-600 mx-auto mb-4" />
                <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">
                  {filter === 'unread' ? 'No unread notifications' : 'No notifications'}
                </h3>
                <p className="text-gray-600 dark:text-gray-400">
                  {filter === 'unread' ? 'All caught up!' : "You're all caught up"}
                </p>
              </div>
            )}
          </>
        )}
      </div>
    </>
  )
}
