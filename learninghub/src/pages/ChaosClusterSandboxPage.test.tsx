import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { ChaosClusterSandboxPage } from './ChaosClusterSandboxPage'
import { chaosClusterService } from '../services/chaosClusterService'
import { ClusterTopology, ChaosSimulationResult } from '../types/chaosCluster'

const mockInitialTopology: ClusterTopology = {
  clusterId: 'test-cluster-page',
  name: 'Default Page Mesh',
  description: 'Mesh for Sandbox Page test',
  nodes: [
    {
      id: 'svc-gateway',
      name: 'API Gateway',
      role: 'GATEWAY',
      status: 'HEALTHY',
      cpuPercent: 15,
      threadPoolUsed: 20,
      threadPoolCapacity: 200,
      errorRatePercent: 0,
      circuitBreaker: {
        state: 'CLOSED',
        failureThresholdPercent: 50,
        consecutiveFailures: 0,
        fallbackStrategy: 'FAIL_FAST_429',
        fallbackInvocations: 0,
      },
    },
    {
      id: 'svc-auth',
      name: 'Auth & Identity',
      role: 'CORE_LOGIC',
      status: 'HEALTHY',
      cpuPercent: 25,
      threadPoolUsed: 30,
      threadPoolCapacity: 100,
      errorRatePercent: 0,
      circuitBreaker: {
        state: 'CLOSED',
        failureThresholdPercent: 50,
        consecutiveFailures: 0,
        fallbackStrategy: 'STALE_CACHE',
        fallbackInvocations: 0,
      },
    },
  ],
  links: [
    {
      id: 'link-gw-auth',
      sourceNodeId: 'svc-gateway',
      targetNodeId: 'svc-auth',
      state: 'CONNECTED',
      latencyMs: 10,
      jitterMs: 1,
      packetLossPercent: 0,
    },
  ],
}

const mockSimulationResult: ChaosSimulationResult = {
  simulationId: 'sim-test-999',
  experimentConfig: {
    faultType: 'PROCESS_CRASH',
    targetNodeId: 'svc-auth',
    durationSeconds: 15,
  },
  initialTopology: mockInitialTopology,
  finalTopology: {
    ...mockInitialTopology,
    nodes: mockInitialTopology.nodes.map((n) =>
      n.id === 'svc-auth'
        ? {
            ...n,
            status: 'CRASHED',
            circuitBreaker: {
              ...n.circuitBreaker,
              state: 'OPEN',
              fallbackInvocations: 8,
            },
          }
        : n
    ),
  },
  telemetryEvents: [
    {
      timestampOffsetMs: 100,
      serviceId: 'svc-auth',
      severity: 'CRITICAL',
      message: 'SIGKILL / Panic fault injected',
      metricsSnapshot: {
        availabilityPercent: 0,
        activeThreads: 0,
        circuitBreakerTripped: true,
      },
    },
  ],
  auditScorecard: {
    overallResilienceGrade: 'B',
    availabilitySlaPercent: 88.5,
    blastRadiusPercent: 33.3,
    meanTimeToRecoverMs: 500,
    circuitBreakerEffectivenessPercent: 88,
    cascadingFailuresPrevented: 2,
    postMortemSummary: 'Simulated process crash contained within service sandbox.',
    mitigationRecommendations: ['Enable multi-AZ active-active replication'],
    cryptographicAuditDigest: 'cafebabe0123456789abcdef0123456789abcdef0123456789abcdef01234567',
  },
}

describe('ChaosClusterSandboxPage', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    vi.spyOn(chaosClusterService, 'getTopology').mockResolvedValue(mockInitialTopology)
    vi.spyOn(chaosClusterService, 'runSimulation').mockResolvedValue(mockSimulationResult)
    vi.spyOn(chaosClusterService, 'resetTopology').mockResolvedValue(mockInitialTopology)
  })

  it('loads and renders initial topology and controls', async () => {
    render(<ChaosClusterSandboxPage />)

    await waitFor(() => {
      expect(screen.getByText('Autonomous Chaos Monkey & Network Partition Sandbox')).toBeDefined()
    })

    expect(screen.getAllByText('API Gateway').length).toBeGreaterThan(0)
    expect(screen.getAllByText('Auth & Identity').length).toBeGreaterThan(0)
    expect(screen.getByText('Circuit Breakers HUD')).toBeDefined()
  })

  it('runs experiment and renders the resilience audit scorecard', async () => {
    render(<ChaosClusterSandboxPage />)

    await waitFor(() => {
      expect(screen.getByText('Inject Chaos Fault & Trigger Breakers')).toBeDefined()
    })

    const runBtn = screen.getByText('Inject Chaos Fault & Trigger Breakers')
    fireEvent.click(runBtn)

    await waitFor(() => {
      expect(chaosClusterService.runSimulation).toHaveBeenCalled()
      expect(screen.getByText('Resilience Audit Scorecard & Post-Mortem')).toBeDefined()
      expect(screen.getByText('Grade B')).toBeDefined()
      expect(screen.getByText('Simulated process crash contained within service sandbox.')).toBeDefined()
    })
  })

  it('resets cluster state when reset button is clicked', async () => {
    render(<ChaosClusterSandboxPage />)

    await waitFor(() => {
      expect(screen.getByText('Reset to Healthy Baseline')).toBeDefined()
    })

    const resetBtn = screen.getByText('Reset to Healthy Baseline')
    fireEvent.click(resetBtn)

    await waitFor(() => {
      expect(chaosClusterService.resetTopology).toHaveBeenCalled()
    })
  })

  it('switches between tab views cleanly', async () => {
    render(<ChaosClusterSandboxPage />)

    await waitFor(() => {
      expect(screen.getByText('Cluster Topology & Fault Mesh')).toBeDefined()
    })

    fireEvent.click(screen.getByText('Circuit Breakers HUD'))
    expect(screen.getByText('Circuit Breaker Heads-Up Display (HUD)')).toBeDefined()

    fireEvent.click(screen.getByText('Unified Lab View'))
    expect(screen.getAllByText('API Gateway').length).toBeGreaterThan(0)
  })
})
