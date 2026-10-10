import { describe, it, expect, vi, beforeEach } from 'vitest'
import { complexityService } from './complexityService'
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

describe('complexityService', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('submits algorithm benchmark and returns parsed profiler payload', async () => {
    const mockData = {
      benchmarkId: 'bm-test-123',
      algorithmName: 'Binary Search',
      classifiedClass: 'O(log N)',
      confidenceScore: 98,
    }

    vi.mocked(api.post).mockResolvedValueOnce({
      data: { data: mockData },
    } as any)

    const result = await complexityService.benchmarkAlgorithm({
      algorithmName: 'Binary Search',
      presetAlgorithm: 'BINARY_SEARCH',
    })

    expect(api.post).toHaveBeenCalledWith('/api/v1/complexity/benchmark', {
      algorithmName: 'Binary Search',
      presetAlgorithm: 'BINARY_SEARCH',
    })
    expect(result.classifiedClass).toBe('O(log N)')
    expect(result.confidenceScore).toBe(98)
  })

  it('fetches library of standard algorithm complexity presets', async () => {
    const mockPresets = [
      { id: 'BINARY_SEARCH', name: 'Binary Search', complexity: 'O(log N)', code: '...' },
      { id: 'MERGE_SORT', name: 'Merge Sort', complexity: 'O(N log N)', code: '...' },
    ]

    vi.mocked(api.get).mockResolvedValueOnce({
      data: { data: mockPresets },
    } as any)

    const presets = await complexityService.getPresets()

    expect(api.get).toHaveBeenCalledWith('/api/v1/complexity/presets')
    expect(presets.length).toBe(2)
    expect(presets[0].id).toBe('BINARY_SEARCH')
  })
})
