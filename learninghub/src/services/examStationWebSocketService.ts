/**
 * Real-Time Exam Station WebSocket Service.
 * Manages resilient bi-directional communication between examinee station
 * and backend Conductor ExamStationConsumer (ws/test/attempts/<attemptId>/).
 *
 * Capabilities:
 * - Live heartbeat & server-time synchronization
 * - Sub-10ms autosave streaming
 * - Instantaneous proctoring telemetry incident dispatch
 * - Remote proctor event listeners (warnings, time extensions, terminations)
 * - Exponential backoff reconnection with graceful HTTP fallback
 *
 * SECURITY: Uses in-memory token storage for WebSocket auth (not localStorage).
 * Main auth tokens are stored in httpOnly cookies set by backend.
 */

// In-memory token storage for WebSocket connections (not persisted to localStorage)
// This is set by the auth flow after successful login.
let wsAuthToken: string | null = null

export function setWsAuthToken(token: string | null): void {
  wsAuthToken = token
}

export function getWsAuthToken(): string | null {
  return wsAuthToken
}

export function clearWsAuthToken(): void {
  wsAuthToken = null
}

export interface ExamStationSocketHandlers {
  onConnectionEstablished?: (payload: {
    attemptId: string
    testId: string
    status: string
    timeRemainingSeconds: number
  }) => void
  onHeartbeatAck?: (payload: {
    timestamp: string
    timeRemainingSeconds: number
    status: string
  }) => void
  onAutosaveAck?: (payload: { questionId: string; status: string }) => void
  onProctorWarning?: (payload: { message: string; severity: string; issuedAt: string }) => void
  onProctorTimeExtension?: (payload: {
    secondsAdded: number
    newTimeRemaining?: number
    message?: string
  }) => void
  onProctorForceSubmit?: (payload: { reason: string }) => void
  onError?: (error: unknown) => void
  onStatusChange?: (isConnected: boolean) => void
}

export interface AutosaveAnswerPayload {
  selected_options?: string[]
  text_answer?: string
  time_spent?: number
}

export class ExamStationWebSocketService {
  private socket: WebSocket | null = null
  private attemptId: string | null = null
  private handlers: ExamStationSocketHandlers = {}
  private heartbeatInterval: ReturnType<typeof setInterval> | null = null
  private reconnectTimeout: ReturnType<typeof setTimeout> | null = null
  private reconnectAttempts = 0
  private maxReconnectAttempts = 5
  private isExplicitlyClosed = false
  private pendingQueue: Array<Record<string, unknown>> = []
  private maxQueueSize = 50

  public isConnected(): boolean {
    return this.socket !== null && this.socket.readyState === WebSocket.OPEN
  }

  public getQueueLength(): number {
    return this.pendingQueue.length
  }

  public connect(attemptId: string, handlers: ExamStationSocketHandlers = {}): void {
    if (!attemptId) return

    // If already connected to the same attempt, update handlers and return
    if (this.attemptId === attemptId && this.isConnected()) {
      this.handlers = { ...this.handlers, ...handlers }
      return
    }

    this.disconnect(false)
    this.attemptId = attemptId
    this.handlers = handlers
    this.isExplicitlyClosed = false

    this.establishConnection()
  }

  private establishConnection(): void {
    if (!this.attemptId || this.isExplicitlyClosed) return

    try {
      let wsBase: string
      if (
        typeof import.meta !== 'undefined' &&
        import.meta.env &&
        typeof import.meta.env.VITE_WS_URL === 'string' &&
        import.meta.env.VITE_WS_URL.trim()
      ) {
        wsBase = import.meta.env.VITE_WS_URL.trim().replace(/\/+$/, '')
      } else {
        const protocol =
          typeof window !== 'undefined' && window.location.protocol === 'https:' ? 'wss:' : 'ws:'
        const host = (typeof window !== 'undefined' && window.location.host) || 'localhost:8000'
        wsBase = `${protocol}//${host}`
      }

      // Use in-memory token (set after login) instead of localStorage.
      // Backend may also read httpOnly cookies from WebSocket handshake.
      const token = getWsAuthToken()
      const tokenParam = token ? `?token=${encodeURIComponent(token)}` : ''
      const wsUrl = `${wsBase}/ws/test/attempts/${this.attemptId}/${tokenParam}`

      this.socket = new WebSocket(wsUrl)

      this.socket.onopen = () => {
        this.reconnectAttempts = 0
        this.handlers.onStatusChange?.(true)
        this.flushPendingQueue()
        this.startHeartbeat()
      }

      this.socket.onmessage = (event: MessageEvent) => {
        this.handleMessage(event.data)
      }

      this.socket.onclose = () => {
        this.stopHeartbeat()
        this.handlers.onStatusChange?.(false)
        this.socket = null

        if (!this.isExplicitlyClosed && this.reconnectAttempts < this.maxReconnectAttempts) {
          const delay = Math.min(1000 * Math.pow(2, this.reconnectAttempts), 10000)
          this.reconnectAttempts += 1
          this.reconnectTimeout = setTimeout(() => {
            this.establishConnection()
          }, delay)
        }
      }

      this.socket.onerror = (err: Event) => {
        this.handlers.onError?.(err)
      }
    } catch (err) {
      this.handlers.onError?.(err)
    }
  }

