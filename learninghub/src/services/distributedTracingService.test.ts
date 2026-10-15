import { describe, it, expect, vi, beforeEach } from 'vitest'
import { distributedTracingService } from './distributedTracingService'
import * as apiModule from '../utils/api'
import type { TraceAggregate, ChaosRule } from '../types/distributedTracing'

vi.mock('../utils/api', () => ({
  fetchApi: vi.fn(),
}))

describe('distributedTracingService', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('fetches list of simulated traces from API when available', async () => {
    const mockTraces: Partial<TraceAggregate>[] = [
      {
        traceId: 'trace-12345',
        name: 'API Gateway Flow',
        rootServiceName: 'api-gateway',
        totalDurationMs: 120,
        spanCount: 6,
        hasError: false,
      },
    ]

    vi.mocked(apiModule.fetchApi).mockResolvedValueOnce({
      status: 'success',
      data: mockTraces,
    })

    const traces = await distributedTracingService.getTraces()
    expect(traces).toHaveLength(1)
    expect(traces[0].traceId).toBe('trace-12345')
    expect(apiModule.fetchApi).toHaveBeenCalledWith('/tracing/traces')
  })

  it('falls back to mock traces if API fails', async () => {
    vi.mocked(apiModule.fetchApi).mockRejectedValueOnce(new Error('Network error'))

    const traces = await distributedTracingService.getTraces()
    expect(traces.length).toBeGreaterThan(0)
    expect(traces[0].w3cTraceparent).toBeDefined()
    expect(traces[0].w3cTraceparent.rawHeader).toContain('00-')
  })

  it('fetches specific trace by ID', async () => {
    const mockTrace: Partial<TraceAggregate> = {
      traceId: 'target-trace-id',
      name: 'Single Trace Query',
      spanCount: 5,
    }

    vi.mocked(apiModule.fetchApi).mockResolvedValueOnce({
      status: 'success',
      data: mockTrace,
    })

    const trace = await distributedTracingService.getTraceById('target-trace-id')
    expect(trace.traceId).toBe('target-trace-id')
    expect(apiModule.fetchApi).toHaveBeenCalledWith('/tracing/trace/target-trace-id')
  })

  it('falls back to mock trace when getTraceById fails', async () => {
    vi.mocked(apiModule.fetchApi).mockRejectedValueOnce(new Error('Backend offline'))

    const trace = await distributedTracingService.getTraceById('non-existent')
    expect(trace).toBeDefined()
    expect(trace.spans.length).toBeGreaterThan(0)
  })

  it('simulates distributed request with custom delays and baggage', async () => {
    const simulatedResult: Partial<TraceAggregate> = {
      traceId: 'simulated-new-trace',
      name: 'Enrollment Simulation',
      totalDurationMs: 340,
      spanCount: 8,
      baggage: { 'user-tier': 'enterprise' },
    }

    vi.mocked(apiModule.fetchApi).mockResolvedValueOnce({
      status: 'success',
      data: simulatedResult,
    })

    const trace = await distributedTracingService.simulateRequest({
      scenarioName: 'Enrollment Simulation',
      customDelays: { 'postgres-db': 150 },
      clientBaggage: { 'user-tier': 'enterprise' },
    })

    expect(trace.traceId).toBe('simulated-new-trace')
    expect(trace.baggage['user-tier']).toBe('enterprise')
    expect(apiModule.fetchApi).toHaveBeenCalledWith(
      '/tracing/simulate',
      expect.objectContaining({
        method: 'POST',
      })
    )
  })

  it('configures chaos rule on a microservice', async () => {
    const rule: ChaosRule = {
      targetService: 'payment-service',
      additionalLatencyMs: 300,
      injectError: true,
      errorRate: 0.8,
    }

    vi.mocked(apiModule.fetchApi).mockResolvedValueOnce({
      status: 'success',
      data: { targetService: 'payment-service' },
    })

    const res = await distributedTracingService.setChaosRule(rule)
    expect(res.targetService).toBe('payment-service')
    expect(apiModule.fetchApi).toHaveBeenCalledWith(
      '/tracing/chaos',
      expect.objectContaining({
        method: 'POST',
      })
    )
  })

  it('clears active chaos rules', async () => {
    vi.mocked(apiModule.fetchApi).mockResolvedValueOnce({ status: 'success' })
    await distributedTracingService.clearChaosRules()
    expect(apiModule.fetchApi).toHaveBeenCalledWith('/tracing/chaos/clear', {
      method: 'POST',
    })
  })

  it('fetches latency distribution percentiles', async () => {
    vi.mocked(apiModule.fetchApi).mockResolvedValueOnce({
      status: 'success',
      data: [
        {
          serviceName: 'api-gateway',
          sampleCount: 100,
          p50Ms: 12,
          p90Ms: 25,
          p95Ms: 40,
          p99Ms: 75,
          errorRate: 0,
        },
      ],
    })

    const distributions = await distributedTracingService.getLatencyDistributions()
    expect(distributions).toHaveLength(1)
    expect(distributions[0].serviceName).toBe('api-gateway')
    expect(distributions[0].p99Ms).toBe(75)
  })

  it('falls back to mock distributions on API failure', async () => {
    vi.mocked(apiModule.fetchApi).mockRejectedValueOnce(new Error('Down'))
    const distributions = await distributedTracingService.getLatencyDistributions()
    expect(distributions.length).toBeGreaterThanOrEqual(5)
    expect(distributions.some((d) => d.serviceName === 'postgres-db')).toBe(true)
  })

  it('resets traces via reset call', async () => {
    vi.mocked(apiModule.fetchApi).mockResolvedValueOnce({ status: 'success' })
    await distributedTracingService.reset()
    expect(apiModule.fetchApi).toHaveBeenCalledWith('/tracing/reset', {
      method: 'POST',
    })
  })
})
