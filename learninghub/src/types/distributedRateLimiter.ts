export type RateLimiterAlgorithm =
  | 'TOKEN_BUCKET'
  | 'LEAKY_BUCKET'
  | 'FIXED_WINDOW'
  | 'SLIDING_WINDOW_LOG'
  | 'SLIDING_WINDOW_COUNTER'

export interface RateLimitConfig {
  keyPrefix: string
  capacity: number
  refillRatePerSec: number
  windowSeconds: number
  costPerRequest: number
}

export interface RateLimitVerdict {
  allowed: boolean
  remainingTokens: number
  totalCapacity: number
  retryAfterSeconds: number
  resetTimestamp: number
  currentLatencyMs: number
  algorithm: RateLimiterAlgorithm
  headers: {
    'X-RateLimit-Limit': number
    'X-RateLimit-Remaining': number
    'X-RateLimit-Reset': number
    'Retry-After'?: number
  }
}

export interface RaceConditionSimResult {
  concurrency: number
  unprotectedBreaches: number
  unprotectedAllowed: number
  luaAtomicBreaches: number
  luaAtomicAllowed: number
  capacity: number
  explanation: string
}

export interface AdaptiveConcurrencyState {
  currentLimit: number
  minLimit: number
  maxLimit: number
  inflightRequests: number
  smoothedRttMs: number
  baselineRttMs: number
  queueSize: number
  status: 'OPTIMAL' | 'THROTTLING' | 'SATURATED'
  adjustmentDirection: 'INCREASE' | 'DECREASE' | 'STEADY'
}

export interface RateLimiterAuditSnapshot {
  activeConfigs: Record<string, RateLimitConfig>
  globalTokensRefilled: number
  totalRequestsEvaluated: number
  totalRequestsThrottled: number
  overallPassRate: number
  auditDigest: string
}
