import { useEffect, useRef, useState, useCallback } from 'react'
import { io, type Socket } from 'socket.io-client'

interface WebSocketState {
  isConnected: boolean
  isConnecting: boolean
  error: Error | null
}

type WebSocketEventHandler = (data: unknown) => void

export function useWebSocket() {
  const socketRef = useRef<Socket | null>(null)
  const [state, setState] = useState<WebSocketState>({
    isConnected: false,
    isConnecting: false,
    error: null,
  })
  const eventHandlersRef = useRef<Map<string, Set<WebSocketEventHandler>>>(new Map())

  const connect = useCallback((token: string) => {
    if (socketRef.current?.connected) return

    setState(prev => ({ ...prev, isConnecting: true, error: null }))

    const API_URL = import.meta.env.VITE_API_URL?.replace('/api/v1', '') ?? 'http://localhost:5000'

    socketRef.current = io(API_URL, {
      auth: { token },
      transports: ['websocket', 'polling'],
      reconnection: true,
      reconnectionAttempts: 5,
      reconnectionDelay: 1000,
      reconnectionDelayMax: 5000,
    })

    const socket = socketRef.current

    socket.on('connect', () => {
      if (import.meta.env.DEV) {
        // eslint-disable-next-line no-console
        console.log('[WebSocket] Connected:', socket.id)
      }
      setState({ isConnected: true, isConnecting: false, error: null })

      // Re-register custom event handlers after reconnection
      eventHandlersRef.current.forEach((handlers, event) => {
        handlers.forEach(handler => {
          socket.off(event, handler) // Prevent duplicate listeners
          socket.on(event, handler)
        })
      })
    })

    socket.on('disconnect', (reason: string) => {
      if (import.meta.env.DEV) {
        // eslint-disable-next-line no-console
        console.log('[WebSocket] Disconnected:', reason)
      }
      setState(prev => ({ ...prev, isConnected: false }))
    })

    socket.on('connect_error', (error: Error) => {
      if (import.meta.env.DEV) {
        console.error('[WebSocket] Connection error:', error)
      }
      setState(prev => ({ ...prev, isConnecting: false, error }))
    })
  }, [])

  const disconnect = useCallback(() => {
    if (socketRef.current) {
      socketRef.current.removeAllListeners()
      socketRef.current.disconnect()
      socketRef.current = null
      setState({ isConnected: false, isConnecting: false, error: null })
    }
  }, [])

  const on = useCallback((event: string, handler: WebSocketEventHandler) => {
    if (!eventHandlersRef.current.has(event)) {
      eventHandlersRef.current.set(event, new Set())
    }
    // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
    eventHandlersRef.current.get(event)!.add(handler)

    socketRef.current?.on(event, handler)

    return () => off(event, handler)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const off = useCallback((event: string, handler: WebSocketEventHandler) => {
    eventHandlersRef.current.get(event)?.delete(handler)
    socketRef.current?.off(event, handler)
  }, [])

  const emit = useCallback((event: string, data?: unknown) => {
    socketRef.current?.emit(event, data)
  }, [])

  const joinRoom = useCallback((roomId: string) => {
    socketRef.current?.emit('join-room', roomId)
  }, [])

  const leaveRoom = useCallback((roomId: string) => {
    socketRef.current?.emit('leave-room', roomId)
  }, [])

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      disconnect()
    }
  }, [disconnect])

  return {
    ...state,
    connect,
    disconnect,
    on,
    off,
    emit,
    joinRoom,
    leaveRoom,
    socket: socketRef.current,
  }
}
