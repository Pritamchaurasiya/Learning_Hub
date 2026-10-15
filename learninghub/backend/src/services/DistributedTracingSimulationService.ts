import crypto from 'crypto'
import logger from '../utils/logger'

export type SpanKind = 'SERVER' | 'CLIENT' | 'INTERNAL' | 'PRODUCER' | 'CONSUMER'
export type SpanStatusCode = 'UNSET' | 'OK' | 'ERROR'

export interface SpanEvent {
  name: string
  timestampMs: number
  attributes?: Record<string, any>
}

export interface Span {
  traceId: string
  spanId: string
  parentSpanId: string | null
  name: string
  serviceName: string
  kind: SpanKind
  startTimeMs: number
  durationMs: number
  statusCode: SpanStatusCode
  statusMessage?: string
  attributes: Record<string, any>
  events: SpanEvent[]
  isCriticalPath?: boolean
}

export interface W3cTraceparent {
  version: string
  traceId: string
  parentId: string
  traceFlags: string
  rawHeader: string
}

export interface TraceAggregate {
  traceId: string
  rootServiceName: string
  name: string
  totalDurationMs: number
  spanCount: number
  hasError: boolean
  timestamp: string
  criticalPathDurationMs: number
  criticalPathSpanIds: string[]
  spans: Span[]
  w3cTraceparent: W3cTraceparent
  baggage: Record<string, string>
  auditDigest: string
}

export interface ChaosRule {
  targetService: string
  additionalLatencyMs: number
  injectError: boolean
  errorRate: number // 0.0 to 1.0
}

export interface LatencyDistribution {
  serviceName: string
  sampleCount: number
  p50Ms: number
  p90Ms: number
  p95Ms: number
  p99Ms: number
  errorRate: number
}

export class DistributedTracingSimulationService {
  private traces: Map<string, TraceAggregate> = new Map()
  private chaosRules: Map<string, ChaosRule> = new Map()

  constructor() {
    this.seedInitialTraces()
  }

  private seedInitialTraces(): void {
    // Generate an initial successful purchase/enrollment trace
    this.simulateTransactionRequest({
      scenarioName: 'CourseEnrollmentFlow',
      userId: 'usr-8921',
      courseId: 'ds-201-distributed-systems',
      clientBaggage: { tenant: 'enterprise-apac', tier: 'PRO' },
    })

    // Generate a background quiz attempt submission trace
    this.simulateTransactionRequest({
      scenarioName: 'QuizAttemptSubmission',
      userId: 'usr-3342',
      courseId: 'algo-101',
      clientBaggage: { tenant: 'standard', tier: 'FREE' },
    })
  }

