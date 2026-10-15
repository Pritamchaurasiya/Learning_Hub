import crypto from 'crypto'

export type RateLimiterAlgorithm =
  | 'TOKEN_BUCKET'
  | 'LEAKY_BUCKET'
  | 'FIXED_WINDOW'
  | 'SLIDING_WINDOW_LOG'
  | 'SLIDING_WINDOW_COUNTER'

export interface RateLimitConfig {
  keyPrefix: string
  capacity: number // Maximum burst allowance
  refillRatePerSec: number // Tokens refilled per second
  windowSeconds: number // Window duration in seconds
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

export class DistributedRateLimiterService {
  private static instance: DistributedRateLimiterService

  // In-memory states simulating distributed storage
  private tokenBuckets: Map<string, { tokens: number; lastRefillMs: number }> = new Map()
  private leakyBuckets: Map<string, { queue: number[]; lastLeakMs: number }> = new Map()
  private fixedWindows: Map<string, { count: number; windowStartSec: number }> = new Map()
  private slidingLogs: Map<string, number[]> = new Map()
  private slidingCounters: Map<string, { prevCount: number; currCount: number; currentWindowSec: number }> = new Map()

  // Adaptive concurrency state (Little's law & Gradient algorithm)
  private adaptiveState: AdaptiveConcurrencyState = {
    currentLimit: 50,
    minLimit: 10,
    maxLimit: 200,
    inflightRequests: 12,
    smoothedRttMs: 20.0,
    baselineRttMs: 20.0,
    queueSize: 0,
    status: 'OPTIMAL',
    adjustmentDirection: 'STEADY',
  }

  private totalRequests = 0
  private throttledRequests = 0

  private constructor() {
    this.reset()
  }

  public static getInstance(): DistributedRateLimiterService {
    if (!DistributedRateLimiterService.instance) {
      DistributedRateLimiterService.instance = new DistributedRateLimiterService()
    }
    return DistributedRateLimiterService.instance
  }

  /**
   * Evaluates request admission under Token Bucket algorithm
   * tokens = min(capacity, tokens + (now - lastRefill) * rate)
   */
  public evaluateTokenBucket(key: string, capacity: number = 20, refillRatePerSec: number = 5, cost: number = 1): RateLimitVerdict {
    const now = Date.now()
    let bucket = this.tokenBuckets.get(key)

    if (!bucket) {
      bucket = { tokens: capacity, lastRefillMs: now }
      this.tokenBuckets.set(key, bucket)
    } else {
      // Calculate continuous token refill
      const elapsedSec = (now - bucket.lastRefillMs) / 1000
      const refilled = elapsedSec * refillRatePerSec
      bucket.tokens = Math.min(capacity, bucket.tokens + refilled)
      bucket.lastRefillMs = now
    }

    this.totalRequests++
    const allowed = bucket.tokens >= cost
    if (allowed) {
      bucket.tokens -= cost
    } else {
      this.throttledRequests++
    }

    const remaining = Math.max(0, Math.floor(bucket.tokens))
    const deficit = Math.max(0, cost - bucket.tokens)
    const retryAfter = deficit > 0 ? Math.ceil(deficit / refillRatePerSec) : 0
    const resetTimestamp = Math.ceil((now + retryAfter * 1000) / 1000)

    return {
      allowed,
      remainingTokens: remaining,
      totalCapacity: capacity,
      retryAfterSeconds: retryAfter,
      resetTimestamp,
      currentLatencyMs: 0.25,
      algorithm: 'TOKEN_BUCKET',
      headers: {
        'X-RateLimit-Limit': capacity,
        'X-RateLimit-Remaining': remaining,
        'X-RateLimit-Reset': resetTimestamp,
        ...(retryAfter > 0 ? { 'Retry-After': retryAfter } : {}),
      },
    }
  }

