import { describe, it, expect, vi } from 'vitest'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { TokenBucketVisualizer } from './TokenBucketVisualizer'
import { AlgorithmComparisonSandbox } from './AlgorithmComparisonSandbox'
import { DistributedLuaAtomicityHUD } from './DistributedLuaAtomicityHUD'
import { AdaptiveConcurrencyLimitCard } from './AdaptiveConcurrencyLimitCard'
import { RateLimitAuditScorecard } from './RateLimitAuditScorecard'
import { distributedRateLimiterService } from '../../services/distributedRateLimiterService'
import type {
  RateLimitVerdict,
  RaceConditionSimResult,
  AdaptiveConcurrencyState,
  RateLimiterAuditSnapshot,
} from '../../types/distributedRateLimiter'

describe('Rate Limiter Studio UI Components (Milestone 37)', () => {
  describe('TokenBucketVisualizer', () => {
    it('renders reservoir level, capacity, and triggers token consumption', async () => {
      const handleConsume = vi.fn().mockResolvedValue(undefined)
      const mockVerdict: RateLimitVerdict = {
        allowed: true,
        remainingTokens: 14,
        totalCapacity: 20,
        retryAfterSeconds: 0,
        resetTimestamp: 1700000060,
        currentLatencyMs: 0.45,
        algorithm: 'TOKEN_BUCKET',
        headers: {
          'X-RateLimit-Limit': 20,
          'X-RateLimit-Remaining': 14,
          'X-RateLimit-Reset': 1700000060,
        },
      }

      render(
        <TokenBucketVisualizer
          capacity={20}
          refillRate={5}
          remainingTokens={15}
          onConsume={handleConsume}
          lastVerdict={mockVerdict}
        />
      )

      expect(screen.getByText('Token Bucket Reservoir')).toBeInTheDocument()
      expect(screen.getByText('+5/s')).toBeInTheDocument()
      expect(screen.getByText('HTTP 200 OK — Request Admitted')).toBeInTheDocument()

      const consumeOneBtn = screen.getByText('1 Token').closest('button')
      expect(consumeOneBtn).toBeInTheDocument()
      fireEvent.click(consumeOneBtn!)

      await waitFor(() => {
        expect(handleConsume).toHaveBeenCalledWith(1)
      })
    })

    it('renders throttled HTTP 429 warning when request is denied', () => {
      const throttledVerdict: RateLimitVerdict = {
        allowed: false,
        remainingTokens: 0,
        totalCapacity: 20,
        retryAfterSeconds: 5,
        resetTimestamp: 1700000060,
        currentLatencyMs: 0.12,
        algorithm: 'TOKEN_BUCKET',
        headers: {
          'X-RateLimit-Limit': 20,
          'X-RateLimit-Remaining': 0,
          'X-RateLimit-Reset': 1700000060,
          'Retry-After': 5,
        },
      }

      render(
        <TokenBucketVisualizer
          capacity={20}
          refillRate={5}
          remainingTokens={0}
          onConsume={vi.fn()}
          lastVerdict={throttledVerdict}
        />
      )

      expect(screen.getByText('HTTP 429 Too Many Requests — Throttled')).toBeInTheDocument()
      expect(screen.getByText(/Retry after 5s/)).toBeInTheDocument()
    })
  })

  describe('AlgorithmComparisonSandbox', () => {
    it('renders algorithm comparison sandbox and runs simulated traffic blast', async () => {
      const handleComplete = vi.fn()
      const evaluateSpy = vi.spyOn(distributedRateLimiterService, 'evaluateRequest').mockResolvedValue({
        allowed: true,
        remainingTokens: 10,
        totalCapacity: 15,
        retryAfterSeconds: 0,
        resetTimestamp: 1700000060,
        currentLatencyMs: 0.2,
        algorithm: 'TOKEN_BUCKET',
        headers: {
          'X-RateLimit-Limit': 15,
          'X-RateLimit-Remaining': 10,
          'X-RateLimit-Reset': 1700000060,
        },
      })

      render(<AlgorithmComparisonSandbox onSimulateComplete={handleComplete} />)

      expect(
        screen.getByText('Rate Limiting Algorithm Comparison Sandbox')
      ).toBeInTheDocument()
      expect(screen.getByText('Sandbox Ready for Load Blast')).toBeInTheDocument()

      const blastBtn = screen.getByRole('button', { name: /Simulate Blast/i })
      fireEvent.click(blastBtn)

      await waitFor(() => {
        expect(screen.getByText('Token Bucket')).toBeInTheDocument()
        expect(screen.getByText('Leaky Bucket')).toBeInTheDocument()
        expect(screen.getByText('Sliding Window Counter')).toBeInTheDocument()
      })

      evaluateSpy.mockRestore()
    })
  })

  describe('DistributedLuaAtomicityHUD', () => {
    it('renders race condition inspector and displays comparison results', async () => {
      const handleSimulate = vi.fn().mockResolvedValue(undefined)
      const mockResult: RaceConditionSimResult = {
        concurrency: 100,
        unprotectedBreaches: 27,
        unprotectedAllowed: 42,
        luaAtomicBreaches: 0,
        luaAtomicAllowed: 15,
        capacity: 15,
        explanation: 'Interleaved execution allowed 27 over-capacity requests',
      }

      render(
        <DistributedLuaAtomicityHUD
          onSimulate={handleSimulate}
          result={mockResult}
        />
      )

      expect(
        screen.getByText('Distributed Race Condition vs Redis Lua Atomicity')
      ).toBeInTheDocument()
      expect(screen.getByText('Unprotected Read-Modify-Write')).toBeInTheDocument()
      expect(screen.getByText('+27')).toBeInTheDocument()
      expect(screen.getByText('Redis EVAL Lua Script')).toBeInTheDocument()
      expect(screen.getByText('ratelimit_atomic.lua')).toBeInTheDocument()

      const runBtn = screen.getByRole('button', { name: /Execute Concurrency Race/i })
      fireEvent.click(runBtn)

      await waitFor(() => {
        expect(handleSimulate).toHaveBeenCalled()
      })
    })
  })

  describe('AdaptiveConcurrencyLimitCard', () => {
    it('renders adaptive concurrency limits and triggers RTT updates', async () => {
      const handleUpdateRtt = vi.fn().mockResolvedValue(undefined)
      const mockState: AdaptiveConcurrencyState = {
        currentLimit: 64,
        minLimit: 10,
        maxLimit: 200,
        inflightRequests: 28,
        smoothedRttMs: 22.4,
        baselineRttMs: 20.0,
        queueSize: 0,
        status: 'OPTIMAL',
        adjustmentDirection: 'INCREASE',
      }

      render(
        <AdaptiveConcurrencyLimitCard
          state={mockState}
          onUpdateRtt={handleUpdateRtt}
        />
      )

      expect(screen.getByText('Adaptive Concurrency Limiter')).toBeInTheDocument()
      expect(screen.getByText(/OPTIMAL \(Additive Increase\)/i)).toBeInTheDocument()
      expect(screen.getByText('64')).toBeInTheDocument()

      const spikeBtn = screen.getByRole('button', { name: /Latency Spike/i })
      fireEvent.click(spikeBtn)

      await waitFor(() => {
        expect(handleUpdateRtt).toHaveBeenCalledWith(150.0)
      })
    })
  })

  describe('RateLimitAuditScorecard', () => {
    it('renders RFC headers, audit digest, and handles reset click', async () => {
      const handleReset = vi.fn().mockResolvedValue(undefined)
      const mockSnapshot: RateLimiterAuditSnapshot = {
        activeConfigs: {},
        globalTokensRefilled: 1200,
        totalRequestsEvaluated: 150,
        totalRequestsThrottled: 12,
        overallPassRate: 92.0,
        auditDigest: 'sha256-abcdef1234567890',
      }

      render(
        <RateLimitAuditScorecard
          snapshot={mockSnapshot}
          lastVerdict={null}
          onReset={handleReset}
        />
      )

      expect(
        screen.getByText('Rate Limiter RFC Compliance & Audit Scorecard')
      ).toBeInTheDocument()
      expect(screen.getByText('RFC 6585 HTTP Headers')).toBeInTheDocument()
      expect(screen.getByText('X-RateLimit-Limit')).toBeInTheDocument()
      expect(screen.getByText('sha256-abcdef1234567890')).toBeInTheDocument()

      const resetBtn = screen.getByRole('button', { name: /Reset Limiter Engine/i })
      fireEvent.click(resetBtn)

      await waitFor(() => {
        expect(handleReset).toHaveBeenCalled()
      })
    })
  })
})