  public getTraces(): TraceAggregate[] {
    return Array.from(this.traces.values()).sort(
      (a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
    )
  }

  public getTraceById(traceId: string): TraceAggregate | null {
    return this.traces.get(traceId) || null
  }

  public simulateTransactionRequest(params: {
    scenarioName: string
    userId: string
    courseId: string
    clientBaggage?: Record<string, string>
    customDelays?: Record<string, number>
    forceErrorOnService?: string
  }): TraceAggregate {
    const traceId = crypto.randomBytes(16).toString('hex')
    const rootSpanId = crypto.randomBytes(8).toString('hex')

    const baggage: Record<string, string> = {
      userId: params.userId,
      courseId: params.courseId,
      ...(params.clientBaggage || {}),
    }

    const w3cTraceparent: W3cTraceparent = {
      version: '00',
      traceId,
      parentId: rootSpanId,
      traceFlags: '01',
      rawHeader: `00-${traceId}-${rootSpanId}-01`,
    }

    const spans: Span[] = []
    let currentTime = 0

    // Helper to evaluate latency considering chaos rules
    const computeDuration = (serviceName: string, baseMs: number): { duration: number; isError: boolean } => {
      const chaos = this.chaosRules.get(serviceName)
      const customDelay = params.customDelays?.[serviceName] || 0
      let duration = baseMs + customDelay
      let isError = false

      if (chaos) {
        duration += chaos.additionalLatencyMs
        if (chaos.injectError && Math.random() < chaos.errorRate) {
          isError = true
        }
      }

      if (params.forceErrorOnService === serviceName) {
        isError = true
      }

      return { duration: Math.max(1, duration), isError }
    }

    // 1. Root Ingress Gateway Span
    const gatewayMetric = computeDuration('api-gateway', 12)
    const gatewaySpanId = rootSpanId
    const gatewaySpan: Span = {
      traceId,
      spanId: gatewaySpanId,
      parentSpanId: null,
      name: `HTTP POST /api/v1/${params.scenarioName}`,
      serviceName: 'api-gateway',
      kind: 'SERVER',
      startTimeMs: currentTime,
      durationMs: 0, // Calculated at the end
      statusCode: gatewayMetric.isError ? 'ERROR' : 'OK',
      statusMessage: gatewayMetric.isError ? '502 Bad Gateway' : undefined,
      attributes: {
        'http.method': 'POST',
        'http.route': `/api/v1/${params.scenarioName}`,
        'http.status_code': gatewayMetric.isError ? 502 : 200,
        'user.id': params.userId,
      },
      events: [{ name: 'RequestReceived', timestampMs: currentTime }],
    }
    spans.push(gatewaySpan)
    currentTime += 5

    // 2. Auth Service: Validate JWT & Claims (Child of Gateway)
    const authMetric = computeDuration('auth-service', 18)
    const authSpanId = crypto.randomBytes(8).toString('hex')
    spans.push({
      traceId,
      spanId: authSpanId,
      parentSpanId: gatewaySpanId,
      name: 'AuthService:ValidateToken',
      serviceName: 'auth-service',
      kind: 'INTERNAL',
      startTimeMs: currentTime,
      durationMs: authMetric.duration,
      statusCode: authMetric.isError ? 'ERROR' : 'OK',
      statusMessage: authMetric.isError ? 'Token expired or invalid signature' : undefined,
      attributes: {
        'auth.token_type': 'Bearer',
        'auth.subject': params.userId,
      },
      events: [{ name: 'TokenVerified', timestampMs: currentTime + authMetric.duration }],
    })
    currentTime += authMetric.duration

    // 3. Course Service: Fetch Catalog & Seat Quota (Child of Gateway)
    const courseStart = currentTime
    const courseMetric = computeDuration('course-service', 25)
    const courseSpanId = crypto.randomBytes(8).toString('hex')

    // 3a. Cache lookup within Course Service (Child of Course Service)
    const cacheMetric = computeDuration('redis-cache', 4)
    const cacheSpanId = crypto.randomBytes(8).toString('hex')
    spans.push({
      traceId,
      spanId: cacheSpanId,
      parentSpanId: courseSpanId,
      name: 'Redis:GET course_quota',
      serviceName: 'redis-cache',
      kind: 'CLIENT',
      startTimeMs: courseStart + 2,
      durationMs: cacheMetric.duration,
      statusCode: cacheMetric.isError ? 'ERROR' : 'OK',
      attributes: {
        'db.system': 'redis',
        'db.operation': 'GET',
        'db.redis.key': `course:${params.courseId}:quota`,
      },
      events: [],
    })

    // 3b. Postgres Query within Course Service (Child of Course Service)
    const dbMetric = computeDuration('postgres-db', 32)
    const dbSpanId = crypto.randomBytes(8).toString('hex')
    spans.push({
      traceId,
      spanId: dbSpanId,
      parentSpanId: courseSpanId,
      name: 'PostgreSQL:SELECT courses',
      serviceName: 'postgres-db',
      kind: 'CLIENT',
      startTimeMs: courseStart + 7,
      durationMs: dbMetric.duration,
      statusCode: dbMetric.isError ? 'ERROR' : 'OK',
      attributes: {
        'db.system': 'postgresql',
        'db.statement': 'SELECT * FROM courses WHERE id = $1',
        'db.name': 'learninghub_prod',
      },
      events: [],
    })

    const courseDuration = Math.max(courseMetric.duration, 7 + dbMetric.duration + 3)
    spans.push({
      traceId,
      spanId: courseSpanId,
      parentSpanId: gatewaySpanId,
      name: 'CourseService:GetDetailsAndLock',
      serviceName: 'course-service',
      kind: 'INTERNAL',
      startTimeMs: courseStart,
      durationMs: courseDuration,
      statusCode: courseMetric.isError || dbMetric.isError ? 'ERROR' : 'OK',
      attributes: {
        'course.id': params.courseId,
        'course.seats_available': 42,
      },
      events: [{ name: 'SeatReserved', timestampMs: courseStart + courseDuration }],
    })
    currentTime = courseStart + courseDuration

    // 4. Payment Gateway Service (Child of Gateway)
    const payMetric = computeDuration('payment-service', 65)
    const paySpanId = crypto.randomBytes(8).toString('hex')
    spans.push({
      traceId,
      spanId: paySpanId,
      parentSpanId: gatewaySpanId,
      name: 'PaymentService:AuthorizeAndCapture',
      serviceName: 'payment-service',
      kind: 'CLIENT',
      startTimeMs: currentTime,
      durationMs: payMetric.duration,
      statusCode: payMetric.isError ? 'ERROR' : 'OK',
      statusMessage: payMetric.isError ? 'Payment gateway declined or timeout' : undefined,
      attributes: {
        'payment.amount_cents': 9900,
        'payment.currency': 'USD',
        'payment.provider': 'Stripe',
      },
      events: [{ name: 'WebhookDispatched', timestampMs: currentTime + payMetric.duration }],
    })
    currentTime += payMetric.duration

    // 5. Asynchronous Notification Service (Producer/Consumer child of Gateway)
    const notifyMetric = computeDuration('notification-worker', 14)
    const notifySpanId = crypto.randomBytes(8).toString('hex')
    spans.push({
      traceId,
      spanId: notifySpanId,
      parentSpanId: gatewaySpanId,
      name: 'Kafka:Produce enrollment_notifications',
      serviceName: 'notification-worker',
      kind: 'PRODUCER',
      startTimeMs: currentTime,
      durationMs: notifyMetric.duration,
      statusCode: notifyMetric.isError ? 'ERROR' : 'OK',
      attributes: {
        'messaging.system': 'kafka',
        'messaging.destination': 'enrollment_notifications',
        'messaging.operation': 'produce',
      },
      events: [],
    })
    currentTime += notifyMetric.duration

    // Finalize Gateway Root Span Duration
    gatewaySpan.durationMs = currentTime
    const hasError = spans.some((s) => s.statusCode === 'ERROR')
    if (hasError) gatewaySpan.statusCode = 'ERROR'

    // Calculate Critical Path Analysis (Longest sequential path in DAG)
    const { criticalPathSpanIds, criticalPathDurationMs } = this.calculateCriticalPath(spans)
    for (const s of spans) {
      if (criticalPathSpanIds.includes(s.spanId)) {
        s.isCriticalPath = true
      }
    }

    const auditDigest = this.computeTraceAuditDigest(traceId, spans, criticalPathSpanIds)

    const traceAggregate: TraceAggregate = {
      traceId,
      rootServiceName: 'api-gateway',
      name: `HTTP POST /api/v1/${params.scenarioName}`,
      totalDurationMs: currentTime,
      spanCount: spans.length,
      hasError,
      timestamp: new Date().toISOString(),
      criticalPathDurationMs,
      criticalPathSpanIds,
      spans,
      w3cTraceparent,
      baggage,
      auditDigest,
    }

    this.traces.set(traceId, traceAggregate)
    return traceAggregate
  }

  public setChaosRule(rule: ChaosRule): void {
    this.chaosRules.set(rule.targetService, rule)
    logger.info(`[DistributedTracingSimulationService] Chaos rule updated for ${rule.targetService}`)
  }

  public clearChaosRules(): void {
    this.chaosRules.clear()
  }

  public getLatencyDistributions(): LatencyDistribution[] {
    const serviceDurations: Map<string, number[]> = new Map()
    const serviceErrors: Map<string, number> = new Map()

    for (const trace of this.traces.values()) {
      for (const span of trace.spans) {
        const durations = serviceDurations.get(span.serviceName) || []
        durations.push(span.durationMs)
        serviceDurations.set(span.serviceName, durations)

        if (span.statusCode === 'ERROR') {
          serviceErrors.set(span.serviceName, (serviceErrors.get(span.serviceName) || 0) + 1)
        }
      }
    }

    const result: LatencyDistribution[] = []
    for (const [service, times] of serviceDurations.entries()) {
      times.sort((a, b) => a - b)
      const count = times.length
      const p50 = times[Math.floor(count * 0.5)] || 0
      const p90 = times[Math.floor(count * 0.9)] || 0
      const p95 = times[Math.floor(count * 0.95)] || 0
      const p99 = times[Math.floor(count * 0.99)] || 0
      const errCount = serviceErrors.get(service) || 0

      result.push({
        serviceName: service,
        sampleCount: count,
        p50Ms: p50,
        p90Ms: p90,
        p95Ms: p95,
        p99Ms: p99,
        errorRate: count > 0 ? Number((errCount / count).toFixed(3)) : 0,
      })
    }

    return result.sort((a, b) => b.p99Ms - a.p99Ms)
  }

  public reset(): void {
    this.traces.clear()
    this.chaosRules.clear()
    this.seedInitialTraces()
  }

  /**
   * Critical Path Algorithm:
   * Traverses span hierarchy and identifies sequential bottleneck spans that determine total wall-clock duration.
   */
  private calculateCriticalPath(spans: Span[]): { criticalPathSpanIds: string[]; criticalPathDurationMs: number } {
    // Root span is always base
    const root = spans.find((s) => s.parentSpanId === null)
    if (!root) return { criticalPathSpanIds: [], criticalPathDurationMs: 0 }

    const childrenMap: Map<string, Span[]> = new Map()
    for (const s of spans) {
      if (s.parentSpanId) {
        const list = childrenMap.get(s.parentSpanId) || []
        list.push(s)
        childrenMap.set(s.parentSpanId, list)
      }
    }

    // Direct gateway children that execute sequentially
    const gatewayChildren = childrenMap.get(root.spanId) || []
    gatewayChildren.sort((a, b) => a.startTimeMs - b.startTimeMs)

    const criticalPathIds: string[] = [root.spanId]
    let totalCriticalMs = 0

    for (const child of gatewayChildren) {
      // Find deepest longest path inside child
      const leafChildren = childrenMap.get(child.spanId) || []
      if (leafChildren.length > 0) {
        leafChildren.sort((a, b) => b.durationMs - a.durationMs)
        const dominantLeaf = leafChildren[0]
        criticalPathIds.push(child.spanId, dominantLeaf.spanId)
        totalCriticalMs += dominantLeaf.durationMs
      } else {
        criticalPathIds.push(child.spanId)
        totalCriticalMs += child.durationMs
      }
    }

    return {
      criticalPathSpanIds: Array.from(new Set(criticalPathIds)),
      criticalPathDurationMs: totalCriticalMs,
    }
  }

  private computeTraceAuditDigest(traceId: string, spans: Span[], criticalPathIds: string[]): string {
    const raw = `${traceId}:${spans.map((s) => `${s.spanId}-${s.statusCode}-${s.durationMs}`).join(',')}:${criticalPathIds.join(',')}`
    return crypto.createHash('sha256').update(raw).digest('hex')
  }
}

export const distributedTracingSimulationService = new DistributedTracingSimulationService()
