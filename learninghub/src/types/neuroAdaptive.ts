export type CognitiveState =
  | 'OPTIMAL_FLOW'
  | 'PRODUCTIVE_EFFORT'
  | 'COGNITIVE_STRAIN'
  | 'FATIGUE_OVERLOAD'

export type ThrottlingAction =
  | 'MAINTAIN_CURRENT_PACE'
  | 'REDUCE_DIFFICULTY_NUDGE'
  | 'SUGGEST_MICRO_BREAK'
  | 'OFFER_SCAFFOLDING_HINT'

export interface KeystrokeTelemetry {
  flightTimeMeanMs: number
  flightTimeVarianceMs2: number
  backspaceCountPerMinute: number
  pauseCountAboveTwoSec: number
}

export interface OcularTelemetry {
  blinkRatePerMinute: number
  averageFixationDurationMs: number
  saccadeVelocityScore: number
}

export interface CognitiveTelemetryPayload {
  sessionId: string
  taskType: 'DSA_CODING' | 'MATH_CALCULATION' | 'SYSTEM_DESIGN' | 'FLASHCARD_REVIEW'
  activeDurationMinutes: number
  keystroke: KeystrokeTelemetry
  ocular?: OcularTelemetry
  currentProblemDifficulty: 'EASY' | 'MEDIUM' | 'HARD' | 'EXPERT'
}

export interface CognitiveStateEvaluation {
  sessionId: string
  evaluationId: string
  timestamp: string
  cognitiveLoadIndex: number
  fatigueScore: number
  flowStateScore: number
  state: CognitiveState
  recommendedAction: ThrottlingAction
  suggestedIntervention?: {
    type: 'BREATHWORK_20_SEC' | 'EYE_RESET_20_20_20' | 'DIFFICULTY_STEP_DOWN' | 'SocraticScaffold'
    message: string
    durationSec: number
  }
  telemetryDigest: string
}
