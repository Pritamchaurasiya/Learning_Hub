import { describe, it, expect } from 'vitest'
import {
  formatXP,
  formatPercentage,
  formatNumber,
  formatCurrency,
  clamp,
  lerp,
  mapRange,
  roundTo,
  calculateLevel,
  calculateXpForLevel,
  calculateLevelProgress,
  calculateProgress,
  calculateStreakBonus,
  LEVEL_TIERS,
} from './number'

describe('number utils & canonical progression engine', () => {
  it('formats XP correctly into readable strings', () => {
    expect(formatXP(500)).toBe('500')
    expect(formatXP(1200)).toBe('1.2K')
    expect(formatXP(3500000)).toBe('3.5M')
  })

  it('formats percentage with decimals', () => {
    expect(formatPercentage(50, 100)).toBe('50%')
    expect(formatPercentage(1, 3, 1)).toBe('33.3%')
    expect(formatPercentage(0, 0)).toBe('0%')
  })

  it('formats numbers with commas', () => {
    expect(formatNumber(10000)).toBe('10,000')
  })

  it('formats currency correctly', () => {
    expect(formatCurrency(49.99)).toBe('$49.99')
  })

  it('clamps and interpolates values properly', () => {
    expect(clamp(150, 0, 100)).toBe(100)
    expect(clamp(-50, 0, 100)).toBe(0)
    expect(clamp(50, 0, 100)).toBe(50)
    expect(lerp(0, 100, 0.5)).toBe(50)
    expect(mapRange(5, 0, 10, 0, 100)).toBe(50)
    expect(roundTo(3.14159, 2)).toBe(3.14)
  })

  describe('canonical quadratic level progression curve', () => {
    it('calculates level correctly matching backend quadratic formula', () => {
      // Level 1: 0 to 399 XP
      expect(calculateLevel(0)).toBe(1)
      expect(calculateLevel(50)).toBe(1)
      expect(calculateLevel(399)).toBe(1)

      // Level 2: 400 to 899 XP (2^2 * 100 = 400)
      expect(calculateLevel(400)).toBe(2)
      expect(calculateLevel(550)).toBe(2)
      expect(calculateLevel(899)).toBe(2)

      // Level 3: 900 to 1599 XP (3^2 * 100 = 900)
      expect(calculateLevel(900)).toBe(3)
      expect(calculateLevel(1599)).toBe(3)

      // Level 4: 1600 to 2499 XP (4^2 * 100 = 1600)
      expect(calculateLevel(1600)).toBe(4)

      // Level 5: 2500+ XP (5^2 * 100 = 2500)
      expect(calculateLevel(2500)).toBe(5)

      // Edge cases: negative, NaN, non-finite
      expect(calculateLevel(-100)).toBe(1)
      expect(calculateLevel(NaN)).toBe(1)
      expect(calculateLevel(Infinity)).toBe(1)
    })

    it('calculates base XP thresholds for levels', () => {
      expect(calculateXpForLevel(0)).toBe(0)
      expect(calculateXpForLevel(1)).toBe(0)
      expect(calculateXpForLevel(2)).toBe(400)
      expect(calculateXpForLevel(3)).toBe(900)
      expect(calculateXpForLevel(4)).toBe(1600)
      expect(calculateXpForLevel(5)).toBe(2500)
    })

    it('calculates level progress details with titles, perks, and percentage', () => {
      const p1 = calculateLevelProgress(200) // Level 1 (0 to 400 XP)
      expect(p1.level).toBe(1)
      expect(p1.title).toBe('Apprentice Explorer')
      expect(p1.currentLevelBaseXp).toBe(0)
      expect(p1.nextLevelThresholdXp).toBe(400)
      expect(p1.xpInCurrentLevel).toBe(200)
      expect(p1.xpRequiredForNextLevel).toBe(400)
      expect(p1.progressPercentage).toBe(50)
      expect(p1.unlockedPerks.length).toBeGreaterThan(0)

      const p2 = calculateLevelProgress(650) // Level 2 (base 400, next 900 -> span 500)
      expect(p2.level).toBe(2)
      expect(p2.title).toBe('Code Navigator')
      expect(p2.currentLevelBaseXp).toBe(400)
      expect(p2.nextLevelThresholdXp).toBe(900)
      expect(p2.xpInCurrentLevel).toBe(250)
      expect(p2.xpRequiredForNextLevel).toBe(500)
      expect(p2.progressPercentage).toBe(50)

      expect(calculateProgress(650)).toBe(50)
    })

    it('calculates streak bonus properly', () => {
      expect(calculateStreakBonus(0)).toBe(1)
      expect(calculateStreakBonus(5)).toBe(1.25)
      expect(calculateStreakBonus(10)).toBe(1.5)
      expect(calculateStreakBonus(20)).toBe(1.5) // capped at 1.5x
    })

    it('contains all 7 progression tier configurations', () => {
      expect(LEVEL_TIERS.length).toBe(7)
      expect(LEVEL_TIERS[0].title).toBe('Apprentice Explorer')
      expect(LEVEL_TIERS[6].title).toBe('Grandmaster Polymath')
    })
  })
})