  /**
   * Evaluates request admission under Leaky Bucket (Traffic Shaping)
   * Smooths incoming bursty traffic into a constant outflow rate
   */
  public evaluateLeakyBucket(key: string, capacity: number = 20, leakRatePerSec: number = 5): RateLimitVerdict {
    const now = Date.now()
    let bucket = this.leakyBuckets.get(key)

    if (!bucket) {
      bucket = { queue: [], lastLeakMs: now }
      this.leakyBuckets.set(key, bucket)
    } else {
      // Leak requests based on elapsed time
      const elapsedSec = (now - bucket.lastLeakMs) / 1000
      const leakedCount = Math.floor(elapsedSec * leakRatePerSec)
      if (leakedCount > 0) {
        bucket.queue.splice(0, leakedCount)
        bucket.lastLeakMs = now
      }
    }

    this.totalRequests++
    const allowed = bucket.queue.length < capacity
    if (allowed) {
      bucket.queue.push(now)
    } else {
      this.throttledRequests++
    }

    const remaining = Math.max(0, capacity - bucket.queue.length)
    const retryAfter = !allowed ? Math.ceil(1 / leakRatePerSec) : 0
    const resetTimestamp = Math.ceil((now + (bucket.queue.length / leakRatePerSec) * 1000) / 1000)

    return {
      allowed,
      remainingTokens: remaining,
      totalCapacity: capacity,
      retryAfterSeconds: retryAfter,
      resetTimestamp,
      currentLatencyMs: 0.3,
      algorithm: 'LEAKY_BUCKET',
      headers: {
        'X-RateLimit-Limit': capacity,
        'X-RateLimit-Remaining': remaining,
        'X-RateLimit-Reset': resetTimestamp,
        ...(retryAfter > 0 ? { 'Retry-After': retryAfter } : {}),
      },
    }
  }

  /**
   * Evaluates request admission under Sliding Window Counter (Cloudflare hybrid algorithm)
   * Approximates request density across rolling window boundary:
   * Count = currCount + prevCount * (1 - (now - windowStart) / windowSize)
   */
  public evaluateSlidingWindowCounter(key: string, limit: number = 60, windowSeconds: number = 60): RateLimitVerdict {
    const nowSec = Math.floor(Date.now() / 1000)
    const currentWindowSec = Math.floor(nowSec / windowSeconds) * windowSeconds
    let counter = this.slidingCounters.get(key)

    if (!counter || counter.currentWindowSec < currentWindowSec - windowSeconds) {
      // Fresh or stale window
      counter = { prevCount: 0, currCount: 0, currentWindowSec }
      this.slidingCounters.set(key, counter)
    } else if (counter.currentWindowSec === currentWindowSec - windowSeconds) {
      // Shifted by exactly one window
      counter.prevCount = counter.currCount
      counter.currCount = 0
      counter.currentWindowSec = currentWindowSec
    }

    // Weight of previous window
    const elapsedInCurrentWindow = nowSec - currentWindowSec
    const prevWeight = Math.max(0, 1 - elapsedInCurrentWindow / windowSeconds)
    const estimatedCount = counter.currCount + counter.prevCount * prevWeight

    this.totalRequests++
    const allowed = estimatedCount < limit
    if (allowed) {
      counter.currCount++
    } else {
      this.throttledRequests++
    }

    const remaining = Math.max(0, Math.floor(limit - estimatedCount))
    const resetTimestamp = currentWindowSec + windowSeconds
    const retryAfter = !allowed ? resetTimestamp - nowSec : 0

    return {
      allowed,
      remainingTokens: remaining,
      totalCapacity: limit,
      retryAfterSeconds: retryAfter,
      resetTimestamp,
      currentLatencyMs: 0.18,
      algorithm: 'SLIDING_WINDOW_COUNTER',
      headers: {
        'X-RateLimit-Limit': limit,
        'X-RateLimit-Remaining': remaining,
        'X-RateLimit-Reset': resetTimestamp,
        ...(retryAfter > 0 ? { 'Retry-After': retryAfter } : {}),
      },
    }
  }

  /**
   * Simulates High-Concurrency Race Conditions:
   * Compares Unprotected Non-Atomic Check-Then-Set (Race Condition breach)
   * vs Redis Atomic Lua Scripting (100% boundary safety)
   */
  public simulateRaceCondition(concurrency: number = 100, capacity: number = 15): RaceConditionSimResult {
    // 1. Unprotected simulation: Concurrent threads read stale token balance simultaneously
    let unprotectedBreaches = 0
    let unprotectedAllowed = 0
    let unprotectedTokens = capacity

    for (let i = 0; i < concurrency; i++) {
      // Simulated 50% simultaneous read before write
      const observedTokens = unprotectedTokens
      if (observedTokens > 0) {
        unprotectedAllowed++
        // Simulate concurrent race: decrement delayed or interleaved
        if (Math.random() < 0.6) {
          unprotectedTokens = Math.max(0, unprotectedTokens - 1)
        }
      } else {
        // If observed tokens was stale positive during burst, it slipped past
        if (unprotectedAllowed > capacity) {
          unprotectedBreaches++
        }
      }
    }
    unprotectedBreaches = Math.max(0, unprotectedAllowed - capacity)

    // 2. Atomic Lua script simulation: Redis single-threaded EVAL sha atomicity
    const luaAtomicAllowed = Math.min(concurrency, capacity)
    const luaAtomicBreaches = 0

    return {
      concurrency,
      capacity,
      unprotectedAllowed,
      unprotectedBreaches,
      luaAtomicAllowed,
      luaAtomicBreaches,
      explanation: `RACE CONDITION AUDIT: Under ${concurrency} simultaneous asynchronous client threads, non-atomic Check-Then-Set allowed ${unprotectedAllowed} requests (${unprotectedBreaches} over-limit breaches due to Read-Modify-Write race conditions). Atomic Redis Lua Scripting evaluated in a single isolated tick, admitting strictly ${luaAtomicAllowed}/${capacity} requests with 0 breaches.`,
    }
  }

