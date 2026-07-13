import { useEffect, useState, useCallback, useRef } from 'react'

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
      // Prevent multiple blur events when rapidly switching
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
      recordViolation('COPY_PASTE', `Attempted to ${e.type} content.`)
    }

    const handleContextMenu = (e: MouseEvent) => {
      e.preventDefault()
      recordViolation('CONTEXT_MENU', 'Attempted to use right-click context menu.')
    }

    const handleFullscreenChange = () => {
      if (requireFullscreen && !document.fullscreenElement) {
        recordViolation('FULLSCREEN_EXIT', 'Exited fullscreen mode during the assessment.')
      }
    }

    // Attach listeners
    document.addEventListener('visibilitychange', handleVisibilityChange)
    window.addEventListener('blur', handleBlur)
    window.addEventListener('focus', handleFocus)

    document.addEventListener('copy', handleCopyPaste)
    document.addEventListener('cut', handleCopyPaste)
    document.addEventListener('paste', handleCopyPaste)
    document.addEventListener('contextmenu', handleContextMenu)
    document.addEventListener('fullscreenchange', handleFullscreenChange)

    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange)
      window.removeEventListener('blur', handleBlur)
      window.removeEventListener('focus', handleFocus)

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

  return {
    violations,
    violationCount: violations.length,
    isWarningVisible,
    lastViolation,
    dismissWarning,
    resetViolations,
  }
}
