import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { DistributedTracingStudioPage } from './DistributedTracingStudioPage'
import { distributedTracingService } from '../services/distributedTracingService'

vi.mock('../services/distributedTracingService', () => {
  return {
    distributedTracingService: {
      getTraces: vi.fn(),
      getTraceById: vi.fn(),
      simulateRequest: vi.fn(),
      setChaosRule: vi.fn(),
      clearChaosRules: vi.fn(),
      getLatencyDistributions: vi.fn(),
      reset: vi.fn(),
      getMockTraces: vi.fn(),
      getMockDistributions: vi.fn(),
    },
  }
})

describe('DistributedTracingStudioPage (Milestone 37 Studio)', () => {
  const canonicalMocks = [
    {
      traceId: 'mock-trace-1',
      name: 'Course Enrollment Transaction',
      rootServiceName: 'api-gateway',
      totalDurationMs: 245.5,
      spanCount: 6,
      hasError: false,
      timestamp: '2026-10-15T12:00:00.000Z',
      criticalPathDurationMs: 180.2,
      criticalPathSpanIds: ['span-1', 'span-2'],
      w3cTraceparent: {
        version: '00',
        traceId: 'mock-trace-1',
        parentId: 'span-1',
        traceFlags: '01',
        rawHeader: '00-mock-trace-1-span-1-01',
      },
      baggage: {
        'user-tier': 'enterprise-pro',
        'tenant-id': 'tenant-acme-corp',
      },
      auditDigest: 'sha256-abcdef1234567890',
      spans: [
        {
          traceId: 'mock-trace-1',
          spanId: 'span-1',
          parentSpanId: null,
          name: 'POST /api/v1/courses/enroll',
          serviceName: 'api-gateway',
          kind: 'SERVER' as const,
          startTimeMs: 0,
          durationMs: 245.5,
          statusCode: 'OK' as const,
          attributes: { 'http.status_code': 200 },
          events: [],
          isCriticalPath: true,
        },
        {
          traceId: 'mock-trace-1',
          spanId: 'span-2',
          parentSpanId: 'span-1',
          name: 'auth.verifyToken',
          serviceName: 'auth-service',
          kind: 'INTERNAL' as const,
          startTimeMs: 10,
          durationMs: 45.0,
          statusCode: 'OK' as const,
          attributes: {},
          events: [],
          isCriticalPath: true,
        },
      ],
    },
  ]

  beforeEach(() => {
    vi.clearAllMocks()
    vi.mocked(distributedTracingService.getTraces).mockResolvedValue(canonicalMocks)
    vi.mocked(distributedTracingService.getMockTraces).mockReturnValue(canonicalMocks)
    vi.mocked(distributedTracingService.getLatencyDistributions).mockResolvedValue([
      {
        serviceName: 'api-gateway',
        sampleCount: 150,
        p50Ms: 12.4,
        p90Ms: 28.5,
        p95Ms: 45.2,
        p99Ms: 82.1,
        errorRate: 0.0,
      },
    ])
  })

  it('renders header, trace selector, and metrics summary bar', async () => {
    render(<DistributedTracingStudioPage />)

    await waitFor(() => {
      expect(
        screen.getByText('Distributed Tracing & OpenTelemetry Studio')
      ).toBeInTheDocument()
    })

    expect(screen.getByText('OTel v1.30 Spec')).toBeInTheDocument()
    expect(screen.getAllByText('245.5ms').length).toBeGreaterThanOrEqual(1)
    expect(screen.getAllByText('180.2ms').length).toBeGreaterThanOrEqual(1)
  })

  it('switches between all 5 studio tabs seamlessly', async () => {
    render(<DistributedTracingStudioPage />)

    await waitFor(() => {
      expect(
        screen.getByText('Distributed Span Waterfall & Gantt Timeline')
      ).toBeInTheDocument()
    })

    // Microservice DAG tab
    fireEvent.click(screen.getByRole('button', { name: /^Microservice DAG$/i }))
    expect(
      screen.getByText('Microservice Dependency DAG & Call Topology')
    ).toBeInTheDocument()

    // Critical Path Analysis tab
    const critPathButtons = screen.getAllByRole('button', { name: /Critical Path Analysis/i })
    fireEvent.click(critPathButtons[0])
    expect(
      screen.getByText('Critical Path & Bottleneck Latency Analysis')
    ).toBeInTheDocument()

    // Chaos Engineering Lab tab
    fireEvent.click(screen.getByRole('button', { name: /^Chaos Engineering Lab$/i }))
    expect(
      screen.getByText('Chaos Engineering & Latency Injection Lab')
    ).toBeInTheDocument()

    // W3C & Baggage Headers tab
    fireEvent.click(screen.getByRole('button', { name: /^W3C & Baggage Headers$/i }))
    expect(
      screen.getByText('W3C TraceContext & Baggage Header Propagation')
    ).toBeInTheDocument()
  })

  it('simulates a new request when clicking Simulate Request button', async () => {
    const simulatedTrace = {
      ...canonicalMocks[0],
      traceId: 'newly-simulated-trace-99',
      name: 'User Authentication & JWT Issuance',
    }
    vi.mocked(distributedTracingService.simulateRequest).mockResolvedValue(simulatedTrace)

    render(<DistributedTracingStudioPage />)

    await waitFor(() => {
      expect(screen.getByRole('button', { name: /Simulate Request/i })).toBeInTheDocument()
    })

    fireEvent.click(screen.getByRole('button', { name: /Simulate Request/i }))

    await waitFor(() => {
      expect(distributedTracingService.simulateRequest).toHaveBeenCalled()
    })
  })

  it('resets traces when clicking reset button', async () => {
    vi.mocked(distributedTracingService.reset).mockResolvedValue()

    render(<DistributedTracingStudioPage />)

    await waitFor(() => {
      expect(screen.getByTitle('Reset Traces')).toBeInTheDocument()
    })

    fireEvent.click(screen.getByTitle('Reset Traces'))

    await waitFor(() => {
      expect(distributedTracingService.reset).toHaveBeenCalled()
    })
  })

  it('toggles educational deep dive accordion', async () => {
    render(<DistributedTracingStudioPage />)

    await waitFor(() => {
      expect(
        screen.getByText(/Educational Deep Dive: Distributed Tracing & OpenTelemetry Fundamentals/i)
      ).toBeInTheDocument()
    })

    expect(screen.queryByText(/1. What is a Span & Trace DAG\?/i)).not.toBeInTheDocument()

    const eduButton = screen.getByRole('button', { name: /Educational Deep Dive/i })
    fireEvent.click(eduButton)

    expect(screen.getByText(/1. What is a Span & Trace DAG\?/i)).toBeInTheDocument()
    expect(screen.getByText(/3. The Critical Path Method \(CPM\)/i)).toBeInTheDocument()
  })
})
