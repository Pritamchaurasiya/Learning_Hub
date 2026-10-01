import {
  createSeededRng,
  deterministicShuffle,
  mapQuestionSafe,
  getRemainingSeconds,
  normalizeEnumFilter,
  hasSubmittedAnswer,
  TEST_MODES,
  TEST_DIFFICULTIES,
} from '../../src/utils/testsHelper'

describe('testsHelper unit tests', () => {
  describe('createSeededRng', () => {
    it('produces deterministic sequence for the same seed', () => {
      const rng1 = createSeededRng('attempt-12345')
      const rng2 = createSeededRng('attempt-12345')

      const seq1 = Array.from({ length: 10 }, () => rng1())
      const seq2 = Array.from({ length: 10 }, () => rng2())

      expect(seq1).toEqual(seq2)
      seq1.forEach(val => {
        expect(val).toBeGreaterThanOrEqual(0)
        expect(val).toBeLessThan(1)
      })
    })

    it('produces different sequences for different seeds', () => {
      const rngA = createSeededRng('attempt-user-a')
      const rngB = createSeededRng('attempt-user-b')

      const valA = rngA()
      const valB = rngB()

      expect(valA).not.toEqual(valB)
    })
  })

  describe('deterministicShuffle', () => {
    it('handles empty or single-element arrays', () => {
      expect(deterministicShuffle([], 'seed')).toEqual([])
      expect(deterministicShuffle(['solo'], 'seed')).toEqual(['solo'])
    })

    it('deterministically shuffles an array with identical results on replay', () => {
      const original = ['Q1', 'Q2', 'Q3', 'Q4', 'Q5', 'Q6', 'Q7', 'Q8']
      const seed = 'attempt-abc-789'

      const shuffle1 = deterministicShuffle(original, seed)
      const shuffle2 = deterministicShuffle(original, seed)

      // Identical on reload/resume
      expect(shuffle1).toEqual(shuffle2)

      // Retains all elements (permutation)
      expect(shuffle1).toHaveLength(original.length)
      expect([...shuffle1].sort()).toEqual([...original].sort())

      // Does not mutate the original array
      expect(original).toEqual(['Q1', 'Q2', 'Q3', 'Q4', 'Q5', 'Q6', 'Q7', 'Q8'])
    })

    it('produces different orderings for different seeds', () => {
      const original = ['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H']
      const shuffleA = deterministicShuffle(original, 'candidate-attempt-1')
      const shuffleB = deterministicShuffle(original, 'candidate-attempt-2')

      // Very high probability they are not identical
      expect(shuffleA).not.toEqual(shuffleB)
    })
  })

  describe('mapQuestionSafe', () => {
    const sampleQuestion = {
      id: 'q-99',
      text: 'What is O(log n)?',
      type: 'MCQ',
      difficulty: 0.6,
      bloomLevel: 'ANALYZE',
      points: 4,
      order: 1,
      options: [
        { id: 'opt-1', text: 'Linear', order: 1 },
        { id: 'opt-2', text: 'Logarithmic', order: 2 },
        { id: 'opt-3', text: 'Constant', order: 3 },
        { id: 'opt-4', text: 'Quadratic', order: 4 },
      ],
    }

    it('preserves option order when shuffleOptions is false', () => {
      const safe = mapQuestionSafe(sampleQuestion, 'attempt-seed', false)
      expect(safe.options.map(o => o.id)).toEqual(['opt-1', 'opt-2', 'opt-3', 'opt-4'])
    })

    it('preserves option order when attemptSeed is not provided', () => {
      const safe = mapQuestionSafe(sampleQuestion, undefined, true)
      expect(safe.options.map(o => o.id)).toEqual(['opt-1', 'opt-2', 'opt-3', 'opt-4'])
    })

    it('deterministically shuffles options when shuffleOptions is true and seed provided', () => {
      const safe1 = mapQuestionSafe(sampleQuestion, 'attempt-user-xyz', true)
      const safe2 = mapQuestionSafe(sampleQuestion, 'attempt-user-xyz', true)

      // Identical across reloads
      expect(safe1.options.map(o => o.id)).toEqual(safe2.options.map(o => o.id))
      expect(safe1.options).toHaveLength(4)

      // Ensure options still contain all items
      const ids = safe1.options.map(o => o.id).sort()
      expect(ids).toEqual(['opt-1', 'opt-2', 'opt-3', 'opt-4'])
    })
  })

  describe('getRemainingSeconds', () => {
    it('calculates remaining seconds accurately', () => {
      const fiveMinutesAgo = new Date(Date.now() - 5 * 60 * 1000)
      const remaining = getRemainingSeconds(fiveMinutesAgo, 30)
      // Expect around 25 minutes = 1500 seconds (allow ±2s tolerance)
      expect(remaining).toBeGreaterThanOrEqual(1495)
      expect(remaining).toBeLessThanOrEqual(1505)
    })

    it('returns 0 when exam duration has expired', () => {
      const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000)
      const remaining = getRemainingSeconds(oneHourAgo, 30)
      expect(remaining).toBe(0)
    })

    it('returns total duration if startedAt is invalid', () => {
      expect(getRemainingSeconds(null, 20)).toBe(1200)
      expect(getRemainingSeconds('invalid-date', 20)).toBe(1200)
    })
  })

  describe('normalizeEnumFilter and hasSubmittedAnswer', () => {
    it('normalizes valid enum filters', () => {
      expect(normalizeEnumFilter('practice', TEST_MODES)).toBe('PRACTICE')
      expect(normalizeEnumFilter('EASY', TEST_DIFFICULTIES)).toBe('EASY')
      expect(normalizeEnumFilter('invalid', TEST_MODES)).toBeUndefined()
      expect(normalizeEnumFilter('', TEST_MODES)).toBeUndefined()
    })

    it('accurately identifies whether an answer is submitted', () => {
      expect(hasSubmittedAnswer('opt-1')).toBe(true)
      expect(hasSubmittedAnswer(['opt-1', 'opt-2'])).toBe(true)
      expect(hasSubmittedAnswer([])).toBe(false)
      expect(hasSubmittedAnswer('')).toBe(false)
      expect(hasSubmittedAnswer('   ')).toBe(false)
      expect(hasSubmittedAnswer(null)).toBe(false)
      expect(hasSubmittedAnswer(undefined)).toBe(false)
      expect(hasSubmittedAnswer(0)).toBe(true)
    })
  })
})
