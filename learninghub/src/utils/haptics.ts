/**
 * Haptic Feedback Engine
 * Utilizes the W3C Vibration API with safe cross-platform fallbacks.
 * Enhances user tactile responsiveness during assessments, coding submissions,
 * anti-cheat alerts, and gamification rewards.
 */

export type HapticFeedbackType =
  | 'selection'
  | 'light'
  | 'medium'
  | 'heavy'
  | 'success'
  | 'warning'
  | 'error'

const HAPTIC_PATTERNS: Record<HapticFeedbackType, number | number[]> = {
  selection: 12,
  light: 25,
  medium: 50,
  heavy: 80,
  success: [30, 40, 60],
  warning: [50, 50, 50],
  error: [80, 50, 80, 50, 80],
}

/**
 * Check if the browser supports haptic vibration
 */
export function isHapticSupported(): boolean {
  return (
    typeof navigator !== 'undefined' &&
    'vibrate' in navigator &&
    typeof navigator.vibrate === 'function'
  )
}

/**
 * Trigger a tactile haptic vibration pulse
 */
export function triggerHaptic(type: HapticFeedbackType = 'selection'): boolean {
  if (!isHapticSupported()) return false

  try {
    const pattern = HAPTIC_PATTERNS[type]
    return navigator.vibrate(pattern)
  } catch {
    // Safari iOS or strict permissions policy gracefully fallbacks to no-op
    return false
  }
}

/**
 * Cancel any ongoing vibration pulses
 */
export function cancelHaptic(): boolean {
  if (!isHapticSupported()) return false

  try {
    return navigator.vibrate(0)
  } catch {
    return false
  }
}
