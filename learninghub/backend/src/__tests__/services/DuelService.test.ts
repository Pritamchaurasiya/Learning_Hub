import { DuelEngine, ARENA_DUEL_PROBLEMS } from '../../services/DuelService'

describe('DuelEngine Elo & Arena Logic', () => {
  describe('Elo Calculations', () => {
    it('calculates equal expected score for identical ratings', () => {
      const expected = DuelEngine.calculateExpectedScore(1500, 1500)
      expect(expected).toBeCloseTo(0.5, 4)
    })

    it('calculates higher expected score for higher rated player', () => {
      const expectedA = DuelEngine.calculateExpectedScore(1800, 1400)
      const expectedB = DuelEngine.calculateExpectedScore(1400, 1800)

      expect(expectedA).toBeGreaterThan(0.9)
      expect(expectedB).toBeLessThan(0.1)
      expect(expectedA + expectedB).toBeCloseTo(1.0, 4)
    })

    it('awards higher delta for beating higher-rated opponent', () => {
      // Underdog win: 1200 beats 1600
      const underdogWin = DuelEngine.calculateEloAdjustment(1200, 1600, 1, 15)
      // Favorite win: 1600 beats 1200
      const favoriteWin = DuelEngine.calculateEloAdjustment(1600, 1200, 1, 15)

      expect(underdogWin.delta).toBeGreaterThan(favoriteWin.delta)
      expect(underdogWin.newRating).toBe(1200 + underdogWin.delta)
    })

    it('applies win streak multiplier for streak >= 3', () => {
      const normalWin = DuelEngine.calculateEloAdjustment(1400, 1400, 1, 15, 0)
      const streakWin = DuelEngine.calculateEloAdjustment(1400, 1400, 1, 15, 3)

      expect(streakWin.delta).toBeGreaterThan(normalWin.delta)
    })

    it('applies speed victory bonus', () => {
      const regularWin = DuelEngine.calculateEloAdjustment(1400, 1400, 1, 15, 0, false)
      const speedWin = DuelEngine.calculateEloAdjustment(1400, 1400, 1, 15, 0, true)

      expect(speedWin.delta).toBe(regularWin.delta + 5)
    })

    it('correctly maps Elo ratings to competitive rank tiers', () => {
      expect(DuelEngine.getTier(750)).toBe('UNRANKED')
      expect(DuelEngine.getTier(1000)).toBe('BRONZE')
      expect(DuelEngine.getTier(1350)).toBe('SILVER')
      expect(DuelEngine.getTier(1650)).toBe('GOLD')
      expect(DuelEngine.getTier(1950)).toBe('PLATINUM')
      expect(DuelEngine.getTier(2250)).toBe('DIAMOND')
      expect(DuelEngine.getTier(2500)).toBe('GRANDMASTER')
    })
  })

  describe('Matchmaking & Ghost Duels', () => {
    it('creates ghost duel with realistic AI opponent', () => {
      const ghostMatch = DuelEngine.spawnGhostMatch('test-user-ghost', 'TesterGhost')
      expect(ghostMatch).toBeDefined()
      expect(ghostMatch.id).toMatch(/^duel-match-/)
      expect(ghostMatch.player1.userId).toBe('test-user-ghost')
      expect(ghostMatch.player2.isGhost).toBe(true)
      expect(ghostMatch.problem).toBeDefined()
      expect(ghostMatch.problem.testCases.length).toBeGreaterThan(0)
    })

    it('enqueues user and matches two human duelists in bracket', () => {
      // First user enqueues
      const p1Result = DuelEngine.enqueueUser('user-alpha', 'AlphaDuelist')
      expect(p1Result.queued).toBe(true)
      expect(p1Result.match).toBeNull()

      // Second user enqueues within Elo bracket -> match immediately created
      const p2Result = DuelEngine.enqueueUser('user-beta', 'BetaDuelist')
      expect(p2Result.queued).toBe(false)
      expect(p2Result.match).toBeDefined()
      expect(p2Result.match?.player1.userId).toBe('user-alpha')
      expect(p2Result.match?.player2.userId).toBe('user-beta')
    })

    it('updates live test progress during match', () => {
      const match = DuelEngine.spawnGhostMatch('progress-user', 'ProgressUser')
      const updated = DuelEngine.updateProgress(match.id, 'progress-user', 3, 120)

      expect(updated).not.toBeNull()
      expect(updated?.player1.testsPassed).toBe(3)
      expect(updated?.player1.keystrokes).toBe(120)
      expect(updated?.player1.status).toBe('RUNNING')
    })

    it('handles winning solution submission and adjusts ratings', () => {
      const match = DuelEngine.spawnGhostMatch('winner-user', 'WinnerUser')
      const p1InitialElo = match.player1.elo

      const subResult = DuelEngine.submitMatchSolution(
        match.id,
        'winner-user',
        'function twoSum() { return [0, 1]; }',
        true
      )

      expect(subResult).not.toBeNull()
      expect(subResult?.isWinner).toBe(true)
      expect(subResult?.match.status).toBe('FINISHED')
      expect(subResult?.match.winnerId).toBe('winner-user')
      expect(subResult?.eloDelta).toBeGreaterThan(0)

      // Verified updated profile
      const updatedProfile = DuelEngine.getOrCreateProfile('winner-user')
      expect(updatedProfile.wins).toBe(1)
      expect(updatedProfile.streak).toBe(1)
      expect(updatedProfile.elo).toBe(p1InitialElo + (subResult?.eloDelta || 0))
    })

    it('returns competitive leaderboard with seeded and active players', () => {
      const leaderboard = DuelEngine.getLeaderboard()
      expect(leaderboard.length).toBeGreaterThan(0)
      // Leaderboard should be sorted descending by Elo
      for (let i = 0; i < leaderboard.length - 1; i++) {
        expect(leaderboard[i].elo).toBeGreaterThanOrEqual(leaderboard[i + 1].elo)
      }
    })
  })
})