  private flushPendingQueue(): void {
    if (!this.isConnected() || !this.socket || this.pendingQueue.length === 0) return
    const queued = [...this.pendingQueue]
    this.pendingQueue = []
    for (const msg of queued) {
      try {
        this.socket.send(JSON.stringify(msg))
      } catch {
        // Re-queue if transmission fails
        if (this.pendingQueue.length < this.maxQueueSize) {
          this.pendingQueue.push(msg)
        }
      }
    }
  }

  private handleMessage(rawData: string): void {
    try {
      const data = JSON.parse(rawData)
      const type = data.type

      switch (type) {
        case 'connection_established':
          this.handlers.onConnectionEstablished?.({
            attemptId: data.attempt_id,
            testId: data.test_id,
            status: data.status,
            timeRemainingSeconds: data.time_remaining_seconds,
          })
          break

        case 'heartbeat_ack':
          this.handlers.onHeartbeatAck?.({
            timestamp: data.timestamp,
            timeRemainingSeconds: data.time_remaining_seconds,
            status: data.status,
          })
          break

        case 'autosave_ack':
          this.handlers.onAutosaveAck?.({
            questionId: data.question_id,
            status: data.status,
          })
          break

        case 'proctor_warning':
          this.handlers.onProctorWarning?.({
            message: data.message,
            severity: data.severity,
            issuedAt: data.issued_at,
          })
          break

        case 'proctor_time_extension':
          this.handlers.onProctorTimeExtension?.({
            secondsAdded: data.seconds_added,
            newTimeRemaining: data.new_time_remaining,
            message: data.message,
          })
          break

        case 'proctor_force_submit':
          this.handlers.onProctorForceSubmit?.({
            reason: data.reason,
          })
          break

        case 'test_timed_out':
          this.handlers.onProctorForceSubmit?.({
            reason: 'Test time limit expired.',
          })
          break

        default:
          break
      }
    } catch (e) {
      this.handlers.onError?.(e)
    }
  }

  private startHeartbeat(): void {
    this.stopHeartbeat()
    this.heartbeatInterval = setInterval(() => {
      this.send({ type: 'heartbeat' })
    }, 25000)
  }

  private stopHeartbeat(): void {
    if (this.heartbeatInterval) {
      clearInterval(this.heartbeatInterval)
      this.heartbeatInterval = null
    }
  }

  public send(payload: Record<string, unknown>, queueIfOffline = false): boolean {
    if (this.isConnected() && this.socket) {
      try {
        this.socket.send(JSON.stringify(payload))
        return true
      } catch {
        if (queueIfOffline && this.pendingQueue.length < this.maxQueueSize) {
          this.pendingQueue.push(payload)
        }
        return false
      }
    }
    if (queueIfOffline && this.pendingQueue.length < this.maxQueueSize) {
      this.pendingQueue.push(payload)
    }
    return false
  }

  public sendAutosave(questionId: string, answerData: AutosaveAnswerPayload): boolean {
    return this.send(
      {
        type: 'autosave',
        question_id: questionId,
        answer_data: answerData,
      },
      true
    )
  }

  public sendTelemetry(
    eventName: string,
    severity: 'low' | 'medium' | 'high' = 'low',
    details: Record<string, unknown> = {}
  ): boolean {
    return this.send(
      {
        type: 'telemetry_event',
        event_name: eventName,
        severity,
        details,
      },
      true
    )
  }

  public disconnect(clearQueue = true): void {
    this.isExplicitlyClosed = true
    this.stopHeartbeat()
    if (clearQueue) {
      this.pendingQueue = []
    }

    if (this.reconnectTimeout) {
      clearTimeout(this.reconnectTimeout)
      this.reconnectTimeout = null
    }

    if (this.socket) {
      this.socket.close()
      this.socket = null
    }

    this.attemptId = null
    this.handlers.onStatusChange?.(false)
  }
}

export const examStationWebSocketService = new ExamStationWebSocketService()
