import { useEffect, useState, useCallback, useRef, useMemo } from 'react'

export interface ProctoringViolation {
  type:
    | 'TAB_SWITCH'
    | 'WINDOW_BLUR'
    | 'COPY_PASTE'
    | 'CONTEXT_MENU'
    | 'DEV_TOOLS'
    | 'MULTIPLE_FACES'
    | 'NO_FACE'
    | 'FULLSCREEN_EXIT'
  timestamp: number
  details?: string
}

export type IntegrityRiskLevel = 'EXCELLENT' | 'LOW_RISK' | 'MODERATE_RISK' | 'HIGH_RISK'

export function calculateClientIntegrityScore(violations: ProctoringViolation[]): {
  score: number
  riskLevel: IntegrityRiskLevel
  counts: Record<string, number>
} {
  const weights: Record<string, number> = {
    DEV_TOOLS: 35.0,
    MULTIPLE_FACES: 25.0,
    NO_FACE: 20.0,
    COPY_PASTE: 15.0,
    FULLSCREEN_EXIT: 10.0,
    TAB_SWITCH: 10.0,
    WINDOW_BLUR: 5.0,
    CONTEXT_MENU: 5.0,
  }

  const caps: Record<string, number> = {
    COPY_PASTE: 30.0,
    TAB_SWITCH: 40.0,
    WINDOW_BLUR: 20.0,
    FULLSCREEN_EXIT: 20.0,
    CONTEXT_MENU: 15.0,
  }

  const counts: Record<string, number> = {}
  const deductions: Record<string, number> = {}

  for (const v of violations) {
    counts[v.type] = (counts[v.type] ?? 0) + 1
    deductions[v.type] = (deductions[v.type] ?? 0) + (weights[v.type] ?? 5.0)
  }

  let totalDeduction = 0
  for (const [type, raw] of Object.entries(deductions)) {
    const cap = caps[type] ?? 50.0
    totalDeduction += Math.min(raw, cap)
  }

  const score = Math.max(0, Math.min(100, Math.round((100 - totalDeduction) * 10) / 10))
  let riskLevel: IntegrityRiskLevel = 'EXCELLENT'
  if (score < 50 || (counts['DEV_TOOLS'] ?? 0) > 0) riskLevel = 'HIGH_RISK'
  else if (score < 75) riskLevel = 'MODERATE_RISK'
  else if (score < 90) riskLevel = 'LOW_RISK'

  return { score, riskLevel, counts }
}

interface UseProctoringOptions {
  isActive: boolean
  onViolation?: (violation: ProctoringViolation) => void
  strictMode?: boolean
  requireFullscreen?: boolean
}

export function useProctoring({
  isActive,
  onViolation,
  strictMode = true,
  requireFullscreen = false,
}: UseProctoringOptions) {
  const [violations, setViolations] = useState<ProctoringViolation[]>([])
  const [isWarningVisible, setIsWarningVisible] = useState(false)
  const [lastViolation, setLastViolation] = useState<ProctoringViolation | null>(null)
  const isBlurredRef = useRef(false)

  const onViolationRef = useRef(onViolation)
  onViolationRef.current = onViolation

  const recordViolation = useCallback(
    (type: ProctoringViolation['type'], details?: string) => {
      if (!isActive) return

      const violation: ProctoringViolation = {
        type,
        timestamp: Date.now(),
        details,
      }

      setViolations(prev => [...prev, violation])
      setLastViolation(violation)
      setIsWarningVisible(true)

      if (onViolationRef.current) {
        onViolationRef.current(violation)
      }
    },
    [isActive]
  )

  useEffect(() => {
    if (!isActive || !strictMode) return

    const handleVisibilityChange = () => {
      if (document.hidden) {
        recordViolation('TAB_SWITCH', 'User switched tabs or minimized the browser.')
      }
    }

    const handleBlur = () => {
      if (!isBlurredRef.current) {
        isBlurredRef.current = true
        recordViolation('WINDOW_BLUR', 'Browser window lost focus.')
      }
    }

    const handleFocus = () => {
      isBlurredRef.current = false
    }

    const handleCopyPaste = (e: ClipboardEvent) => {
      e.preventDefault()
      recordViolation('COPY_PASTE', `Attempted to ${e.type} content during assessment.`)
    }

    const handleContextMenu = (e: MouseEvent) => {
      e.preventDefault()
      recordViolation('CONTEXT_MENU', 'Attempted to open right-click context menu.')
    }

    const handleFullscreenChange = () => {
      if (requireFullscreen && !document.fullscreenElement) {
        recordViolation('FULLSCREEN_EXIT', 'Exited fullscreen mode during the assessment.')
      }
    }

    const handleKeyDown = (e: KeyboardEvent) => {
      // Prevent and record DevTools shortcuts
      if (e.key === 'F12') {
        e.preventDefault()
        recordViolation('DEV_TOOLS', 'F12 Developer Tools key press detected.')
        return
      }
      if ((e.ctrlKey || e.metaKey) && e.shiftKey && ['i', 'I', 'j', 'J', 'c', 'C'].includes(e.key)) {
        e.preventDefault()
        recordViolation('DEV_TOOLS', 'Developer inspection shortcut detected.')
        return
      }
      if ((e.ctrlKey || (e.metaKey && e.altKey)) && ['u', 'U'].includes(e.key)) {
        e.preventDefault()
        recordViolation('DEV_TOOLS', 'View Source shortcut detected.')
        return
      }
    }

    // Attach listeners
    document.addEventListener('visibilitychange', handleVisibilityChange)
    window.addEventListener('blur', handleBlur)
    window.addEventListener('focus', handleFocus)
    window.addEventListener('keydown', handleKeyDown)

    document.addEventListener('copy', handleCopyPaste)
    document.addEventListener('cut', handleCopyPaste)
    document.addEventListener('paste', handleCopyPaste)
    document.addEventListener('contextmenu', handleContextMenu)
    document.addEventListener('fullscreenchange', handleFullscreenChange)

    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange)
      window.removeEventListener('blur', handleBlur)
      window.removeEventListener('focus', handleFocus)
      window.removeEventListener('keydown', handleKeyDown)

      document.removeEventListener('copy', handleCopyPaste)
      document.removeEventListener('cut', handleCopyPaste)
      document.removeEventListener('paste', handleCopyPaste)
      document.removeEventListener('contextmenu', handleContextMenu)
      document.removeEventListener('fullscreenchange', handleFullscreenChange)
    }
  }, [isActive, strictMode, requireFullscreen, recordViolation])

  const dismissWarning = useCallback(() => {
    setIsWarningVisible(false)
  }, [])

  const resetViolations = useCallback(() => {
    setViolations([])
    setIsWarningVisible(false)
    setLastViolation(null)
  }, [])

  const integrityProfile = useMemo(() => {
    return calculateClientIntegrityScore(violations)
  }, [violations])

  return {
    violations,
    violationCount: violations.length,
    isWarningVisible,
    lastViolation,
    integrityScore: integrityProfile.score,
    riskLevel: integrityProfile.riskLevel,
    violationCounts: integrityProfile.counts,
    dismissWarning,
    resetViolations,
  }
}
