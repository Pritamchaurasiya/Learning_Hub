import crypto from 'crypto'
import logger from '../utils/logger'

export type RankTier =
  | 'UNRANKED'
  | 'BRONZE'
  | 'SILVER'
  | 'GOLD'
  | 'PLATINUM'
  | 'DIAMOND'
  | 'GRANDMASTER'

export interface DuelPlayer {
  userId: string
  username: string
  avatar?: string
  elo: number
  tier: RankTier
  wins: number
  losses: number
  streak: number
  peakElo: number
}

export interface DuelProblem {
  id: string
  title: string
  slug: string
  difficulty: 'EASY' | 'MEDIUM' | 'HARD'
  category: string
  description: string
  constraints: string
  starterCode: Record<string, string>
  testCases: Array<{
    id: string
    input: string
    expectedOutput: string
    isHidden?: boolean
  }>
}

export interface MatchPlayerState {
  userId: string
  username: string
  avatar?: string
  elo: number
  tier: RankTier
  isGhost?: boolean
  testsPassed: number
  totalTests: number
  status: 'DRAFTING' | 'RUNNING' | 'SUBMITTED' | 'SURRENDERED'
  submittedCode?: string
  submittedAt?: number
  keystrokes: number
}

export interface DuelMatch {
  id: string
  status: 'COUNTDOWN' | 'IN_PROGRESS' | 'FINISHED'
  problem: DuelProblem
  player1: MatchPlayerState
  player2: MatchPlayerState
  winnerId: string | null
  startedAt: number
  durationSeconds: number
  eloDeltaPlayer1?: number
  eloDeltaPlayer2?: number
  endReason?: 'SOLVED' | 'TIMEOUT' | 'SURRENDER'
}

export interface QueueEntry {
  userId: string
  username: string
  avatar?: string
  elo: number
  category: string
  queuedAt: number
}

