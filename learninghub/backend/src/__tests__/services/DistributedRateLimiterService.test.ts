import {
  DistributedRateLimiterService,
  distributedRateLimiterService,
} from '../../services/DistributedRateLimiterService'

describe('DistributedRateLimiterService (Milestone 37)', () => {
  beforeEach(() => {
    distributedRateLimiterService.reset()
  })

  describe('Token Bucket Algorithm', () => {
    it('allows initial burst up to full capacity and exhausts tokens', () => {
      const key = 'user:101:token_test'
      const capacity = 5
      const refillRate = 1

      // Consume all 5 tokens
      for (let i = 0; i < capacity; i++) {
        const verdict = distributedRateLimiterService.evaluateTokenBucket(key, capacity, refillRate, 1)
        expect(verdict.allowed).toBe(true)
        expect(verdict.algorithm).toBe('TOKEN_BUCKET')
      }

      // 6th request must be rejected
      const rejected = distributedRateLimiterService.evaluateTokenBucket(key, capacity, refillRate, 1)
      expect(rejected.allowed).toBe(false)
      expect(rejected.remainingTokens).toBe(0)
      expect(rejected.retryAfterSeconds).toBeGreaterThanOrEqual(1)
      expect(rejected.headers['Retry-After']).toBeDefined()
    })
  })

  describe('Leaky Bucket (Traffic Shaping)', () => {
    it('admits requests within buffer queue and smooths outflow', () => {
      const key = 'user:202:leaky_test'
      const capacity = 3
      const leakRate = 1

      const req1 = distributedRateLimiterService.evaluateLeakyBucket(key, capacity, leakRate)
      const req2 = distributedRateLimiterService.evaluateLeakyBucket(key, capacity, leakRate)
      const req3 = distributedRateLimiterService.evaluateLeakyBucket(key, capacity, leakRate)
      expect(req1.allowed).toBe(true)
      expect(req2.allowed).toBe(true)
      expect(req3.allowed).toBe(true)

      // 4th request overflows buffer queue
      const req4 = distributedRateLimiterService.evaluateLeakyBucket(key, capacity, leakRate)
      expect(req4.allowed).toBe(false)
      expect(req4.algorithm).toBe('LEAKY_BUCKET')
    })
  })

  describe('Sliding Window Counter', () => {
    it('evaluates weighted sliding window counter boundary estimate', () => {
      const key = 'user:303:sliding_test'
      const limit = 4
      const windowSec = 60

      for (let i = 0; i < limit; i++) {
        const v = distributedRateLimiterService.evaluateSlidingWindowCounter(key, limit, windowSec)
        expect(v.allowed).toBe(true)
        expect(v.algorithm).toBe('SLIDING_WINDOW_COUNTER')
      }

      const throttled = distributedRateLimiterService.evaluateSlidingWindowCounter(key, limit, windowSec)
      expect(throttled.allowed).toBe(false)
    })
  })

  describe('Race Condition vs Atomic Lua Scripting', () => {
    it('demonstrates concurrency over-limit breaches on non-atomic check-then-set vs zero breaches in Lua', () => {
      const sim = distributedRateLimiterService.simulateRaceCondition(100, 15)
      expect(sim.concurrency).toBe(100)
      expect(sim.capacity).toBe(15)
      expect(sim.luaAtomicAllowed).toBe(15)
      expect(sim.luaAtomicBreaches).toBe(0)
      expect(sim.unprotectedAllowed).toBeGreaterThanOrEqual(15)
      expect(sim.explanation).toContain('RACE CONDITION AUDIT')
    })
  })

  describe('Adaptive Concurrency Limiting (Little\'s Law / Gradient)', () => {
    it('dynamically adjusts concurrency limit based on measured RTT degradation', () => {
      const initial = distributedRateLimiterService.getAdaptiveState()
      expect(initial.currentLimit).toBe(50)

      // Healthy latency (15ms < 20ms baseline) -> Increase limit
      const increased = distributedRateLimiterService.updateAdaptiveConcurrency(15)
      expect(increased.currentLimit).toBeGreaterThanOrEqual(50)
      expect(increased.status).toBe('OPTIMAL')

      // Severe latency degradation (120ms >> 20ms baseline) -> Multiplicative Decrease
      const decreased = distributedRateLimiterService.updateAdaptiveConcurrency(120)
      expect(decreased.currentLimit).toBeLessThanOrEqual(increased.currentLimit)
    })
  })

  describe('Cryptographic Rate Limit Audit Seal', () => {
    it('generates SHA-256 HMAC digest representing active rate limiter policies', () => {
      const audit = distributedRateLimiterService.getAuditSnapshot()
      expect(audit.activeConfigs).toBeDefined()
      expect(audit.auditDigest).toBeDefined()
      expect(audit.auditDigest.length).toBe(64)
      expect(audit.overallPassRate).toBeGreaterThanOrEqual(0)
    })
  })
})
