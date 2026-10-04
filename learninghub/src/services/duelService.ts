import { fetchApi } from '../utils/api'
import type { DuelPlayer, DuelMatch, RankTier, TierInfo } from '../types/duel'

export const TIER_CONFIG: Record<RankTier, TierInfo> = {
  UNRANKED: {
    tier: 'UNRANKED',
    label: 'Unranked',
    color: '#9CA3AF',
    bgBadge: 'bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-300',
    minElo: 0,
    maxElo: 799,
  },
  BRONZE: {
    tier: 'BRONZE',
    label: 'Bronze Gladiator',
    color: '#CD7F32',
    bgBadge: 'bg-amber-100 text-amber-800 dark:bg-amber-900/40 dark:text-amber-300',
    minElo: 800,
    maxElo: 1199,
  },
  SILVER: {
    tier: 'SILVER',
    label: 'Silver Centurion',
    color: '#94A3B8',
    bgBadge: 'bg-slate-100 text-slate-800 dark:bg-slate-800 dark:text-slate-300',
    minElo: 1200,
    maxElo: 1499,
  },
  GOLD: {
    tier: 'GOLD',
    label: 'Gold Champion',
    color: '#EAB308',
    bgBadge: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/40 dark:text-yellow-300',
    minElo: 1500,
    maxElo: 1799,
  },
  PLATINUM: {
    tier: 'PLATINUM',
    label: 'Platinum Vanguard',
    color: '#06B6D4',
    bgBadge: 'bg-cyan-100 text-cyan-800 dark:bg-cyan-900/40 dark:text-cyan-300',
    minElo: 1800,
    maxElo: 2099,
  },
  DIAMOND: {
    tier: 'DIAMOND',
    label: 'Diamond Master',
    color: '#818CF8',
    bgBadge: 'bg-indigo-100 text-indigo-800 dark:bg-indigo-900/40 dark:text-indigo-300',
    minElo: 2100,
    maxElo: 2399,
  },
  GRANDMASTER: {
    tier: 'GRANDMASTER',
    label: 'Grandmaster Apex',
    color: '#F97316',
    bgBadge: 'bg-rose-100 text-rose-800 dark:bg-rose-900/40 dark:text-rose-300 ring-1 ring-rose-500/50',
    minElo: 2400,
    maxElo: 3000,
  },
}

export const duelService = {
  getTierInfo(elo: number): TierInfo {
    if (elo < 800) return TIER_CONFIG.UNRANKED
    if (elo < 1200) return TIER_CONFIG.BRONZE
    if (elo < 1500) return TIER_CONFIG.SILVER
    if (elo < 1800) return TIER_CONFIG.GOLD
    if (elo < 2100) return TIER_CONFIG.PLATINUM
    if (elo < 2400) return TIER_CONFIG.DIAMOND
    return TIER_CONFIG.GRANDMASTER
  },

  calculateTierProgress(elo: number): {
    currentTier: TierInfo
    nextTier: TierInfo | null
    percentage: number
    pointsToNext: number
  } {
    const currentTier = this.getTierInfo(elo)
    const tiers: RankTier[] = ['BRONZE', 'SILVER', 'GOLD', 'PLATINUM', 'DIAMOND', 'GRANDMASTER']
    const currentIndex = tiers.indexOf(currentTier.tier)

    if (currentIndex === -1 || currentIndex === tiers.length - 1) {
      return {
        currentTier,
        nextTier: null,
        percentage: 100,
        pointsToNext: 0,
      }
    }

    // eslint-disable-next-line security/detect-object-injection
    const nextTier = TIER_CONFIG[tiers[currentIndex + 1]]
    const range = nextTier.minElo - currentTier.minElo
    const earned = Math.max(0, elo - currentTier.minElo)
    const percentage = Math.min(100, Math.max(0, Math.round((earned / range) * 100)))
    const pointsToNext = Math.max(0, nextTier.minElo - elo)

    return {
      currentTier,
      nextTier,
      percentage,
      pointsToNext,
    }
  },

  async getProfile(): Promise<{ status: string; data: DuelPlayer }> {
    return fetchApi<{ status: string; data: DuelPlayer }>('/duel/profile').catch(() => ({
      status: 'success',
      data: {
        userId: 'local-duelist',
        username: 'ApexDuelist',
        elo: 1350,
        tier: 'SILVER',
        wins: 14,
        losses: 6,
        streak: 2,
        peakElo: 1410,
      },
    }))
  },

  async joinQueue(
    category = 'ANY',
    forceGhost = false
  ): Promise<{ status: string; data: { match: DuelMatch | null; queued: boolean; isGhost?: boolean } }> {
    return fetchApi('/duel/queue', {
      method: 'POST',
      body: JSON.stringify({ category, forceGhost }),
    })
  },

  async leaveQueue(): Promise<{ status: string; data: { removed: boolean } }> {
    return fetchApi('/duel/leave-queue', {
      method: 'POST',
    })
  },

  async getActiveMatch(): Promise<{ status: string; data: { match: DuelMatch | null; inMatch: boolean } }> {
    return fetchApi('/duel/active').catch(() => ({
      status: 'success',
      data: { match: null, inMatch: false },
    }))
  },

  async getMatchById(id: string): Promise<{ status: string; data: { match: DuelMatch } }> {
    return fetchApi(`/duel/match/${id}`)
  },

  async updateProgress(
    matchId: string,
    testsPassed: number,
    keystrokes: number
  ): Promise<{ status: string; data: { match: DuelMatch } }> {
    return fetchApi(`/duel/match/${matchId}/progress`, {
      method: 'POST',
      body: JSON.stringify({ testsPassed, keystrokes }),
    })
  },

  async submitSolution(
    matchId: string,
    code: string,
    passedAllTests: boolean
  ): Promise<{
    status: string
    data: { match: DuelMatch; isWinner: boolean; eloDelta: number }
  }> {
    return fetchApi(`/duel/match/${matchId}/submit`, {
      method: 'POST',
      body: JSON.stringify({ code, passedAllTests }),
    })
  },

  async getLeaderboard(): Promise<{ status: string; data: { leaderboard: DuelPlayer[] } }> {
    return fetchApi<{ status: string; data: { leaderboard: DuelPlayer[] } }>('/duel/leaderboard').catch(() => ({
      status: 'success',
      data: {
        leaderboard: [
          { userId: 'seed-1', username: 'AlgorithmAce', elo: 2420, tier: 'GRANDMASTER', wins: 88, losses: 12, streak: 8, peakElo: 2450 },
          { userId: 'seed-2', username: 'ByteMaster_99', elo: 2210, tier: 'DIAMOND', wins: 64, losses: 19, streak: 4, peakElo: 2280 },
          { userId: 'seed-3', username: 'BinaryWizard', elo: 2040, tier: 'PLATINUM', wins: 51, losses: 23, streak: 2, peakElo: 2090 },
          { userId: 'seed-4', username: 'GraphTraverser', elo: 1870, tier: 'PLATINUM', wins: 40, losses: 20, streak: 1, peakElo: 1920 },
          { userId: 'seed-5', username: 'DynamicDev', elo: 1720, tier: 'GOLD', wins: 33, losses: 21, streak: 3, peakElo: 1750 },
        ],
      },
    }))
  },
}
