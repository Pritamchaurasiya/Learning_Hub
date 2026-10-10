import crypto from 'crypto'
import logger from '../utils/logger'

export type CognitiveState =
  | 'OPTIMAL_FLOW'
  | 'PRODUCTIVE_EFFORT'
  | 'COGNITIVE_STRAIN'
  | 'FATIGUE_OVERLOAD'
  | 'UNDER_STIMULATED'

export type RecommendedAction =
  | 'MAINTAIN_CURRENT_PACE'
  | 'SUGGEST_MICRO_BREAK'
  | 'OFFER_SCAFFOLDING_HINT'
  | 'INCREASE_DIFFICULTY'
  | 'POSTURE_CHECK'

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
  userId: string
  timestamp: string
  taskType?: 'DSA_CODING' | 'MATH_CALCULATION' | 'FLASHCARD_REVIEW' | 'CONCEPT_LEARNING' | string
  activeDurationMinutes: number
  keystroke: KeystrokeTelemetry
  ocular?: OcularTelemetry
  currentProblemDifficulty: 'EASY' | 'MEDIUM' | 'HARD' | 'EXPERT'
  recentAccuracyPercentage?: number
}

export interface CognitiveIntervention {
  type: 'EYE_RESET_20_20_20' | 'BREATH_RESET_4_7_8' | 'SocraticScaffold' | 'DIFFICULTY_RAMP'
  durationSeconds?: number
  description: string
}

export interface CognitiveEvaluationResult {
  sessionId: string
  userId: string
  evaluatedAt: string
  state: CognitiveState
  cognitiveLoadIndex: number // 0 - 100
  fatigueScore: number // 0 - 100
  flowStateScore: number // 0 - 100
  recommendedAction: RecommendedAction
  suggestedIntervention?: CognitiveIntervention
  telemetryDigest: string
  loadDecomposition: {
    intrinsic: number
    extraneous: number
    germane: number
  }
}

export class NeuroAdaptiveEngineService {
  private readonly sessionEvaluations = new Map<string, CognitiveEvaluationResult>()