// Built-in Curated Arena Duel Challenges
export const ARENA_DUEL_PROBLEMS: DuelProblem[] = [
  {
    id: 'duel-p-01',
    title: 'Two Sum',
    slug: 'two-sum',
    difficulty: 'EASY',
    category: 'Array / Hash Table',
    description:
      'Given an array of integers nums and an integer target, return indices of the two numbers such that they add up to target.\n\nYou may assume that each input would have exactly one solution, and you may not use the same element twice.',
    constraints: '2 <= nums.length <= 10^4\n-10^9 <= nums[i] <= 10^9\n-10^9 <= target <= 10^9',
    starterCode: {
      javascript:
        'function twoSum(nums, target) {\n  // Write your O(n) solution here\n  const map = new Map();\n  for (let i = 0; i < nums.length; i++) {\n    const complement = target - nums[i];\n    if (map.has(complement)) {\n      return [map.get(complement), i];\n    }\n    map.set(nums[i], i);\n  }\n  return [];\n}',
      python:
        'def two_sum(nums, target):\n    # Write your O(n) solution here\n    seen = {}\n    for i, num in enumerate(nums):\n        comp = target - num\n        if comp in seen:\n            return [seen[comp], i]\n        seen[num] = i\n    return []',
    },
    testCases: [
      { id: 'tc-1', input: 'nums = [2,7,11,15], target = 9', expectedOutput: '[0, 1]' },
      { id: 'tc-2', input: 'nums = [3,2,4], target = 6', expectedOutput: '[1, 2]' },
      { id: 'tc-3', input: 'nums = [3,3], target = 6', expectedOutput: '[0, 1]' },
      { id: 'tc-4', input: 'nums = [1,5,9,14], target = 15', expectedOutput: '[1, 3]', isHidden: true },
      { id: 'tc-5', input: 'nums = [-3,4,3,90], target = 0', expectedOutput: '[0, 2]', isHidden: true },
    ],
  },
  {
    id: 'duel-p-02',
    title: 'Valid Parentheses',
    slug: 'valid-parentheses',
    difficulty: 'EASY',
    category: 'Stack / String',
    description:
      'Given a string s containing just the characters "(", ")", "{", "}", "[" and "]", determine if the input string is valid.\n\nOpen brackets must be closed by the same type of brackets in the correct order.',
    constraints: '1 <= s.length <= 10^4\ns consists of parentheses only ()[]{}',
    starterCode: {
      javascript:
        'function isValid(s) {\n  const stack = [];\n  const pairs = { ")": "(", "}": "{", "]": "[" };\n  for (const ch of s) {\n    if (ch === "(" || ch === "{" || ch === "[") {\n      stack.push(ch);\n    } else {\n      if (stack.pop() !== pairs[ch]) return false;\n    }\n  }\n  return stack.length === 0;\n}',
      python:
        'def is_valid(s):\n    stack = []\n    pairs = {")": "(", "}": "{", "]": "["}\n    for ch in s:\n        if ch in pairs.values():\n            stack.append(ch)\n        elif ch in pairs:\n            if not stack or stack.pop() != pairs[ch]:\n                return False\n    return len(stack) == 0',
    },
    testCases: [
      { id: 'tc-1', input: 's = "()"', expectedOutput: 'true' },
      { id: 'tc-2', input: 's = "()[]{}"', expectedOutput: 'true' },
      { id: 'tc-3', input: 's = "(]"', expectedOutput: 'false' },
      { id: 'tc-4', input: 's = "([)]"', expectedOutput: 'false', isHidden: true },
      { id: 'tc-5', input: 's = "{[]}"', expectedOutput: 'true', isHidden: true },
    ],
  },
  {
    id: 'duel-p-03',
    title: 'Maximum Subarray (Kadane)',
    slug: 'maximum-subarray',
    difficulty: 'MEDIUM',
    category: 'Dynamic Programming',
    description:
      'Given an integer array nums, find the subarray with the largest sum, and return its sum.',
    constraints: '1 <= nums.length <= 10^5\n-10^4 <= nums[i] <= 10^4',
    starterCode: {
      javascript:
        'function maxSubArray(nums) {\n  let maxSoFar = nums[0];\n  let currMax = nums[0];\n  for (let i = 1; i < nums.length; i++) {\n    currMax = Math.max(nums[i], currMax + nums[i]);\n    maxSoFar = Math.max(maxSoFar, currMax);\n  }\n  return maxSoFar;\n}',
      python:
        'def max_sub_array(nums):\n    max_so_far = curr_max = nums[0]\n    for x in nums[1:]:\n        curr_max = max(x, curr_max + x)\n        max_so_far = max(max_so_far, curr_max)\n    return max_so_far',
    },
    testCases: [
      { id: 'tc-1', input: 'nums = [-2,1,-3,4,-1,2,1,-5,4]', expectedOutput: '6' },
      { id: 'tc-2', input: 'nums = [1]', expectedOutput: '1' },
      { id: 'tc-3', input: 'nums = [5,4,-1,7,8]', expectedOutput: '23' },
      { id: 'tc-4', input: 'nums = [-1, -2, -3]', expectedOutput: '-1', isHidden: true },
      { id: 'tc-5', input: 'nums = [100, -50, 100]', expectedOutput: '150', isHidden: true },
    ],
  },
]

// AI Ghost Profiles
export const AI_GHOST_PROFILES = [
  { username: 'AdaLovelace_AI', elo: 1250, avatar: '👩‍💻', solveDelaySec: 45 },
  { username: 'AlanTuring_Ghost', elo: 1540, avatar: '🤖', solveDelaySec: 40 },
  { username: 'GraceHopper_Bot', elo: 1780, avatar: '⚡', solveDelaySec: 35 },
  { username: 'EdsgerDijkstra_AI', elo: 2050, avatar: '🧙‍♂️', solveDelaySec: 30 },
  { username: 'DonaldKnuth_Grandmaster', elo: 2380, avatar: '👑', solveDelaySec: 25 },
]

export class DuelEngine {
  private static userProfiles = new Map<string, DuelPlayer>()
  private static activeMatches = new Map<string, DuelMatch>()
  private static userToActiveMatch = new Map<string, string>()
  private static matchmakingQueue: QueueEntry[] = []

