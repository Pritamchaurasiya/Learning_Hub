import { hashToken, isAlreadyHashed } from '../../src/utils/auth'

describe('auth utilities', () => {
  describe('hashToken', () => {
    it('produces a 64-character hex string', () => {
      const hash = hashToken('test-token')
      expect(hash).toHaveLength(64)
      expect(/^[0-9a-f]+$/.test(hash)).toBe(true)
    })

    it('produces consistent output for same input', () => {
      const hash1 = hashToken('consistent-token')
      const hash2 = hashToken('consistent-token')
      expect(hash1).toBe(hash2)
    })

    it('produces different output for different inputs', () => {
      const hash1 = hashToken('token-1')
      const hash2 = hashToken('token-2')
      expect(hash1).not.toBe(hash2)
    })
  })

  describe('isAlreadyHashed', () => {
    it('returns true for valid SHA256 hex strings', () => {
      const validHash = 'a'.repeat(64) // 64 hex characters
      expect(isAlreadyHashed(validHash)).toBe(true)
    })

    it('returns true for actual SHA256 hash output', () => {
      const hash = hashToken('some-token')
      expect(isAlreadyHashed(hash)).toBe(true)
    })

    it('returns false for plaintext tokens', () => {
      expect(isAlreadyHashed('plaintext-token')).toBe(false)
      expect(isAlreadyHashed('abc123')).toBe(false)
    })

    it('returns false for strings with wrong length', () => {
      expect(isAlreadyHashed('a'.repeat(63))).toBe(false)
      expect(isAlreadyHashed('a'.repeat(65))).toBe(false)
    })

    it('returns false for strings with non-hex characters', () => {
      const longString = 'g' + 'a'.repeat(63) // 'g' is not hex
      expect(isAlreadyHashed(longString)).toBe(false)
    })

    it('handles mixed case hex strings', () => {
      const upperHex = 'A'.repeat(64)
      const mixedHex = 'aAbBcC'.repeat(10) + 'aAbBcC'.slice(0, 4) // Exactly 64 chars
      expect(isAlreadyHashed(upperHex)).toBe(true)
      expect(isAlreadyHashed(mixedHex)).toBe(true)
    })
  })
})