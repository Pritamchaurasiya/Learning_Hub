import {
  neuroAdaptiveEngineService,
  CognitiveTelemetryPayload,
} from '../../services/NeuroAdaptiveEngineService'

describe('NeuroAdaptiveEngineService Unit Tests', () => {
  it('evaluates optimal flow state for smooth cadence and low fatigue', () => {
    const payload: CognitiveTelemetryPayload = {
      sessionId: 'sess-flow-1',
      userId: 'user-101',
      timestamp: new Date().toISOString(),
      taskType: 'DSA_CODING',
      activeDurationMinutes: 15,
      keystroke: {
        flightTimeMeanMs: 140,
        flightTimeVarianceMs2: 2500,
        backspaceCountPerMinute: 4,
        pauseCountAboveTwoSec: 1,
      },
      ocular: {
        blinkRatePerMinute: 18,
        averageFixationDurationMs: 320,
        saccadeVelocityScore: 0.9,
      },
      currentProblemDifficulty: 'MEDIUM',
    }

    const result = neuroAdaptiveEngineService.evaluateCognitiveState(payload)

    expect(result.sessionId).toBe('sess-flow-1')
    expect(result.fatigueScore).toBeLessThan(30)
    expect(result.flowStateScore).toBeGreaterThanOrEqual(60)
    expect(['OPTIMAL_FLOW', 'PRODUCTIVE_EFFORT']).toContain(result.state)
    expect(result.recommendedAction).toBe('MAINTAIN_CURRENT_PACE')
    expect(result.telemetryDigest).toBeDefined()
  })

  it('detects fatigue overload after prolonged time and erratic typing', () => {
    const payload: CognitiveTelemetryPayload = {
      sessionId: 'sess-fatigue-2',
      userId: 'user-102',
      timestamp: new Date().toISOString(),
      taskType: 'DSA_CODING',
      activeDurationMinutes: 75,
      keystroke: {
        flightTimeMeanMs: 380,
        flightTimeVarianceMs2: 15000,
        backspaceCountPerMinute: 32,
        pauseCountAboveTwoSec: 12,
      },
      ocular: {
        blinkRatePerMinute: 5,
        averageFixationDurationMs: 720,
        saccadeVelocityScore: 0.3,
      },
      currentProblemDifficulty: 'HARD',
    }

    const result = neuroAdaptiveEngineService.evaluateCognitiveState(payload)

    expect(result.fatigueScore).toBeGreaterThanOrEqual(70)
    expect(result.state).toBe('FATIGUE_OVERLOAD')
    expect(result.recommendedAction).toBe('SUGGEST_MICRO_BREAK')
    expect(result.suggestedIntervention).toBeDefined()
    expect(result.suggestedIntervention?.type).toBe('EYE_RESET_20_20_20')
  })

  it('detects cognitive strain on expert problem and suggests scaffolding', () => {
    const payload: CognitiveTelemetryPayload = {
      sessionId: 'sess-strain-3',
      userId: 'user-103',
      timestamp: new Date().toISOString(),
      taskType: 'MATH_CALCULATION',
      activeDurationMinutes: 30,
      keystroke: {
        flightTimeMeanMs: 250,
        flightTimeVarianceMs2: 8000,
        backspaceCountPerMinute: 22,
        pauseCountAboveTwoSec: 9,
      },
      currentProblemDifficulty: 'EXPERT',
    }

    const result = neuroAdaptiveEngineService.evaluateCognitiveState(payload)

    expect(result.cognitiveLoadIndex).toBeGreaterThanOrEqual(80)
    expect(result.recommendedAction).toBe('OFFER_SCAFFOLDING_HINT')
    expect(result.suggestedIntervention?.type).toBe('SocraticScaffold')
  })

  it('handles fallback when ocular biometric data is not provided', () => {
    const payload: CognitiveTelemetryPayload = {
      sessionId: 'sess-no-camera-4',
      userId: 'user-104',
      timestamp: new Date().toISOString(),
      taskType: 'FLASHCARD_REVIEW',
      activeDurationMinutes: 20,
      keystroke: {
        flightTimeMeanMs: 160,
        flightTimeVarianceMs2: 3000,
        backspaceCountPerMinute: 6,
        pauseCountAboveTwoSec: 2,
      },
      currentProblemDifficulty: 'EASY',
    }

    const result = neuroAdaptiveEngineService.evaluateCognitiveState(payload)

    expect(result).toBeDefined()
    expect(result.fatigueScore).toBeLessThan(40)
    expect(result.recommendedAction).toBe('MAINTAIN_CURRENT_PACE')
  })
})