  // ── Elo Mathematical Formulations ──────────────────────────────
  public static calculateExpectedScore(ratingA: number, ratingB: number): number {
    return 1 / (1 + Math.pow(10, (ratingB - ratingA) / 400))
  }

  public static determineKFactor(rating: number, matchesPlayed: number): number {
    if (matchesPlayed < 10) return 40 // Placement stage
    if (rating >= 2100) return 16 // High tier stability
    return 24 // Standard
  }

  public static calculateEloAdjustment(
    playerRating: number,
    opponentRating: number,
    score: 1 | 0.5 | 0,
    matchesPlayed: number,
    streak = 0,
    isSpeedVictory = false
  ): { newRating: number; delta: number } {
    const expected = this.calculateExpectedScore(playerRating, opponentRating)
    const k = this.determineKFactor(playerRating, matchesPlayed)

    let baseDelta = k * (score - expected)

    // Win streak multiplier: >=3 wins awards 20% bonus
    if (score === 1 && streak >= 3) {
      baseDelta *= 1.2
    }

    // Speed bonus for solving in < 50% of allotted time
    if (score === 1 && isSpeedVictory) {
      baseDelta += 5
    }

    const roundedDelta = Math.round(baseDelta)
    const newRating = Math.max(100, playerRating + roundedDelta)

    return {
      newRating,
      delta: roundedDelta,
    }
  }

  public static getTier(elo: number): RankTier {
    if (elo < 800) return 'UNRANKED'
    if (elo < 1200) return 'BRONZE'
    if (elo < 1500) return 'SILVER'
    if (elo < 1800) return 'GOLD'
    if (elo < 2100) return 'PLATINUM'
    if (elo < 2400) return 'DIAMOND'
    return 'GRANDMASTER'
  }

  // ── Profile Management ──────────────────────────────────────────
  public static getOrCreateProfile(userId: string, username = 'Duelist'): DuelPlayer {
    let profile = this.userProfiles.get(userId)
    if (!profile) {
      profile = {
        userId,
        username,
        elo: 1200,
        tier: 'SILVER',
        wins: 0,
        losses: 0,
        streak: 0,
        peakElo: 1200,
      }
      this.userProfiles.set(userId, profile)
    }
    return profile
  }

  // ── Matchmaking Queue ───────────────────────────────────────────
  public static enqueueUser(
    userId: string,
    username: string,
    category = 'ANY'
  ): { match: DuelMatch | null; queued: boolean; queuePosition?: number } {
    // Check if user is already in active match
    const existingMatchId = this.userToActiveMatch.get(userId)
    if (existingMatchId) {
      const match = this.activeMatches.get(existingMatchId)
      if (match && match.status !== 'FINISHED') {
        return { match, queued: false }
      }
    }

    // Remove if already in queue
    this.matchmakingQueue = this.matchmakingQueue.filter(q => q.userId !== userId)

    const profile = this.getOrCreateProfile(userId, username)
    const now = Date.now()

    // Matchmaking bracket search: Find opponent within +/- 200 Elo
    const opponentIndex = this.matchmakingQueue.findIndex(
      q => q.userId !== userId && Math.abs(q.elo - profile.elo) <= 250
    )

    if (opponentIndex !== -1) {
      const opponentEntry = this.matchmakingQueue.splice(opponentIndex, 1)[0]
      const opponentProfile = this.getOrCreateProfile(
        opponentEntry.userId,
        opponentEntry.username
      )

      // Create Live Peer Match: Waiting player is player1, incoming is player2
      const match = this.createMatch(opponentProfile, profile)
      return { match, queued: false }
    }

    // If no human match found and user explicitly queued, add to queue
    this.matchmakingQueue.push({
      userId,
      username,
      elo: profile.elo,
      category,
      queuedAt: now,
    })

    return {
      match: null,
      queued: true,
      queuePosition: this.matchmakingQueue.length,
    }
  }

  public static leaveQueue(userId: string): boolean {
    const prevLen = this.matchmakingQueue.length
    this.matchmakingQueue = this.matchmakingQueue.filter(q => q.userId !== userId)
    return this.matchmakingQueue.length < prevLen
  }

