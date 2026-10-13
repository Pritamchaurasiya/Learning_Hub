import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { triggerHaptic, cancelHaptic, isHapticSupported } from './haptics'

describe('Haptics Engine', () => {
  const originalVibrate = navigator.vibrate

  beforeEach(() => {
    Object.defineProperty(navigator, 'vibrate', {
      value: vi.fn().mockReturnValue(true),
      configurable: true,
      writable: true,
    })
  })

  afterEach(() => {
    Object.defineProperty(navigator, 'vibrate', {
      value: originalVibrate,
      configurable: true,
      writable: true,
    })
  })

  it('detects when haptics are supported', () => {
    expect(isHapticSupported()).toBe(true)
  })

  it('triggers vibration with appropriate patterns for each type', () => {
    expect(triggerHaptic('selection')).toBe(true)
    expect(navigator.vibrate).toHaveBeenCalledWith(12)

    expect(triggerHaptic('light')).toBe(true)
    expect(navigator.vibrate).toHaveBeenCalledWith(25)

    expect(triggerHaptic('medium')).toBe(true)
    expect(navigator.vibrate).toHaveBeenCalledWith(50)

    expect(triggerHaptic('heavy')).toBe(true)
    expect(navigator.vibrate).toHaveBeenCalledWith(80)

    expect(triggerHaptic('success')).toBe(true)
    expect(navigator.vibrate).toHaveBeenCalledWith([30, 40, 60])

    expect(triggerHaptic('warning')).toBe(true)
    expect(navigator.vibrate).toHaveBeenCalledWith([50, 50, 50])

    expect(triggerHaptic('error')).toBe(true)
    expect(navigator.vibrate).toHaveBeenCalledWith([80, 50, 80, 50, 80])
  })

  it('cancels vibration cleanly', () => {
    expect(cancelHaptic()).toBe(true)
    expect(navigator.vibrate).toHaveBeenCalledWith(0)
  })

  it('gracefully handles environments without vibration support', () => {
    Object.defineProperty(navigator, 'vibrate', {
      value: undefined,
      configurable: true,
      writable: true,
    })

    expect(isHapticSupported()).toBe(false)
    expect(triggerHaptic('success')).toBe(false)
    expect(cancelHaptic()).toBe(false)
  })

  it('handles runtime exceptions thrown by navigator.vibrate safely', () => {
    Object.defineProperty(navigator, 'vibrate', {
      value: vi.fn().mockImplementation(() => {
        throw new Error('NotAllowedError')
      }),
      configurable: true,
      writable: true,
    })

    expect(triggerHaptic('selection')).toBe(false)
    expect(cancelHaptic()).toBe(false)
  })
})
