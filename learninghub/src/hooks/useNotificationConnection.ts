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

export function useNotificationConnection() {
  const auth = useStore(s => s.auth)
  const unreadCount = useStore(s => s.unreadCount)
  const ws = useWebSocket()
  const connectedRef = useRef(false)
  const fetchedRef = useRef(false)

  useEffect(() => {
    const isAuthenticated = auth.isAuthenticated
    if (!isAuthenticated) {
      ws.disconnect()
      connectedRef.current = false
      fetchedRef.current = false
      return
    }

    const cleanupRef: { current: (() => void) | null } = { current: null }

    if (!connectedRef.current) {
      ws.connect()
      connectedRef.current = true
    }

    if (!fetchedRef.current) {
      fetchedRef.current = true
      void useStore.getState().fetchNotifications()
    }

    const unsubscribe = ws.on('notification', (data: SocketNotification) => {
      useStore.getState().addNotification(normalizeNotification(data))
    })

    cleanupRef.current = () => {
      unsubscribe()
    }

    return () => {
      cleanupRef.current?.()
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [auth.isAuthenticated])

  const markAsRead = async (id: string) => {
    useStore.getState().markNotificationAsRead(id)
  }

  return { unreadCount, markAsRead }
}
