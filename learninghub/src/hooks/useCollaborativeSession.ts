import { useEffect, useState, useCallback, useRef } from 'react'
import { useWebSocket } from './useWebSocket'

export interface CollabPeer {
  socketId: string
  userId: string
  userRole?: string
  joinedAt: number
}

export interface RemoteCursor {
  socketId: string
  userId: string
  line: number
  ch: number
}

export interface UseCollaborativeSessionProps {
  roomId: string | null
  enabled: boolean
  onRemoteCodeChange?: (code: string, language?: string) => void
  onRemoteCursorChange?: (cursor: RemoteCursor) => void
  onPeerRunningTests?: (peerUserId: string) => void
  onRemoteTestResults?: (data: { output: string; status: string }) => void
}

export function useCollaborativeSession({
  roomId,
  enabled,
  onRemoteCodeChange,
  onRemoteCursorChange,
  onPeerRunningTests,
  onRemoteTestResults,
}: UseCollaborativeSessionProps) {
  const { isConnected, connect, joinRoom, leaveRoom, emit, on, socket } = useWebSocket()
  const [activePeers, setActivePeers] = useState<CollabPeer[]>([])
  const [remoteCursor, setRemoteCursor] = useState<RemoteCursor | null>(null)
  const isJoinedRef = useRef(false)
  const lastEmittedCodeRef = useRef<string>('')

  // Connect & Join room when enabled
  useEffect(() => {
    if (enabled && roomId) {
      connect()
    } else {
      if (isJoinedRef.current && roomId) {
        leaveRoom(roomId)
        isJoinedRef.current = false
      }
    }
  }, [enabled, roomId, connect, leaveRoom])

  // Join room once connected
  useEffect(() => {
    if (isConnected && enabled && roomId && !isJoinedRef.current) {
      joinRoom(roomId)
      isJoinedRef.current = true
    }
  }, [isConnected, enabled, roomId, joinRoom])

  // Listen to collaborative socket events
  useEffect(() => {
    if (!isConnected || !enabled || !roomId) return

    // User joined room
    const unsubJoin = on<{ socketId: string; userId: string; userRole?: string }>(
      'user-joined',
      data => {
        setActivePeers(prev => {
          if (prev.some(p => p.socketId === data.socketId)) return prev
          return [
            ...prev,
            {
              socketId: data.socketId,
              userId: data.userId,
              userRole: data.userRole,
              joinedAt: Date.now(),
            },
          ]
        })
      }
    )

    // User left room
    const unsubLeft = on<{ socketId: string; userId: string }>('user-left', data => {
      setActivePeers(prev => prev.filter(p => p.socketId !== data.socketId))
      setRemoteCursor(prev => (prev?.socketId === data.socketId ? null : prev))
    })

    // Remote code update
    const unsubCode = on<{
      senderSocketId: string
      senderUserId: string
      code: string
      language?: string
      version: number
    }>('collab-code-update', data => {
      if (socket?.id && data.senderSocketId === socket.id) return
      lastEmittedCodeRef.current = data.code
      onRemoteCodeChange?.(data.code, data.language)
    })

    // Remote cursor update
    const unsubCursor = on<{
      senderSocketId: string
      senderUserId: string
      line: number
      ch: number
    }>('collab-cursor-update', data => {
      if (socket?.id && data.senderSocketId === socket.id) return
      const cursor: RemoteCursor = {
        socketId: data.senderSocketId,
        userId: data.senderUserId,
        line: data.line,
        ch: data.ch,
      }
      setRemoteCursor(cursor)
      onRemoteCursorChange?.(cursor)
    })

    // Peer running tests
    const unsubRun = on<{ senderSocketId: string; senderUserId: string }>(
      'collab-peer-running-tests',
      data => {
        if (socket?.id && data.senderSocketId === socket.id) return
        onPeerRunningTests?.(data.senderUserId)
      }
    )

    // Shared test results
    const unsubResults = on<{
      senderSocketId: string
      senderUserId: string
      output: string
      status: string
    }>('collab-test-results-shared', data => {
      if (socket?.id && data.senderSocketId === socket.id) return
      onRemoteTestResults?.(data)
    })

    return () => {
      unsubJoin()
      unsubLeft()
      unsubCode()
      unsubCursor()
      unsubRun()
      unsubResults()
    }
  }, [
    isConnected,
    enabled,
    roomId,
    socket,
    on,
    onRemoteCodeChange,
    onRemoteCursorChange,
    onPeerRunningTests,
    onRemoteTestResults,
  ])

  // Emit code changes (with loop prevention)
  const sendCodeChange = useCallback(
    (code: string, language?: string) => {
      if (!isConnected || !roomId || code === lastEmittedCodeRef.current) return
      lastEmittedCodeRef.current = code
      emit('collab-code-change', {
        roomId,
        code,
        language,
        version: Date.now(),
      })
    },
    [isConnected, roomId, emit]
  )

  // Emit cursor movements
  const sendCursorMove = useCallback(
    (line: number, ch: number) => {
      if (!isConnected || !roomId) return
      emit('collab-cursor-move', {
        roomId,
        line,
        ch,
      })
    },
    [isConnected, roomId, emit]
  )

  // Emit test execution trigger
  const sendRunTests = useCallback(() => {
    if (!isConnected || !roomId) return
    emit('collab-run-tests', { roomId })
  }, [isConnected, roomId, emit])

  // Emit test execution results
  const sendTestResults = useCallback(
    (output: string, status: 'passed' | 'failed' | 'error' = 'passed') => {
      if (!isConnected || !roomId) return
      emit('collab-test-results', {
        roomId,
        output,
        status,
      })
    },
    [isConnected, roomId, emit]
  )

  return {
    isConnected,
    activePeers,
    remoteCursor,
    sendCodeChange,
    sendCursorMove,
    sendRunTests,
    sendTestResults,
  }
}
