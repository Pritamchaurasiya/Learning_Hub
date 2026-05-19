import { describe, it, expect } from 'vitest'
import { cn, formatDate, truncateText, calculatePercentage } from './utils'

describe('Utils', () => {
  describe('cn (className utility)', () => {
    it('merges class names correctly', () => {
      expect(cn('class1', 'class2')).toBe('class1 class2')
    })

    it('handles conditional classes', () => {
      expect(cn('base', false && 'hidden', true && 'visible')).toBe('base visible')
    })

    it('handles undefined and null', () => {
      expect(cn('base', undefined, null, 'end')).toBe('base end')
    })

    it('handles empty strings', () => {
      expect(cn('', 'class', '')).toBe('class')
    })
  })

  describe('formatDate', () => {
    it('formats date string correctly', () => {
      const date = '2024-01-15T10:30:00Z'
      const formatted = formatDate(date)
      expect(formatted).toContain('2024')
    })

    it('handles invalid date gracefully', () => {
      expect(formatDate('invalid')).toBe('Invalid Date')
    })

    it('formats with custom format', () => {
      const date = '2024-01-15T10:30:00Z'
      const formatted = formatDate(date, { month: 'short', day: 'numeric' })
      expect(formatted).toContain('Jan')
    })
  })

  describe('truncateText', () => {
    it('returns original text if within limit', () => {
      expect(truncateText('Hello', 10)).toBe('Hello')
    })

    it('truncates text and adds ellipsis', () => {
      expect(truncateText('Hello World', 5)).toBe('Hello...')
    })

    it('handles empty string', () => {
      expect(truncateText('', 10)).toBe('')
    })

    it('uses custom suffix', () => {
      expect(truncateText('Hello World', 5, '»')).toBe('Hello»')
    })
  })

  describe('calculatePercentage', () => {
    it('calculates percentage correctly', () => {
      expect(calculatePercentage(50, 100)).toBe(50)
    })

    it('handles zero total', () => {
      expect(calculatePercentage(50, 0)).toBe(0)
    })

    it('rounds to specified decimals', () => {
      expect(calculatePercentage(1, 3, 2)).toBe(33.33)
    })

    it('caps at 100', () => {
      expect(calculatePercentage(150, 100)).toBe(100)
    })
  })
})
