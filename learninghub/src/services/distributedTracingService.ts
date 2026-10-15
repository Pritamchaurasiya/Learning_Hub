import { fetchApi } from '../utils/api'
import type {
  TraceAggregate,
  ChaosRule,
  LatencyDistribution,
} from '../types/distributedTracing'

export const distributedTracingService = {
  /**
   * Fetches list of simulated traces.
   */
  async getTraces(): Promise<TraceAggregate[]> {
    try {
      const res = await fetchApi<{ status: string; data: TraceAggregate[] }>('/tracing/traces')
      return res.data ?? (res as unknown as TraceAggregate[])
    } catch {
      return this.getMockTraces()
    }
  },

  /**
   * Fetches full trace details with span DAG by traceId.
   */
  async getTraceById(traceId: string): Promise<TraceAggregate> {
    try {
      const res = await fetchApi<{ status: string; data: TraceAggregate }>(`/tracing/trace/${traceId}`)
      return res.data ?? (res as unknown as TraceAggregate)
    } catch {
      const mock = this.getMockTraces()
      return mock.find((t) => t.traceId === traceId) || mock[0]
    }
  },

  /**
   * Simulates an end-to-end distributed request with optional chaos overrides.
   */
  async simulateRequest(params: {
    scenarioName: string
    userId?: string
    courseId?: string
    clientBaggage?: Record<string, string>
    customDelays?: Record<string, number>
    forceErrorOnService?: string
  }): Promise<TraceAggregate> {
    try {
      const res = await fetchApi<{ status: string; data: TraceAggregate }>('/tracing/simulate', {
        method: 'POST',
        body: JSON.stringify(params),
      })
      return res.data ?? (res as unknown as TraceAggregate)
    } catch {
      return this.getMockTraces()[0]
    }
  },

  /**
   * Configures chaos latency or error injection on a target microservice.
   */
  async setChaosRule(rule: ChaosRule): Promise<{ targetService: string }> {
    try {
      const res = await fetchApi<{ status: string; data: { targetService: string } }>('/tracing/chaos', {
        method: 'POST',
        body: JSON.stringify(rule),
      })
      return res.data ?? { targetService: rule.targetService }
    } catch {
      return { targetService: rule.targetService }
    }
  },

  /**
   * Clears all active chaos rules.
   */
  async clearChaosRules(): Promise<void> {
    try {
      await fetchApi('/tracing/chaos/clear', { method: 'POST' })
    } catch {
      // mock fallback
    }
  },

  /**
   * Fetches latency percentiles (p50, p90, p95, p99) across microservices.
   */
  async getLatencyDistributions(): Promise<LatencyDistribution[]> {
    try {
      const res = await fetchApi<{ status: string; data: LatencyDistribution[] }>(
        '/tracing/latency-distribution'
      )
      return res.data ?? (res as unknown as LatencyDistribution[])
    } catch {
      return this.getMockDistributions()
    }
  },

  /**
   * Resets trace simulation.
   */
  async reset(): Promise<void> {
    try {
      await fetchApi('/tracing/reset', { method: 'POST' })
    } catch {
      // mock fallback
    }
  },

  /**
   * Offline mock traces.
   */
  getMockTraces(): TraceAggregate[] {
    const traceId = '4bf92f3577b34da6a3ce929d0e0e4736'
    const rootSpanId = '00f067aa0ba902b7'
    const authSpanId = '11a011bb22cc33dd'
    const courseSpanId = '22b022cc33dd44ee'
    const dbSpanId = '33c033dd44ee55ff'
    const paySpanId = '44d044ee55ff66aa'
    const kafkaSpanId = '55e055ff66aa77bb'

    return [
      {
        traceId,
        rootServiceName: 'api-gateway',
        name: 'HTTP POST /api/v1/CourseEnrollmentFlow',
        totalDurationMs: 146,
        spanCount: 6,
        hasError: false,
        timestamp: new Date().toISOString(),
        criticalPathDurationMs: 139,
        criticalPathSpanIds: [rootSpanId, authSpanId, courseSpanId, dbSpanId, paySpanId],
        w3cTraceparent: {
          version: '00',
          traceId,
          parentId: rootSpanId,
          traceFlags: '01',
          rawHeader: `00-${traceId}-${rootSpanId}-01`,
        },
        baggage: {
          userId: 'usr-8921',
          courseId: 'ds-201-distributed-systems',
          tenant: 'enterprise-apac',
          tier: 'PRO',
        },
        auditDigest: '7f83b1657ff1fc53b92dc18148a1d65dfc2d4b1fa3d677284addd200126d9069',
        spans: [
          {
            traceId,
            spanId: rootSpanId,
            parentSpanId: null,
            name: 'HTTP POST /api/v1/CourseEnrollmentFlow',
            serviceName: 'api-gateway',
            kind: 'SERVER',
            startTimeMs: 0,
            durationMs: 146,
            statusCode: 'OK',
            attributes: { 'http.method': 'POST', 'http.status_code': 200 },
            events: [{ name: 'RequestReceived', timestampMs: 0 }],
            isCriticalPath: true,
          },
          {
            traceId,
            spanId: authSpanId,
            parentSpanId: rootSpanId,
            name: 'AuthService:ValidateToken',
            serviceName: 'auth-service',
            kind: 'INTERNAL',
            startTimeMs: 5,
            durationMs: 18,
            statusCode: 'OK',
            attributes: { 'auth.subject': 'usr-8921' },
            events: [{ name: 'TokenVerified', timestampMs: 23 }],
            isCriticalPath: true,
          },
          {
            traceId,
            spanId: courseSpanId,
            parentSpanId: rootSpanId,
            name: 'CourseService:GetDetailsAndLock',
            serviceName: 'course-service',
            kind: 'INTERNAL',
            startTimeMs: 23,
            durationMs: 42,
            statusCode: 'OK',
            attributes: { 'course.id': 'ds-201-distributed-systems' },
            events: [{ name: 'SeatReserved', timestampMs: 65 }],
            isCriticalPath: true,
          },
          {
            traceId,
            spanId: dbSpanId,
            parentSpanId: courseSpanId,
            name: 'PostgreSQL:SELECT courses',
            serviceName: 'postgres-db',
            kind: 'CLIENT',
            startTimeMs: 30,
            durationMs: 32,
            statusCode: 'OK',
            attributes: { 'db.system': 'postgresql' },
            events: [],
            isCriticalPath: true,
          },
          {
            traceId,
            spanId: paySpanId,
            parentSpanId: rootSpanId,
            name: 'PaymentService:AuthorizeAndCapture',
            serviceName: 'payment-service',
            kind: 'CLIENT',
            startTimeMs: 65,
            durationMs: 65,
            statusCode: 'OK',
            attributes: { 'payment.amount_cents': 9900 },
            events: [],
            isCriticalPath: true,
          },
          {
            traceId,
            spanId: kafkaSpanId,
            parentSpanId: rootSpanId,
            name: 'Kafka:Produce enrollment_notifications',
            serviceName: 'notification-worker',
            kind: 'PRODUCER',
            startTimeMs: 130,
            durationMs: 14,
            statusCode: 'OK',
            attributes: { 'messaging.system': 'kafka' },
            events: [],
            isCriticalPath: false,
          },
        ],
      },
    ]
  },

  getMockDistributions(): LatencyDistribution[] {
    return [
      { serviceName: 'payment-service', sampleCount: 24, p50Ms: 65, p90Ms: 110, p95Ms: 145, p99Ms: 280, errorRate: 0.04 },
      { serviceName: 'postgres-db', sampleCount: 30, p50Ms: 32, p90Ms: 55, p95Ms: 78, p99Ms: 120, errorRate: 0.0 },
      { serviceName: 'course-service', sampleCount: 28, p50Ms: 25, p90Ms: 42, p95Ms: 60, p99Ms: 95, errorRate: 0.0 },
      { serviceName: 'auth-service', sampleCount: 35, p50Ms: 18, p90Ms: 26, p95Ms: 32, p99Ms: 48, errorRate: 0.0 },
      { serviceName: 'api-gateway', sampleCount: 35, p50Ms: 12, p90Ms: 18, p95Ms: 22, p99Ms: 30, errorRate: 0.0 },
      { serviceName: 'redis-cache', sampleCount: 40, p50Ms: 4, p90Ms: 6, p95Ms: 9, p99Ms: 14, errorRate: 0.0 },
    ]
  },
}
