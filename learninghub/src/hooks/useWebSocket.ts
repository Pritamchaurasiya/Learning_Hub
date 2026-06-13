import { useEffect, useState, useCallback } from 'react'
import { io, type Socket } from 'socket.io-client'

interface WebSocketState {
  isConnected: boolean
  isConnecting: boolean
  error: Error | null
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type WebSocketEventHandler<T = any> = (data: T) => void

// Module-level singleton state
let globalSocket: Socket | null = null
let globalState: WebSocketState = {
  isConnected: false,
  isConnecting: false,
  error: null,
}
const globalEventHandlers = new Map<string, Set<WebSocketEventHandler>>()
let connectAttemptCount = 0
const MAX_RECONNECT_ATTEMPTS = 10

// A set of setters to notify all instances of state changes
const stateSubscribers = new Set<React.Dispatch<React.SetStateAction<WebSocketState>>>()

function updateGlobalState(newState: Partial<WebSocketState> | ((prev: WebSocketState) => WebSocketState)) {
  const nextState = typeof newState === 'function' ? newState(globalState) : { ...globalState, ...newState }
  globalState = nextState
  stateSubscribers.forEach(setState => setState(nextState))
}

/**
 * Production-grade WebSocket hook with:
 * - Exponential backoff with jitter on reconnection
 * - Maximum reconnection attempts (10) with increasing delays
 * - Silent failure handling — no console spam in production
 * - Singleton socket instance per application lifecycle
 */
export function useWebSocket() {
  const [state, setState] = useState<WebSocketState>(globalState)

  useEffect(() => {
    stateSubscribers.add(setState)
    return () => {
      stateSubscribers.delete(setState)
    }
  }, [])

  const connect = useCallback((token: string) => {
    if (globalSocket?.connected || globalSocket?.active) return

    if (connectAttemptCount >= MAX_RECONNECT_ATTEMPTS) {
      if (import.meta.env.DEV) {
        console.warn('[WebSocket] Max reconnection attempts reached. Giving up.')
      }
      return
    }

    updateGlobalState({ isConnecting: true, error: null })

    const API_URL = import.meta.env.VITE_API_URL?.replace('/api/v1', '') ?? 'http://localhost:5000'

    globalSocket = io(API_URL, {
      auth: { token },
      transports: ['websocket', 'polling'],
      reconnection: true,
      reconnectionAttempts: MAX_RECONNECT_ATTEMPTS,
      reconnectionDelay: 2000,
      reconnectionDelayMax: 30000,
      randomizationFactor: 0.5,
      timeout: 10000,
      forceNew: true,
    })

    const socket = globalSocket

    socket.on('connect', () => {
      connectAttemptCount = 0
      if (import.meta.env.DEV) {
        // eslint-disable-next-line no-console
        console.log('[WebSocket] Connected:', socket.id)
      }
      updateGlobalState({ isConnected: true, isConnecting: false, error: null })

      globalEventHandlers.forEach((handlers, event) => {
        handlers.forEach(handler => {
          socket.off(event, handler)
          socket.on(event, handler)
        })
      })
    })

    socket.on('disconnect', (reason: string) => {
      if (import.meta.env.DEV) {
        // eslint-disable-next-line no-console
        console.log('[WebSocket] Disconnected:', reason)
      }
      updateGlobalState({ isConnected: false })
    })

    socket.on('connect_error', (error: Error) => {
      connectAttemptCount++

      if (connectAttemptCount === 1 && import.meta.env.DEV) {
        console.warn('[WebSocket] Connection failed — will retry with backoff:', error.message)
      } else if (connectAttemptCount >= MAX_RECONNECT_ATTEMPTS) {
        if (import.meta.env.DEV) {
          console.warn('[WebSocket] All reconnection attempts exhausted.')
        }
        socket.disconnect()
      }

      updateGlobalState({ isConnecting: false, error })
    })
  }, [])

  const disconnect = useCallback(() => {
    if (globalSocket) {
      globalSocket.removeAllListeners()
      globalSocket.disconnect()
      globalSocket = null
      connectAttemptCount = 0
      updateGlobalState({ isConnected: false, isConnecting: false, error: null })
    }
  }, [])

  const on = useCallback((event: string, handler: WebSocketEventHandler) => {
    if (!globalEventHandlers.has(event)) {
      globalEventHandlers.set(event, new Set())
    }
    // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
    globalEventHandlers.get(event)!.add(handler)

    globalSocket?.on(event, handler)

    return () => off(event, handler)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const off = useCallback((event: string, handler: WebSocketEventHandler) => {
    globalEventHandlers.get(event)?.delete(handler)
    globalSocket?.off(event, handler)
  }, [])

  const emit = useCallback((event: string, data?: unknown) => {
    globalSocket?.emit(event, data)
  }, [])

  const joinRoom = useCallback((roomId: string) => {
    globalSocket?.emit('join-room', roomId)
  }, [])

  const leaveRoom = useCallback((roomId: string) => {
    globalSocket?.emit('leave-room', roomId)
  }, [])

  return {
    ...state,
    connect,
    disconnect,
    on,
    off,
    emit,
    joinRoom,
    leaveRoom,
    get socket() { return globalSocket },
  }
}

