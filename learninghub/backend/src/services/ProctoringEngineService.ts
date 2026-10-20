import crypto from 'crypto'
import logger from '../utils/logger'

export type IncidentSeverity = 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL'

export type IncidentType =
  | 'FACE_MISSING'
  | 'MULTIPLE_FACES_DETECTED'
  | 'GAZE_AVERTED'
  | 'VOICE_ANOMALY_DETECTED'
  | 'TAB_SWITCH_ATTEMPT'
  | 'UNAUTHORIZED_DEVICE'
  | 'BACKGROUND_TALK'
  | 'SCREEN_SPLIT_SUSPECTED'

export interface ProctorIncident {
  id: string
  timestamp: string
  type: IncidentType
  severity: IncidentSeverity
  confidence: number
  description: string
  snapshotHash?: string
  dismissed?: boolean
}

export interface FrameTelemetryPayload {
  facesDetectedCount: number
  primaryFaceConfidence: number
  headPose: {
    yaw: number   // horizontal turn (-90 to +90)
    pitch: number // vertical tilt (-90 to +90)
    roll: number  // tilt (-90 to +90)
  }
  gazeDeviationScore: number // 0 (direct on screen) to 1 (looking completely away)
  audioNoiseDecibels: number // ambient volume level (dB)
  isSpeechDetected: boolean
  tabBlurred: boolean
  clientTimestamp?: string
}

export interface ProctoringSession {
  sessionId: string
  userId: string
  testAttemptId: string
  examTitle: string
  startedAt: string
  endedAt?: string
  status: 'ACTIVE' | 'FLAGGED' | 'COMPLETED' | 'TERMINATED'
  integrityScore: number // 100 max, decrements on infractions
  totalFramesAnalyzed: number
  incidents: ProctorIncident[]
  averageGazeDeviation: number
  averageNoiseDecibels: number
  sessionSignature?: string
  lastFaceMissingAt?: number
  lastGazeAvertedAt?: number
}

export interface ProctoringSummaryReport {
  sessionId: string
  userId: string
  testAttemptId: string
  examTitle: string
  durationMinutes: number
  finalIntegrityScore: number
  verdict: 'VERIFIED_CLEAN' | 'FLAGGED_FOR_MANUAL_REVIEW' | 'INVALIDATED_INTEGRITY_BREACH'
  totalIncidentsCount: number
  highSeverityCount: number
  incidentBreakdown: Record<IncidentType, number>
  gazeCompliancePercentage: number
  acousticCompliancePercentage: number
  cryptographicAuditHash: string
  generatedAt: string
}

export class ProctoringEngineService {
  private sessions: Map<string, ProctoringSession> = new Map()
  private readonly HMAC_SECRET = process.env.PROCTORING_SECRET || 'anti-gravity-proctor-secret-key-prod-2028'

  /**
   * Initializes a new proctored exam session
   */
  startSession(params: {
    userId: string
    testAttemptId: string
    examTitle: string
  }): ProctoringSession {
    const sessionId = `proc-sess-${Date.now()}-${crypto.randomBytes(4).toString('hex')}`
    const session: ProctoringSession = {
      sessionId,
      userId: params.userId,
      testAttemptId: params.testAttemptId,
      examTitle: params.examTitle,
      startedAt: new Date().toISOString(),
      status: 'ACTIVE',
      integrityScore: 100,
      totalFramesAnalyzed: 0,
      incidents: [],
      averageGazeDeviation: 0.1,
      averageNoiseDecibels: 28,
    }

    this.sessions.set(sessionId, session)
    logger.info(`[ProctoringEngine] Started session ${sessionId} for user ${params.userId} on test ${params.testAttemptId}`)
    return session
  }

