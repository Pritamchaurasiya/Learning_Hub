import { describe, it, expect, vi, beforeEach } from 'vitest'
import { systemDesignService } from './systemDesignService'
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

describe('systemDesignService', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('fetches architecture preset with topology and spofNodeIds', async () => {
    const mockPresetData = {
      presetId: 'URL_SHORTENER_TINYURL',
      topology: {
        nodes: [{ id: 'n1', name: 'Web', type: 'APP_SERVER', capacityQps: 1000, baseLatencyMs: 10, replicationFactor: 2, isHealthy: true, failureProb: 0 }],
        edges: [],
      },
      spofNodeIds: ['db-primary'],
    }

    vi.mocked(api.get).mockResolvedValueOnce({
      data: { data: mockPresetData },
    } as any)

    const result = await systemDesignService.getPreset('URL_SHORTENER_TINYURL')

    expect(api.get).toHaveBeenCalledWith('/api/v1/system-design/presets/URL_SHORTENER_TINYURL')
    expect(result.presetId).toBe('URL_SHORTENER_TINYURL')
    expect(result.topology.nodes.length).toBe(1)
  })

  it('runs architecture simulation with QPS and active chaos fault', async () => {
    const mockSimulationResult = {
      simulatedQps: 25000,
      p50LatencyMs: 18.5,
      p95LatencyMs: 34.2,
      p99LatencyMs: 78.4,
      errorRatePercentage: 0.2,
      throughputAchievedQps: 24950,
      systemStatus: 'OPTIMAL',
      saturatedNodeIds: [],
      failedNodeIds: [],
      spofNodeIds: [],
      activeFault: 'NONE',
    }

    vi.mocked(api.post).mockResolvedValueOnce({
      data: { data: mockSimulationResult },
    } as any)

    const result = await systemDesignService.simulateArchitecture({
      topology: { nodes: [], edges: [] },
      targetQps: 25000,
      activeFault: 'NONE',
    })

    expect(api.post).toHaveBeenCalledWith('/api/v1/system-design/simulate', {
      topology: { nodes: [], edges: [] },
      targetQps: 25000,
      activeFault: 'NONE',
    })
    expect(result.simulatedQps).toBe(25000)
    expect(result.systemStatus).toBe('OPTIMAL')
  })
})
