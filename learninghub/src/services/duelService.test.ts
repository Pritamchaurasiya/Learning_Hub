import { describe, it, expect, vi, beforeEach } from 'vitest'
import { duelService, TIER_CONFIG } from './duelService'

describe('duelService', () => {
  beforeEach(() => {
    vi.restoreAllMocks()
  })

  it('correctly maps Elo ratings to rank tier info', () => {
    expect(duelService.getTierInfo(600).tier).toBe('UNRANKED')
    expect(duelService.getTierInfo(950).tier).toBe('BRONZE')
    expect(duelService.getTierInfo(1320).tier).toBe('SILVER')
    expect(duelService.getTierInfo(1680).tier).toBe('GOLD')
    expect(duelService.getTierInfo(1950).tier).toBe('PLATINUM')
    expect(duelService.getTierInfo(2250).tier).toBe('DIAMOND')
    expect(duelService.getTierInfo(2600).tier).toBe('GRANDMASTER')
  })

  it('exposes full competitive tier configuration', () => {
    expect(Object.keys(TIER_CONFIG)).toHaveLength(7)
    expect(TIER_CONFIG.UNRANKED.tier).toBe('UNRANKED')
    expect(TIER_CONFIG.GRANDMASTER.tier).toBe('GRANDMASTER')
  })

  it('calculates tier progress percentage towards next tier', () => {
    // Silver tier: 1200 to 1499 (span = 300 to Gold 1500)
    // Elo 1350 is 150 points above 1200 -> 50%
    const progress = duelService.calculateTierProgress(1350)
    expect(progress.currentTier.tier).toBe('SILVER')
    expect(progress.nextTier?.tier).toBe('GOLD')
    expect(progress.percentage).toBe(50)
    expect(progress.pointsToNext).toBe(150)
  })

  it('handles max tier edge cases for Grandmaster', () => {
    const progress = duelService.calculateTierProgress(2800)
    expect(progress.currentTier.tier).toBe('GRANDMASTER')
    expect(progress.nextTier).toBeNull()
    expect(progress.percentage).toBe(100)
    expect(progress.pointsToNext).toBe(0)
  })

  it('fetches profile fallback gracefully when offline', async () => {
    const res = await duelService.getProfile()
    expect(res.status).toBe('success')
    expect(res.data.elo).toBeGreaterThan(0)
    expect(res.data.tier).toBeDefined()
  })

  it('fetches leaderboard fallback gracefully', async () => {
    const res = await duelService.getLeaderboard()
    expect(res.status).toBe('success')
    expect(res.data.leaderboard.length).toBeGreaterThan(0)
    expect(res.data.leaderboard[0].elo).toBeGreaterThanOrEqual(res.data.leaderboard[1].elo)
  })
})
