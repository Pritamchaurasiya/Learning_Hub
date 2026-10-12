export function formatXP(xp: number): string {
  if (xp >= 1000000) {
    return `${(xp / 1000000).toFixed(1)}M`
  }
  if (xp >= 1000) {
    return `${(xp / 1000).toFixed(1)}K`
  }
  return xp.toString()
}

export function formatPercentage(value: number, total: number, decimals = 0): string {
  if (total === 0) return '0%'
  const percentage = (value / total) * 100
  return `${percentage.toFixed(decimals)}%`
}

export function formatNumber(num: number): string {
  return num.toLocaleString('en-US')
}

export function formatCurrency(amount: number, currency = 'USD'): string {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency,
  }).format(amount)
}

export function clamp(value: number, min: number, max: number): number {
  return Math.min(Math.max(value, min), max)
}

export function lerp(start: number, end: number, t: number): number {
  return start + (end - start) * t
}

export function mapRange(
  value: number,
  inMin: number,
  inMax: number,
  outMin: number,
  outMax: number
): number {
  return ((value - inMin) * (outMax - outMin)) / (inMax - inMin) + outMin
}

export function roundTo(value: number, decimals: number): number {
  const factor = Math.pow(10, decimals)
  return Math.round(value * factor) / factor
}

export interface LevelTierConfig {
  minLevel: number
  title: string
  badgeIcon: string
  color: string
  perks: string[]
}

export const LEVEL_TIERS: LevelTierConfig[] = [
  {
    minLevel: 1,
    title: 'Apprentice Explorer',
    badgeIcon: '🌱',
    color: 'from-emerald-500 to-teal-600',
    perks: ['Standard DSA Practice', 'Live Class Studio & Chat', 'Public Leaderboard Access'],
  },
  {
    minLevel: 2,
    title: 'Code Navigator',
    badgeIcon: '🧭',
    color: 'from-blue-500 to-indigo-600',
    perks: ['Multi-Agent Socratic AI Tutor', 'Collaborative Notes Studio', 'Basic Speed Telemetry'],
  },
  {
    minLevel: 3,
    title: 'Algorithmic Specialist',
    badgeIcon: '⚡',
    color: 'from-amber-500 to-orange-600',
    perks: ['Combat Arena Gladiator Mode', 'Pyodide WASM In-Browser Sandbox', 'Custom Avatar Badges'],
  },
  {
    minLevel: 4,
    title: 'Systems Craftsman',
    badgeIcon: '🛠️',
    color: 'from-purple-500 to-violet-600',
    perks: ['Distributed Chaos Engineering Lab', 'Live Audio/Video Pair Coding', '2x Daily Streak Multiplier'],
  },
  {
    minLevel: 5,
    title: 'Architecture Maestro',
    badgeIcon: '🏛️',
    color: 'from-fuchsia-500 to-pink-600',
    perks: ['Autonomous SWE Studio Access', 'W3C Verifiable DID Credentials', 'Priority AI Router Tokens'],
  },
  {
    minLevel: 6,
    title: 'Distinguished Fellow',
    badgeIcon: '🎖️',
    color: 'from-rose-500 to-red-600',
    perks: ['ZK-Attestation Proof Issuance', 'Staff Reviewer AI Council Consultations', 'Exclusive Tournament Invites'],
  },
  {
    minLevel: 7,
    title: 'Grandmaster Polymath',
    badgeIcon: '👑',
    color: 'from-amber-400 via-rose-500 to-purple-600',
    perks: ['All Strategic Platform Capabilities Unlocked', 'Mentor Studio Direct Booking', 'Eternal Hall of Fame Anchor'],
  },
]

/**
 * Canonical quadratic level curve matching backend GrowthEngineService and ProgressionEngine.
 * Formula: level = max(1, floor(sqrt(max(0, xp) / 100)))
 * Level 1: 0 - 399 XP
 * Level 2: 400 - 899 XP
 * Level 3: 900 - 1599 XP
 * Level 4: 1600 - 2499 XP
 * Level 5: 2500 - 3599 XP
 * Level 6: 3600 - 4899 XP
 * Level 7: 4900+ XP
 */
export function calculateLevel(xp: number): number {
  if (!Number.isFinite(xp) || xp <= 0) return 1
  return Math.max(1, Math.floor(Math.sqrt(xp / 100)))
}

/**
 * Returns the minimum total XP required to reach a specific level.
 * Level 1 requires 0 XP. Level L requires 100 * L^2 XP.
 */
export function calculateXpForLevel(level: number): number {
  if (!Number.isFinite(level) || level <= 1) return 0
  return level * level * 100
}

export interface LevelProgressDetails {
  level: number
  title: string
  badgeIcon: string
  color: string
  currentLevelBaseXp: number
  nextLevelThresholdXp: number
  xpInCurrentLevel: number
  xpRequiredForNextLevel: number
  progressPercentage: number
  unlockedPerks: string[]
  nextLevelPerks: string[]
}

/**
 * Computes granular cognitive level progress metrics for a given XP amount.
 */
export function calculateLevelProgress(xp: number): LevelProgressDetails {
  const safeXp = Math.max(0, Number.isFinite(xp) ? xp : 0)
  const level = calculateLevel(safeXp)
  const currentLevelBaseXp = calculateXpForLevel(level)
  const nextLevelThresholdXp = calculateXpForLevel(level + 1)

  const xpInCurrentLevel = Math.max(0, safeXp - currentLevelBaseXp)
  const xpRequiredForNextLevel = Math.max(1, nextLevelThresholdXp - currentLevelBaseXp)

  const progressPercentage = Math.min(
    100,
    Math.max(0, Math.round((xpInCurrentLevel / xpRequiredForNextLevel) * 100))
  )

  const currentTier = [...LEVEL_TIERS].reverse().find(t => level >= t.minLevel) ?? LEVEL_TIERS[0]
  const nextTier = LEVEL_TIERS.find(t => t.minLevel === level + 1) ?? LEVEL_TIERS[LEVEL_TIERS.length - 1]

  return {
    level,
    title: currentTier.title,
    badgeIcon: currentTier.badgeIcon,
    color: currentTier.color,
    currentLevelBaseXp,
    nextLevelThresholdXp,
    xpInCurrentLevel,
    xpRequiredForNextLevel,
    progressPercentage,
    unlockedPerks: currentTier.perks,
    nextLevelPerks: nextTier.perks,
  }
}

export function calculateProgress(xp: number): number {
  return calculateLevelProgress(xp).progressPercentage
}

export function calculateStreakBonus(streak: number): number {
  const bonusMultiplier = Math.min(streak / 10, 1)
  return 1 + bonusMultiplier * 0.5
}
