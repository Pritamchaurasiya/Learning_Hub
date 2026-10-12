import { describe, it, expect, vi, beforeEach } from 'vitest'
import { SweStudioService, FALLBACK_SWE_PRESETS } from './sweStudioService'
import { api } from '../utils/api'

vi.mock('../utils/api', () => ({
  api: {
    get: vi.fn(),
    post: vi.fn(),
  },
}))

describe('sweStudioService', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('getPresets', () => {
    it('returns preset issues from API when available', async () => {
      vi.mocked(api.get).mockResolvedValueOnce({
        data: {
          data: {
            presets: FALLBACK_SWE_PRESETS,
          },
        },
      })

      const presets = await SweStudioService.getPresets()
      expect(presets.length).toBeGreaterThanOrEqual(3)
      expect(presets[0]?.id).toBe('SWE-101')
    })

    it('falls back to local presets on API network error', async () => {
      vi.mocked(api.get).mockRejectedValueOnce(new Error('Network Error'))

      const presets = await SweStudioService.getPresets()
      expect(presets).toEqual(FALLBACK_SWE_PRESETS)
    })
  })

  describe('resolveIssue', () => {
    it('returns resolved pipeline result from backend API', async () => {
      const mockResult = SweStudioService.createSimulatedResolution({ id: 'SWE-101' })
      vi.mocked(api.post).mockResolvedValueOnce({
        data: {
          data: mockResult,
        },
      })

      const res = await SweStudioService.resolveIssue({ id: 'SWE-101' })
      expect(res.issue.id).toBe('SWE-101')
      expect(res.agentThoughtStream.length).toBe(6)
      expect(res.pullRequest.readyToMerge).toBe(true)
    })

    it('falls back to local simulated resolution if API fails', async () => {
      vi.mocked(api.post).mockRejectedValueOnce(new Error('Server error'))

      const res = await SweStudioService.resolveIssue({ id: 'SWE-102' })
      expect(res.issue.id).toBe('SWE-102')
      expect(res.suspiciousLocations.length).toBeGreaterThan(0)
      expect(res.verification.reproductionTestPassed).toBe(true)
    })
  })

  describe('createSimulatedResolution', () => {
    it('builds a complete resolution object with thought stream, diffs, and PR seal', () => {
      const res = SweStudioService.createSimulatedResolution({ id: 'SWE-101' })

      expect(res.agentThoughtStream.length).toBe(6)
      expect(res.suspiciousLocations[0]?.ochiaiSuspiciousnessScore).toBeGreaterThan(0.9)
      expect(res.patches[0]?.unifiedDiff).toContain('--- a/')
      expect(res.pullRequest.cryptographicPatchSeal).toBeDefined()
    })
  })
})
