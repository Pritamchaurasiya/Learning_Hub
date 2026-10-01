import { useEffect, useState, useCallback, useRef } from 'react'
import { io, type Socket } from 'socket.io-client'

interface WebSocketState {
  isConnected: boolean
  isConnecting: boolean
  error: Error | null
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type WebSocketEventHandler<T = any> = (data: T) => void

interface UseWebSocketReturn extends WebSocketState {
  connect: () => void
  disconnect: () => void
  on: <T>(event: string, handler: WebSocketEventHandler<T>) => () => void
  off: (event: string, handler: WebSocketEventHandler) => void
  emit: (event: string, data?: unknown) => void
  joinRoom: (roomId: string) => void
  leaveRoom: (roomId: string) => void
  socket: Socket | null
}

/**
 * Production-grade WebSocket hook with per-instance connection management.
 * Each component gets its own socket connection with proper cleanup.
 * Uses React refs for stable references and avoids singleton anti-pattern.
 */
export function useWebSocket(): UseWebSocketReturn {
  const [state, setState] = useState<WebSocketState>({
    isConnected: false,
    isConnecting: false,
    error: null,
  })

  const socketRef = useRef<Socket | null>(null)
  const eventHandlersRef = useRef<Map<string, Set<WebSocketEventHandler>>>(new Map())
  const connectAttemptCountRef = useRef(0)
  const isMountedRef = useRef(true)
  const MAX_RECONNECT_ATTEMPTS = 10

  const updateState = useCallback(
    (newState: Partial<WebSocketState> | ((prev: WebSocketState) => WebSocketState)) => {
      if (!isMountedRef.current) return
      setState(prev => {
        const nextState = typeof newState === 'function' ? newState(prev) : { ...prev, ...newState }
        return nextState
      })
    },
    []
  )

  const connect = useCallback(() => {
    if (socketRef.current?.connected || socketRef.current?.active) return

    if (connectAttemptCountRef.current >= MAX_RECONNECT_ATTEMPTS) {
      if (import.meta.env.DEV) {
        console.warn('[WebSocket] Max reconnection attempts reached. Giving up.')
      }
      return
    }

    updateState({ isConnecting: true, error: null })

    const envUrl = import.meta.env.VITE_API_URL
    if (!envUrl && import.meta.env.PROD) {
      throw new Error('VITE_API_URL environment variable is required for WebSocket connection')
    }
    const API_URL = envUrl?.startsWith('http')
      ? envUrl.replace('/api/v1', '')
      : window.location.origin

    const socket = io(API_URL, {
      transports: ['websocket', 'polling'],
      withCredentials: true,
      reconnection: true,
      reconnectionAttempts: MAX_RECONNECT_ATTEMPTS,
      reconnectionDelay: 2000,
      reconnectionDelayMax: 30000,
      randomizationFactor: 0.5,
      timeout: 10000,
      forceNew: true,
    })

    socketRef.current = socket

    socket.on('connect', () => {
      connectAttemptCountRef.current = 0
      if (import.meta.env.DEV) {
        console.warn('[WebSocket] Connected:', socket.id)
      }
      updateState({ isConnected: true, isConnecting: false, error: null })

      // Re-register all event handlers
      eventHandlersRef.current.forEach((handlers, event) => {
        handlers.forEach(handler => {
          socket.off(event, handler)
          socket.on(event, handler)
        })
      })
    })

    socket.on('disconnect', (reason: string) => {
      if (import.meta.env.DEV) {
        console.warn('[WebSocket] Disconnected:', reason)
      }
      updateState({ isConnected: false })
    })

    socket.on('connect_error', (error: Error) => {
      connectAttemptCountRef.current++

      if (connectAttemptCountRef.current === 1 && import.meta.env.DEV) {
        console.warn('[WebSocket] Connection failed — will retry with backoff:', error.message)
      } else if (connectAttemptCountRef.current >= MAX_RECONNECT_ATTEMPTS) {
        if (import.meta.env.DEV) {
          console.warn('[WebSocket] All reconnection attempts exhausted.')
        }
        socket.disconnect()
      }

      updateState({ isConnecting: false, error })
    })
  }, [updateState])

  const disconnect = useCallback(() => {
    if (socketRef.current) {
      socketRef.current.removeAllListeners()
      socketRef.current.disconnect()
      socketRef.current = null
      connectAttemptCountRef.current = 0
      updateState({ isConnected: false, isConnecting: false, error: null })
    }
  }, [updateState])

  const on = useCallback(<T>(event: string, handler: WebSocketEventHandler<T>) => {
    if (!eventHandlersRef.current.has(event)) {
      eventHandlersRef.current.set(event, new Set())
    }
    eventHandlersRef.current.get(event)!.add(handler)

    socketRef.current?.on(event, handler)

    return () => off(event, handler)
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
    isMountedRef.current = true
    return () => {
      isMountedRef.current = false
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
    get socket() {
      return socketRef.current
    },
  }
}
