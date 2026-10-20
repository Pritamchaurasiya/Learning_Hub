import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import {
  ExamStationWebSocketService,
  setWsAuthToken,
  getWsAuthToken,
  clearWsAuthToken,
} from './examStationWebSocketService'

class MockWebSocket {
  public static instances: MockWebSocket[] = []
  public url: string
  public readyState: number = WebSocket.CONNECTING
  public sentData: string[] = []

  public onopen: (() => void) | null = null
  public onmessage: ((event: { data: string }) => void) | null = null
  public onclose: (() => void) | null = null
  public onerror: ((error: unknown) => void) | null = null

  constructor(url: string) {
    this.url = url
    MockWebSocket.instances.push(this)
  }

  public send(data: string) {
    if (this.readyState !== WebSocket.OPEN) {
      throw new Error('WebSocket is not open')
    }
    this.sentData.push(data)
  }

  public close() {
    this.readyState = WebSocket.CLOSED
    if (this.onclose) this.onclose()
  }

  public triggerOpen() {
    this.readyState = WebSocket.OPEN
    if (this.onopen) this.onopen()
  }

  public triggerMessage(payload: Record<string, unknown>) {
    if (this.onmessage) {
      this.onmessage({ data: JSON.stringify(payload) })
    }
  }

  public triggerError(err: unknown) {
    if (this.onerror) this.onerror(err)
  }
}

describe('ExamStationWebSocketService', () => {
  let service: ExamStationWebSocketService
  const originalWebSocket = globalThis.WebSocket

  beforeEach(() => {
    MockWebSocket.instances = []
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    globalThis.WebSocket = MockWebSocket as any
    service = new ExamStationWebSocketService()
    clearWsAuthToken()
  })

  afterEach(() => {
    service.disconnect()
    globalThis.WebSocket = originalWebSocket
    vi.restoreAllMocks()
  })

  it('manages in-memory token state without touching localStorage', () => {
    expect(getWsAuthToken()).toBeNull()
    setWsAuthToken('test-secret-jwt')
    expect(getWsAuthToken()).toBe('test-secret-jwt')
    clearWsAuthToken()
    expect(getWsAuthToken()).toBeNull()
  })

  it('connects to attempt endpoint and includes auth token parameter', () => {
    setWsAuthToken('token-123')
    service.connect('attempt-456')

    expect(MockWebSocket.instances.length).toBe(1)
    const ws = MockWebSocket.instances[0]
    expect(ws.url).toContain('/ws/test/attempts/attempt-456/')
    expect(ws.url).toContain('token=token-123')
  })

  it('buffers autosaves while offline and flushes upon connection open', () => {
    // Attempt to autosave before connecting
    expect(service.isConnected()).toBe(false)
    const queued1 = service.sendAutosave('q-1', { selected_options: ['opt-a'], time_spent: 10 })
    expect(queued1).toBe(false)
    expect(service.getQueueLength()).toBe(1)

    // Connect and trigger open
    service.connect('attempt-789')
    const ws = MockWebSocket.instances[0]
    ws.triggerOpen()

    expect(service.isConnected()).toBe(true)
    expect(service.getQueueLength()).toBe(0)
    expect(ws.sentData.length).toBe(1)

    const flushed = JSON.parse(ws.sentData[0])
    expect(flushed.type).toBe('autosave')
    expect(flushed.question_id).toBe('q-1')
  })

  it('dispatches incoming WebSocket events to registered handlers', () => {
    const onEstablished = vi.fn()
    const onWarning = vi.fn()
    const onExtension = vi.fn()
    const onForceSubmit = vi.fn()

    service.connect('attempt-xyz', {
      onConnectionEstablished: onEstablished,
      onProctorWarning: onWarning,
      onProctorTimeExtension: onExtension,
      onProctorForceSubmit: onForceSubmit,
    })

    const ws = MockWebSocket.instances[0]
    ws.triggerOpen()

    // 1. Connection established
    ws.triggerMessage({
      type: 'connection_established',
      attempt_id: 'attempt-xyz',
      test_id: 'test-abc',
      status: 'in_progress',
      time_remaining_seconds: 1800,
    })
    expect(onEstablished).toHaveBeenCalledWith({
      attemptId: 'attempt-xyz',
      testId: 'test-abc',
      status: 'in_progress',
      timeRemainingSeconds: 1800,
    })

    // 2. Proctor warning
    ws.triggerMessage({
      type: 'proctor_warning',
      message: 'Tab switch detected.',
      severity: 'medium',
      issued_at: '2026-10-20T12:00:00Z',
    })
    expect(onWarning).toHaveBeenCalledWith({
      message: 'Tab switch detected.',
      severity: 'medium',
      issuedAt: '2026-10-20T12:00:00Z',
    })

    // 3. Proctor time extension
    ws.triggerMessage({
      type: 'proctor_time_extension',
      seconds_added: 300,
      new_time_remaining: 2100,
      message: '5 minutes extra added',
    })
    expect(onExtension).toHaveBeenCalledWith({
      secondsAdded: 300,
      newTimeRemaining: 2100,
      message: '5 minutes extra added',
    })

    // 4. Force submit
    ws.triggerMessage({
      type: 'proctor_force_submit',
      reason: 'Proctor terminated test.',
    })
    expect(onForceSubmit).toHaveBeenCalledWith({
      reason: 'Proctor terminated test.',
    })
  })

  it('cleans up state and resets connection when disconnect is called', () => {
    const onStatusChange = vi.fn()
    service.connect('attempt-999', { onStatusChange })
    const ws = MockWebSocket.instances[0]
    ws.triggerOpen()

    expect(service.isConnected()).toBe(true)

    service.disconnect()
    expect(service.isConnected()).toBe(false)
    expect(service.getQueueLength()).toBe(0)
    expect(onStatusChange).toHaveBeenCalledWith(false)
  })
})
