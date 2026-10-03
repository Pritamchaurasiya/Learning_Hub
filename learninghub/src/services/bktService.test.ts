import { describe, it, expect } from 'vitest'
import { bktService, DEFAULT_BKT_PARAMS, BKT_MASTERY_THRESHOLD } from './bktService'

describe('bktService', () => {
  it('increases concept mastery belief upon correct response', () => {
    const priorP = 0.2
    const result = bktService.updateMastery(priorP, true)

    expect(result.posteriorKnown).toBeGreaterThan(priorP)
    expect(result.projectedMastery).toBeGreaterThan(result.posteriorKnown)
    expect(result.isMastered).toBe(result.projectedMastery >= BKT_MASTERY_THRESHOLD)
  })

  it('decreases concept mastery belief upon incorrect response', () => {
    const priorP = 0.7
    const result = bktService.updateMastery(priorP, false)

    expect(result.posteriorKnown).toBeLessThan(priorP)
  })

  it('progresses to mastered status across consecutive successful practice trials', () => {
    let p = DEFAULT_BKT_PARAMS.pL0
    let masteryReached = false

    for (let trial = 0; trial < 10; trial++) {
      const update = bktService.updateMastery(p, true)
      p = update.projectedMastery
      if (update.isMastered) {
        masteryReached = true
        break
      }
    }

    expect(masteryReached).toBe(true)
    expect(p).toBeGreaterThanOrEqual(BKT_MASTERY_THRESHOLD)
  })

  it('computes composite exam readiness score correctly across category thresholds', () => {
    // Elite student: 90, 85, 90, 95
    // 0.35*90 (31.5) + 0.30*85 (25.5) + 0.20*90 (18) + 0.15*95 (14.25) = 89.25 => 89
    const eliteResult = bktService.calculateExamReadiness(90, 85, 90, 95)
    expect(eliteResult.compositeScore).toBe(89)
    expect(eliteResult.readinessLevel).toBe('ELITE')
    expect(eliteResult.strengths.length).toBeGreaterThanOrEqual(3)

    // Developing student: 50, 40, 60, 50
    // 0.35*50 (17.5) + 0.30*40 (12) + 0.20*60 (12) + 0.15*50 (7.5) = 49
    const devResult = bktService.calculateExamReadiness(50, 40, 60, 50)
    expect(devResult.compositeScore).toBe(49)
    expect(devResult.readinessLevel).toBe('NEEDS_REINFORCEMENT')
    expect(devResult.weaknesses.length).toBeGreaterThan(0)
  })

  it('clamps extreme inputs to valid probability bounds [0.001, 0.999]', () => {
    const overflowUpdate = bktService.updateMastery(1.5, true)
    expect(overflowUpdate.projectedMastery).toBeLessThanOrEqual(0.999)

    const underflowUpdate = bktService.updateMastery(-0.5, false)
    expect(underflowUpdate.projectedMastery).toBeGreaterThanOrEqual(0.001)
  })
})
