import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { examStationWebSocketService } from './examStationWebSocketService'

class MockWebSocket {
  static instances: MockWebSocket[] = []
  url: string
  readyState: number = WebSocket.CONNECTING
  sentData: string[] = []
  onopen: (() => void) | null = null
  onclose: (() => void) | null = null
  onerror: ((err: any) => void) | null = null
  onmessage: ((ev: { data: string }) => void) | null = null

  constructor(url: string) {
    this.url = url
    MockWebSocket.instances.push(this)
  }

  send(data: string) {
    this.sentData.push(data)
  }

  close() {
    this.readyState = WebSocket.CLOSED
    this.onclose?.()
  }

  triggerOpen() {
    this.readyState = WebSocket.OPEN
    this.onopen?.()
  }

  triggerMessage(data: Record<string, unknown>) {
    this.onmessage?.({ data: JSON.stringify(data) })
  }
}

describe('ExamStationWebSocketService', () => {
  const originalWebSocket = global.WebSocket

  beforeEach(() => {
    MockWebSocket.instances = []
    global.WebSocket = MockWebSocket as any
    examStationWebSocketService.disconnect()
    vi.clearAllMocks()
  })

  afterEach(() => {
    examStationWebSocketService.disconnect()
    global.WebSocket = originalWebSocket
  })

  it('establishes connection and handles onopen handshake', () => {
    const onStatusChange = vi.fn()
    examStationWebSocketService.connect('attempt-uuid-01', { onStatusChange })

    const ws = MockWebSocket.instances[0]
    expect(ws).toBeDefined()
    expect(ws.url).toContain('/ws/test/attempts/attempt-uuid-01/')

    ws.triggerOpen()
    expect(onStatusChange).toHaveBeenCalledWith(true)
    expect(examStationWebSocketService.isConnected()).toBe(true)
  })

  it('handles connection_established and heartbeat_ack messages', () => {
    const onConnectionEstablished = vi.fn()
    const onHeartbeatAck = vi.fn()

    examStationWebSocketService.connect('attempt-uuid-02', {
      onConnectionEstablished,
      onHeartbeatAck,
    })

    const ws = MockWebSocket.instances[0]
    ws.triggerOpen()

    ws.triggerMessage({
      type: 'connection_established',
      attempt_id: 'attempt-uuid-02',
      test_id: 'test-101',
      status: 'in_progress',
      time_remaining_seconds: 1500,
    })

    expect(onConnectionEstablished).toHaveBeenCalledWith({
      attemptId: 'attempt-uuid-02',
      testId: 'test-101',
      status: 'in_progress',
      timeRemainingSeconds: 1500,
    })

    ws.triggerMessage({
      type: 'heartbeat_ack',
      timestamp: '2026-10-10T12:00:00Z',
      time_remaining_seconds: 1475,
      status: 'in_progress',
    })

    expect(onHeartbeatAck).toHaveBeenCalledWith({
      timestamp: '2026-10-10T12:00:00Z',
      timeRemainingSeconds: 1475,
      status: 'in_progress',
    })
  })

  it('handles proctor interventions: warnings, time extensions, and force submit', () => {
    const onProctorWarning = vi.fn()
    const onProctorTimeExtension = vi.fn()
    const onProctorForceSubmit = vi.fn()

    examStationWebSocketService.connect('attempt-uuid-03', {
      onProctorWarning,
      onProctorTimeExtension,
      onProctorForceSubmit,
    })

    const ws = MockWebSocket.instances[0]
    ws.triggerOpen()

    // 1. Proctor warning
    ws.triggerMessage({
      type: 'proctor_warning',
      message: 'Please refrain from opening multiple windows.',
      severity: 'high',
      issued_at: '2026-10-10T12:05:00Z',
    })

    expect(onProctorWarning).toHaveBeenCalledWith({
      message: 'Please refrain from opening multiple windows.',
      severity: 'high',
      issuedAt: '2026-10-10T12:05:00Z',
    })

    // 2. Extra time extension
    ws.triggerMessage({
      type: 'proctor_time_extension',
      seconds_added: 300,
      new_time_remaining: 1800,
      message: '5 minutes added for technical issue resolution.',
    })

    expect(onProctorTimeExtension).toHaveBeenCalledWith({
      secondsAdded: 300,
      newTimeRemaining: 1800,
      message: '5 minutes added for technical issue resolution.',
    })

    // 3. Force submit
    ws.triggerMessage({
      type: 'proctor_force_submit',
      reason: 'Proctor terminated exam session due to policy violation.',
    })

    expect(onProctorForceSubmit).toHaveBeenCalledWith({
      reason: 'Proctor terminated exam session due to policy violation.',
    })
  })

  it('streams autosaves and telemetry events over open socket', () => {
    examStationWebSocketService.connect('attempt-uuid-04')
    const ws = MockWebSocket.instances[0]
    ws.triggerOpen()

    // Send autosave
    const autosaveSent = examStationWebSocketService.sendAutosave('q-99', {
      selected_options: ['opt-1', 'opt-2'],
      time_spent: 42,
    })
    expect(autosaveSent).toBe(true)
    expect(JSON.parse(ws.sentData[0])).toEqual({
      type: 'autosave',
      question_id: 'q-99',
      answer_data: {
        selected_options: ['opt-1', 'opt-2'],
        time_spent: 42,
      },
    })

    // Send telemetry incident
    const telemSent = examStationWebSocketService.sendTelemetry('tab_switch', 'medium', {
      switchCount: 2,
    })
    expect(telemSent).toBe(true)
    expect(JSON.parse(ws.sentData[1])).toEqual({
      type: 'telemetry_event',
      event_name: 'tab_switch',
      severity: 'medium',
      details: {
        switchCount: 2,
      },
    })
  })

  it('gracefully disconnects and stops heartbeat timers', () => {
    const onStatusChange = vi.fn()
    examStationWebSocketService.connect('attempt-uuid-05', { onStatusChange })
    const ws = MockWebSocket.instances[0]
    ws.triggerOpen()

    examStationWebSocketService.disconnect()
    expect(examStationWebSocketService.isConnected()).toBe(false)
    expect(onStatusChange).toHaveBeenCalledWith(false)
  })
})
