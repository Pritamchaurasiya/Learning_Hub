/**
 * Tests for the Test Attempt State Machine
 *
 * Verifies that:
 *  - All valid transitions succeed
 *  - All invalid transitions throw AttemptTransitionError
 *  - Terminal status detection works
 *  - Idempotent (same→same) transitions are allowed
 */

import {
  assertValidTransition,
  isValidTransition,
  isTerminalStatus,
  getValidTargetStatuses,
  AttemptTransitionError,
} from '../../src/utils/attemptStateMachine'

describe('AttemptStateMachine', () => {
  describe('assertValidTransition', () => {
    it('allows IN_PROGRESS → COMPLETED', () => {
      expect(() => assertValidTransition('attempt-1', 'IN_PROGRESS', 'COMPLETED')).not.toThrow()
    })

    it('allows IN_PROGRESS → TIMEOUT', () => {
      expect(() => assertValidTransition('attempt-2', 'IN_PROGRESS', 'TIMEOUT')).not.toThrow()
    })

    it('allows IN_PROGRESS → ABANDONED', () => {
      expect(() => assertValidTransition('attempt-3', 'IN_PROGRESS', 'ABANDONED')).not.toThrow()
    })

    it('allows idempotent transition (same status)', () => {
      expect(() => assertValidTransition('attempt-4', 'COMPLETED', 'COMPLETED')).not.toThrow()
      expect(() => assertValidTransition('attempt-5', 'IN_PROGRESS', 'IN_PROGRESS')).not.toThrow()
    })

    it('throws AttemptTransitionError for COMPLETED → IN_PROGRESS', () => {
      expect(() => assertValidTransition('attempt-6', 'COMPLETED', 'IN_PROGRESS')).toThrow(
        AttemptTransitionError
      )
    })

    it('throws AttemptTransitionError for TIMEOUT → COMPLETED', () => {
      expect(() => assertValidTransition('attempt-7', 'TIMEOUT', 'COMPLETED')).toThrow(
        AttemptTransitionError
      )
    })

    it('throws AttemptTransitionError for ABANDONED → COMPLETED', () => {
      expect(() => assertValidTransition('attempt-8', 'ABANDONED', 'COMPLETED')).toThrow(
        AttemptTransitionError
      )
    })

    it('throws AttemptTransitionError for COMPLETED → ABANDONED', () => {
      expect(() => assertValidTransition('attempt-9', 'COMPLETED', 'ABANDONED')).toThrow(
        AttemptTransitionError
      )
    })

    it('error contains attemptId, from, and to', () => {
      try {
        assertValidTransition('attempt-error', 'TIMEOUT', 'IN_PROGRESS')
        fail('Should have thrown')
      } catch (e) {
        expect(e).toBeInstanceOf(AttemptTransitionError)
        const err = e as AttemptTransitionError
        expect(err.attemptId).toBe('attempt-error')
        expect(err.from).toBe('TIMEOUT')
        expect(err.to).toBe('IN_PROGRESS')
        expect(err.message).toContain('Timed Out')
        expect(err.message).toContain('In Progress')
      }
    })
  })

  describe('isValidTransition', () => {
    it('returns true for valid transitions', () => {
      expect(isValidTransition('IN_PROGRESS', 'COMPLETED')).toBe(true)
      expect(isValidTransition('IN_PROGRESS', 'TIMEOUT')).toBe(true)
      expect(isValidTransition('IN_PROGRESS', 'ABANDONED')).toBe(true)
    })

    it('returns true for idempotent transitions', () => {
      expect(isValidTransition('COMPLETED', 'COMPLETED')).toBe(true)
      expect(isValidTransition('IN_PROGRESS', 'IN_PROGRESS')).toBe(true)
    })

    it('returns false for invalid transitions', () => {
      expect(isValidTransition('COMPLETED', 'IN_PROGRESS')).toBe(false)
      expect(isValidTransition('TIMEOUT', 'COMPLETED')).toBe(false)
      expect(isValidTransition('ABANDONED', 'IN_PROGRESS')).toBe(false)
      expect(isValidTransition('COMPLETED', 'TIMEOUT')).toBe(false)
    })
  })

  describe('isTerminalStatus', () => {
    it('returns false for IN_PROGRESS', () => {
      expect(isTerminalStatus('IN_PROGRESS')).toBe(false)
    })

    it('returns true for COMPLETED', () => {
      expect(isTerminalStatus('COMPLETED')).toBe(true)
    })

    it('returns true for TIMEOUT', () => {
      expect(isTerminalStatus('TIMEOUT')).toBe(true)
    })

    it('returns true for ABANDONED', () => {
      expect(isTerminalStatus('ABANDONED')).toBe(true)
    })
  })

  describe('getValidTargetStatuses', () => {
    it('returns all valid targets for IN_PROGRESS', () => {
      const targets = getValidTargetStatuses('IN_PROGRESS')
      expect(targets).toContain('COMPLETED')
      expect(targets).toContain('TIMEOUT')
      expect(targets).toContain('ABANDONED')
      expect(targets).toHaveLength(3)
    })

    it('returns empty array for terminal statuses', () => {
      expect(getValidTargetStatuses('COMPLETED')).toEqual([])
      expect(getValidTargetStatuses('TIMEOUT')).toEqual([])
      expect(getValidTargetStatuses('ABANDONED')).toEqual([])
    })
  })
})
