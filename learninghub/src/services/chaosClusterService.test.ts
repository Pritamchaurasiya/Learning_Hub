import { describe, it, expect, vi, beforeEach } from 'vitest'
import { chaosClusterService } from './chaosClusterService'
import { api } from '../utils/api'

vi.mock('../utils/api', () => ({
  api: {
    get: vi.fn(),
    post: vi.fn(),
  },
}))

describe('chaosClusterService (Milestone 23 Frontend Service)', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('fetches preset topologies from API and provides offline fallback on error', async () => {
    vi.mocked(api.get).mockResolvedValueOnce({
      data: {
        data: [
          {
            clusterId: 'test-cluster',
            name: 'Test Mesh',
            description: 'Test description',
            nodes: [],
            links: [],
          },
        ],
      },
    })

    const presets = await chaosClusterService.getPresets()
    expect(presets).toHaveLength(1)
    expect(presets[0].clusterId).toBe('test-cluster')

    // Test fallback on error
    vi.mocked(api.get).mockRejectedValueOnce(new Error('Network offline'))
    const fallback = await chaosClusterService.getPresets()
    expect(fallback.length).toBeGreaterThanOrEqual(1)
    expect(fallback[0].clusterId).toBe('ecommerce-checkout-mesh')
  })

  it('executes chaos experiment via API and returns simulation results with audit scorecard', async () => {
    const mockTopology = {
      clusterId: 'test-mesh',
      name: 'Test Mesh',
      description: 'Desc',
      nodes: [
        {
          id: 'svc-1',
          name: 'Gateway',
          role: 'GATEWAY' as const,
          status: 'HEALTHY' as const,
          cpuPercent: 20,
          threadPoolUsed: 30,
          threadPoolCapacity: 100,
          errorRatePercent: 0,
          circuitBreaker: {
            state: 'CLOSED' as const,
            failureThresholdPercent: 50,
            consecutiveFailures: 0,
            fallbackStrategy: 'FAIL_FAST_429' as const,
            fallbackInvocations: 0,
          },
        },
      ],
      links: [],
    }

    vi.mocked(api.post).mockResolvedValueOnce({
      data: {
        data: {
          simulationId: 'chaos-sim-100',
          experimentConfig: { faultType: 'NETWORK_PARTITION', durationSeconds: 5 },
          initialTopology: mockTopology,
          finalTopology: mockTopology,
          telemetryEvents: [],
          auditScorecard: {
            overallResilienceGrade: 'A',
            availabilitySlaPercent: 96.0,
            blastRadiusPercent: 20,
            meanTimeToRecoverMs: 1100,
            circuitBreakerEffectivenessPercent: 95.0,
            cascadingFailuresPrevented: 1,
            postMortemSummary: 'Partition isolated.',
            mitigationRecommendations: ['Timeout configs'],
            cryptographicAuditDigest: '1234567890abcdef',
          },
        },
      },
    })

    const res = await chaosClusterService.runExperiment({
      topology: mockTopology,
      experiment: { faultType: 'NETWORK_PARTITION', durationSeconds: 5 },
    })

    expect(res.simulationId).toBe('chaos-sim-100')
    expect(res.auditScorecard.overallResilienceGrade).toBe('A')
  })
})
