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

export interface DuelProblemTestCase {
  id: string
  input: string
  expectedOutput: string
  isHidden?: boolean
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
  testCases: DuelProblemTestCase[]
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

export interface DuelEmote {
  senderUserId: string
  emote: string
  timestamp: number
}

export interface TierInfo {
  tier: RankTier
  label: string
  color: string
  bgBadge: string
  minElo: number
  maxElo: number
}
