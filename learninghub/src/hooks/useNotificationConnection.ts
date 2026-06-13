import { useEffect, useRef } from 'react'
import { useStore } from '../stores/useStore'
import { type Notification } from '../services/notificationService'
import { useWebSocket } from './useWebSocket'

interface SocketNotification {
  id?: string
  title: string
  message: string
  type: Notification['type']
  read?: boolean
  isRead?: boolean
  createdAt?: string
}

function normalizeNotification(data: SocketNotification): Omit<Notification, 'id' | 'createdAt'> {
  return {
    title: data.title,
    message: data.message,
    type: data.type,
    isRead: data.isRead ?? data.read ?? false,
  }
}

/**
 * Manages real-time notification WebSocket connection.
 *
 * Key design decisions:
 * - fetchNotifications is called ONCE on mount (guarded by fetchedRef)
 * - WebSocket connect is called ONCE per auth session (guarded by connectedRef)
 * - addNotification is accessed via getState() to avoid dependency-triggered re-renders
 * - This prevents the infinite re-render loop that was causing dashboard freezes
 */
export function useNotificationConnection() {
  const auth = useStore(s => s.auth)
  const unreadCount = useStore(s => s.unreadCount)
  const ws = useWebSocket()
  const connectedRef = useRef(false)
  const fetchedRef = useRef(false)

  useEffect(() => {
    const token = localStorage.getItem('token')

    if (!auth.isAuthenticated || !token) {
      ws.disconnect()
      connectedRef.current = false
      fetchedRef.current = false
      return
    }

    if (!connectedRef.current) {
      ws.connect(token)
      connectedRef.current = true
    }

    if (!fetchedRef.current) {
      fetchedRef.current = true
      void useStore.getState().fetchNotifications()
    }

    const unsubscribe = ws.on('notification', (data: SocketNotification) => {
      useStore.getState().addNotification(normalizeNotification(data))
    })

    const handleTokenRefreshed = () => {
      const newToken = localStorage.getItem('token')
      if (newToken && auth.isAuthenticated) {
        ws.disconnect()
        connectedRef.current = false
        ws.connect(newToken)
        connectedRef.current = true
      }
    }

    window.addEventListener('auth:token-refreshed', handleTokenRefreshed)

    return () => {
      unsubscribe()
      window.removeEventListener('auth:token-refreshed', handleTokenRefreshed)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [auth.isAuthenticated])

  const markAsRead = async (id: string) => {
    useStore.getState().markNotificationAsRead(id)
  }

  return { unreadCount, markAsRead }
}
