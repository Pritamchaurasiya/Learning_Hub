import { describe, it, expect, vi } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import { ClusterTopologyViewer } from './ClusterTopologyViewer'
import { ChaosExperimentControlPanel } from './ChaosExperimentControlPanel'
import { CircuitBreakerStatusHUD } from './CircuitBreakerStatusHUD'
import { ResilienceAuditScorecard } from './ResilienceAuditScorecard'
import {
  ClusterTopology,
  ResilienceAuditScorecard as ScorecardType,
  ChaosTelemetryEvent,
} from '../../types/chaosCluster'

const mockTopology: ClusterTopology = {
  clusterId: 'test-cluster-01',
  name: 'Test Mesh',
  description: 'Mesh for Chaos Test',
  nodes: [
    {
      id: 'svc-gateway',
      name: 'API Gateway',
      role: 'GATEWAY',
      status: 'HEALTHY',
      cpuPercent: 20,
      threadPoolUsed: 30,
      threadPoolCapacity: 200,
      errorRatePercent: 0.1,
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
      status: 'DEGRADED',
      cpuPercent: 85,
      threadPoolUsed: 95,
      threadPoolCapacity: 100,
      errorRatePercent: 55.4,
      circuitBreaker: {
        state: 'OPEN',
        failureThresholdPercent: 50,
        consecutiveFailures: 6,
        fallbackStrategy: 'STALE_CACHE',
        fallbackInvocations: 14,
      },
    },
  ],
  links: [
    {
      id: 'link-gw-auth',
      sourceNodeId: 'svc-gateway',
      targetNodeId: 'svc-auth',
      state: 'CONNECTED',
      latencyMs: 12,
      jitterMs: 2,
      packetLossPercent: 0,
    },
  ],
}

const mockScorecard: ScorecardType = {
  overallResilienceGrade: 'A',
  availabilitySlaPercent: 99.8,
  blastRadiusPercent: 16.6,
  meanTimeToRecoverMs: 340,
  circuitBreakerEffectivenessPercent: 92.5,
  cascadingFailuresPrevented: 3,
  postMortemSummary: 'Network partition successfully contained by circuit breakers.',
  mitigationRecommendations: ['Scale auth read replicas', 'Add connection pooling'],
  cryptographicAuditDigest: 'e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855',
}

const mockTelemetry: ChaosTelemetryEvent[] = [
  {
    timestampOffsetMs: 50,
    serviceId: 'svc-auth',
    severity: 'WARN',
    message: 'High latency detected',
    metricsSnapshot: {
      availabilityPercent: 90,
      activeThreads: 85,
      circuitBreakerTripped: false,
    },
  },
  {
    timestampOffsetMs: 150,
    serviceId: 'svc-auth',
    severity: 'ERROR',
    message: 'Circuit breaker tripped to OPEN',
    metricsSnapshot: {
      availabilityPercent: 60,
      activeThreads: 98,
      circuitBreakerTripped: true,
    },
  },
]

describe('Chaos Engineering UI Components', () => {
  describe('ClusterTopologyViewer', () => {
    it('renders microservice nodes and network links', () => {
      const onSelect = vi.fn()
      render(
        <ClusterTopologyViewer
          topology={mockTopology}
          selectedNodeId="svc-auth"
          onSelectNode={onSelect}
        />
      )

      expect(screen.getByText('API Gateway')).toBeDefined()
      expect(screen.getByText('Auth & Identity')).toBeDefined()
      expect(screen.getByText('DEGRADED')).toBeDefined()
      expect(screen.getByText('HEALTHY')).toBeDefined()

      // Click node
      fireEvent.click(screen.getByText('API Gateway'))
      expect(onSelect).toHaveBeenCalledWith('svc-gateway')
    })
  })

  describe('ChaosExperimentControlPanel', () => {
    it('allows selecting presets and submitting experiment', async () => {
      const runMock = vi.fn().mockResolvedValue(undefined)
      const resetMock = vi.fn().mockResolvedValue(undefined)

      render(
        <ChaosExperimentControlPanel
          topology={mockTopology}
          isSimulating={false}
          onRunExperiment={runMock}
          onResetCluster={resetMock}
        />
      )

      expect(screen.getByText('Chaos Experiment Injection Console')).toBeDefined()

      // Click a preset
      const presetButton = screen.getByText('Cascading DB Crash')
      fireEvent.click(presetButton)

      // Submit experiment
      const submitBtn = screen.getByText('Inject Chaos Fault & Trigger Breakers')
      fireEvent.click(submitBtn)

      expect(runMock).toHaveBeenCalled()

      // Reset button
      const resetBtn = screen.getByText('Reset Cluster')
      fireEvent.click(resetBtn)
      expect(resetMock).toHaveBeenCalled()
    })
  })

  describe('CircuitBreakerStatusHUD', () => {
    it('renders breaker states and fallback details', () => {
      const onSelect = vi.fn()
      render(
        <CircuitBreakerStatusHUD
          topology={mockTopology}
          selectedNodeId="svc-auth"
          onSelectNode={onSelect}
        />
      )

      expect(screen.getByText('Circuit Breaker Heads-Up Display (HUD)')).toBeDefined()
      expect(screen.getByText('14 invocations')).toBeDefined()
      expect(screen.getByText('Fallback: STALE_CACHE')).toBeDefined()

      fireEvent.click(screen.getByText('Auth & Identity'))
      expect(onSelect).toHaveBeenCalledWith('svc-auth')
    })
  })

  describe('ResilienceAuditScorecard', () => {
    it('displays overall grade, post-mortem, metrics and telemetry', () => {
      render(
        <ResilienceAuditScorecard
          scorecard={mockScorecard}
          telemetryEvents={mockTelemetry}
        />
      )

      expect(screen.getByText('Grade A')).toBeDefined()
      expect(screen.getByText('99.8%')).toBeDefined()
      expect(screen.getByText('16.6%')).toBeDefined()
      expect(screen.getByText('340 ms')).toBeDefined()
      expect(screen.getByText('Network partition successfully contained by circuit breakers.')).toBeDefined()
      expect(screen.getByText('Scale auth read replicas')).toBeDefined()
      expect(screen.getByText('High latency detected')).toBeDefined()
      expect(screen.getByText('Circuit breaker tripped to OPEN')).toBeDefined()
    })
  })
})
