import {
  ProctoringEngineService,
  FrameTelemetryPayload,
} from '../../services/ProctoringEngineService'

describe('ProctoringEngineService (Milestone 14 Multi-Modal Vision & Audio Proctoring)', () => {
  let service: ProctoringEngineService

  beforeEach(() => {
    service = new ProctoringEngineService()
  })

  it('initializes a fresh proctoring session with maximum integrity score', () => {
    const session = service.startSession({
      userId: 'student-uuid-42',
      testAttemptId: 'attempt-dsa-final',
      examTitle: 'Advanced Data Structures Midterm',
    })

    expect(session.sessionId).toBeDefined()
    expect(session.integrityScore).toBe(100)
    expect(session.status).toBe('ACTIVE')
    expect(session.incidents).toHaveLength(0)
  })

  it('penalizes integrity score and flags an incident when face is missing', () => {
    const session = service.startSession({
      userId: 'student-1',
      testAttemptId: 'test-1',
      examTitle: 'Algorithms Exam',
    })

    const telemetry: FrameTelemetryPayload = {
      facesDetectedCount: 0,
      primaryFaceConfidence: 0,
      headPose: { yaw: 0, pitch: 0, roll: 0 },
      gazeDeviationScore: 0.1,
      audioNoiseDecibels: 25,
      isSpeechDetected: false,
      tabBlurred: false,
    }

    const result = service.processFrameTelemetry(session.sessionId, telemetry)
    expect(result.updatedScore).toBeLessThan(100)
    expect(result.incidentsTriggered).toHaveLength(1)
    expect(result.incidentsTriggered[0].type).toBe('FACE_MISSING')
    expect(result.incidentsTriggered[0].severity).toBe('HIGH')
  })

  it('triggers critical incident penalty when multiple faces are detected', () => {
    const session = service.startSession({
      userId: 'student-2',
      testAttemptId: 'test-2',
      examTitle: 'System Design Exam',
    })

    const telemetry: FrameTelemetryPayload = {
      facesDetectedCount: 3,
      primaryFaceConfidence: 0.99,
      headPose: { yaw: 0, pitch: 0, roll: 0 },
      gazeDeviationScore: 0.1,
      audioNoiseDecibels: 30,
      isSpeechDetected: false,
      tabBlurred: false,
    }

    const result = service.processFrameTelemetry(session.sessionId, telemetry)
    expect(result.updatedScore).toBeLessThanOrEqual(88) // deducted 12
    expect(result.incidentsTriggered[0].type).toBe('MULTIPLE_FACES_DETECTED')
    expect(result.incidentsTriggered[0].severity).toBe('CRITICAL')
  })

  it('detects audio voice anomaly and tab-switch defocus events', () => {
    const session = service.startSession({
      userId: 'student-3',
      testAttemptId: 'test-3',
      examTitle: 'Database Systems Exam',
    })

    const telemetry: FrameTelemetryPayload = {
      facesDetectedCount: 1,
      primaryFaceConfidence: 0.95,
      headPose: { yaw: 10, pitch: 5, roll: 0 },
      gazeDeviationScore: 0.2,
      audioNoiseDecibels: 68,
      isSpeechDetected: true,
      tabBlurred: true,
    }

    const result = service.processFrameTelemetry(session.sessionId, telemetry)
    expect(result.incidentsTriggered.map(i => i.type)).toContain('VOICE_ANOMALY_DETECTED')
    expect(result.incidentsTriggered.map(i => i.type)).toContain('TAB_SWITCH_ATTEMPT')
  })

  it('concludes session and generates signed cryptographic verification report', () => {
    const session = service.startSession({
      userId: 'student-clean',
      testAttemptId: 'test-clean',
      examTitle: 'Clean Integrity Exam',
    })

    // Process a normal compliant frame
    service.processFrameTelemetry(session.sessionId, {
      facesDetectedCount: 1,
      primaryFaceConfidence: 0.98,
      headPose: { yaw: 2, pitch: 3, roll: 0 },
      gazeDeviationScore: 0.05,
      audioNoiseDecibels: 28,
      isSpeechDetected: false,
      tabBlurred: false,
    })

    const report = service.finalizeSession(session.sessionId)
    expect(report.finalIntegrityScore).toBe(100)
    expect(report.verdict).toBe('VERIFIED_CLEAN')
    expect(report.cryptographicAuditHash).toBeDefined()
    expect(report.cryptographicAuditHash).toHaveLength(64) // HMAC-SHA256 hex string
    expect(report.gazeCompliancePercentage).toBeGreaterThanOrEqual(90)
  })

  it('flags session for manual review when score falls below threshold', () => {
    const session = service.startSession({
      userId: 'student-compromised',
      testAttemptId: 'test-compromised',
      examTitle: 'High Stakes Final',
    })

    // Log high severity incidents
    service.logIncident(session.sessionId, {
      type: 'TAB_SWITCH_ATTEMPT',
      severity: 'HIGH',
      confidence: 1.0,
      description: 'Defocus event 1',
    })
    service.logIncident(session.sessionId, {
      type: 'MULTIPLE_FACES_DETECTED',
      severity: 'CRITICAL',
      confidence: 0.99,
      description: 'Second person detected behind candidate',
    })

    const report = service.finalizeSession(session.sessionId)
    expect(report.verdict).toBe('FLAGGED_FOR_MANUAL_REVIEW')
    expect(report.highSeverityCount).toBeGreaterThanOrEqual(2)
  })
})
