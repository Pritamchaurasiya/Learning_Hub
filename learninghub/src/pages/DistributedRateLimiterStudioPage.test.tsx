import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { DistributedRateLimiterStudioPage } from './DistributedRateLimiterStudioPage'
import { distributedRateLimiterService } from '../services/distributedRateLimiterService'

describe('DistributedRateLimiterStudioPage (Milestone 37)', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    vi.spyOn(distributedRateLimiterService, 'getAdaptiveState').mockResolvedValue({
      currentLimit: 50,
      minLimit: 10,
      maxLimit: 200,
      inflightRequests: 18,
      smoothedRttMs: 20.0,
      baselineRttMs: 20.0,
      queueSize: 0,
      status: 'OPTIMAL',
      adjustmentDirection: 'STEADY',
    })

    vi.spyOn(distributedRateLimiterService, 'getAuditSnapshot').mockResolvedValue({
      activeConfigs: {},
      globalTokensRefilled: 1240,
      totalRequestsEvaluated: 150,
      totalRequestsThrottled: 12,
      overallPassRate: 92.0,
      auditDigest: 'a718c8b1d98e4f16a048c12b9d7e34ef21890cb5a917e88c03561234bcde1029',
    })

    vi.spyOn(distributedRateLimiterService, 'simulateRaceCondition').mockResolvedValue({
      concurrency: 100,
      unprotectedBreaches: 25,
      unprotectedAllowed: 40,
      luaAtomicBreaches: 0,
      luaAtomicAllowed: 15,
      capacity: 15,
      explanation: 'Unprotected execution breached capacity',
    })
  })

  it('renders hero title and tabs', async () => {
    render(<DistributedRateLimiterStudioPage />)

    await waitFor(() => {
      expect(
        screen.getByText('Distributed Rate Limiting & Traffic Shaping Studio')
      ).toBeInTheDocument()
      expect(screen.getByText('Milestone 37 • Production Distributed Systems')).toBeInTheDocument()
    })

    expect(screen.getByText('All Modules')).toBeInTheDocument()
    expect(screen.getAllByText('Token Bucket Reservoir').length).toBeGreaterThanOrEqual(1)
    expect(screen.getByText('Algorithm Sandbox')).toBeInTheDocument()
    expect(screen.getByText('Lua Race Condition')).toBeInTheDocument()
    expect(screen.getAllByText('Adaptive Concurrency').length).toBeGreaterThanOrEqual(1)
    expect(screen.getByText('RFC 6585 Audit')).toBeInTheDocument()
  })

  it('filters active modules when tab is clicked', async () => {
    render(<DistributedRateLimiterStudioPage />)

    await waitFor(() => {
      expect(
        screen.getByText('Distributed Rate Limiting & Traffic Shaping Studio')
      ).toBeInTheDocument()
    })

    const luaTab = screen.getByRole('button', { name: /Lua Race Condition/i })
    fireEvent.click(luaTab)

    expect(
      screen.getByText('Distributed Race Condition vs Redis Lua Atomicity')
    ).toBeInTheDocument()
  })

  it('handles reset state button click', async () => {
    const resetSpy = vi.spyOn(distributedRateLimiterService, 'reset').mockResolvedValue({
      activeConfigs: {},
      globalTokensRefilled: 0,
      totalRequestsEvaluated: 0,
      totalRequestsThrottled: 0,
      overallPassRate: 100.0,
      auditDigest: 'reset-digest',
    })

    render(<DistributedRateLimiterStudioPage />)

    await waitFor(() => {
      expect(
        screen.getByText('Distributed Rate Limiting & Traffic Shaping Studio')
      ).toBeInTheDocument()
    })

    const resetBtn = screen.getByRole('button', { name: /Reset State/i })
    fireEvent.click(resetBtn)

    await waitFor(() => {
      expect(resetSpy).toHaveBeenCalled()
    })
  })
})
