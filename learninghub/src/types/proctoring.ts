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
  dismissed?: boolean
}

export interface FrameTelemetryPayload {
  facesDetectedCount: number
  primaryFaceConfidence: number
  headPose: {
    yaw: number
    pitch: number
    roll: number
  }
  gazeDeviationScore: number
  audioNoiseDecibels: number
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
  integrityScore: number
  totalFramesAnalyzed: number
  incidents: ProctorIncident[]
  averageGazeDeviation: number
  averageNoiseDecibels: number
  sessionSignature?: string
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