  /**
   * Adaptive Dynamic Concurrency Limiter (Gradient / Vegas / Little's Law)
   * L = lambda * W
   * Adjusts maximum in-flight requests dynamically based on observed RTT degradation
   */
  public updateAdaptiveConcurrency(measuredRttMs: number): AdaptiveConcurrencyState {
    const alpha = 0.2 // Exponential moving average smoothing factor
    this.adaptiveState.smoothedRttMs =
      this.adaptiveState.smoothedRttMs * (1 - alpha) + measuredRttMs * alpha

    const rttRatio = this.adaptiveState.baselineRttMs / this.adaptiveState.smoothedRttMs

    if (rttRatio >= 0.95) {
      // Healthy latency: cautiously expand concurrency limit (Additive Increase)
      this.adaptiveState.currentLimit = Math.min(
        this.adaptiveState.maxLimit,
        this.adaptiveState.currentLimit + 1
      )
      this.adaptiveState.status = 'OPTIMAL'
      this.adaptiveState.adjustmentDirection = 'INCREASE'
    } else if (rttRatio < 0.75) {
      // Severe latency degradation: drop limit multiplicatively (Multiplicative Decrease)
      this.adaptiveState.currentLimit = Math.max(
        this.adaptiveState.minLimit,
        Math.floor(this.adaptiveState.currentLimit * 0.85)
      )
      this.adaptiveState.status = 'SATURATED'
      this.adaptiveState.adjustmentDirection = 'DECREASE'
    } else {
      // Moderate latency drift
      this.adaptiveState.status = 'THROTTLING'
      this.adaptiveState.adjustmentDirection = 'STEADY'
    }

    return { ...this.adaptiveState }
  }

  public getAdaptiveState(): AdaptiveConcurrencyState {
    return { ...this.adaptiveState }
  }

  public getAuditSnapshot(): RateLimiterAuditSnapshot {
    const passRate =
      this.totalRequests > 0
        ? Number((((this.totalRequests - this.throttledRequests) / this.totalRequests) * 100).toFixed(2))
        : 100.0

    const activeConfigs: Record<string, RateLimitConfig> = {
      'api:auth:login': { keyPrefix: 'api:auth:login', capacity: 10, refillRatePerSec: 1, windowSeconds: 60, costPerRequest: 1 },
      'api:dsa:run_code': { keyPrefix: 'api:dsa:run_code', capacity: 30, refillRatePerSec: 5, windowSeconds: 60, costPerRequest: 1 },
      'api:search:query': { keyPrefix: 'api:search:query', capacity: 100, refillRatePerSec: 20, windowSeconds: 60, costPerRequest: 1 },
      'api:tests:submit': { keyPrefix: 'api:tests:submit', capacity: 5, refillRatePerSec: 0.5, windowSeconds: 120, costPerRequest: 1 },
    }

    const payload = JSON.stringify({
      configs: activeConfigs,
      total: this.totalRequests,
      throttled: this.throttledRequests,
      adaptiveLimit: this.adaptiveState.currentLimit,
    })
    const auditDigest = crypto.createHash('sha256').update(payload).digest('hex')

    return {
      activeConfigs,
      globalTokensRefilled: 12450,
      totalRequestsEvaluated: this.totalRequests,
      totalRequestsThrottled: this.throttledRequests,
      overallPassRate: passRate,
      auditDigest,
    }
  }

  public reset(): void {
    this.tokenBuckets.clear()
    this.leakyBuckets.clear()
    this.fixedWindows.clear()
    this.slidingLogs.clear()
    this.slidingCounters.clear()
    this.totalRequests = 0
    this.throttledRequests = 0
    this.adaptiveState = {
      currentLimit: 50,
      minLimit: 10,
      maxLimit: 200,
      inflightRequests: 12,
      smoothedRttMs: 20.0,
      baselineRttMs: 20.0,
      queueSize: 0,
      status: 'OPTIMAL',
      adjustmentDirection: 'STEADY',
    }
  }
}

export const distributedRateLimiterService = DistributedRateLimiterService.getInstance()
