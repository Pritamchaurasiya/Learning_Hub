/**
 * Notification Service - Real-time notifications via WebSocket
 *
 * Features:
 * - WebSocket connection management with auto-reconnect
 * - Notification types: info, success, warning, error
 * - Unread count tracking
 * - Mark as read functionality
 * - Integration with useStore for global state
 */

import { useEffect, useCallback, useRef, useState } from 'react'

import type { Notification } from '../types'
export type NotificationType = Notification['type']

interface NotificationMessage {
  type: 'notification'
  payload: Notification
}

interface UnreadCountMessage {
  type: 'unread_count'
  count: number
}

type WebSocketMessage = NotificationMessage | UnreadCountMessage

const WS_URL = import.meta.env.VITE_WS_URL ?? 'ws://localhost:5000/ws'
const RECONNECT_DELAY = 5000
const MAX_RECONNECT_ATTEMPTS = 5

class NotificationService {
  private ws: WebSocket | null = null
  private reconnectAttempts = 0
  private reconnectTimeout: ReturnType<typeof setTimeout> | null = null
  private listeners: Set<(notification: Notification) => void> = new Set()
  private unreadCountListeners: Set<(count: number) => void> = new Set()
  private isConnecting = false

  connect(token?: string): void {
    if (this.ws?.readyState === WebSocket.OPEN || this.isConnecting) return

    this.isConnecting = true
    // SECURITY: Never pass JWT as URL query param (appears in logs/history)
    // Connect without token in URL; send auth message after connection opens
    try {
      this.ws = new WebSocket(WS_URL)

      this.ws.onopen = () => {
        this.isConnecting = false
        this.reconnectAttempts = 0
        // Send auth token as first message (not in URL)
        if (token && this.ws?.readyState === WebSocket.OPEN) {
          this.ws.send(JSON.stringify({ type: 'auth', token }))
        }
        if (import.meta.env.DEV) {
          // eslint-disable-next-line no-console
          console.log('[NotificationService] Connected')
        }
      }

      this.ws.onmessage = event => {
        try {
          const message: WebSocketMessage = JSON.parse(event.data)
          this.handleMessage(message)
        } catch (err) {
          if (import.meta.env.DEV) {
            console.error('[NotificationService] Failed to parse message:', err)
          }
        }
      }

      this.ws.onclose = () => {
        this.isConnecting = false
        this.attemptReconnect(token)
      }

      this.ws.onerror = error => {
        this.isConnecting = false
        if (import.meta.env.DEV) {
          console.error('[NotificationService] WebSocket error:', error)
        }
      }
    } catch (err) {
      this.isConnecting = false
      if (import.meta.env.DEV) {
        console.error('[NotificationService] Failed to connect:', err)
      }
    }
  }

  private handleMessage(message: WebSocketMessage): void {
    switch (message.type) {
      case 'notification':
        this.listeners.forEach(listener => listener(message.payload))
        break
      case 'unread_count':
        this.unreadCountListeners.forEach(listener => listener(message.count))
        break
    }
  }

  private attemptReconnect(token?: string): void {
    if (this.reconnectAttempts >= MAX_RECONNECT_ATTEMPTS) {
      if (import.meta.env.DEV) {
        // eslint-disable-next-line no-console
        console.log('[NotificationService] Max reconnect attempts reached')
      }
      return
    }

    this.reconnectAttempts++
    if (import.meta.env.DEV) {
      // eslint-disable-next-line no-console
      console.log(
        `[NotificationService] Reconnecting... (${this.reconnectAttempts}/${MAX_RECONNECT_ATTEMPTS})`
      )
    }

    this.reconnectTimeout = setTimeout(() => {
      this.connect(token)
    }, RECONNECT_DELAY)
  }

  disconnect(): void {
    if (this.reconnectTimeout) {
      clearTimeout(this.reconnectTimeout)
      this.reconnectTimeout = null
    }
    if (this.ws) {
      this.ws.close()
      this.ws = null
    }
    this.reconnectAttempts = 0
    this.isConnecting = false
  }

  onNotification(callback: (notification: Notification) => void): () => void {
    this.listeners.add(callback)
    return () => this.listeners.delete(callback)
  }

  onUnreadCount(callback: (count: number) => void): () => void {
    this.unreadCountListeners.add(callback)
    return () => this.unreadCountListeners.delete(callback)
  }

  sendAck(notificationId: string): void {
    if (this.ws?.readyState === WebSocket.OPEN) {
      this.ws.send(JSON.stringify({ type: 'ack', notificationId }))
    }
  }
}

export const notificationService = new NotificationService()

// React Hook for notifications
export function useNotifications(token?: string) {
  const [notifications, setNotifications] = useState<Notification[]>([])
  const [unreadCount, setUnreadCount] = useState(0)
  const [isConnected, setIsConnected] = useState(false)
  const notificationsRef = useRef(notifications)

  // Keep ref in sync
  useEffect(() => {
    notificationsRef.current = notifications
  }, [notifications])

  useEffect(() => {
    if (!token) return

    // Connect to WebSocket
    notificationService.connect(token)

    // Listen for new notifications
    const unsubscribeNotification = notificationService.onNotification(notification => {
      setNotifications(prev => [notification, ...prev])
      setUnreadCount(count => count + 1)
    })

    // Listen for unread count updates
    const unsubscribeCount = notificationService.onUnreadCount(count => {
      setUnreadCount(count)
    })

    // Check connection status periodically
    const interval = setInterval(() => {
      // WebSocket state: 0=CONNECTING, 1=OPEN, 2=CLOSING, 3=CLOSED
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const ws = (notificationService as any).ws as WebSocket | null
      setIsConnected(ws?.readyState === WebSocket.OPEN)
    }, 1000)

    return () => {
      unsubscribeNotification()
      unsubscribeCount()
      clearInterval(interval)
      // Disconnect WebSocket on unmount to prevent dangling connections
      notificationService.disconnect()
    }
  }, [token])

  const markAsRead = useCallback((id: string) => {
    setNotifications(prev => prev.map(n => (n.id === id ? { ...n, isRead: true } : n)))
    setUnreadCount(count => Math.max(0, count - 1))
    notificationService.sendAck(id)
  }, [])

  const markAllAsRead = useCallback(() => {
    setNotifications(prev => prev.map(n => ({ ...n, isRead: true })))
    setUnreadCount(0)
  }, [])

  const removeNotification = useCallback((id: string) => {
    setNotifications(prev => {
      const notification = prev.find(n => n.id === id)
      if (notification && !notification.isRead) {
        setUnreadCount(count => Math.max(0, count - 1))
      }
      return prev.filter(n => n.id !== id)
    })
  }, [])

  const clearAll = useCallback(() => {
    setNotifications([])
    setUnreadCount(0)
  }, [])

  return {
    notifications,
    unreadCount,
    isConnected,
    markAsRead,
    markAllAsRead,
    removeNotification,
    clearAll,
  }
}

export default notificationService
