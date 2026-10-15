import { DistributedTracingSimulationService } from '../../services/DistributedTracingSimulationService'

describe('DistributedTracingSimulationService (Milestone 37)', () => {
  let service: DistributedTracingSimulationService

  beforeEach(() => {
    service = new DistributedTracingSimulationService()
  })

  describe('Trace Generation & W3C Traceparent Header', () => {
    it('generates a valid distributed trace with root and child spans', () => {
      const trace = service.simulateTransactionRequest({
        scenarioName: 'TestPurchaseWorkflow',
        userId: 'usr-901',
        courseId: 'course-distributed-systems',
        clientBaggage: { tenant: 'enterprise', region: 'us-east-1' },
      })

      expect(trace.traceId).toBeDefined()
      expect(trace.traceId.length).toBe(32)
      expect(trace.spans.length).toBeGreaterThanOrEqual(6)
      expect(trace.w3cTraceparent.rawHeader).toMatch(/^00-[0-9a-f]{32}-[0-9a-f]{16}-01$/)
      expect(trace.baggage.tenant).toBe('enterprise')
      expect(trace.baggage.userId).toBe('usr-901')
      expect(trace.auditDigest).toBeDefined()
      expect(trace.auditDigest.length).toBe(64)
    })

    it('identifies critical path spans determining total transaction latency', () => {
      const trace = service.simulateTransactionRequest({
        scenarioName: 'CriticalPathTest',
        userId: 'usr-404',
        courseId: 'course-dsa',
      })

      expect(trace.criticalPathSpanIds.length).toBeGreaterThan(0)
      expect(trace.criticalPathDurationMs).toBeGreaterThan(0)

      const rootSpan = trace.spans.find((s) => s.parentSpanId === null)
      expect(rootSpan).toBeDefined()
      expect(trace.criticalPathSpanIds).toContain(rootSpan!.spanId)
      expect(rootSpan!.isCriticalPath).toBe(true)
    })
  })

  describe('Chaos Fault & Latency Injections', () => {
    it('applies artificial latency and error status on targeted downstream service', () => {
      // Inject 250ms latency and 100% error rate on payment-service
      service.setChaosRule({
        targetService: 'payment-service',
        additionalLatencyMs: 250,
        injectError: true,
        errorRate: 1.0,
      })

      const trace = service.simulateTransactionRequest({
        scenarioName: 'ChaosOrderPlacement',
        userId: 'usr-999',
        courseId: 'course-cloud',
      })

      const paySpan = trace.spans.find((s) => s.serviceName === 'payment-service')
      expect(paySpan).toBeDefined()
      expect(paySpan!.durationMs).toBeGreaterThanOrEqual(250)
      expect(paySpan!.statusCode).toBe('ERROR')
      expect(trace.hasError).toBe(true)
    })

    it('clears chaos rules and restores baseline performance', () => {
      service.setChaosRule({
        targetService: 'payment-service',
        additionalLatencyMs: 500,
        injectError: true,
        errorRate: 1.0,
      })
      service.clearChaosRules()

      const trace = service.simulateTransactionRequest({
        scenarioName: 'HealedRequest',
        userId: 'usr-111',
        courseId: 'course-healed',
      })

      const paySpan = trace.spans.find((s) => s.serviceName === 'payment-service')
      expect(paySpan!.statusCode).toBe('OK')
      expect(paySpan!.durationMs).toBeLessThan(200)
    })
  })

  describe('Latency Distribution & Percentiles', () => {
    it('computes p50, p90, p95, p99 across microservices', () => {
      // Simulate multiple requests to accumulate metrics
      for (let i = 0; i < 5; i++) {
        service.simulateTransactionRequest({
          scenarioName: `MetricsRun_${i}`,
          userId: `usr_${i}`,
          courseId: 'course_perf',
        })
      }

      const distributions = service.getLatencyDistributions()
      expect(distributions.length).toBeGreaterThanOrEqual(5)

      const gatewayDist = distributions.find((d) => d.serviceName === 'api-gateway')
      expect(gatewayDist).toBeDefined()
      expect(gatewayDist!.sampleCount).toBeGreaterThanOrEqual(5)
      expect(gatewayDist!.p50Ms).toBeGreaterThan(0)
      expect(gatewayDist!.p99Ms).toBeGreaterThanOrEqual(gatewayDist!.p50Ms)
    })
  })
})
