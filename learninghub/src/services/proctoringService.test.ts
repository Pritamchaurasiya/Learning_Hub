import { describe, it, expect, vi, beforeEach } from 'vitest'
import { proctoringService } from './proctoringService'
import { api } from '../utils/api'

describe('proctoringService (Milestone 14)', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('starts proctoring session and returns active session payload', async () => {
    vi.spyOn(api, 'post').mockResolvedValueOnce({
      sessionId: 'sess-remote-100',
      userId: 'stud-1',
      testAttemptId: 'test-1',
      examTitle: 'DSA Final',
      startedAt: new Date().toISOString(),
      status: 'ACTIVE',
      integrityScore: 100,
      totalFramesAnalyzed: 0,
      incidents: [],
      averageGazeDeviation: 0.05,
      averageNoiseDecibels: 25,
    } as any)

    const session = await proctoringService.startSession({
      testAttemptId: 'test-1',
      examTitle: 'DSA Final',
    })

    expect(session.sessionId).toBe('sess-remote-100')
    expect(session.integrityScore).toBe(100)
    expect(session.status).toBe('ACTIVE')
  })

  it('sends telemetry and updates integrity score', async () => {
    vi.spyOn(api, 'post').mockResolvedValueOnce({
      updatedScore: 92,
      incidentsTriggered: [],
      status: 'ACTIVE',
    } as any)

    const result = await proctoringService.sendTelemetry('sess-100', {
      facesDetectedCount: 1,
      primaryFaceConfidence: 0.98,
      headPose: { yaw: 0, pitch: 0, roll: 0 },
      gazeDeviationScore: 0.05,
      audioNoiseDecibels: 25,
      isSpeechDetected: false,
      tabBlurred: false,
    })

    expect(result.updatedScore).toBe(92)
    expect(result.status).toBe('ACTIVE')
  })

  it('finalizes proctoring session and returns cryptographic audit report', async () => {
    vi.spyOn(api, 'post').mockResolvedValueOnce({
      sessionId: 'sess-100',
      userId: 'stud-1',
      testAttemptId: 'test-1',
      examTitle: 'DSA Final',
      durationMinutes: 30,
      finalIntegrityScore: 95,
      verdict: 'VERIFIED_CLEAN',
      totalIncidentsCount: 0,
      highSeverityCount: 0,
      incidentBreakdown: {
        FACE_MISSING: 0,
        MULTIPLE_FACES_DETECTED: 0,
        GAZE_AVERTED: 0,
        VOICE_ANOMALY_DETECTED: 0,
        TAB_SWITCH_ATTEMPT: 0,
        UNAUTHORIZED_DEVICE: 0,
        BACKGROUND_TALK: 0,
        SCREEN_SPLIT_SUSPECTED: 0,
      },
      gazeCompliancePercentage: 97,
      acousticCompliancePercentage: 99,
      cryptographicAuditHash: 'a'.repeat(64),
      generatedAt: new Date().toISOString(),
    } as any)

    const report = await proctoringService.finalizeSession('sess-100')
    expect(report.verdict).toBe('VERIFIED_CLEAN')
    expect(report.cryptographicAuditHash).toHaveLength(64)
    expect(report.finalIntegrityScore).toBe(95)
  })
})