  // Force spawn instant Ghost AI Match for instant play without waiting
  public static spawnGhostMatch(userId: string, username = 'Duelist'): DuelMatch {
    const profile = this.getOrCreateProfile(userId, username)
    // Find closest ghost bot by Elo
    const ghost = [...AI_GHOST_PROFILES].sort(
      (a, b) => Math.abs(a.elo - profile.elo) - Math.abs(b.elo - profile.elo)
    )[0]

    const ghostProfile: DuelPlayer = {
      userId: `ghost-${ghost.username.toLowerCase()}`,
      username: ghost.username,
      avatar: ghost.avatar,
      elo: ghost.elo,
      tier: this.getTier(ghost.elo),
      wins: 42,
      losses: 18,
      streak: 3,
      peakElo: ghost.elo + 50,
    }

    return this.createMatch(profile, ghostProfile, true)
  }

  // ── Match Lifecycle ─────────────────────────────────────────────
  private static createMatch(
    player1Profile: DuelPlayer,
    player2Profile: DuelPlayer,
    isGhostMatch = false
  ): DuelMatch {
    const matchId = `duel-match-${crypto.randomBytes(6).toString('hex')}`
    const problem =
      ARENA_DUEL_PROBLEMS[Math.floor(Math.random() * ARENA_DUEL_PROBLEMS.length)]

    const match: DuelMatch = {
      id: matchId,
      status: 'IN_PROGRESS',
      problem,
      player1: {
        userId: player1Profile.userId,
        username: player1Profile.username,
        avatar: player1Profile.avatar,
        elo: player1Profile.elo,
        tier: player1Profile.tier,
        isGhost: false,
        testsPassed: 0,
        totalTests: problem.testCases.length,
        status: 'DRAFTING',
        keystrokes: 0,
      },
      player2: {
        userId: player2Profile.userId,
        username: player2Profile.username,
        avatar: player2Profile.avatar,
        elo: player2Profile.elo,
        tier: player2Profile.tier,
        isGhost: isGhostMatch,
        testsPassed: 0,
        totalTests: problem.testCases.length,
        status: 'DRAFTING',
        keystrokes: 0,
      },
      winnerId: null,
      startedAt: Date.now(),
      durationSeconds: 600, // 10 minutes
    }

    this.activeMatches.set(matchId, match)
    this.userToActiveMatch.set(player1Profile.userId, matchId)
    if (!isGhostMatch) {
      this.userToActiveMatch.set(player2Profile.userId, matchId)
    }

    logger.info('Created duel arena match', { matchId, p1: player1Profile.userId, p2: player2Profile.userId })
    return match
  }

  public static getMatch(matchId: string): DuelMatch | null {
    return this.activeMatches.get(matchId) || null
  }

  public static getActiveMatchForUser(userId: string): DuelMatch | null {
    const matchId = this.userToActiveMatch.get(userId)
    if (!matchId) return null
    return this.getMatch(matchId)
  }

  public static updateProgress(
    matchId: string,
    userId: string,
    testsPassed: number,
    keystrokes?: number
  ): DuelMatch | null {
    const match = this.activeMatches.get(matchId)
    if (!match || match.status === 'FINISHED') return null

    const playerState =
      match.player1.userId === userId
        ? match.player1
        : match.player2.userId === userId
          ? match.player2
          : null

    if (!playerState) return null

    playerState.testsPassed = Math.min(playerState.totalTests, Math.max(0, testsPassed))
    if (typeof keystrokes === 'number') {
      playerState.keystrokes = keystrokes
    }
    playerState.status = playerState.testsPassed > 0 ? 'RUNNING' : 'DRAFTING'

    return match
  }