  /**
   * Ingests real-time frame telemetry from student client
   */
  processFrameTelemetry(
    sessionId: string,
    telemetry: FrameTelemetryPayload
  ): {
    updatedScore: number
    incidentsTriggered: ProctorIncident[]
    status: ProctoringSession['status']
  } {
    const session = this.sessions.get(sessionId)
    if (!session) {
      throw new Error(`Proctoring session not found: ${sessionId}`)
    }

    if (session.status === 'COMPLETED' || session.status === 'TERMINATED') {
      return {
        updatedScore: session.integrityScore,
        incidentsTriggered: [],
        status: session.status,
      }
    }

    session.totalFramesAnalyzed += 1
    const newIncidents: ProctorIncident[] = []
    const now = Date.now()

    // 1. Analyze face presence with temporal debouncing (at most once every 3s)
    if (telemetry.facesDetectedCount === 0) {
      if (!session.lastFaceMissingAt || now - session.lastFaceMissingAt >= 3000) {
        session.lastFaceMissingAt = now
        newIncidents.push({
          id: `inc-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
          timestamp: new Date().toISOString(),
          type: 'FACE_MISSING',
          severity: 'HIGH',
          confidence: 0.95,
          description: 'Candidate face disappeared from camera viewport.',
        })
        session.integrityScore = Math.max(0, session.integrityScore - 4)
      }
    } else {
      session.lastFaceMissingAt = undefined
      if (telemetry.facesDetectedCount > 1) {
        newIncidents.push({
          id: `inc-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
          timestamp: new Date().toISOString(),
          type: 'MULTIPLE_FACES_DETECTED',
          severity: 'CRITICAL',
          confidence: 0.98,
          description: `Multiple distinct individuals (${telemetry.facesDetectedCount}) detected in camera frame.`,
        })
        session.integrityScore = Math.max(0, session.integrityScore - 12)
      }
    }

    // 2. Head pose & Gaze deviation analysis with temporal debouncing (at most once every 3s)
    const headTurnedSignificantly = Math.abs(telemetry.headPose.yaw) > 35 || Math.abs(telemetry.headPose.pitch) > 25
    if (telemetry.gazeDeviationScore > 0.65 || headTurnedSignificantly) {
      if (!session.lastGazeAvertedAt || now - session.lastGazeAvertedAt >= 3000) {
        session.lastGazeAvertedAt = now
        newIncidents.push({
          id: `inc-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
          timestamp: new Date().toISOString(),
          type: 'GAZE_AVERTED',
          severity: 'MEDIUM',
          confidence: 0.88,
          description: `Gaze persistently averted from test interface (Yaw: ${telemetry.headPose.yaw.toFixed(1)}°, Pitch: ${telemetry.headPose.pitch.toFixed(1)}°).`,
        })
        session.integrityScore = Math.max(0, session.integrityScore - 2)
      }
    } else {
      session.lastGazeAvertedAt = undefined
    }

    // 3. Audio noise & speech anomaly detection
    if (telemetry.isSpeechDetected && telemetry.audioNoiseDecibels > 55) {
      newIncidents.push({
        id: `inc-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
        timestamp: new Date().toISOString(),
        type: 'VOICE_ANOMALY_DETECTED',
        severity: 'HIGH',
        confidence: 0.91,
        description: `Acoustic anomaly: vocal speech detected at ${telemetry.audioNoiseDecibels.toFixed(1)} dB.`,
      })
      session.integrityScore = Math.max(0, session.integrityScore - 5)
    }

    // 4. Tab / Window focus blur
    if (telemetry.tabBlurred) {
      newIncidents.push({
        id: `inc-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
        timestamp: new Date().toISOString(),
        type: 'TAB_SWITCH_ATTEMPT',
        severity: 'HIGH',
        confidence: 1.0,
        description: 'Candidate defocused or switched away from the secure exam tab.',
      })
      session.integrityScore = Math.max(0, session.integrityScore - 7)
    }

    // Append incidents to session
    session.incidents.push(...newIncidents)

    // Update running averages
    session.averageGazeDeviation =
      (session.averageGazeDeviation * (session.totalFramesAnalyzed - 1) + telemetry.gazeDeviationScore) /
      session.totalFramesAnalyzed
    session.averageNoiseDecibels =
      (session.averageNoiseDecibels * (session.totalFramesAnalyzed - 1) + telemetry.audioNoiseDecibels) /
      session.totalFramesAnalyzed

    // Update status based on score threshold
    if (session.integrityScore <= 40) {
      session.status = 'TERMINATED'
    } else if (session.integrityScore <= 70) {
      session.status = 'FLAGGED'
    }

    return {
      updatedScore: session.integrityScore,
      incidentsTriggered: newIncidents,
      status: session.status,
    }
  }

  /**
   * Logs a discrete manual or browser-triggered incident
   */
  logIncident(
    sessionId: string,
    incident: Omit<ProctorIncident, 'id' | 'timestamp'>
  ): ProctorIncident {
    const session = this.sessions.get(sessionId)
    if (!session) {
      throw new Error(`Proctoring session not found: ${sessionId}`)
    }

    const fullIncident: ProctorIncident = {
      ...incident,
      id: `inc-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
      timestamp: new Date().toISOString(),
    }

    session.incidents.push(fullIncident)
    const penalty = incident.severity === 'CRITICAL' ? 15 : incident.severity === 'HIGH' ? 8 : 3
    session.integrityScore = Math.max(0, session.integrityScore - penalty)

    if (session.integrityScore <= 40) {
      session.status = 'TERMINATED'
    } else if (session.integrityScore <= 70) {
      session.status = 'FLAGGED'
    }

    return fullIncident
  }

  /**
   * Concludes a proctoring session and computes final verification audit report
   */
  finalizeSession(sessionId: string): ProctoringSummaryReport {
    const session = this.sessions.get(sessionId)
    if (!session) {
      throw new Error(`Proctoring session not found: ${sessionId}`)
    }

    session.endedAt = new Date().toISOString()
    if (session.status !== 'TERMINATED') {
      session.status = session.integrityScore >= 70 ? 'COMPLETED' : 'FLAGGED'
    }

    const startTime = new Date(session.startedAt).getTime()
    const endTime = new Date(session.endedAt).getTime()
    const durationMinutes = Math.max(1, Math.round((endTime - startTime) / 60000))

    const highSeverityCount = session.incidents.filter(
      i => i.severity === 'HIGH' || i.severity === 'CRITICAL'
    ).length

    const incidentBreakdown: Record<IncidentType, number> = {
      FACE_MISSING: 0,
      MULTIPLE_FACES_DETECTED: 0,
      GAZE_AVERTED: 0,
      VOICE_ANOMALY_DETECTED: 0,
      TAB_SWITCH_ATTEMPT: 0,
      UNAUTHORIZED_DEVICE: 0,
      BACKGROUND_TALK: 0,
      SCREEN_SPLIT_SUSPECTED: 0,
    }

    session.incidents.forEach(inc => {
      if (incidentBreakdown[inc.type] !== undefined) {
        incidentBreakdown[inc.type] += 1
      }
    })

    let verdict: ProctoringSummaryReport['verdict'] = 'VERIFIED_CLEAN'
    if (session.integrityScore < 50 || highSeverityCount >= 4) {
      verdict = 'INVALIDATED_INTEGRITY_BREACH'
    } else if (session.integrityScore < 80 || highSeverityCount >= 1) {
      verdict = 'FLAGGED_FOR_MANUAL_REVIEW'
    }

    // Cryptographic audit proof signature
    const payloadForAudit = JSON.stringify({
      sessionId: session.sessionId,
      userId: session.userId,
      testAttemptId: session.testAttemptId,
      finalScore: session.integrityScore,
      totalIncidents: session.incidents.length,
      verdict,
      endedAt: session.endedAt,
    })

    const cryptographicAuditHash = crypto
      .createHmac('sha256', this.HMAC_SECRET)
      .update(payloadForAudit)
      .digest('hex')

    session.sessionSignature = cryptographicAuditHash

    const gazeCompliance = Math.max(0, Math.min(100, Math.round((1 - session.averageGazeDeviation) * 100)))
    const acousticCompliance = Math.max(0, Math.min(100, Math.round(100 - (session.averageNoiseDecibels > 40 ? (session.averageNoiseDecibels - 40) * 2 : 0))))

    return {
      sessionId: session.sessionId,
      userId: session.userId,
      testAttemptId: session.testAttemptId,
      examTitle: session.examTitle,
      durationMinutes,
      finalIntegrityScore: session.integrityScore,
      verdict,
      totalIncidentsCount: session.incidents.length,
      highSeverityCount,
      incidentBreakdown,
      gazeCompliancePercentage: gazeCompliance,
      acousticCompliancePercentage: acousticCompliance,
      cryptographicAuditHash,
      generatedAt: session.endedAt,
    }
  }

  /**
   * Retrieves an existing session
   */
  getSession(sessionId: string): ProctoringSession | undefined {
    return this.sessions.get(sessionId)
  }
}

export const proctoringEngineService = new ProctoringEngineService()
