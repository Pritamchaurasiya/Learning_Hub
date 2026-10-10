import { api } from '../utils/api'
import {
  CognitiveTelemetryPayload,
  CognitiveStateEvaluation,
} from '../types/neuroAdaptive'

export class NeuroAdaptiveService {
  /**
   * Evaluates client keystroke and ocular telemetry against the Neuro-Adaptive server
   */
  public async evaluateCognitiveState(
    payload: CognitiveTelemetryPayload
  ): Promise<CognitiveStateEvaluation> {
    try {
      const response = await api.post<{ success: boolean; data: CognitiveStateEvaluation }>(
        '/api/v1/neuro-adaptive/evaluate',
        payload
      )
      if (response && response.data) {
        return response.data
      }
    } catch {
      // Local client-side fallback if offline or backend unreachable
    }

    return this.evaluateLocally(payload)
  }

  /**
   * Deterministic local cognitive state evaluation algorithm (Air-gapped offline support)
   */
  public evaluateLocally(payload: CognitiveTelemetryPayload): CognitiveStateEvaluation {
    const { keystroke, activeDurationMinutes } = payload

    let fatiguePoints = 0
    if (activeDurationMinutes > 60) fatiguePoints += 35
    else if (activeDurationMinutes > 40) fatiguePoints += 20
    else if (activeDurationMinutes > 25) fatiguePoints += 10

    if (keystroke.backspaceCountPerMinute > 25) fatiguePoints += 25
    else if (keystroke.backspaceCountPerMinute > 15) fatiguePoints += 15

    if (keystroke.flightTimeVarianceMs2 > 12000) fatiguePoints += 20
    else if (keystroke.flightTimeVarianceMs2 > 6000) fatiguePoints += 10

    const fatigueScore = Math.max(0, Math.min(100, Math.round(fatiguePoints)))

    let loadPoints = 40
    if (payload.currentProblemDifficulty === 'EXPERT') loadPoints += 30
    else if (payload.currentProblemDifficulty === 'HARD') loadPoints += 20
    else if (payload.currentProblemDifficulty === 'MEDIUM') loadPoints += 10

    if (keystroke.pauseCountAboveTwoSec > 6) loadPoints += 15
    if (keystroke.backspaceCountPerMinute > 18) loadPoints += 15
    const cognitiveLoadIndex = Math.max(10, Math.min(100, Math.round(loadPoints)))

    let flowStateScore = 0
    if (fatigueScore < 30 && cognitiveLoadIndex >= 40 && cognitiveLoadIndex <= 80) {
      flowStateScore = Math.round(100 - fatigueScore - Math.abs(60 - cognitiveLoadIndex) * 0.8)
    } else if (fatigueScore < 50) {
      flowStateScore = Math.max(10, Math.round(70 - fatigueScore * 0.7))
    } else {
      flowStateScore = Math.max(5, Math.round(40 - fatigueScore * 0.35))
    }

    let state: CognitiveStateEvaluation['state'] = 'OPTIMAL_FLOW'
    let recommendedAction: CognitiveStateEvaluation['recommendedAction'] = 'MAINTAIN_CURRENT_PACE'
    let suggestedIntervention: CognitiveStateEvaluation['suggestedIntervention']

    if (fatigueScore >= 75) {
      state = 'FATIGUE_OVERLOAD'
      recommendedAction = 'SUGGEST_MICRO_BREAK'
      suggestedIntervention = {
        type: 'EYE_RESET_20_20_20',
        message: 'High cognitive exhaustion detected. Take a 2-minute 20-20-20 visual reset.',
        durationSec: 120,
      }
    } else if (cognitiveLoadIndex >= 85 || (fatigueScore >= 55 && cognitiveLoadIndex >= 70)) {
      state = 'COGNITIVE_STRAIN'
      recommendedAction = 'OFFER_SCAFFOLDING_HINT'
      suggestedIntervention = {
        type: 'SocraticScaffold',
        message: 'High mental resistance observed. A Socratic step-by-step hint is ready.',
        durationSec: 60,
      }
    } else if (fatigueScore >= 50) {
      state = 'PRODUCTIVE_EFFORT'
      recommendedAction = 'REDUCE_DIFFICULTY_NUDGE'
      suggestedIntervention = {
        type: 'BREATHWORK_20_SEC',
        message: 'Mild fatigue detected. Take 3 calming deep breaths to reset focus.',
        durationSec: 20,
      }
    } else {
      state = flowStateScore >= 75 ? 'OPTIMAL_FLOW' : 'PRODUCTIVE_EFFORT'
      recommendedAction = 'MAINTAIN_CURRENT_PACE'
    }

    return {
      sessionId: payload.sessionId,
      evaluationId: `local_eval_${Date.now()}`,
      timestamp: new Date().toISOString(),
      cognitiveLoadIndex,
      fatigueScore,
      flowStateScore,
      state,
      recommendedAction,
      suggestedIntervention,
      telemetryDigest: 'offline_local_digest',
    }
  }
}

export const neuroAdaptiveService = new NeuroAdaptiveService()
