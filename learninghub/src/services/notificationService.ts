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

export const notificationService = {
  // Get all notifications
  async getNotifications(): Promise<NotificationsResponse> {
    return fetchApi('/notifications')
  },

  // Get unread notifications count
  async getUnreadCount(): Promise<{ status: string; count: number }> {
    return fetchApi('/notifications/unread-count')
  },

  // Mark notification as read
  async markAsRead(id: string): Promise<{ status: string }> {
    return fetchApi(`/notifications/${id}/read`, {
      method: 'PATCH',
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
    try {
      const result = await fetchApi('/notifications', {
        method: 'DELETE',
      })
      return result
    } catch {
      // Fallback: individually delete all notifications
      const notifications = await this.getNotifications()
      const ids = notifications.data?.map(n => n.id) ?? []
      for (const id of ids) {
        await this.deleteNotification(id).catch(() => {})
      }
      return { status: 'success', deleted_count: ids.length }
    }
  },
}

export default notificationService
