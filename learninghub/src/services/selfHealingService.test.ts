import { describe, it, expect, vi, beforeEach } from 'vitest'
import { selfHealingService } from './selfHealingService'
import api from '../utils/api'

vi.mock('../utils/api', () => ({
  default: {
    post: vi.fn(),
    get: vi.fn(),
  },
  api: {
    post: vi.fn(),
    get: vi.fn(),
  },
}))

describe('selfHealingService', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('fetches code preset successfully', async () => {
    const mockPresetData = {
      presetId: 'N_PLUS_ONE_QUERY_LOOP',
      fileName: 'userCourseService.ts',
      code: 'for (const id of userIds) { ... }',
    }

    vi.mocked(api.get).mockResolvedValueOnce({
      data: { data: mockPresetData },
    } as any)

    const result = await selfHealingService.getPreset('N_PLUS_ONE_QUERY_LOOP')

    expect(api.get).toHaveBeenCalledWith('/api/v1/self-healing/presets/N_PLUS_ONE_QUERY_LOOP')
    expect(result.presetId).toBe('N_PLUS_ONE_QUERY_LOOP')
    expect(result.fileName).toBe('userCourseService.ts')
  })

  it('submits source code for analysis and returns diagnostic payload', async () => {
    const mockAnalysisPayload = {
      analysisId: 'analysis-123',
      fileName: 'test.ts',
      originalCode: 'test code',
      detectedIssues: [],
      recommendedPatch: {
        patchId: 'patch-1',
        unifiedDiff: '',
        patchedCode: 'patched test code',
        cyclomaticComplexityBefore: 6,
        cyclomaticComplexityAfter: 3,
        estimatedLatencyReductionPct: 80,
        securityPostureImprovementPct: 90,
        safetyVerdict: 'SAFE_TO_APPLY',
        verificationChecklist: [],
      },
      overallHealthScoreBefore: 45,
      overallHealthScoreAfter: 98,
      analysisTimestamp: '2026-10-11T00:00:00Z',
    }

    vi.mocked(api.post).mockResolvedValueOnce({
      data: { data: mockAnalysisPayload },
    } as any)

    const result = await selfHealingService.analyzeCode({
      code: 'test code',
      fileName: 'test.ts',
    })

    expect(api.post).toHaveBeenCalledWith('/api/v1/self-healing/analyze', {
      code: 'test code',
      fileName: 'test.ts',
    })
    expect(result.analysisId).toBe('analysis-123')
    expect(result.overallHealthScoreAfter).toBe(98)
  })
})
