import { fetchApi } from '../utils/api'

export interface Notification {
  id: string
  type: 'course_update' | 'achievement' | 'reminder' | 'social' | 'system' | 'payment'
  title: string
  message: string
  isRead: boolean
  createdAt: string
  metadata?: {
    courseId?: string
    courseTitle?: string
    achievementName?: string
    userId?: string
    userName?: string
    link?: string
  }
}

export interface NotificationsResponse {
  status: string
  data: Notification[]
  unread_count: number
  total_count: number
}

export const notificationsService = {
  // Get all notifications
  async getNotifications(): Promise<NotificationsResponse> {
    return fetchApi('/notifications')
  },

  // Get unread notifications count
  async getUnreadCount(): Promise<{ status: string; unread_count: number }> {
    return fetchApi('/notifications/unread-count')
  },

  // Mark notification as read
  async markAsRead(id: string): Promise<{ status: string }> {
    return fetchApi(`/notifications/${id}/mark-read`, {
      method: 'POST',
    })
  },

  // Mark all notifications as read
  async markAllAsRead(): Promise<{ status: string; marked_count: number }> {
    return fetchApi('/notifications/mark-all-read', {
      method: 'POST',
    })
  },

  // Delete notification
  async deleteNotification(id: string): Promise<{ status: string }> {
    return fetchApi(`/notifications/${id}`, {
      method: 'DELETE',
    })
  },

  // Clear all notifications
  async clearAll(): Promise<{ status: string; deleted_count: number }> {
    return fetchApi('/notifications/clear-all', {
      method: 'POST',
    })
  },

  // Subscribe to real-time notifications (WebSocket/SSE)
  subscribeToNotifications(callback: (notification: Notification) => void): () => void {
    // Check if EventSource is supported
    if (typeof EventSource === 'undefined') {
      if (import.meta.env.DEV) {
        console.warn('[Notifications] SSE not supported in this browser')
      }
      return () => {}
    }

    const API_URL = import.meta.env.VITE_API_URL ?? 'http://localhost:8000/api'
    const eventSource = new EventSource(`${API_URL}/notifications/stream`, {
      withCredentials: true,
    })

    eventSource.onmessage = event => {
      try {
        const notification = JSON.parse(event.data)
        callback(notification)
      } catch (err) {
        if (import.meta.env.DEV) {
          console.error('[Notifications] Failed to parse SSE message:', err)
        }
      }
    }

    eventSource.onerror = err => {
      if (import.meta.env.DEV) {
        console.error('[Notifications] SSE error:', err)
      }
    }

    // Return cleanup function
    return () => {
      eventSource.close()
    }
  },
}
