import { describe, it, expect, vi, beforeEach } from 'vitest'
import { renderHook, act } from '@testing-library/react'
import { useProctoring, calculateClientIntegrityScore } from './useProctoring'

describe('useProctoring Hook', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('initializes with clean integrity score and empty violations', () => {
    const { result } = renderHook(() => useProctoring({ isActive: true }))
    expect(result.current.violations).toEqual([])
    expect(result.current.violationCount).toBe(0)
    expect(result.current.integrityScore).toBe(100)
    expect(result.current.riskLevel).toBe('EXCELLENT')
    expect(result.current.isWarningVisible).toBe(false)
  })

  it('records window blur event when active', () => {
    const onViolation = vi.fn()
    const { result } = renderHook(() =>
      useProctoring({ isActive: true, onViolation })
    )

    act(() => {
      window.dispatchEvent(new Event('blur'))
    })

    expect(result.current.violationCount).toBe(1)
    expect(result.current.lastViolation?.type).toBe('WINDOW_BLUR')
    expect(result.current.isWarningVisible).toBe(true)
    expect(result.current.integrityScore).toBe(95)
    expect(onViolation).toHaveBeenCalledWith(
      expect.objectContaining({ type: 'WINDOW_BLUR' })
    )
  })

  it('records DevTools key shortcut and flags HIGH_RISK', () => {
    const { result } = renderHook(() => useProctoring({ isActive: true }))

    act(() => {
      const f12Event = new KeyboardEvent('keydown', { key: 'F12', bubbles: true })
      window.dispatchEvent(f12Event)
    })

    expect(result.current.violationCount).toBe(1)
    expect(result.current.lastViolation?.type).toBe('DEV_TOOLS')
    expect(result.current.integrityScore).toBe(65)
    expect(result.current.riskLevel).toBe('HIGH_RISK')
  })

  it('ignores events when isActive is false', () => {
    const { result } = renderHook(() => useProctoring({ isActive: false }))

    act(() => {
      window.dispatchEvent(new Event('blur'))
    })

    expect(result.current.violationCount).toBe(0)
    expect(result.current.integrityScore).toBe(100)
  })

  it('allows dismissing warning and resetting violations', () => {
    const { result } = renderHook(() => useProctoring({ isActive: true }))

    act(() => {
      window.dispatchEvent(new Event('blur'))
    })
    expect(result.current.isWarningVisible).toBe(true)

    act(() => {
      result.current.dismissWarning()
    })
    expect(result.current.isWarningVisible).toBe(false)
    expect(result.current.violationCount).toBe(1)

    act(() => {
      result.current.resetViolations()
    })
    expect(result.current.violationCount).toBe(0)
    expect(result.current.integrityScore).toBe(100)
  })

  describe('calculateClientIntegrityScore', () => {
    it('calculates score with category caps correctly', () => {
      // 5 tab switches = 50 raw deduction, but capped at 40
      const violations = [
        { type: 'TAB_SWITCH' as const, timestamp: 1 },
        { type: 'TAB_SWITCH' as const, timestamp: 2 },
        { type: 'TAB_SWITCH' as const, timestamp: 3 },
        { type: 'TAB_SWITCH' as const, timestamp: 4 },
        { type: 'TAB_SWITCH' as const, timestamp: 5 },
      ]
      const profile = calculateClientIntegrityScore(violations)
      expect(profile.score).toBe(60)
      expect(profile.riskLevel).toBe('MODERATE_RISK')
      expect(profile.counts['TAB_SWITCH']).toBe(5)
    })
  })
})
