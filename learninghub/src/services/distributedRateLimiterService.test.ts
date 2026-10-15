import { describe, it, expect, vi, beforeEach } from 'vitest'
import { distributedRateLimiterService } from './distributedRateLimiterService'
import * as apiModule from '../utils/api'

vi.mock('../utils/api', () => ({
  fetchApi: vi.fn(),
}))

describe('distributedRateLimiterService', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('evaluates rate limit request using API when successful', async () => {
    const mockVerdict = {
      allowed: true,
      remainingTokens: 19,
      totalCapacity: 20,
      retryAfterSeconds: 0,
      resetTimestamp: 1700000060,
      currentLatencyMs: 0.35,
      algorithm: 'TOKEN_BUCKET' as const,
      headers: {
        'X-RateLimit-Limit': 20,
        'X-RateLimit-Remaining': 19,
        'X-RateLimit-Reset': 1700000060,
      },
    }

    vi.mocked(apiModule.fetchApi).mockResolvedValueOnce({
      status: 'success',
      data: { verdict: mockVerdict },
    })

    const result = await distributedRateLimiterService.evaluateRequest({
      algorithm: 'TOKEN_BUCKET',
      capacity: 20,
      refillRate: 5,
    })

    expect(result.allowed).toBe(true)
    expect(result.remainingTokens).toBe(19)
    expect(result.headers['X-RateLimit-Limit']).toBe(20)
  })

  it('falls back to mock verdict if API throws', async () => {
    vi.mocked(apiModule.fetchApi).mockRejectedValueOnce(new Error('Network Error'))

    const result = await distributedRateLimiterService.evaluateRequest({
      algorithm: 'TOKEN_BUCKET',
      capacity: 30,
    })

    expect(result.allowed).toBe(true)
    expect(result.totalCapacity).toBe(30)
    expect(result.remainingTokens).toBe(29)
  })

  it('simulates race condition successfully with fallback fallback', async () => {
    vi.mocked(apiModule.fetchApi).mockRejectedValueOnce(new Error('API Down'))

    const result = await distributedRateLimiterService.simulateRaceCondition(100, 15)

    expect(result.concurrency).toBe(100)
    expect(result.capacity).toBe(15)
    expect(result.luaAtomicBreaches).toBe(0)
    expect(result.unprotectedBreaches).toBeGreaterThan(0)
  })

  it('retrieves adaptive concurrency state with fallback', async () => {
    vi.mocked(apiModule.fetchApi).mockRejectedValueOnce(new Error('API Down'))

    const state = await distributedRateLimiterService.getAdaptiveState()

    expect(state.currentLimit).toBe(50)
    expect(state.baselineRttMs).toBe(20.0)
    expect(state.status).toBe('OPTIMAL')
  })

  it('updates adaptive concurrency state on high latency degradation', async () => {
    vi.mocked(apiModule.fetchApi).mockRejectedValueOnce(new Error('API Down'))

    const state = await distributedRateLimiterService.updateAdaptiveConcurrency(120.0)

    expect(state.status).toBe('SATURATED')
    expect(state.adjustmentDirection).toBe('DECREASE')
    expect(state.currentLimit).toBeLessThan(50)
  })

  it('retrieves and resets audit snapshot', async () => {
    vi.mocked(apiModule.fetchApi).mockRejectedValueOnce(new Error('API Down'))

    const audit = await distributedRateLimiterService.getAuditSnapshot()

    expect(audit.globalTokensRefilled).toBeGreaterThan(0)
    expect(audit.auditDigest).toBeDefined()
    expect(audit.activeConfigs['token_bucket_default']).toBeDefined()
  })
})