  /**
   * Evaluates real-time cognitive telemetry against psychometric cognitive load models.
   */
  public evaluateCognitiveState(payload: CognitiveTelemetryPayload): CognitiveEvaluationResult {
    const {
      sessionId,
      userId,
      activeDurationMinutes,
      keystroke,
      ocular,
      currentProblemDifficulty,
    } = payload

    // 1. Calculate Intrinsic Load (based on problem difficulty)
    let intrinsic = 30
    switch (currentProblemDifficulty) {
      case 'EASY':
        intrinsic = 25
        break
      case 'MEDIUM':
        intrinsic = 50
        break
      case 'HARD':
        intrinsic = 80
        break
      case 'EXPERT':
        intrinsic = 95
        break
    }

    // 2. Calculate Extraneous Load (keystroke variance, erratic pauses, backspaces)
    let extraneous = 10
    if (keystroke.flightTimeVarianceMs2 > 10000) {
      extraneous += 30
    } else if (keystroke.flightTimeVarianceMs2 > 5000) {
      extraneous += 18
    }

    if (keystroke.backspaceCountPerMinute > 25) {
      extraneous += 25
    } else if (keystroke.backspaceCountPerMinute > 15) {
      extraneous += 15
    }

    if (keystroke.pauseCountAboveTwoSec > 8) {
      extraneous += 20
    } else if (keystroke.pauseCountAboveTwoSec > 4) {
      extraneous += 10
    }

    extraneous = Math.min(100, extraneous)

    // 3. Calculate Germane Load (constructive mental effort)
    const germane = Math.min(100, Math.max(10, Math.round(intrinsic * 0.8 - extraneous * 0.3)))

    // 4. Composite Cognitive Load Index (CLI)
    const cognitiveLoadIndex = Math.min(100, Math.max(0, Math.round(0.55 * intrinsic + 0.35 * extraneous + 0.1 * germane)))

    // 5. Calculate Fatigue Score
    let fatigueScore = 12

    // Duration-based fatigue
    if (activeDurationMinutes > 60) {
      fatigueScore += Math.min(45, Math.round((activeDurationMinutes - 60) * 1.5 + 20))
    } else if (activeDurationMinutes > 30) {
      fatigueScore += Math.round((activeDurationMinutes - 30) * 0.6)
    }

    // Keystroke degradation
    if (keystroke.flightTimeMeanMs > 300) {
      fatigueScore += 18
    } else if (keystroke.flightTimeMeanMs > 220) {
      fatigueScore += 10
    }

    if (keystroke.flightTimeVarianceMs2 > 12000) {
      fatigueScore += 15
    }

    // Ocular strain indicators
    if (ocular) {
      if (ocular.blinkRatePerMinute < 8) {
        fatigueScore += 25 // Dry eye staring fatigue
      } else if (ocular.blinkRatePerMinute > 28) {
        fatigueScore += 18 // Rapid ocular strain
      }

      if (ocular.averageFixationDurationMs > 600) {
        fatigueScore += 15
      }

      if (ocular.saccadeVelocityScore < 0.5) {
        fatigueScore += 12
      }
    }

    fatigueScore = Math.min(100, Math.max(0, Math.round(fatigueScore)))

    // 6. Calculate Flow State Score (peaks when CLI is moderate and fatigue is low)
    let flowStateScore = 0
    if (fatigueScore < 40 && cognitiveLoadIndex >= 40 && cognitiveLoadIndex <= 75) {
      flowStateScore = Math.round(100 - fatigueScore * 0.5 - Math.abs(cognitiveLoadIndex - 55))
    } else if (fatigueScore < 60) {
      flowStateScore = Math.max(10, Math.round(70 - fatigueScore * 0.6))
    } else {
      flowStateScore = Math.max(0, Math.round(40 - (fatigueScore - 60)))
    }

    // 7. Determine State & Recommended Interventions
    let state: CognitiveState = 'PRODUCTIVE_EFFORT'
    let recommendedAction: RecommendedAction = 'MAINTAIN_CURRENT_PACE'
    let suggestedIntervention: CognitiveIntervention | undefined = undefined

    if (fatigueScore >= 70) {
      state = 'FATIGUE_OVERLOAD'
      recommendedAction = 'SUGGEST_MICRO_BREAK'
      suggestedIntervention = {
        type: ocular && ocular.blinkRatePerMinute < 8 ? 'EYE_RESET_20_20_20' : 'BREATH_RESET_4_7_8',
        durationSeconds: 120,
        description: 'Autonomic reset: High cognitive fatigue detected. Take a 2-minute restorative micro-break.',
      }
    } else if (cognitiveLoadIndex >= 80) {
      state = 'COGNITIVE_STRAIN'
      recommendedAction = 'OFFER_SCAFFOLDING_HINT'
      suggestedIntervention = {
        type: 'SocraticScaffold',
        description: 'Excessive working memory demand. Socratic invariant hint recommended.',
      }
    } else if (flowStateScore >= 60 && fatigueScore < 30) {
      state = 'OPTIMAL_FLOW'
      recommendedAction = 'MAINTAIN_CURRENT_PACE'
    } else if (cognitiveLoadIndex < 35 && activeDurationMinutes > 10) {
      state = 'UNDER_STIMULATED'
      recommendedAction = 'INCREASE_DIFFICULTY'
      suggestedIntervention = {
        type: 'DIFFICULTY_RAMP',
        description: 'Low cognitive friction detected. Scale up problem challenge level.',
      }
    }

    // 8. Generate Cryptographic Telemetry Digest
    const rawTelemetryString = `${sessionId}:${userId}:${cognitiveLoadIndex}:${fatigueScore}:${state}:${Date.now()}`
    const telemetryDigest = crypto.createHash('sha256').update(rawTelemetryString).digest('hex')

    const result: CognitiveEvaluationResult = {
      sessionId,
      userId,
      evaluatedAt: new Date().toISOString(),
      state,
      cognitiveLoadIndex,
      fatigueScore,
      flowStateScore,
      recommendedAction,
      suggestedIntervention,
      telemetryDigest,
      loadDecomposition: {
        intrinsic,
        extraneous,
        germane,
      },
    }

    this.sessionEvaluations.set(sessionId, result)
    logger.info(`[NeuroAdaptiveEngine] Evaluated ${sessionId}: state=${state}, CLI=${cognitiveLoadIndex}, fatigue=${fatigueScore}`)

    return result
  }

  /**
   * Retrieves the latest evaluation result for a session.
   */
  public getSessionState(sessionId: string): CognitiveEvaluationResult | null {
    return this.sessionEvaluations.get(sessionId) || null
  }
}

export const neuroAdaptiveEngineService = new NeuroAdaptiveEngineService()
