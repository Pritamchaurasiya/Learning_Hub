import { describe, it, expect, vi, beforeEach } from 'vitest'
import { neuroAdaptiveService } from './neuroAdaptiveService'
import { api } from '../utils/api'

vi.mock('../utils/api', () => ({
  api: {
    post: vi.fn(),
  },
}))

describe('NeuroAdaptiveService (Frontend)', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('evaluates cognitive state using server endpoint when online', async () => {
    const mockServerResponse = {
      data: {
        sessionId: 'sess-srv-1',
        evaluationId: 'cog_123',
        timestamp: new Date().toISOString(),
        cognitiveLoadIndex: 45,
        fatigueScore: 20,
        flowStateScore: 85,
        state: 'OPTIMAL_FLOW',
        recommendedAction: 'MAINTAIN_CURRENT_PACE',
        telemetryDigest: 'abc1234',
      },
    }
    vi.mocked(api.post).mockResolvedValueOnce(mockServerResponse)

    const result = await neuroAdaptiveService.evaluateCognitiveState({
      sessionId: 'sess-srv-1',
      taskType: 'DSA_CODING',
      activeDurationMinutes: 15,
      keystroke: {
        flightTimeMeanMs: 130,
        flightTimeVarianceMs2: 2000,
        backspaceCountPerMinute: 4,
        pauseCountAboveTwoSec: 1,
      },
      currentProblemDifficulty: 'MEDIUM',
    })

    expect(result.sessionId).toBe('sess-srv-1')
    expect(result.flowStateScore).toBe(85)
    expect(result.state).toBe('OPTIMAL_FLOW')
    expect(api.post).toHaveBeenCalledTimes(1)
  })

  it('falls back to local evaluation if server fails or network is disconnected', async () => {
    vi.mocked(api.post).mockRejectedValueOnce(new Error('Network error'))

    const result = await neuroAdaptiveService.evaluateCognitiveState({
      sessionId: 'sess-fallback-2',
      taskType: 'DSA_CODING',
      activeDurationMinutes: 70,
      keystroke: {
        flightTimeMeanMs: 400,
        flightTimeVarianceMs2: 14000,
        backspaceCountPerMinute: 28,
        pauseCountAboveTwoSec: 8,
      },
      currentProblemDifficulty: 'HARD',
    })

    expect(result.sessionId).toBe('sess-fallback-2')
    expect(result.fatigueScore).toBeGreaterThanOrEqual(70)
    expect(result.state).toBe('FATIGUE_OVERLOAD')
    expect(result.recommendedAction).toBe('SUGGEST_MICRO_BREAK')
    expect(result.suggestedIntervention?.type).toBe('EYE_RESET_20_20_20')
  })

  it('detects high cognitive strain and triggers scaffolding recommendation locally', () => {
    const result = neuroAdaptiveService.evaluateLocally({
      sessionId: 'sess-strain-local',
      taskType: 'MATH_CALCULATION',
      activeDurationMinutes: 30,
      keystroke: {
        flightTimeMeanMs: 260,
        flightTimeVarianceMs2: 8000,
        backspaceCountPerMinute: 24,
        pauseCountAboveTwoSec: 10,
      },
      currentProblemDifficulty: 'EXPERT',
    })

    expect(result.cognitiveLoadIndex).toBeGreaterThanOrEqual(80)
    expect(result.recommendedAction).toBe('OFFER_SCAFFOLDING_HINT')
    expect(result.suggestedIntervention?.type).toBe('SocraticScaffold')
  })
})
