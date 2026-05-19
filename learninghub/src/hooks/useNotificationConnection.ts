/**
 * useNotificationConnection Hook
 * Connects to WebSocket notification service when user is authenticated
 * Integrates with the Zustand store for global notification state
 */

import { useEffect } from 'react'
import { useStore } from '../stores/useStore'
import { notificationService } from '../services/notificationService'

export function useNotificationConnection() {
  const { auth, addNotification, markNotificationAsRead, unreadCount } = useStore()

  useEffect(() => {
    if (!auth.isAuthenticated) {
      notificationService.disconnect()
      return
    }

    // Get token from localStorage
    const token = localStorage.getItem('token')
    if (!token) {
      notificationService.disconnect()
      return
    }

    // Connect to WebSocket with auth token
    notificationService.connect(token)

    // Listen for new notifications
    const unsubscribe = notificationService.onNotification(notification => {
      // Transform backend notification format to frontend format
      // Backend uses 'read', frontend uses 'isRead'
      addNotification({
        title: notification.title,
        message: notification.message,
        type: notification.type,
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        isRead: (notification as any).read ?? false,
      })
    })

    // Initial fetch of notifications
    const { fetchNotifications } = useStore.getState()
    void fetchNotifications()

    return () => {
      unsubscribe()
    }
  }, [auth.isAuthenticated, addNotification])

  // Mark notification as read via WebSocket
  const markAsRead = (id: string) => {
    notificationService.sendAck(id)
    markNotificationAsRead(id)
  }

  return {
    unreadCount,
    markAsRead,
  }
}