  public static submitMatchSolution(
    matchId: string,
    userId: string,
    code: string,
    passedAllTests: boolean
  ): { match: DuelMatch; isWinner: boolean; eloDelta: number } | null {
    const match = this.activeMatches.get(matchId)
    if (!match || match.status === 'FINISHED') return null

    const isP1 = match.player1.userId === userId
    const isP2 = match.player2.userId === userId
    if (!isP1 && !isP2) return null

    const playerState = isP1 ? match.player1 : match.player2
    const opponentState = isP1 ? match.player2 : match.player1

    playerState.submittedCode = code
    playerState.submittedAt = Date.now()

    if (passedAllTests) {
      playerState.testsPassed = playerState.totalTests
      playerState.status = 'SUBMITTED'
      match.status = 'FINISHED'
      match.winnerId = userId
      match.endReason = 'SOLVED'

      // Calculate Elo changes
      const p1Profile = this.getOrCreateProfile(match.player1.userId, match.player1.username)
      const p2Profile = this.getOrCreateProfile(match.player2.userId, match.player2.username)

      const elapsedSec = (Date.now() - match.startedAt) / 1000
      const isSpeed = elapsedSec < match.durationSeconds / 2

      const p1Score = isP1 ? 1 : 0
      const p2Score = isP2 ? 1 : 0

      const p1Adj = this.calculateEloAdjustment(
        p1Profile.elo,
        p2Profile.elo,
        p1Score,
        p1Profile.wins + p1Profile.losses,
        p1Profile.streak,
        isSpeed && isP1
      )

      const p2Adj = this.calculateEloAdjustment(
        p2Profile.elo,
        p1Profile.elo,
        p2Score,
        p2Profile.wins + p2Profile.losses,
        p2Profile.streak,
        isSpeed && isP2
      )

      // Apply updates to profiles
      p1Profile.elo = p1Adj.newRating
      p1Profile.peakElo = Math.max(p1Profile.peakElo, p1Profile.elo)
      p1Profile.tier = this.getTier(p1Profile.elo)
      if (isP1) {
        p1Profile.wins += 1
        p1Profile.streak += 1
      } else {
        p1Profile.losses += 1
        p1Profile.streak = 0
      }

      if (!match.player2.isGhost) {
        p2Profile.elo = p2Adj.newRating
        p2Profile.peakElo = Math.max(p2Profile.peakElo, p2Profile.elo)
        p2Profile.tier = this.getTier(p2Profile.elo)
        if (isP2) {
          p2Profile.wins += 1
          p2Profile.streak += 1
        } else {
          p2Profile.losses += 1
          p2Profile.streak = 0
        }
      }

      match.eloDeltaPlayer1 = p1Adj.delta
      match.eloDeltaPlayer2 = p2Adj.delta

      // Clear user active match map
      this.userToActiveMatch.delete(match.player1.userId)
      this.userToActiveMatch.delete(match.player2.userId)

      return {
        match,
        isWinner: true,
        eloDelta: isP1 ? p1Adj.delta : p2Adj.delta,
      }
    }

    return {
      match,
      isWinner: false,
      eloDelta: 0,
    }
  }

  // ── Leaderboard ────────────────────────────────────────────────
  public static getLeaderboard(): DuelPlayer[] {
    const list = Array.from(this.userProfiles.values())
    // Add default elite masters for competitive presence
    const seededProfiles: DuelPlayer[] = [
      { userId: 'seed-1', username: 'AlgorithmAce', elo: 2420, tier: 'GRANDMASTER', wins: 88, losses: 12, streak: 8, peakElo: 2450 },
      { userId: 'seed-2', username: 'ByteMaster_99', elo: 2210, tier: 'DIAMOND', wins: 64, losses: 19, streak: 4, peakElo: 2280 },
      { userId: 'seed-3', username: 'BinaryWizard', elo: 2040, tier: 'PLATINUM', wins: 51, losses: 23, streak: 2, peakElo: 2090 },
      { userId: 'seed-4', username: 'GraphTraverser', elo: 1870, tier: 'PLATINUM', wins: 40, losses: 20, streak: 1, peakElo: 1920 },
      { userId: 'seed-5', username: 'DynamicDev', elo: 1720, tier: 'GOLD', wins: 33, losses: 21, streak: 3, peakElo: 1750 },
    ]

    const merged = [...list, ...seededProfiles]
    return merged.sort((a, b) => b.elo - a.elo).slice(0, 50)
  }
}
