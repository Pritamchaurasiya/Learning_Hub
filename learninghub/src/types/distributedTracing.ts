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
  errorRate: number
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

export type TracingStudioTab =
  | 'WATERFALL'
  | 'DEPENDENCY_DAG'
  | 'CRITICAL_PATH'
  | 'CHAOS_LAB'
  | 'W3C_BAGGAGE'
