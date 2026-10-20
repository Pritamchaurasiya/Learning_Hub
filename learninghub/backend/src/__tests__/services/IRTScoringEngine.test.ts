import { IRTScoringEngine } from '../../services/IRTScoringEngine'

describe('IRTScoringEngine (Item Response Theory & Psychometric Calibration)', () => {
  const sampleParams = [
    { a: 1.2, b: -1.0, c: 0.2 },
    { a: 1.5, b: 0.0, c: 0.25 },
    { a: 1.8, b: 1.0, c: 0.2 },
  ]

  it('handles empty responses or parameters safely', () => {
    expect(IRTScoringEngine.estimateAbility([], [])).toBe(50)
    expect(IRTScoringEngine.estimateAbility([], sampleParams)).toBe(50)
    expect(IRTScoringEngine.estimateAbility([1, 1], [])).toBe(50)
  })

  it('defends against mismatched array bounds without throwing TypeError', () => {
    // 5 responses but only 3 parameters
    const responses = [1, 0, 1, 1, 0]
    expect(() => {
      const score = IRTScoringEngine.estimateAbility(responses, sampleParams)
      expect(typeof score).toBe('number')
      expect(score).toBeGreaterThan(0)
    }).not.toThrow()
  })

  it('computes edge cases correctly (all correct / all incorrect)', () => {
    expect(IRTScoringEngine.estimateAbility([1, 1, 1], sampleParams)).toBe(95)
    expect(IRTScoringEngine.estimateAbility([0, 0, 0], sampleParams)).toBe(5)
  })

  it('computes ability on native logit scale and provides standard error', () => {
    const res = IRTScoringEngine.estimateAbilityLogit([1, 1, 0], sampleParams)
    expect(typeof res.theta).toBe('number')
    expect(res.theta).toBeGreaterThan(-3.0)
    expect(res.theta).toBeLessThan(3.0)
    expect(res.sem).toBeGreaterThan(0)
    expect(res.sem).toBeLessThan(2.0)
  })
})
